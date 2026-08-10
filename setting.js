//반드시 electron-store보다 위. Store가 만들어질때 userData 경로를 잡는데,
//그전에 app.setName이 끝나있어야 DB(filetree.db)와 같은 폴더를 보게 된다
import './appname.js';
import Store from 'electron-store'

//가져오기 필터의 기본 확장자 목록.
//handler/filefilter.js의 Filefilter가 화이트리스트 방식이라 여기 없는 확장자는 조용히 제외됨.
//그래서 "왜 이 파일만 안 들어가지"의 원인이 되기 쉬움 — 흔한 형식은 웬만하면 넣어두는 편이 나음.
//defaults와 아래 mergeFilterDefaults가 같이 쓰므로 상수로 빼둠
const DEFAULT_FILTERS={
    enabled:true,
    //폴더를 가져올지 말지. 끄면 폴더도 그 안의 내용도 통째로 안 들어온다
    //(끌어다 놓은 것 중 파일만 들어옴).
    //확장자 목록과 성격이 달라서 categories 바깥에 따로 둠 - 폴더엔 확장자가 없다
    keepfolders:true,
    //폴더 안의 파일에도 형식필터를 적용할지.
    //끄면 폴더 안은 종류를 안 가리고 전부 가져온다("이 폴더는 통째로 보관")
    filterinside:true,
    categories:{
        image:{
            enabled:true,
            label:'image',
            items:[
                {ext:'jpg',enabled:true},
                {ext:'jpeg',enabled:true},
                //윈도우/엣지에서 이미지를 저장하면 종종 이 확장자로 떨어짐
                {ext:'jfif',enabled:true},
                {ext:'png',enabled:true},
                {ext:'gif',enabled:true},
                {ext:'webp',enabled:true},
                {ext:'bmp',enabled:true},
                {ext:'svg',enabled:true},
                //heic/heif는 아이폰 사진 기본 형식이라 이게 없으면 사진첩이 통째로 안들어감
                {ext:'heic',enabled:true},
                {ext:'heif',enabled:true},
                {ext:'avif',enabled:true},
                {ext:'tiff',enabled:true},
                {ext:'tif',enabled:true},
                {ext:'ico',enabled:true}
            ]
        },
        video:{
            enabled:true,
            label:'video',
            items:[
                {ext:'mp4',enabled:true},
                {ext:'mkv',enabled:true},
                {ext:'avi',enabled:true},
                {ext:'mov',enabled:true},
                {ext:'wmv',enabled:true},
                {ext:'flv',enabled:true},
                {ext:'webm',enabled:true},
                {ext:'m4v',enabled:true},
                {ext:'mpg',enabled:true},
                {ext:'mpeg',enabled:true},
                //캠코더/방송 녹화물
                {ext:'ts',enabled:true},
                {ext:'m2ts',enabled:true}
            ]
        },
        document:{
            enabled:true,
            label:'document',
            items:[
                {ext:'txt',enabled:true},
                {ext:'pdf',enabled:true},
                {ext:'docx',enabled:true},
                {ext:'xlsx',enabled:true},
                {ext:'pptx',enabled:true},
                {ext:'hwp',enabled:true}, // 한글 문서
                {ext:'hwpx',enabled:true},
                {ext:'csv',enabled:true},
                //오피스 구버전. 신버전만 있으면 예전 파일이 통째로 걸러짐
                {ext:'doc',enabled:true},
                {ext:'xls',enabled:true},
                {ext:'ppt',enabled:true},
                {ext:'rtf',enabled:true},
                {ext:'md',enabled:true},
                {ext:'epub',enabled:true}
            ]
        },
        archive:{
            enabled:true,
            label:'archive',
            items:[
                {ext:'zip',enabled:true},
                {ext:'rar',enabled:true},
                {ext:'7z',enabled:true},
                {ext:'tar',enabled:true},
                {ext:'gz',enabled:true},
                {ext:'bz2',enabled:true},
                {ext:'xz',enabled:true},
                {ext:'tgz',enabled:true}
            ]
        },
        executable:{
            enabled:false, // 보안상 기본은 꺼두는 게 좋을 수 있음
            label:'executable',
            items:[
                {ext:'exe',enabled:true},
                {ext:'msi',enabled:true},
                {ext:'bat',enabled:true},
                {ext:'sh',enabled:true},
                {ext:'cmd',enabled:true},
                {ext:'ps1',enabled:true}
            ]
        },
        audio:{
            enabled:true,
            label:'audio',
            items:[
                {ext:'mp3',enabled:true},
                {ext:'wav',enabled:true},
                {ext:'flac',enabled:true},
                {ext:'ogg',enabled:true},
                {ext:'m4a',enabled:true},
                {ext:'aac',enabled:true},
                {ext:'wma',enabled:true},
                {ext:'opus',enabled:true},
                {ext:'aiff',enabled:true}
            ]
        }
    }
}

const store=new Store({
    //기본값 (처음실행시사용)
    defaults:{
        view:{
            viewoption:'large',
            isdetail:{
                isfilename:true,
                isdate: true,
                istype: true,
                issize: true,
                islength: true
            },
            sort:{key:"filename",direction:"ASC"},
            groupfolders:true, //폴더먼저보기 기본켜짐
            //자세히보기 열 너비(px). 머리글 경계선을 끌어서 조절하면 여기 저장됨
            columnwidth:{ filename:320, date:160, type:90, size:90 }
        },
        tree:{
            folderview:false,
            sortoption:'desc'

        },
        user:{
            isdarkmode:false,
            Language:"en",
            //앱 잠금. null이면 잠금 없음. 설정하면 {salt,hash,hint}가 들어감(평문은 저장 안함)
            lock:null
        },
        //인풋필터
        filters:DEFAULT_FILTERS
    }
})

//electron-store의 defaults는 "그 키가 아예 없을 때"만 쓰임.
//그래서 위 목록에 확장자를 추가해도 이미 filters를 저장해둔 사용자에겐 영원히 안 들어감.
//켤 때마다 "기본엔 있는데 저장본엔 없는 것"만 채워넣어서 그 틈을 메움.
//사용자가 직접 꺼둔 항목은 손대지 않음(enabled를 덮어쓰지 않고, 없는 항목만 추가)
function mergeFilterDefaults(){
    const saved=store.get('filters');
    //구조가 깨져있으면 건드리지 않음. defaults가 이미 정상값을 돌려주고 있는 상태
    if(!saved||!saved.categories) return;

    let changed=false;

    //나중에 추가된 항목이라 기존 사용자의 저장본엔 없다. 없을때만 채워넣음
    //(false로 꺼둔 사람의 설정을 true로 되돌리면 안되므로 undefined인지로만 판단)
    for(const key of ['keepfolders','filterinside']){
        if(saved[key]===undefined){
            saved[key]=DEFAULT_FILTERS[key];
            changed=true;
        }
    }

    //잠깐 있다가 없어진 설정("빈 폴더는 만들지 않기"). 지금은 아무도 안 읽지만
    //설정파일(store.openstore)을 직접 열어보면 남아있어서 헷갈리므로 한번 치운다
    if(saved.skipemptyfolders!==undefined){
        delete saved.skipemptyfolders;
        changed=true;
    }

    for(const [key,defcat] of Object.entries(DEFAULT_FILTERS.categories)){
        const cat=saved.categories[key];
        //카테고리가 통째로 없으면(나중에 새 분류를 추가한 경우) 기본값 그대로
        if(!cat||!Array.isArray(cat.items)){
            saved.categories[key]=defcat;
            changed=true;
            continue;
        }
        const have=new Set(cat.items.map(it=>it.ext));
        for(const item of defcat.items){
            if(!have.has(item.ext)){
                //꺼져있는 카테고리에 켜진 항목을 넣으면 "카테고리는 꺼졌는데 하위는 켜짐"이 됨.
                //Filefilter는 카테고리를 먼저 보므로 어차피 통과 못하는데 화면엔 체크로 보여서 헷갈림
                cat.items.push({...item, enabled: cat.enabled? item.enabled : false});
                changed=true;
            }
        }
        //위와 같은 이유로 기존 데이터도 정리함.
        //카테고리가 꺼져있으면 하위는 전부 꺼진 상태가 맞음(실제 통과 결과와 일치)
        if(!cat.enabled&&cat.items.some(it=>it.enabled)){
            cat.items=cat.items.map(it=>({...it,enabled:false}));
            changed=true;
        }
    }
    if(changed) store.set('filters',saved);
}
mergeFilterDefaults();

export default store;
