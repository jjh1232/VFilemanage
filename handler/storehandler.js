import { ipcMain } from "electron";
import store from "../setting.js";

ipcMain.handle("getstore",(event,path)=>{
    return store.get(path);
})
ipcMain.handle("setstore",(event,path,value)=>{
    return store.set(path,value);
})
ipcMain.handle("openstore",()=>{
    return store.openInEditor(); 
})