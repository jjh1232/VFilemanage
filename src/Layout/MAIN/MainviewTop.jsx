import { useQuery } from "@tanstack/react-query"
import react, { useCallback, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { useDismiss } from "../TOOL/useDismiss"
import { useLanguage } from "../../Tools/LanguageProvider"
import { displayName } from "../../Tools/Formatters"


const TopWrapper=styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border-bottom: 1px solid ${props=>props.theme.line};
    box-sizing: border-box;
`
const Navdiv=styled.div`
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    position: relative;  /* 아래 히스토리 목록이 이걸 기준으로 붙음 */
`
//뒤로/앞으로를 꾹 눌렀을때 나오는 히스토리 목록
const Historymenu=styled.div`
    position: absolute;
    top: calc(100% + 4px);
    left: ${props=>props.$side==='forward' ? '28px' : '0'};
    min-width: 160px;
    max-width: 260px;
    max-height: 280px;
    overflow-y: auto;
    padding: 4px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border: 1px solid ${props=>props.theme.line};
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    z-index: 100;
`
const Historyitem=styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover{
        background: ${props=>props.theme.accent}22;
    }
`
const Navbutton=styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${props=>props.theme.text};
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) {
        background: ${props=>props.theme.accent}22;
    }
    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
`
const Addressdiv=styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
    overflow-x: auto;
    white-space: nowrap;
    padding: 3px 8px;
    border-radius: 6px;
    background: ${props=>props.theme.line}15;
`
//경로를 가운데로. justify-content:center는 넘쳤을때 왼쪽이 스크롤로 안닿는 문제가있어서
//margin:auto로 처리함(공간남으면 가운데, 넘치면 auto가 0이 돼서 정상 스크롤)
const Crumbs=styled.div`
    display: flex;
    align-items: center;
    margin: 0 auto;
    white-space: nowrap;
`
const Crumb=styled.span`
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    transition: background 0.15s;

    &:hover {
        background: ${props=>props.theme.accent}22;
        color: ${props=>props.theme.accent};
    }
`
const CurrentCrumb=styled.span`
    padding: 2px 6px;
    font-size: 13px;
    font-weight: 600;
`
const Arrow=styled.span`
    margin: 0 1px;
    color: ${props=>props.theme.icon};
    opacity: 0.6;
    font-size: 11px;
`
const Searchdiv=styled.div`
    position: relative;
    flex-shrink: 0;
`
const Searchinput=styled.input`
    width: 160px;
    padding: 5px 10px 5px 28px;
    border-radius: 6px;
    border: 1px solid ${props=>props.theme.line};
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    font-size: 12px;

    &:focus {
        outline: none;
        border-color: ${props=>props.theme.accent};
    }
`
const SearchIcon=styled.span`
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: ${props=>props.theme.icon};
    pointer-events: none;
`

export default function MainviewTop(props){

    const {currentfolderid,navigate,goBack,goForward,canGoBack,canGoForward,localFilter,setLocalFilter
        ,history=[],historyIndex=0,jumpTo}=props;

    const {t,lang}=useLanguage();

    const {data:folderpath}=useQuery({
            queryKey:["folderpath",currentfolderid],
            queryFn:()=>window.nodeapi.db.getFolderPath(currentfolderid),
          })

    //꾹 눌러서 여는 히스토리 목록. 'back' | 'forward' | null
    const [openmenu,setOpenmenu]=useState(null);
    const holdtimer=useRef(null);
    const didhold=useRef(false);

    //목록에 보여줄 최대개수. 항목높이(약28px)기준으로 Historymenu의 max-height에 딱 맞고,
    //목록 열때 항목마다 getFolderPath가 한번씩 나가서 그 비용도 같이 묶어주는 역할
    const HISTORYLIMIT=10;

    //뒤로목록은 현재위치 바로앞부터 거꾸로(가까운게 위), 앞으로목록은 바로뒤부터 순서대로.
    //둘다 "가까운 쪽"부터 자르기 때문에 reverse/slice 순서에 주의
    const backentries=history.slice(0,historyIndex)
        .map((id,i)=>({id,index:i}))
        .reverse()
        .slice(0,HISTORYLIMIT);
    const forwardentries=history.slice(historyIndex+1)
        .map((id,i)=>({id,index:historyIndex+1+i}))
        .slice(0,HISTORYLIMIT);
    const entries=openmenu==='back'?backentries:forwardentries;

    //화면에 실제로 보여줄 것들의 이름/전체경로만 조회(히스토리 전체를 훑으면 개수제한이 무의미해짐).
    //브레드크럼이 이미 쓰고있는 getFolderPath를 그대로 재활용함
    //(경로 끝이 그 폴더 자신의 이름. 전체경로는 "새폴더"처럼 이름겹칠때 구분용 툴팁으로 씀)
    const visibleids=entries.map(e=>e.id);
    const {data:namemap}=useQuery({
        //lang이 키에 있어야 언어를 바꿨을때 최상위 폴더 이름이 같이 바뀜.
        //여기선 이미 이어붙인 문자열을 저장해서, 나중에 화면에서 되돌릴 수가 없음
        queryKey:["historynames",visibleids,lang],
        queryFn:async()=>{
            const uniq=[...new Set(visibleids)];//같은 폴더가 여러번 있어도 조회는 한번만
            const chains=await Promise.all(uniq.map(id=>window.nodeapi.db.getFolderPath(id)));
            const map={};
            uniq.forEach((id,i)=>{
                const chain=chains[i]||[];
                map[id]={
                    name: chain.length? displayName(chain[chain.length-1],t) : '',
                    path: chain.map(c=>displayName(c,t)).join(' / '),
                };
            });
            return map;
        },
        enabled:openmenu!==null&&visibleids.length>0,
    })

    //누른채로 450ms 지나면 목록을 열고, 그전에 떼면 평소처럼 한칸만 이동
    const startHold=(which)=>{
        didhold.current=false;
        clearTimeout(holdtimer.current);
        holdtimer.current=setTimeout(()=>{
            didhold.current=true;
            setOpenmenu(which);
        },450);
    };
    const finishHold=(action)=>{
        clearTimeout(holdtimer.current);
        if(!didhold.current) action();
    };
    const cancelHold=()=>clearTimeout(holdtimer.current);

    //타이머가 살아있는채로 언마운트되면 사라진 컴포넌트에 setState하게됨
    useEffect(()=>()=>clearTimeout(holdtimer.current),[]);

    //바깥 클릭이나 ESC로 닫기(다른 팝업들과 공용)
    const closemenu=useCallback(()=>setOpenmenu(null),[]);
    useDismiss(openmenu!==null,closemenu);

    const renderMenu=()=>{
        if(!openmenu||entries.length===0) return null;
        return (
            <Historymenu $side={openmenu} onMouseDown={(e)=>e.stopPropagation()}>
                {entries.map(entry=>(
                    <Historyitem key={`${entry.index}-${entry.id}`}
                        title={namemap?.[entry.id]?.path||''}
                        onClick={()=>{ jumpTo(entry.index); setOpenmenu(null); }}
                    >
                        📁 {namemap?.[entry.id]?.name || '...'}
                    </Historyitem>
                ))}
            </Historymenu>
        );
    };

    return(
        <TopWrapper>
        <Navdiv>
            <Navbutton disabled={!canGoBack} title={t("back_tip")}
                onMouseDown={()=>startHold('back')}
                onMouseUp={()=>finishHold(goBack)}
                onMouseLeave={cancelHold}
            >◀</Navbutton>
            <Navbutton disabled={!canGoForward} title={t("forward_tip")}
                onMouseDown={()=>startHold('forward')}
                onMouseUp={()=>finishHold(goForward)}
                onMouseLeave={cancelHold}
            >▶</Navbutton>
            {renderMenu()}
        </Navdiv>
        <Addressdiv>
            <Crumbs>
            {folderpath&&folderpath.map((folder,index)=>{
                const islast=index===folderpath.length-1;
                return (
                    <react.Fragment key={folder.id}>
                        {index>0 && <Arrow>▶</Arrow>}
                        {islast
                            ? <CurrentCrumb>{displayName(folder,t)}</CurrentCrumb>
                            : <Crumb onClick={()=>navigate(folder.id)}>{displayName(folder,t)}</Crumb>
                        }
                    </react.Fragment>
                );
            })}
            </Crumbs>
        </Addressdiv>
        <Searchdiv>
            <SearchIcon>🔍</SearchIcon>
            <Searchinput
                type="text"
                placeholder={t("findinfolder")}
                value={localFilter}
                onChange={(e)=>setLocalFilter(e.target.value)}
            />
        </Searchdiv>
        </TopWrapper>
    )
}
