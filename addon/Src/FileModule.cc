//한글
#pragma execution_character_set("utf-8")
#pragma warning(disable: 4819) //주석도뭐 인코딩글케한디;
#include "napi.h"
#include "FileModule.h"
#include <filesystem> 
#include <fstream>  
#include <string>
#include <vector>
#include <cstdio>   
//utf변환 안하면 파일이 문제생겨한글
#include <locale>
#include <codecvt>
#include "./DB/Dbset.h"
#include "./Utils/FileUtils.h"
#include <direct.h> 
 //파일 이름이나 시간 은 filesystem
//파일내용이나그런거읽는거 fstream
//별칭 훨씬편하다
namespace fs = std::filesystem;   


SQLiteCRUD FileModule::sqlcrud; //실정의
 
    

 // 테스트용 함수 정의
Napi::String FileModule::Test(const Napi::CallbackInfo& info) {
   
    return Napi::String::New(info.Env(),"sasdfaaaaaaaaaaa");
   
}
//파일 DB에 저장
        //const 는 c++에서 이거 수정x라는거 참조로받아! Request객체같은게 callbackinfo& info
 Napi::String FileModule::Insertfiles(const Napi::CallbackInfo& info) {
        printf(" [C++] getFiledatas start!\n");
        //컨버터 일단 한번만올라가게
        static std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;  // 새로생성
        
        Napi::Env env=info.Env(); //js실행환경
        //이거 [0]에 전체 배열형식으로와서 이거하나에 모든 패스가 들어감
        Napi::Array filepath=info[0].As<Napi::Array>(); //js배열받을 AS.는문자열변환
            printf(" [C++] paramitersize: %u\n", filepath.Length());
        // 0번 인덱스에서 문자열 얻기
        //1번인덱스 부모 아이디
        int folderid=info[1].As<Napi::Number>().Int32Value();
        //Get할떄 오벌로드가 애매하다가 컴파일러에서 에러난다함 그래서 정확한 타입을명시해줘야한다함
    //Napi::Value first = filepath.Get(static_cast<uint32_t>(0));
    //std::string filePath = first.As<Napi::String>().Utf8Value();//배열의 첫번쨰(주소)가져오는거
     printf("valuecom"); //파일패스렝스로 크기지정
    //파이형식맞춰서벡터(list)선언
    std::vector<FileInfo> fileinfos;
    fileinfos.reserve(filepath.Length()); //길이미리지정
    //callback함수로 정의 (for문너무길어서 청크넣기힘듬)
    //청크로 나눠서하자
    const uint32_t chunksize=10;
    for(uint32_t chunkStart=0;chunkStart<filepath.Length();chunkStart +=chunksize){
       //내부마지막
        uint32_t chunkend=std::min(chunkStart+chunksize,filepath.Length());
        //25같은걸로나오면 29까지돌면오류남
    for(uint32_t i=chunkStart;i<chunkend;i++){
        { //이중괄호가 컴파일러가 filepath를 다쓰고 자동으로 비워줌 안하면메모리폭팔
         printf(" fileformoon start\n");
         //utf8로오나봄 변환필요
         try{
        std::string filePath=filepath.Get(i).As<Napi::String>().Utf8Value();
        // 변환converter 사용!
         std::wstring widePath = converter.from_bytes(filePath);   

          // 파일명은 원본에서 추출 (깨짐 방지!)
          size_t lastSlash = filePath.find_last_of("/\\");
         std::string filename = (lastSlash == std::string::npos) ? filePath : filePath.substr(lastSlash + 1);
            std::string type;
              double size=0.0;
           {//filesystem사용 fs로 선엄함
           fs::path path(widePath);
                //디렉터리 체크 하기
                bool isdir=fs::is_directory(path);

                if(isdir){//디렉터리면 타입고정, 사이즈는 폴더라 0
                    type="folder";
                }
                else if(fs::exists(path)){//디렉터리가아니고 존재할떄만 사이즈
                    try{
                        size=(double)fs::file_size(path);
                        type=FileUtils::GetFileType(path.string());
                    }catch(...){
                        size=0.0;
                        type="folder";
                    }
                }

            
                
           
            }//apth메모리지우기
           
                 //파일인포생성
            FileInfo fileinfo;
            fileinfo.parentid=folderid;
            fileinfo.realfilename=filename;
            fileinfo.realpath=filePath;
            fileinfo.filename=filename;
            fileinfo.type=type;
            fileinfo.size=size;
            fileinfo.isori=0;

        fileinfos.push_back(fileinfo);
           
          printf("=== FileInfo Debug ===\n");
        printf("parentid: %d\n", fileinfo.parentid);
       printf("real_path: %s\n", fileinfo.realpath.c_str());  // std::string이면 .c_str()
        printf("filename: %s\n", fileinfo.filename.c_str());
        printf("type: %s\n", fileinfo.type.c_str());
        printf("size: %f\n", fileinfo.size);  // size_t면 %zu 또는 %lld
        printf("====================\n\n");
            
          printf(" fileformoon end\n");
        }catch(...){
            printf("에러남");
            continue;
        }
    } //메모리비우는 자동중괄호끝
    }//for문끝
}
        printf("files; insert");
       auto result=FileModule::sqlcrud.insertFiles(fileinfos);
       if(!result){
           //실패
       }   
    printf(" [C++] getFiledatas exit\n");
     return Napi::String::New(info.Env(),"success");
 }

//DB경로는 JS(main.js)가 넘겨준다.
//예전엔 FileModuleInit에서 "filetree.db"를 상대경로로 열었는데, 상대경로는 프로세스의
//현재작업폴더 기준이라 배포하면 JS쪽과 다른 파일을 잡는다. 게다가 sqlite3_open은 파일이
//없으면 에러 대신 새로 만들어버려서, 에러 하나 없이 DB가 둘로 갈라진다
Napi::Boolean FileModule::Initdb(const Napi::CallbackInfo& info){
    Napi::Env env=info.Env();

    if(info.Length()<1 || !info[0].IsString()){
        Napi::TypeError::New(env,"initdb(dbpath) 문자열 필요").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env,false);
    }

    std::string dbpath=info[0].As<Napi::String>().Utf8Value();
    bool ok=FileModule::sqlcrud.open(dbpath);
    printf("[C++] DB열기 %s: %s\n", ok? "성공":"실패", dbpath.c_str());

    //조용히 실패하면 파일을 넣어도 목록에 안뜨는 상태가 되므로 JS로 던져서 바로 알게함
    if(!ok){
        Napi::Error::New(env,"DB 열기 실패: "+dbpath).ThrowAsJavaScriptException();
    }
    return Napi::Boolean::New(env,ok);
}

//각모듈마다 반드시있어야함 초기화하고 함수를 exports에담아야함
Napi::Object FileModule::FileModuleInit(Napi::Env env,Napi::Object exports){
    //DB는 여기서 열지않음. main.js가 initdb로 경로를 넘겨줘야 열린다
    Napi::Object file = Napi::Object::New(env); //빈객체생성파일
    //파일객체에서 js함수추가
   // file.Set("getFiledatas",Napi::Function::New(env,getFiledatas));
   //이게 파일오브젝트 만들어서 구분을 위해 담긴하늗네 바로 exports에 넣을수도있음
    file.Set("test",Napi::Function::New(env,Test));
    //Napi로 c++과 js변환  Function::New 이건 c++을 js호출함수로 새로구성 ,env는 request같은거
    file.Set("insertfiles",Napi::Function::New(env,Insertfiles));
    //insertfiles보다 먼저 불러야함(안그러면 DB 미연결)
    file.Set("initdb",Napi::Function::New(env,Initdb));
    //최상위 exports에 파일추가  
    exports.Set("file",file);
    return exports;
}


