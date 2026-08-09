import react from "react";
import styled from "styled-components";

const Wrapper=styled.div`
    flex-shrink: 0;
    height: 26px;
    border-bottom: 1px solid ${props=>props.theme.line}33;
`
//Filetree는 폴더가 항상 먼저 나오는게 맞아서(윈도우탐색기식) 정렬토글 자체가 불필요해서 제거함
//정렬기준(이름/날짜/크기)은 Top.jsx의 정렬UI를 Filetree/Mainview가 같이 공유해서 씀
export default function FiletreeTop(){
    return (
        <Wrapper>
        </Wrapper>
    )
}