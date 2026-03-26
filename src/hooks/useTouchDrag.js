// useTouchDrag.js — 터치/마우스 드래그 훅

import { useState, useCallback, useEffect, useRef } from 'react';

export function useTouchDrag(onDrop) {
  const [drag, setDrag] = useState(null); // { char, type, x, y }
  const dragRef = useRef(null);

  const startDrag = useCallback((char, type, e) => {
    e.preventDefault();
    let x, y;
    if (e.touches) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    const state = { char, type, x, y };
    dragRef.current = state;
    setDrag(state);
  }, []);

  useEffect(() => {
    if (!drag) return;

    function onMove(e) {
      e.preventDefault();
      let x, y;
      if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      const state = { ...dragRef.current, x, y };
      dragRef.current = state;
      setDrag(state);
    }

    function onEnd(e) {
      if (!dragRef.current) return;
      let x, y;
      if (e.changedTouches) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      // 카드 위인지 확인
      const cardEl = document.getElementById('composition-card');
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          onDrop(dragRef.current.char, dragRef.current.type);
        }
      }
      dragRef.current = null;
      setDrag(null);
    }

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);

    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mouseup', onEnd);
    };
  }, [!!drag]); // eslint-disable-line react-hooks/exhaustive-deps

  return { drag, startDrag };
}
