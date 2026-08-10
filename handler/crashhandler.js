//로그 폴더가 userData 밑이라 앱이름이 먼저 정해져있어야 한다
import '../appname.js';
import { app, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';

//배포판은 개발자도구가 안열려서, 예외가 나면 사용자도 나도 아무것도 못본다.
//창이 그냥 사라지고 "갑자기 꺼졌어요"라는 제보만 남는다.
//그래서 (1)파일에 남기고 (2)사용자에게 알려서 그 파일을 보내줄수 있게 한다.
//
//storehandler/passwordhandler처럼 "import되면 바로 등록"되는 방식이라
//main.js가 require만 하면 되고 따로 호출할 필요없다

const logdir = path.join(app.getPath('userData'), 'logs');
const logfile = path.join(logdir, 'error.log');

function write(kind, error) {
    try {
        fs.mkdirSync(logdir, { recursive: true });
        const when = new Date().toISOString();
        //stack이 있으면 그게 훨씬 유용함(어느 파일 몇번째줄인지 나옴).
        //문자열이나 객체가 던져진 경우엔 stack이 없어서 그대로 찍음
        const body = error?.stack || String(error);
        fs.appendFileSync(logfile, `\n[${when}] ${kind}\n${body}\n`, 'utf8');
    } catch {
        //로그 남기다 또 터지면 할수있는게 없다. 여기서 예외를 올리면
        //uncaughtException 핸들러가 다시 불려서 무한루프가 됨
    }
}

//append라 계속 쌓이므로 켤때 한번 잘라준다. 1MB 넘으면 뒤쪽 절반만 남김
//(앞쪽은 오래된 기록이라 버려도 됨)
function trim() {
    try {
        if (!fs.existsSync(logfile)) return;
        const { size } = fs.statSync(logfile);
        if (size < 1024 * 1024) return;
        const text = fs.readFileSync(logfile, 'utf8');
        fs.writeFileSync(logfile, text.slice(Math.floor(text.length / 2)), 'utf8');
    } catch { }
}
trim();

//같은 에러가 연속으로 터질때 알림창이 수십개 쌓이는걸 막는다.
//기록(write)은 매번 남기고 알림만 묶는것 - 원인 파악에 필요한건 기록쪽이라
let notified = false;
function notify(message) {
    if (notified) return;
    notified = true;

    //showMessageBoxSync는 창이 아직 없어도(초기화중 터진 경우) 뜬다
    const choice = dialog.showMessageBoxSync({
        type: 'error',
        title: '예기치 못한 오류',
        message: '오류가 발생했습니다. 기록이 저장되었습니다.',
        detail: String(message || ''),
        buttons: ['로그 폴더 열기', '닫기'],
        defaultId: 1,
        cancelId: 1
    });
    if (choice === 0) shell.openPath(logdir);

    //10초뒤 다시 알릴수 있게 풀어준다(다른 원인의 에러는 봐야하니까)
    setTimeout(() => { notified = false; }, 10000);
}

//메인 프로세스에서 잡히지 않은 예외.
//이 핸들러가 없으면 프로세스가 그자리에서 죽어서 창이 통째로 사라진다
process.on('uncaughtException', (error) => {
    write('uncaughtException', error);
    notify(error?.message || String(error));
});

//await를 안붙였거나 catch를 안단 Promise 실패.
//DB호출이 전부 async라 여기 걸릴 가능성이 제일 높다
//(main.js의 db-* IPC 핸들러들이 에러를 그대로 throw하고 있음)
process.on('unhandledRejection', (reason) => {
    write('unhandledRejection', reason);
    notify(reason?.message || String(reason));
});

//화면(렌더러) 프로세스가 죽은 경우. 흰 화면만 남고 앱은 살아있어서 더 헷갈린다
app.on('render-process-gone', (event, contents, details) => {
    write('render-process-gone', new Error(`reason=${details.reason} exitCode=${details.exitCode}`));
    notify(`화면이 종료되었습니다 (${details.reason})`);
});

console.log("크래시핸들러등록, 로그위치:", logfile);
