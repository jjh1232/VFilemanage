const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const {dbpath}=require(`./nodeDatabase/dbpath.js`)
const {init,fixExtSuffixNames}=require(`./nodeDatabase/InitDB`)
const { ipcMain, dialog, protocol, net } = require('electron');
const { pathToFileURL } = require('url');

//앱 전용 파일 프로토콜.
//화면은 http://localhost:1234에서 도는데 파일은 file://이라, 그대로 캔버스에 그리면
//캔버스가 오염(taint)돼서 썸네일 추출(toDataURL)이 막힘. 이 스킴을 통해 읽으면 그 문제가 없음.
//stream:true라 영상도 통째로 안읽고 필요한 구간만 가져올수있음.
//registerSchemesAsPrivileged는 반드시 app.whenReady() 전에 불러야함(이후엔 등록 자체가 안됨)
protocol.registerSchemesAsPrivileged([
  { scheme: 'appfile', privileges: { standard:true, secure:true, supportFetchAPI:true, stream:true } },
  //썸네일 전용. 목록조회에서 썸네일을 빼는 대신 여기로 한장씩 꺼내감.
  //브라우저가 화면에 보이는 것만 요청하고 캐시까지 해줌
  { scheme: 'thumb',   privileges: { standard:true, secure:true, supportFetchAPI:true } }
]);
const addon=require("./addon/build/Release/myaddon.node")
//addon이 JS(fileCRUD)와 같은 DB파일을 보도록 경로를 넘겨줌.
//이거 없으면 addon쪽 DB가 미연결이라 파일삽입이 통째로 실패함
addon.file.initdb(dbpath);
const fileDB=require("./nodeDatabase/fileCRUD")
const {shell}=require(`electron`)
//store는 electon패키지라 따로실행안해도등록됨
require('./handler/storehandler')
const nodehandler=require("./handler/nodehandler");
//storehandler처럼 require만 하면 IPC가 등록됨(따로 호출 안함)
require("./handler/passwordhandler");
const { Filefilter } = require('./src/Layout/TOOL/Nodetool');
function createWindow() {
  
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      //기본이true인데이러면 뭐모듈뭐다막는다함 배포시true하면 node_modules에넣어야함
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  win.setMenu(null)
  // 개발: Parcel 서버 / 배포: 파일
  if (app.isPackaged || !process.env.NODE_ENV === 'development') {
   //이게 배포할떄
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  } else {
     // 개발: Parcel dev 서버
  win.loadURL('http://localhost:1234');
  }

   win.webContents.openDevTools(); // 개발자도구 자동 열기
}

  



app.whenReady().then(async ()=>{
  //appfile://<디스크경로> 를 실제 파일로 연결.
  //경로에 한글이나 공백이 있어서 인코딩돼 오므로 디코딩 필요
  protocol.handle('appfile', async (request)=>{
    try{
      const url=new URL(request.url);
      //appfile://local/<base64url(경로)> 형태.
      //퍼센트 인코딩은 한글/드라이브문자에서 브라우저 정규화에 깨져서 base64url로 감싸서 받음
      const encoded=url.pathname.replace(/^\//,'');
      const filepath=path.normalize(Buffer.from(encoded,'base64url').toString('utf8'));

      //실제로 존재하는 파일만 열어줌
      const stat=await fs.promises.stat(filepath);
      if(!stat.isFile()) return new Response('not a file',{status:404});

      return net.fetch(pathToFileURL(filepath).toString());
    }catch(error){
      console.log("appfile 열기실패:",request.url,error.message);
      return new Response('not found',{status:404});
    }
  });

  //thumb://local/<id>?v=<갱신시각> → DB에서 썸네일 바이트를 꺼내 그림으로 응답.
  //?v가 바뀌면 URL이 달라지므로 캐시를 길게 잡아도 갱신이 바로 반영됨
  protocol.handle('thumb', async (request)=>{
    try{
      const url=new URL(request.url);
      const fileid=Number(decodeURIComponent(url.pathname).replace(/^\//,''));
      if(!Number.isFinite(fileid)) return new Response('bad id',{status:400});

      const bytes=await fileDB.readThumbnail({fileid});
      if(!bytes) return new Response('no thumbnail',{status:404});

      return new Response(Buffer.isBuffer(bytes)? bytes : Buffer.from(bytes),{
        headers:{
          'Content-Type':'image/webp',
          'Cache-Control':'public, max-age=31536000, immutable'
        }
      });
    }catch(error){
      console.log("thumb 열기실패:",request.url,error.message);
      return new Response('not found',{status:404});
    }
  });

  console.log("mainjsinit시작");
   init();
   //init이 표를 만든 뒤에 돌아야함. 예전 이름("티아.png (1)")을 "티아 (1).png"로 되돌림.
   //몇번 실행해도 안전해서 켤때마다 그냥 돌려도 됨
   await fixExtSuffixNames().catch(error=>console.log("이름정리 실패:",error.message));
   console.log("mainjsinit끝");
   console.log("노드핸들러시작");
    nodehandler();
    console.log("노드핸들러끝");
     setTimeout(() => {
        createWindow();
    }, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
//경로들을 폴더구조 그대로 재귀로 넣기.
//addon은 디렉터리를 만나도 안으로 안들어가고(행 하나만 넣음), 폴더 id도 안돌려줘서
//폴더행 생성은 JS쪽 createFile(lastId 반환)로 하고, 각 폴더 안의 파일들만 addon으로 벌크삽입함
async function insertPathsRecursive(paths, parentId, depth=0){
  //윈도우 정션/심볼릭링크로 경로가 순환할수있어서 안전장치
  if(depth>30){
    console.log("재귀깊이초과, 중단:",parentId);
    return;
  }

  const dirs=[];
  const files=[];
  for(const p of paths){
    try{
      const stat=await fs.promises.stat(p);
      if(stat.isDirectory()) dirs.push(p); else files.push(p);
    }catch(error){
      //권한없음/링크깨짐 등은 그냥 건너뜀
      console.log("경로확인실패, 건너뜀:",p,error.message);
    }
  }

  //이 레벨의 파일들: 확장자필터는 파일에만 적용(폴더는 확장자가없어서 태우면 무조건 걸러짐)
  if(files.length>0){
    const filtered=Filefilter(files);
    if(filtered.length>0){
      addon.file.insertfiles(filtered, parentId);
    }
  }

  //하위폴더: DB에 폴더행 만들어서 id받고 그 밑으로 재귀
  for(const d of dirs){
    try{
      const name=path.basename(d);
      const newId=await fileDB.createFile({
        parentid:parentId,
        realfilename:name,
        filename:name,
        type:'folder',
        realpath:d,
        size:0,
        isori:0 //0=OS에서 가져온것 (앱에서 만든폴더는 1)
      });
      //id를 못받으면 그밑으로 재귀하면 안됨(자식들이 엉뚱하게 최상위로 쏟아짐)
      if(newId===undefined||newId===null){
        console.log("폴더id를 못받아서 하위 건너뜀:",d);
        continue;
      }
      const children=(await fs.promises.readdir(d)).map(n=>path.join(d,n));
      await insertPathsRecursive(children, newId, depth+1);
    }catch(error){
      console.log("폴더처리실패, 건너뜀:",d,error.message);
    }
  }
}

//IPCmain 이거 버전낮아서 main.js아니면 node함수 못쓰는듯
//드래그드롭도공통으로
ipcMain.handle('insertfile', async (event,{filepathfromdrop,currentfolderid}) => {
  let  filePaths=[];
  if(filepathfromdrop){//드래그드롭의경우인자가있다.
     filePaths=Array.isArray(filepathfromdrop)?filepathfromdrop:[filepathfromdrop];

  }
  else{//인자가없을경우 (파일인풋)

  
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });
      if (result.canceled) {
        return { success: false, message: '취소됨' };
    }
     filePaths=result.filePaths;
  }
  //폴더가 섞여있으면 안쪽까지 구조그대로 재귀삽입. 필터는 재귀함수안에서 파일에만 적용됨
    console.log("재귀삽입시작",filePaths)
    console.log("타입체크",typeof currentfolderid,currentfolderid);
    await insertPathsRecursive(filePaths, currentfolderid);
    console.log("재귀삽입완료")
 return "success";
});
//삭제핸들러

//안타깝게도 폴더와 파일 이 공존못한다고한다..(그래서 파일추가/폴더추가 메뉴가 따로 있음)
//고른 폴더는 드래그드롭때와 똑같이 안쪽 구조까지 그대로 재귀삽입됨
ipcMain.handle('insertfolder', async (event,{currentfolderid}={}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections']
  });
  if (result.canceled) {
    return { success: false, message: '취소됨' };
  }

  console.log("폴더 재귀삽입시작",result.filePaths);
  console.log("타입체크",typeof currentfolderid,currentfolderid);
  await insertPathsRecursive(result.filePaths, currentfolderid);
  console.log("폴더 재귀삽입완료");
  return "success";
});
//파일탐색기.
//realpath는 가상주소라 원본이 옮겨지거나 지워졌을수 있음. 화면쪽에서 "목록에서 지울까요?"를
//물어보려면 "없어서 못열었다"와 "다른 이유로 못열었다"를 구분해줘야해서 결과를 객체로 돌려줌
ipcMain.handle('open-file',async(event,folderpath)=>{
  if(!folderpath) return {ok:false, reason:'nopath'};

  try{
    await fs.promises.stat(folderpath);
  }catch(error){
    //권한없음 같은건 파일이 있는데 못읽는 경우라 지우자고 물어보면 안됨
    if(error.code!=='ENOENT') return {ok:false, reason:'openerror', message:error.message};

    //파일만 없는건지 드라이브째로 안붙은건지 구분.
    //외장하드나 USB를 뺀 상태면 그안의 파일이 전부 "없음"으로 보이는데, 그때 지우자고 물어보면
    //다시 꽂으면 멀쩡할 항목들을 통째로 날리게 됨. 그래서 드라이브 여부를 따로 확인함
    const root=path.parse(folderpath).root;
    let driveok=true;
    if(root){
      try{ await fs.promises.stat(root); }catch{ driveok=false; }
    }
    return {ok:false, reason:driveok?'missing':'drivemissing', path:folderpath, root};
  }

  const errormessage=await shell.openPath(folderpath);
  if(errormessage) return {ok:false, reason:'openerror', message:errormessage};
  return {ok:true};
})

//mp3 앞머리의 ID3v2 태그에서 앨범아트(APIC 프레임) 바이트만 꺼냄.
//음악은 캔버스로 그릴 그림이 없어서 여태 썸네일 대상이 아니었는데, 앨범아트가 박혀있으면
//그걸 쓰면 됨. 화면쪽은 이 바이트를 받아서 이미지 썸네일과 똑같은 과정으로 줄여 저장함.
//
//파일 전체를 읽지 않는게 핵심. 태그는 파일 맨앞에 있고 크기가 헤더에 적혀있어서
//그만큼만 읽으면 됨(27MB짜리도 태그가 1KB면 1KB만 읽음)
async function readId3AlbumArt(filepath){
  let handle;
  try{
    handle=await fs.promises.open(filepath,'r');

    //ID3v2 헤더 10바이트: "ID3" + 버전2 + 플래그1 + 크기4
    const header=Buffer.alloc(10);
    const {bytesRead}=await handle.read(header,0,10,0);
    if(bytesRead<10 || header.toString('latin1',0,3)!=='ID3') return null;

    const major=header[3];
    //태그 전체 크기는 항상 synchsafe(각 바이트의 최상위비트를 안씀)
    const tagsize=(header[6]<<21)|(header[7]<<14)|(header[8]<<7)|header[9];
    if(tagsize<=0 || tagsize>20*1024*1024) return null;//말이 안되는 값이면 포기

    const tag=Buffer.alloc(tagsize);
    await handle.read(tag,0,tagsize,10);

    //프레임들을 순서대로 훑음. 프레임 헤더 10바이트: ID4 + 크기4 + 플래그2
    let offset=0;
    while(offset+10<=tagsize){
      const frameid=tag.toString('latin1',offset,offset+4);
      //남은게 0으로 채워진 패딩이면 끝
      if(frameid==='\0\0\0\0' || frameid.trim()==='') break;

      //여기가 함정. v2.4는 프레임 크기도 synchsafe인데 v2.3은 그냥 big-endian이라
      //같은 방식으로 읽으면 최대 4배 크게 읽혀서 엉뚱한데를 가리키게 됨
      const sizebytes=tag.slice(offset+4,offset+8);
      const framesize=major>=4
        ? (sizebytes[0]<<21)|(sizebytes[1]<<14)|(sizebytes[2]<<7)|sizebytes[3]
        : sizebytes.readUInt32BE(0);

      if(framesize<=0 || offset+10+framesize>tagsize) break;

      if(frameid==='APIC'){
        //APIC 안쪽: [텍스트인코딩 1B][MIME 문자열\0][픽처타입 1B][설명\0][이미지바이트]
        const body=tag.slice(offset+10, offset+10+framesize);
        const encoding=body[0];
        const mimeend=body.indexOf(0,1);
        if(mimeend===-1) return null;

        let pos=mimeend+1+1;//MIME의 \0 다음이 픽처타입 1바이트, 그 다음이 설명
        //설명의 끝(=구분자)은 인코딩에 따라 다름. UTF-16(1,2)은 널 두개로 끝남
        if(encoding===1||encoding===2){
          while(pos+1<body.length && !(body[pos]===0&&body[pos+1]===0)) pos+=2;
          pos+=2;
        }else{
          while(pos<body.length && body[pos]!==0) pos+=1;
          pos+=1;
        }

        if(pos>=body.length) return null;
        //IPC로 넘길땐 일반 배열같은 형태가 되므로 화면쪽에서 다시 Uint8Array로 감쌈
        return body.slice(pos);
      }

      offset+=10+framesize;
    }
    return null;
  }catch(error){
    console.log("앨범아트 읽기실패:",filepath,error.message);
    return null;
  }finally{
    await handle?.close().catch(()=>{});
  }
}

ipcMain.handle('read-albumart',async(event,filepath)=>{
  if(!filepath) return null;
  return await readId3AlbumArt(filepath);
});

//===== 가상 폴더구조를 실제 디스크에 펴는 기능 =====
//이 앱에서 디스크에 파일을 쓰는 유일한 곳임. 나머지는 전부 DB행만 건드리므로
//여기만 조심하면 사고나도 원본은 무사함

//윈도우가 파일이름에 못쓰는 글자들. 앱안 가상이름엔 들어갈수 있어서(renameFile이 글자검사를 안함)
//실제로 만들때는 바꿔줘야함
const BADNAMECHARS=/[\\/:*?"<>|]/g;
const MAXPATHLEN=260;//윈도우 기본 경로한계

function safeName(name){
  //끝에 붙은 점이나 공백도 윈도우가 못받음
  const cleaned=String(name||'').replace(BADNAMECHARS,'_').replace(/[. ]+$/,'');
  return cleaned.length? cleaned : '_';
}

//내보내기 루트를 "새로" 만든다. 이미 있으면 (2),(3)...
//남의 폴더에 섞어넣지 않으려는 것 - 새 폴더로 시작하면 그 안쪽은 이름충돌이 아예 없음
async function makeExportRoot(parentdir, name){
  let candidate=path.join(parentdir, name);
  for(let n=2; n<1000; n++){
    try{
      await fs.promises.mkdir(candidate);//이미 있으면 EEXIST로 떨어짐
      return candidate;
    }catch(error){
      if(error.code!=='EEXIST') throw error;
      candidate=path.join(parentdir, `${name} (${n})`);
    }
  }
  throw new Error('쓸수있는 폴더이름을 못찾음');
}

//같은 원본을 몇 군데서 가리키는지 셈.
//이동모드에서 "이 파일이 한곳에만 쓰이나"를 판단하는데 씀(그래야 rename으로 즉시 옮길수있음)
function countRealpaths(nodes, map=new Map()){
  for(const node of nodes){
    const r=node.row;
    if(r.type!=='folder' && r.realpath && r.realpath!=='NULL'){
      map.set(r.realpath,(map.get(r.realpath)||0)+1);
    }
    if(node.children.length) countRealpaths(node.children,map);
  }
  return map;
}

async function exportNodes(nodes, destdir, ctx){
  for(const node of nodes){
    const row=node.row;
    const name=safeName(row.filename);
    if(name!==row.filename) ctx.renamed.push({from:row.filename,to:name});

    const target=path.join(destdir,name);
    if(target.length>MAXPATHLEN){
      ctx.skipped.push({name:row.filename,reason:'toolong'});
      continue;
    }

    if(row.type==='folder'){
      try{
        await fs.promises.mkdir(target,{recursive:true});
        ctx.folders++;
      }catch(error){
        //폴더를 못만들었으면 그 안쪽은 갈 곳이 없으므로 통째로 건너뜀
        ctx.skipped.push({name:row.filename,reason:'mkdirfail',message:error.message});
        continue;
      }
      if(node.children.length) await exportNodes(node.children,target,ctx);
      continue;
    }

    const src=row.realpath;
    if(!src||src==='NULL'){ ctx.skipped.push({name:row.filename,reason:'nopath'}); continue; }
    try{ await fs.promises.stat(src); }
    catch{ ctx.skipped.push({name:row.filename,reason:'missing'}); continue; }

    //이 내보내기 안에서 이 원본이 딱 한번만 쓰이는 경우에만 이동이 성립함.
    //여러 폴더에 들어있으면 양쪽 다 실체가 있어야 하므로 복사밖에 방법이 없음
    const onlyonce=ctx.usecount.get(src)===1;
    let renamed=false;

    try{
      if(ctx.removeorigin && onlyonce){
        try{
          //같은 볼륨이면 내용을 안건드리고 이름표만 바꿔서 즉시 끝남
          await fs.promises.rename(src,target);
          renamed=true;
        }catch(error){
          //다른 볼륨이면 EXDEV. 경로만 보고 볼륨을 판단하면 정션/네트워크드라이브에서 틀리므로
          //실제로 시도해보고 실패했을때 복사로 떨어지는게 정확함
          if(error.code!=='EXDEV') throw error;
          await fs.promises.copyFile(src,target);
        }
      }else{
        await fs.promises.copyFile(src,target);
      }
    }catch(error){
      ctx.skipped.push({name:row.filename,reason:'copyfail',message:error.message});
      continue;
    }

    ctx.files++;
    if(renamed) ctx.moved++;

    if(ctx.removeorigin){
      //한건 놓자마자 그 행이 새 위치를 보게 함. 행마다 자기 사본을 가리킴.
      //전부 옮긴뒤 마지막에 몰아서 갱신하면, 딱 그 사이에 앱이 죽었을때 전부 미아가 됨
      try{
        await fileDB.updateFile({id:row.id,updates:{realpath:target}});
      }catch(error){
        console.log("realpath 갱신실패:",row.id,error.message);
      }

      //이 원본을 가리키던 "바깥"(내보내는 폴더 밖) 행들도 따라와야 함.
      //여기서 첫 목적지만 기억해두고 마지막에 한번에 처리 - 같은 파일이 여러곳에 복사되는 경우
      //바깥 행들은 그중 첫번째를 가리키게 함
      if(!ctx.relocated.has(src)) ctx.relocated.set(src,target);

      //rename으로 옮긴건 원본이 이미 없음. 복사한 경우만 나중에 치움
      if(!renamed) ctx.trash.add(src);
    }
  }
}

//내보내기 전 요약. DB를 훑고 원본 존재만 확인하므로 아무것도 안 바꿈
ipcMain.handle('export-preview',async(event,{folderid}={})=>{
  if(folderid===undefined||folderid===null) return null;

  const snapshot=await fileDB.readSubtreeSnapshot(folderid);
  if(snapshot.length===0) return null;

  const usecount=countRealpaths(snapshot);
  let folders=0,files=0,bytes=0,missing=0;

  const walk=async(nodes)=>{
    for(const node of nodes){
      const r=node.row;
      if(r.type==='folder'){ folders++; await walk(node.children); continue; }
      files++;
      bytes+=Number(r.size)||0;
      if(!r.realpath||r.realpath==='NULL'){ missing++; continue; }
      try{ await fs.promises.stat(r.realpath); }catch{ missing++; }
    }
  };
  await walk(snapshot[0].children);

  //같은 원본을 여러곳에서 가리키면 그 수만큼 사본이 생김. 미리 알려주려고 셈
  let duplicated=0;
  for(const n of usecount.values()) if(n>1) duplicated+=n;

  return {name:snapshot[0].row.filename, folders, files, bytes, missing, duplicated};
});

ipcMain.handle('export-folder',async(event,{folderid,removeorigin=false}={})=>{
  if(folderid===undefined||folderid===null) return {ok:false,reason:'nofolder'};

  const picked=await dialog.showOpenDialog({properties:['openDirectory']});
  if(picked.canceled||picked.filePaths.length===0) return {ok:false,reason:'canceled'};

  const snapshot=await fileDB.readSubtreeSnapshot(folderid);
  if(snapshot.length===0) return {ok:false,reason:'notfound'};

  const ctx={
    usecount:countRealpaths(snapshot),
    removeorigin:!!removeorigin,
    folders:0, files:0, moved:0, skipped:[], renamed:[],
    trash:new Set(), relocated:new Map()
  };

  let rootdir;
  try{
    rootdir=await makeExportRoot(picked.filePaths[0], safeName(snapshot[0].row.filename));
  }catch(error){
    return {ok:false,reason:'mkdirfail',message:error.message};
  }
  ctx.folders++;

  await exportNodes(snapshot[0].children, rootdir, ctx);

  //내보내는 폴더 "바깥"에서 같은 원본을 가리키던 행들을 새 위치로 따라오게 함.
  //안쪽 행들은 이미 건별로 갱신됐으므로 여기 걸리는건 바깥 행들뿐임.
  //이걸 빼먹으면 그 행들이 통째로 "원본 없음"이 되어버림
  let relinked=0;
  for(const [from,to] of ctx.relocated){
    try{ relinked+=await fileDB.relinkRealpath({from,to}); }
    catch(error){ console.log("바깥 행 갱신실패:",from,error.message); }
  }

  //원본 정리는 반드시 맨 마지막. 여기 오기전에 모든 행이 이미 새 위치를 가리키고 있어서,
  //중간에 죽어도 "원본이 아직 남아있을뿐" 데이터가 어긋나진 않음
  let trashed=0;
  for(const src of ctx.trash){
    try{ await shell.trashItem(src); trashed++; }
    catch(error){
      ctx.skipped.push({name:path.basename(src),reason:'trashfail',message:error.message});
    }
  }

  return {ok:true, rootdir, folders:ctx.folders, files:ctx.files,
          moved:ctx.moved, trashed, relinked,
          skipped:ctx.skipped, renamed:ctx.renamed};
});

//DB핸들러
Object.keys(fileDB).forEach(method=>{
  console.log(`ipcrun:${method}`)
  ipcMain.handle(`db-${method}`,async (event,data)=>{
    
    try{
      const result=await fileDB[method](data);
      console.log(`${method}success`)
      return result;
    }catch(error){
        console.log(`${method}error`,error.message)
        throw error;
    }
    
  })
})