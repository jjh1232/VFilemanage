import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Tools/LanguageProvider";
import { useConfirm } from "./Confirmdialog";

//원본을 못찾은 항목을 목록에서 지울지 물어보고, 예면 지우고 화면을 갱신함.
//realpath는 가상주소라 원본이 다른데로 옮겨지거나 지워지면 이 상태가 됨
async function askdeletemissing({item,result,t,queryClient,confirm}){
    //드라이브 자체가 안붙은 경우(외장하드/USB를 뺀 상태)는 절대 지우자고 물으면 안됨.
    //다시 꽂으면 멀쩡한 파일들이라, 여기서 지우면 그 드라이브의 항목이 통째로 날아감
    if(result.reason==='drivemissing'){
        await confirm({
            title:t("missing_drive_title"),
            message:t("missing_drive",{drive:result.root||''}),
            detail:result.path||item.realpath,
            alertonly:true
        });
        return;
    }

    const ok=await confirm({
        title:t("missing_title"),
        message:t("missing_confirm",{name:item.filename}),
        detail:result.path||item.realpath,
        confirmlabel:t("missing_delete"),
        tone:'danger'
    });
    if(!ok) return;

    try{
        await window.nodeapi.db.deleteFile([item.id]);
        await queryClient.invalidateQueries({queryKey:['filedata']});
    }catch(error){
        window.nodeapi.logerror("없는파일 삭제실패",error);
    }
}

//t/queryClient/confirm은 호출하는 컴포넌트가 넘겨줌. 여긴 컴포넌트가 아니라 훅을 못 씀
//(아래 useOpenItem을 쓰면 셋다 알아서 들어감)
export const  Doublehandler=async({item,onOpenFolderid,t,queryClient,confirm})=>{
    //아이템을 알아야 뭔지알지
    if(!item) return ;

    //폴더인경우
    if(item.type==="folder"){
        onOpenFolderid(item.id);
        return;
    }

    const filePath=item.realpath;
    if(!filePath || !window.nodeapi) return;

    const result=await window.nodeapi.openFile(filePath);
    //성공했거나 알수없는 응답이면 조용히 끝
    if(!result || result.ok) return;

    //원본이 없어서 못연 경우엔 목록에서 지울지 물어봄
    if(result.reason==='missing' || result.reason==='drivemissing'){
        return askdeletemissing({item,result,t,queryClient,confirm});
    }

    //그 외(권한없음, 연결된 프로그램 없음 등)는 알림만
    await confirm({
        title:t("openfail"),
        message:result.message||'',
        detail:result.path||filePath,
        alertonly:true
    });
}

//더블클릭 열기. 안에서 목록갱신/번역/확인창이 필요해서 훅으로 감싸둠.
//호출부는 openitem({item,onOpenFolderid:navigate}) 한줄이면 됨
export function useOpenItem(){
    const queryClient=useQueryClient();
    const {t}=useLanguage();
    const confirm=useConfirm();

    return useCallback(
        ({item,onOpenFolderid})=>Doublehandler({item,onOpenFolderid,t,queryClient,confirm}),
        [t,queryClient,confirm]
    );
}
