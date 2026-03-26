// Slot.jsx — 초성/중성/종성 슬롯

import React from 'react';

export default function Slot({ label, char, layout, onClear, highlight }) {
  const style = {
    left: `${layout.x}%`,
    top: `${layout.y}%`,
    width: `${layout.w}%`,
    height: `${layout.h}%`,
  };

  return (
    <div
      className={`slot ${char ? 'slot--filled' : 'slot--empty'} ${highlight ? 'slot--highlight' : ''}`}
      style={style}
      onClick={char ? onClear : undefined}
    >
      {char ? (
        <span className="slot-char">{char}</span>
      ) : (
        <span className="slot-label">{label}</span>
      )}
    </div>
  );
}
