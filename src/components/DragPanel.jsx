// DragPanel.jsx — 드래그 가능한 자음/모음 패널

import React from 'react';

export default function DragPanel({ items, label, type, onDragStart, side }) {
  return (
    <aside className={`side-panel ${side === 'left' ? 'left-panel' : 'right-panel'}`}>
      <div className="panel-label">{label}</div>
      <div className="panel-list">
        {items.map((item) => (
          <div
            key={item.char}
            className="thumb"
            onTouchStart={(e) => onDragStart(item.char, type, e)}
            onMouseDown={(e) => onDragStart(item.char, type, e)}
          >
            {item.char}
          </div>
        ))}
      </div>
    </aside>
  );
}
