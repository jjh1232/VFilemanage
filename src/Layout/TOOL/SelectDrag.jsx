import {SelectionArea} from "@viselect/react";
import { useCallback, useEffect, useRef } from "react";
import styled, { createGlobalStyle } from "styled-components";

const Selectarea = styled(SelectionArea)`
  position: relative;
  width: 100%;
  //height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 영역 내의 텍스트 선택 방지 */
  user-select: none;
  /* 이제 내부에 .selection-area 스타일을 적을 필요가 없습니다. */
`;
// 1. 전역 스타일 정의 (body 하위에 생기는 박스까지 제어)
//이거 globalstyle로 해야나오더라
const DragAreaGlobalStyle = createGlobalStyle`
  .selection-area {
    background: rgba(0, 120, 215, 0.3) !important;
    border: 2px solid rgba(0, 120, 215, 0.8) !important;
    z-index: 9999 !important;
    position: fixed; /* body 기준이므로 fixed가 위치 잡기 가장 정확함 */
    pointer-events: none; /* 드래그 박스가 마우스 이벤트를 방해하지 않게 설정 */
  }
`;
const SelectableGroup = ({ children, selectables, onSelectionChange ,onReset, selectitems}) => {
  //"이미 선택된 아이템인지"는 viselect 내부저장소(store.stored)가 아니라 실제 정답인 React state로 판단해야함.
  //둘은 clearSelection을 우리가 직접 부르거나 ctrl클릭이 섞이면 서로 어긋남.
  //단, selectitems를 콜백 의존성에 그대로 넣으면 선택될때마다 viselect가 재바인딩되니
  //Mainview에서 쓰던것과 같은 ref패턴으로 콜백은 고정시키고 최신값만 읽음
  const selectitemsRef=useRef(selectitems);
  useEffect(()=>{ selectitemsRef.current=selectitems; },[selectitems]);

  //아이템을 draggable로 만들면서, 아이템 위에서 마우스다운→드래그가 그대로 네이티브 HTML5 드래그로
  //넘어가버리는 경우가 생김. 그럴땐 viselect가 자기 내부에서 기대하던 mouseup을 영영 못받아서
  //"아직 드래그중"이라는 내부상태가 안 꺼진채로 남고, 그 뒤로 마우스가 움직일때마다
  //계속 그 낡은 시작점 기준으로 파란 박스를 다시 그려버림(CSS로 박스만 지워봤자 바로 또 그려짐).
  //그래서 라이브러리 공식 API인 selection.cancel()로 진짜 내부상태까지 확실히 꺼줘야함.
  //onBeforeStart때마다 최신 selection인스턴스를 ref에 저장해뒀다가, 네이티브 드래그 시작순간(dragstart) 취소.
  const selectionRef=useRef(null);
  useEffect(()=>{
    const cancelOnNativeDrag=()=>{
      selectionRef.current?.cancel();
    };
    document.addEventListener('dragstart', cancelOnNativeDrag);
    return ()=>document.removeEventListener('dragstart', cancelOnNativeDrag);
  },[]);

  //onStart/onEnd가 렌더마다 새로 생기면 viselect내부에서 매번 재바인딩하면서
  //select→state변경→리렌더→재바인딩→또select 로 무한루프가 생겨서 useCallback으로 참조고정
  const onEnd=useCallback(({store})=>{
    onSelectionChange({
      added:store.selected,
      removed:[]
    });
  },[onSelectionChange])

  //드래그 박스가 지나가는 동안 실시간으로 파란불 켜고끄기(mouseup까지 기다리지않게).
  //store.changed는 직전프레임 대비 새로들어온/빠져나간 것만 담고있어서 그대로 넘기면 됨
  const onMove=useCallback(({store})=>{
    onSelectionChange({
      added:store.changed.added,
      removed:store.changed.removed
    });
  },[onSelectionChange])

  //선택로직은 반드시 onStart가 아니라 onBeforeStart에 있어야함.
  //onStart는 마우스가 10px(startThreshold)이상 움직여야 발생하는데,
  //아이템을 누르고 움직이는 순간 브라우저가 네이티브 드래그를 가져가면서 mousemove를 끊어버려서
  //그 문턱을 영영 못넘고 onStart가 아예 발생하지 않음.
  //onBeforeStart는 mousedown시점에 확실히 발생함. (false를 리턴하면 라이브러리 동작 취소)
  const onBeforeStart=useCallback(({ event, selection, store }) => {
    selectionRef.current=selection; //네이티브드래그시 취소용으로 최신 인스턴스 저장

    //마우스왼쪽버튼이 0 휠이1 오른쪽이2. 우클릭은 컨텍스트메뉴쪽이 알아서 처리하니 여기선 손떼기
    if (event.button !== 0) return false;

    //Shift/Ctrl 다중선택은 라이브러리 기본동작에 맡김
    if (event.shiftKey || event.ctrlKey) return;

    const targetItem=event.target.closest(selectables);

    if (!targetItem) {
      // [케이스 1] 빈 바탕화면 클릭 ➡️ 전체 리셋. 여기선 취소 안해야 러버밴드 드래그가 됨
      selection.clearSelection();
      if (onReset) onReset();
      return;
    }

    // 이 아이템이 이미 선택되어 있는지 확인(모든 뷰가 data-id를 달고있어서 그걸로 비교)
    const clickedId=Number(targetItem.getAttribute('data-id'));
    const isAlreadySelected=!!selectitemsRef.current && selectitemsRef.current.has(clickedId);

    if (isAlreadySelected) {
      // [케이스 2] 이미 선택된 아이템을 누름 ➡️ 선택 그대로 유지
      // 여러개 선택해놓고 그중 하나를 잡아 드래그로 옮기는 상황을 살리려면 여기서 지우면 안됨
      return false;
    }

    // [케이스 3] 선택 안 된 새 아이템을 누름 ➡️ 기존꺼 비우고 바로 이걸로 교체
    // mouseup(onStop)까지 기다리면 누른채로 드래그할때 파란불이 영영 안옮겨옴
    selection.clearSelection();
    if (onReset) onReset();
    if (onSelectionChange) onSelectionChange({added:[targetItem],removed:[]});
    return false; //아이템위에서 시작한거면 러버밴드는 필요없음(네이티브 드래그로 갈거라)
  },[selectables,onReset,onSelectionChange])

  return (
    <>
      {/* 3. 전역 스타일 컴포넌트를 여기에 배치 (렌더링 트리 어디든 상관없음) */}
      <DragAreaGlobalStyle />

      <Selectarea
        selectables={selectables}
        onStop={onEnd}
        onMove={onMove}
        onBeforeStart={onBeforeStart}
      >
        {children}
      </Selectarea>
    </>
  );
};
 export default SelectableGroup;