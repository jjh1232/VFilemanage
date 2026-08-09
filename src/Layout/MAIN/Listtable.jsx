import react, { useCallback, useRef, useState } from "react"
import styled from "styled-components"
import { useDismiss } from "../TOOL/useDismiss"
import { useLanguage } from "../../Tools/LanguageProvider"
import Listitem from "./Listitem"
import { useOpenItem } from "../TOOL/DoubleUtils"
import { handleItemDragStart, handleFolderDragOver, handleFolderDrop, isRealDragLeave } from "../TOOL/DragUtils"
//설정을 아직 못 읽었을때 쓸 대비값(실제 기본값은 useAppSetting/setting.js에 있음)
import { DEFAULTCOLUMNWIDTH as DEFAULTWIDTH } from "../TOOL/useAppSetting"
const MINWIDTH=60;   //너무 줄여서 열이 사라지는것 방지

const Tables=styled.table`
    /* 각 열 너비의 합. 창보다 좁으면 min-width가 늘려주고, 넓으면 가로스크롤 */
    width: ${props=>props.$width}px;
    min-width: 100%;
    border-collapse: collapse;
    /* 긴 파일명이 열 너비를 밀어내는걸 막고, 지정한 px를 그대로 쓰게 함 */
    table-layout: fixed;
    font-size: 13px;
    color: ${props=>props.theme.text};
`
const Tableth=styled.th`
    /* 목록을 내려도 머리글은 위에 남아있게 */
    position: sticky;
    top: 0;
    z-index: 2;
    width: ${props=>props.$width}px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    padding: 7px 10px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.icon};
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    /* border-collapse:collapse에선 sticky한 칸의 테두리가 스크롤시 사라져서 그림자로 대신함 */
    box-shadow: inset 0 -1px 0 ${props=>props.theme.line}55;

    /* 지금 정렬기준인 열은 글자를 진하게 */
    ${props=>props.$isactive && `color: ${props.theme.accent};`}

    &:hover{
        background: ${props=>props.theme.accent}1a;
    }
`
//정렬방향 화살표
const Sortmark=styled.span`
    margin-left: 4px;
    font-size: 9px;
`
//머리글 우클릭으로 나오는 열 표시/숨김 메뉴(윈도우탐색기 방식)
const Columnmenu=styled.div`
    position: fixed;
    left: ${props=>props.$x}px;
    top: ${props=>props.$y}px;
    min-width: 130px;
    padding: 4px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border: 1px solid ${props=>props.theme.line};
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    z-index: 200;
`
const Columnitem=styled.label`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
    cursor: ${props=>props.$disabled? 'default':'pointer'};
    opacity: ${props=>props.$disabled? 0.4:1};

    &:hover{
        background: ${props=>props.$disabled? 'transparent' : `${props.theme.accent}22`};
    }

    input{
        accent-color: ${props=>props.theme.accent};
        width: 13px;
        height: 13px;
        cursor: inherit;
    }
`
//열 경계선 겸 너비조절 손잡이.
//실제로 잡는 영역은 7px로 넉넉히 주고, 눈에 보이는 선은 ::after로 1px만 그림
const Thresizer=styled.div`
    position: absolute;
    right: -3px;      /* 경계에 걸쳐놔야 잡기 편함 */
    top: 0;
    bottom: 0;
    width: 7px;
    z-index: 3;
    cursor: col-resize;

    &::after{
        content: '';
        position: absolute;
        right: 3px;
        top: 25%;
        bottom: 25%;
        width: 1px;
        background: ${props=>props.theme.line}44;
        transition: background 0.15s;
    }
    &:hover::after{
        top: 0;
        bottom: 0;
        width: 2px;
        background: ${props=>props.theme.accent};
    }
`
const Trstyle=styled.tr`
   /* 드롭대상은 accent를 꽉채워서 그냥 선택된것(반투명)과 확실히 구분 */
   color: ${props => props.$isdragover ? '#fff' : 'inherit'};
   background-color: ${props => props.$isdragover
     ? props.theme.accent
     : (props.$isselected ? `${props.theme.accent}66` : 'transparent')};

   ${props => !props.$isdragover && !props.$isselected && `
     &:hover{ background-color: ${props.theme.accent}1a; }
   `}
`
const Tdstyle=styled.td`
    padding: 5px 10px;
    border-bottom: 1px solid ${props=>props.theme.line}1f;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`
export default function Listtable({currentindex,menuopen,viewmode,files,viewmenu
  ,selectitems,handlewrapperclick,handlemain,onFileContextMenu,navigate,issearchmode,moveFn,insertFn
  ,sortoption,sorthandler,sortkeyhandler,viewmenuhandler,columnwidth,columnwidthhandler
  ,renamingid,onRenameDone

}){
    const [dragoverid,setDragoverid]=useState(null);
    //머리글 우클릭 메뉴 위치. null이면 닫힘
    const [colmenu,setColmenu]=useState(null);

    const {t}=useLanguage();
    const openitem=useOpenItem();

    //바깥 클릭이나 ESC로 열메뉴 닫기(다른 팝업들과 공용)
    const closecolmenu=useCallback(()=>setColmenu(null),[]);
    useDismiss(colmenu!==null,closecolmenu);

    //열을 전부 끄면 표가 빈 껍데기가 되므로 마지막 하나는 못끄게 막음
    const visiblecount=viewmenu.filter(d=>d.visiable).length;

    //열 너비(px). 평소엔 설정(columnwidth)을 그대로 쓰고, 끄는 동안만 draft로 부드럽게 갱신.
    //드래그중에 매번 저장하면 마우스 움직임마다 store 쓰기가 쏟아져서, 놓는 순간에만 저장함
    const [draftwidth,setDraftwidth]=useState(null);
    const widths=draftwidth ?? columnwidth ?? DEFAULTWIDTH;
    const getwidth=(colid)=>widths[colid] ?? DEFAULTWIDTH[colid] ?? 120;

    const startx=useRef(0);
    const startw=useRef(0);
    const latestwidth=useRef(null);//놓는 순간 저장할 최종값
    //너비조절이 끝난 직후엔 클릭이 따라오는데, 그게 정렬로 오인되지 않게 시각을 기록해둠
    const lastresize=useRef(0);

    const startResize=(e,colid)=>{
        e.preventDefault();
        e.stopPropagation();
        startx.current=e.clientX;
        startw.current=getwidth(colid);
        latestwidth.current=null;

        const onmove=(ev)=>{
            const delta=ev.clientX-startx.current;
            setDraftwidth(prev=>{
                const base=prev ?? columnwidth ?? DEFAULTWIDTH;
                const next={...base,[colid]:Math.max(MINWIDTH,startw.current+delta)};
                latestwidth.current=next;
                return next;
            });
        };
        const onup=()=>{
            document.removeEventListener('mousemove',onmove);
            document.removeEventListener('mouseup',onup);
            //드래그중 강제했던 커서/선택막기 원복
            document.body.style.cursor='';
            document.body.style.userSelect='';
            lastresize.current=Date.now();
            //실제로 움직였을때만 저장하고 draft는 비움(이후엔 설정값을 다시 따라감)
            if(latestwidth.current && columnwidthhandler){
                columnwidthhandler(latestwidth.current);
            }
            setDraftwidth(null);
        };
        //손잡이를 벗어나도 드래그하는 동안은 커서 유지, 텍스트 선택 방지
        document.body.style.cursor='col-resize';
        document.body.style.userSelect='none';
        document.addEventListener('mousemove',onmove);
        document.addEventListener('mouseup',onup);
    };

    //열 머리글 클릭으로 정렬. 열 id(filename/date/type/size)가 DB의 정렬키와 그대로 같아서 바로 씀
    const sortkey=sortoption?.key;
    const sortdir=sortoption?.direction;
    const handleSort=(colid)=>{
        if(!sortkeyhandler||!sorthandler) return;
        //방금 너비를 끌고 놓은거면 정렬이 아님(마우스를 뗀 직후 click이 따라옴)
        if(Date.now()-lastresize.current<200) return;
        if(sortkey===colid){
            //이미 이 기준이면 오름/내림만 뒤집기
            sorthandler(sortdir==="ASC" ? "DESC" : "ASC");
        }else{
            //새 기준으로 바꿀땐 오름차순부터
            sortkeyhandler(colid);
            sorthandler("ASC");
        }
    };
    //표 전체 너비 = 보이는 열들의 너비 합
    const visiblecols=viewmenu.filter(data=>data.visiable);
    const totalwidth=visiblecols.reduce((sum,data)=>sum+getwidth(data.id),0);

    return (
        <>
        <Tables $width={totalwidth}>
            <thead onContextMenu={(e) => {
      e.preventDefault();
      e.stopPropagation(); //배경 컨텍스트메뉴가 같이 뜨는거 방지
      //머리글 우클릭 = 어떤 열을 보여줄지 고르기
      setColmenu({x:e.clientX, y:e.clientY});
    }}>
                <tr>
                       {visiblecols.map(data=>(
                         <Tableth key={data.id}
                                $width={getwidth(data.id)}
                                $isactive={sortkey===data.id}
                                onClick={()=>handleSort(data.id)}
                                title={t("column_tip")}>
                                {t(data.label)}
                                {sortkey===data.id &&
                                    <Sortmark>{sortdir==="ASC" ? "▲" : "▼"}</Sortmark>}
                                <Thresizer
                                    onMouseDown={(e)=>startResize(e,data.id)}
                                    onClick={(e)=>e.stopPropagation()}
                                />
                            </Tableth>
                       )
                       )}
                </tr>
            </thead>
         <tbody>
        {files?.map((file,index) => {
          const isfolder=file.type==="folder";
          return (
          <Trstyle key={file.id} className="view-item"
             data-index={index}
             data-id={file.id}
                   //indices는 스크립트기본
                   $isselected={selectitems.has(file.id)}//선택전달has로
                   $isdragover={dragoverid===file.id}
                    onContextMenu={(e)=>onFileContextMenu(e,file)}
                    onDoubleClick={()=>openitem({item:file,onOpenFolderid:navigate})}
                    draggable
                    onDragStart={(e)=>handleItemDragStart(e,file,selectitems)}
                    onDragOver={isfolder ? handleFolderDragOver : undefined}
                    onDragEnter={isfolder ? (e)=>{e.preventDefault(); setDragoverid(file.id);} : undefined}
                    onDragLeave={isfolder ? (e)=>{ if(isRealDragLeave(e)) setDragoverid(null); } : undefined}
                    onDrop={isfolder ? (e)=>{setDragoverid(null); handleFolderDrop(e,file,moveFn,insertFn);} : undefined}
          >
            {visiblecols.map(data => (
              <Tdstyle key={data.id}>
                <Listitem
                  item={file}
                  viewmode={viewmode}
                  column={data.id}
                  issearchmode={issearchmode && data.id==='filename'}
                  navigate={navigate}
                  renamingid={renamingid} onRenameDone={onRenameDone}
                />
              </Tdstyle>
            ))}
          </Trstyle>
          );
        })}
      </tbody>
        </Tables>

        {/* div는 table안에 못들어가서 표 바깥에 둠. position:fixed라 위치는 상관없음 */}
        {colmenu &&
            <Columnmenu $x={colmenu.x} $y={colmenu.y} onMouseDown={(e)=>e.stopPropagation()}>
                {viewmenu.map(data=>{
                    //마지막 남은 열까지 끄면 표가 통째로 비어버려서 그건 막음
                    const islast=data.visiable&&visiblecount<=1;
                    return (
                        <Columnitem key={data.id} $disabled={islast}
                            title={islast? t("column_min") : ""}>
                            <input type="checkbox"
                                checked={data.visiable}
                                disabled={islast}
                                onChange={()=>viewmenuhandler&&viewmenuhandler(data.id)}
                            />
                            {t(data.label)}
                        </Columnitem>
                    );
                })}
            </Columnmenu>
        }
        </>
    )
}