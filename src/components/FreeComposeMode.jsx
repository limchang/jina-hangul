// FreeComposeMode.jsx — 자유 배치 모드 (만들기2)
// 드래그해서 놓으면 바로 따라쓰기, 빈 공간 드래그 = 캔버스 이동, 선택 글자 강조

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { initSvgHelper } from '../TracingEngine.js';
import { getSource, pieceOverrides } from '../sourceOverrides.js';
import TracePiece from './TracePiece.jsx';
import WordCards, { renderLayoutPreview } from './WordCards.jsx';

let nextId = 1;

// 배치 기억 — 낱말별 글자 위치 저장
const LAYOUT_KEY = 'jina-word-layouts';
function loadWordLayout(word) {
  try {
    const all = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return all[word] || null;
  } catch { return null; }
}
function saveWordLayout(word, layout) {
  try {
    const all = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    all[word] = layout;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch {}
}

// Canvas로 가이드 글자 이미지 생성
function renderJamoImage(source) {
  const SIZE = 500;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  // 흰색 배경선
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  // 노란 점선 가이드
  ctx.strokeStyle = 'rgba(255,200,0,0.55)';
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 14]);
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  ctx.setLineDash([]);
  return canvas.toDataURL();
}

export default function FreeComposeMode() {
  const [pieces, setPieces] = useState([]);
  const [dragNew, setDragNew] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panLocked, setPanLocked] = useState(false);
  const [cardEditMode, setCardEditMode] = useState(false);
  const wordCardsRef = useRef(null);
  const dragNewRef = useRef(null);
  const panStart = useRef(null);
  const pinchRef = useRef(null);

  useEffect(() => { initSvgHelper(); }, []);

  // ── 휠 줌 ──
  useEffect(() => {
    function onWheel(e) {
      if (e.target.closest('.remote') || e.target.closest('.word-tray')) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setZoom(z => Math.min(3, Math.max(0.3, z * delta)));
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // ── 핀치 줌 ──
  useEffect(() => {
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        pinchRef.current = { startDist: d, startZoom: zoom };
      }
    }
    function onTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const scale = d / pinchRef.current.startDist;
        setZoom(Math.min(3, Math.max(0.3, pinchRef.current.startZoom * scale)));
      }
    }
    function onTouchEnd() { pinchRef.current = null; }
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom]);

  const updateSource = useCallback((pieceId, char, newStrokes) => {
    pieceOverrides[pieceId] = { char, strokes: newStrokes };
  }, []);

  const jamoImages = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = renderJamoImage(c); });
    VOWELS.forEach(v => { map[v.char] = renderJamoImage(v); });
    return map;
  }, []);

  const getNextPlacePos = useCallback(() => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    if (pieces.length === 0) return { x: screenCX - panOffset.x, y: screenCY - panOffset.y };
    const last = pieces[pieces.length - 1];
    const gap = 500 * last.scale * 0.8;
    return { x: last.x + gap, y: last.y };
  }, [pieces, panOffset]);

  const placeNewPiece = useCallback((char, x, y, focus = true) => {
    const newId = nextId++;
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    setPieces(prev => [...prev, { id: newId, char, x, y, scale, done: false }]);
    setSelectedId(newId);
    if (focus) {
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;
      setPanOffset({ x: screenCX - x, y: screenCY - y });
    }
  }, [pieces]);

  const placeAll = useCallback((items) => {
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    const gap = 500 * scale * 0.8;
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    let startX, startY;
    if (pieces.length > 0) { const last = pieces[pieces.length - 1]; startX = last.x + gap; startY = last.y; }
    else { startX = screenCX; startY = screenCY; }
    const newPieces = items.map((item, i) => ({ id: nextId++, char: item.char, x: startX + i * gap, y: startY, scale, done: false }));
    const firstPiece = newPieces[0];
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(firstPiece.id);
    setPanOffset({ x: screenCX - firstPiece.x, y: screenCY - firstPiece.y });
  }, [pieces]);

  // ── 낱말카드에서 자모 배치 ──
  const deployWord = useCallback((jamos, word, updatePreview, dropX, dropY) => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const cx = (dropX || screenCX) - panOffset.x;
    const cy = (dropY || screenCY) - panOffset.y;
    const saved = loadWordLayout(word);
    let newPieces;
    if (saved && saved.length > 0 && saved[0].char) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = saved.map(s => ({ id: nextId++, char: s.char, word, x: s.x + offX, y: s.y + offY, scale: s.scale, done: false }));
    } else if (saved && saved.length === jamos.length) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = jamos.map((char, i) => ({ id: nextId++, char, word, x: saved[i].x + offX, y: saved[i].y + offY, scale: saved[i].scale, done: false }));
    } else {
      const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (jamos.length - 1) * gap;
      newPieces = jamos.map((char, i) => ({ id: nextId++, char, word, x: cx - totalW / 2 + i * gap, y: cy, scale, done: false }));
    }
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(newPieces[0].id);
  }, [pieces, panOffset]);

  // ── 패널에서 클릭 or 드래그 ──
  const dragMovedRef = useRef(false);
  const startDragNew = useCallback((char, type, e) => {
    e.preventDefault(); e.stopPropagation();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
    const wasTouch = !!e.touches;
    dragNewRef.current = { char, type, x, y, startX: x, startY: y, wasTouch };
    dragMovedRef.current = false;
    setDragNew({ char, type, x, y });
  }, []);

  useEffect(() => {
    if (!dragNew) return;
    function onMove(e) {
      e.preventDefault();
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
      const d = dragNewRef.current;
      if (d && (Math.abs(x - d.startX) > 10 || Math.abs(y - d.startY) > 10)) dragMovedRef.current = true;
      dragNewRef.current = { ...dragNewRef.current, x, y };
      setDragNew({ ...dragNewRef.current });
    }
    function onEnd(e) {
      const d = dragNewRef.current; if (!d) return;
      dragNewRef.current = null; setDragNew(null);
      if (e.type === 'mouseup' && d.wasTouch) return;
      // 놓은 위치가 리모컨 위면 취소
      let ex, ey;
      if (e.changedTouches) { ex = e.changedTouches[0].clientX; ey = e.changedTouches[0].clientY; } else { ex = e.clientX; ey = e.clientY; }
      const remoteEl = document.querySelector('.remote');
      if (remoteEl) {
        const r = remoteEl.getBoundingClientRect();
        if (ex >= r.left && ex <= r.right && ey >= r.top && ey <= r.bottom) return; // 취소
      }
      if (!dragMovedRef.current) {
        const pos = getNextPlacePos(); placeNewPiece(d.char, pos.x, pos.y);
      } else {
        placeNewPiece(d.char, ex - panOffset.x, ey - panOffset.y, false);
      }
    }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchend', onEnd); window.removeEventListener('mouseup', onEnd); };
  }, [!!dragNew]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 빈 공간 드래그 = 캔버스 패닝 ──
  const startPan = useCallback((e) => {
    if (e.target.closest('.free-trace-wrap') || e.target.closest('.remote') || e.target.closest('.trash-zone') || e.target.closest('.word-tray') || e.target.closest('.word-card') || e.target.closest('.canvas-lock')) return;
    if (dragNewRef.current || panLocked) return;
    e.preventDefault();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
    panStart.current = { startX: x, startY: y, origX: panOffset.x, origY: panOffset.y };
    setSelectedId(null);
  }, [panOffset]);

  useEffect(() => {
    if (!panStart.current) return;
    function onMove(e) {
      if (!panStart.current) return; e.preventDefault();
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
      const ps = panStart.current;
      setPanOffset({ x: ps.origX + (x - ps.startX), y: ps.origY + (y - ps.startY) });
    }
    function onEnd() { panStart.current = null; }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchend', onEnd); window.removeEventListener('mouseup', onEnd); };
  });

  const resetAll = useCallback(() => {
    setPieces([]); nextId = 1; setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
  }, []);

  const startCardEdit = useCallback(() => {
    resetAll(); setCardEditMode(true);
  }, [resetAll]);

  const finishCardEdit = useCallback(() => {
    if (pieces.length === 0) { setCardEditMode(false); return; }
    const cardName = pieces.map(p => p.char).join('');
    const previewPieces = pieces.map(p => ({ ...p, done: false, source: getSource(p.char, p.id) }));
    const img = renderLayoutPreview(previewPieces);
    saveWordLayout(cardName, pieces.map(p => ({ char: p.char, x: p.x, y: p.y, scale: p.scale })));
    if (wordCardsRef.current) wordCardsRef.current.addCardDirect(cardName, img);
    setPieces([]); nextId = 1; setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
    setCardEditMode(false);
  }, [pieces]);

  const [trashHover, setTrashHover] = useState(false);
  const isOverTrash = useCallback((cx, cy) => {
    const el = document.getElementById('trash-zone'); if (!el) return false;
    const r = el.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }, []);

  const [panSmooth, setPanSmooth] = useState(false);

  const findNextPiece = useCallback((donePiece, candidates) => {
    if (candidates.length === 0) return null;
    const T = 100, cx = donePiece.x, cy = donePiece.y;
    const right = candidates.filter(p => Math.abs(p.y - cy) < T && p.x > cx).sort((a, b) => a.x - b.x);
    if (right.length > 0) return right[0];
    const below = candidates.filter(p => p.y > cy + T).sort((a, b) => Math.abs(a.y - b.y) < T ? a.x - b.x : a.y - b.y);
    if (below.length > 0) return below[0];
    return candidates.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
  }, []);

  const markDone = useCallback((id) => {
    setPieces(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, done: true } : p);
      const donePiece = updated.find(p => p.id === id);
      const candidates = updated.filter(p => !p.done);
      const next = donePiece ? findNextPiece(donePiece, candidates) : null;
      if (next) {
        const screenCX = window.innerWidth / 2, screenCY = window.innerHeight / 2;
        const nsx = next.x + panOffset.x, nsy = next.y + panOffset.y;
        const inView = nsx > 150 && nsx < window.innerWidth - 150 && nsy > 150 && nsy < window.innerHeight - 150;
        if (inView) { setTimeout(() => setSelectedId(next.id), 500); }
        else {
          setTimeout(() => { setPanSmooth(true); setPanOffset({ x: screenCX - next.x, y: screenCY - next.y }); setSelectedId(next.id); }, 500);
          setTimeout(() => setPanSmooth(false), 1100);
        }
      }
      return updated;
    });
  }, [findNextPiece, panOffset]);

  const selectPiece = useCallback((id) => setSelectedId(id), []);

  return (
    <div className="free-fullscreen" onMouseDown={startPan} onTouchStart={startPan}>
      <div className={`free-pan-layer ${panSmooth ? 'free-pan-layer--smooth' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {pieces.map(piece => (
          <TracePiece
            key={piece.id} piece={piece} selected={piece.id === selectedId}
            onDone={() => markDone(piece.id)}
            onResetDone={() => setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, done: false } : p))}
            onDelete={() => { delete pieceOverrides[piece.id]; setPieces(prev => prev.filter(p => p.id !== piece.id)); }}
            isOverTrash={isOverTrash} setTrashHover={setTrashHover}
            onSelect={() => selectPiece(piece.id)}
            onSourceUpdate={(ns) => updateSource(piece.id, piece.char, ns)}
            onMoved={(nx, ny) => setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, x: nx, y: ny } : p))}
          />
        ))}
      </div>

      <DraggableRemote startY={window.innerHeight - 130}>
        <div className="remote-row">
          {CONSONANTS.map(c => (
            <div key={c.char} className="remote-btn" onTouchStart={(e) => startDragNew(c.char, 'jamo', e)} onMouseDown={(e) => startDragNew(c.char, 'jamo', e)}>{c.char}</div>
          ))}
        </div>
        <div className="remote-row">
          {VOWELS.map(v => (
            <div key={v.char} className="remote-btn" onTouchStart={(e) => startDragNew(v.char, 'jamo', e)} onMouseDown={(e) => startDragNew(v.char, 'jamo', e)}>{v.char}</div>
          ))}
        </div>
      </DraggableRemote>

      <div className="free-top-hint">
        {cardEditMode ? '카드 만들기 · 글자를 배치하고 완료를 누르세요'
          : pieces.length === 0 ? '글자를 배치하거나, 아래 카드를 올려보세요' : '따라쓰기 · 빈곳=이동 · 꾹=편집'}
      </div>

      <div style={{ display: cardEditMode ? 'none' : undefined }}>
        <WordCards ref={wordCardsRef} onDeploy={deployWord} isOverTrash={isOverTrash} setTrashHover={setTrashHover} onNewCard={startCardEdit} onPlaceAll={placeAll} />
      </div>

      {cardEditMode && <button className="card-edit-done-btn" onClick={finishCardEdit}>완료</button>}

      {/* 캔버스 잠금 버튼 (좌하단) — 휴지통과 동일 디자인 */}
      <div className={`canvas-lock ${panLocked ? 'canvas-lock--on' : ''}`} onClick={() => setPanLocked(l => !l)}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {panLocked
            ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
            : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>
          }
        </svg>
      </div>

      <TrashZone trashHover={trashHover} onClearAll={resetAll} />

      {dragNew && jamoImages[dragNew.char] && (
        <img className="drag-ghost-img" src={jamoImages[dragNew.char]} style={{ left: dragNew.x, top: dragNew.y }} draggable={false} />
      )}
    </div>
  );
}

// ── 드래그 이동 가능한 리모컨 래퍼 ──
function DraggableRemote({ children, startY = 10 }) {
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

// ── 휴지통 ──
function TrashZone({ trashHover, onClearAll }) {
  const [showSlide, setShowSlide] = useState(false);
  const longRef = useRef(null);
  const onDown = (e) => { e.stopPropagation(); longRef.current = setTimeout(() => { setShowSlide(true); longRef.current = null; }, 600); };
  const onUp = () => { if (longRef.current) { clearTimeout(longRef.current); longRef.current = null; } };
  return (
    <>
      <div id="trash-zone" className={`trash-zone ${trashHover ? 'trash-zone--hover' : ''}`}
        onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchEnd={onUp}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </div>
      {showSlide && (
        <div className="clear-all-overlay" onClick={() => setShowSlide(false)}>
          <div className="clear-all-card" onClick={(e) => e.stopPropagation()}>
            <p>모두 지울까요?</p>
            <div className="clear-all-actions">
              <div className="clear-all-btn clear-all-btn--cancel" onClick={() => setShowSlide(false)}>취소</div>
              <div className="clear-all-btn clear-all-btn--confirm" onClick={() => { onClearAll(); setShowSlide(false); }}>모두 지우기</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
