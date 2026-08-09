import Store from 'electron-store';
const store=new Store();//여기서파일직접읽어옴

export function Filefilter(filepaths) {
         console.log("파일필터메소드")
        const storefilter=store.get("filters");
         console.log("파일필터스토어데이터:",storefilter)
        if(!storefilter.enabled){
             console.log("스토어전체필터적용안함")
            return filepaths;
        }

        //확장자추출및 필터링 탐색속도가빠른 set
        const activeExts=new Set();
        //store데이터활성화된거수집
        if(storefilter&&storefilter.categories){
            Object.values(storefilter.categories).forEach(category=>{
                //카테고리활성화되있는지확인
                console.log("카테고리: %s | 허용여부: %s", category.label, category.enabled);
                if(category.enabled){
                    
                    console.log("카테고리활성화",category.items)
                    category.items.forEach(item=>{
                        
                        if(item.enabled){
                             //활성화시 개별확장자set추가
                    activeExts.add(item.ext.toLowerCase());
                        }
                    })
                   
                }
            });

            return filepaths.filter(filepaths=>{
                //.단위로 배열로만들고 마지막요소를 pop으로 뺴오고 소문자통일
                const ext=filepaths.split('.').pop().toLowerCase();
                //has로 이확장자가들어있는지 확인
                const isAllowed= activeExts.has(ext);
                if(!isAllowed){
                    //거부된파일들출력
                  console.log(`[필터링됨] 제외된 파일: ${filepaths}`);
                 } else {
                 console.log(`[통과] 포함된 파일: ${filepaths}`);
                  }

                return isAllowed;
            })
        }

        //필터데이터비정상적일시 안전하게 원본반환
        return filepaths;
}