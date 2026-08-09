import react, { useEffect, useState } from "react";
import styled from "styled-components";
import { useLanguage } from "../../Tools/LanguageProvider";

const Wrapper=styled.div`
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 9999;
    background: ${props=>props.theme.back};
    color: ${props=>props.theme.text};
    border: 1px solid ${props=>props.theme.line};
    border-radius: 10px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    padding: 12px;
    width: 280px;
    max-height: 400px;
    overflow-y: auto;
`
const CategorySection=styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 0;

    & + & {
        border-top: 1px solid ${props=>props.theme.line}55;
    }
`
const CategoryHeader=styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    input {
        accent-color: ${props=>props.theme.accent};
        width: 14px;
        height: 14px;
        cursor: pointer;
    }
`
const CategoryBody=styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-left: 22px;
`
const Bodyitem=styled.label`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;
    background: ${props=>props.theme.line}22;
    opacity: ${props=>props.$disabled? 0.4 : 1};
    transition: background 0.15s;

    &:hover {
        background: ${props=>props.theme.accent}22;
    }

    input {
        accent-color: ${props=>props.theme.accent};
        width: 12px;
        height: 12px;
        cursor: pointer;
    }
`
const Buttonrow=styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid ${props=>props.theme.line}55;
`
const ApplyButton=styled.button`
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background: ${props=>props.theme.accent};
    color: white;
    font-size: 12px;
    cursor: pointer;

    &:hover {
        filter: brightness(0.9);
    }
`
const CloseButton=styled.button`
    padding: 6px 12px;
    border: 1px solid ${props=>props.theme.line};
    border-radius: 6px;
    background: transparent;
    color: ${props=>props.theme.text};
    font-size: 12px;
    cursor: pointer;

    &:hover {
        background: ${props=>props.theme.line}22;
    }
`
export const FilterView=({setisopen})=>{

    const {t}=useLanguage();
    const [tempFilters,setTempfilters]=useState();//임시데이터
    //창이열릴떄 store에서 최신설정가져오기
    useEffect(()=>{
        (async ()=>{
            try{
                const dumy=await window.nodeapi.store.get("view")
                console.log("view:",dumy);
                 const savedfilter=await window.nodeapi.store.get("filters")
                 console.log("save:",savedfilter)
                 setTempfilters(savedfilter);
                 console.log("temp:",tempFilters)
            }catch(err){
                console.log("초기화실패")
            }


        }
    )
    ();
    },[])

    const applyhandler=()=>{
        window.nodeapi.store.set("filters",tempFilters);
        //적용했으면 창은 닫는게 자연스러움
        setisopen(false);
    }

    //이 패널은 Top의 Filterdiv "안"에 렌더링됨. 그래서 두가지를 다 막아야함
    // onMouseDown: 바깥클릭 감지(useDismiss)가 mousedown이라 이걸로 닫히는것 방지
    // onClick: 안막으면 클릭이 Filterdiv까지 올라가서 그쪽 토글이 패널을 닫아버림
    return (<Wrapper
        onMouseDown={(e)=>e.stopPropagation()}
        onClick={(e)=>e.stopPropagation()}>

        {tempFilters&&Object.entries(tempFilters.categories).map(([key,category])=>(
            <CategorySection key={key}>
                <CategoryHeader>
                    <input type="checkbox"
                     checked={category.enabled}
                     onChange={(e)=>{
                        e.stopPropagation();
                        console.log("키값:",key)
                        setTempfilters((prev)=>({...prev
                        ,categories:{
                            ...prev.categories,
                            [key]:{
                                ...prev.categories[key],
                                enabled:e.target.checked,
                                //하위아이템처리 상위끄면아래도다꺼지게
                                items:prev.categories[key].items.map((it)=>({
                                    ...it,
                                    enabled:e.target.checked
                                }))
                            }
                        }
                        }))
                    }}
                     />
                    {t(category.label)}
                </CategoryHeader>
                <CategoryBody>
                    {category.items.map((item,index)=>(
                        <Bodyitem key={item.ext} $disabled={!category.enabled}>
                        <input
                         type="checkbox"
                          checked={item.enabled}
                          disabled={!category.enabled}
                          onChange={(e)=>{
                        e.stopPropagation();
                        const isChecked=e.target.checked;
                        setTempfilters((prev)=>({
                            ...prev,categories:{
                                ...prev.categories,[key]:{
                                    ...prev.categories[key],items:prev.categories[key].items.map((it,i)=>
                                    i===index? {...it,enabled:isChecked}:it
                                    )
                                }
                            }
                        }))

                    }}
                          />
                          {item.ext}
                       </Bodyitem>

                    ))}
                 </CategoryBody>

            </CategorySection>
        )
    )

        }
        <Buttonrow>
        <CloseButton onClick={(e)=>{
            e.stopPropagation();
            setisopen(false)}}>
            {t("close")}
        </CloseButton>
        <ApplyButton onClick={applyhandler}>
            {t("apply")}
        </ApplyButton>
        </Buttonrow>
    </Wrapper>)

}
