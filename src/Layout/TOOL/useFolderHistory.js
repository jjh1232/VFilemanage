import { useState, useCallback } from "react";

//폴더이동 히스토리(뒤로가기/앞으로가기) 관리 훅
//스택+인덱스로만 관리해서 currentfolderid를 따로 저장 안함(파생값)
export function useFolderHistory(rootId = 0) {
    const [stack, setStack] = useState([rootId]);
    const [index, setIndex] = useState(0);

    const currentfolderid = stack[index];

    //새 폴더로 이동. 폴더 이동은 반드시 이 함수를 거쳐야 히스토리에 기록됨
    const navigate = useCallback((folderid) => {
        //지금 있는 폴더로 또 이동하려는거면 무시(같은게 두번 쌓여서 뒤로가기 두번눌러야하는거 방지)
        if (folderid === stack[index]) return;
        setStack(prev => [...prev.slice(0, index + 1), folderid]);
        setIndex(i => i + 1);
    }, [index, stack]);

    //뒤로가기: 인덱스만 이동, 스택엔 새로 안쌓음
    const goBack = useCallback(() => {
        setIndex(i => Math.max(0, i - 1));
    }, []);

    //앞으로가기
    const goForward = useCallback(() => {
        setIndex(i => Math.min(stack.length - 1, i + 1));
    }, [stack.length]);

    //히스토리 목록에서 특정 위치로 바로 점프(뒤로/앞으로 꾹눌러서 나오는 목록용).
    //스택은 안건드리고 인덱스만 옮기는거라 goBack/goForward와 성격이 같음
    const jumpTo = useCallback((target) => {
        setIndex(prev => (target >= 0 && target < stack.length) ? target : prev);
    }, [stack.length]);

    return {
        currentfolderid,
        navigate,
        goBack,
        goForward,
        canGoBack: index > 0,
        canGoForward: index < stack.length - 1,
        history: stack,
        historyIndex: index,
        jumpTo,
    };
}
