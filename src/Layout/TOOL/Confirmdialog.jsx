import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useLanguage } from "../../Tools/LanguageProvider";

//생김새는 Coverpicker와 같은 계열(Dim+Panel+Foot)로 맞춤.
//창마다 따로 만들면 앱 안에서 확인창 모양이 제각각이 되어버림
const Dim = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
`;
const Panel = styled.div`
    width: min(420px, 86vw);
    display: flex;
    flex-direction: column;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    border: 1px solid ${props => props.theme.line};
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
    overflow: hidden;
`;
const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 14px 16px 0 16px;
    font-size: 14px;
    font-weight: 600;
`;
//경고 아이콘. 색만으로 구분하면 색약인 경우 구분이 안돼서 모양도 같이 씀
const Mark = styled.div`
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: ${props => props.$tone === 'danger' ? '#E5484D' : props.theme.accent};
`;
const Message = styled.div`
    padding: 10px 16px 0 16px;
    font-size: 13px;
    line-height: 1.55;
    /* 문구에 들어있는 줄바꿈(\\n)을 그대로 살림 */
    white-space: pre-line;
`;
//파일 경로처럼 "그대로 읽어야 하는 값". 본문과 섞이면 어디까지가 경로인지 안보여서 따로 담음
const Detail = styled.div`
    margin: 10px 16px 0 16px;
    padding: 8px 10px;
    border-radius: 6px;
    background: ${props => props.theme.line}22;
    border: 1px solid ${props => props.theme.line}44;
    font-size: 12px;
    font-family: Consolas, 'Courier New', monospace;
    line-height: 1.5;
    opacity: 0.85;
    /* 긴 경로가 창을 밀지 않게 */
    word-break: break-all;
`;
//되돌릴 수 없는 선택을 한칸 더 눌러야 켜지게 하는 자리(예: 내보낼때 원본 지우기)
const Checkrow = styled.label`
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 12px 16px 0 16px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
`;
//체크했을때만 뜨는 경고. 평소엔 안보여서 창이 겁주지 않음
const Warn = styled.div`
    margin: 8px 16px 0 16px;
    padding: 7px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    line-height: 1.5;
    white-space: pre-line;
    color: #E5484D;
    background: #E5484D18;
    border: 1px solid #E5484D44;
`;
const Foot = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 16px;
`;
const Button = styled.button`
    padding: 7px 15px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid ${props => props.$primary ? 'transparent' : props.theme.line};
    background: ${props => props.$primary
        ? (props.$tone === 'danger' ? '#E5484D' : props.theme.accent)
        : 'transparent'};
    color: ${props => props.$primary ? '#fff' : props.theme.text};

    &:hover { filter: brightness(0.92); }
    /* 키보드로 옮겨다닐때 어디에 있는지 보이게 */
    &:focus-visible {
        outline: 2px solid ${props => props.theme.accent};
        outline-offset: 2px;
    }
`;

function Confirmdialog({ title, message, detail, confirmlabel, cancellabel, tone, alertonly, checkbox, onAnswer }) {
    const { t } = useLanguage();
    const cancelref = useRef(null);
    const okref = useRef(null);
    const [checked, setChecked] = useState(!!(checkbox && checkbox.defaultchecked));

    //체크를 켜면 되돌릴수 없는 작업이 되므로 그때부터 위험색으로 바뀜.
    //평소엔 평범한 창이라 겁주지 않고, 켠 순간 눈에 띄게 하는게 목적
    const activetone = (checkbox && checked) ? 'danger' : tone;

    //되돌릴수 없는 작업은 취소쪽에 포커스를 둠. 창이 뜬줄 모르고 Enter를 눌러도 지워지지 않게.
    //(알림창은 버튼이 하나뿐이라 그쪽으로)
    useEffect(() => {
        if (alertonly) okref.current?.focus();
        else cancelref.current?.focus();
    }, [alertonly]);

    //ESC는 취소. Enter/스페이스는 지금 포커스된 버튼이 알아서 받으므로 여기서 가로채지 않음
    //(가로채면 취소에 포커스가 있어도 Enter가 삭제로 가버림)
    useEffect(() => {
        const onkey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); onAnswer(false); }
        };
        window.addEventListener('keydown', onkey);
        return () => window.removeEventListener('keydown', onkey);
    }, [onAnswer]);

    return (
        <Dim onMouseDown={() => onAnswer(false)}>
            {/* 안쪽을 눌렀을때 닫히지 않게 */}
            <Panel onMouseDown={(e) => e.stopPropagation()}>
                {title &&
                    <Head>
                        <Mark $tone={activetone}>{activetone === 'danger' ? '!' : 'i'}</Mark>
                        {title}
                    </Head>
                }
                {message && <Message>{message}</Message>}
                {detail && <Detail>{detail}</Detail>}

                {checkbox &&
                    <Checkrow>
                        <input type="checkbox" checked={checked}
                            onChange={(e) => setChecked(e.target.checked)} />
                        {checkbox.label}
                    </Checkrow>
                }
                {checkbox && checked && checkbox.warning && <Warn>{checkbox.warning}</Warn>}

                <Foot>
                    {!alertonly &&
                        <Button ref={cancelref} onClick={() => onAnswer(false)}>
                            {cancellabel || t("cancel")}
                        </Button>
                    }
                    {/* 체크박스를 준 창만 답을 객체로 돌려줌. 기존 호출부들은 그대로 true/false를 받음 */}
                    <Button ref={okref} $primary $tone={activetone}
                        onClick={() => onAnswer(checkbox ? { checked } : true)}>
                        {confirmlabel || t("confirm")}
                    </Button>
                </Foot>
            </Panel>
        </Dim>
    );
}

const ConfirmContext = createContext();

//window.confirm/alert 대신 쓰는 앱 안쪽 확인창.
//기다렸다 답을 받아야 하는 곳(await)이 많아서 promise로 돌려줌
export function ConfirmProvider({ children }) {
    //지금 떠있는 창의 내용. null이면 닫힘
    const [dialog, setDialog] = useState(null);
    //그 창의 답을 돌려줄 resolve
    const resolveref = useRef(null);

    const confirm = useCallback((options) => {
        return new Promise(resolve => {
            //앞의 창이 아직 안닫혔으면 그건 취소로 매듭지어야 promise가 영영 안끝나는걸 막음
            if (resolveref.current) resolveref.current(false);
            resolveref.current = resolve;
            setDialog(options || {});
        });
    }, []);

    const answer = useCallback((result) => {
        setDialog(null);
        //먼저 비우고 부름. 답을 받은쪽이 곧바로 다음 창을 띄우는 경우가 있어서,
        //순서가 바뀌면 방금 넣은 resolve를 위 초기화가 지워버림
        const resolve = resolveref.current;
        resolveref.current = null;
        if (resolve) resolve(result);
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && <Confirmdialog {...dialog} onAnswer={answer} />}
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => useContext(ConfirmContext);
