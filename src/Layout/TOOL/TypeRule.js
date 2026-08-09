
//저장딱히필요없네
export const FILEGROUP={
image: ["jpg", "png", "gif", "webp"],
  text: ["txt", "md", "log"],
  audio: ["mp3", "wav"],
  video: ["mp4", "mkv","wmv"],
  pdf: ["pdf"],
  zip: ["zip"],
  folder:["folder"],
  background:["background"]
} 

export function getFileType(ext){
    const lower=ext.toLowerCase();
    //of하나씩꺼냄
    for (const [type,exts] of Object.entries(FILEGROUP)){
        if(exts.includes(lower)){
            return type;
        }
    }
    //저기 없을시
    return "notype"
}
//아이콘
export function getIcon(ext){
     const type = getFileType(ext);
  const ICON_MAP = {
    image: "IconImage",
    text:  "IconText",
    audio: "IconAudio",
    video: "IconVideo",
    pdf:   "IconPDF",
    zip:   "IconZip",
    file:  "IconFile",
  };

  return ICON_MAP[type] || "IconFile";
}