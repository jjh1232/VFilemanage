import react, { useState } from "react";
import styled, { useTheme } from "styled-components";
import { getFileIcon } from "../../Tools/FileTypeIcons";
import { thumbUrl } from "../../Tools/Thumbnail";
import { displayName } from "../../Tools/Formatters";
import { useLanguage } from "../../Tools/LanguageProvider";
import { handleItemDragStart, handleFolderDragOver, handleFolderDrop, isRealDragLeave } from "../TOOL/DragUtils";
import Renameinput from "../TOOL/Renameinput";

const Wrapper=styled.div`
    border: 1px solid transparent;
    border-radius: 6px;
    /* 드롭대상 폴더는 선택색(연한파랑)보다 진한파랑으로 꽉채워서 "선택된것"과 확실히 구분 */
    background-color: ${props => props.$isdragover
        ? '#4A90E2'
        : (props.$isselected ? '#8dc0ec' : 'transparent')};
    ${props => props.$isdragover && `color: #fff;`}
    overflow: hidden;

    ${({ $viewmode }) => ($viewmode === 'verylarge' || $viewmode === 'large' || $viewmode === 'default') && `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 4px;
        padding: 6px 4px;
    `}
    ${({ $viewmode }) => $viewmode === 'small' && `
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        padding: 2px 6px;
        text-align: left;
    `}

    /* 칸 크기는 "아이콘 + 간격 + 파일명"이 들어갈 만큼 잡아야함.
       아래 iconsize와 짝이라 한쪽만 바꾸면 잘리거나 여백이 생김 */
    ${({ $viewmode }) => $viewmode === 'verylarge' && `
    width:240px;
    height:240px;
`}
   ${({ $viewmode }) => $viewmode === 'large' && `
  width:140px;
    height:152px;
`}
${({ $viewmode }) => $viewmode === 'default' && `
  width:92px;
    height:96px;
`}
${({ $viewmode }) => $viewmode === 'small' && `
    height:24px;
    width: 100%;
    box-sizing: border-box;
`}
${({ $viewmode }) => $viewmode === 'detail' && `
  height:20px;
`}
`
const IconImg=styled.img`
    flex-shrink: 0;
    pointer-events: none;

    /* 기본아이콘은 여백까지 보여야하니 contain, 썸네일은 칸을 꽉 채우게 cover */
    object-fit: ${props=>props.$isthumb ? 'cover' : 'contain'};
    ${props=>props.$isthumb && `border-radius: 3px;`}

    ${({ $viewmode }) => $viewmode === 'verylarge' && `width:180px; height:180px;`}
    ${({ $viewmode }) => $viewmode === 'large' && `width:96px; height:96px;`}
    ${({ $viewmode }) => $viewmode === 'default' && `width:56px; height:56px;`}
    ${({ $viewmode }) => $viewmode === 'small' && `width:16px; height:16px;`}
`
//폴더 = 탭 + 몸통. 몸통 안을 대표이미지 한장으로 채움.
//여러장 겹치기는 작은 크기에서 결국 뭉개져서, "이 폴더가 뭔지" 알려주는 한장에 집중함
const Foldercard=styled.div`
    position: relative;
    flex-shrink: 0;
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
    width: ${props=>props.$size}px;
    height: ${props=>props.$size}px;
`
//왼쪽 위로 튀어나온 탭. 폴더임을 알려주는 거의 유일한 단서라 확실히 보이게 둠
const Foldertab=styled.div`
    position: absolute;
    left: 3%;
    top: 8%;
    width: 44%;
    height: 16%;
    background: ${props=>props.theme.accent};
    border-radius: ${props=>props.$size*0.05}px ${props=>props.$size*0.05}px 0 0;
`
//몸통. 안쪽 여백만큼 accent가 남아서 이미지 액자 테두리처럼 보임.
//고른 장수에 따라 배치가 달라짐(1장은 꽉, 2장은 좌우, 3장은 왼쪽 큰거+오른쪽 두개, 4장은 2x2)
const Folderbody=styled.div`
    position: absolute;
    left: 2%;
    right: 2%;
    top: 21%;
    bottom: 9%;
    background: ${props=>props.theme.accent};
    border-radius: ${props=>props.$size*0.07}px;
    padding: ${props=>Math.max(1,props.$size*0.045)}px;
    box-sizing: border-box;
    overflow: hidden;

    display: grid;
    gap: ${props=>Math.max(1,props.$size*0.025)}px;
    ${props=>props.$count<=1 && `
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
    `}
    ${props=>props.$count===2 && `
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
    `}
    /* 3장은 왼쪽 한장이 세로로 길게, 오른쪽에 두장 */
    ${props=>props.$count===3 && `
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        & > *:first-child { grid-row: span 2; }
    `}
    ${props=>props.$count>=4 && `
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
    `}
`
const Coverimg=styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: ${props=>props.$size*0.035}px;
    background: ${props=>props.theme.back};
    min-width: 0;
    min-height: 0;
`
const Filename=styled.div`
    width: 100%;

    ${({ $viewmode }) => $viewmode === 'verylarge' && `
        font-size: 13px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-all;
    `}
    ${({ $viewmode }) => $viewmode === 'large' && `
        font-size: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-all;
    `}
    ${({ $viewmode }) => $viewmode === 'default' && `
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `}
    ${({ $viewmode }) => $viewmode === 'small' && `
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
        width: auto;
    `}
`
//검색모드일때만 보이는 위치라벨(어느 폴더에 있는 결과인지)
const Locationlabel=styled.div`
    font-size: 11px;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
        color: #4A90E2;
    }
`

export default function Viewitem({item,viewmode,column,menuopen,isselected,issearchmode,navigate,selectitems,moveFn,insertFn,previews,renamingid,onRenameDone,...rest}){

    const isrenaming=renamingid===item.id;

    //썸네일(자동생성된 축소본이나 폴더 대표이미지)이 있으면 그걸, 없으면 타입 기본아이콘.
    //그림 자체는 목록에 안실려오고 thumb:// 로 따로 받아옴
    const theme=useTheme();
    const {t}=useLanguage();
    const isthumb=!!item.thumbversion;
    const Icon=getFileIcon(item.type);
    const isfolder=item.type==="folder";
    //위 IconImg/Wrapper의 크기와 반드시 같이 움직여야함(폴더 카드가 이 값으로 그려짐)
    const iconsize={verylarge:180,large:96,default:56,small:16}[viewmode]||56;
    //표지 사진들. 직접 고른 폴더면 고른 순서대로, 아니면 자동선택된 것들(readFolderPreviews가 처리).
    //작은 뷰모드에선 여러장 나눠봐야 뭉개져서 첫 한장만 씀
    const canshowmany=viewmode==='verylarge'||viewmode==='large';
    const covers=isfolder&&previews
        ? (canshowmany ? previews.slice(0,4) : previews.slice(0,1))
        : [];
    const [isdragover,setIsdragover]=useState(false);

    return (
      <Wrapper $viewmode={viewmode}
                    $isselected={isselected}
                    $isdragover={isdragover}
                    draggable
                    onDragStart={(e)=>handleItemDragStart(e,item,selectitems)}
                    onDragOver={isfolder ? handleFolderDragOver : undefined}
                    onDragEnter={isfolder ? (e)=>{e.preventDefault(); setIsdragover(true);} : undefined}
                    onDragLeave={isfolder ? (e)=>{ if(isRealDragLeave(e)) setIsdragover(false); } : undefined}
                    onDrop={isfolder ? (e)=>{setIsdragover(false); handleFolderDrop(e,item,moveFn,insertFn);} : undefined}
                    {...rest} //이거편하네 남은 props다하는듯 rest아니여도됨

        >
            {isfolder
                //폴더는 항상 같은 카드 모양. 대표이미지가 있으면 몸통을 그걸로 채움
                ? <Foldercard $size={iconsize}>
                    <Foldertab $size={iconsize}/>
                    <Folderbody $size={iconsize} $count={covers.length}>
                        {covers.map(c=>(
                            <Coverimg key={c.id} $size={iconsize}
                                src={thumbUrl(c.id,c.version)}
                                alt=""/>
                        ))}
                    </Folderbody>
                  </Foldercard>
                : isthumb
                    //파일은 썸네일이 있으면 그 그림, 없으면 타입 아이콘
                    ? <IconImg $viewmode={viewmode} $isthumb src={thumbUrl(item.id,item.thumbversion)} alt=""/>
                    : <Icon size={iconsize} color={theme.icon}/>
            }
            {isrenaming
                ? <Filename $viewmode={viewmode}><Renameinput item={item} onDone={onRenameDone}/></Filename>
                : <Filename $viewmode={viewmode}>{displayName(item,t)}</Filename>
            }
            {issearchmode && item.location &&
                <Locationlabel
                    title={item.location}
                    onClick={(e)=>{ e.stopPropagation(); navigate&&navigate(item.parent_id); }}
                >
                    {item.location}
                </Locationlabel>
            }
        </Wrapper>

    )
}
