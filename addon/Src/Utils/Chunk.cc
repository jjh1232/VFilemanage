#include "Chunk.h"
#include <algorithm> 
//uint32는 int 플랫폼마다 달라질수있어서쓴다함       //함수주소저장소 ,index는 uint32변수하나받음
void Chunk::processInChunks(uint32_t total,void (*callback)(uint32_t index)){
    const uint32_t chunksize=10;
    for (uint32_t start=0;start<total;start +=chunksize){
        //마지막에 25번까진데 19번이면 크래쉬가 난다,없는번호더더돌아서end값정해야함
        uint32_t end=std::min(start+chunksize,total);
        for(uint32_t i=start;i<end;i++){
            {
                callback(i);//필요한함수호출
            }
        }
    }
}