import styled from "styled-components";
import { supportedLanguages, useLanguage } from "../../Tools/LanguageProvider";

const LangSelect = styled.select`
    padding: 5px 6px;
    border: 1px solid ${props => props.theme.line};
    border-radius: 6px;
    background: ${props => props.theme.back};
    color: ${props => props.theme.text};
    font-size: 13px;
`;

export const LanguageSwitcher=()=>{
    const {lang,setLang}=useLanguage();

    return (
        <LangSelect
        value={lang}
        onChange={(e)=>setLang(e.target.value)}
        >
            {supportedLanguages.map(({code,name,flag})=>(
                <option key={code} value={code}>
                    {name}
                </option>
            ))}
        </LangSelect>
    )
}