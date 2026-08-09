// 컴파일러에게 "이 함수들이 존재한다"고 알려주는 역할 (자바 interface처럼)
#pragma execution_character_set("utf-8")
#pragma once  // 중복 include 방지
#include <napi.h>  // N-API 기본 타입들
#include "./DB/Dbset.h"

// 클래스 선언 (자바 public class처럼)
class FileModule {
private://클래스멤버를선언
    static SQLiteCRUD sqlcrud; //전역선언은헤더에서필요
public:
 
       // 2. 실제 JS에서 호출할 함수들 (선언만!)
    static Napi::String Test(const Napi::CallbackInfo& info);

    static Napi::String Insertfiles(const Napi::CallbackInfo& info);

    //DB경로를 JS에서 받아서 여는 함수. 모듈 로드시점에 여는게 아니라 이걸로 따로 열어야함
    static Napi::Boolean Initdb(const Napi::CallbackInfo& info);

    //  1. 반드시 있어야하는 초기화 함수 (static = 클래스 메소드)
    static Napi::Object FileModuleInit(Napi::Env env, Napi::Object exports);
    
 
  
};