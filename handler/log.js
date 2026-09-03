//메인 프로세스용 로그. 종류를 둘로 나눈다.
//
//배포판(포장된 앱)에는 콘솔이 붙어있지 않다. 터미널에서 띄운게 아니라 아이콘을 눌러
//실행되므로 console.log가 갈 곳이 아예 없다. 그런데 인자를 만드는 비용
//(`${}` 문자열 조립, 객체 직렬화)은 콘솔이 있든 없든 그대로 든다.
//예전엔 createFile이 파일 하나마다 8줄을 찍었는데, 5만개를 가져오면 아무도 못 볼
//40만줄을 만드느라 시간을 쓰고 있었다.
//
//→ debug: 개발중에만 필요한 진행상황. 배포판에선 통째로 끈다.
//→ logerror: 문제 신호. 배포판에서도 error.log에 남긴다.
//   여기가 핵심이다 - 예전엔 이것들도 전부 console.log라서, 사용자가
//   "폴더를 가져왔는데 몇개가 안들어왔다"고 해도 확인할 단서가 하나도 없었다.
import { app } from 'electron';
import { write } from './crashhandler.js';

//포장된 앱을 디버깅해야 할 때가 있다(사용자 PC에서만 재현되는 문제).
//그때는 --verbose를 붙여 명령줄로 띄우면 개발중과 똑같이 다 보인다
const verbose = !app.isPackaged || process.argv.includes('--verbose');

export function debug(...args) {
    if (verbose) console.log(...args);
}

//한 번 잘못되면 같은 실패가 폴더 수천개에서 연달아 날 수 있다(권한없는 트리 등).
//그때마다 동기 파일쓰기를 하면 그게 더 큰 문제가 되므로 상한을 둔다.
//상한을 넘겨도 앱은 그대로 돌아가고, 로그만 더 안 쌓인다
const MAXERRORS = 200;
let errorcount = 0;

//message: 무슨 상황인지 (예: "폴더처리실패, 건너뜀: D:\\사진")
//error: Error 객체나 문자열. 없으면 생략 가능
export function logerror(message, error) {
    if (verbose) console.log(message, error?.message ?? error ?? '');

    if (errorcount >= MAXERRORS) return;
    errorcount++;
    //상한에 닿는 순간 한 줄 남겨준다. 안그러면 "로그가 왜 여기서 끊겼지"가 된다
    if (errorcount === MAXERRORS) {
        write('log', { stack: `오류기록 ${MAXERRORS}건 도달 - 이후 생략함` });
        return;
    }

    //원래 터진 자리의 stack을 그대로 넘긴다. 여기서 new Error를 만들면 stack이
    //이 함수 자신(log.js)을 가리켜서, 정작 알아야 할 "어느 파일 몇번째줄"을 잃는다.
    //crashhandler의 write는 stack이 있으면 그걸 쓰고 없으면 String()으로 떨어뜨린다
    write('log', error?.stack
        ? { stack: `${message}\n${error.stack}` }
        : { stack: `${message} ${error ?? ''}`.trim() });
}
