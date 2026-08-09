//화면에 보여줄 값 다듬는 것들

//최상위 폴더(id 0)만 이름이 데이터가 아니라 화면용 문구임.
//DB엔 'Root'를 그대로 두고 보여줄때만 바꾸는 이유:
//1) 언어를 바꾸면 이름도 같이 따라감 (DB에 박아두면 한국어로 고정됨)
//2) 이미 만들어진 DB를 건드릴 필요가 없음 (INSERT OR IGNORE라 생성문만 고치면 기존 DB는 안바뀜)
//3) 'Root'가 내부 식별자로 남아서 코드에서 헷갈릴일이 없음
export function displayName(item, t) {
    if (!item) return '';
    return Number(item.id) === 0 ? t("root_name") : item.filename;
}

//바이트를 사람이 읽기 쉬운 단위로. 폴더는 크기가 의미없어서 빈칸으로 둠(윈도우탐색기도 그럼)
export function formatSize(bytes, type) {
    if (type === 'folder') return '';

    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    //1024씩 몇번 나눠지는지 = 단위 인덱스. 배열 밖으로 안나가게 상한을 둠
    const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
    const value = n / Math.pow(1024, i);

    //바이트는 소수점이 의미없고, 그 위로는 10 미만일때만 한자리(1.5 MB / 234 MB 처럼)
    const digits = i === 0 ? 0 : (value < 10 ? 1 : 0);
    return `${value.toFixed(digits)} ${units[i]}`;
}

//날짜를 "2026-08-07 17:30" 형태로. 초는 파일목록에서 볼 일이 없어서 뺌.
//DB의 date는 SQLite CURRENT_TIMESTAMP라 'YYYY-MM-DD HH:MM:SS' UTC 문자열임.
//T와 Z를 붙여줘야 브라우저가 UTC로 읽고 우리 시간대로 바꿔서 보여줌
export function formatDate(value) {
    if (!value) return '';

    const d = new Date(String(value).replace(' ', 'T') + 'Z');
    //예상 못한 형식이면 억지로 바꾸지 말고 원본을 그대로
    if (Number.isNaN(d.getTime())) return String(value);

    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
         + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
