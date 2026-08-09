import react, { useState } from "react";
import styled, { useTheme } from "styled-components";
import Filetreewrapper from "./Filetreewrapper";
import { useOpenItem } from "../TOOL/DoubleUtils";
import { getFileIcon } from "../../Tools/FileTypeIcons";
import { thumbUrl } from "../../Tools/Thumbnail";
import { displayName } from "../../Tools/Formatters";
import { useLanguage } from "../../Tools/LanguageProvider";
import { handleItemDragStart, handleFolderDragOver, handleFolderDrop, isRealDragLeave } from "../TOOL/DragUtils";
import Renameinput from "../TOOL/Renameinput";


//행+하위트리를 감싸는 순수 컨테이너. 배경색 없음 (자식쪽으로 안번지게)
const Container=styled.div`
`
//실제 선택되면 배경 붙는건 이 행 하나뿐
const Row=styled.div`
    display: flex;
    align-items: center;
    height: 24px;
    /* 들여쓰기는 레벨당 12px. 화살표 자리(14px)만큼은 파일도 같이 밀려서 이름줄이 딱 맞음 */
    padding-left: ${({$level})=>4+$level*12}px;
    padding-right: 6px;
    border-radius: 4px;
    cursor: default;
    user-select: none;

    /* 드롭대상은 accent를 꽉채워서, 그냥 선택된것(반투명)과 확실히 구분 */
    color: ${props => props.$isdragover ? '#fff' : props.theme.text};
    background-color: ${props => props.$isdragover
      ? props.theme.accent
      : (props.$isselected
        /* $isactive = 메인뷰가 활성패널이라 트리선택은 한발 물러난상태 */
        ? (props.$isactive ? `${props.theme.line}44` : `${props.theme.accent}66`)
        : (props.$isstale ? `${props.theme.line}22` : 'transparent'))};

    ${props => !props.$isdragover && !props.$isselected && `
      &:hover{ background-color: ${props.theme.accent}1a; }
    `}
`
const Itemlist=styled.div`
     display: flex;
     align-items: center;
     gap: 6px;
     min-width: 0;   /* 이게 없으면 긴 파일명이 안줄어들어서 ellipsis가 안먹음 */
     font-size: 13px;
`
//펼침 화살표. 파일에는 같은 너비의 빈칸을 둬서 이름 시작위치를 맞춤
const Arrow=styled.span`
    width: 14px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: ${props=>props.theme.icon};
    cursor: pointer;
`
const Arrowspace=styled.span`
    width: 14px;
    flex-shrink: 0;
`
const Filename=styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`
const IconImg=styled.img`
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    pointer-events: none;
    object-fit: ${props=>props.$isthumb ? 'cover' : 'contain'};
    ${props=>props.$isthumb && `border-radius: 2px;`}
`
export default function Filetreeitem(props){
    const {item,level,menuopen,isselected,isstale,onFileContextMenu,activemain,parentid,navigate
        ,selectitems,prevSelectitems,setSelectitems,onSelectionChange,onReset,moveFn,insertFn
        ,renamingid,onRenameDone,...remain}=props
    const isrenaming=renamingid===item.id
    //루트는 매번 화살표 누르게 하면 번거로우니 처음부터 펼쳐둠(루트만 level 0임)
    const [toggle,setToggle]=useState(level===0)
    const [isdragover,setIsdragover]=useState(false)
    const isfolder=item.type==="folder"
    //루트(id=0)는 어디로 옮길 대상이 아니라서 드래그 자체를 막음
    const isroot=item.id===0
    const Icon=getFileIcon(item.type)
    const theme=useTheme()
    const openitem=useOpenItem()
    const {t}=useLanguage()
    //썸네일 있으면 그 그림, 없으면 SVG 아이콘. 트리는 14px이라 폴더겹침은 안씀
    const iconnode=item.thumbversion
        ? <IconImg src={thumbUrl(item.id,item.thumbversion)} $isthumb alt=""/>
        : <Icon size={14} color={theme.icon}/>

    return(
    <Container>
        <Row $level={level} $isselected={isselected} $isactive={activemain} $isstale={isstale}
                    $isdragover={isdragover}
                    {...remain}
                    onContextMenu={(e)=>onFileContextMenu(e,item)}
                    onDoubleClick={()=>openitem({item,onOpenFolderid:navigate})}
                    draggable={!isroot}
                    onDragStart={isroot ? undefined : (e)=>handleItemDragStart(e,item,selectitems)}
                    onDragOver={isfolder ? handleFolderDragOver : undefined}
                    onDragEnter={isfolder ? (e)=>{e.preventDefault(); setIsdragover(true);} : undefined}
                    onDragLeave={isfolder ? (e)=>{ if(isRealDragLeave(e)) setIsdragover(false); } : undefined}
                    onDrop={isfolder ? (e)=>{setIsdragover(false); handleFolderDrop(e,item,moveFn,insertFn);} : undefined}
                    >
        {item.type==="folder"
        ?  <Itemlist>
           <Arrow onClick={(e)=>{e.stopPropagation();setToggle(!toggle);}}>{toggle?'▼': '▶'}</Arrow>
           {iconnode}
            {isrenaming
                ? <Renameinput item={item} onDone={onRenameDone}/>
                : <Filename>{displayName(item,t)}</Filename>}
            </Itemlist>
        : <Itemlist>
           <Arrowspace/>
           {iconnode}
            {isrenaming
                ? <Renameinput item={item} onDone={onRenameDone}/>
                : <Filename>{displayName(item,t)}</Filename>}
            </Itemlist>
        }
        </Row>

        {//부모아이디는 현재폴더 아이디로가야함, 컨테이너 밖으로 빼서 Row와 형제로
        item.type==="folder" && toggle &&
         <Filetreewrapper level={level+1} parentid={item.id} menuopen={menuopen} activemain={activemain} navigate={navigate}
            selectitems={selectitems} prevSelectitems={prevSelectitems}
            setSelectitems={setSelectitems} onSelectionChange={onSelectionChange} onReset={onReset}
            moveFn={moveFn} insertFn={insertFn}
            renamingid={renamingid} onRenameDone={onRenameDone}
         />
        }
    </Container>
    )
}