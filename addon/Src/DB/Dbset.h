#pragma once //중복포함금지
#include <string>
#include <vector>
#include <sqlite3.h> // sqlite3* 타입, sqlite3_open() 등
struct FileInfo { //넣을 스트럭쳐로 변수ㅕㅍㄴ하게
    int parentid;
    std::string realfilename;
    std::string filename;
    std::string type;
    std::string realpath;
    double size =0;
    int isori;
};

class SQLiteCRUD{
    public :

        SQLiteCRUD();                    
         ~SQLiteCRUD();                   
            bool open(const std::string& dbPath);
        bool insertFiles(const std::vector<FileInfo>& files);
       // std::vector<FileInfo> getFilesByParent(int parentId);
       int getUsedNumbers(const std::string& basename,int parentid);
         void close();

         private:
             sqlite3* db_ = nullptr;
};

