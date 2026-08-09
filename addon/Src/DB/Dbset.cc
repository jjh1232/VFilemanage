#include "Dbset.h"
#include <stdexcept>
#include <regex>

SQLiteCRUD::SQLiteCRUD(){}

SQLiteCRUD::~SQLiteCRUD(){
    //객체사라질떄 DB커넥션닫기용
    if(db_)close();
}

bool SQLiteCRUD::open(const std::string& dbPath){
    if(db_) close();//두번 열면 앞의 핸들이 새서 미리 닫음

    //db파일열기. CREATE 플래그를 일부러 뺐음 - 파일생성은 스키마와 함께 JS쪽(InitDB)이 책임짐.
    //여기서 만들 수 있게 두면 경로가 어긋났을때 조용히 빈 DB가 하나 더 생겨서 원인을 못찾음
    int rc=sqlite3_open_v2(dbPath.c_str(),&db_,SQLITE_OPEN_READWRITE,nullptr);//db_에 연결핸드저장
    if(rc!=SQLITE_OK){
        //실패해도 핸들자체는 할당돼있어서 반드시 닫아줘야함
        printf("[C++] sqlite3_open_v2 실패(%d): %s\n",rc,sqlite3_errmsg(db_));
        close();
        return false;
    }
    return true;//성공시 true 실패시 false
}

int SQLiteCRUD::getUsedNumbers(const std::string& basename,int parentid){
    // 네임 (숫자) 형태인거 뽑을 정규식
     printf(" (숫자붙이기)시작\n");
     std::regex pattern(R"(.*\((\d+)\)(?:\.\w+)?$)");  //.은 아무글자 +하나이상반복 ()안에는 첫번쨰그룹/(은공백 $은 뭐있으면안된단거
     //특수문자를 이스케이프해서 사용하기위해 excafe사용
    const char* sql="SELECT filename FROM files WHERE parent_id =? AND filename LIKE ? ESCAPE '\\'";
    std::string out; 
    out.reserve(basename.size()*2);//메모리공간확보 

    for(char c :basename){

        if(c ==  '\\'  || c== '%' || c== '_'){
            out.push_back('\\');//특수문자앞이스케이프추가
        }
        out.push_back(c);//원래문자넣기
    }
    sqlite3_stmt* stmt;//구조체포인터
    sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);//db핸들,sql문,sql문자열길이자동으로 stlen으로구하기,이쿼리를컴파ㅇㄹ해서stmt에넣음,사용안하는인자 보통남은sql받아옴
     
     sqlite3_bind_int(stmt, 1, parentid);                    // int
    sqlite3_bind_text(stmt, 2, (out+"%").c_str(), -1, SQLITE_TRANSIENT);//4,5인자는 c특성상\0이마지막에생기는거까지읽는거랑내부퍼버관련

    int maxNum=0;

    while(sqlite3_step(stmt)==SQLITE_ROW){//셀렉트로가져온걸 모두돔 
        const char* filename=(const char*)sqlite3_column_text(stmt,0);
        //fn변수 선언
        std::string fn(filename);
         printf(" 이름바꾸기숫자찾기\n");
        //정해진양식만보기 이름(숫자형식인지순환)
        std::smatch match;//정규식을위해 includ해야함 regex도 담을그릇같은거
       
        if(std::regex_match(fn,match,pattern)){
                //stoi,문자열을 int정수로변경
            int num=std::stoi(match[1].str());//파일 (13) 이런식이ㄴ면 0은전체,1은 첫괄호2는 숫자부분
            if(num>maxNum){
                maxNum=num;
            }
        }

    }
    sqlite3_finalize(stmt);
      printf(" 붙일숫자%d:\n",maxNum+1);
    return maxNum+1;
    }
bool SQLiteCRUD::insertFiles(const std::vector<FileInfo>&files){
    //initdb를 안불렀거나 열기에 실패한 경우. 여기서 막아야 엉뚱한 크래시 대신 원인이 보임
    if(!db_){
        printf("[C++] DB 미연결 - initdb를 먼저 호출해야함\n");
        return false;
    }
    //트랜잭션으로 파일을 다중 으로 넣는게 비용적으로도 좋다함
    printf(" DB시작\n");
      // 벡터 전체 순회해서 출력
    for (size_t i = 0; i < files.size(); i++) {
        printf("  [%zu] parentid=%d, filename=%s, ,path=%s, type=%d, size=%lld\n",
            
            files[i].parentid,
            files[i].filename.c_str(),      // std::string이면 .c_str()
            files[i].realpath.c_str(),
            files[i].type,
            files[i].size,
            files[i].realfilename.c_str(),
            files[i].isori

        );
    }
    printf("==========================\n\n");

    //트랜잭션시작   열린db핸들변수,SQL명령어,결과,콜백데이터,에러메세지받을포인터
    if(sqlite3_exec(db_,"BEGIN TRANSACTION",nullptr,nullptr,nullptr)!=SQLITE_OK){
        return false;// 트랜잭션실패시false
    }
    //db_에서 트랜잭션시작되서 메모리에저장시작 
    printf(" 트랜잭션시작\n");
    //미리컴파일된 sql준비 sqllite는 char* 로 C스타일문자열만받는다함
    const char* sql= "INSERT INTO files (parent_id,realfilename,filename,type,realpath,size,isori) "
                     "VALUES (?,?,?,?,?,?,?)"; 
                     //stmt에 준비된 sql명령어를 저장 무조건 포인터사용한다함 객체주소필요 c
    sqlite3_stmt* stmt=nullptr;//커파일된 sql 문장핸들?

        //sql컴파일 (실패하면 false) sql컴파일기라함prepare
        //성능개선된 v1보다 좋은거라함  &stmt stmt변수의 주소를 줘서 내부값변경 -1문자열끝까지자동계산
    if(sqlite3_prepare_v2(db_,sql,-1,&stmt,nullptr) !=SQLITE_OK){
        //프리페어 실패시 트랜잭션롤백
        printf("SQLITE_PREPARE 실패: %s\n", sqlite3_errmsg(db_));
        sqlite3_exec(db_,"ROLLBACK",nullptr,nullptr,nullptr);
        printf("롤백\n");
        return false;
    }
    bool allSuccess =true;//리턴값
        // 3. ? 위치에 실제 값 바인딩 (1부터 시작! 0 아님)
    //    SQLITE_TRANSIENT = 값 복사해서 안전하게 보관
    for(const auto& file: files){
    sqlite3_bind_int(stmt, 1, file.parentid);                    // int
    sqlite3_bind_text(stmt, 2, file.realfilename.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, file.filename.c_str(), -1, SQLITE_TRANSIENT);  // string
    sqlite3_bind_text(stmt, 4, file.type.c_str(), -1, SQLITE_TRANSIENT);//무낮열안전하게복사
    sqlite3_bind_text(stmt, 5, file.realpath.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 6, file.size);                       // long
    sqlite3_bind_int(stmt, 7, file.isori);    


    //트랜잭션넣기 이거결과다쓰기위해 변수로
    int stepResult=sqlite3_step(stmt);
    if(stepResult !=SQLITE_DONE){
        //유니크조건문제인지이름먼저바꾸기
        //에러코드찾기
         printf(" 넣기실패\n");
        int errCode=sqlite3_extended_errcode(db_);
        
        if(errCode==SQLITE_CONSTRAINT_UNIQUE){
             printf(" 유니크에러\n");
             sqlite3_reset(stmt);//실패상태 다시초기화
            //여기서 suffix붙여서 (2) 같은거 재시도 최대숫자조회후
           int maxnum= getUsedNumbers(file.filename,file.parentid);
           //최대숫자넣기
           
           std::string newfilename=file.filename + " ("+ std::to_string(maxnum)+")";
           sqlite3_bind_text(stmt,3,newfilename.c_str(),-1,SQLITE_TRANSIENT);
              printf("재시도네임:%s\n",newfilename.c_str());
           //재시도sqlite3_reset(stmt);
           int retryResult=sqlite3_step(stmt);
           //재시도후 reset
           sqlite3_reset(stmt);
             sqlite3_clear_bindings(stmt);
           if(retryResult==SQLITE_DONE){
            //성공시 다음파일
             printf(" 인설트재시도성공\n");
            continue;
           }else{
            //재시도실패
             printf(" 인설트재시도실패\n");
            allSuccess=false;
              //ROLLBACK
        printf(" 트랜잭션롤백\n");
        sqlite3_exec(db_,"ROLLBACK",nullptr,nullptr,nullptr);
        sqlite3_finalize(stmt);
            return false;
           }
        }else{
             printf(" 유니크아닌다른이유실패\n");
            allSuccess=false;
              //ROLLBACK
        printf(" 트랜잭션롤백\n");
        sqlite3_exec(db_,"ROLLBACK",nullptr,nullptr,nullptr);
        return false;
        }
        
    }
    sqlite3_reset(stmt); //sql다시 처음부터 실행가능하게리셋
    sqlite3_clear_bindings(stmt); //?물음표바인딩갑모두 삭제정리

    }//for문 끝
    sqlite3_finalize(stmt); //컴파일된 sqllite3내부 메모리 완전해제 
    //트랜잭션종료
    
        //commit
        printf(" 트랜잭션커밋\n");
        sqlite3_exec(db_,"COMMIT",nullptr,nullptr,nullptr);

    
      
    
    return allSuccess;
}
    // DB 연결 닫기
void SQLiteCRUD::close() {
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;  // null로 만들어서 중복 close 방지
    }
}


