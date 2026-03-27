// TracePiece.jsx — 개별 글자 따라쓰기 컴포넌트
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../data.js';
import { TracingEngine, samplePath } from '../TracingEngine.js';
import { ParticleSystem } from '../particles.js';

import { playStart, playComplete, playCelebrate, playFail, playSlam, playFloat, playLand, startWobbleSound, stopWobbleSound, setWobbleIntensity } from '../sound.js';
import { ICON_MAP } from '../icon-map.js';
import { getSource } from '../sourceOverrides.js';
import VertexEditor from './VertexEditor.jsx';

const DEFAULT_ICON = 'icons/default/character/ChatGPT Image 2026년 3월 26일 오후 12_27_41.png';

function getIconImageUrl(char) {
  if (ICON_MAP[char]) return ICON_MAP[char];
  return DEFAULT_ICON;
}

export default function TracePiece({ piece, selected, inputLocked, onDone, onResetDone, onDelete, onSelect, isOverTrash, setTrashHover, onSourceUpdate, onMoved }) {
  const source = getSource(piece.char, piece.id);
  const [editMode, setEditMode] = useState(false);
  const guideRef = useRef(null);

  const traceRef = useRef(null);
  const overlayRef = useRef(null);
  const engineRef = useRef(null);
  const particleRef = useRef(new ParticleSystem());
  const stateRef = useRef({ strokeIdx: 0, completed: [], inited: false });
  const particleAnimRef = useRef(null);

  const wrapRef = useRef(null);
  const moveStartRef = useRef(null);
  const movedRef = useRef(false);
  const longPressRef = useRef(null);
  const lastTapRef = useRef(0);
  const [unlocked, setUnlocked] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [localPos, setLocalPos] = useState({ x: piece.x, y: piece.y });

  useEffect(() => {
    if (!selected) setEditMode(false);
  }, [selected]);

  const prevEditMode = useRef(false);
  useEffect(() => {
    if (!prevEditMode.current && editMode && stateRef.current.inited) {
      // 편집 모드 진입 — 따라쓰기 기록 초기화, 캔버스 클리어
      stateRef.current.completed = [];
      stateRef.current.strokeIdx = 0;
      const tCtx = traceRef.current?.getContext('2d');
      if (tCtx) tCtx.clearRect(0, 0, SIZE, SIZE);
      // 가이드도 초기 상태로 다시 그리기 (completed 없이)
      const src = getSource(piece.char, piece.id);
      if (src) drawGuideWith(src, true);
    }
    if (prevEditMode.current && !editMode && stateRef.current.inited) {
      // 편집 모드 종료 — 처음부터 다시 따라쓰기
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
    const gCanvas = guideRef.current, tCanvas = traceRef.current;
    gCanvas.width = tCanvas.width = SIZE;
    gCanvas.height = tCanvas.height = SIZE;
    engineRef.current = new TracingEngine(tCanvas.getContext('2d'), APP_CONFIG);
    drawGuide();
    loadStroke(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function drawGuideWith(src, hideStartDot) {
    const gCtx = guideRef.current?.getContext('2d');
    if (!gCtx || !src) return;
    const S = stateRef.current;
    gCtx.clearRect(0, 0, SIZE, SIZE);
    // 흰색 배경선 (두꺼운 밑선)
    gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
    gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
    gCtx.setLineDash([]);
    src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    // 노란 점선 가이드
    gCtx.strokeStyle = 'rgba(255,200,0,0.55)';
    gCtx.lineWidth = 6;
    gCtx.setLineDash([18, 14]);
    src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    gCtx.setLineDash([]);
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
  }

  function loadStroke(idx) { loadStrokeWith(idx, getSource(piece.char, piece.id)); }

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
    const targetSvg = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,235,80,0.8)" stroke-width="3"/><circle cx="20" cy="20" r="6" fill="rgba(255,235,80,0.9)"/><circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,235,80,0.3)" stroke-width="1.5" stroke-dasharray="4 3"/></svg>`;
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
    const curSource = getSource(piece.char, piece.id);
    S.completed.push([...engineRef.current.pts]); S.strokeIdx++;
    if (S.strokeIdx >= curSource.strokes.length) {
      overlayRef.current.innerHTML = '';
      particleRef.current.celebrate(SIZE/2, SIZE/2); startPLoop();
      playCelebrate();
      setJustDone(true);
      setTimeout(() => { onDone(); playSlam(); }, 150);
      setTimeout(() => setJustDone(false), 600);
      setTimeout(() => stopPLoop(), 2000);
    } else { loadStroke(S.strokeIdx); }
  }

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
      if (editMode || inputLocked) return;
      e.stopPropagation();
      const cPos = getPos(e);
      if (!isOnGlyph(cPos)) return;
      e.preventDefault();
      onSelect();
      movedRef.current = false;

      // 더블탭 — 완료된 글자 따라쓰기 리셋
      const now = Date.now();
      if (piece.done && now - lastTapRef.current < 350) {
        lastTapRef.current = 0;
        if (onResetDone) onResetDone();
        stateRef.current.completed = [];
        stateRef.current.strokeIdx = 0;
        const tCtx = traceRef.current?.getContext('2d');
        if (tCtx) tCtx.clearRect(0, 0, SIZE, SIZE);
        const src = getSource(piece.char, piece.id);
        if (src && engineRef.current) loadStrokeWith(0, src);
        return;
      }
      lastTapRef.current = now;

      if (engineRef.current && !piece.done) {
        if (engineRef.current.start(cPos.x, cPos.y)) {
          playStart();
          particleRef.current.burst(cPos.x, cPos.y, 6); startPLoop(); renderTrace(); updateIcons();
          const h = overlayRef.current?.querySelector('.character-handler');
          if (h) h.style.transform = 'translate(-50%,-50%) scale(1.15) rotate(5deg)';
          return;
        }
      }

      {
        let cx, cy;
        if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        longPressRef.current = setTimeout(() => {
          playFloat();
          longPressRef.current = null;
          // 완료된 글자도 편집 가능 — done 리셋 후 편집 모드 진입
          if (piece.done && onResetDone) onResetDone();
          setEditMode(true);
        }, 500);
        moveStartRef.current = { startX: cx, startY: cy, origX: localPos.x, origY: localPos.y };
      }
    }

    function onMove(e) {
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
      if (engineRef.current?.isTracing) {
        e.preventDefault(); e.stopPropagation();
        const cPos = getPos(e);
        engineRef.current.move(cPos.x, cPos.y);
        particleRef.current.emit(cPos.x, cPos.y); renderTrace(); updateIcons();
        // 경로 이탈 감지 → 즉시 크레센도 위글 + 불안 효과음 + 제자리 복귀
        const opc = engineRef.current.offPathCount || 0;
        const h = overlayRef.current?.querySelector('.character-handler');
        const target = overlayRef.current?.querySelector('.target-icon');
        // 드래그 중 도착지점 항상 강조
        if (target) target.classList.add('target-calling');
        if (opc > 0) {
          const intensity = Math.min(opc / 30, 1); // 0~30 프레임에 걸쳐 0→1
          if (h) {
            h.classList.add('handler-wobble');
            const deg = 4 + intensity * 12; // 4~16도
            h.style.setProperty('--wobble-deg', `${deg}deg`);
            h.style.setProperty('--wobble-speed', `${0.15 - intensity * 0.08}s`); // 0.15→0.07s
          }
          startWobbleSound();
          setWobbleIntensity(intensity);
          // 최대 이탈 → 드래그 강제 해제 + 시작점 복귀
          if (opc > 35) {
            engineRef.current.offPathCount = 0;
            engineRef.current.maxReachedIdx = 0;
            engineRef.current.isTracing = false;
            if (h) { h.classList.remove('handler-wobble'); h.style.transform = 'translate(-50%,-50%)'; }
            stopWobbleSound();
            playFail();
            stopPLoop();
            // 트레이스 캔버스 클리어 + 가이드 다시 그리기 (시작점 표시)
            const tCtx = traceRef.current?.getContext('2d');
            if (tCtx) tCtx.clearRect(0, 0, SIZE, SIZE);
            drawGuide();
            setupIcons();
          }
        } else {
          if (h) h.classList.remove('handler-wobble');
          if (target) target.classList.remove('target-calling');
          stopWobbleSound();
        }
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
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
      setTrashHover(false);
      if (unlocked) playLand();
      setUnlocked(false);

      if (moveStartRef.current && movedRef.current) {
        let cx, cy;
        if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
        else { cx = e.clientX; cy = e.clientY; }
        if (isOverTrash(cx, cy)) { moveStartRef.current = null; onDelete(); return; }
      }

      if (engineRef.current?.isTracing) {
        stopWobbleSound();
        const h = overlayRef.current?.querySelector('.character-handler');
        const tgt = overlayRef.current?.querySelector('.target-icon');
        if (h) { h.classList.remove('handler-wobble'); h.style.transform = 'translate(-50%,-50%)'; }
        if (tgt) tgt.classList.remove('target-calling');
        if (engineRef.current.end()) {
          playComplete(); particleRef.current.burst(engineRef.current.getTargetPos().x, engineRef.current.getTargetPos().y, 15);
          completeStroke();
        } else {
          playFail(); stopPLoop(); renderTrace(); updateIcons();
        }
        return;
      }
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

  const handleVertexUpdate = useCallback((newStrokes) => {
    if (onSourceUpdate) onSourceUpdate(newStrokes);
    drawGuideWith({ strokes: newStrokes }, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={wrapRef}
      className={`free-trace-wrap ${justDone ? 'free-trace-wrap--slam' : piece.done ? 'free-trace-wrap--done' : ''} ${selected ? 'free-trace-wrap--selected' : ''} ${unlocked ? 'free-trace-wrap--unlocked' : ''} ${editMode ? 'free-trace-wrap--editing' : ''}`}
      style={{ left: localPos.x, top: localPos.y, width: pixelSize, height: pixelSize }}
    >
      <canvas ref={guideRef} className="free-trace-layer" />
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
