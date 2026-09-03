import { useEffect,useState,useCallback } from "react";

//자세히보기 열 기본너비(px). setting.js의 기본값과 같이 맞춰둘 것
//(예전에 만들어진 store엔 이 키가 없을수 있어서 여기에도 대비값이 필요함)
export const DEFAULTCOLUMNWIDTH={ filename:320, date:160, type:90, size:90 };



export function useAppSetting(){
     //목록설정
    const [viewmenu,SetViewmenu]=useState([]);
    //다크모드설정
    const [isdarkmode,setisdarkmode]=useState(false)
    //언어는 LanguageProvider가 단독으로 관리함(여기서 또 들고있으면 두 벌이 돼서 어긋남)

     //차순옵션
   const [sortoption,setSortoption]=useState({
    key:"filename",
    direction:"desc"
})
    //뷰메뉴형식관리
    const [viewmode,setViewmode]=useState("large");
    //폴더먼저보기(Mainview전용, Filetree는 항상켜짐이라 토글없음)
    const [groupfolders,setGroupfolders]=useState(true);
    //자세히보기 열 너비(px)
    const [columnwidth,setColumnwidth]=useState(DEFAULTCOLUMNWIDTH);

    useEffect(()=>{
             
            (async ()=>{
                try{
                    const view=await window.nodeapi.store.get("view");
                    const tree=await window.nodeapi.store.get("tree");
                    const user=await window.nodeapi.store.get("user");
                
                    SetViewmenu([
          { id: "filename", label: "checkview1", visiable:view.isdetail.isfilename},
      { id: "date", label: "checkview2", visiable: view.isdetail.isdate },
      { id: "type", label: "checkview3", visiable: view.isdetail.istype },
      { id: "size", label: "checkview4", visiable: view.isdetail.issize },
    
       ])
                setViewmode(view.viewoption)
                 setSortoption({key:view.sort.key,direction:view.sort.direction})
                //예전에 저장된 store엔 이 키가 없을수도있어서 없으면 기본true
                setGroupfolders(view.groupfolders ?? true)
                //열이 하나라도 빠져있으면 기본값으로 메워줌(store가 예전버전인 경우)
                setColumnwidth({...DEFAULTCOLUMNWIDTH, ...(view.columnwidth ?? {})})
                setisdarkmode(user.isdarkmode);
                }catch(err){
                        window.nodeapi.logerror("store설정 초기값실패")
                }
            })
            ();//이게 실행함수임 없으면 실행안함
        },[]);
        //목록속성 

    //핸들러==========================================
    //뷰메뉴핸들러
        const viewmenuhandler=(id)=>{
        SetViewmenu(prev =>{
            const newviewmenu=prev.map(col=>
                {if(col.id===id){
                    const newcol={...col,visiable:!col.visiable};
                    return newcol;
                }
                    return col;
                });
            //변경저장
            const target=newviewmenu.find(c=>c.id===id);
            const key=`is${id}` 
            window.nodeapi.store.set(`view.isdetail.${key}`,target.visiable);
            return newviewmenu;
        })
    }

         //크게보기등핸들러
    const viewmodehandler=(data)=>{
        setViewmode(data);
        window.nodeapi.store.set(`view.viewoption`,data);
    }
    //다크모드핸들러
    const darkmodehandler=()=>{
        setisdarkmode(prev=>{
            const newmode=!prev;
            window.nodeapi.store.set('user.isdarkmode',newmode);
            return newmode;
        });

    }
    //언어 전환은 LanguageProvider의 setLang이 담당(LanguageSwitcher가 직접 호출).
    //여기 있던 Languagehandler는 'user. Language'(공백 오타)에 저장해서 아무도 못읽는 값이었음

    //솔트는두개
    const sortkeyhandler=(newKey)=>{
        setSortoption((prev)=>
            
            ({...prev,key:newKey})
    
    );
        window.nodeapi.store.set("view.sort.key",newKey);
    }
    //차순
    const sorthandler=(direction)=>{
        setSortoption((prev)=>
            ({...prev,direction:direction})
        );
        window.nodeapi.store.set("view.sort.direction",direction);
    }
    //열 너비 저장. 드래그 도중엔 부르지 말것(Listtable이 놓는 순간에만 한번 호출함).
    //안그러면 마우스 움직일때마다 store 쓰기가 쏟아짐
    const columnwidthhandler=(widths)=>{
        setColumnwidth(widths);
        window.nodeapi.store.set('view.columnwidth',widths);
    }
    //폴더먼저보기 토글(Mainview전용)
    const groupfoldershandler=()=>{
        setGroupfolders(prev=>{
            const next=!prev;
            window.nodeapi.store.set('view.groupfolders',next);
            return next;
        })
    }
    return {
        viewmenu,
        viewmode,
        sortoption,
        isdarkmode,
        groupfolders,
        columnwidth,
        columnwidthhandler,
        viewmenuhandler,
        viewmodehandler,
        darkmodehandler,
        sortkeyhandler,
        sorthandler,
        groupfoldershandler
    }
}