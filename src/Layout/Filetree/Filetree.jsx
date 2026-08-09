import React, { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import Filetreewrapper from "./Filetreewrapper";
import FiletreeTop from "./FiletreeTop";
import { useLanguage } from "../../Tools/LanguageProvider";
import { useRenameShortcut } from "../TOOL/useRenameShortcut";

const Wrapper=styled.div`
    display: flex;
    min-height: 0;
    height: 100%;
`

const FiletreeContent=styled.div`
    display: flex;
    flex-direction: column;
    width: ${props=>props.$width}px;
    height: 100%;
    min-width: 0;
    background-color: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    white-space: nowrap;//글자줄바꿈방지
`
//메인뷰와의 경계 겸 너비조절 손잡이. 평소엔 얇은 선만 보이다가 올리면 도드라짐
const Scrollbar=styled.div`
    flex: 0 0 5px;
    cursor: col-resize;
    background-color: ${props=>props.theme.line}33;
    transition: background-color 0.15s;

    &:hover {
      background-color: ${props=>props.theme.accent}88;
    }
    &:active {
      background-color: ${props=>props.theme.accent};
    }
`


export default function Filetree(props){
    const {currentfolderid,navigate,activemain,setactivemain,menuopen,renamingid,onRenameStart,onRenameDone}=props;
    const queryClient=useQueryClient();
    const {t}=useLanguage();
    const [treewidth,setTreesidth]=useState(200)
    const scrollbar =useRef(null);
    const startX=useRef(0)
    const startwidth=useRef(0)

    //트리 전체가 공유하는 선택상태(레벨끼리 안따로놀게 여기서 하나로 관리)
    //selectitems=지금선택(파랑), prevSelectitems=바로전에선택됐다가 밀려난것(회색)
    const [selectitems,setSelectitems]=useState(new Set());
    const [prevSelectitems,setPrevSelectitems]=useState(new Set());

    //F2 이름바꾸기. activemain이 false = 지금 트리를 쓰고있다는 뜻이라 그때만 반응
    useRenameShortcut({active:!activemain, selectitems, renamingid, onRenameStart});

    const handlemain=useCallback(({added,removed})=>{
        setSelectitems((prev)=>{
            const next=new Set(prev);
            added.forEach((el)=>next.add(Number(el.getAttribute("data-id"))));
            removed.forEach((el)=>next.delete(Number(el.getAttribute("data-id"))));
            return next;
        })
    },[]);

    //새로 선택이 시작될때(다른아이템 클릭/배경클릭) 지금꺼는 회색으로 밀어내고 비움
    //setState updater안에서 다른 setState부르는건 지저분해서 selectitems를 그냥 의존성으로 읽음
    const handleReset=useCallback(()=>{
        if(selectitems.size>0) setPrevSelectitems(selectitems);
        setSelectitems(new Set());
    },[selectitems]);

    //드래그로 폴더위에 놓았을때 실제 이동 실행. Mainview쪽과 무효화 키(filedata) 같아서 양쪽 다 갱신됨
    const moveFn=useCallback(async ({ids,targetParentId})=>{
        const result=await window.nodeapi.db.moveFiles({ids,targetParentId});
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
        setSelectitems(new Set());
    },[queryClient,t]);

    //OS(윈도우탐색기)에서 끌어온 파일/폴더를 그 폴더로 가져오기.
    //폴더면 안쪽 구조까지 그대로 재귀삽입됨(main.js의 insertPathsRecursive)
    const insertFn=useCallback(async ({paths,targetParentId})=>{
        const result=await window.nodeapi.insertfile({
            filepathfromdrop:paths,
            currentfolderid:targetParentId
        });
        if(result==="success"){
            await queryClient.invalidateQueries({queryKey:['filedata']});
        }
    },[queryClient]);

    const onMouseDown=(e)=>{
        e.preventDefault();
       startX.current=e.clientX; //useref로해야무브에값준다함
        startwidth.current=treewidth;
        const handleMouseMove=(e)=>{
            const deltaX=e.clientX-startX.current;
            //5vw-80vw제한
            setTreesidth(Math.max(window.innerWidth * 0.05,Math.min(window.innerWidth * 0.8,startwidth.current+deltaX)))
        }
       
  const handleMouseUp = () => {  // ← 따로 분리
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
   document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    }

    return (
        <Wrapper > 
            

            <FiletreeContent $width={treewidth}>
                 <FiletreeTop/>
                {/* 루트(id=0)는 parent_id가 -1이라, -1로 시작하면 루트 자신이 유일한 최상위 항목이 되고
                    그 아래로 기존 트리가 그대로 들어감. 특별취급 없이 아이콘/이동/드롭이 다 그냥 동작함 */}
                <Filetreewrapper parentid={-1} menuopen={menuopen} activemain={activemain} navigate={navigate}
                    selectitems={selectitems} prevSelectitems={prevSelectitems}
                    setSelectitems={setSelectitems} onSelectionChange={handlemain} onReset={handleReset}
                    moveFn={moveFn}
                    insertFn={insertFn}
                    renamingid={renamingid} onRenameDone={onRenameDone}
                />
            </FiletreeContent>
            
            <Scrollbar onMouseDown={onMouseDown}/>
        </Wrapper>
    )

}