
const { ipcMain } = require("electron");  // import → require
const { deleteFile } = require("../nodeDatabase/fileCRUD");

module.exports=()=>{
    console.log("노드핸들러등록");
    //삭제
ipcMain.handle("deleteFiles",async (event,ids)=>{
    console.log("삭제 ipc핸들러",ids);
    const deletes=await deleteFile(ids);
    console.log("딜리트성공갯수:",deletes);
    return "su";
})

}
