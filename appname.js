import { app } from 'electron';

//app.setName은 app.getPath('userData')가 가리키는 폴더 이름을 정한다.
//DB(filetree.db)와 설정(config.json)이 반드시 같은 폴더를 봐야해서, "둘 중 무엇이 먼저
//로드되든 이름은 이미 정해져있다"를 보장하려고 파일로 따로 뺐다.
//
//예전엔 이 줄이 dbpath.js 안에 있었다. 그때는 main.js가 dbpath를 electron-store보다
//먼저 require해서 우연히 맞아떨어졌을 뿐이고, require 순서를 한줄만 바꾸면
//설정과 DB가 다른 폴더로 갈라졌다. 게다가 sqlite는 파일이 없으면 에러없이 빈 DB를
//새로 만들어버려서 "파일목록이 통째로 사라짐"으로만 보이고 원인을 찾기가 극도로 어려웠다.
//
//지금은 userData를 쓰는 쪽(dbpath, setting, crashhandler)이 각자 이 파일을 import한다.
//ES모듈은 몇번을 import해도 한번만 실행되므로, 로드 순서와 무관하게 항상 여기가 먼저 끝난다.
//
//⚠️ 이 값은 절대 바꾸지 말것.
//   바꾸는 순간 기존 사용자의 userData 폴더를 못찾아서 라이브러리가 통째로 사라진다.
//   화면에 보이는 제품명은 여기가 아니라 두 군데다:
//   package.json의 productName(설치파일/시작메뉴/바로가기)과 index.html의 title(창 제목).
//   그 둘은 마음대로 바꿔도 userData 폴더에 영향이 없다 - 이 파일이 락보다 먼저 이름을
//   확정하기 때문이다(main.js 맨 위의 require 순서 참고).
//
//   2026-09-03: 첫 배포 직전에 'react-parcel'(개발 프로젝트명)에서 바꿨다.
//   사용자가 %APPDATA%에서 찾을 이름은 제품명이어야 하는데 폴더만 딴 이름이었다.
//   이때는 쓰던 사람이 개발자 본인뿐이라 폴더명만 바꿔 옮기면 끝나는 일이었지만,
//   배포 이후로는 남의 PC에 이 폴더가 생기므로 정말로 못 바꾼다.
app.setName('VFilemanage');
