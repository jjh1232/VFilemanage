import React from "react";
import styled from "styled-components";
import Filetree from "../Filetree/Filetree";
import Mainview from "./Mainview";
import Contextmenu from "../TOOL/Contextmenu";
import MainviewTop from "./MainviewTop";


const Wrapper=styled.div`
    display: flex;   
    flex:1;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
`
const Filetreecontainer=styled.div`
    height: 100%;
    min-width: 0;   /* flex자식이 내용(긴 파일명)때문에 안줄어들고 창밖으로넘치는거 방지 */
    overflow: hidden;
`
const Mainviewcontainer=styled.div`
    flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;       /* 🔥 높이 제한 */
  min-height: 0;      /* 🔥 핵심! 이 속성이 있어야 자식(Wrapper)에서 스크롤이 생김 */
  overflow: hidden;
`


export default function Body(props){
    const {currentfolderid,navigate,goBack,goForward,canGoBack,canGoForward,activemain,setactivemain,viewmode,viewmenu, searchkeyword,setSearchkeyword,sortoption,groupfolders
      ,history,historyIndex,jumpTo,sorthandler,sortkeyhandler,viewmenuhandler
      ,columnwidth,columnwidthhandler}=props;
    //메뉴
    const contextmenu=Contextmenu();
    return (
        <Wrapper>
            {//파일트리영역
            }
            <Filetreecontainer onClickCapture={()=>setactivemain(false)}>


            <Filetree currentparentid={currentfolderid} navigate={navigate}
                activemain={activemain} setactivemain={setactivemain}
             menuopen={contextmenu.open}
             renamingid={contextmenu.renamingfor('tree')}
             onRenameStart={(id)=>contextmenu.startrename(id,'tree')}
             onRenameDone={contextmenu.endrename}/>
                </Filetreecontainer>
                 {//메인뷰영역
            }
             <Mainviewcontainer  onClickCapture={()=>setactivemain(true)}>
                {
                    //메인뷰 탑메뉴
                }


            <Mainview currentfolderid={currentfolderid} navigate={navigate}
                goBack={goBack} goForward={goForward} canGoBack={canGoBack} canGoForward={canGoForward}
                history={history} historyIndex={historyIndex} jumpTo={jumpTo}
                activemain={activemain} setactivemain={setactivemain}
            menuopen={contextmenu.open} viewmode={viewmode} viewmenu={viewmenu}
             searchkeyword={searchkeyword} setSearchkeyword={setSearchkeyword} sortoption={sortoption}
             sorthandler={sorthandler} sortkeyhandler={sortkeyhandler}
             viewmenuhandler={viewmenuhandler}
             renamingid={contextmenu.renamingfor('main')}
             //F2는 메인뷰에서만 받으니 항상 메인뷰쪽 입력창
             onRenameStart={(id)=>contextmenu.startrename(id,'main')}
             onRenameDone={contextmenu.endrename}
             columnwidth={columnwidth} columnwidthhandler={columnwidthhandler}
             groupfolders={groupfolders}
            />
               </Mainviewcontainer>
            
            {contextmenu.MenuRender()}
            {contextmenu.PickerRender()}
        </Wrapper>
    )

}