// TrashZone.jsx — 휴지통
import React, { useState, useRef } from 'react';
import '../../css/trash-zone.css';

export default function TrashZone({ trashHover, onClearAll, onUndo }) {
  const [undoMode, setUndoMode] = useState(false);
  const timerRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (undoMode) {
      // 되돌리기
      setUndoMode(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (onUndo) onUndo();
    } else {
      // 삭제 → 되돌리기 모드 전환
      onClearAll();
      setUndoMode(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setUndoMode(false), 4000);
    }
  };

  return (
    <div id="trash-zone"
      className={`trash-zone ${trashHover ? 'trash-zone--hover' : ''} ${undoMode ? 'trash-zone--undo' : ''}`}
      onClick={handleClick}>
      {undoMode ? (
        <>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span className="trash-undo-label">되돌리기</span>
        </>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      )}
    </div>
  );
}
