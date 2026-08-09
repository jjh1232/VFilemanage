#pragma execution_character_set("utf-8")
#include <napi.h>
#include "Src/FileModule.h"
//한글



//모듈 초기화 빈exports객체를 받아서 각묘듈을 채워줌
//ENv는 현재실행중인 js스코프정보래 js엔진컨테긋트라는데 걍필요하다함..
//사실상자바의 main메서드
Napi::Object Init(Napi::Env env, Napi::Object exports) {
//exports는 전체모듈담을 빈컨테이너라고생각,env는 js실행환경
    
  
   
  //filemodule.cpp의 Init호출
 
  FileModule::FileModuleInit(env,exports); //모듈파일초기화 요안에서 set을해둠
    
  //완성모듈 반환
  return exports;
}
//js로 반환 node모듈에 등록하는 이름을 정하고 그메인함수?시작점메서드를 등록
NODE_API_MODULE(myaddon, Init) //타켓네임과동일하게 Init는 생성되면 빈객체에 넣을거 