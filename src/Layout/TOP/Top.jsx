import React, { useCallback, useRef, useState } from "react"
import styled, { useTheme } from "styled-components";
import { DefaultIcon, Fileicon, FiletypeFolder, LargeIcon, Listicon, Settingicon, SmallIcon, SortAscIcon, SortDescIcon, SortIcon, VerylargeIcon } from "../../Tools/Iconbox";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Tools/LanguageProvider";
import InputDropdown from "./InputDropdown";
import { FilterView } from "./FilterView";
import { useDismiss } from "../TOOL/useDismiss";
import Settings from "./Settings";

const Wrapper=styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 14px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border-bottom: 1px solid ${props=>props.theme.line};
    box-sizing: border-box;
    /* 여긴 넘침 안 자름 - 파일입력/필터 드롭다운이 여기 바로 밑에 붙어서 뜨는데
       overflow를 여기서 자르면 드롭다운까지 같이 잘려버림 */
    /* Top 전체를 하나의 stacking context로 묶어서, 안의 드롭다운들이 아래 Body영역보다
       확실히 위에 뜨게 함(Body쪽 어딘가의 z-index랑 경쟁 안하게) */
    position: relative;
    z-index: 50;
`
//보기모드+정렬만 좁아지면 가로스크롤(글자 세로쪼개짐 방지). 드롭다운 없는 구간이라 잘려도 안전
const ScrollGroup=styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
`
//구간 나누는 얇은 세로선
const Divider=styled.div`
    width: 1px;
    height: 24px;
    background: ${props=>props.theme.line};
    opacity: 0.5;
    flex-shrink: 0;
`
const Filesection=styled.div`
    position: relative;
    display: flex;
    flex-shrink: 0;
`
const Listsection=styled.div`
    display: flex;
    gap: 2px;
    flex-shrink: 0;
`
const Viewoptionsection=styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
`
const Settingsection=styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    flex-shrink: 0;
`
const InputButton=styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: ${props=>props.theme.accent};
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: filter 0.15s;

    &:hover {
        filter: brightness(0.9);
    }
`
const IconButton=styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: none;
    border-radius: 6px;
    background: ${({theme,$isactive})=>$isactive? theme.accent+'26' : 'transparent'};
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
        background: ${props=>props.theme.accent}26;
    }
`
//정렬 기준 드롭다운. 다른 팝업들(필터/파일추가)과 같은 결
const Sortbutton=styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${props=>props.theme.line}22;
    transition: background 0.15s;

    &:hover { background: ${props=>props.theme.accent}22; }
`
const Caret=styled.span`
    font-size: 9px;
    opacity: 0.6;
`
//주의: absolute로 두면 부모 ScrollGroup의 overflow-y:hidden에 잘려서 아예 안보임.
//fixed로 띄우고 버튼 위치를 재서 좌표를 넣어줌(Listtable의 열 메뉴와 같은 방식)
const Sortmenu=styled.div`
    position: fixed;
    top: ${props=>props.$y}px;
    left: ${props=>props.$x}px;
    min-width: 130px;
    padding: 4px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border: 1px solid ${props=>props.theme.line};
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    z-index: 1000;
`
const Sortoption=styled.div`
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    color: ${({theme,$isactive})=>$isactive? theme.accent : 'inherit'};
    font-weight: ${({$isactive})=>$isactive? 600 : 400};

    &:hover { background: ${props=>props.theme.accent}22; }
`
const Formtable=styled.div`
    display: flex;
    gap: 2px;
`
const Formitem=styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 6px;
    cursor: pointer;
    background-color: ${({theme,$isactive})=>$isactive? theme.accent+'33':'transparent'};
    transition: background-color 0.15s;

    &:hover{
        background-color: ${props=>props.theme.accent}22;
    }
`
const Filterdiv=styled.div`
    position: relative;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${props=>props.theme.line}22;

    &:hover {
        background: ${props=>props.theme.accent}22;
    }
`
const Searchbox=styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`
const Searchinput=styled.input`
    width: 140px;
    flex-shrink: 0;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid ${props=>props.theme.line};
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    font-size: 13px;

    &:focus {
        outline: none;
        border-color: ${props=>props.theme.accent};
    }
`
const Searchbutton=styled.button`
    padding: 5px 10px;
    border-radius: 6px;
    border: none;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${props=>props.theme.accent};
    color: white;
    font-size: 13px;
    cursor: pointer;

    &:hover {
        filter: brightness(0.9);
    }
`

export default function Top({viewmode,viewmodehandler,
    viewmenus,sortoption,sorthandler,sortkeyhandler,
    isdarkmode,darkmodehandler,searchkeyword
    ,setSearchkeyword,currentfolderid,navigate,groupfolders,groupfoldershandler
}
){

    const theme=useTheme();
    const queryClient=useQueryClient();
    const [inputfiles,setInputfiles]=useState([])
    const [result,setResult]=useState()
    const  {lang,setLang,t}=useLanguage();//언어호출
    const [isinputmenu,setisinputmenu]=useState(false)
    const [isfiltermenu,setisfiltermenu]=useState(false)
    const [issettings,setissettings]=useState(false)
    const [issortmenu,setissortmenu]=useState(false)
    const [sortmenupos,setSortmenupos]=useState({x:0,y:0})
    const [tempkeyword,settempkeyword]=useState();

    //메뉴가 fixed라 버튼 바로 아래 좌표를 눌린 순간에 재서 넣어줌
    const opensortmenu=(e)=>{
        if(issortmenu){ setissortmenu(false); return; }
        const box=e.currentTarget.getBoundingClientRect();
        setSortmenupos({x:box.left, y:box.bottom+6});
        setissortmenu(true);
    };

    //바깥클릭/ESC로 닫기. onClose는 훅 의존성에 들어가니 useCallback으로 고정
    const closeinput=useCallback(()=>setisinputmenu(false),[]);
    const closefilter=useCallback(()=>setisfiltermenu(false),[]);
    const closesort=useCallback(()=>setissortmenu(false),[]);
    useDismiss(isinputmenu,closeinput);
    useDismiss(isfiltermenu,closefilter);
    useDismiss(issortmenu,closesort);
    //팝업을 여는 버튼들은 mousedown을 막아야함(자세한 이유는 useDismiss 주석 참고)
    const stopmousedown=(e)=>e.stopPropagation();
const viewmodes=[
    {id:"verylarge",label:t("view1"),icon:VerylargeIcon},
    {id:"large",label:t("view2"),icon:LargeIcon},
    {id:"default",label:t("view3"),icon:DefaultIcon},
    {id:"small",label:t("view4"), icon:SmallIcon},
    {id:"detail",label:t("view5"),icon:Listicon}
]
//드롭다운 버튼에 지금 정렬기준 이름을 띄움.
//설정을 아직 못읽어 목록이 비었을 수 있어서 없으면 키를 그대로 보여줌
const currentsort=viewmenus&&viewmenus.find(d=>d.id===sortoption.key);
const currentsortlabel=currentsort? t(currentsort.label) : t("checkview1");
//검색온채인지
const timerref=useRef(null);
const handlechange=(e)=>{
    const value=e.target.value;
    //입력창글자가바로보이도록우선
    settempkeyword(value);
    //이전에설정된타이머가있을시 취소
    if(timerref.current){
        clearTimeout(timerref.current);//ref에 타임이있을시
    }
    timerref.current=setTimeout(()=>{//ref에 타임아웃저장
        setSearchkeyword(value);
    },400)
}
//아이콘매핑
//데이터정렬메소드
const newarray=()=>{
    //queryClient
}
   // const result2=window.Moveadd.test1()
    return (
        <Wrapper>

           <Filesection>
             <InputButton title={t("fileinput")}
                onMouseDown={stopmousedown}
                onClick={()=>setisinputmenu(v=>!v)}>
                <Fileicon size={18} color="white"/>
                {isinputmenu&&<InputDropdown currentfolderid={currentfolderid} closeInputMenu={()=>setisinputmenu(false)}/>}
            </InputButton>

           </Filesection>

           <Divider/>

           <ScrollGroup>
            <Listsection>
       {viewmodes.map((data,index)=>(
        <Formitem key={index} title={data.label} onClick={()=>viewmodehandler(data.id)} $isactive={viewmode===data.id}>
            <data.icon size={17} color={viewmode===data.id? theme.accent : theme.icon}/>
        </Formitem>
       ))}
            </Listsection>

            <Divider/>

            <Viewoptionsection>
                {/* 정렬 기준: 칩 4개를 늘어놓는 대신 드롭다운 하나로 접음.
                    숨긴 열 기준으로도 정렬할 수 있어야 하고 격자뷰엔 열 개념이 없어서 visiable로 안 거름 */}
                <Sortbutton onMouseDown={stopmousedown} onClick={opensortmenu} title={t("sortby_tip")}>
                    <SortIcon size={15} color={theme.icon}/>
                    {currentsortlabel}
                    <Caret>▾</Caret>
                </Sortbutton>
                {issortmenu &&
                    <Sortmenu $x={sortmenupos.x} $y={sortmenupos.y} onMouseDown={stopmousedown}>
                        {viewmenus&&viewmenus.map(data=>(
                            <Sortoption key={data.id}
                                $isactive={sortoption.key===data.id}
                                onClick={()=>{sortkeyhandler(data.id); setissortmenu(false);}}>
                                {t("sortby_"+data.id)}
                            </Sortoption>
                        ))}
                    </Sortmenu>
                }

                {/* 방향: 라디오 두개 대신 화살표 하나로 토글 */}
                <IconButton
                    onClick={()=>sorthandler(sortoption.direction==="ASC" ? "DESC" : "ASC")}
                    title={t(sortoption.direction==="ASC" ? "ASC" : "DESC")}>
                    {sortoption.direction==="ASC"
                        ? <SortAscIcon size={17} color={theme.icon}/>
                        : <SortDescIcon size={17} color={theme.icon}/>}
                </IconButton>

                {/* 폴더 먼저: 체크박스 대신 켜짐/꺼짐이 보이는 아이콘 버튼 */}
                <IconButton $isactive={groupfolders}
                    onClick={groupfoldershandler}
                    title={t("groupfolders_tip")}>
                    <FiletypeFolder size={17} color={groupfolders? theme.accent : theme.icon}/>
                </IconButton>

            </Viewoptionsection>
           </ScrollGroup>

            <Settingsection>

                    {/* 언어/다크모드/잠금은 설정창 한곳에 모음 */}
                    <IconButton onClick={()=>setissettings(true)} title={t("settings")}>
                        <Settingicon size={18} color={theme.icon}/>
                    </IconButton>
                    <Filterdiv onMouseDown={stopmousedown} onClick={()=>setisfiltermenu(v=>!v)}>
                           {t("filter")}
                            {isfiltermenu&&<FilterView setisopen={setisfiltermenu}/>}
                    </Filterdiv>
                    <Searchbox>
                        <Searchinput type="text" placeholder={t("search")} onChange={handlechange} value={tempkeyword||""}/>
                        <Searchbutton>
                            {t("search")}
                        </Searchbutton>
                    </Searchbox>
            </Settingsection>

            {issettings &&
                <Settings
                    isdarkmode={isdarkmode}
                    darkmodehandler={darkmodehandler}
                    onClose={()=>setissettings(false)}
                />
            }
        </Wrapper>
    )

}
