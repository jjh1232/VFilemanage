import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { generateThumbnail, getMediaKind } from "./Thumbnail";

//썸네일이 없는 항목을 화면에 보일때 한번 만들어 DB에 저장하는 큐.
//상태를 모듈 수준에 두는 이유: 같은 파일이 메인뷰와 파일트리에 동시에 보여도
//생성은 딱 한번만 돌게 하려면 컴포넌트 바깥에서 공유해야함

const queue = [];              //만들 차례를 기다리는 것들
const handled = new Set();     //이미 처리했거나 처리중인 id(재시도 폭주 방지)
let running = 0;
const MAXRUNNING = 2;          //동시에 여러개 돌리면 화면이 버벅임

//한장 만들때마다 목록을 다시 불러오면 재조회가 폭주해서, 잠깐 모았다가 한번만 갱신
let refreshTimer = null;
function scheduleRefresh(queryClient) {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        queryClient.invalidateQueries({ queryKey: ['filedata'] });
    }, 600);
}

async function pump(queryClient) {
    if (running >= MAXRUNNING) return;

    const job = queue.shift();
    if (!job) return;

    running++;
    try {
        console.log("[썸네일] 생성시작", job.kind, job.realpath);
        const dataurl = await generateThumbnail(job.realpath, job.kind);
        if (dataurl) {
            await window.nodeapi.db.saveThumbnail({ fileid: job.id, thumbnail: dataurl });
            console.log("[썸네일] 저장완료 id:", job.id);
            scheduleRefresh(queryClient);
        } else {
            window.nodeapi.logerror(`[썸네일] 결과가 비어있음: ${job.realpath}`);
        }
    } catch (error) {
        //깨진 파일/권한 문제는 그냥 건너뜀. handled에 남아있어서 다시 시도하지 않음
        window.nodeapi.logerror(`[썸네일] 실패: ${job.realpath}`, error);
    } finally {
        running--;
        pump(queryClient);
    }
}

//화면에 뿌려진 목록을 받아, 썸네일이 없는 이미지/영상만 큐에 넣음
export function useThumbnailQueue(files) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!files || files.length === 0) return;

        let added = 0;
        for (const file of files) {
            if (file.thumbversion) continue;                    //이미 있음
            if (handled.has(file.id)) continue;                 //처리했거나 처리중

            //type이 아니라 확장자 기준(addon이 webp/mov 등을 'file'로 넣기 때문)
            const kind = getMediaKind(file);
            if (!kind) continue;

            handled.add(file.id);
            queue.push({ id: file.id, realpath: file.realpath, kind });
            added++;
        }
        if (added > 0) console.log(`[썸네일] ${added}개 대기열 추가`);

        //비어있는 자리만큼 시작
        for (let i = running; i < MAXRUNNING; i++) pump(queryClient);
    }, [files, queryClient]);
}
