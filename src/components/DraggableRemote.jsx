// DraggableRemote.jsx — 드래그 이동 가능한 리모컨 래퍼
import React, { useState, useRef, useEffect } from 'react';
import '../../css/remote.css';

export default function DraggableRemote({ children, startY = 10 }) {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: startY });
  const dragRef = useRef(null);
  const onDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    let cx, cy;
    if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } else { cx = e.clientX; cy = e.clientY; }
    dragRef.current = { startX: cx, startY: cy, origX: pos.x, origY: pos.y };
  };
  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current) return;
      let cx, cy;
      if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } else { cx = e.clientX; cy = e.clientY; }
      const d = dragRef.current;
      setPos({ x: d.origX + (cx - d.startX), y: d.origY + (cy - d.startY) });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('mousemove', onMove); window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp); window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchend', onUp); };
  }, []);
  return (
    <div className="remote" style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}>
      <div className="remote-handle" onMouseDown={onDown} onTouchStart={onDown}>⠿</div>
      <div className="remote-inner">{children}</div>
      <div className="remote-handle" onMouseDown={onDown} onTouchStart={onDown}>⠿</div>
    </div>
  );
}
