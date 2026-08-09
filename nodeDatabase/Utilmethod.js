
//이름과 확장자를 나눔. 번호는 반드시 확장자 "앞"에 들어가야 한다.
//뒤에 붙이면 "티아.png (1)"이 되어 윈도우가 png로 못알아본다 - 앱안에서는 타입을 realpath로
//판별해서 티가 안나지만, 실제 폴더로 내보내는 순간 열 수 없는 파일이 됨
function splitext(name){
        const text=String(name||'');
        const dot=text.lastIndexOf('.');
        //맨 앞의 점은 확장자가 아니라 이름의 일부임(.gitignore)
        if(dot<=0) return {stem:text, ext:''};
        return {stem:text.slice(0,dot), ext:text.slice(dot)};
}

//한개일경우
async function generateUniqueName({query,parentid,currentname}){
         //폴더는 ext가 빈문자열이라 아래 로직이 예전과 똑같이 동작함(새폴더 (2))
         const {stem,ext}=splitext(currentname);
         const basename=stem.replace(/ \(\d+\)$/,'');//정규식으로 (1)이런숫자찾고제거

         const {rows}=await query(
            `select filename FROM files where filename LIKE ?
             AND parent_id=?`,[`${basename}%`,parentid]
         )
         //js 에서 정규식으로 예시파일 들 추려내기
         //.같은거 이스케이프로 //.으로 문자열로 인식하게 만들어줌 () 이스케이프없는애는따로 캡쳐해서 배열에추가할부분
         //RegExp.escape는 런타임에 따라 없을 수 있어서 직접 이스케이프
         const escapedbasename=basename.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
         const escapedext=ext.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
         const regex = new RegExp(`^${escapedbasename}(?: \\((\\d+)\\))?${escapedext}$`);
        const usedNums=new Set(rows.filter(row=>{
         const m=row.filename.match(regex);
         //배열일시 리턴 아닌건 false라버림
         return m !==null;
        }).map(row=>{
         const m=row.filename.match(regex);
         return m[1]? parseInt(m[1],10):0;//접미사없으면 0(베이스이름자체가쓰였다는뜻)
        }));
        //베이스이름(접미사없음)자체가 안쓰였으면 그대로써도됨
        if(!usedNums.has(0)){
         return `${basename}${ext}`;
        }
        //베이스이름은 이미쓰였으니 (1)부터 빈자리찾기
        let nextnum=1;
        while(usedNums.has(nextnum)){
         nextnum++;
        }
        //윈도우 탐색기와 같은 자리에 번호를 넣음: "티아 (1).png"
        return `${basename} (${nextnum})${ext}`;
}
export {generateUniqueName}