import { useEffect, useRef } from "react";

//F2(이름바꾸기) 단축키.
//단축키는 특정 div에 붙이면 그 안을 클릭해 포커스를 준 상태에서만 먹어서, 창 전체(document)에서 받음.
//대신 메인뷰와 파일트리가 선택상태를 각자 들고있으므로,
//지금 활성인 패널 하나만 반응하도록 active로 가름(안그러면 둘이 동시에 반응함).
export function useRenameShortcut({ active, selectitems, renamingid, onRenameStart }) {
    //값이 바뀔때마다 리스너를 떼었다 붙이면 낭비라, 최신값은 ref로만 읽고 리스너는 고정
    const latest = useRef(null);
    latest.current = { selectitems, renamingid, onRenameStart };

    useEffect(() => {
        if (!active) return;

        const onkey = (e) => {
            if (e.key !== 'F2') return;
            const { selectitems, renamingid, onRenameStart } = latest.current;

            //이미 고치는 중이면 무시(입력창 안에서 F2를 눌러도 새로 시작되면 안됨)
            if (renamingid !== null && renamingid !== undefined) return;
            //검색창 등 다른 입력칸에 타이핑중이면 그쪽 몫
            const tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            //한번에 하나만 고칠수있음
            if (!selectitems || selectitems.size !== 1) return;

            const [targetid] = Array.from(selectitems);
            //루트(id=0)는 이름을 바꿀 대상이 아님(트리 최상단 행)
            if (targetid === 0) return;

            onRenameStart && onRenameStart(targetid);
        };

        document.addEventListener('keydown', onkey);
        return () => document.removeEventListener('keydown', onkey);
    }, [active]);
}
