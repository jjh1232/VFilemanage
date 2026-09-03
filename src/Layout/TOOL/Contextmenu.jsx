import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import { createEmptyFolder } from "./FolderUtils";
import { getFileType } from "./TypeRule";
import Coverpicker from "./Coverpicker";
import { useLanguage } from "../../Tools/LanguageProvider";
import { useConfirm } from "./Confirmdialog";
import { formatSize } from "../../Tools/Formatters";

//다른 팝업들(히스토리목록/열메뉴/필터)과 같은 모양으로 통일
const Menuwrapper=styled.div`
    position: fixed;
    left: ${(props)=>`${props.$positionx}px`};
    top: ${(props)=>`${props.$positiony}px`};
    /* 고정폭이면 긴 항목이름이 줄바꿈돼서 최소폭으로 */
    min-width: 150px;
    padding: 4px;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border: 1px solid ${props=>props.theme.line};
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    z-index: 1000;
    user-select: none;
`
const Menuitem=styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 5px;
    font-size: 13px;
    white-space: nowrap;
    transition: background 0.15s;

    /* 비활성(예: 복사해둔게 없을때의 붙여넣기)은 회색으로만 보이고 반응 안함 */
    opacity: ${props=>props.$disabled? 0.4 : 1};
    cursor: ${props=>props.$disabled? 'default' : 'pointer'};

    &:hover{
        background: ${props=>props.$disabled? 'transparent' : `${props.theme.accent}22`};
    }
`


//메뉴에 보이는 순서. 어떤 항목이 나오냐는 상황(파일/폴더/배경)마다 다르지만
//"나온 것들끼리의 순서"는 항상 이 표를 따름 — 분기마다 배열을 손으로 짜면
//한쪽만 고치고 다른쪽은 그대로라 우클릭 위치에 따라 순서가 달라지는 일이 생김.
//만드는것 → 고치는것 → 옮기는것 → 지우는것 순
const Menuorder=["cover","newfolder","rename","copy","paste","delete","export"];
//표에 없는 항목(예: 파일종류별 서브메뉴)은 맨 뒤로. sort가 안정정렬이라 자기들끼리 순서는 유지됨
const sortmenu=(list)=>{
    const rank=(item)=>{
        const index=Menuorder.indexOf(item.id);
        return index<0? Menuorder.length : index;
    };
    return [...list].sort((a,b)=>rank(a)-rank(b));
}

export default function Contextmenu(){
    const queryClient=useQueryClient();
    const {t}=useLanguage();
    const confirm=useConfirm();
    const [isopen,setIsopen]=useState(false);
    const [position,setPosition]=useState({x:0,y:0});
    const [selectid,Setselectid]=useState(0);
    const [type,setType]=useState();
    const [folderid,setfolderid]=useState();
    //복사해둔 id들. Body.jsx가 Contextmenu()를 한번만 만들어 Filetree/Mainview에 같이 넘기므로
    //한쪽에서 복사해서 다른쪽에 붙여넣는게 그냥 됨
    const [clipboard,setClipboard]=useState([]);
    //대표이미지 고르는 창을 띄울 폴더 id. null이면 닫힘
    const [pickerfolder,setPickerfolder]=useState(null);
    //지금 이름을 고치고 있는 항목. {id, source} 형태.
    //같은 파일이 파일트리와 메인뷰에 동시에 보이는게 정상이라, id만 들고있으면
    //양쪽에 입력창이 하나씩 뜨고 서로 포커스를 뺏어서(=blur→저장→닫힘) 즉시 사라져버림.
    //그래서 "어느 패널에서 시작했는지"까지 같이 기억해 그쪽에만 띄움
    const [renaming,setRenaming]=useState(null);
    //우클릭이 어느 패널에서 났는지(메뉴의 이름바꾸기가 이걸 그대로 씀)
    const [menusource,setMenusource]=useState('main');
    //메모메뉴

    //루트(id=0)는 트리의 뿌리라 복사/삭제/이름바꾸기 대상이 아님.
    //파일트리에 보이는건 물론이고, 검색하면 메인뷰에도 폴더카드로 뜸
    //(readsearchFiles는 parent_id를 안가려서 "oo"만 쳐도 걸림) — 그래서 양쪽 다 여기서 걸러짐.
    //DB의 deleteFile은 이미 루트를 무시하지만, 메뉴에 보이는채로 눌러도 아무일 없으면
    //고장난걸로 보이므로 아예 안보이게 하는게 맞음
    const actionids=(selectid||[]).filter(id=>Number(id)!==0);
    const hasaction=actionids.length>0;

    //선택된 대상이 있을때만 의미있는 것들(빈 배경에는 안 붙음)
    const Basemenu=hasaction? [
        {id:"copy",label:t("menu_copy"),onClick:()=>setClipboard(actionids)},
        {id:"delete",label:t("menu_delete"),onClick:()=>deletefiles(actionids)},
        {id:"rename",label:t("menu_rename"),onClick:()=>startrename(actionids,menusource)},
    ] : []
    //붙여넣기는 항상 보이되, 복사해둔게 없으면 회색으로 비활성.
    //숨겼다 나타났다 하면 "어디갔지?" 하게 돼서 상시 노출이 나음
    const pasteitem=(targetid)=>({
        id:"paste",
        label:t("menu_paste"),
        disabled:!(clipboard&&clipboard.length>0),
        onClick:()=>pastefiles(targetid)
    });
    //새로만들기/붙여넣기는 "어느 폴더 안에 넣을지"가 대상이라 같이 움직여야함.
    //배경에선 지금 보고있는 폴더, 폴더나 루트를 우클릭했을땐 클릭한 그 폴더가 대상.
    //예전엔 여기가 folderid로 박혀있어서, 폴더를 우클릭해도 새로만들기가 없었고
    //붙여넣기만 클릭한 폴더로 들어가는 엇박이 났음
    const newfolderitem=(targetid)=>({
        id:"newfolder",
        label:t("menu_newfolder"),
        onClick:()=>createfolder(targetid)
    });
    //파일,폴더,배경등중분류
    const Groubmenu={
        folder:[
            {id:"cover",label:t("menu_cover"),onClick:()=>openpicker(selectid)},
            {id:"export",label:t("menu_export"),onClick:()=>exportfolder(selectid)},
        ],
    }
    //각각서브
    const Subtypemenu={
        image:[
            {label:t("image"),onClick:()=>console.log("섬네일변경")}
        ],
        video:[
            {label:t("video"),onClick:()=>console.log("비디오")}
        ],
    
    }
    const items=useMemo(()=>{
        //빈 배경은 선택된 대상 자체가 없으니 복사/삭제/이름바꾸기가 나오면 안됨.
        //붙여넣기 대상은 지금 보고있는 폴더
        if(type==="background"){
            return sortmenu([newfolderitem(folderid), pasteitem(folderid)]);
        }
        //여러개 선택했을땐 이름바꾸기가 성립안함(한번에 하나씩만 가능)
        //Mainview/Filetree가 보내는 값이 "manyfiles"인데 예전 코드는 "manyfile"을 보고있어서
        //이 분기가 아예 죽어있었고, 여러개 선택해도 이름바꾸기가 그대로 떴음
        if(type==="manyfiles"){
            const menus=Basemenu.filter(menu=>menu.id!=="rename");
            //루트만 골랐다면 남는게 없음. 빈 메뉴가 뜨는것보단 붙여넣기라도 보이는게 나음
            return sortmenu(menus.length>0? menus : [pasteitem(folderid)]);
        }
        if(type==="folder"){
            //폴더에 붙여넣을땐 대상이 "클릭한 그 폴더"임.
            //folderid는 지금 보고있는 폴더라서 여기서 쓰면 엉뚱한 곳에 붙음
            const target=Array.isArray(selectid)? selectid[0] : selectid;
            //루트는 복사/삭제/이름바꾸기가 빠지고 "안에 넣는" 동작만 남음.
            //대표이미지도 뿌리폴더엔 의미가 없어서 뺌 (= 빈 배경 우클릭과 같은 구성)
            if(!hasaction) return sortmenu([newfolderitem(target), pasteitem(target)]);
            return sortmenu([...Basemenu,...Groubmenu.folder, newfolderitem(target), pasteitem(target)]);
        }
        //파일: 파일"안에"는 못넣으니 지금 보고있는 폴더로 붙여넣음(윈도우도 같은 동작)
        return sortmenu([...Basemenu,...(Subtypemenu[type]||[]), pasteitem(folderid)]);
        //selectid/folderid는 각 항목의 onClick이 붙잡고 있는 값이라 반드시 의존성에 있어야함.
        //예전엔 [type]뿐이라, 파일A를 우클릭한뒤 파일B를 우클릭하면(type이 그대로여서 갱신이 안됨)
        //삭제가 여전히 A를 가리키는 문제가 있었음.
        //clipboard도 있어야 복사 직후 붙여넣기 항목이 바로 나타남
        //menusource도 이름바꾸기 onClick이 붙잡는 값이라 빠지면 예전 패널로 입력창이 뜸
    },[type,selectid,folderid,clipboard,menusource])

    //삭제. 화면 갱신을 해야해서 queryClient가 있는 여기서 처리함(예전엔 menuHandler에 있어서
    //DB에서만 지워지고 화면은 그대로라 안지워진것처럼 보였음)
    const deletefiles=async(ids)=>{
        const idArray=Array.isArray(ids)? ids:[ids];
        if(idArray.length===0) return;

        const message=idArray.length>1
            ? t("delete_confirm_many",{n:idArray.length})
            : t("delete_confirm_one");
        const ok=await confirm({
            title:t("delete_title"),
            message,
            confirmlabel:t("menu_delete"),
            tone:'danger'
        });
        if(!ok) return;

        try{
            await window.nodeapi.db.deleteFile(idArray);
            await queryClient.invalidateQueries({queryKey:['filedata']});
        }catch(error){
            window.nodeapi.logerror("삭제 실패",error);
        }
    }

    //이름바꾸기 시작. 여러개 선택돼있어도 한번에 하나만 고칠수있으니 첫번째만.
    //source는 'main'(메인뷰) 또는 'tree'(파일트리) — 그 패널에만 입력창이 뜸
    const startrename=(ids,source)=>{
        const targetid=Array.isArray(ids)? ids[0] : ids;
        if(targetid===undefined||targetid===null) return;
        setRenaming({id:targetid, source:source||'main'});
    }

    //가상 폴더구조를 실제 디스크에 펴기.
    //먼저 미리보기(DB만 훑음)를 보여주고, 원본을 지울지는 그 창에서 체크로 고르게 함
    const exportfolder=async(ids)=>{
        const targetid=Array.isArray(ids)? ids[0] : ids;
        if(targetid===undefined||targetid===null) return;

        const preview=await window.nodeapi.exportPreview({folderid:targetid});
        if(!preview) return;

        const lines=[t("export_summary",{
            folders:preview.folders,
            files:preview.files,
            size:formatSize(preview.bytes,'file')
        })];
        //같은 원본을 여러 폴더에서 가리키면 사본이 그만큼 생김. 놀라지 않게 미리 알려줌
        if(preview.duplicated>0) lines.push(t("export_dup",{n:preview.duplicated}));
        if(preview.missing>0) lines.push(t("export_missing",{n:preview.missing}));

        const answer=await confirm({
            title:t("export_title",{name:preview.name}),
            message:lines.join('\n'),
            confirmlabel:t("export_start"),
            checkbox:{label:t("export_removeorigin"), warning:t("export_removewarn")}
        });
        if(!answer) return;

        const result=await window.nodeapi.exportFolder({
            folderid:targetid,
            removeorigin:!!answer.checked
        });

        //폴더 고르는 창에서 취소한건 실패가 아니라 그냥 안한것
        if(!result||result.reason==='canceled') return;
        if(result.ok===false){
            await confirm({
                title:t("export_failtitle"),
                message:result.message||t(result.reason||'')||'',
                alertonly:true
            });
            return;
        }

        //원본을 옮겼으면 realpath가 바뀌었으니 목록을 다시 읽어야 함
        if(answer.checked) await queryClient.invalidateQueries({queryKey:['filedata']});

        const done=[t("export_done",{folders:result.folders,files:result.files})];
        //"옮김"과 "휴지통"은 되돌리는 방법이 달라서 반드시 나눠서 알려줘야함
        if(result.moved>0) done.push(t("export_moved",{n:result.moved}));
        if(result.trashed>0) done.push(t("export_trashed",{n:result.trashed}));
        if(result.relinked>0) done.push(t("export_relinked",{n:result.relinked}));
        if(result.skipped.length>0) done.push(t("export_skipped",{n:result.skipped.length}));

        await confirm({
            title:t("export_donetitle"),
            message:done.join('\n'),
            detail:result.rootdir,
            alertonly:true
        });
    }

    //폴더 대표이미지 고르는 창 열기. 그 폴더 안의 사진 중에서 순서대로 최대 4장을 고름
    const openpicker=(ids)=>{
        const targetid=Array.isArray(ids)? ids[0] : ids;
        if(targetid===undefined||targetid===null) return;
        setPickerfolder(targetid);
    }

    //고른 결과 저장. 빈 배열이면 지정 해제되어 자동선택으로 돌아감
    const savecovers=async(pickedids)=>{
        try{
            await window.nodeapi.db.saveFolderCovers({folderid:pickerfolder, ids:pickedids});
            await queryClient.invalidateQueries({queryKey:['filedata']});
        }catch(error){
            window.nodeapi.logerror("대표이미지 저장 실패",error);
            alert(t("cover_savefail"));
        }finally{
            setPickerfolder(null);
        }
    }

    //복사해둔 것들을 대상 폴더에 붙여넣기.
    //디스크 파일은 안건드리고 같은 realpath를 가리키는 행만 새로 생김(폴더면 안쪽까지)
    const pastefiles=async(targetParentId)=>{
        if(!clipboard||clipboard.length===0) return;
        try{
            const result=await window.nodeapi.db.copyFiles({
                ids:clipboard,
                targetParentId
            });
            if(result&&result.success===false){
                //백엔드는 언어를 모르니 code로 번역하고, 없는 코드면 원문으로 폴백
                alert(result.code ? t(result.code) : result.message);
                return;
            }
            await queryClient.invalidateQueries({queryKey:['filedata']});
        }catch(error){
            window.nodeapi.logerror("붙여넣기 실패",error);
        }
    }

    //폴더 만들기 자체는 툴바의 "새 폴더"와 공용(FolderUtils)
    const createfolder=async(parentid)=>{
        try{
            const newfileid=await createEmptyFolder(parentid);
            console.log("생성")
            await queryClient.invalidateQueries({queryKey:['filedata']});
            return newfileid;
        }catch(error){
            window.nodeapi.logerror("새폴더 만들기 실패",error)
        }
    }


    useEffect(()=>{
        const handleclickout=()=>setIsopen(false);
        if(isopen){
            document.addEventListener("click",handleclickout);
            return ()=>document.removeEventListener("click",handleclickout);

            
        }
    },[isopen])
    //오픈
    const open=useCallback((e,type,{folderid,selectid=[],source='main'})=>{
        console.log("현재폴더:",folderid);
         console.log("메뉴실행:",selectid);
            //현재아이디만가져오봄
        setIsopen(true);
        setPosition({x:e.clientX,y:e.clientY});
       
         setType(type);
        //단일과 아닌거 다할수있게
        Setselectid(Array.isArray(selectid)?selectid:[selectid]);
        setfolderid(folderid)
        setMenusource(source)
    },[Setselectid,setIsopen,setPosition]);

    
        const close=useCallback(()=>{
        setIsopen(false);
        setPosition(null);
        Setselectid(null);
        setfolderid(null)
    },[]);

    const MenuRender=()=>{
        if(!isopen) return null;

        return (
        <Menuwrapper $positionx={position.x} $positiony={position.y}>
       {items&&items.map((item,index)=>{
        return (
            <Menuitem key={index}
                $disabled={item.disabled}
                //비활성은 아무일도 안하되, 메뉴가 닫히지도 않게 전파를 막음
                onClick={item.disabled ? (e)=>e.stopPropagation() : item.onClick}
            >
            {item.label}
            </Menuitem>
        )
       })}
        </Menuwrapper>)
    }

    //대표이미지 고르는 창. 메뉴와 별개로 떠야해서 렌더함수를 따로 돌려줌
    const PickerRender=()=>{
        if(pickerfolder===null||pickerfolder===undefined) return null;
        return (
            <Coverpicker
                folderid={pickerfolder}
                onCancel={()=>setPickerfolder(null)}
                onConfirm={savecovers}
            />
        );
    }

    //renamingfor('main'|'tree')는 그 패널이 지금 고쳐야할 항목 id(아니면 null).
    //양쪽에 입력창이 겹쳐뜨는걸 막는게 목적이라 id를 그대로 내주지 않음
    const renamingfor=(panel)=>
        (renaming&&renaming.source===panel) ? renaming.id : null;

    return {open,close,MenuRender,PickerRender,
        renamingfor, startrename, endrename:()=>setRenaming(null)}
}