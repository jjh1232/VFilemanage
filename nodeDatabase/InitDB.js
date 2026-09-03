import sqlite3 from 'sqlite3';
//sqlite3가 대용량좋다함.. JSON으로 내가저장도있는데 그것보단나은거같아서
//라이브러리설치
//경로는 dbpath.js가 정함(사용자 데이터 폴더). 여기서 직접 계산하면 addon쪽과 어긋남
import { dbpath } from './dbpath.js';
import { debug, logerror } from '../handler/log.js';
//sqllite 연결객체
const db=new sqlite3.Database(dbpath);


 function init(){
    //여러sql명령순서대로실행보장
  debug("init시작")
  //표 생성이 다 끝나면 resolve된다. main.js가 이걸 await해야 첫 실행에서 안 터진다
  return new Promise((resolve,reject)=>{
    db.serialize(()=>{//여러 sql순서대로 실행보장(병렬실행방지용)
      //if not exist 있으면 안생성
              db.run(`CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER DEFAULT 0,
            realfilename TEXT NOT NULL,
            filename TEXT NOT NULL,
            type TEXT NOT NULL,
            realpath TEXT,
            size INTEGER DEFAULT 0,
            isori INTEGER DEFAULT 0,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(parent_id,filename)
            )`);  // ❌ 닫는 괄호 ) 추가!


            //썸네일따로저장연관관계가좋닿마
            db.run(`CREATE TABLE IF NOT EXISTS thumbnails (
              file_id INTEGER PRIMARY KEY,
              thumbnail BLOB,
              FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
              )`);
                
             //설정추가하면하는식?
     // 설정 테이블 (키-값 저장)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,     
            value TEXT                
        )`);
       //설정 기본값목록 
       db.run(`INSERT OR IGNORE INTO settings (key,value) VALUES
         ('view',
         '{"viewoption":"large",
         "isdetail":{"isfilename":true,"isdate":true,"istype":true,"issize":true,"islength":true}
         ,"sort":{"key":"filename","direction":"desc"} }'
         ),('tree','{"folderview":false,"sortoption":"asc"}')
         ,('user','{"isdarkmode":false}')
        `)
        // 루트 폴더 (처음 실행시만 생성)
        db.run(`INSERT OR IGNORE INTO files
            (id,parent_id,Realfilename,filename, type, realpath)
            VALUES (0,-1, 'Root','Root', 'folder', 'NULL')`);

        //썸네일 갱신시각. 화면쪽 URL의 ?v= 로 쓰여서, 대표이미지를 바꿨을때
        //브라우저가 옛 그림을 캐시해서 계속 보여주는걸 막아줌.
        //이미 컬럼이 있으면 에러가 나는데 그건 정상이라 무시함(CREATE TABLE IF NOT EXISTS로는 못 추가돼서 필요)
        db.run(`ALTER TABLE thumbnails ADD COLUMN updated_at INTEGER`,(err)=>{
          if(err && !String(err.message).includes('duplicate column')){
            logerror("thumbnails 마이그레이션 실패",err);
          }
        });

        //폴더 표지로 쓸 사진 id들을 고른 순서대로 담음(JSON 배열). 비어있으면 자동으로 고름.
        //위와 같은 이유로 이미 있으면 에러가 나는데 정상이라 무시
        db.run(`ALTER TABLE files ADD COLUMN cover_ids TEXT`,(err)=>{
          if(err && !String(err.message).includes('duplicate column')){
            logerror("files 마이그레이션 실패",err);
          }
        });

        //예전엔 썸네일을 base64 JPEG 문자열로 저장했는데 지금은 WebP 원본바이트라 형식이 안맞음.
        //화면에 보일때 자동으로 다시 만들어지므로 한번 비움(폴더 대표이미지는 다시 지정 필요)
        db.run(`DELETE FROM thumbnails WHERE updated_at IS NULL`);

        //addon버그로 예전에 드래그해서 넣은 폴더들이 type=''로 저장돼있던거 마이그레이션
        //type이 비어있는건 이 버그로만 생길수있었던거라 무조건 폴더였다고 봐도 안전함
        //매번 실행돼도 고칠게 없으면 그냥 0행 업데이트라 부담없음
        db.run(`UPDATE files SET type='folder' WHERE type='' OR type IS NULL`);

        // 인덱스 (parent_id 검색 100배 빨라짐) //패런트아이디컬럼내부에 인덱스를 줘서 속도개선이라함
        //여기가 마지막 문장이다. serialize 안이라 위의 CREATE TABLE들이 전부 끝난 뒤에만
        //이 콜백이 불린다 - 그래서 이걸로 "표가 다 준비됐다"를 알린다.
        //예전엔 init이 Promise를 안 돌려줘서 main.js가 기다릴 방법이 없었고,
        //표가 아직 없는 새 PC 첫 실행에서 뒤따르는 fixExtSuffixNames가
        //"no such table: files"로 터졌다
        db.run(`CREATE INDEX IF NOT EXISTS idx_parent_id ON files(parent_id)`,(err)=>{
          if(err) return reject(err);
          debug("init끝");
          resolve();
        });
          

           
    })

  })
}
//예전엔 이름이 겹칠때 파일명 전체 뒤에 번호를 붙여서 "티아.png (1)"처럼 됐다.
//앱 안에서는 타입을 realpath로 판별해서 티가 안났지만, 실제 폴더로 내보내면
//윈도우가 확장자를 못알아봐서 열 수 없는 파일이 된다. "티아 (1).png"로 되돌린다.
//고치고나면 아래 정규식에 더이상 안걸리므로 몇번 실행해도 안전함(init의 다른 마이그레이션들과 같음)
async function fixExtSuffixNames(){
  const {rows}=await query(
    `SELECT id,parent_id,filename FROM files WHERE type<>'folder' AND id<>0`
  );

  //"이름.확장자 (숫자)" 만 대상. 폴더나 평범한 이름은 안걸림
  const pattern=/^(.*)(\.[A-Za-z0-9]{1,6}) \((\d+)\)$/;
  let fixed=0;

  for(const row of rows){
    const m=row.filename.match(pattern);
    if(!m) continue;

    const newname=`${m[1]} (${m[3]})${m[2]}`;

    //files엔 UNIQUE(parent_id,filename)이 걸려있어서, 같은 폴더에 그 이름이 이미 있으면
    //고치는 순간 제약위반으로 터진다. 그런 행은 건드리지 않고 넘어감
    const {rows:dup}=await query(
      `SELECT 1 FROM files WHERE parent_id=? AND filename=? AND id<>?`,
      [row.parent_id,newname,row.id]
    );
    if(dup.length>0){
      debug("이름정리 건너뜀(이미 있음):",row.filename,"->",newname);
      continue;
    }

    await query(`UPDATE files SET filename=? WHERE id=?`,[newname,row.id]);
    fixed++;
  }

  if(fixed>0) debug(`이름정리: 확장자 뒤에 있던 번호 ${fixed}개를 앞으로 옮김`);
  return fixed;
}

//promise로 동기화해야함 얘비동기라 다수하면 개판된다함
async function query(sql,params=[]){//sql문과 넣을 값들 배열
  return new Promise((resolve,reject)=>{//작업성공리졸브,실패리젝트
    //trim으로 공백제거 와 대소문자무시  ,Select면 조회 all아니면 변경 run
   
    const cleansql=sql.trim().toUpperCase();
    const isselect=cleansql.startsWith(`SELECT`)||cleansql.startsWith('WITH');
    const method=isselect? 'all':'run';
 
    //db[method]->이거 .으로 대니깐 this는 sqllite3내부의 state객체같은거라는듯 
    db[method](sql,params,function(err,rows){ //콜백하는이유는 sqllite3는 옛날식이라promise지원안함
      if(err) {
        //console.log("sql에러:",err.message);
        //console.log("실행하려던쿼리:",sql);
        //console.log("전달파라미터:",params)

        return reject(err)
      } //Promise실패시 에러
      else{
        //console.log("쿼리실행성공",sql)
        //console.log("쿼리값:",rows)
       return resolve({ //아래 3개 는 sqlite3의 고정변수라는듯
        rows:rows || [], //select결과 배열담기 아니면 빈배열
        lastId:this.lastID, //인설트:새로생성된아이디 (sqlite3가 주는 속성명은 대문자 lastID임)
        changes:this.changes //update,delete 변경된행수
      })
    }
    })
  })
}

export{init,db,query,fixExtSuffixNames};