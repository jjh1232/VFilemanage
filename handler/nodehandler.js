
const { ipcMain } = require("electron");  // import → require
const { deleteFile } = require("../nodeDatabase/fileCRUD");
const { debug } = require("./log.js");

module.exports=()=>{
    debug("노드핸들러등록");
    //삭제
ipcMain.handle("deleteFiles",async (event,ids)=>{
    debug("삭제 ipc핸들러",ids);
    const deletes=await deleteFile(ids);
    debug("딜리트성공갯수:",deletes);
    return "su";
})

}
