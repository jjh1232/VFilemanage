// preload.js (sandbox: false 후 동작)
const { contextBridge, dialog, ipcRenderer, webUtils } = require('electron');

console.log('🟢 Preload 시작');

//addon은 여기서 안불러옴. 렌더러에서 부르면 DB커넥션이 프로세스마다 따로 열리는데,
//실제 삽입은 main.js의 insertfile/insertfolder IPC를 타므로 렌더러쪽은 쓰이지도 않았음
//(제거하면서 렌더러 메모리도 같이 줄어듦)

//node.js용 파일API main.js아니면 안되서 IPC메인에서만들고여기추가
contextBridge.exposeInMainWorld("nodeapi",{
  insertfile:(payload)=>ipcRenderer.invoke('insertfile',payload),
  insertfolder:(payload)=>ipcRenderer.invoke(`insertfolder`,payload),
  openFile:(filepath)=>ipcRenderer.invoke('open-file',filepath),
  //음악의 앨범아트 바이트. 없으면 null. 썸네일 만들때만 씀
  readAlbumArt:(filepath)=>ipcRenderer.invoke('read-albumart',filepath),
  //가상 폴더구조를 실제 디스크에 펴기. preview는 개수만 세고 아무것도 안바꿈
  exportPreview:(payload)=>ipcRenderer.invoke('export-preview',payload),
  exportFolder:(payload)=>ipcRenderer.invoke('export-folder',payload),
  //드래그드랍으로 들어온 File객체의 실제 디스크경로 얻기.
  //Electron33에서 File.path가 제거돼서 이 방법밖에없음. File객체는 한개씩 넘겨야함
  getPathForFile:(file)=>webUtils.getPathForFile(file),
  //앱 잠금. 해시는 메인에만 있고 여기로 안 넘어옴(status는 여부와 힌트만 줌)
  lock:{
    status:()=>ipcRenderer.invoke('password-status'),
    verify:(password)=>ipcRenderer.invoke('password-verify',password),
    set:(payload)=>ipcRenderer.invoke('password-set',payload),
    clear:(payload)=>ipcRenderer.invoke('password-clear',payload),
  },
  store:{
    get:(path)=>ipcRenderer.invoke('getstore',path),
    set:(path,value)=>ipcRenderer.invoke('setstore',path,value),
    openstore:()=>ipcRenderer.invoke('openstore'),
  },
  db:{readfiles:(payload)=>ipcRenderer.invoke(`db-readFiles`,payload),
      searchreadfiles:(payload)=>ipcRenderer.invoke(`db-readsearchFiles`,payload),
      createfolder:(data)=>{console.log("createfolderbridge")
        return ipcRenderer.invoke(`db-createFile`,data)}, //구조검사안해서대충엔티티
       deleteFile:(ids)=>ipcRenderer.invoke("deleteFiles",ids),
       getFolderPath:(currentfolderid)=>ipcRenderer.invoke("db-getFolderPath",currentfolderid),
       moveFiles:(payload)=>ipcRenderer.invoke("db-moveFiles",payload),
       copyFiles:(payload)=>ipcRenderer.invoke("db-copyFiles",payload),
       saveThumbnail:(payload)=>ipcRenderer.invoke("db-saveThumbnail",payload),
       readFolderPreviews:(payload)=>ipcRenderer.invoke("db-readFolderPreviews",payload),
       saveFolderCovers:(payload)=>ipcRenderer.invoke("db-saveFolderCovers",payload),
       renameFile:(payload)=>ipcRenderer.invoke("db-renameFile",payload)      }
  
})