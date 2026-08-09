import { useState } from "react";
import styled from "styled-components";
import { useLanguage } from "../../Tools/LanguageProvider";

const Screen = styled.div`
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    z-index: 5000;
`;
const Panel = styled.div`
    width: min(320px, 84vw);
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 26px 22px;
    border: 1px solid ${props => props.theme.line};
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.22);
`;
const Title = styled.div`
    font-size: 16px;
    font-weight: 700;
    text-align: center;
`;
const Prompt = styled.div`
    font-size: 12px;
    opacity: 0.65;
    text-align: center;
    margin-bottom: 4px;
`;
const Input = styled.input`
    padding: 9px 11px;
    border-radius: 7px;
    border: 1px solid ${props => props.theme.line};
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    font-size: 14px;

    &:focus {
        outline: none;
        border-color: ${props => props.theme.accent};
    }
`;
const Button = styled.button`
    padding: 9px 12px;
    border: none;
    border-radius: 7px;
    background: ${props => props.theme.accent};
    color: #fff;
    font-size: 13px;
    cursor: pointer;

    &:hover { filter: brightness(0.92); }
`;
const Linkbutton = styled.button`
    background: none;
    border: none;
    color: ${props => props.theme.accent};
    font-size: 12px;
    cursor: pointer;
    padding: 2px;

    &:hover { text-decoration: underline; }
`;
const Message = styled.div`
    font-size: 12px;
    min-height: 16px;
    text-align: center;
    color: ${props => props.$error ? '#e05555' : props.theme.text};
    opacity: ${props => props.$error ? 1 : 0.7};
`;

//앱 전체를 덮는 잠금 화면. 여기가 열려야 Body가 렌더되므로 데이터 조회도 안 일어남
export default function Lockscreen({ hint, onUnlock }) {
    const { t } = useLanguage();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showhint, setShowhint] = useState(false);

    const submit = async () => {
        //검증은 메인 프로세스에서만 함(해시가 화면으로 넘어오지 않음)
        const ok = await window.nodeapi.lock.verify(password);
        if (ok) { onUnlock(); return; }
        setError(t("lock_wrong"));
        setPassword("");
    };

    return (
        <Screen>
            <Panel>
                <Title>🔒 {t("lock_title")}</Title>
                <Prompt>{t("lock_prompt")}</Prompt>

                <Input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                />
                <Button onClick={submit}>{t("lock_unlock")}</Button>

                <Message $error={!!error}>
                    {error || (showhint ? (hint || t("lock_nohint")) : "")}
                </Message>

                <Linkbutton onClick={() => setShowhint(true)}>{t("lock_showhint")}</Linkbutton>
            </Panel>
        </Screen>
    );
}
