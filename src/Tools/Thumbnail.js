//이미지/영상에서 축소본(썸네일)을 뽑아 data URL로 만들어줌.
//file:// 을 직접 읽으면 캔버스가 오염돼서 toDataURL이 막히기 때문에,
//main.js에 등록해둔 appfile:// 프로토콜을 거쳐서 읽는다.

//화면에 가장 크게 쓰이는게 아주크게보기의 110px(나머지는 56/32/16px)이라
//160이면 고해상도 화면까지 충분함. 240은 과했음
const MAXSIZE = 160;
//WebP는 크로미움 내장이라 의존성 없이 그냥 됨. 같은 화질에서 JPEG보다 30%쯤 작음
//(AVIF가 더 작지만 캔버스 인코딩을 지원 안해서 못씀)
const MIMETYPE = 'image/webp';
const QUALITY = 0.72;
const TIMEOUT = 10000;    //깨진 파일 하나가 큐를 영영 막지 않게

//썸네일을 읽어올 URL. ?v에 갱신시각을 붙여, 대표이미지를 바꿨을때
//브라우저가 옛 그림을 캐시해서 계속 보여주는걸 막음
export function thumbUrl(id, version) {
    return `thumb://local/${id}?v=${version || 0}`;
}

//썸네일을 만들 수 있는 확장자.
//addon의 GetFileType은 png/jpg/jpeg/gif, mp4/mkv/avi만 알아서 webp나 mov는 'file'로 들어옴.
//그래서 type만 믿지 않고 확장자로도 판별함
const IMAGEEXT = new Set(['jpg','jpeg','png','gif','webp','bmp','avif']);
const VIDEOEXT = new Set(['mp4','mkv','avi','mov','webm','m4v']);
//음악은 그릴 화면이 없지만 앨범아트가 박혀있으면 그걸 씀.
//지금은 ID3(mp3)만 읽을줄 알아서 나머지는 아트가 없는걸로 처리되고 조용히 넘어감
const AUDIOEXT = new Set(['mp3','m4a','flac','ogg','wav']);

function getExt(realpath) {
    const name = String(realpath || '').split(/[\\/]/).pop();
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

//이 파일이 이미지인지 영상인지(둘다 아니면 null). type보다 확장자를 우선함
export function getMediaKind(file) {
    if (!file || !file.realpath) return null;
    const ext = getExt(file.realpath);
    if (IMAGEEXT.has(ext)) return 'image';
    if (VIDEOEXT.has(ext)) return 'video';
    if (AUDIOEXT.has(ext)) return 'audio';
    //확장자를 모르면 addon이 매긴 타입이라도 믿어봄
    if (file.type === 'image' || file.type === 'video' || file.type === 'audio') return file.type;
    return null;
}

//문자열을 base64url로. 결과가 영숫자와 -_ 뿐이라 URL 어디에 넣어도 안전함
function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

//디스크 경로를 appfile:// URL로.
//퍼센트 인코딩을 쓰면 한글이나 드라이브문자(D:)가 브라우저의 URL 정규화 과정에서
//이중 인코딩되거나 포트로 오인돼 깨짐. base64url로 통째로 감싸면 그런 여지가 아예 없음
export function toAppFileUrl(realpath) {
    if (!realpath) return '';
    return 'appfile://local/' + toBase64Url(String(realpath));
}

//캔버스에 그려서 Blob(=바이트)으로. 비율 유지하며 긴 변을 MAXSIZE로 맞춤.
//toDataURL은 base64 문자열로 만들어서 다시 바이트로 되돌려야 하는데,
//그 되돌리는 fetch(data:...)가 CSP의 connect-src에 막힘. toBlob은 처음부터 바이트라 그 문제가 없음
function drawToBlob(source, width, height) {
    return new Promise((resolve, reject) => {
        if (!width || !height) { resolve(null); return; }

        const scale = Math.min(1, MAXSIZE / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('인코딩 실패')),
            MIMETYPE,
            QUALITY
        );
    });
}

function makeThumbFromImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => { img.src = ''; reject(new Error('이미지 시간초과')); }, TIMEOUT);

        img.onload = () => {
            clearTimeout(timer);
            //toBlob이 비동기라 then으로 이어줘야함
            drawToBlob(img, img.naturalWidth, img.naturalHeight).then(resolve, reject);
        };
        img.onerror = () => { clearTimeout(timer); reject(new Error('이미지 로드실패')); };
        img.src = url;
    });
}

//음악의 앨범아트. 메인에서 ID3 태그의 그림 바이트만 받아와서 이미지와 똑같이 처리함.
//appfile://로 mp3를 통째로 받는게 아니라 그림만 오므로 27MB짜리도 부담이 없음
async function makeThumbFromAudio(realpath) {
    const bytes = await window.nodeapi.readAlbumArt(realpath);
    //아트가 없는 음악이 정상적으로 많음. 에러가 아니라 "만들것 없음"이라 null로 끝냄
    if (!bytes || bytes.length === 0) return null;

    //IPC를 건너오면 Uint8Array가 일반 객체처럼 될수있어서 다시 감싸줌(saveThumbnail과 같은 이유)
    const blob = new Blob([bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)]);
    const url = URL.createObjectURL(blob);
    try {
        //여기서부터는 보통 이미지와 완전히 같은 길. 줄이기/인코딩은 drawToBlob이 다 함
        return await makeThumbFromImage(url);
    } finally {
        //안 풀어주면 이 그림이 메모리에 계속 남음
        URL.revokeObjectURL(url);
    }
}

function makeThumbFromVideo(url) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';

        //끝날때 어떤 경로로든 자원 정리(안하면 영상이 백그라운드에 남음)
        const cleanup = () => { video.removeAttribute('src'); video.load(); };
        const timer = setTimeout(() => { cleanup(); reject(new Error('영상 시간초과')); }, TIMEOUT);

        video.onloadedmetadata = () => {
            //너무 앞은 검은화면인 경우가 많아서 살짝 뒤로. 짧은 영상도 고려해 10%와 1초중 작은쪽
            const target = Math.min(1, (video.duration || 0) * 0.1);
            //seek이 불가능한 파일이면 그냥 현재 위치에서 시도
            if (Number.isFinite(target) && target > 0) video.currentTime = target;
            else video.currentTime = 0;
        };
        video.onseeked = () => {
            clearTimeout(timer);
            //그리고 나서 정리해야함. 먼저 정리하면 프레임이 날아감
            drawToBlob(video, video.videoWidth, video.videoHeight)
                .then((blob) => { cleanup(); resolve(blob); })
                .catch((e) => { cleanup(); reject(e); });
        };
        video.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('영상 로드실패')); };

        video.src = url;
    });
}

//타입에 맞춰 썸네일 생성. WebP 바이트(Uint8Array)를 돌려줌. 못만들면 null
export async function generateThumbnail(realpath, kind) {
    if (!realpath) return null;

    let blob = null;
    //음악만 경로가 다름. 디스크 파일을 그리는게 아니라 태그에서 꺼낸 그림을 그림
    if (kind === 'audio') blob = await makeThumbFromAudio(realpath);
    else if (kind === 'image') blob = await makeThumbFromImage(toAppFileUrl(realpath));
    else if (kind === 'video') blob = await makeThumbFromVideo(toAppFileUrl(realpath));
    else return null;

    if (!blob) return null;
    //DB엔 바이트로 넣음(base64로 두면 실제 크기보다 33% 커짐)
    return new Uint8Array(await blob.arrayBuffer());
}
