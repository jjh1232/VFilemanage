import { useEffect, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { thumbUrl } from "../../Tools/Thumbnail";
import { useLanguage } from "../../Tools/LanguageProvider";

const MAXPICK = 4;

const Dim = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
`;
const Panel = styled.div`
    width: min(560px, 86vw);
    max-height: 80vh;
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
    padding: 12px 14px;
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid ${props => props.theme.line}55;
`;
const Hint = styled.div`
    font-size: 12px;
    font-weight: 400;
    opacity: 0.65;
    margin-top: 3px;
`;
const Grid = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
`;
const Cell = styled.div`
    position: relative;
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    cursor: ${props => props.$disabled ? 'default' : 'pointer'};
    outline: 2px solid ${props => props.$picked ? props.theme.accent : 'transparent'};
    outline-offset: -2px;
    opacity: ${props => props.$disabled ? 0.35 : 1};

    &:hover {
        outline-color: ${props => props.$disabled ? 'transparent' : `${props.theme.accent}88`};
    }
`;
const Cellimg = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;
//고른 순서를 보여주는 번호. 이게 있어야 "몇번째로 놓일지"가 바로 보임
const Order = styled.div`
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.accent};
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
`;
const Empty = styled.div`
    padding: 40px 14px;
    text-align: center;
    font-size: 13px;
    opacity: 0.6;
`;
const Foot = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-top: 1px solid ${props => props.theme.line}55;
`;
const Count = styled.div`
    margin-right: auto;
    font-size: 12px;
    opacity: 0.7;
`;
const Button = styled.button`
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid ${props => props.$primary ? 'transparent' : props.theme.line};
    background: ${props => props.$primary ? props.theme.accent : 'transparent'};
    color: ${props => props.$primary ? '#fff' : props.theme.text};

    &:hover { filter: brightness(0.92); }
`;

//폴더 안의 사진을 눌러 1,2,3,4 순서를 매기는 창.
//목록은 기존 readfiles를 그대로 쓰고 썸네일이 있는 것만 거름(새 DB 함수 불필요)
export default function Coverpicker({ folderid, initial, onCancel, onConfirm }) {
    const { t } = useLanguage();
    const [picked, setPicked] = useState(initial || []);

    //폴더가 바뀌어 다시 열릴때 이전 선택이 남지 않게
    useEffect(() => { setPicked(initial || []); }, [folderid, initial]);

    const { data: files } = useQuery({
        queryKey: ["coverpicker", folderid],
        queryFn: () => window.nodeapi.db.readfiles({ parentid: folderid, folderFirst: false }),
        enabled: folderid !== undefined && folderid !== null,
    });

    //썸네일이 있는 것만 표지 후보(폴더나 아직 안만들어진 파일은 제외)
    const candidates = (files || []).filter(f => f.thumbversion && f.type !== 'folder');

    const toggle = (id) => {
        setPicked(prev => {
            //이미 고른걸 다시 누르면 빼고, 뒷번호는 자연히 당겨짐
            if (prev.includes(id)) return prev.filter(v => v !== id);
            if (prev.length >= MAXPICK) return prev;
            return [...prev, id];
        });
    };

    return (
        <Dim onMouseDown={onCancel}>
            {/* 안쪽을 눌렀을때 닫히지 않게 */}
            <Panel onMouseDown={(e) => e.stopPropagation()}>
                <Head>
                    {t("cover_title")}
                    <Hint>{t("cover_hint")}</Hint>
                </Head>

                {candidates.length === 0
                    ? <Empty>{t("cover_empty")}</Empty>
                    : <Grid>
                        {candidates.map(file => {
                            const order = picked.indexOf(file.id);
                            const ispicked = order >= 0;
                            //꽉 찼는데 안 고른 것들은 못 누르게
                            const disabled = !ispicked && picked.length >= MAXPICK;
                            return (
                                <Cell key={file.id}
                                    $picked={ispicked}
                                    $disabled={disabled}
                                    title={file.filename}
                                    onClick={() => { if (!disabled) toggle(file.id); }}
                                >
                                    <Cellimg src={thumbUrl(file.id, file.thumbversion)} alt="" />
                                    {ispicked && <Order>{order + 1}</Order>}
                                </Cell>
                            );
                        })}
                      </Grid>
                }

                <Foot>
                    <Count>{picked.length} / {MAXPICK} {t("cover_selected")}</Count>
                    {/* 비운 채로 확인하면 표지가 아예 없는 폴더가 됨(자동선택으로 돌아가지 않음) */}
                    <Button onClick={() => setPicked([])}>{t("cover_clear")}</Button>
                    <Button onClick={onCancel}>{t("cancel")}</Button>
                    <Button $primary onClick={() => onConfirm(picked)}>{t("confirm")}</Button>
                </Foot>
            </Panel>
        </Dim>
    );
}
