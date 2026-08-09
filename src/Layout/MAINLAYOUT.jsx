import React, { useEffect, useState } from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import Top from "./TOP/Top";
import Body from "./MAIN/Body";
import { useAppSetting } from "./TOOL/useAppSetting";
import { useFolderHistory } from "./TOOL/useFolderHistory";
import { LanguageProvider } from "../Tools/LanguageProvider";
import Lockscreen from "./TOOL/Lockscreen";
import { ConfirmProvider } from "./TOOL/Confirmdialog";


const Wrapper=styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: ${props=>props.theme.back};
    color:${props=>props.theme.text};
`
//크롬 기본 스크롤바가 두껍고 밝아서 어두운테마에서 혼자 튐.
//앱 전체(메인뷰/파일트리/드롭다운)를 얇고 테마색으로 통일
const GlobalStyle=createGlobalStyle`
    *::-webkit-scrollbar{
        width: 10px;
        height: 10px;
    }
    *::-webkit-scrollbar-track{
        background: transparent;
    }
    *::-webkit-scrollbar-thumb{
        /* 투명테두리+padding-box로 실제 막대를 얇아보이게 하는 방법 */
        background: ${({theme})=>theme.line}55;
        border: 2px solid transparent;
        background-clip: padding-box;
        border-radius: 5px;
    }
    *::-webkit-scrollbar-thumb:hover{
        background: ${({theme})=>theme.line}99;
        background-clip: padding-box;
    }
    *::-webkit-scrollbar-corner{
        background: transparent;
    }
`

export default function MainLAYOUT(){

    //드롭을 받는 영역(메인뷰/파일트리) 밖(툴바같은데)에 파일을 떨어뜨리면
    //Chromium 기본동작으로 그 파일 주소로 페이지가 이동해버려서 앱이 통째로 날아감.
    //창 전체에서 기본동작을 막아둠(실제 드롭처리는 각 영역이 알아서 함)
    useEffect(()=>{
        const preventDefault=(e)=>e.preventDefault();
        window.addEventListener('dragover',preventDefault);
        window.addEventListener('drop',preventDefault);
        return ()=>{
            window.removeEventListener('dragover',preventDefault);
            window.removeEventListener('drop',preventDefault);
        };
    },[]);


const themes={
  night: {
    back: '#121212',    // 순검정이 아닌 딥 차콜(매우 세련된 느낌)
    text: '#E0E0E0',    // 순백이 아닌 부드러운 밝은 회색(가독성 향상)
    icon: '#B0B0B0',    // 텍스트보다 살짝 어두운 회색으로 계층 표현
    line: '#B0B0B0',
    accent: '#4A90E2'   // 포인트용 블루(선택사항)
  },
  morning: {
    back: '#F4F4F4',    // 순백이 아닌 따뜻하고 부드러운 오프 화이트
    text: '#2E2E2E',    // 짙은 차콜(가독성이 좋고 눈이 안 아픔)
    icon: '#4A4A4A',    // 텍스트와 적절히 어우러지는 회색
    line: '#B0B0B0',
    accent: '#4A90E2'   // 톤다운된 포인트 컬러
  }
}

    //이전이나 지금폴더 작업중인거파일트리나타내기 + 뒤로가기/앞으로가기 히스토리
    const {currentfolderid,navigate,goBack,goForward,canGoBack,canGoForward
      ,history,historyIndex,jumpTo}=useFolderHistory(0);
    //활동여부
    const [activemain,setactivemain]=useState(false);
    //검색세팅
    const [searchkeyword,setSearchkeyword]=useState();
    //세팅핸들러
    const {viewmenu,viewmode,sortoption,isdarkmode,groupfolders,columnwidth,columnwidthhandler,
        viewmenuhandler,viewmodehandler,darkmodehandler,sorthandler
        ,sortkeyhandler,groupfoldershandler
    }=useAppSetting();

    const theme=isdarkmode ? themes.night:themes.morning;

    //앱 잠금. 확인 전엔 checking으로 두고 아무것도 안 보여줌
    //(잠긴 상태에서 Body가 잠깐이라도 뜨면 파일 목록이 조회돼버림)
    const [lockstate,setLockstate]=useState({checking:true,locked:false,hint:''});
    useEffect(()=>{
        (async ()=>{
            try{
                const status=await window.nodeapi.lock.status();
                setLockstate({checking:false,locked:status.has,hint:status.hint});
            }catch(err){
                //잠금 확인이 안되면 막지 않고 그냥 들여보냄(못 들어가는 상황이 더 나쁨)
                console.log("잠금상태 확인실패",err);
                setLockstate({checking:false,locked:false,hint:''});
            }
        })();
    },[]);

    return (
        <LanguageProvider>
        <ThemeProvider theme={theme}>
        <GlobalStyle/>
        {/* 확인창은 잠금화면 위에서도 떠야하니 바깥에 둠 */}
        <ConfirmProvider>

        {lockstate.checking
            ? null
            : lockstate.locked
                ? <Lockscreen hint={lockstate.hint}
                    onUnlock={()=>setLockstate(prev=>({...prev,locked:false}))}/>
                :
        <Wrapper>

            <Top viewmode={viewmode} viewmodehandler={viewmodehandler}
             viewmenus={viewmenu}
              sortoption={sortoption} sorthandler={sorthandler} sortkeyhandler={sortkeyhandler}
              isdarkmode={isdarkmode} darkmodehandler={darkmodehandler}
              searchkeyword={searchkeyword} setSearchkeyword={setSearchkeyword}
              currentfolderid={currentfolderid} navigate={navigate}
              activemain={activemain} setactivemain={setactivemain}
              groupfolders={groupfolders} groupfoldershandler={groupfoldershandler}
              />

            <Body currentfolderid={currentfolderid} navigate={navigate}
            goBack={goBack} goForward={goForward} canGoBack={canGoBack} canGoForward={canGoForward}
            history={history} historyIndex={historyIndex} jumpTo={jumpTo}
            viewmode={viewmode} viewmenu={viewmenu} sortoption={sortoption}
            sorthandler={sorthandler} sortkeyhandler={sortkeyhandler}
            viewmenuhandler={viewmenuhandler}
            columnwidth={columnwidth} columnwidthhandler={columnwidthhandler}
             searchkeyword={searchkeyword} setSearchkeyword={setSearchkeyword}
             activemain={activemain} setactivemain={setactivemain}
             groupfolders={groupfolders}
            />
        </Wrapper>
        }
        </ConfirmProvider>
        </ThemeProvider>
       </LanguageProvider>
    )

}