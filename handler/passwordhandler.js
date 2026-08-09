import { ipcMain } from "electron";
import crypto from "crypto";
import store from "../setting.js";

//앱 잠금 비밀번호. 평문은 어디에도 저장하지 않고, 무작위 salt를 붙인 scrypt 해시만 남김.
//검증은 전부 여기(메인 프로세스)에서만 하고 해시는 화면쪽으로 절대 안 보냄.
//
//주의: 이건 암호화가 아니라 가림막임. filetree.db와 원본파일은 그대로 디스크에 있어서
//SQLite 도구로 열면 다 보임. "앱을 통한 접근"만 막는 용도.

const KEYLEN = 64;

function makehash(password, salt) {
    return crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
}

function getlock() {
    try { return store.get('user.lock') || null; }
    catch { return null; }
}

//시간차로 비밀번호를 유추하는걸 막기 위해 timingSafeEqual 사용.
//길이가 다르면 그 함수가 예외를 던져서 먼저 걸러줌
function verify(password, lock) {
    if (!lock || !lock.salt || !lock.hash) return false;
    try {
        const got = Buffer.from(makehash(password, lock.salt), 'hex');
        const want = Buffer.from(lock.hash, 'hex');
        if (got.length !== want.length) return false;
        return crypto.timingSafeEqual(got, want);
    } catch {
        return false;
    }
}

//storehandler.js와 같이 "import되면 바로 등록"되는 방식.
//main.js가 require만 하면 되고 따로 호출할 필요 없음
console.log("비밀번호핸들러등록");

//비밀번호가 걸려있는지 + 힌트만 알려줌(해시는 안 나감)
ipcMain.handle('password-status', () => {
    const lock = getlock();
    return { has: !!lock, hint: (lock && lock.hint) || '' };
});

ipcMain.handle('password-verify', (event, password) => {
    return verify(password, getlock());
});

//새로 설정하거나 변경. 이미 걸려있으면 현재 비밀번호를 먼저 확인해야 바꿀 수 있음
ipcMain.handle('password-set', (event, { current, next, hint } = {}) => {
    const lock = getlock();
    if (lock && !verify(current, lock)) {
        return { success: false, code: 'lock_wrong_current' };
    }
    if (!next || String(next).length === 0) {
        return { success: false, code: 'lock_empty' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    store.set('user.lock', {
        salt,
        hash: makehash(next, salt),
        hint: hint ? String(hint) : ''
    });
    return { success: true };
});

//해제도 현재 비밀번호를 알아야 가능
ipcMain.handle('password-clear', (event, { current } = {}) => {
    const lock = getlock();
    if (!lock) return { success: true };
    if (!verify(current, lock)) {
        return { success: false, code: 'lock_wrong_current' };
    }
    store.set('user.lock', null);
    return { success: true };
});
