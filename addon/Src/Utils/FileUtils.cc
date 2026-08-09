#include "FileUtils.h"
#include <algorithm>
#include <cctype>



std::string FileUtils::GetFileType(const std::string& filePath) {
    size_t lastSlash = filePath.find_last_of("/\\");
    std::string name = (lastSlash == std::string::npos) 
                       ? filePath 
                       : filePath.substr(lastSlash + 1);

    size_t dotPos = name.find_last_of('.');
    if (dotPos == std::string::npos) {
        return "unknown";
    }

    std::string ext = name.substr(dotPos + 1);
    std::transform(ext.begin(), ext.end(), ext.begin(),
                   [](unsigned char c){ return std::tolower(c); });

    if (ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "gif") return "image";
    if (ext == "mp4" || ext == "mkv" || ext == "avi") return "video";
    if (ext == "mp3" || ext == "wav" || ext == "flac") return "audio";
    if (ext == "txt" || ext == "md" || ext == "log") return "text";
    if (ext == "zip" || ext == "rar" || ext == "7z") return "archive";
    
    return "file";
}

