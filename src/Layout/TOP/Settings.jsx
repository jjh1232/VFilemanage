import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLanguage } from "../../Tools/LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

//Coverpicker와 같은 모달 구조(어두운 배경 + 가운데 패널)
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
    width: min(420px, 88vw);
    max-height: 84vh;
    overflow-y: auto;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    border: 1px solid ${props => props.theme.line};
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
`;
const Head = styled.div`
    padding: 13px 16px;
    font-size: 15px;
    font-weight: 700;
    border-bottom: 1px solid ${props => props.theme.line}55;
`;
const Section = styled.div`
    padding: 14px 16px;

    & + & { border-top: 1px solid ${props => props.theme.line}33; }
`;
const Label = styled.div`
    font-size: 12px;
    font-weight: 600;
    opacity: 0.6;
    margin-bottom: 8px;
`;
const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;
const Toggle = styled.button`
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid ${props => props.$on ? 'transparent' : props.theme.line};
    background: ${props => props.$on ? props.theme.accent : 'transparent'};
    color: ${props => props.$on ? '#fff' : props.theme.text};
`;
const Input = styled.input`
    width: 100%;
    padding: 7px 10px;
    margin-bottom: 6px;
    border-radius: 6px;
    border: 1px solid ${props => props.theme.line};
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    font-size: 13px;
    box-sizing: border-box;

    &:focus { outline: none; border-color: ${props => props.theme.accent}; }
`;
const Button = styled.button`
    padding: 7px 13px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid ${props => props.$primary ? 'transparent' : props.theme.line};
    background: ${props => props.$primary ? props.theme.accent : 'transparent'};
    color: ${props => props.$primary ? '#fff' : props.theme.text};

    &:hover { filter: brightness(0.92); }
`;
const Status = styled.div`
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 8px;
`;
const Message = styled.div`
    font-size: 12px;
    margin-top: 6px;
    min-height: 15px;
    color: ${props => props.$error ? '#e05555' : props.theme.accent};
`;
const Warning = styled.div`
    font-size: 11px;
    opacity: 0.55;
    margin-top: 8px;
    line-height: 1.5;
`;
const Foot = styled.div`
    display: flex;
    justify-content: flex-end;
    padding: 11px 16px;
    border-top: 1px solid ${props => props.theme.line}55;
`;

export default function Settings({ isdarkmode, darkmodehandler, onClose }) {
    const { t } = useLanguage();

    //잠금 상태(여부와 힌트만 옴. 해시는 메인 프로세스 밖으로 안나감)
    const [haslock, setHaslock] = useState(false);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [repeat, setRepeat] = useState("");
    const [hint, setHint] = useState("");
    const [msg, setMsg] = useState({ text: "", error: false });

    const reload = async () => {
        const status = await window.nodeapi.lock.status();
        setHaslock(status.has);
        setHint(status.hint || "");
    };
    useEffect(() => { reload(); }, []);

    const clearinputs = () => { setCurrent(""); setNext(""); setRepeat(""); };

    const save = async () => {
        if (next !== repeat) { setMsg({ text: t("lock_mismatch"), error: true }); return; }
        if (!next) { setMsg({ text: t("lock_empty"), error: true }); return; }

        const result = await window.nodeapi.lock.set({ current, next, hint });
        if (!result.success) {
            //백엔드는 언어를 모르니 code로 번역
            setMsg({ text: t(result.code), error: true });
            return;
        }
        clearinputs();
        setMsg({ text: t("lock_saved"), error: false });
        reload();
    };

    const remove = async () => {
        const result = await window.nodeapi.lock.clear({ current });
        if (!result.success) {
            setMsg({ text: t(result.code), error: true });
            return;
        }
        clearinputs();
        setHint("");
        setMsg({ text: t("lock_removed"), error: false });
        reload();
    };

    return (
        <Dim onMouseDown={onClose}>
            {/* 안쪽 클릭으로 닫히지 않게 */}
            <Panel onMouseDown={(e) => e.stopPropagation()}>
                <Head>{t("settings")}</Head>

                <Section>
                    <Label>{t("settings_language")}</Label>
                    <LanguageSwitcher />
                </Section>

                <Section>
                    <Label>{t("settings_display")}</Label>
                    <Row>
                        <Toggle $on={!isdarkmode} onClick={() => { if (isdarkmode) darkmodehandler(); }}>
                            ☀ {t("lightmode")}
                        </Toggle>
                        <Toggle $on={isdarkmode} onClick={() => { if (!isdarkmode) darkmodehandler(); }}>
                            🌙 {t("darkmode")}
                        </Toggle>
                    </Row>
                </Section>

                <Section>
                    <Label>{t("settings_lock")}</Label>
                    <Status>{haslock ? t("lock_on") : t("lock_off")}</Status>

                    {/* 이미 걸려있으면 현재 비밀번호를 알아야 바꾸거나 풀 수 있음 */}
                    {haslock &&
                        <Input type="password" placeholder={t("lock_current")}
                            value={current} onChange={(e) => { setCurrent(e.target.value); setMsg({ text: "", error: false }); }} />
                    }
                    <Input type="password" placeholder={t("lock_new")}
                        value={next} onChange={(e) => { setNext(e.target.value); setMsg({ text: "", error: false }); }} />
                    <Input type="password" placeholder={t("lock_repeat")}
                        value={repeat} onChange={(e) => { setRepeat(e.target.value); setMsg({ text: "", error: false }); }} />
                    <Input type="text" placeholder={t("lock_hint")}
                        value={hint} onChange={(e) => setHint(e.target.value)} />

                    <Row>
                        <Button $primary onClick={save}>{haslock ? t("lock_change") : t("lock_set")}</Button>
                        {haslock && <Button onClick={remove}>{t("lock_remove")}</Button>}
                    </Row>

                    <Message $error={msg.error}>{msg.text}</Message>
                    <Warning>{t("lock_warning")}</Warning>
                </Section>

                <Foot>
                    <Button onClick={onClose}>{t("close")}</Button>
                </Foot>
            </Panel>
        </Dim>
    );
}
