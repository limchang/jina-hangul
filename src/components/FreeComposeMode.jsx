// FreeComposeMode.jsx — 자유 배치 모드 (만들기2)
// 드래그해서 놓으면 바로 따라쓰기, 빈 공간 드래그 = 캔버스 이동, 선택 글자 강조

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { TracingEngine, initSvgHelper, samplePath } from '../TracingEngine.js';
import { ParticleSystem } from '../particles.js';
import { createArrowAnim } from '../arrow.js';
import { playStart, playComplete, playCelebrate, playFail, playSlam, playFloat, playLand } from '../sound.js';
import { ICON_MAP } from '../icon-map.js';
import DragPanel from './DragPanel.jsx';
import VertexEditor from './VertexEditor.jsx';
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

// 자음+모음 통합 배열
const ALL_JAMO = [...CONSONANTS, ...VOWELS];

// Canvas로 가이드 글자 이미지 생성
function renderJamoImage(source) {
  const SIZE = 500;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  ctx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH;
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  return canvas.toDataURL();
}

const DEFAULT_ICON = 'icons/default/character/ChatGPT Image 2026년 3월 26일 오후 12_27_41.png';

function getIconImageUrl(char) {
  if (ICON_MAP[char]) return ICON_MAP[char];
  return DEFAULT_ICON;
}
// 런타임 소스 오버라이드 — piece.id 단위 (새로 꺼내는 글자에는 영향 없음)
const pieceOverrides = {};

function getOriginalSource(char) {
  return CONSONANTS.find(c => c.char === char) || VOWELS.find(v => v.char === char);
}

function getSource(char, pieceId) {
  if (pieceId && pieceOverrides[pieceId]) return pieceOverrides[pieceId];
  return getOriginalSource(char);
}

export default function FreeComposeMode() {
  const [pieces, setPieces] = useState([]);
  const [dragNew, setDragNew] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // 선택된 글자 강조
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // 캔버스 전체 이동
  const updatePreviewRef = useRef(null); // WordCards의 updatePreview 콜백
  const dragNewRef = useRef(null);
  const panStart = useRef(null);

  // word별 배치 & 미리보기 자동 저장
  const syncWordLayout = useCallback((word, allPieces) => {
    if (!word) return;
    const wordPieces = allPieces.filter(p => p.word === word);
    if (wordPieces.length === 0) return;
    saveWordLayout(word, wordPieces.map(p => ({ x: p.x, y: p.y, scale: p.scale })));
    if (updatePreviewRef.current) {
      const img = renderLayoutPreview(wordPieces.map(p => ({
        ...p, source: getSource(p.char, p.id)
      })));
      if (img) updatePreviewRef.current(word, img);
    }
  }, []);

  useEffect(() => { initSvgHelper(); }, []);

  // pieceOverrides 갱신 — 해당 piece만 변경 (다른 piece에 영향 없음)
  const updateSource = useCallback((pieceId, char, newStrokes) => {
    pieceOverrides[pieceId] = { char, strokes: newStrokes };
    const strokesStr = newStrokes.map(s => `{path:'${s.path}'}`).join(', ');
    console.log(`편집 [#${pieceId}]: { char:'${char}', strokes:[${strokesStr}] }`);
  }, []);

  // 가이드 이미지 캐시
  const jamoImages = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = renderJamoImage(c); });
    VOWELS.forEach(v => { map[v.char] = renderJamoImage(v); });
    return map;
  }, []);

  // 마지막 글자 옆에 새 글자 배치할 위치 계산
  const getNextPlacePos = useCallback(() => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    if (pieces.length === 0) {
      return { x: screenCX - panOffset.x, y: screenCY - panOffset.y };
    }
    // 마지막 글자 오른쪽에 배치
    const last = pieces[pieces.length - 1];
    const gap = 500 * last.scale * 0.8; // 글자 크기의 80% 간격
    return { x: last.x + gap, y: last.y };
  }, [pieces, panOffset]);

  // 새 글자 생성 + 캔버스를 새 글자 중심으로 이동
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

  // ALL — 글자 목록 전체를 한 줄로 배치, 포커스는 첫 글자
  const placeAll = useCallback((items) => {
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    const gap = 500 * scale * 0.8;
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;

    // 시작 x: 기존 마지막 글자 오른쪽, 없으면 화면 중앙 기준
    let startX, startY;
    if (pieces.length > 0) {
      const last = pieces[pieces.length - 1];
      startX = last.x + gap;
      startY = last.y;
    } else {
      startX = screenCX;
      startY = screenCY;
    }

    const newPieces = items.map((item, i) => ({
      id: nextId++,
      char: item.char,
      x: startX + i * gap,
      y: startY,
      scale,
      done: false,
    }));

    const firstPiece = newPieces[0];
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(firstPiece.id);
    // 캔버스 센터를 첫 글자로
    setPanOffset({ x: screenCX - firstPiece.x, y: screenCY - firstPiece.y });
  }, [pieces]);

  // ── 낱말카드에서 자모 배치 (배치 기억 + 미리보기 생성) ──
  const deployWord = useCallback((jamos, word, updatePreview) => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;

    // 저장된 배치가 있으면 복원
    const saved = loadWordLayout(word);
    let newPieces;
    if (saved && saved.length === jamos.length) {
      newPieces = jamos.map((char, i) => ({
        id: nextId++, char, word, x: saved[i].x, y: saved[i].y, scale: saved[i].scale, done: false,
      }));
    } else {
      const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (jamos.length - 1) * gap;
      const startX = screenCX - panOffset.x - totalW / 2;
      const y = screenCY - panOffset.y;
      newPieces = jamos.map((char, i) => ({
        id: nextId++, char, word, x: startX + i * gap, y, scale, done: false,
      }));
    }

    const firstPiece = newPieces[0];
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(firstPiece.id);
    setPanOffset({ x: screenCX - firstPiece.x, y: screenCY - firstPiece.y });

    // 배치 저장
    saveWordLayout(word, newPieces.map(p => ({ x: p.x, y: p.y, scale: p.scale })));
    // updatePreview 콜백 저장
    if (updatePreview) updatePreviewRef.current = updatePreview;
    // 미리보기 생성
    if (updatePreview) {
      const previewImg = renderLayoutPreview(newPieces);
      if (previewImg) updatePreview(word, previewImg);
    }
  }, [pieces, panOffset]);

  // ── 패널에서 클릭 or 드래그 ──
  const dragMovedRef = useRef(false);

  const startDragNew = useCallback((char, type, e) => {
    e.preventDefault();
    e.stopPropagation();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
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
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
      else { x = e.clientX; y = e.clientY; }
      const d = dragNewRef.current;
      if (d && (Math.abs(x - d.startX) > 10 || Math.abs(y - d.startY) > 10)) {
        dragMovedRef.current = true;
      }
      dragNewRef.current = { ...dragNewRef.current, x, y };
      setDragNew({ ...dragNewRef.current });
    }
    function onEnd(e) {
      const d = dragNewRef.current;
      if (!d) return;
      dragNewRef.current = null;
      setDragNew(null);

      // touch 이벤트 후 mouse 이벤트 중복 방지
      if (e.type === 'mouseup' && d.wasTouch) return;

      if (!dragMovedRef.current) {
        // 클릭! → 마지막 글자 옆에 배치
        const pos = getNextPlacePos();
        placeNewPiece(d.char, pos.x, pos.y);
      } else {
        // 드래그 → 놓은 위치에 배치 (휴지통 위면 무시)
        let x, y;
        if (e.changedTouches) { x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY; }
        else { x = e.clientX; y = e.clientY; }
        placeNewPiece(d.char, x - panOffset.x, y - panOffset.y, false);
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
  }, [!!dragNew]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 빈 공간 드래그 = 캔버스 패닝 ──
  const startPan = useCallback((e) => {
    // 리모컨/글자 위에서는 패닝 무시
    if (e.target.closest('.free-trace-wrap')) return;
    if (e.target.closest('.remote')) return;
    if (e.target.closest('.free-bottom-bar')) return;
    if (e.target.closest('.trash-zone')) return;
    if (dragNewRef.current) return;
    e.preventDefault();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    panStart.current = { startX: x, startY: y, origX: panOffset.x, origY: panOffset.y };
    setSelectedId(null); // 빈 곳 누르면 선택 해제
  }, [panOffset]);

  useEffect(() => {
    if (!panStart.current) return;
    function onMove(e) {
      if (!panStart.current) return;
      e.preventDefault();
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
      else { x = e.clientX; y = e.clientY; }
      const ps = panStart.current;
      setPanOffset({ x: ps.origX + (x - ps.startX), y: ps.origY + (y - ps.startY) });
    }
    function onEnd() { panStart.current = null; }
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
  });

  const resetAll = useCallback(() => {
    setPieces([]); nextId = 1; setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
  }, []);

  const [trashHover, setTrashHover] = useState(false); // 휴지통 위에 있는지

  // 휴지통 hit test
  const isOverTrash = useCallback((cx, cy) => {
    const trashEl = document.getElementById('trash-zone');
    if (!trashEl) return false;
    const rect = trashEl.getBoundingClientRect();
    return cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
  }, []);

  const [panSmooth, setPanSmooth] = useState(false); // 부드러운 이동 중

  // 오른쪽 우선, 그 다음 아래쪽으로 가장 가까운 미완성 글자 찾기
  const findNextPiece = useCallback((donePiece, candidates) => {
    if (candidates.length === 0) return null;
    const ROW_THRESHOLD = 100; // 같은 행으로 판단하는 y 오차 범위
    const cx = donePiece.x, cy = donePiece.y;

    // 1) 오른쪽에 있는 글자 (같은 행: y 차이 < threshold, x > 현재)
    const rightSame = candidates
      .filter(p => Math.abs(p.y - cy) < ROW_THRESHOLD && p.x > cx)
      .sort((a, b) => a.x - b.x);
    if (rightSame.length > 0) return rightSame[0];

    // 2) 아래쪽 행에 있는 글자 (y > 현재 + threshold)
    const belowRows = candidates
      .filter(p => p.y > cy + ROW_THRESHOLD)
      .sort((a, b) => {
        // y가 같은 행이면 x 오름차순, 아니면 y 오름차순
        if (Math.abs(a.y - b.y) < ROW_THRESHOLD) return a.x - b.x;
        return a.y - b.y;
      });
    if (belowRows.length > 0) return belowRows[0];

    // 3) 같은 행의 왼쪽, 또는 위쪽 행 — 그냥 가장 가까운 거리
    const rest = candidates.sort((a, b) => {
      const da = Math.hypot(a.x - cx, a.y - cy);
      const db = Math.hypot(b.x - cx, b.y - cy);
      return da - db;
    });
    return rest[0];
  }, []);

  const markDone = useCallback((id) => {
    setPieces(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, done: true } : p);
      const donePiece = updated.find(p => p.id === id);
      const candidates = updated.filter(p => !p.done);
      const next = donePiece ? findNextPiece(donePiece, candidates) : null;
      if (next) {
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        // 다음 글자가 화면 안에 이미 보이면 선택만 (패닝 안 함)
        const nextScreenX = next.x + panOffset.x;
        const nextScreenY = next.y + panOffset.y;
        const margin = 150;
        const inView = nextScreenX > margin && nextScreenX < window.innerWidth - margin
                     && nextScreenY > margin && nextScreenY < window.innerHeight - margin;
        if (inView) {
          setTimeout(() => setSelectedId(next.id), 500);
        } else {
          setTimeout(() => {
            setPanSmooth(true);
            setPanOffset({ x: screenCX - next.x, y: screenCY - next.y });
            setSelectedId(next.id);
          }, 500); // slamDown(0.3s) 완료 후 이동
          setTimeout(() => setPanSmooth(false), 1100);
        }
      }
      // 낱말 배치 & 미리보기 동기화
      if (donePiece?.word) {
        setTimeout(() => syncWordLayout(donePiece.word, updated), 600);
      }
      return updated;
    });
  }, [findNextPiece, panOffset, syncWordLayout]);

  const selectPiece = useCallback((id) => {
    setSelectedId(id);
  }, []);

  return (
    <div
      className="free-fullscreen"
      onMouseDown={startPan}
      onTouchStart={startPan}
    >
      {/* 패닝되는 레이어 — 전체 화면 */}
      <div className={`free-pan-layer ${panSmooth ? 'free-pan-layer--smooth' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
        {pieces.map(piece => (
          <TracePiece
            key={piece.id}
            piece={piece}
            selected={piece.id === selectedId}
            onDone={() => markDone(piece.id)}
            onDelete={() => { delete pieceOverrides[piece.id]; setPieces(prev => prev.filter(p => p.id !== piece.id)); }}
            isOverTrash={isOverTrash}
            setTrashHover={setTrashHover}
            onSelect={() => selectPiece(piece.id)}
            onSourceUpdate={(newStrokes) => updateSource(piece.id, piece.char, newStrokes)}
            onMoved={(newX, newY) => {
              setPieces(prev => {
                const updated = prev.map(p => p.id === piece.id ? { ...p, x: newX, y: newY } : p);
                if (piece.word) syncWordLayout(piece.word, updated);
                return updated;
              });
            }}
          />
        ))}
      </div>

      {/* 플로팅 리모컨 — 자음+모음 통합 (좌) */}
      <div className="remote remote--left">
        <div className="remote-label">글자</div>
        <div className="remote-list">
          {ALL_JAMO.map(j => (
            <div key={j.char} className="remote-btn"
              onTouchStart={(e) => startDragNew(j.char, 'jamo', e)}
              onMouseDown={(e) => startDragNew(j.char, 'jamo', e)}
            >{j.char}</div>
          ))}
          <div className="remote-btn remote-btn--all"
            onClick={() => placeAll(ALL_JAMO)}
          >ALL</div>
        </div>
      </div>

      {/* 상단 힌트 */}
      <div className="free-top-hint">
        {pieces.length === 0 ? '글자를 끌어서 배치하거나, 아래 낱말카드를 올려보세요' : '따라쓰기 · 빈곳=이동 · 꾹=편집'}
      </div>

      {/* 낱말카드 (하단) */}
      <WordCards onDeploy={deployWord} isOverTrash={isOverTrash} setTrashHover={setTrashHover} />

      {/* 휴지통 — 드래그 삭제 + 롱프레스 모두 지우기 */}
      <TrashZone
        trashHover={trashHover}
        onClearAll={resetAll}
      />

      {/* 드래그 고스트 */}
      {dragNew && jamoImages[dragNew.char] && (
        <img
          className="drag-ghost-img"
          src={jamoImages[dragNew.char]}
          style={{ left: dragNew.x, top: dragNew.y }}
          draggable={false}
        />
      )}
    </div>
  );
}

// ── 개별 글자 따라쓰기 컴포넌트 ──
function TracePiece({ piece, selected, onDone, onDelete, onSelect, isOverTrash, setTrashHover, onSourceUpdate, onMoved }) {
  const source = getSource(piece.char, piece.id);
  const [editMode, setEditMode] = useState(false); // 롱프레스로 활성화되는 꼭지점 편집 모드
  const guideRef = useRef(null);
  const arrowRef = useRef(null);
  const traceRef = useRef(null);
  const overlayRef = useRef(null);
  const engineRef = useRef(null);
  const particleRef = useRef(new ParticleSystem());
  const stateRef = useRef({ strokeIdx: 0, completed: [], inited: false });
  const particleAnimRef = useRef(null);
  const arrowAnimRef = useRef(null); // 독립 화살표 애니메이션 인스턴스
  const wrapRef = useRef(null);
  const moveStartRef = useRef(null);
  const movedRef = useRef(false);
  const longPressRef = useRef(null);
  const [unlocked, setUnlocked] = useState(false); // 완성 글자 롱프레스 해제
  const [localPos, setLocalPos] = useState({ x: piece.x, y: piece.y });

  // 선택 해제되면 편집 모드 끄기
  useEffect(() => {
    if (!selected) setEditMode(false);
  }, [selected]);


  // 편집 모드 해제 시 가이드+화살표+아이콘 복원 + 따라쓰기 리셋
  const prevEditMode = useRef(false);
  useEffect(() => {
    if (prevEditMode.current && !editMode && stateRef.current.inited) {
      // 편집 끝 → 따라쓰기 진행 리셋 + 최신 source로 복원
      stateRef.current.completed = [];
      stateRef.current.strokeIdx = 0;
      const src = getSource(piece.char, piece.id);
      if (src && engineRef.current) {
        loadStrokeWith(0, src);
      }
    }
    prevEditMode.current = editMode;
  }, [editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const SIZE = 500;
  const pixelSize = SIZE * piece.scale;

  useEffect(() => {
    if (!source || stateRef.current.inited) return;
    stateRef.current.inited = true;
    const gCanvas = guideRef.current, aCanvas = arrowRef.current, tCanvas = traceRef.current;
    gCanvas.width = aCanvas.width = tCanvas.width = SIZE;
    gCanvas.height = aCanvas.height = tCanvas.height = SIZE;
    engineRef.current = new TracingEngine(tCanvas.getContext('2d'), APP_CONFIG);
    drawGuide();
    loadStroke(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 항상 최신 source를 getSource()로 가져와서 그리기
  // hideStartDot: 편집 모드일 때 시작점 초록 점 숨김
  function drawGuideWith(src, hideStartDot) {
    const gCtx = guideRef.current?.getContext('2d');
    if (!gCtx || !src) return;
    const S = stateRef.current;
    gCtx.clearRect(0, 0, SIZE, SIZE);
    gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
    gCtx.lineCap = 'round'; gCtx.lineJoin = 'round'; gCtx.setLineDash([]);
    src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    gCtx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
    gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH;
    src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    S.completed.forEach(pts => {
      gCtx.beginPath(); gCtx.strokeStyle = APP_CONFIG.TRACE_COLOR;
      gCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
      gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
      gCtx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) gCtx.lineTo(p.x, p.y);
      gCtx.stroke();
    });
    if (!hideStartDot && S.strokeIdx < src.strokes.length) {
      const pts = samplePath(src.strokes[S.strokeIdx].path, 80);
      if (pts.length >= 2) {
        gCtx.beginPath(); gCtx.arc(pts[0].x, pts[0].y, 12, 0, Math.PI * 2);
        gCtx.fillStyle = '#44ee88'; gCtx.fill();
        gCtx.strokeStyle = '#fff'; gCtx.lineWidth = 3; gCtx.stroke();
      }
    }
  }

  function drawGuide() { drawGuideWith(getSource(piece.char, piece.id)); }

  function loadStrokeWith(idx, src) {
    stateRef.current.strokeIdx = idx;
    const stroke = src.strokes[idx];
    if (!stroke) return;
    const isClosed = stroke.path.includes('A') || piece.char === 'ㅁ' || piece.char === 'ㅇ';
    engineRef.current.setStroke(stroke.path, isClosed);
    drawGuideWith(src); renderTrace(); setupIcons();
    if (arrowAnimRef.current) arrowAnimRef.current.stop();
    arrowAnimRef.current = createArrowAnim(engineRef.current.pts, arrowRef.current.getContext('2d'), SIZE, SIZE);
  }

  function loadStroke(idx) { loadStrokeWith(idx, getSource(piece.char, piece.id)); }

  // 최신 source로 전체 복원 (편집 후, sourceVer 변경 시)
  function redrawAll() {
    const src = getSource(piece.char, piece.id);
    if (!src) return;
    drawGuideWith(src);
    const S = stateRef.current;
    if (S.strokeIdx < src.strokes.length && engineRef.current) {
      loadStrokeWith(S.strokeIdx, src);
    }
  }

  function renderTrace() {
    const tCtx = traceRef.current.getContext('2d');
    tCtx.clearRect(0, 0, SIZE, SIZE);
    engineRef.current.draw();
    particleRef.current.draw(tCtx);
  }

  function setupIcons() {
    const ol = overlayRef.current; if (!ol) return;
    const targetSvg = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,235,80,0.8)" stroke-width="3"/><circle cx="20" cy="20" r="6" fill="rgba(255,235,80,0.9)"/></svg>`;
    ol.innerHTML = `<div class="target-icon free-target">${targetSvg}</div><img class="character-handler" src="${getIconImageUrl(piece.char)}" onerror="this.src='${DEFAULT_ICON}'">`;
    updateIcons();
  }
  function updateIcons() {
    const ol = overlayRef.current; if (!ol || !engineRef.current?.pts) return;
    const handler = ol.querySelector('.character-handler');
    const target = ol.querySelector('.target-icon');
    if (!handler || !target) return;
    const hp = engineRef.current.getHandlerPos(), tp = engineRef.current.getTargetPos();
    handler.style.left = `${(hp.x/SIZE)*100}%`; handler.style.top = `${(hp.y/SIZE)*100}%`;
    target.style.left = `${(tp.x/SIZE)*100}%`; target.style.top = `${(tp.y/SIZE)*100}%`;
  }

  function startPLoop() {
    function loop() { particleRef.current.update(); renderTrace(); particleAnimRef.current = requestAnimationFrame(loop); }
    if (!particleAnimRef.current) particleAnimRef.current = requestAnimationFrame(loop);
  }
  function stopPLoop() { if (particleAnimRef.current) { cancelAnimationFrame(particleAnimRef.current); particleAnimRef.current = null; } }

  function completeStroke() {
    const S = stateRef.current;
    S.completed.push([...engineRef.current.pts]); S.strokeIdx++;
    if (S.strokeIdx >= source.strokes.length) {
      if (arrowAnimRef.current) { arrowAnimRef.current.stop(); arrowAnimRef.current = null; }
      overlayRef.current.innerHTML = '';
      particleRef.current.celebrate(SIZE/2, SIZE/2); startPLoop();
      playCelebrate();
      // 쾅! 박히기 — onDone 먼저, 파티클은 계속
      setTimeout(() => {
        onDone();
        playSlam();
      }, 150);
      // 파티클은 넉넉히 돌고 나서 정리
      setTimeout(() => stopPLoop(), 2000);
    } else { loadStroke(S.strokeIdx); }
  }

  // 터치/마우스 — 시작점 근처=따라쓰기, 그 외=이동
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;

    function getPos(e) {
      let cx, cy;
      if (e.touches?.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      const rect = traceRef.current.getBoundingClientRect();
      return { x: (cx-rect.left)*(SIZE/rect.width), y: (cy-rect.top)*(SIZE/rect.height) };
    }

    // 글자 모양 히트 테스트 — samplePath로 거리 기반 체크 (isPointInStroke보다 안정적)
    function isOnGlyph(canvasPos) {
      const hitDist = (APP_CONFIG.GUIDE_STROKE_WIDTH + 80) / 2;
      const src = getSource(piece.char, piece.id);
      for (const s of src.strokes) {
        const pts = samplePath(s.path, 40);
        for (const pt of pts) {
          if (Math.hypot(canvasPos.x - pt.x, canvasPos.y - pt.y) < hitDist) return true;
        }
      }
      return false;
    }

    function onDown(e) {
      if (e.touches?.length > 1) return;
      // 편집 모드에서는 VertexEditor가 이벤트 처리 — 여기선 무시
      if (editMode) return;
      e.stopPropagation();

      const cPos = getPos(e);

      // 글자 위가 아니면 무시 (빈 공간 → 캔버스 패닝으로 전달)
      if (!isOnGlyph(cPos)) return;

      e.preventDefault();
      onSelect();
      movedRef.current = false;

      // 따라쓰기 시도
      if (engineRef.current && !piece.done) {
        if (engineRef.current.start(cPos.x, cPos.y)) {
          playStart();
          if (arrowAnimRef.current) { arrowAnimRef.current.stop(); arrowAnimRef.current = null; }
          particleRef.current.burst(cPos.x, cPos.y, 6); startPLoop(); renderTrace(); updateIcons();
          const h = overlayRef.current?.querySelector('.character-handler');
          if (h) h.style.transform = 'translate(-50%,-50%) scale(1.15) rotate(5deg)';
          return;
        }
      }

      // 롱프레스 → 꼭지점 편집 모드 (미완성/완료 모두)
      {
        let cx, cy;
        if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        longPressRef.current = setTimeout(() => {
          playFloat();
          longPressRef.current = null;
          setEditMode(true);
        }, 500);
        // 완료된 글자: 짧은 터치 = 이동 해제
        if (piece.done) {
          moveStartRef.current = { startX: cx, startY: cy, origX: localPos.x, origY: localPos.y };
          return;
        }
        // 미완성 글자: 짧은 터치 = 이동
        moveStartRef.current = { startX: cx, startY: cy, origX: localPos.x, origY: localPos.y };
      }
    }

    function onMove(e) {
      // 롱프레스 대기 중 움직이면 취소
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }

      if (engineRef.current?.isTracing) {
        e.preventDefault(); e.stopPropagation();
        const cPos = getPos(e);
        engineRef.current.move(cPos.x, cPos.y);
        particleRef.current.emit(cPos.x, cPos.y); renderTrace(); updateIcons();
        return;
      }
      if (!moveStartRef.current) return;
      e.preventDefault(); e.stopPropagation();
      let cx, cy;
      if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      movedRef.current = true;
      const ms = moveStartRef.current;
      setLocalPos({ x: ms.origX + (cx-ms.startX), y: ms.origY + (cy-ms.startY) });
      setTrashHover(isOverTrash(cx, cy));
    }

    function onUp(e) {
      if (e.touches?.length > 0) return;
      // 롱프레스 타이머 정리
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
      setTrashHover(false);
      if (unlocked) playLand();
      setUnlocked(false);

      // 이동 중이었고 휴지통 위에 놓으면 삭제
      if (moveStartRef.current && movedRef.current) {
        let cx, cy;
        if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        if (isOverTrash(cx, cy)) {
          moveStartRef.current = null;
          onDelete();
          return;
        }
      }

      if (engineRef.current?.isTracing) {
        const h = overlayRef.current?.querySelector('.character-handler');
        if (h) h.style.transform = 'translate(-50%,-50%)';
        if (engineRef.current.end()) {
          playComplete(); particleRef.current.burst(engineRef.current.getTargetPos().x, engineRef.current.getTargetPos().y, 15);
          completeStroke();
        } else {
          playFail(); stopPLoop(); renderTrace(); updateIcons();
          if (arrowAnimRef.current) arrowAnimRef.current.stop();
    arrowAnimRef.current = createArrowAnim(engineRef.current.pts, arrowRef.current.getContext('2d'), SIZE, SIZE);
        }
        return;
      }
      // 이동 완료 → 부모에 알림 (배치 기억)
      if (moveStartRef.current && movedRef.current && onMoved) {
        onMoved(localPos.x, localPos.y);
      }
      moveStartRef.current = null;
    }

    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    wrap.addEventListener('touchstart', onDown, { passive: false });
    wrap.addEventListener('touchmove', onMove, { passive: false });
    wrap.addEventListener('touchend', onUp, { passive: false });
    window.addEventListener('touchend', onUp, { passive: false });
    return () => {
      wrap.removeEventListener('mousedown', onDown);
      wrap.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      wrap.removeEventListener('touchstart', onDown);
      wrap.removeEventListener('touchmove', onMove);
      wrap.removeEventListener('touchend', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [localPos, piece.done, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!source) return null;

  // 편집 모드에서 꼭지점 변경 시 — 가이드를 최신 strokes로 즉시 다시 그림 (초록 점 숨김)
  const handleVertexUpdate = useCallback((newStrokes) => {
    if (onSourceUpdate) onSourceUpdate(newStrokes);
    drawGuideWith({ strokes: newStrokes }, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      className={`free-trace-wrap ${piece.done ? 'free-trace-wrap--done' : ''} ${selected ? 'free-trace-wrap--selected' : ''} ${unlocked ? 'free-trace-wrap--unlocked' : ''} ${editMode ? 'free-trace-wrap--editing' : ''}`}
      style={{
        left: localPos.x, top: localPos.y,
        width: pixelSize, height: pixelSize,
      }}
    >
      <canvas ref={guideRef} className="free-trace-layer" />
      <canvas ref={arrowRef} className="free-trace-layer" style={{ zIndex: 2, display: editMode ? 'none' : undefined }} />
      <canvas ref={traceRef} className="free-trace-layer" style={{ zIndex: 3, display: editMode ? 'none' : undefined }} />
      <div ref={overlayRef} className="free-trace-layer free-trace-overlay" style={{ zIndex: 4, display: editMode ? 'none' : undefined }} />
      {editMode && (
        <VertexEditor
          source={getSource(piece.char, piece.id)}
          onUpdate={handleVertexUpdate}
        />
      )}
    </div>
  );
}

// ── 휴지통 컴포넌트 — 롱프레스로 모두 지우기 ──
function TrashZone({ trashHover, onClearAll }) {
  const [showSlide, setShowSlide] = useState(false);
  const longRef = useRef(null);

  const onDown = (e) => {
    e.stopPropagation();
    longRef.current = setTimeout(() => {
      setShowSlide(true);
      longRef.current = null;
    }, 600);
  };
  const onUp = () => {
    if (longRef.current) { clearTimeout(longRef.current); longRef.current = null; }
  };

  const handleSlideConfirm = () => {
    onClearAll();
    setShowSlide(false);
  };

  return (
    <>
      <div
        id="trash-zone"
        className={`trash-zone ${trashHover ? 'trash-zone--hover' : ''}`}
        onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchEnd={onUp}
      >
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
              <div className="clear-all-btn clear-all-btn--confirm" onClick={handleSlideConfirm}>모두 지우기</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
