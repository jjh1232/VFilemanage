export const VerylargeIcon = ({ size = 20, color = '#666' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-image-icon lucide-image"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

export const LargeIcon = ({ size = 20, color = '#666' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-file-image-icon lucide-file-image"
  >
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
    <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
    <circle cx="10" cy="12" r="2"/>
    <path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/>
  </svg>
);

export const DefaultIcon = ({ size = 20, color = '#666' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-images-icon lucide-images"
  >
    <path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"/>
    <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/>
    <circle cx="13" cy="7" r="1" fill="currentColor"/>
    <rect x="8" y="2" width="14" height="14" rx="2"/>
  </svg>
);

export const SmallIcon = ({ size = 20, color = '#666' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-layout-list-icon lucide-layout-list"
  >
    <rect width="7" height="7" x="3" y="3" rx="1"/>
    <rect width="7" height="7" x="3" y="14" rx="1"/>
    <path d="M14 4h7"/>
    <path d="M14 9h7"/>
    <path d="M14 15h7"/>
    <path d="M14 20h7"/>
  </svg>
);

export const Listicon = ({ size = 20, color = '#666' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-list-icon lucide-list"
  >
    <path d="M3 5h.01"/>
    <path d="M3 12h.01"/>
    <path d="M3 19h.01"/>
    <path d="M8 5h13"/>
    <path d="M8 12h13"/>
    <path d="M8 19h13"/>
  </svg>
);
export const Sunicon = ({ size = 20, color = '#d31c1c' }) => (
<svg xmlns="http://www.w3.org/2000/svg" 
width={size} 
height={size}
 viewBox="0 0 24 24"
  fill="none"
   stroke={color} 
    strokeWidth="2"
     strokeLinecap="round" 
     strokeLinejoin="round"
     className="lucide lucide-sun-icon lucide-sun">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/>
        <path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/><path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/>
        <path d="m19.07 4.93-1.41 1.41"/>
        </svg>
)
export const Moonicon = ({ size = 20, color = '#666' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>
)
//====== 파일타입 아이콘 (목록/트리에서 파일 종류 표시용) ======
//예전엔 손그림 PNG였는데, 14px~110px까지 안깨지고 테마색을 따라가게 SVG로 바꿈

export const FiletypeFolder=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>
);

export const FiletypeImage=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

export const FiletypeVideo=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/>
    <rect x="2" y="6" width="14" height="12" rx="2"/>
  </svg>
);

export const FiletypeFile=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
  </svg>
);

//정렬 아이콘들. 그냥 화살표보다 "짧은쪽→긴쪽" 막대가 같이 있어야
//오름/내림이 직관적으로 읽힘(Lucide의 표준 정렬 아이콘 모양)
export const SortIcon=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 16-4 4-4-4"/><path d="M17 20V4"/>
    <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>
  </svg>
);
export const SortAscIcon=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>
    <path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/>
  </svg>
);
export const SortDescIcon=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/>
    <path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>
  </svg>
);

//설정(톱니바퀴)
export const Settingicon=({size=20,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

//파일인풋아이콘
export const Fileicon=({size=30,color='#666'})=>(
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-plus-corner-icon lucide-file-plus-corner"><path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M14 19h6"/><path d="M17 16v6"/></svg>

)
export const Foldericon=({ size = 30, color = '#666' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-folder-plus"
  >
    {/* 세로선 */}
    <path d="M12 10v6" />
    {/* 가로선 */}
    <path d="M9 13h6" />
    {/* 폴더 외곽선 */}
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);
