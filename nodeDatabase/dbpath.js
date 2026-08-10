//반드시 맨 위. 이걸 불러오는 순간 app.setName이 끝나서, 아래 getPath('userData')가
//설정(config.json)과 같은 폴더를 가리키는게 보장된다
import '../appname.js';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

//DB파일 위치를 여기 한곳에서만 정한다. JS(InitDB)와 C++ addon이 각자 경로를 계산하면
//둘이 어긋나도 티가 안나서(sqlite는 없는 파일을 그냥 만들어버림) DB가 조용히 갈라진다.

//앱 폴더가 아니라 사용자 데이터 폴더에 두는 이유:
//1) 배포하면 앱 폴더는 asar 안이거나 Program Files 밑이라 쓰기가 막힘
//2) 업데이트 설치때 앱 폴더가 통째로 교체돼서 사용자 라이브러리가 날아감
//3) PC를 여러명이 쓰면 계정별로 분리돼야함

//앱이름 고정(=userData 폴더 고정)은 appname.js가 맡는다. 위에서 이미 import했음.
//여기서 직접 setName을 하면, 이 파일보다 electron-store가 먼저 로드됐을때
//설정과 DB가 다른 폴더로 갈라진다
const dir = app.getPath('userData');
fs.mkdirSync(dir, { recursive: true });

const dbpath = path.join(dir, 'filetree.db');

//node-sqlite3의 파일생성은 비동기라, addon이 먼저 열려고 하면 아직 없을 수 있음.
//빈 파일을 미리 만들어두면 양쪽 다 확실히 같은 파일을 잡는다
//(0바이트 파일도 SQLite에선 유효한 빈 DB로 열림)
if (!fs.existsSync(dbpath)) fs.closeSync(fs.openSync(dbpath, 'w'));

console.log("DB 경로:", dbpath);

export { dbpath };
