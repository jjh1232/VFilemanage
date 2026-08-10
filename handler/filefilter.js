//메인 프로세스 전용 코드다. 예전엔 src/Layout/TOOL/Nodetool.js 에 있었는데,
//src/는 Parcel이 브라우저용으로 번들하는 폴더라 electron-store를 쓰는 이 파일이
//거기 있으면 안된다. 화면쪽에서 실수로 import 한줄만 해도 Parcel이 fs/path를
//브라우저용 가짜모듈로 바꾸려다 빌드가 통째로 깨진다.
//
//store는 setting.js 것을 그대로 쓴다. 예전엔 여기서 new Store()로 따로 만들었는데
//그 인스턴스는 defaults가 없어서 filters가 통째로 비면 undefined가 나왔다
import store from '../setting.js';

//폴더를 가져올지 여부. 끄면 폴더도 그 안의 내용도 통째로 안 들어온다.
//판단이 main.js(재귀삽입)에 필요한데 설정 읽는 곳을 한군데로 모으려고 여기서 같이 내보냄
export function keepFolders(){
    const storefilter=store.get("filters");
    //설정이 깨져있으면 "가져온다"가 안전한 쪽이다(빠지는 것보다 들어오는게 낫다)
    if(!storefilter) return true;
    return storefilter.keepfolders!==false;
}

//폴더 안의 파일에도 형식필터를 적용할지.
//끄면 폴더 안은 종류를 안 가리고 전부 가져온다("이 폴더는 통째로 보관")
export function filterInside(){
    const storefilter=store.get("filters");
    //설정이 깨졌을때는 "적용한다"가 기본. 안 걸러서 다 들어온걸 나중에 골라 지우는게 더 번거롭다
    if(!storefilter) return true;
    return storefilter.filterinside!==false;
}

//가져오기 한번당 딱 한번 불러서 "통과시킬 확장자 목록"을 만든다.
//예전엔 파일묶음마다 이걸 새로 만들었는데, store.get은 그때마다 설정파일을 디스크에서
//다시 읽어서 폴더가 2000개면 config.json을 2000번 읽고 Set도 2000번 만들었다.
//null을 돌려주면 "필터 안함"(전부 통과)이라는 뜻
export function buildFilterSet(){
    const storefilter=store.get("filters");

    //setting.js의 defaults 덕에 보통은 항상 채워져있다. 다만 preload의 store.openstore로
    //사용자가 설정파일을 직접 열어 filters를 지울수 있어서 방어한다
    if(!storefilter||!storefilter.categories) return null;
    if(!storefilter.enabled) return null;

    //탐색속도가 빠른 Set
    const exts=new Set();
    for(const category of Object.values(storefilter.categories)){
        //카테고리가 꺼져있으면 하위를 볼 필요도 없음
        if(!category.enabled) continue;
        for(const item of category.items){
            if(item.enabled) exts.add(item.ext.toLowerCase());
        }
    }
    return exts;
}

//파일 "이름 하나"로 판정한다. 경로를 만들기 전에 부를 수 있어야 해서 이름만 받는다 -
//통과 못하는 파일은 경로문자열도 객체도 안 만들고 그냥 건너뛰는게 이 함수의 존재이유다.
//exts가 null이면 필터가 꺼진 상태라 전부 통과
export function passesName(name, exts){
    if(!exts) return true;

    const dot=name.lastIndexOf('.');

    //확장자가 아예 없는 파일(README, Makefile 등)은 통과시킴.
    //화이트리스트는 "어떤 종류를 받을지" 고르는 장치지 이름 규칙을 검사하는게 아니고,
    //사용자가 직접 끌어다 놓은 파일이 이유도 없이 사라지는게 더 나쁨.
    //dot===0은 .gitignore 같은 경우로, 이것도 확장자가 아니라 이름의 일부로 봄
    if(dot<=0) return true;

    return exts.has(name.slice(dot+1).toLowerCase());
}
