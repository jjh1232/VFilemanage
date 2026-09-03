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

    /* 스크롤을 여기가 아니라 Body가 맡음.
       예전엔 여기에 overflow-y:auto가 있어서 종류가 많아지면 아래 버튼줄까지 같이 밀려
       내려가버렸음(적용을 누르려면 끝까지 스크롤해야 했음) */
    display: flex;
    flex-direction: column;
    overflow: hidden;
`
//제목줄. 이 패널이 "보이는 목록"이 아니라 "가져올 때 받을 형식"을 고르는 곳이라는걸
//알려주는 유일한 단서라 항상 보이게 고정함
const Header=styled.div`
    flex-shrink: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid ${props=>props.theme.line}55;
`
const Headertitle=styled.div`
    font-size: 13px;
    font-weight: 600;
`
const Headerdesc=styled.div`
    margin-top: 2px;
    font-size: 11px;
    opacity: 0.6;
`
//실제로 길어지는건 여기뿐이라 스크롤도 여기만
const Body=styled.div`
    flex: 1;
    overflow-y: auto;
    min-height: 0;
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
//체크박스와 "펼치기"는 눌렀을때 하는 일이 달라서 한 label로 묶으면 안됨.
//그래서 줄만 flex로 잡고, 체크박스쪽(Checkboxlabel)과 이름쪽(Titlebutton)을 따로 둠
const CategoryHeader=styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
`
//체크박스 하나만 감싸는 label. 클릭판정을 체크박스 자신으로 한정함
const Checkboxlabel=styled.label`
    display: flex;
    align-items: center;
    cursor: pointer;

    input {
        accent-color: ${props=>props.theme.accent};
        width: 14px;
        height: 14px;
        cursor: pointer;
        margin: 0;
    }
`
//이름 전체가 펼침 버튼. 화살표만 누르게 하면 판정이 너무 좁음
const Titlebutton=styled.button`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;

    &:hover { background: ${props=>props.theme.accent}18; }
`
const Arrow=styled.span`
    display: inline-block;
    font-size: 9px;
    opacity: 0.6;
    transition: transform 0.15s;
    transform: rotate(${props=>props.$open? '90deg' : '0deg'});
`
//몇개가 실제로 통과하는지. 카테고리가 꺼져있으면 하위를 다 켜놨어도 0개라
//"분명 체크했는데 왜 안들어가지"의 답이 여기서 바로 보임
const Count=styled.span`
    font-size: 11px;
    font-weight: 400;
    opacity: ${props=>props.$none? 0.85 : 0.45};
    color: ${props=>props.$none? '#e08a3c' : 'inherit'};
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
//Body가 남은 공간을 다 먹으므로 margin-top 없이도 아래에 붙음.
//flex-shrink:0이라 목록이 아무리 길어져도 안 밀려남
const Buttonrow=styled.div`
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
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
//폴더를 켜고 껐을때 각각 어떻게 되는지 한줄로 알려줌.
//체크박스만 있으면 "안의 파일은 어떻게 되는지"가 안 드러나서 헷갈림
const Folderdesc=styled.div`
    padding-left: 22px;
    font-size: 11px;
    opacity: 0.55;
    line-height: 1.4;
`
//이 카테고리에서 실제로 통과하는 확장자 개수.
//Filefilter가 "카테고리가 켜져있을때만 하위를 본다"라서, 카테고리가 꺼져있으면
//하위를 다 체크해놨어도 통과는 0개임. 그 사실을 숫자로 그대로 드러냄
const passcount=(category)=>
    category.enabled ? category.items.filter(it=>it.enabled).length : 0;

export const FilterView=({setisopen})=>{

    const {t}=useLanguage();
    const [tempFilters,setTempfilters]=useState();//임시데이터
    //펼쳐둔 카테고리들. 기본은 전부 접힘 — 실제로 만지는건 개별 확장자가 아니라
    //카테고리 단위라, 접어두면 6줄로 끝나서 어디가 꺼져있는지 한눈에 보임
    const [openkeys,setOpenkeys]=useState(()=>new Set());
    const toggleopen=(key)=>setOpenkeys(prev=>{
        const next=new Set(prev);
        next.has(key)? next.delete(key) : next.add(key);
        return next;
    });
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
                window.nodeapi.logerror("필터 초기화실패")
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

        <Header>
            <Headertitle>{t("filter_title")}</Headertitle>
            <Headerdesc>{t("filter_desc")}</Headerdesc>
        </Header>

        <Body>
        {/* 폴더는 확장자가 없어서 아래 카테고리 목록과 성격이 다름(하위 항목도 없음).
            그래서 categories 바깥의 keepfolders 값을 쓰고 맨 위에 따로 둠 */}
        {tempFilters&&
        <CategorySection>
            <CategoryHeader>
                <Checkboxlabel>
                <input type="checkbox"
                 checked={tempFilters.keepfolders!==false}
                 onChange={(e)=>{
                    e.stopPropagation();
                    const ischecked=e.target.checked;
                    setTempfilters(prev=>({...prev, keepfolders:ischecked}));
                 }}
                 />
                </Checkboxlabel>
                {/* 아래 카테고리들과 같은 펼침 구조. openkeys는 카테고리 key로 관리되는데
                    '__folder'는 categories에 없는 이름이라 충돌하지 않음 */}
                <Titlebutton type="button" onClick={()=>toggleopen('__folder')}>
                    <Arrow $open={openkeys.has('__folder')}>▶</Arrow>
                    <span>{t("filter_folder")}</span>
                </Titlebutton>
            </CategoryHeader>

            <Folderdesc>
                {tempFilters.keepfolders!==false
                    ? t("filter_folder_on")
                    : t("filter_folder_off")}
            </Folderdesc>

            {openkeys.has('__folder')&&
            <CategoryBody>
                {/* 폴더를 아예 안 가져오면 이 옵션은 의미가 없어서 잠근다 */}
                <Bodyitem style={{opacity: tempFilters.keepfolders===false? 0.4 : 1}}>
                    <input type="checkbox"
                     disabled={tempFilters.keepfolders===false}
                     checked={tempFilters.filterinside!==false}
                     onChange={(e)=>{
                        e.stopPropagation();
                        const ischecked=e.target.checked;
                        setTempfilters(prev=>({...prev, filterinside:ischecked}));
                     }}
                     />
                    {t("filter_filterinside")}
                </Bodyitem>
            </CategoryBody>
            }
        </CategorySection>
        }

        {tempFilters&&Object.entries(tempFilters.categories).map(([key,category])=>(
            <CategorySection key={key}>
                <CategoryHeader>
                    <Checkboxlabel>
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
                    </Checkboxlabel>
                    <Titlebutton type="button" onClick={()=>toggleopen(key)}>
                        <Arrow $open={openkeys.has(key)}>▶</Arrow>
                        <span>{t(category.label)}</span>
                        <Count $none={passcount(category)===0}>
                            ({passcount(category)}/{category.items.length})
                        </Count>
                    </Titlebutton>
                </CategoryHeader>
                {openkeys.has(key)&&
                <CategoryBody>
                    {category.items.map((item,index)=>(
                        <Bodyitem key={item.ext}>
                        <input
                         type="checkbox"
                          checked={item.enabled}
                          onChange={(e)=>{
                        e.stopPropagation();
                        const isChecked=e.target.checked;
                        setTempfilters((prev)=>{
                            const cat=prev.categories[key];
                            const items=cat.items.map((it,i)=>
                                i===index? {...it,enabled:isChecked}:it);
                            //하나라도 켜져있으면 카테고리도 켜져야 실제로 통과함.
                            //예전엔 카테고리가 꺼져있으면 하위를 아예 못눌러서,
                            //pdf 하나 받으려고 카테고리를 켜서 14개를 다 켠뒤 13개를 다시 꺼야했음.
                            //반대로 전부 꺼지면 카테고리도 같이 꺼서 "켜져있는데 0개" 모순을 안만듦
                            const anyon=items.some(it=>it.enabled);
                            return {...prev,categories:{
                                ...prev.categories,
                                [key]:{...cat, items, enabled:anyon}
                            }};
                        })

                    }}
                          />
                          {item.ext}
                       </Bodyitem>

                    ))}
                 </CategoryBody>
                }
            </CategorySection>
        )
    )

        }
        </Body>

        <Buttonrow>
        {/* 실제로는 고른걸 버리고 닫는거라 "닫기"보다 "취소"가 맞음.
            적용을 눌러야 저장된다는걸 이름으로 알려주는 역할도 함 */}
        <CloseButton onClick={(e)=>{
            e.stopPropagation();
            setisopen(false)}}>
            {t("cancel")}
        </CloseButton>
        <ApplyButton onClick={applyhandler}>
            {t("apply")}
        </ApplyButton>
        </Buttonrow>
    </Wrapper>)

}
