import { FiletypeFolder, FiletypeImage, FiletypeVideo, FiletypeFile } from "./Iconbox";

//타입별 아이콘 "컴포넌트" 매핑.
//예전엔 손그림 PNG의 URL을 돌려줬는데, 크기별로 흐려지고 다크모드에서도 색이 안바뀌어서
//Iconbox의 다른 아이콘들처럼 SVG 컴포넌트로 통일함
const ICONMAP = {
    folder: FiletypeFolder,
    image: FiletypeImage,
    video: FiletypeVideo,
};

//매핑에 없는 타입(audio/archive/text/unknown 등)은 일반 파일아이콘
export function getFileIcon(type) {
    return ICONMAP[type] || FiletypeFile;
}
