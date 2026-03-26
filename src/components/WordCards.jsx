// WordCards.jsx — 낱말카드 (하단 반투명 카드, 드래그로 올리면 글자 배치)
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { decomposeWord } from '../utils/jamo.js';

const STORAGE_KEY = 'jina-word-cards';

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export default function WordCards({ onDeploy }) {
  const [cards, setCards] = useState(loadCards);
  const [showAdd, setShowAdd] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const dragRef = useRef(null);
  const [dragCard, setDragCard] = useState(null); // { word, x, y }

  // 카드 추가
  const addCard = useCallback(() => {
    const word = inputVal.trim();
    if (!word) return;
    const next = [...cards, word];
    setCards(next);
    saveCards(next);
    setInputVal('');
    setShowAdd(false);
  }, [inputVal, cards]);

  // 카드 삭제
  const removeCard = useCallback((idx) => {
    const next = cards.filter((_, i) => i !== idx);
    setCards(next);
    saveCards(next);
  }, [cards]);

  // 드래그 시작
  const startDrag = useCallback((word, e) => {
    e.preventDefault();
    e.stopPropagation();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    dragRef.current = { word, startX: x, startY: y, moved: false };
    setDragCard({ word, x, y });
  }, []);

  useEffect(() => {
    if (!dragCard) return;
    function onMove(e) {
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
      else { x = e.clientX; y = e.clientY; }
      if (dragRef.current) {
        const dx = Math.abs(x - dragRef.current.startX);
        const dy = Math.abs(y - dragRef.current.startY);
        if (dx > 10 || dy > 10) dragRef.current.moved = true;
      }
      setDragCard(prev => prev ? { ...prev, x, y } : null);
    }
    function onEnd(e) {
      if (!dragRef.current) return;
      const d = dragRef.current;
      dragRef.current = null;
      setDragCard(null);
      // 위쪽으로 충분히 올렸으면 배치
      let y;
      if (e.changedTouches) y = e.changedTouches[0].clientY;
      else y = e.clientY;
      if (d.moved && y < window.innerHeight - 200) {
        // 자모 분해 → 배치
        const jamos = decomposeWord(d.word);
        if (jamos.length > 0 && onDeploy) {
          onDeploy(jamos, y);
        }
      }
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
  }, [!!dragCard]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* 하단 카드 트레이 */}
      <div className="word-tray">
        {cards.map((word, i) => (
          <div
            key={i}
            className="word-card"
            onTouchStart={(e) => startDrag(word, e)}
            onMouseDown={(e) => startDrag(word, e)}
            onContextMenu={(e) => { e.preventDefault(); removeCard(i); }}
          >
            <span className="word-card-text">{word}</span>
          </div>
        ))}
        <div className="word-card word-card--add" onClick={() => setShowAdd(true)}>
          <span style={{ fontSize: '1.5rem' }}>+</span>
        </div>
      </div>

      {/* 드래그 고스트 */}
      {dragCard && (
        <div className="word-drag-ghost" style={{ left: dragCard.x, top: dragCard.y }}>
          {dragCard.word}
        </div>
      )}

      {/* 이름 추가 모달 */}
      {showAdd && (
        <div className="word-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="word-modal" onClick={(e) => e.stopPropagation()}>
            <p>이름을 입력하세요</p>
            <input
              className="word-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCard()}
              placeholder="예: 진아"
              autoFocus
            />
            <div className="word-modal-actions">
              <button className="word-modal-btn word-modal-btn--cancel" onClick={() => setShowAdd(false)}>취소</button>
              <button className="word-modal-btn word-modal-btn--confirm" onClick={addCard}>추가</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
