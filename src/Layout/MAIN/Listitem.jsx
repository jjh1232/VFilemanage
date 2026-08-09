import react from "react";
import styled, { useTheme } from "styled-components";
import { getFileIcon } from "../../Tools/FileTypeIcons";
import { formatSize, formatDate, displayName } from "../../Tools/Formatters";
import { thumbUrl } from "../../Tools/Thumbnail";
import { useLanguage } from "../../Tools/LanguageProvider";
import Renameinput from "../TOOL/Renameinput";

//Listitem은 자세히보기에서만 쓰여서 뷰모드별 분기가 필요없음(예전 verylarge 200x200 블록은 죽은코드였음)
const Wrapper=styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`
const IconImg=styled.img`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    pointer-events: none;
    /* 썸네일은 작은 칸을 꽉 채우게, 기본아이콘은 여백 유지 */
    object-fit: ${props=>props.$isthumb ? 'cover' : 'contain'};
    ${props=>props.$isthumb && `border-radius: 2px;`}
`
const Filename=styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`
const Locationlabel=styled.div`
    flex-shrink: 0;
    font-size: 11px;
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
        opacity: 1;
        color: ${props=>props.theme.accent};
    }
`

export default function Listitem({item,viewmode,column,menuopen,isselected,issearchmode,navigate,renamingid,onRenameDone,...rest}){

    const isrenaming=renamingid===item.id;
    const {t}=useLanguage();

    const dataMap={
          filename: displayName(item,t),
          //초는 빼고 분까지만
          date: formatDate(item.date),
          type: item.type,
          //raw 바이트 대신 "1.5 MB"처럼. 폴더는 빈칸
          size: formatSize(item.size, item.type)
    }
    const displaydata=dataMap[column]||''
    //파일이름 칸에만 아이콘을 같이 보여줌
    const showIcon=column==='filename'
    const Icon=getFileIcon(item.type)
    const theme=useTheme()

    return (

              <Wrapper>
                {showIcon && (item.thumbversion
                    ? <IconImg src={thumbUrl(item.id,item.thumbversion)} $isthumb alt=""/>
                    : <Icon size={16} color={theme.icon}/>
                )}
                {/* 이름 고치는 중이면 파일이름 칸에서만 입력창으로 */}
                {(isrenaming && showIcon)
                    ? <Renameinput item={item} onDone={onRenameDone}/>
                    : <Filename>{displaydata}</Filename>
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
