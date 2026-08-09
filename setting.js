import Store from 'electron-store'

const store=new Store({
    //기본값 (처음실행시사용)
    defaults:{
        view:{
            viewoption:'large',
            isdetail:{
                isfilename:true,
                isdate: true,
                istype: true,
                issize: true,
                islength: true
            },
            sort:{key:"filename",direction:"ASC"},
            groupfolders:true, //폴더먼저보기 기본켜짐
            //자세히보기 열 너비(px). 머리글 경계선을 끌어서 조절하면 여기 저장됨
            columnwidth:{ filename:320, date:160, type:90, size:90 }
        },
        tree:{
            folderview:false,
            sortoption:'desc'

        },
        user:{
            isdarkmode:false,
            Language:"en",
            //앱 잠금. null이면 잠금 없음. 설정하면 {salt,hash,hint}가 들어감(평문은 저장 안함)
            lock:null
        },
        //인풋필터
        filters:{
              enabled:true,
            categories: {
          
        image: {
            enabled: true,
            label: 'image',
            items: [
                { ext: 'jpg', enabled: true },
                { ext: 'jpeg', enabled: true },
                { ext: 'png', enabled: true },
                { ext: 'gif', enabled: true },
                { ext: 'webp', enabled: true },
                { ext: 'bmp', enabled: true },
                { ext: 'svg', enabled: true }
            ]
        },
        video: {
            enabled: true,
            label: 'video',
            items: [
                { ext: 'mp4', enabled: true },
                { ext: 'mkv', enabled: true },
                { ext: 'avi', enabled: true },
                { ext: 'mov', enabled: true },
                { ext: 'wmv', enabled: true },
                { ext: 'flv', enabled: true }
            ]
        },
        document: {
            enabled: true,
            label: 'document',
            items: [
                { ext: 'txt', enabled: true },
                { ext: 'pdf', enabled: true },
                { ext: 'docx', enabled: true },
                { ext: 'xlsx', enabled: true },
                { ext: 'pptx', enabled: true },
                { ext: 'hwp', enabled: true }, // 한글 문서
                { ext: 'csv', enabled: true }
            ]
        },
        archive: {
            enabled: true,
            label: 'archive',
            items: [
                { ext: 'zip', enabled: true },
                { ext: 'rar', enabled: true },
                { ext: '7z', enabled: true },
                { ext: 'tar', enabled: true },
                { ext: 'gz', enabled: true }
            ]
        },
        executable: {
            enabled: false, // 보안상 기본은 꺼두는 게 좋을 수 있음
            label: 'executable',
            items: [
                { ext: 'exe', enabled: true },
                { ext: 'msi', enabled: true },
                { ext: 'bat', enabled: true },
                { ext: 'sh', enabled: true }
            ]
        },
        audio: {
            enabled: true,
            label: 'audio',
            items: [
                { ext: 'mp3', enabled: true },
                { ext: 'wav', enabled: true },
                { ext: 'flac', enabled: true },
                { ext: 'ogg', enabled: true },
                { ext: 'm4a', enabled: true }
            ]
        }
    }
        }
    }
})
export default store;