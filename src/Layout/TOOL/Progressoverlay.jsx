import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useLanguage } from "../../Tools/LanguageProvider";

//파일을 대량으로 가져올때의 진행 표시.
//
//진행중에는 화면 전체를 덮어 잠근다. 예전엔 구석에 작게 띄웠는데, 수십개를 넣으면
//첫 반응이 나올때까지 몇초씩 걸려서 먹통으로 보였고 실제로 앱을 강제로 끄는 일이 있었다
//(그사이 삽입은 계속 되고 있어서 껐다 켜면 들어와있는 상태).
//가져오는 동안 목록을 만지면 그 자체로 꼬일 수 있어서 막는게 맞기도 하다.
//
//%(진행률)는 일부러 안 쓴다. 몇개가 들어올지 알려면 넣기 전에 디스크를 통째로 한번
//더 훑어야 하는데, 그 값어치보다 "지금 뭔가 돌고있고 건드리면 안된다"를 알려주는게 중요하다.
//대신 처리한 개수는 올라가므로 멈춘게 아니라는건 보인다.
//
//끝나고 나서의 "완료"만 구석에 잠깐 띄운다 - 그건 굳이 화면을 막을 이유가 없다

const spin = keyframes`
    to { transform: rotate(360deg); }
`;
const fadein = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
const popin = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

//=== 진행중: 전체 화면 잠금 ===
const Dim = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.45);
    animation: ${fadein} 0.15s ease-out;
    /* 여기서 클릭을 다 받아내는게 목적이라 pointer-events는 기본값(auto) 그대로 */
`;
const Panel = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 26px;
    border-radius: 12px;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    border: 1px solid ${props => props.theme.line}55;
    box-shadow: 0 12px 32px rgba(0,0,0,0.3);
    font-size: 14px;
    font-weight: 600;
`;
const Spinner = styled.div`
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    border: 2px solid ${props => props.theme.line}55;
    border-top-color: ${props => props.theme.accent};
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

//=== 완료: 구석에 잠깐 ===
const Toast = styled.div`
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 10px;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    border: 1px solid ${props => props.theme.line}66;
    box-shadow: 0 8px 20px rgba(0,0,0,0.22);
    font-size: 13px;
    animation: ${popin} 0.18s ease-out;
    pointer-events: none;
`;
const Donemark = styled.div`
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.accent};
    font-weight: 700;
`;
//실패 안내는 성공알림과 헷갈리면 안되고, 읽을 문장이 길어서 폭을 더 준다
const Failtoast = styled(Toast)`
    max-width: 380px;
    align-items: flex-start;
    border-color: #e08a3c99;
`;
const Failmark = styled(Donemark)`
    color: #e08a3c;
    /* 글이 여러줄이라 첫줄에 맞춰 고정 */
    margin-top: 1px;
`;
const Failtext = styled.div`
    line-height: 1.5;
    b { font-weight: 600; }
    span { display: block; margin-top: 3px; opacity: 0.7; font-size: 12px; }
`;
const Count = styled.span`
    /* 숫자 폭을 고정해서 개수가 올라갈때 글자가 좌우로 흔들리지 않게 */
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    opacity: 0.7;
`;

export default function Progressoverlay() {
    const { t } = useLanguage();
    //null이면 아무것도 안 보임
    const [state, setState] = useState(null);
    //완료표시를 잠깐 보여준 뒤 지우는 타이머. 새 작업이 시작되면 취소해야 한다
    const hidetimer = useRef(null);

    useEffect(() => {
        const cleartimer = () => {
            if (hidetimer.current) {
                clearTimeout(hidetimer.current);
                hidetimer.current = null;
            }
        };

        //드롭 즉시(=경로추출 시작 전) 렌더러가 직접 켜는 신호.
        //메인의 insert-progress를 기다리면 그 사이 화면이 멈춰서 못 띄운다
        const onBegin = () => {
            cleartimer();
            setState({ count: 0, done: false, preparing: true, prepdone: 0, prepTotal: 0 });
        };

        //드롭은 됐는데 Chromium이 파일정보를 못 넘겨준 경우.
        //조용히 넘기면 "아무 반응 없음"으로 보여서 사용자가 앱을 강제로 끄게 된다
        const onFailed = () => {
            cleartimer();
            setState({ failed: true, done: true });
            //읽을 시간이 필요하니 완료알림(1.8초)보다 길게 둔다
            hidetimer.current = setTimeout(() => {
                setState(null);
                hidetimer.current = null;
            }, 6000);
        };
        //경로 뽑는 진행상황(아직 IPC 전 단계)
        const onPreparing = (e) => {
            const { done, total } = e.detail || {};
            setState(prev => (prev && prev.done) ? prev
                : { count: 0, done: false, preparing: true, prepdone: done, prepTotal: total });
        };
        //넣을게 없어서 IPC를 안 부르는 경우. 메인이 insert-done을 보낼 일이 없으니 직접 닫는다
        const onCancel = () => { cleartimer(); setState(null); };

        window.addEventListener('import-begin', onBegin);
        window.addEventListener('import-preparing', onPreparing);
        window.addEventListener('import-cancel', onCancel);
        window.addEventListener('import-failed', onFailed);

        const offProgress = window.nodeapi.onInsertProgress(({ count }) => {
            //이전 작업의 "완료" 표시가 사라지기 전에 새 작업이 시작될 수 있다.
            //타이머를 안 끄면 새 작업 도중에 표시가 통째로 사라진다
            cleartimer();
            //메인에서 신호가 오기 시작하면 준비단계는 끝난것
            setState({ count, done: false, preparing: false });
        });

        const offDone = window.nodeapi.onInsertDone(({ count, stopped }) => {
            cleartimer();

            //한도에 걸려 중간에 접은 경우. 넣다 만 상태라는걸 반드시 알려야 한다
            if (stopped) {
                setState({ count, done: true, stopped: true });
                hidetimer.current = setTimeout(() => {
                    setState(null);
                    hidetimer.current = null;
                }, 6000);//읽을 시간이 필요하니 길게
                return;
            }

            //0개로 끝난 경우(전부 필터에 걸렸거나 취소) 굳이 결과를 띄우지 않음
            if (!count) { setState(null); return; }

            setState({ count, done: true });
            hidetimer.current = setTimeout(() => {
                setState(null);
                hidetimer.current = null;
            }, 1800);
        });

        //컴포넌트가 사라질때 리스너와 타이머를 같이 정리.
        //안 걷으면 리스너가 쌓여서 같은 알림을 여러번 받는다
        return () => {
            offProgress();
            offDone();
            window.removeEventListener('import-begin', onBegin);
            window.removeEventListener('import-preparing', onPreparing);
            window.removeEventListener('import-cancel', onCancel);
            window.removeEventListener('import-failed', onFailed);
            cleartimer();
        };
    }, []);

    if (!state) return null;

    //한도 초과로 중간에 접음 → 넣다 만 상태라는걸 알려준다.
    //실패 토스트와 같은 모양을 쓰되 문구만 다르게
    if (state.stopped) {
        return (
            <Failtoast>
                <Failmark>!</Failmark>
                <Failtext>
                    <b>{t("import_stopped")}</b>
                    <span>
                        {t("import_stopped_hint")}
                        {' ('}{state.count.toLocaleString()}{')'}
                    </span>
                </Failtext>
            </Failtoast>
        );
    }

    //드롭 실패 → 왜 아무일도 안일어났는지 알려주고 대안을 안내
    if (state.failed) {
        return (
            <Failtoast>
                <Failmark>!</Failmark>
                <Failtext>
                    <b>{t("import_failed")}</b>
                    <span>{t("import_failed_hint")}</span>
                </Failtext>
            </Failtoast>
        );
    }

    //완료 → 구석에 잠깐
    if (state.done) {
        return (
            <Toast>
                <Donemark>✓</Donemark>
                <span>{t("import_done")}</span>
                <Count>{state.count.toLocaleString()}</Count>
            </Toast>
        );
    }

    //진행중 → 화면 전체 잠금.
    //준비단계(경로 뽑는중)와 삽입단계를 나눠 보여준다. 준비단계는 전체 개수를 알고있어서
    //"120 / 500"처럼 나오고, 삽입단계는 몇개가 들어올지 모르니 누적 개수만 올라간다
    const preparing = state.preparing && state.prepTotal > 0;

    return (
        <Dim>
            <Panel>
                <Spinner />
                <span>{preparing ? t("import_preparing") : t("import_working")}</span>
                {preparing
                    ? <Count>{state.prepdone.toLocaleString()} / {state.prepTotal.toLocaleString()}</Count>
                    : state.count > 0 && <Count>{state.count.toLocaleString()}</Count>}
            </Panel>
        </Dim>
    );
}
