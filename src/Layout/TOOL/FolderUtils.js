import { FileEntity } from "../../type/fileentity";

//빈 폴더 하나 만들기(툴바의 "새 폴더", 우클릭 메뉴의 "새로만들기" 공용).
//이름이 겹치면 DB쪽 generateUniqueName이 "새폴더 (2)"처럼 알아서 붙여줌
export async function createEmptyFolder(parentid) {
    const tempFolder = {
        ...FileEntity,
        parentid: parentid,
        realfilename: "새폴더",
        filename: "새폴더",
        type: "folder",
        size: 0,
        isori: 1,   //1=앱에서 만든 가상폴더 (OS에서 가져온건 0)
    };

    return await window.nodeapi.db.createfolder(tempFolder);
}
