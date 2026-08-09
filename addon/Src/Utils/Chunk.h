#pragma once
#include <cstdint>

class Chunk {
public:
    static void processInChunks(uint32_t total, 
                               void (*callback)(uint32_t index));
    // 👈 함수 포인터로 단순화!
};