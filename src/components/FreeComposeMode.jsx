// FreeComposeMode.jsx — 자유 배치 모드 (만들기2)
// 드래그해서 놓으면 바로 따라쓰기, 빈 공간 드래그 = 캔버스 이동, 선택 글자 강조

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { initSvgHelper } from '../TracingEngine.js';
import { getSource, pieceOverrides } from '../sourceOverrides.js';
import TracePiece from './TracePiece.jsx';
import WordCards, { renderLayoutPreview } from './WordCards.jsx';
import DraggableRemote from './DraggableRemote.jsx';
import TrashZone from './TrashZone.jsx';
import MathQuizModal from './MathQuizModal.jsx';
import useCanvasNavigation from '../hooks/useCanvasNavigation.js';
import usePiecesManager from '../hooks/usePiecesManager.js';
import useDragFromPanel from '../hooks/useDragFromPanel.js';
import useKeyboardInput from '../hooks/useKeyboardInput.js';
import { recordCompletion, getRecommendedChar, getLearningStats } from '../utils/learningData.js';
import { playCelebrate } from '../sound.js';
import '../../css/free-compose.css';

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

export default function FreeComposeMode({ onGameMode }) {
  const [fireSkin, setFireSkin] = useState(false); // 소방관 스킨 모드
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'normal' | 'hard'
  const [elephantPos, setElephantPos] = useState(null); // 코끼리 위치 (소화기 따라다님)
  const fireTargetIdRef = useRef(null); // 현재 불이 붙은 글자 ID (완성 전까지 유지)
  const [gridOn, setGridOn] = useState(false);
  const [cardEditMode, setCardEditMode] = useState(false);
  const wordCardsRef = useRef(null);
  const [trashHover, setTrashHover] = useState(false);
  const [panSmooth, setPanSmooth] = useState(false);
  const GRID_SIZE = 100;

  // ── 별 카운터 ──
  const [starCount, setStarCount] = useState(() => getLearningStats().totalStars);
  const [starPop, setStarPop] = useState(false);
  const todayPlacedRef = useRef(false); // 오늘의 글자 중복 방지

  useEffect(() => { initSvgHelper(); }, []);

  const allChars = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = c; });
    VOWELS.forEach(v => { map[v.char] = v; });
    return map;
  }, []);

  // ── 공유 ref: dragNewRef (Hook 1, 3에서 공유) ──
  const dragNewRef = useRef(null);
  // ── 공유 ref: onPanStart 콜백 (Hook 1→Hook 2 연결용) ──
  const onPanStartRef = useRef(null);

  // ── Hook 1: 캔버스 네비게이션 ──
  const {
    panOffset, setPanOffset,
    zoom, setZoom,
    focusZoom, setFocusZoom,
    panLocked, setPanLocked,
    mathQuiz, setMathQuiz,
    panLayerRef,
    panOffsetRef, zoomRef,
    onNearGoal,
    handleLockClick,
    handleQuizAnswer,
    startPan,
  } = useCanvasNavigation({
    dragNewRef,
    onPanStart: () => { if (onPanStartRef.current) onPanStartRef.current(); },
  });

  // ── Hook 2: 글자 조각 관리 ──
  const {
    pieces, setPieces,
    selectedId, setSelectedId,
    selectedGroup, setSelectedGroup,
    groupIdCounter,
    nextIdRef,
    placeNewPiece, placeNewPieceRef,
    getNextPlacePos, getNextPlacePosRef,
    markDone, selectPiece, resetDone, deletePiece,
    ungroupPiece, movePiece, resetAll, undoReset,
    findNextPiece, placeAll,
    autoQueueRef, autoQueueType, setAutoQueueType,
  } = usePiecesManager({ zoom, panOffset, setPanOffset, panOffsetRef, zoomRef, gridOn });

  // onPanStart → setSelectedId(null) 연결
  onPanStartRef.current = () => setSelectedId(null);

  // ── 글자 완성 콜백 (별 카운터 연동) ──
  const handlePieceDone = useCallback((pieceId, char) => {
    markDone(pieceId);
    recordCompletion(char, 0);
    setStarCount(prev => {
      const next = prev + 1;
      if (next % 5 === 0) playCelebrate();
      return next;
    });
    setStarPop(true);
    setTimeout(() => setStarPop(false), 400);
  }, [markDone]);

  // ── 오늘의 글자 자동 배치 (앱 시작 시 1회) ──
  useEffect(() => {
    if (todayPlacedRef.current) return;
    if (pieces.length > 0) return;
    todayPlacedRef.current = true;
    const allCharList = [...CONSONANTS, ...VOWELS].map(c => c.char);
    const recommended = getRecommendedChar(allCharList);
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const x = (screenCX - panOffset.x) / zoom;
    const y = (screenCY - panOffset.y) / zoom;
    placeNewPiece(recommended, x, y, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hook 3: 드래그 from 패널 ──
  const {
    dragNew, lastPressedChar, setLastPressedChar,
    dragGhostRef,
    startDragNew,
  } = useDragFromPanel({ panOffsetRef, zoomRef, getNextPlacePosRef, placeNewPieceRef, dragNewRef });

  // ── Hook 4: 키보드 입력 ──
  const {
    kbMode, setKbMode,
    kbInputRef,
    bboxCache,
    handleKbInput, handleCompositionStart, handleCompositionEnd,
  } = useKeyboardInput({ allChars, groupIdCounter, placeNewPiece, getNextPlacePos, placeNewPieceRef, getNextPlacePosRef, cardEditMode });

  const updateSource = useCallback((pieceId, char, newStrokes) => {
    pieceOverrides[pieceId] = { char, strokes: newStrokes };
  }, []);

  const jamoImages = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = renderJamoImage(c); });
    VOWELS.forEach(v => { map[v.char] = renderJamoImage(v); });
    return map;
  }, []);

  // ── 현재 캔버스를 낱말카드로 저장 ──
  const saveCanvasAsCard = useCallback(() => {
    if (pieces.length === 0) return;
    const cardName = pieces.map(p => p.char).join('');
    const previewPieces = pieces.map(p => ({ ...p, done: false, source: getSource(p.char, p.id) }));
    const img = renderLayoutPreview(previewPieces);
    saveWordLayout(cardName, pieces.map(p => ({ char: p.char, x: p.x, y: p.y, scale: p.scale })));
    if (wordCardsRef.current) wordCardsRef.current.addCardDirect(cardName, img);
  }, [pieces]);

  // ── 낱말카드에서 자모 배치 ──
  const deployWord = useCallback((jamos, word, updatePreview, dropX, dropY) => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const cx = ((dropX || screenCX) - panOffset.x) / zoom;
    const cy = ((dropY || screenCY) - panOffset.y) / zoom;
    const saved = loadWordLayout(word);
    let newPieces;
    if (saved && saved.length > 0 && saved[0].char) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = saved.map(s => ({ id: nextIdRef.current++, char: s.char, word, x: s.x + offX, y: s.y + offY, scale: s.scale, done: false }));
    } else if (saved && saved.length === jamos.length) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = jamos.map((char, i) => ({ id: nextIdRef.current++, char, word, x: saved[i].x + offX, y: saved[i].y + offY, scale: saved[i].scale, done: false }));
    } else {
      const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (jamos.length - 1) * gap;
      newPieces = jamos.map((char, i) => ({ id: nextIdRef.current++, char, word, x: cx - totalW / 2 + i * gap, y: cy, scale, done: false }));
    }
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(newPieces[0].id);
  }, [pieces, panOffset, zoom, nextIdRef, setPieces, setSelectedId]);

  const isOverTrash = useCallback((cx, cy) => {
    const el = document.getElementById('trash-zone'); if (!el) return false;
    const r = el.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }, []);

  const editingCardRef = useRef(null);

  const startCardEdit = useCallback(() => {
    editingCardRef.current = null;
    resetAll(); setCardEditMode(true);
  }, [resetAll]);

  const startEditExistingCard = useCallback((word, cardIdx) => {
    editingCardRef.current = { word, cardIdx };
    // 현재 pieces 백업 후 클리어
    setPieces([]);
        setSelectedId(null);
    setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
    // 저장된 레이아웃 로드
    const saved = loadWordLayout(word);
    const chars = word.split('');
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    let newPieces;
    if (saved && saved.length > 0 && saved[0].char) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      newPieces = saved.map(s => ({ id: nextIdRef.current++, char: s.char, x: s.x - avgX + screenCX, y: s.y - avgY + screenCY, scale: s.scale, done: false }));
    } else if (saved && saved.length === chars.length) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      newPieces = chars.map((char, i) => ({ id: nextIdRef.current++, char, x: saved[i].x - avgX + screenCX, y: saved[i].y - avgY + screenCY, scale: saved[i].scale, done: false }));
    } else {
      const scale = 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (chars.length - 1) * gap;
      newPieces = chars.map((char, i) => ({ id: nextIdRef.current++, char, x: screenCX - totalW / 2 + i * gap, y: screenCY, scale, done: false }));
    }
    setPieces(newPieces);
    if (newPieces.length > 0) setSelectedId(newPieces[0].id);
    setCardEditMode(true);
  }, [nextIdRef, setPieces, setSelectedId, setPanOffset]);

  const finishCardEdit = useCallback(() => {
    if (pieces.length === 0) {
      // 편집 중 기존 카드 삭제 (글자 다 지운 경우)
      if (editingCardRef.current && wordCardsRef.current) {
        wordCardsRef.current.removeCardByName(editingCardRef.current.word);
      }
      editingCardRef.current = null;
      setCardEditMode(false);
      return;
    }
    const cardName = pieces.map(p => p.char).join('');
    const previewPieces = pieces.map(p => ({ ...p, done: false, source: getSource(p.char, p.id) }));
    const img = renderLayoutPreview(previewPieces);
    saveWordLayout(cardName, pieces.map(p => ({ char: p.char, x: p.x, y: p.y, scale: p.scale })));
    if (editingCardRef.current && wordCardsRef.current) {
      // 기존 카드 갱신
      wordCardsRef.current.updateCard(editingCardRef.current.word, cardName, img);
    } else if (wordCardsRef.current) {
      // 새 카드 추가
      wordCardsRef.current.addCardDirect(cardName, img);
    }
    editingCardRef.current = null;
    setPieces([]); nextIdRef.current = Date.now(); setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
    setCardEditMode(false);
  }, [pieces, nextIdRef, setPieces, setSelectedId, setPanOffset]);

  // 그룹 blob SVG 데이터 메모이제이션
  const groupBlobData = useMemo(() => {
    const groups = {};
    pieces.forEach(p => { if (p.groupId) { if (!groups[p.groupId]) groups[p.groupId] = []; groups[p.groupId].push(p); } });
    return Object.entries(groups).map(([gid, gpieces]) => {
      const circles = [];
      gpieces.forEach(p => {
        const bb = bboxCache[p.char];
        if (!bb) return;
        const s = p.scale;
        circles.push({ cx: p.x, cy: p.y, rx: (bb.w / 2) * s + 8, ry: (bb.h / 2) * s + 8 });
      });
      if (circles.length === 0) return null;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      circles.forEach(c => { minX = Math.min(minX, c.cx - c.rx); maxX = Math.max(maxX, c.cx + c.rx); minY = Math.min(minY, c.cy - c.ry); maxY = Math.max(maxY, c.cy + c.ry); });
      const pad = 15;
      return { gid, circles, ox: minX - pad, oy: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    }).filter(Boolean);
  }, [pieces, bboxCache]);

  return (
    <div className={`free-fullscreen ${fireSkin ? 'free-fullscreen--fire' : ''}`} onMouseDown={startPan} onTouchStart={startPan}>
      <div ref={panLayerRef} className={`free-pan-layer ${panSmooth ? 'free-pan-layer--smooth' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {gridOn && <div className="grid-overlay" style={{ backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` }} />}
        {/* 그룹 테두리 — 메모이제이션된 데이터 사용 */}
        {groupBlobData.map(({ gid, circles, ox, oy, w, h }) => (
          <svg key={`g${gid}`} className="group-blob" style={{ left: ox, top: oy, width: w, height: h }}>
            <defs>
              <filter id={`blob${gid}`}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" />
              </filter>
            </defs>
            <g filter={`url(#blob${gid})`}>
              {circles.map((c, i) => (
                <ellipse key={i} cx={c.cx - ox} cy={c.cy - oy} rx={c.rx} ry={c.ry} fill="rgba(255,255,255,0.12)" />
              ))}
            </g>
          </svg>
        ))}
        {(() => {
          // 소방관 스킨: 현재 타겟이 완성되거나 없어졌을 때만 다음 글자로 이동
          let fireTargetId = null;
          if (fireSkin) {
            const currentTarget = pieces.find(p => p.id === fireTargetIdRef.current && !p.done);
            if (currentTarget) {
              fireTargetId = currentTarget.id; // 현재 타겟 유지
            } else {
              const next = pieces.find(p => !p.done);
              fireTargetId = next ? next.id : null;
              fireTargetIdRef.current = fireTargetId;
            }
          }
          // 뷰포트 바깥 글자는 렌더링 건너뜀 (선택/불 타겟은 항상 렌더)
          const vw = window.innerWidth, vh = window.innerHeight;
          const margin = 300; // px 여유
          return pieces.map(piece => {
            const screenX = piece.x * zoom + panOffset.x;
            const screenY = piece.y * zoom + panOffset.y;
            const pieceSize = 500 * (piece.scale ?? 0.5) * zoom;
            const inView = screenX + pieceSize > -margin && screenX - margin < vw + margin
                        && screenY + pieceSize > -margin && screenY - margin < vh + margin;
            if (!inView && piece.id !== selectedId && piece.id !== fireTargetId) {
              // 화면 밖: 자리만 잡는 빈 div (위치는 그대로 유지)
              return <div key={piece.id} style={{ position: 'absolute', left: piece.x, top: piece.y, width: 1, height: 1 }} />;
            }
            return (
            <TracePiece
              key={piece.id} piece={piece} selected={piece.id === selectedId}
              inputLocked={panSmooth || panLocked}
              onDone={() => handlePieceDone(piece.id, piece.char)}
              onResetDone={() => resetDone(piece.id)}
              onDelete={() => deletePiece(piece.id)}
              isOverTrash={isOverTrash} setTrashHover={setTrashHover}
              onSelect={() => selectPiece(piece.id)}
              onUngroup={piece.groupId ? () => ungroupPiece(piece.groupId) : null}
              onNearGoal={(near) => onNearGoal(near, piece)}
              focusZoom={focusZoom}
              fireSkin={piece.id === fireTargetId}
              fireTheme={fireSkin}
              difficulty={difficulty}
              onHandlerMove={piece.id === fireTargetId ? setElephantPos : undefined}
              onSourceUpdate={(ns) => updateSource(piece.id, piece.char, ns)}
              onMoved={(nx, ny) => movePiece(piece.id, nx, ny)}
            />
          )});
        })()}
      </div>

      <DraggableRemote startY={window.innerHeight - 130}>
        <div className="remote-row">
          <div className={`remote-btn remote-btn--all${autoQueueType === 'consonant' ? ' remote-btn--all-active' : ''}`} onClick={() => placeAll(CONSONANTS, 'consonant')}>ALL</div>
          {CONSONANTS.map(c => (
            <div key={c.char}
              className={`remote-btn${lastPressedChar === c.char ? ' remote-btn--last' : ''}${autoQueueType ? ' remote-btn--disabled' : ''}`}
              onTouchStart={autoQueueType ? undefined : (e) => { setLastPressedChar(c.char); startDragNew(c.char, 'jamo', e); }}
              onMouseDown={autoQueueType ? undefined : (e) => { setLastPressedChar(c.char); startDragNew(c.char, 'jamo', e); }}
            >{c.char}</div>
          ))}
        </div>
        <div className="remote-row">
          <div className={`remote-btn remote-btn--all${autoQueueType === 'vowel' ? ' remote-btn--all-active' : ''}`} onClick={() => placeAll(VOWELS, 'vowel')}>ALL</div>
          {VOWELS.map(v => (
            <div key={v.char}
              className={`remote-btn${lastPressedChar === v.char ? ' remote-btn--last' : ''}${autoQueueType ? ' remote-btn--disabled' : ''}`}
              onTouchStart={autoQueueType ? undefined : (e) => { setLastPressedChar(v.char); startDragNew(v.char, 'jamo', e); }}
              onMouseDown={autoQueueType ? undefined : (e) => { setLastPressedChar(v.char); startDragNew(v.char, 'jamo', e); }}
            >{v.char}</div>
          ))}
        </div>
      </DraggableRemote>

      {cardEditMode && pieces.length === 0 && <div className="free-center-hint">카드 만들기 · 글자를 배치하고 완료를 누르세요</div>}

      <div style={{ display: cardEditMode ? 'none' : undefined }}>
        <WordCards ref={wordCardsRef} onDeploy={deployWord} isOverTrash={isOverTrash} setTrashHover={setTrashHover} onNewCard={startCardEdit} onSaveCanvas={saveCanvasAsCard} onEditCard={startEditExistingCard} onPlaceAll={placeAll} />
      </div>

      {cardEditMode && <button className="card-edit-done-btn" onClick={finishCardEdit}>완료</button>}

      {/* 상단 중앙 컨트롤 바 */}
      <div className="left-controls">
        <TrashZone trashHover={trashHover} onClearAll={resetAll} onUndo={undoReset} />
        <div className={`zoom-btn ${panLocked ? 'zoom-btn--active' : ''}`} onClick={handleLockClick}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {panLocked
              ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
              : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>
            }
          </svg>
        </div>
        <div className="ctrl-divider" />
        <div className={`zoom-btn ${gridOn ? 'zoom-btn--active' : ''}`} onClick={() => setGridOn(g => !g)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="4" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/>
            <line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="20" x2="20" y2="20"/>
          </svg>
        </div>
        <div className={`zoom-btn ${focusZoom ? 'zoom-btn--active' : ''}`} onClick={() => setFocusZoom(f => !f)} title="도착지 자동 확대">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
        {[1, 1.5, 2].map(z => (
          <div key={z} className={`zoom-btn ${Math.abs(zoom - z) < 0.05 ? 'zoom-btn--active' : ''}`}
            onClick={() => {
              const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
              const newPanX = cx - (cx - panOffset.x) * (z / zoom);
              const newPanY = cy - (cy - panOffset.y) * (z / zoom);
              setZoom(z); setPanOffset({ x: newPanX, y: newPanY });
            }}>
            x{z === 1.5 ? '1.5' : z}
          </div>
        ))}
        <div className="ctrl-divider" />
        {!fireSkin && <div className={`zoom-btn ${kbMode ? 'zoom-btn--active' : ''}`}
          onClick={() => setKbMode(k => !k)} title="키보드 입력 모드">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/>
            <line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/>
            <line x1="8" y1="16" x2="16" y2="16"/>
          </svg>
        </div>}
        <div className="ctrl-divider" />
        <div className={`zoom-btn ${fireSkin ? 'zoom-btn--active' : ''}`} onClick={() => setFireSkin(f => {
          if (!f) {
            setKbMode(false);
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=${encodeURIComponent('불이야! 불을 꺼주자!')}`;
            new Audio(url).play().catch(() => {});
          }
          // 모드 전환 시 캔버스 비우기
          setPieces([]);
          setElephantPos(null);
          fireTargetIdRef.current = null;
          return !f;
        })} title="소방관 스킨">🔥</div>
        <div className="ctrl-divider" />
        <div className="difficulty-btn" onClick={() => setDifficulty(d => d === 'easy' ? 'normal' : d === 'normal' ? 'hard' : 'easy')}>
          {difficulty === 'easy' ? 'EASY' : difficulty === 'normal' ? 'NORMAL' : 'HARD'}
        </div>
        <div className="ctrl-divider" />
        <div className={`star-counter${starPop ? ' star-counter--pop' : ''}`}>
          ★ {starCount}
        </div>
      </div>

      {/* 키보드 조합 입력 모드 — 숨겨진 input */}
      {kbMode && (
        <input
          ref={kbInputRef}
          className="kb-hidden-input"
          autoFocus
          onInput={handleKbInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={() => setKbMode(false)}
        />
      )}

      {dragNew && jamoImages[dragNew.char] && (
        <img ref={dragGhostRef} className="drag-ghost-img" src={jamoImages[dragNew.char]} style={{ left: dragNew.x, top: dragNew.y }} draggable={false} />
      )}

      <MathQuizModal quiz={mathQuiz} onAnswer={handleQuizAnswer} onClose={() => setMathQuiz(null)} />

      {/* 소방관 코끼리 — 소화기 따라다님, 없으면 왼쪽 아래 */}
      {fireSkin && (
        <div className={`firefighter-char ${elephantPos ? 'firefighter-char--follow' : ''}`}
          style={elephantPos ? { left: elephantPos.x - 220, top: elephantPos.y - 140 } : undefined}>
          <img className="firefighter-img" src="icons/firefighter-elephant.png" draggable={false} />
        </div>
      )}
      {/* 코끼리가 화면 밖일 때 — 사라진 방향에 호버 버튼 */}
      {fireSkin && (() => {
        const targetPiece = pieces.find(p => p.id === fireTargetIdRef.current && !p.done);
        if (!targetPiece) return null;
        const screenX = targetPiece.x * zoom + panOffset.x;
        const screenY = targetPiece.y * zoom + panOffset.y;
        const vw = window.innerWidth, vh = window.innerHeight;
        const margin = 100;
        const isOffScreen = screenX < -margin || screenX > vw + margin || screenY < -margin || screenY > vh + margin;
        if (!isOffScreen) return null;
        // 방향 계산
        const cx = vw / 2, cy = vh / 2;
        const dx = screenX - cx, dy = screenY - cy;
        const angle = Math.atan2(dy, dx);
        const edgePad = 40;
        const bx = Math.max(edgePad, Math.min(vw - edgePad, cx + Math.cos(angle) * (vw / 2 - edgePad)));
        const by = Math.max(edgePad, Math.min(vh - edgePad, cy + Math.sin(angle) * (vh / 2 - edgePad)));
        const arrowDeg = angle * (180 / Math.PI);
        return (
          <div className="elephant-beacon" style={{ left: bx, top: by }}
            onClick={() => {
              const newPanX = vw / 2 - targetPiece.x * zoom;
              const newPanY = vh / 2 - targetPiece.y * zoom;
              setPanSmooth(true);
              setPanOffset({ x: newPanX, y: newPanY });
              setTimeout(() => setPanSmooth(false), 400);
            }}>
            <div className="elephant-beacon-arrow" style={{ transform: `rotate(${arrowDeg}deg)` }}>▶</div>
            <img className="elephant-beacon-img" src="icons/firefighter-elephant.png" draggable={false} />
          </div>
        );
      })()}
    </div>
  );
}
