// WordCards.jsx — 낱말카드 (하단 카드, 실제 배치 미리보기, 드래그 배치/삭제)
import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { decomposeWord } from '../utils/jamo.js';

const STORAGE_KEY = 'jina-word-cards';
const PREVIEW_KEY = 'jina-word-previews';

// 기본 카드용 미리보기 — 가이드 스트로크로 ㄱㄴㄷ / ㅏㅑ 렌더링
function renderDefaultCardPreview(items) {
  const CELL = 50;
  const PAD = 6;
  const W = items.length * CELL + PAD * 2;
  const H = CELL + PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  items.forEach((item, i) => {
    ctx.save();
    ctx.translate(PAD + i * CELL + CELL / 2, PAD + CELL / 2);
    const s = CELL / 500;
    ctx.scale(s, s);
    ctx.translate(-250, -250);
    ctx.strokeStyle = 'rgba(80,160,220,0.3)';
    ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 10;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    item.strokes.forEach(st => ctx.stroke(new Path2D(st.path)));
    ctx.strokeStyle = 'rgba(60,140,200,0.8)';
    ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH - 10;
    item.strokes.forEach(st => ctx.stroke(new Path2D(st.path)));
    ctx.restore();
  });
  return canvas.toDataURL();
}

let _defaultPreviews = null;
function getDefaultPreviews() {
  if (!_defaultPreviews) {
    _defaultPreviews = {
      consonants: renderDefaultCardPreview(CONSONANTS),
      vowels: renderDefaultCardPreview(VOWELS),
    };
  }
  return _defaultPreviews;
}

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
// 배치 미리보기 — 글자 크기 비율 유지, 고정 스케일로 렌더링
const PREVIEW_SCALE = 0.35; // 원본 대비 미리보기 축소 비율 (고정)

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
  const PAD = 10;
  const bw = maxX - minX + PAD * 2;
  const bh = maxY - minY + PAD * 2;
  const W = Math.ceil(bw * PREVIEW_SCALE);
  const H = Math.ceil(bh * PREVIEW_SCALE);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  pieces.forEach(p => {
    const src = p.source || getJamoSource(p.char);
    if (!src) return;
    ctx.save();
    ctx.translate((p.x - minX + PAD) * PREVIEW_SCALE, (p.y - minY + PAD) * PREVIEW_SCALE);
    ctx.scale(p.scale * PREVIEW_SCALE, p.scale * PREVIEW_SCALE);
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

const WordCards = forwardRef(function WordCards({ onDeploy, isOverTrash, setTrashHover, onNewCard, onPlaceAll }, ref) {
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

  const startDrag = useCallback((word, idx, e, opts = {}) => {
    e.preventDefault();
    e.stopPropagation();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    dragRef.current = { word, idx, startX: x, startY: y, moved: false, ...opts };
    setDragCard({ word, x, y });
  }, []);

  const CARD_ZONE_W = 130; // 카드존 너비 (사이드)

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

      // 휴지통 위 → 카드 삭제 (기본 카드는 삭제 불가)
      if (d.moved && isOverTrash && isOverTrash(x, y)) {
        if (d.isDefault) {
          // 기본 카드는 삭제 불가
          return;
        }
        removeCard(d.idx);
        return;
      }
      // 카드존 밖으로 나갔을 때만 배치
      if (d.moved && x > CARD_ZONE_W && x < window.innerWidth - CARD_ZONE_W) {
        if (d.type === 'consonants') {
          if (onPlaceAll) onPlaceAll(CONSONANTS);
        } else if (d.type === 'vowels') {
          if (onPlaceAll) onPlaceAll(VOWELS);
        } else {
          const jamos = decomposeWord(d.word);
          if (jamos.length > 0) handleDeploy(jamos, d.word, x, y);
        }
      }
      // 카드존 안에서 놓으면 아무것도 안 함 (원위치 복귀)
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

  // 사이드 카드 세로 배치 위치
  function sideCardStyle(i, total) {
    const seed = i * 137.5 + 42;
    const spacing = 80;
    const startY = 60;
    const y = startY + i * spacing + Math.sin(seed) * 10;
    const x = 10 + Math.cos(seed * 2.3) * 8;
    const rot = Math.sin(seed * 1.7) * 6;
    return { left: x, top: y, transform: `rotate(${rot}deg)`, zIndex: i };
  }

  // 카드를 좌우로 나눠 배치
  const leftCards = cards.filter((_, i) => i % 2 === 0);
  const rightCards = cards.filter((_, i) => i % 2 === 1);
  const leftIndices = cards.map((_, i) => i).filter(i => i % 2 === 0);
  const rightIndices = cards.map((_, i) => i).filter(i => i % 2 === 1);

  return (
    <>
      {/* 왼쪽 카드존 — 기본 카드(자음) + 사용자 카드 */}
      <div className="word-tray word-tray--left">
        <div className="word-card word-card--default" style={sideCardStyle(0, leftCards.length + 1)}
          onTouchStart={(e) => startDrag('자음', -1, e, { type: 'consonants', isDefault: true })}
          onMouseDown={(e) => startDrag('자음', -1, e, { type: 'consonants', isDefault: true })}>
          <img className="word-card-preview" src={getDefaultPreviews().consonants} draggable={false} />
        </div>
        {leftCards.map((word, li) => {
          const origIdx = leftIndices[li];
          return (
            <div key={`${word}-${origIdx}`} className="word-card" style={sideCardStyle(li + 1, leftCards.length + 1)}
              onTouchStart={(e) => startDrag(word, origIdx, e)} onMouseDown={(e) => startDrag(word, origIdx, e)}>
              {previews[word] ? <img className="word-card-preview" src={previews[word]} draggable={false} />
                : <span className="word-card-placeholder">{word}</span>}
            </div>
          );
        })}
      </div>
      {/* 오른쪽 카드존 — 기본 카드(모음) + 사용자 카드 + 추가 버튼 */}
      <div className="word-tray word-tray--right">
        <div className="word-card word-card--default" style={sideCardStyle(0, rightCards.length + 2)}
          onTouchStart={(e) => startDrag('모음', -1, e, { type: 'vowels', isDefault: true })}
          onMouseDown={(e) => startDrag('모음', -1, e, { type: 'vowels', isDefault: true })}>
          <img className="word-card-preview" src={getDefaultPreviews().vowels} draggable={false} />
        </div>
        {rightCards.map((word, ri) => {
          const origIdx = rightIndices[ri];
          return (
            <div key={`${word}-${origIdx}`} className="word-card" style={sideCardStyle(ri + 1, rightCards.length + 2)}
              onTouchStart={(e) => startDrag(word, origIdx, e)} onMouseDown={(e) => startDrag(word, origIdx, e)}>
              {previews[word] ? <img className="word-card-preview" src={previews[word]} draggable={false} />
                : <span className="word-card-placeholder">{word}</span>}
            </div>
          );
        })}
        <div className="word-card word-card--add" style={sideCardStyle(rightCards.length + 1, rightCards.length + 2)} onClick={onNewCard}>
          <span style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.7)' }}>+</span>
        </div>
      </div>

      {dragCard && (() => {
        const escaped = dragCard.x > CARD_ZONE_W && dragCard.x < window.innerWidth - CARD_ZONE_W;
        return (
          <div
            className={`word-drag-ghost ${escaped ? 'word-drag-ghost--escaped' : ''}`}
            style={{ left: dragCard.x, top: dragCard.y }}
          >
            <div className="word-drag-card">
              {previews[dragCard.word] ? (
                <img className="word-card-preview" src={previews[dragCard.word]} draggable={false} />
              ) : <span className="word-card-placeholder">{dragCard.word}</span>}
            </div>
          </div>
        );
      })()}
    </>
  );
});

export default WordCards;
