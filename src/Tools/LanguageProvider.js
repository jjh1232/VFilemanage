import react, { Children, createContext, useContext,useEffect,useState } from "react";
import { Language } from "./Language";

const LanguageContext=createContext();
export const supportedLanguages=[
    {code:'ko',name:'한국어',flag:'kr'},
    {code:'en',name:'English',flag:'us'},
    {code:'ja',name:'日本語',flag:'jp'},
    {code:'es',name:'Español',flag:'es'}

]

export const LanguageProvider=({children})=>{
    const [lang,setLang]=useState('ko');//기본값
    useEffect(()=>{
        (async ()=>{
            try{
                const storedLang=await window.nodeapi.store.get("user.Language");
                //저장된 값이 없거나 지금 지원 안하는 언어면 기본값 유지
                if(storedLang && Language[storedLang]) setLang(storedLang);
            }catch(err){
                console.log("stor언어로드실패")
            }
        })();//이 ()가 없어서 여태 함수만 만들고 실행이 안됐음 → 저장한 언어가 복원되지 않았음
    },[]);
    //lang동시업데이트
    const changeLang=async (newLang)=>{
        setLang(newLang);
        try{
            await window.nodeapi.store.set("user.Language",newLang);
        }catch(err){
            console.log("store저장실패");
        }
    };

    //t("키") 또는 t("키",{n:3}) → 문구 안의 {n}이 3으로 바뀜.
    //없는 키는 키 이름을 그대로 돌려줘서 번역 빠진 곳이 화면에 드러나게 함
    const t=(key,params)=>{
        let text=Language[lang]?.[key] ?? key;
        if(params){
            for(const [name,value] of Object.entries(params)){
                text=text.split(`{${name}}`).join(value);
            }
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{lang,setLang: changeLang,t}}>
        {children}
        </LanguageContext.Provider>
    )
}
export const useLanguage=()=>useContext(LanguageContext);