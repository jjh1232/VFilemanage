import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState,useCallback,useEffect,useRef } from "react";
import styled from "styled-components";
import Contextmenu from "../TOOL/Contextmenu";
import Viewitem from "./Viewitem";
import Listtable from "./Listtable";
import SelectableGroup from "../TOOL/SelectDrag";
import MainviewTop from "./MainviewTop";
import { useOpenItem } from "../TOOL/DoubleUtils";
import { handleBackgroundDragOver, handleBackgroundDrop, handleDropIntoFolderId } from "../TOOL/DragUtils";
import { useThumbnailQueue } from "../../Tools/useThumbnail";
import { useLanguage } from "../../Tools/LanguageProvider";
import { useRenameShortcut } from "../TOOL/useRenameShortcut";

const MaivviewBody=styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const Wrapper=styled.div`
    display: flex;
    flex: 1;
    width: 100%;
    min-height: 0;  /* ← 이것이 핵심! 없으면 스크롤이 안생김 */
    /* Electron 스크롤 강제 */
    overflow: auto !important;
    -ms-overflow-style: scrollbar; /* Electron 핵심 */

    /* 격자형 3종(아주크게/크게/보통)은 배치규칙이 똑같고 아이템 크기만 다름.
       가운데정렬은 Viewitem이 자기가 하므로 여기선 배치만 담당 */
    ${({ $viewmode }) => ['verylarge','large','default'].includes($viewmode) && `
        flex-direction: row;
        flex-wrap: wrap;
        align-content: flex-start;
        gap: 4px;
        padding: 8px;
    `}

    /* 목록형 2종은 세로로 쌓기. 자세히보기는 표가 가장자리에 딱 붙어야 머리글이 안뜸 */
    ${({ $viewmode }) => $viewmode === 'small' && `
        flex-direction: column;
        padding: 4px;
    `}
    ${({ $viewmode }) => $viewmode === 'detail' && `
        flex-direction: column;
        /* 목록 끝에만 여백. 마지막 행이 창 밑단에 딱 붙어있으면 답답하고,
           끌어다 놓을 빈 자리도 없어진다(윈도우 탐색기도 끝에 여유가 있음).
           좌우와 위는 0 그대로 - 표가 가장자리에 붙어야 sticky 머리글이 안뜬다 */
        padding-bottom: 40px;
    `}
`
const Tableth=styled.th`
    position: relative;
`
const Thresizer=styled.div`
    position: absolute;
      right: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ddd;
  cursor: col-resize;
  z-index: 10;
  
  &:hover {
    background: #007bff;
    width: 2px;
  }
  
  &:active {
    background: #0056b3;
  }
`
export default function Mainview(props){
    const {currentfolderid,navigate,activemain,setactivemain
      ,goBack,goForward,canGoBack,canGoForward,history,historyIndex,jumpTo
      ,menuopen,viewmode,viewmenu,
       searchkeyword,setSearchkeyword,sortoption,groupfolders
      ,renamingid,onRenameStart,onRenameDone
    }=props;


    const queryClient=useQueryClient();
    const {t}=useLanguage();
    const openitem=useOpenItem();
          //드래그 선택된 인덱스들을 저장할상태
    const [selectitems,setselectitems]=useState(new Set());
    //현재폴더 안에서만 거르는 로컬필터(MainviewTop의 검색창). 메인탑 검색(searchkeyword)이랑은 별개
    const [localFilter,setLocalFilter]=useState("");
    //폴더 이동하면 선택상태/로컬필터 초기화(안그러면 예전폴더거 계속 살아있어서 이상하게 꼬임)
    useEffect(()=>{
        setselectitems(new Set());
        setLocalFilter("");
    },[currentfolderid]);
    //검색시
        const {data:searchfiles}=useQuery({
        queryKey:["searchdata",searchkeyword,sortoption,groupfolders],
        //폴더먼저볼지는 사용자가 Top에서 토글로 결정(기본 true)
        queryFn:()=>window.nodeapi.db.searchreadfiles({keyword:searchkeyword,folderFirst:groupfolders}),
        enabled:!!searchkeyword
      })
    //기본로직

    const {data:folderfiles,isLoading}=useQuery({//데이터변경시 따로갱신
        queryKey:["filedata",currentfolderid,sortoption,groupfolders],
        queryFn:()=>window.nodeapi.db.readfiles({parentid:currentfolderid,folderFirst:groupfolders}),
        enabled:!searchkeyword //boolean으로 줘야해서 !!두개
    });
   
    const files=searchkeyword?searchfiles:folderfiles;
    //로컬필터 적용된 실제 화면에 뿌릴 목록. data-index는 이 배열 기준이라 아래 filesRef도 이걸 써야함
    const trimmedFilter=localFilter.trim().toLowerCase();
    const displayedFiles=trimmedFilter
        ? files&&files.filter(f=>f.filename.toLowerCase().includes(trimmedFilter))
        : files;

    //handlemain을 files바뀔때마다 새로만들면, 이동을 여러번 거칠때 SelectionArea가
    //예전 files를 기억하는 낡은 버전에 바인딩된 채로 남아있는 경우가 생겨서
    //(클릭은 되는데 엉뚱한 폴더 파일id를 선택해버려 화면엔 안보임)
    //ref로 최신 files를 들고 handlemain 자체는 절대 안바뀌게 고정
    const filesRef=useRef(displayedFiles);
    useEffect(()=>{ filesRef.current=displayedFiles; },[displayedFiles]);

    //썸네일 없는 이미지/영상은 화면에 보일때 한번 만들어 DB에 저장(이후엔 저장된걸 씀)
    useThumbnailQueue(displayedFiles);

    //폴더 표지 사진들. 직접 고른 폴더는 그 순서대로, 아니면 안에 든 것에서 자동선택됨.
    //작은 뷰모드에서도 한장은 보여주므로 뷰모드로 막지 않고 폴더가 있으면 항상 조회
    const folderids=(displayedFiles||[]).filter(f=>f.type==='folder').map(f=>f.id);
    const {data:folderpreviews}=useQuery({
        //키를 'filedata'로 시작시키면 기존 invalidateQueries({queryKey:['filedata']})들이
        //이것도 같이 갱신해줌 → 표지를 바꾸거나 파일을 넣고 지워도 폴더 모습이 자동으로 따라 바뀜
        queryKey:["filedata","folderpreview",folderids],
        queryFn:()=>window.nodeapi.db.readFolderPreviews({ids:folderids}),
        enabled:folderids.length>0,
    });

  // 1. handlemain을 useCallback으로 감싸서 함수를 고정합니다.
  const handlemain = useCallback(({ added, removed }) => {
    setselectitems((prev) => {
      const next = new Set(prev);
      added.forEach((el) => {
        const idx = Number(el.getAttribute("data-index"));
        const selectsitem = filesRef.current && filesRef.current[idx];
        if (selectsitem) next.add(selectsitem.id);
      });

      removed.forEach((el) => {
        const idx = Number(el.getAttribute("data-index"));
        const selectsitem = filesRef.current && filesRef.current[idx];
        if (selectsitem) next.delete(selectsitem.id);
      });

      return next;
    });
  }, []); // ref로 최신값 읽으니 의존성 없이 영구 고정

  //onReset도 렌더마다 새로 만들면 SelectDrag쪽 useCallback이 무의미해져서 고정
  const handleReset = useCallback(() => setselectitems(new Set()), []);

  //F2로 이름바꾸기(윈도우와 같은 단축키). 파일트리도 같은 훅을 쓰고,
  //activemain으로 지금 활성인 패널만 반응함
  useRenameShortcut({active:activemain, selectitems, renamingid, onRenameStart});

  //드래그로 폴더위에 놓았을때 실제 이동 실행. filedata전체무효화해서 원래폴더/대상폴더 둘다 갱신
  const moveFn = useCallback(async ({ids, targetParentId}) => {
    const result = await window.nodeapi.db.moveFiles({ids, targetParentId});
    if(result && result.success===false){
      //백엔드는 언어를 모르니 code로 번역하고, 없는 코드면 원문으로 폴백
      alert(result.code ? t(result.code) : result.message);
      return;
    }
    //같은이름이 있어서 이름이 바뀐게 있으면 알려줌(조용히 바뀌면 사용자가 모름)
    if(result && result.renamed && result.renamed.length>0){
      alert(t("renamed_notice")+'\n'
        + result.renamed.map(r=>`${r.from} → ${r.to}`).join('\n'));
    }
    await queryClient.invalidateQueries({queryKey:['filedata']});
    setselectitems(new Set()); //이동된아이템은 현재폴더에서 사라지니 선택 초기화
  }, [queryClient,t]);

  //OS(윈도우탐색기)에서 끌어온 파일/폴더를 지정한 폴더로 가져오기.
  //폴더면 안쪽 구조까지 그대로 재귀삽입됨(main.js의 insertPathsRecursive)
  const insertFn = useCallback(async ({paths, targetParentId}) => {
    const result = await window.nodeapi.insertfile({
      filepathfromdrop: paths,
      currentfolderid: targetParentId
    });
    if(result === "success"){
      await queryClient.invalidateQueries({queryKey:['filedata']});
    }
  }, [queryClient]);

  //빈배경(이나 폴더가 아닌 파일위)에 놓으면 = 지금 열려있는 폴더로
  //윈도우탐색기에서 트리의 파일을 오른쪽 영역에 끌어다놓는 그 동작
  //이미 이폴더에 있는 애들은 걸러내서 무의미한 제자리이동을 막음
  const handleDropToCurrentFolder = useCallback((e) => {
    const hereIds = new Set((filesRef.current || []).map(f => f.id));
    handleDropIntoFolderId(e, currentfolderid, {moveFn, insertFn, alreadyHereIds:hereIds});
  }, [currentfolderid, moveFn, insertFn]);

  // 2. 배경 클릭 핸들러 (MouseDown에서 stopPropagation 주의)
  const handlewrapperclick = (e) => {
    if (!e.target.closest('.view-item')) {
      setselectitems(new Set());
    }
  };

  // 3. 우클릭 핸들러 분리 (가독성 및 관리 용이)
  const onFileContextMenu = useCallback((e, file) => {
     e.preventDefault();
    e.stopPropagation();
    let curfolderid=currentfolderid;
    let currentIds = selectitems;
    let type = file.type;

    if (!selectitems.has(file.id)) {
      // 선택되지 않은 파일을 우클릭했을 때
      const newSelect = new Set([file.id]);
      setselectitems(newSelect);
      currentIds = newSelect;
    } else if (selectitems.size > 1) {
      // 이미 여러 개 선택된 상태에서 우클릭했을 때
      type = "manyfiles";
    }

    //source: 이름바꾸기 입력창이 트리가 아니라 여기(메인뷰)에 뜨게 하는 표시
    menuopen(e, type,{folderid:curfolderid,selectid: Array.from(currentIds),source:'main'});
  }, [selectitems, menuopen]);

  //클릭후 드래그 로직 선택되지않을시 그녀석만이동하고 선택시 셀렉트모두
  const itemDragstart=(e,itemid)=>{
    let dragitems=[];
    //마우스로 쥔부분
    if(selectitems.has(itemid)){
      //기존드래그가 선택된 아이디일시
      dragitems=Array.from(selectitems);
    }else{
      dragitems=[itemid];
      //ui도한놈으로변경
      setselectitems(new Set([itemid]));
      
    }

  }

  // 4. 공통 렌더링 부분 (상세보기와 일반보기 통합)
  return (
    <MaivviewBody>
     <MainviewTop currentfolderid={currentfolderid} navigate={navigate}
       goBack={goBack} goForward={goForward} canGoBack={canGoBack} canGoForward={canGoForward}
       history={history} historyIndex={historyIndex} jumpTo={jumpTo}
       localFilter={localFilter} setLocalFilter={setLocalFilter}
     />
    {files&&
    <SelectableGroup

      selectables=".view-item"
      onSelectionChange={handlemain}
      onReset={handleReset}
      selectitems={selectitems}

    >
     
      <Wrapper
        $viewmode={viewmode}
        onMouseDown={handlewrapperclick}
        onContextMenu={(e) => menuopen(e, "background", {folderid:currentfolderid,source:'main'})}//폴더아이디
        onDragOver={handleBackgroundDragOver}
        //검색모드일땐 여러폴더 결과가 섞여있어서 "이 배경=현재폴더"가 성립안함. 이동 막고 기본동작만
        onDrop={searchkeyword ? handleBackgroundDrop : handleDropToCurrentFolder}
      >
        {viewmode === 'detail' ? (
          <Listtable
            {...props}
            files={displayedFiles}
            selectitems={selectitems}
            onFileContextMenu={onFileContextMenu} // 핸들러 전달
            issearchmode={!!searchkeyword}
            moveFn={moveFn}
            insertFn={insertFn}
            sortoption={sortoption}
            renamingid={renamingid} onRenameDone={onRenameDone}
            sorthandler={props.sorthandler}
            sortkeyhandler={props.sortkeyhandler}
            viewmenuhandler={props.viewmenuhandler}
            columnwidth={props.columnwidth}
            columnwidthhandler={props.columnwidthhandler}
          />
        ) : (//자세히말고
          displayedFiles && displayedFiles.map((file, index) => (
            <Viewitem
              key={file.id} // index 대신 file.id 권장
              item={file}
              viewmode={viewmode}
              className="view-item"
              data-index={index}
              data-id={file.id}
              isselected={selectitems.has(file.id)}
              onContextMenu={(e) => onFileContextMenu(e, file)} // 수정된 핸들러
              onDoubleClick={()=>openitem({item:file,onOpenFolderid:navigate})}
              issearchmode={!!searchkeyword}
              navigate={navigate}
              selectitems={selectitems}
              moveFn={moveFn}
              insertFn={insertFn}
              previews={folderpreviews&&folderpreviews[file.id]}
              renamingid={renamingid} onRenameDone={onRenameDone}
            />
          ))//z
        )}
        
      </Wrapper>
    </SelectableGroup>
}
  </MaivviewBody>
  );

}