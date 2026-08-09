import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Tools/LanguageProvider";

const Box = styled.div`
    position: relative;
    display: block;
    width: 100%;
    min-width: 0;
`;
const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 1px 4px;
    font-size: inherit;
    font-family: inherit;
    color: ${props => props.theme.text};
    background: ${props => props.theme.back};
    border: 1px solid ${props => props.$error ? '#e05555' : props.theme.accent};
    border-radius: 3px;
    outline: none;
`;
//입력창 아래 겹쳐 띄움. 칸 크기를 밀지 않게 absolute
const Error = styled.div`
    position: absolute;
    top: calc(100% + 3px);
    left: 0;
    z-index: 300;
    padding: 3px 6px;
    font-size: 11px;
    white-space: nowrap;
    color: #fff;
    background: #e05555;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
`;

//파일명 자리에서 바로 고치는 입력창(윈도우 F2 방식).
//같은 이름이 있으면 저장하지 않고 안내만 띄운 채 입력창을 유지함
export default function Renameinput({ item, onDone }) {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const inputref = useRef(null);
    const [value, setValue] = useState(item.filename || "");
    const [error, setError] = useState("");
    //blur로도 저장하는데, Enter로 저장한 뒤 blur가 또 오면 두번 저장됨
    const donref = useRef(false);

    useEffect(() => {
        const el = inputref.current;
        if (!el) return;
        el.focus();
        //확장자를 뺀 앞부분만 선택. 확장자를 실수로 지우는걸 막아줌(윈도우도 이렇게 함)
        const name = item.filename || "";
        const dot = name.lastIndexOf('.');
        const end = (item.type === 'folder' || dot <= 0) ? name.length : dot;
        el.setSelectionRange(0, end);
    }, [item.filename, item.type]);

    const commit = async () => {
        if (donref.current) return;

        //안바뀌었으면 저장할 것도 없음
        if (value.trim() === (item.filename || "")) { donref.current = true; onDone(); return; }

        const result = await window.nodeapi.db.renameFile({ id: item.id, filename: value });
        if (!result || result.success === false) {
            //실패하면 닫지 않고 그대로 두어 다시 고치게 함
            setError(t(result?.code || 'rename_empty'));
            inputref.current?.focus();
            return;
        }
        donref.current = true;
        await queryClient.invalidateQueries({ queryKey: ['filedata'] });
        onDone();
    };

    const cancel = () => { donref.current = true; onDone(); };

    return (
        //이 입력창을 누를때 항목선택/폴더진입/드래그가 같이 발동되면 안됨
        <Box
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            draggable={false}
            onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <Input
                ref={inputref}
                $error={!!error}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(""); }}
                onKeyDown={(e) => {
                    //위쪽에서 F2나 다른 단축키가 반응하지 않게
                    e.stopPropagation();
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') cancel();
                }}
                onBlur={commit}
            />
            {error && <Error>{error}</Error>}
        </Box>
    );
}
