import { useEffect } from "react";

//팝업/드롭다운을 바깥 클릭이나 ESC로 닫기.
//여러 팝업이 똑같은 코드를 반복해서 하나로 모음(필터, 파일추가, 히스토리목록, 열메뉴)
//
//주의: 이 훅은 document의 mousedown을 듣기 때문에 쓰는쪽에서 두가지를 챙겨야함
// 1) 팝업 본체에 onMouseDown={e=>e.stopPropagation()} - 안하면 안쪽 클릭에도 닫힘
// 2) 여는 버튼에도 onMouseDown={e=>e.stopPropagation()}
//    - 안하면 열린상태에서 버튼 클릭시 mousedown이 먼저 닫고 이어지는 onClick이 다시 열어서 영영 안닫힘
//onClose는 의존성에 들어가니 쓰는쪽에서 useCallback으로 고정할 것
export function useDismiss(isopen, onClose) {
    useEffect(() => {
        if (!isopen) return;

        const onmousedown = () => onClose();
        const onkey = (e) => { if (e.key === 'Escape') onClose(); };

        document.addEventListener('mousedown', onmousedown);
        document.addEventListener('keydown', onkey);
        return () => {
            document.removeEventListener('mousedown', onmousedown);
            document.removeEventListener('keydown', onkey);
        };
    }, [isopen, onClose]);
}
