// DragGhost.jsx — 드래그 중 따라다니는 고스트

import React from 'react';
import ReactDOM from 'react-dom';

export default function DragGhost({ drag }) {
  if (!drag) return null;

  return ReactDOM.createPortal(
    <div
      className="drag-ghost"
      style={{
        left: drag.x,
        top: drag.y,
      }}
    >
      {drag.char}
    </div>,
    document.body
  );
}
