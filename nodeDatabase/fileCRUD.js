import { init, db, query } from '../nodeDatabase/InitDB.js'; // 확장자(.js)를 붙여야 할 수도 있습니다.
import  * as Utils  from './Utilmethod.js';
import Store from 'electron-store';
const store=new Store();//여기서파일직접읽어옴
//sqllite3는 비동기화 라 promise로 동기화안하면 db락걸려서개판난다함

const allowsortkey=["filename","type","size","date"];
const allowsortorder=["DESC","ASC"]
//파일한개만만들때
async function createFile({parentid,realfilename,filename,type,realpath,size=0,isori}){
  let currentname=filename;
  let counter=1;
  console.log("createfolder")
  console.log(`parentid:${parentid}`);
  console.log(`realfilename:${realfilename}`);
  console.log(`filename:${filename}`);
  console.log(`type:${type}`);
  console.log(`realpath:${realpath}`);
  console.log(`size:${size}`);
  console.log(`isori:${isori}`);
  while(true){
    try{
      console.log("suc");
      const result=await query(
        `INSERT INTO files(parent_id,realfilename,filename,type,realpath,size,isori)
        VALUES(?,?,?,?,?,?,?)`,
        [parentid,realfilename,currentname,type,realpath,size,isori]
    )
    return result.lastId//새로만든 파일 id반환
    }catch(error){
      console.log("err")
      if(error.message.includes('UNIQUE constraint failed')){
        let newname=await Utils.generateUniqueName({query,parentid,currentname})
        currentname=newname;
        /*
        const basename=currentname.replace(/ \(\d+\)$/,'');//정규식으로 (1)이런숫자찾고제거
         currentname = `${basename} (${counter})`;  
        counter++;
        */
      }else{
        throw error;
      }
    }
  }  
  
}
//파일 여러개넣을때
async function manycreateFiles(parentId, files) {
  // files = [['file1.txt', 'file', '/path1', 123], ['file2.txt', 'file', '/path2', 456]]
  //(5,이름,)(5,이름2) 뭐이런식으로 한번에 들어갈수가있음 쉼표로 

  //각행마다 무름표자리를 만들어야함 JOIN으로 쉼표로 행들을 연결함 join은 배열사이에만 ,이생김
  const placeholders = files.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
  //flatmap으로 모든값들을 1차원배열로펴기
  //ex[5,realfilename,filename,type,realpath,사이즈],[5,realfilename,filename,type,realpath,사이즈]
  //컬럼 6개(parent_id+5개)라 각 file배열은 [realfilename,filename,type,realpath,size] 순서로 5개 요소여야함
  const values = files.flatMap(file => [parentId, ...file]);

  const result = await query(
    `INSERT INTO files (parent_id, realfilename,filename, type, realpath, size) VALUES ${placeholders}`,
    values
  );
  return result.changes; // 총 삽입된 파일 수
}
//리드파일 ,셀렉트
//folderFirst: Filetree는 항상 폴더먼저(true), Mainview는 정렬기준만으로 폴더/파일 안가리고 섞임(false)
async function readFiles({parentid=0, folderFirst=true}={}){
  //store내부적으로 .을 지원해준대

    const sortdata=store.get("view.sort");
    const sortBy=allowsortkey.includes(sortdata.key)? sortdata.key:"filename";

    const sortorder=allowsortorder.includes(sortdata.direction)? sortdata.direction :"DESC";
    //윈도우탐색기처럼 폴더먼저(1차, folderFirst일때만) + 고른정렬키(2차) 두단계로
    const folderfirstclause=folderFirst? `(CASE WHEN f.type='folder' THEN 0 ELSE 1 END), ` : '';
    const {rows}=await query (
        //여기에 직접 ${}으로 변수주는건 sqlinjection에취약
        //썸네일 "본체"는 절대 여기서 읽지 않음. 안보이는 것까지 전부 딸려와서 폴더열기가 무거워짐.
        //있는지 여부와 갱신시각만 가져오고, 실제 그림은 thumb:// 프로토콜이 화면에 보이는 것만 꺼내감
        `SELECT f.*,
        t.updated_at AS thumbversion
         FROM files f
         LEFT JOIN thumbnails t ON f.id=t.file_id
         WHERE parent_id=?
         ORDER BY ${folderfirstclause}f.${sortBy} ${sortorder}`

    ,[parentid]);
    return rows;
}
// 메인주소구하는 쉬운코드
async function getFolderPath(currentfolderid) {

  console.log("주소찾기시작",currentfolderid)
  if(currentfolderid===null||currentfolderid===undefined) return [];

  const {rows}=await query(
  //가상테이블 folderpath를 선언하고 뎁스0을 컬럼생성(현재위치)
  //  재귀시작하는코드 (sqllite3지원)
    `
  WITH RECURSIVE FolderPath AS (  
  SELECT id, filename,parent_id, 0 AS depth
  FROM files
  Where id = ?

  UNION ALL

  SELECT f.id,f.filename,f.parent_id,fp.depth +1 
  FROM files f
  INNER JOIN FolderPath fp ON f.id=fp.parent_id
  )
  SELECT * FROM FolderPath
  ORDER BY depth DESC;

  `,[currentfolderid])
  //유니온으로 나타내는데 위의 처음기준fp만든 것 fp를 기준으로 패런트아이디로 구한다.유니온합침

  console.log("주소찾기끝");
  console.log("결과:",rows)

  return rows;
  
}

//주어진 폴더id들의 "루트부터의 경로"를 한번에 구함(검색결과 위치라벨용)
//재귀쿼리 하나로 다 처리 - 실제파일이든 앱안에서만 만든 가상폴더든 parent_id만 맞으면 똑같이 동작
//가상경로 컬럼을 따로 저장/캐시하는 대신 매번 새로계산해서, 이름변경/이동해도 따로 갱신해줄 게 없음
async function getFolderPathsForIds(ids){
  const uniqueIds=[...new Set(ids)].filter(id=>id!==null&&id!==undefined);
  if(uniqueIds.length===0) return {};
  const placeholders=uniqueIds.map(()=>"?").join(",");
  const {rows}=await query(`
    WITH RECURSIVE FolderPath AS (
      SELECT id, filename, parent_id, id AS origin_id, 0 AS depth
      FROM files
      WHERE id IN (${placeholders})

      UNION ALL

      SELECT f.id, f.filename, f.parent_id, fp.origin_id, fp.depth+1
      FROM files f
      INNER JOIN FolderPath fp ON f.id=fp.parent_id
    )
    SELECT * FROM FolderPath ORDER BY origin_id, depth DESC
  `, uniqueIds);

  //origin_id별로 묶어서(루트→하위 순서로 이미 정렬돼있음) 이름들을 이어붙임
  const grouped={};
  for(const row of rows){
    if(!grouped[row.origin_id]) grouped[row.origin_id]=[];
    grouped[row.origin_id].push(row.filename);
  }
  const result={};
  for(const id of uniqueIds){
    result[id]=(grouped[id]||[]).join('/');
  }
  return result;
}

//검색select 리드
//folderFirst: Mainview에서만 쓰이니 기본은 false(정렬기준으로만 섞임)
async function readsearchFiles({keyword, folderFirst=false}={}) {
  //여기에 직접 ${}으로 변수주는건 sqlinjection에취약
  const searchpattern=`%${keyword}%`
   const sortdata=store.get("view.sort");
     const sortBy=allowsortkey.includes(sortdata.key)? sortdata.key:"filename";
    const sortorder=allowsortorder.includes(sortdata.direction)? sortdata.direction :"DESC";
    const folderfirstclause=folderFirst? `(CASE WHEN f.type='folder' THEN 0 ELSE 1 END), ` : '';
  //readFiles와 같은 이유로 썸네일 본체는 안읽고 갱신시각만
  const { rows } = await query(`SELECT f.*,t.updated_at AS thumbversion FROM files f
    LEFT JOIN thumbnails t ON f.id=t.file_id

    WHERE filename Like ?
    ORDER BY ${folderfirstclause}f.${sortBy} ${sortorder}`
    , [searchpattern]);

  //검색은 여러 폴더에 흩어진 결과가 섞여나오니, 각 결과가 어디있는지 위치라벨을 붙여줌
  const parentIds=rows.map(r=>r.parent_id);
  const pathMap=await getFolderPathsForIds(parentIds);
  return rows.map(r=>({...r, location: pathMap[r.parent_id] || ''}));
}
//복사할 원본들의 트리를 통째로 먼저 읽어둠(스냅샷).
//삽입하면서 자식을 그때그때 조회하면, 폴더A를 A안쪽에 붙여넣을때 방금 만든 복사본을
//다시 자식으로 읽어서 무한재귀에 빠짐. 먼저 다 읽어두면 그 문제가 없음
async function readSubtreeSnapshot(ids, depth=0) {
  if(depth>30) return [];//순환/과도한 깊이 안전장치

  const idArray=Array.isArray(ids)? ids:[ids];
  if(idArray.length===0) return [];

  const placeholders=idArray.map(()=>"?").join(",");
  const {rows}=await query(`SELECT * FROM files WHERE id IN (${placeholders})`, idArray);

  const nodes=[];
  for(const row of rows){
    let children=[];
    if(row.type==='folder'){
      const {rows:childrows}=await query(
        `SELECT id FROM files WHERE parent_id=?`,[row.id]
      );
      children=await readSubtreeSnapshot(childrows.map(c=>c.id), depth+1);
    }
    nodes.push({row, children});
  }
  return nodes;
}

//스냅샷을 대상폴더 밑에 실제로 만들어냄
async function writeSnapshot(nodes, targetParentId) {
  let count=0;
  for(const node of nodes){
    const r=node.row;
    //이름충돌은 createFile이 generateUniqueName으로 알아서 "(2)"를 붙여줌
    const newid=await createFile({
      parentid:targetParentId,
      realfilename:r.realfilename,
      filename:r.filename,
      type:r.type,
      realpath:r.realpath,
      size:r.size,
      isori:r.isori
    });
    count++;
    if(node.children.length>0 && newid!==undefined && newid!==null){
      count+=await writeSnapshot(node.children, newid);
    }
  }
  return count;
}

//복사 붙여넣기. 디스크 파일은 안건드리고 같은 realpath를 가리키는 행만 새로 만듦
//폴더면 안쪽 구조까지 전부 따라감
async function copyFiles({ids, targetParentId}) {
  const idArray=(Array.isArray(ids)? ids:[ids])
    //루트를 복사대상에 넣으면 그 밑을 통째로 스냅샷 떠서 라이브러리 전체가 복제됨.
    //화면쪽에서 이미 메뉴를 빼두지만 여기서도 막아둠(deleteFile과 같은 이유)
    .filter(id=>Number(id)!==0);
  if(idArray.length===0) return {success:false, code:'err_copy_empty', message:'복사할 대상이 없습니다'};

  const snapshot=await readSubtreeSnapshot(idArray);
  if(snapshot.length===0) return {success:false, code:'err_copy_notfound', message:'복사할 대상을 찾지 못했습니다'};

  const count=await writeSnapshot(snapshot, targetParentId);
  return {success:true, count};
}

//썸네일 저장. 파일이면 자동생성된 축소본, 폴더면 사용자가 고른 대표이미지가 들어옴.
//둘다 같은 테이블에 대상 행의 id로 저장하면 되므로 함수 하나로 충분함.
//이미 있으면 덮어씀(REPLACE)
async function saveThumbnail({fileid, thumbnail}) {
  if(fileid===undefined||fileid===null) return {success:false, message:'대상이 없습니다'};

  //IPC를 건너오면 Uint8Array가 일반 객체처럼 될수있어서 Buffer로 되돌림
  const bytes=Buffer.isBuffer(thumbnail)? thumbnail : Buffer.from(thumbnail);
  //updated_at은 화면쪽 URL의 ?v= 로 쓰여서 캐시 무효화 역할을 함
  const version=Date.now();

  await query(
    `INSERT OR REPLACE INTO thumbnails(file_id,thumbnail,updated_at) VALUES(?,?,?)`,
    [fileid, bytes, version]
  );
  return {success:true, version};
}

//폴더 표지로 쓸 사진들을 고른 순서 그대로 저장.
//cover_ids가 갖는 세가지 의미:
//  NULL      = 한번도 안건드림 → 폴더 안에서 자동선택
//  '[]'      = 사용자가 일부러 없앰 → 표지 없는 빈 폴더
//  '[12,15]' = 직접 고름 → 그 순서 그대로
//빈 배열을 NULL로 저장하면 "없앴는데 자동선택된 다른 사진이 뜨는" 문제가 생기므로 그대로 '[]'로 넣음
async function saveFolderCovers({folderid, ids}) {
  if(folderid===undefined||folderid===null) return {success:false, message:'대상 폴더가 없습니다'};

  const idArray=Array.isArray(ids)? ids:[];
  //순서가 의미있으므로 정렬하지 말것. 4장 상한만 지킴
  const value=JSON.stringify(idArray.slice(0,4));

  await query(`UPDATE files SET cover_ids=? WHERE id=?`,[value, folderid]);
  return {success:true};
}

//폴더 여러개를 받아, 각 폴더 안에서 썸네일이 있는 자식을 최대 4개씩 뽑아옴.
//폴더 아이콘에 안에 든 걸 겹쳐 보여주려는 용도(윈도우 탐색기 방식).
//폴더마다 따로 물어보면 쿼리가 폭주해서 윈도우함수로 한번에 처리함
async function readFolderPreviews({ids}={}) {
  const idArray=[...new Set(Array.isArray(ids)? ids:[ids])]
    .filter(v=>v!==null&&v!==undefined);
  if(idArray.length===0) return {};

  const placeholders=idArray.map(()=>"?").join(",");
  const map={};

  //1) 사용자가 직접 고른 폴더는 그 목록을 "저장된 순서 그대로" 씀
  const {rows:coverrows}=await query(
    `SELECT id, cover_ids FROM files WHERE id IN (${placeholders}) AND cover_ids IS NOT NULL`,
    idArray
  );

  //cover_ids가 있으면(빈 배열이라도) 사용자가 손댄 폴더 → 자동선택 대상에서 제외.
  //빈 배열은 "일부러 표지를 없앤 것"이라 여기서 걸러내지 않으면 자동선택이 덮어써버림
  const pickedfolders=[];//사용자가 손댄 폴더들(아래 자동선택에서 제외해야함)
  const wantedids=[];    //그 폴더들이 지목한 사진 id 전부
  const pickmap={};      //폴더id -> [사진id...] 순서보존
  for(const row of coverrows){
    let list=[];
    try{ list=JSON.parse(row.cover_ids)||[]; }catch{ list=[]; }
    pickedfolders.push(row.id);
    pickmap[row.id]=list;
    wantedids.push(...list);
  }

  //지목된 사진들의 갱신시각을 한번에 조회(URL의 ?v= 에 필요)
  const versionmap={};
  if(wantedids.length>0){
    const uniq=[...new Set(wantedids)];
    const wp=uniq.map(()=>"?").join(",");
    const {rows:vrows}=await query(
      `SELECT file_id, updated_at FROM thumbnails WHERE file_id IN (${wp})`, uniq
    );
    for(const v of vrows) versionmap[v.file_id]=v.updated_at;
  }

  for(const folderid of pickedfolders){
    //표지로 쓰던 사진이 지워졌을 수 있어서 썸네일이 남아있는 것만 통과시킴
    map[folderid]=pickmap[folderid]
      .filter(fileid=>versionmap[fileid]!==undefined)
      .map(fileid=>({id:fileid, version:versionmap[fileid]}));
  }

  //2) 직접 고르지 않은 폴더는 예전처럼 이름순으로 자동 선택
  const autoids=idArray.filter(id=>!pickedfolders.includes(id));
  if(autoids.length>0){
    const ap=autoids.map(()=>"?").join(",");
    const {rows}=await query(`
      SELECT parent_id, id, updated_at FROM (
        SELECT f.parent_id, f.id, t.updated_at,
               ROW_NUMBER() OVER (PARTITION BY f.parent_id ORDER BY f.filename) AS rn
        FROM files f
        INNER JOIN thumbnails t ON f.id=t.file_id
        WHERE f.parent_id IN (${ap})
      ) WHERE rn<=4
    `, autoids);

    for(const row of rows){
      if(!map[row.parent_id]) map[row.parent_id]=[];
      map[row.parent_id].push({id:row.id, version:row.updated_at});
    }
  }

  return map;
}

//thumb:// 프로토콜이 쓰는 조회. 목록조회에선 절대 안읽고 여기서만 한장씩 꺼냄
async function readThumbnail({fileid}={}) {
  if(fileid===undefined||fileid===null) return null;
  const {rows}=await query(`SELECT thumbnail FROM thumbnails WHERE file_id=?`,[fileid]);
  return rows.length>0 ? rows[0].thumbnail : null;
}

//업데이트 아마 파일이름바꿀때? - IPC 공용디스패처(fileDB[method](data) 인자 1개)를 타야해서
//다른 CRUD함수들처럼 단일 객체 인자로 통일
async function updateFile({id, updates}) {
  // updates = { filename: 'newname.txt', size: 999 }
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id); // WHERE id = ?

  const result = await query(
    `UPDATE files SET ${setClause} WHERE id = ?`,
    values
  );
  return result.changes; // 변경된 행 수
}
//이름바꾸기. updateFile을 그냥 쓰면 이름이 겹칠때 UNIQUE 위반으로 터져버려서 전용 함수를 둠.
//이동/복사와 달리 여기선 자동으로 (2)를 붙이지 않음 - 사용자가 직접 정한 이름을
//앱이 말없이 바꾸면 당황스러우므로, 겹치면 알려주고 다시 입력받게 함(윈도우와 같은 방식)
async function renameFile({id, filename}) {
  if(id===undefined||id===null) return {success:false, code:'rename_empty'};
  //루트는 트리의 뿌리라 이름을 바꾸면 주소표시줄 맨 앞이 통째로 달라짐
  if(Number(id)===0) return {success:false, code:'rename_root'};

  const newname=String(filename||'').trim();
  if(newname.length===0) return {success:false, code:'rename_empty'};

  //부모를 알아야 같은 폴더 안에서만 중복검사를 할수있음. 화면이 안보내도 되게 여기서 읽음
  const {rows:target}=await query(`SELECT parent_id, filename FROM files WHERE id=?`,[id]);
  if(target.length===0) return {success:false, code:'rename_empty'};

  //이름이 그대로면 할 일 없음(자기 이름을 중복이라고 막는 일 방지)
  if(target[0].filename===newname) return {success:true, filename:newname};

  //id<>? 로 자기 자신은 빼고 검사
  const {rows:dup}=await query(
    `SELECT 1 FROM files WHERE parent_id=? AND filename=? AND id<>?`,
    [target[0].parent_id, newname, id]
  );
  if(dup.length>0) return {success:false, code:'rename_duplicate'};

  await query(`UPDATE files SET filename=? WHERE id=?`,[newname, id]);
  return {success:true, filename:newname};
}

//디스크의 파일이 실제로 옮겨졌을때, 그 경로를 가리키던 행을 전부 새 경로로 돌려놓음.
//내보내기가 파일을 옮기면 내보낸 폴더 안의 행들은 건별로 갱신되지만,
//같은 파일을 가리키던 "바깥" 폴더의 행들은 옛 경로를 그대로 들고있어서 통째로 깨진다.
//id가 아니라 경로로 찾아야 그 행들까지 같이 따라옴
async function relinkRealpath({from, to}) {
  if(!from || !to) return 0;
  const result=await query(`UPDATE files SET realpath=? WHERE realpath=?`,[to, from]);
  return result.changes;
}

//드래그로 파일/폴더들을 다른 폴더 안으로 이동
async function moveFiles({ids, targetParentId}) {
  const idArray=Array.isArray(ids)? ids:[ids];
  if(idArray.length===0) return {success:false, code:'err_move_empty', message:'옮길 대상이 없습니다'};
  //자기 자신 위에 드롭한 경우 무시
  if(idArray.includes(targetParentId)) return {success:false, code:'err_move_self', message:'자기 자신에게는 이동할 수 없습니다'};

  //순환 방지: targetParentId가 옮기려는 폴더들 중 하나의 하위(자손)인지 재귀로 체크
  //(파일을 자기 자신 하위로 옮기면 트리가 끊기거나 무한루프 경로가 생김)
  const placeholders=idArray.map(()=>"?").join(",");
  const {rows:descendantRows}=await query(`
    WITH RECURSIVE Descendants AS (
      SELECT id FROM files WHERE parent_id IN (${placeholders})
      UNION ALL
      SELECT f.id FROM files f
      INNER JOIN Descendants d ON f.parent_id=d.id
    )
    SELECT id FROM Descendants WHERE id=?
  `, [...idArray, targetParentId]);
  if(descendantRows.length>0){
    return {success:false, code:'err_move_descendant', message:'폴더를 자기 자신의 하위 폴더로는 이동할 수 없습니다'};
  }

  //이름충돌 처리. files엔 UNIQUE(parent_id,filename)이 걸려있어서 그냥 parent_id만 바꾸면
  //대상폴더에 같은이름이 있을때 제약위반으로 터짐. 파일넣을때(createFile)처럼 "(2)"를 붙여줌.
  //주의: generateUniqueName은 이름끝의 " (숫자)"를 먼저 떼고 시작하기 때문에
  //충돌도 없는데 그냥 태우면 "베릴.png (2)"가 "베릴.png"로 멋대로 바뀜.
  //그래서 실제로 충돌이 있을때만 호출함.
  const {rows:movingRows}=await query(
    `SELECT id, filename FROM files WHERE id IN (${placeholders})`, idArray
  );

  let changes=0;
  const renamed=[];//이름이 바뀐것들 (조용히 바뀌면 사용자가 모르니 알려주려고)
  for(const row of movingRows){
    //id<>?로 자기자신은 빼야함. 이미 대상폴더에 있는걸 다시 놓는 경우 자기이름에 자기가 걸림
    const {rows:conflict}=await query(
      `SELECT 1 FROM files WHERE parent_id=? AND filename=? AND id<>?`,
      [targetParentId, row.filename, row.id]
    );

    let newname=row.filename;
    if(conflict.length>0){
      newname=await Utils.generateUniqueName({query, parentid:targetParentId, currentname:row.filename});
      renamed.push({from:row.filename, to:newname});
    }

    //한건씩 바로 반영해야 다음 파일의 충돌검사가 방금 옮긴것까지 보고 판단함
    //(같은이름 파일 여러개를 한폴더로 몰아넣을때 필요)
    const result=await query(
      `UPDATE files SET parent_id=?, filename=? WHERE id=?`,
      [targetParentId, newname, row.id]
    );
    changes+=result.changes;
  }

  return {success:true, changes, renamed};
}
async function deleteFile(ids) {
  const idArray=(Array.isArray(ids)? ids:[ids])
    //루트(id=0)는 절대 지우면 안됨. 지워지면 그 밑의 모든 항목이 부모를 잃고 트리가 통째로 깨짐.
    //트리에 루트행이 보이게되면서 우클릭으로 삭제가 눌릴수 있게돼서 여기서 원천차단
    .filter(id=>Number(id)!==0);
  if(idArray.length===0) return 0;
  const placeholders=idArray.map(()=>"?").join(",");

  //폴더를 지우면 그 안의 모든 자손도 같이 지워야함.
  //안그러면 부모가 사라진 행들이 화면엔 안보이는채로 DB에 영원히 남아버림.
  //UNION(ALL 아님)이라 혹시 순환이 생겨도 중복 제거로 멈춤
  const {rows}=await query(`
    WITH RECURSIVE Targets AS (
      SELECT id FROM files WHERE id IN (${placeholders})
      UNION
      SELECT f.id FROM files f INNER JOIN Targets t ON f.parent_id=t.id
    )
    SELECT id FROM Targets
  `, idArray);

  const allids=rows.map(r=>r.id).filter(id=>Number(id)!==0);
  if(allids.length===0) return 0;
  const allplaceholders=allids.map(()=>"?").join(",");

  //thumbnails의 FK엔 ON DELETE CASCADE가 걸려있지만 SQLite는 PRAGMA foreign_keys가
  //기본으로 꺼져있어서 동작하지 않음. 그래서 직접 지워줌
  await query(`DELETE FROM thumbnails WHERE file_id IN (${allplaceholders})`, allids);

  const result = await query(`DELETE FROM files WHERE id IN (${allplaceholders})`, allids);
  return result.changes; // 삭제된 행 수
}
export  {
  createFile,
  manycreateFiles,
  readFiles,
  readsearchFiles,
  updateFile,
  renameFile,
  moveFiles,
  copyFiles,
  saveThumbnail,
  readThumbnail,
  readFolderPreviews,
  saveFolderCovers,
  deleteFile,
  getFolderPath,
  relinkRealpath,
  //내보내기가 "이 폴더 아래 전부"를 트리모양으로 받아야해서 같이 내보냄
  //(copyFiles가 쓰던걸 그대로 재사용. 미리보기 계산도 이걸로 함)
  readSubtreeSnapshot
};