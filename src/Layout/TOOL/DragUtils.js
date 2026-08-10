//내부아이템 드래그로 이동하는 로직 공통유틸 (Viewitem/Listtable/Filetreeitem에서 공통사용)
import { thumbUrl } from '../../Tools/Thumbnail';

//드래그중 마우스따라다닐 반투명 미리보기를 직접 만들어줌(윈도우탐색기 흉내)
//setDragImage는 "화면에 실제로 붙어있는" 엘리먼트만 스냅샷 뜰수있어서(display:none이면 안됨)
//화면밖에 잠깐 만들었다가 스냅샷 뜬 직후 지움
function setCustomDragImage(e, item, count) {
  const ghost = document.createElement('div');
  ghost.style.cssText = `
    position: fixed;
    top: -1000px;
    left: -1000px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(255,255,255,0.7);
    border: 1px solid #4A90E2;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0.75;
  `;

  //썸네일이 있으면 그 그림을 미리보기로(끌고있는게 뭔지 바로 보임).
  //타입 아이콘은 SVG 컴포넌트라 여기(순수 DOM)에선 못써서, 없으면 그냥 이름만 보여줌
  if (item.thumbversion) {
    const img = document.createElement('img');
    img.src = thumbUrl(item.id, item.thumbversion);
    img.style.cssText = 'width:32px;height:32px;object-fit:cover;border-radius:3px;';
    ghost.appendChild(img);
  }

  const label = document.createElement('span');
  label.textContent = item.filename;
  ghost.appendChild(label);

  //여러개 옮길때만 몇개인지 동그란 뱃지로
  if (count > 1) {
    const badge = document.createElement('span');
    badge.textContent = count;
    badge.style.cssText = `
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: #4A90E2;
      color: #fff;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    ghost.appendChild(badge);
  }

  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 20, 20);
  //스냅샷은 동기로 떠지니까 바로 다음틱에 치워도 됨
  setTimeout(() => ghost.remove(), 0);
}

//드래그 시작시 dataTransfer에 옮길 id들 담기
//선택된 상태에서 드래그하면 선택전체, 아니면 그 아이템 하나만
export function handleItemDragStart(e, item, selectitems) {
  const ids = selectitems && selectitems.has(item.id) ? Array.from(selectitems) : [item.id];
  e.dataTransfer.setData('application/json', JSON.stringify({ ids }));
  e.dataTransfer.effectAllowed = 'move';
  setCustomDragImage(e, item, ids.length);
}

//OS(윈도우탐색기)에서 끌어온 드래그인지 판별. 내부아이템 드래그와 처리가 다름
export function isExternalDrag(e) {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
}

//드롭 허용을 위해 dragOver에서 반드시 preventDefault 필요(안하면 drop이벤트자체가 안일어남)
//지금 끌려오고 있는게 OS 파일인지 기억해둔다.
//drop 시점에는 항목이 많으면 Chromium이 데이터 준비에 실패해서 dataTransfer가 통째로
//비어버리는데(items:0), 그러면 "빈 드롭"인지 "실패한 드롭"인지 구분할 방법이 없다.
//dragover 때는 아직 실제 데이터를 안 만들어서 types에 'Files'가 정상적으로 들어있으므로
//그때 봐두면 나중에 유실을 확정할 수 있다. 드래그는 한번에 하나뿐이라 변수 하나면 충분
let draggingosfiles = false;

export function handleFolderDragOver(e) {
  e.preventDefault();
  //외부파일은 OS원본을 옮기는게 아니라 가져오는거라 copy가 의미상 맞음
  const external = isExternalDrag(e);
  draggingosfiles = external;
  e.dataTransfer.dropEffect = external ? 'copy' : 'move';
}

//폴더가 아닌곳(파일위/빈배경)은 preventDefault를 안하면 브라우저가 "드롭불가"로보고 🚫커서를 띄움.
//드래그 시작지점도 결국 그런 곳이라 시작하자마자 🚫가 떠서 거슬림.
//컨테이너에도 걸어줘서 커서를 이동커서로 유지(실제 이동은 폴더에 놨을때만 일어남)
export function handleBackgroundDragOver(e) {
  e.preventDefault();
  const external = isExternalDrag(e);
  draggingosfiles = external;
  e.dataTransfer.dropEffect = external ? 'copy' : 'move';
}

//위에서 dragOver를 허용해준 대가로 drop도 여기까지 올라옴. 아무것도 안하되
//브라우저 기본동작(파일경로로 페이지이동 등)은 막아줘야함
export function handleBackgroundDrop(e) {
  e.preventDefault();
}

//dragleave는 안쪽 자식요소(아이콘,파일명등)로 마우스가 옮겨갈때도 발생함.
//그래서 그냥 끄면 아이콘↔파일명 사이를 지날때마다 하이라이트가 깜빡거림.
//관련대상(relatedTarget)이 내 자식이 아닐때 = 진짜로 밖으로 나갔을때만 꺼주기
export function isRealDragLeave(e) {
  return !e.currentTarget.contains(e.relatedTarget);
}

//=== 가져오기 진행 표시를 렌더러 안에서 직접 켜고 끄는 신호 ===
//메인이 보내주는 insert-progress를 기다리면 늦다. 그 신호는 아래 경로추출이 끝나고
//IPC까지 다녀와야 오는데, 정작 화면이 멈추는 구간은 그 "이전"이라 영영 못 띄운다.
//전역 이벤트라 컴포넌트 계층(props 내려주기)을 안 건드려도 된다
export function beginImportUI(){
  window.dispatchEvent(new CustomEvent('import-begin'));
}
export function updateImportUI(done, total){
  window.dispatchEvent(new CustomEvent('import-preparing',{detail:{done,total}}));
}
//경로가 하나도 안 나와서 IPC를 안 부르는 경우엔 직접 닫아줘야 한다
//(안그러면 메인이 insert-done을 보낼 일이 없어서 오버레이가 영영 남는다)
export function endImportUI(){
  window.dispatchEvent(new CustomEvent('import-cancel'));
}

//드롭된 File객체들에서 실제 디스크경로를 뽑는다.
//getPathForFile이 동기라 한번에 다 돌리면 그동안 화면이 얼어붙으므로,
//조각내서 사이사이 브라우저에 제어권을 넘겨준다(그래야 오버레이가 그려진다)
const PATHCHUNK = 50;
async function extractPaths(files){
  const paths = [];
  for (let i = 0; i < files.length; i += PATHCHUNK) {
    const end = Math.min(i + PATHCHUNK, files.length);
    for (let k = i; k < end; k++) {
      const p = window.nodeapi.getPathForFile(files[k]);
      if (p) paths.push(p);
    }
    updateImportUI(end, files.length);

    //setTimeout 0은 "지금 하던 일을 끊고 화면을 그린 뒤 이어서"라는 뜻.
    //마지막 조각 뒤에는 굳이 쉴 필요 없음
    if (end < files.length) await new Promise(r => setTimeout(r, 0));
  }
  return paths;
}

//드롭된 것들을 지정한 폴더id로 넣기. 폴더에 직접 놓든 배경에 놓든 결국 이거 하나로 처리됨.
//OS에서 온 외부파일이면 가져오기(insertFn), 앱 내부아이템이면 이동(moveFn)으로 갈라짐
//alreadyHereIds를 주면 이미 그폴더에 있는 애들은 걸러냄(제자리이동 방지, 내부이동에만 해당)
export async function handleDropIntoFolderId(e, targetParentId, { moveFn, insertFn, alreadyHereIds } = {}) {
  e.preventDefault();

  const dt = e.dataTransfer;
  const hasFiles = !!(dt && dt.files && dt.files.length > 0);

  //dragover에서 "OS 파일이 온다"고 했는데 정작 알맹이가 비어있으면, Chromium이 드롭
  //데이터를 만들다 실패한 것이다(항목이 많을수록 잘 생김). 이건 앱이 손쓸수 있는 층이
  //아니라서 되살릴 방법이 없다. 대신 조용히 넘기지 말고 알려준다 -
  //예전엔 아무 반응이 없어서 "앱이 먹통"으로 보였고 강제종료까지 하게 됐다
  if (!hasFiles && draggingosfiles) {
    draggingosfiles = false;
    window.dispatchEvent(new CustomEvent('import-failed'));
    return;
  }
  draggingosfiles = false;

  //1) OS(윈도우탐색기)에서 끌어온 파일/폴더
  if (hasFiles) {
    if (!insertFn) return;

    //경로를 뽑는 동안에도 화면이 반응하도록 먼저 잠근다.
    //메인이 보내주는 신호를 기다리면 그건 IPC 다녀온 뒤라 너무 늦다
    beginImportUI();

    const dropped = Array.from(dt.files);

    //Electron33에서 File.path가 제거돼서 preload의 webUtils를 거쳐야 실제경로가 나옴.
    //이게 동기호출이라 파일수만큼 반복하면 그동안 화면이 통째로 얼어붙는다.
    //조각내서 중간에 제어권을 넘겨줘야 오버레이가 그려지고 숫자도 올라간다
    const paths = await extractPaths(dropped);
    if (paths.length === 0) { endImportUI(); return; }

    await insertFn({ paths, targetParentId });
    return;
  }

  //2) 앱 내부 아이템 이동
  if (!moveFn) return;
  let parsed;
  try {
    parsed = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
  } catch {
    return;
  }
  const { ids } = parsed;
  if (!ids || ids.length === 0) return;
  if (ids.includes(targetParentId)) return; //자기자신 안으로 넣기 방지

  const moving = alreadyHereIds ? ids.filter(id => !alreadyHereIds.has(id)) : ids;
  if (moving.length === 0) return;
  await moveFn({ ids: moving, targetParentId });
}

//폴더 위에 정확히 드롭됐을때
export async function handleFolderDrop(e, folderItem, moveFn, insertFn) {
  //폴더에 제대로 놨으면 뒤쪽 배경핸들러까지 올라가면 안됨(중복처리 방지)
  e.stopPropagation();
  return handleDropIntoFolderId(e, folderItem.id, { moveFn, insertFn });
}
