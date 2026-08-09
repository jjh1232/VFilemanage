import { useState } from "react";
import { useLanguage } from "../../Tools/LanguageProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Fileicon, Foldericon } from "../../Tools/Iconbox";
import { createEmptyFolder } from "../TOOL/FolderUtils";

const Wrapper=styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;

  width: 170px;
  padding: 4px;
  background-color: ${props => props.theme.back};
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.line};
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  z-index: 1000;
  /* Top.jsx의 Wrapper가 자체 stacking context(z-index:50)를 만들어서
     여기 값 자체는 그 안에서만 비교되면 되지만, 혹시 몰라 여유있게 */
`
const Menulist=styled.div`
    display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  text-align: left;

  &:hover{
    background-color: ${props=>props.theme.accent}22;
  }
`


export default function InputDropdown({currentfolderid,closeInputMenu}){

    const {t}=useLanguage();
    const queryClient=useQueryClient();
    //파일인풋
    const filechange=async(e)=>{
            //버블링으로 상위(파일추가버튼)의 토글이 같이 발동되는거 방지, 명시적으로 닫음
            e.stopPropagation();
            closeInputMenu&&closeInputMenu();
            //e.dataTransfer.files 이건드래그드랍데이터
            console.log("파일체인지타입체크",typeof currentfolderid,currentfolderid);
            //드래그용 객체자리는널
           const result=await window.nodeapi.insertfile({currentfolderid:currentfolderid});

            if(result=="success"){
                await queryClient.invalidateQueries({queryKey:['filedata']})
            }
            console.log("결과",result)
        }

    //폴더 통째로 추가. 안쪽 구조까지 그대로 들어감(드래그드롭때와 같은 재귀삽입을 탐)
    //윈도우 대화상자가 파일과 폴더를 동시에 못 고르게 해서 메뉴가 따로 나뉘어 있음
    const folderchange=async(e)=>{
            e.stopPropagation();
            closeInputMenu&&closeInputMenu();
            const result=await window.nodeapi.insertfolder({currentfolderid});

            if(result=="success"){
                await queryClient.invalidateQueries({queryKey:['filedata']});
            }
            console.log("폴더추가결과",result)
        }

    //현재 폴더 안에 빈 폴더 만들기(우클릭 메뉴의 "새로만들기"와 같은 동작)
    const newfolder=async(e)=>{
            e.stopPropagation();
            closeInputMenu&&closeInputMenu();
            try{
                await createEmptyFolder(currentfolderid);
                await queryClient.invalidateQueries({queryKey:['filedata']});
            }catch(error){
                console.log("새폴더 생성실패",error);
            }
        }

        //onClick만으론 바깥클릭 감지(mousedown)를 못막아서 onMouseDown도 같이 필요
        return (<Wrapper onClick={(e)=>e.stopPropagation()} onMouseDown={(e)=>e.stopPropagation()}>
            <Menulist onClick={filechange}>
                <Fileicon size={16}/>
                {t("fileinput")}
            </Menulist>
            <Menulist onClick={folderchange}>
                <Foldericon size={16}/>
                {t("folderinput")}
            </Menulist>
            <Menulist onClick={newfolder}>
                <Foldericon size={16}/>
                {t("newfolder")}
            </Menulist>
        </Wrapper>)
}
