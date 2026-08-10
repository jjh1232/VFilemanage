import react, { useCallback } from "react";
import styled from "styled-components";
import { mockFiles } from "../../MOck/Mockfiles";
import Filetreeitem from "./Filetreeitem";

import { useQuery } from "@tanstack/react-query";
import SelectableGroup from "../TOOL/SelectDrag";
import { handleBackgroundDragOver, handleBackgroundDrop } from "../TOOL/DragUtils";

//중첩되는 컴포넌트라, 스크롤과 높이채우기는 최상위 하나만 해야함.
//예전엔 모든 레벨에 overflow-y:auto가 걸려서 안쪽마다 스크롤바가 겹쳐 생겼음
const Wrapper=styled.div`
        display: flex;
        flex-direction: column;
        min-width: 0;

        ${({$isroot})=>$isroot && `
          flex: 1;
          min-height: 0;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          /* 아래쪽만 넉넉히. 항목이 꽉 차도 맨 끝에 여유가 남아서
             마지막 항목이 창 밑단에 붙어있는 답답함이 없어진다 */
          padding: 2px 2px 40px 2px;
        `}
`

export default function Filetreewrapper({parentid=0,level=0,menuopen,activemain,navigate
    ,selectitems,prevSelectitems,setSelectitems,onSelectionChange,onReset,moveFn,insertFn,renamingid,onRenameDone}){
    //const [currentfolderid,setCurrentfolderid]=useState(0);
    //실제론 DB에서 가져올꺼고 여기에서 데이터가져옴 
    //아마필터도여기서?     
    
    const {data:filedata,isLoading}=useQuery({
        queryKey:["filedata",parentid],//사실상현재루트폴더 아이디
        queryFn:()=>window.nodeapi.db.readfiles({parentid,folderFirst:true})//Filetree는 항상 폴더먼저

    })
    /*테스트옹목
    const files=mockFiles.filter(item=>item.parentid===parentid)
    .sort((a,b)=>{
        switch(sortoption){
            case "name":
                return a.filename.localeCompare(b.filename);//이름순
            case "default":
                if(a.type==="folder"&&b.type!=="folder") return -1; //-1은 a먼저
                if (a.type !=="folder"&& b.type==="folder") return 1; //b먼저
                return a.filename.localeCompare(b.filename);
            default:
            return 0;
        }
    })
    ;
    */
    //선택상태는 Filetree.jsx에서 트리전체가 공유(레벨끼리 안따로놀게)
        const handlewrapperclick=(e)=>{
          if(!e.target.closest('.tree-item')){
            //배경클릭시 선택해제(=회색으로밀어내고 비움)
            onReset();
          }
        }

        const onFileContextMenu = useCallback((e, file) => {
             e.preventDefault();
            e.stopPropagation();
            console.log("우클릭로직시작")
            let currentfolderid=parentid;
            let currentIds = selectitems;
            let type = file.type;

            if (!selectitems.has(file.id)) {
              // 선택되지 않은 파일을 우클릭했을 때
              console.log("클릭되지않은영역ㄴ")
              const newSelect = new Set([file.id]);
              setSelectitems(newSelect);
              currentIds = newSelect;
            } else if (selectitems.size > 1) {
              // 이미 여러 개 선택된 상태에서 우클릭했을 때
              console.log("이미여러개선택됨")
              type = "manyfiles";
            }

            //source: 이름바꾸기 입력창이 메인뷰가 아니라 여기(트리)에 뜨게 하는 표시
            menuopen(e, type,{folderid:currentfolderid,selectid: Array.from(currentIds),source:'tree'});
          }, [selectitems, menuopen, setSelectitems]);
    return (
        <SelectableGroup selectables=".tree-item"
       onSelectionChange={onSelectionChange}
       onReset={onReset}
       selectitems={selectitems}>


        <Wrapper
         $isroot={parentid===-1}
         //최상위는 parentid가 -1(루트행을 뽑기위한 값)이라 그대로 쓰면 "새로만들기"가
         //루트의 형제로 생겨버림. 배경에서의 새로만들기는 루트(0) 안에 만드는게 맞음
         onContextMenu={(e) => menuopen(e, "background", {folderid: parentid===-1 ? 0 : parentid,source:'tree'})}
            onMouseDown={handlewrapperclick} //일단임시로 이거구조수정필요
            onDragOver={handleBackgroundDragOver}
            onDrop={handleBackgroundDrop}
            >
                {filedata&&filedata.map((file,index)=>
                <Filetreeitem key={index}
                item={file}
                level={level}
                 menuopen={menuopen}
                 parentid={parentid}
                 navigate={navigate}
                      //드래그
                   className="tree-item"
                   data-id={file.id}
                   onFileContextMenu={onFileContextMenu}
                   //indices는 스크립트기본
                   isselected={selectitems.has(file.id)}//선택전달has로
                   isstale={prevSelectitems.has(file.id)}//바로전에선택됐다밀려난것(회색)
                   activemain={activemain}
                   selectitems={selectitems} prevSelectitems={prevSelectitems}
                   setSelectitems={setSelectitems} onSelectionChange={onSelectionChange} onReset={onReset}
                   moveFn={moveFn}
                   insertFn={insertFn}
                   renamingid={renamingid} onRenameDone={onRenameDone}
                 />)}

        </Wrapper>
        </SelectableGroup>
    )
}