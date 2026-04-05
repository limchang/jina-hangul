// useDragFromPanel.js — 사이드 패널에서 캔버스로 드래그
import { useState, useCallback, useRef, useEffect } from 'react';

export default function useDragFromPanel({ panOffsetRef, zoomRef, getNextPlacePosRef, placeNewPieceRef, dragNewRef }) {
  const [dragNew, setDragNew] = useState(null);
  const [lastPressedChar, setLastPressedChar] = useState(null);

  const dragMovedRef = useRef(false);
  const lastTouchTimeRef = useRef(0);
  const dragGhostRef = useRef(null);

  // ── 패널에서 클릭 or 드래그 ──
  const startDragNew = useCallback((char, type, e) => {
    e.preventDefault(); e.stopPropagation();
    const isTouch = !!e.touches;
    // 터치 직후 synthesized mousedown 무시 (300ms 이내)
    if (!isTouch && Date.now() - lastTouchTimeRef.current < 300) return;
    if (isTouch) lastTouchTimeRef.current = Date.now();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
    dragNewRef.current = { char, type, x, y, startX: x, startY: y, wasTouch: isTouch };
    dragMovedRef.current = false;
    setDragNew({ char, type, x, y });
  }, []);

  // 드래그 이벤트 — 한 번만 등록
  useEffect(() => {
    function onMove(e) {
      if (!dragNewRef.current) return;
      e.preventDefault();
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
      const d = dragNewRef.current;
      if (d && (Math.abs(x - d.startX) > 10 || Math.abs(y - d.startY) > 10)) dragMovedRef.current = true;
      dragNewRef.current = { ...d, x, y };
      // DOM 직접 조작 — setState 없이 고스트 위치 갱신
      if (dragGhostRef.current) {
        dragGhostRef.current.style.left = `${x}px`;
        dragGhostRef.current.style.top = `${y}px`;
      }
    }
    function onEnd(e) {
      const d = dragNewRef.current; if (!d) return;
      dragNewRef.current = null; setDragNew(null);
      if (e.type === 'mouseup' && d.wasTouch) return;
      let ex, ey;
      if (e.changedTouches) { ex = e.changedTouches[0].clientX; ey = e.changedTouches[0].clientY; } else { ex = e.clientX; ey = e.clientY; }
      const po = panOffsetRef.current, z = zoomRef.current;
      if (!dragMovedRef.current) {
        // 클릭만 → 다음 위치에 자동 배치
        const pos = getNextPlacePosRef.current(); placeNewPieceRef.current(d.char, pos.x, pos.y);
      } else {
        // 드래그 → 리모컨 위에 놓으면 취소
        const remoteEl = document.querySelector('.remote');
        if (remoteEl) {
          const r = remoteEl.getBoundingClientRect();
          if (ex >= r.left && ex <= r.right && ey >= r.top && ey <= r.bottom) return;
        }
        placeNewPieceRef.current(d.char, (ex - po.x) / z, (ey - po.y) / z, false);
      }
    }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchend', onEnd); window.removeEventListener('mouseup', onEnd); };
  }, []); // 한 번만 등록

  return {
    dragNew, lastPressedChar, setLastPressedChar,
    dragGhostRef,
    startDragNew,
  };
}
