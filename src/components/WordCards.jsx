// WordCards.jsx — 낱말카드 (하단 카드, 실제 배치 미리보기, 드래그 배치/삭제)
import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { decomposeWord } from '../utils/jamo.js';

const STORAGE_KEY = 'jina-word-cards';
const PREVIEW_KEY = 'jina-word-previews';

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCards(cards) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); }
function loadPreviews() {
  try { return JSON.parse(localStorage.getItem(PREVIEW_KEY) || '{}'); } catch { return {}; }
}
function savePreviews(previews) { localStorage.setItem(PREVIEW_KEY, JSON.stringify(previews)); }

function getJamoSource(char) {
  return CONSONANTS.find(c => c.char === char) || VOWELS.find(v => v.char === char);
}

// 배치된 pieces로부터 미리보기 이미지 생성
export function renderLayoutPreview(pieces) {
  if (!pieces || pieces.length === 0) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pieces.forEach(p => {
    const half = 500 * p.scale / 2;
    if (p.x - half < minX) minX = p.x - half;
    if (p.x + half > maxX) maxX = p.x + half;
    if (p.y - half < minY) minY = p.y - half;
    if (p.y + half > maxY) maxY = p.y + half;
  });
  const PAD = 20;
  const bw = maxX - minX + PAD * 2;
  const bh = maxY - minY + PAD * 2;
  const MAX_W = 300, MAX_H = 120;
  const fitScale = Math.min(MAX_W / bw, MAX_H / bh, 1);
  const W = Math.ceil(bw * fitScale);
  const H = Math.ceil(bh * fitScale);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  pieces.forEach(p => {
    const src = p.source || getJamoSource(p.char);
    if (!src) return;
    ctx.save();
    const px = (p.x - minX + PAD) * fitScale;
    const py = (p.y - minY + PAD) * fitScale;
    ctx.translate(px, py);
    const s = p.scale * fitScale;
    ctx.scale(s, s);
    ctx.translate(-250, -250);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 20;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    src.strokes.forEach(st => ctx.stroke(new Path2D(st.path)));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH;
    src.strokes.forEach(st => ctx.stroke(new Path2D(st.path)));
    ctx.restore();
  });
  return canvas.toDataURL();
}

const WordCards = forwardRef(function WordCards({ onDeploy, isOverTrash, setTrashHover, onNewCard }, ref) {
  const [cards, setCards] = useState(loadCards);
  const [previews, setPreviews] = useState(loadPreviews);
  const dragRef = useRef(null);
  const [dragCard, setDragCard] = useState(null);

  // 부모(FreeComposeMode)에서 직접 카드 추가할 수 있게 expose
  useImperativeHandle(ref, () => ({
    addCardDirect(name, previewImg) {
      const next = [...cards, name];
      setCards(next);
      saveCards(next);
      if (previewImg) {
        setPreviews(prev => {
          const np = { ...prev, [name]: previewImg };
          savePreviews(np);
          return np;
        });
      }
    },
    updatePreview(word, dataUrl) {
      setPreviews(prev => {
        const next = { ...prev, [word]: dataUrl };
        savePreviews(next);
        return next;
      });
    }
  }), [cards]);

  const removeCard = useCallback((idx) => {
    const word = cards[idx];
    const next = cards.filter((_, i) => i !== idx);
    setCards(next);
    saveCards(next);
    const np = { ...previews };
    delete np[word];
    setPreviews(np);
    savePreviews(np);
  }, [cards, previews]);

  const handleDeploy = useCallback((jamos, word, dropX, dropY) => {
    if (onDeploy) {
      const updatePreview = (w, img) => {
        setPreviews(prev => {
          const next = { ...prev, [w]: img };
          savePreviews(next);
          return next;
        });
      };
      onDeploy(jamos, word, updatePreview, dropX, dropY);
    }
  }, [onDeploy]);

  const startDrag = useCallback((word, idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    dragRef.current = { word, idx, startX: x, startY: y, moved: false };
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
      if (setTrashHover && isOverTrash) setTrashHover(isOverTrash(x, y));
    }
    function onEnd(e) {
      if (!dragRef.current) return;
      const d = dragRef.current;
      dragRef.current = null;
      setDragCard(null);
      if (setTrashHover) setTrashHover(false);

      let x, y;
      if (e.changedTouches) { x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY; }
      else { x = e.clientX; y = e.clientY; }

      if (d.moved && isOverTrash && isOverTrash(x, y)) {
        removeCard(d.idx);
        return;
      }
      if (d.moved && y < window.innerHeight - 200) {
        const jamos = decomposeWord(d.word);
        if (jamos.length > 0) handleDeploy(jamos, d.word, x, y);
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
      <div className="word-tray">
        {cards.map((word, i) => (
          <div
            key={`${word}-${i}`}
            className="word-card"
            onTouchStart={(e) => startDrag(word, i, e)}
            onMouseDown={(e) => startDrag(word, i, e)}
          >
            {previews[word] ? (
              <img className="word-card-preview" src={previews[word]} draggable={false} />
            ) : (
              <span className="word-card-placeholder">{word}</span>
            )}
          </div>
        ))}
        <div className="word-card word-card--add" onClick={onNewCard}>
          <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.7)' }}>+</span>
        </div>
      </div>

      {dragCard && (
        <div className="word-drag-ghost" style={{ left: dragCard.x, top: dragCard.y }}>
          {previews[dragCard.word] ? (
            <img src={previews[dragCard.word]} style={{ height: 60 }} draggable={false} />
          ) : dragCard.word}
        </div>
      )}
    </>
  );
});

export default WordCards;
