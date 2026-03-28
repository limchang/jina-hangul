// TracePiece.jsx — 개별 글자 따라쓰기 컴포넌트
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../data.js';
import { TracingEngine, samplePath } from '../TracingEngine.js';
import { ParticleSystem } from '../particles.js';

import { playStart, playComplete, playCelebrate, playFail, playSlam, playFloat, playLand, playFallSound } from '../sound.js';
import { ICON_MAP } from '../icon-map.js';
import { getSource } from '../sourceOverrides.js';
import VertexEditor from './VertexEditor.jsx';

const DEFAULT_ICON = 'icons/default/character/ChatGPT Image 2026년 3월 26일 오후 12_27_41.png';

function getIconImageUrl(char) {
  if (ICON_MAP[char]) return ICON_MAP[char];
  return DEFAULT_ICON;
}

export default function TracePiece({ piece, selected, inputLocked, onDone, onResetDone, onDelete, onSelect, onUngroup, isOverTrash, setTrashHover, onNearGoal, onSourceUpdate, onMoved, focusZoom = true }) {
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
  const hitRef = useRef(null);
  const moveStartRef = useRef(null);
  const movedRef = useRef(false);
  const longPressRef = useRef(null);
  const lastTapRef = useRef(0);
  const failCountRef = useRef(0); // 연속 실패 횟수
  const superModeRef = useRef(false); // 3번 실패 → 슈퍼모드
  const [flyAway, setFlyAway] = useState(false); // 휘우웅 날아가기 애니메이션
  const [unlocked, setUnlocked] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [localPos, setLocalPos] = useState({ x: piece.x, y: piece.y });
  // 부모에서 piece.x/y 변경 시 동기화 (그룹 이동 등)
  useEffect(() => {
    setLocalPos({ x: piece.x, y: piece.y });
  }, [piece.x, piece.y]);

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

  const SIZE = 2000; // 초대형 캔버스 — 어떤 효과도 안 잘림
  const PAD = 750; // 캔버스 패딩 (양쪽)
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
    gCtx.save();
    gCtx.translate(PAD, PAD);
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
    gCtx.restore();
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
    tCtx.save();
    tCtx.translate(PAD, PAD);
    engineRef.current.draw();
    particleRef.current.draw(tCtx);
    tCtx.restore();
  }

  function setupIcons() {
    const ol = overlayRef.current; if (!ol) return;
    const targetSvg = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,235,80,0.8)" stroke-width="3"/><circle cx="20" cy="20" r="6" fill="rgba(255,235,80,0.9)"/></svg>`;
    ol.innerHTML = `<div class="target-icon free-target"><div class="target-echo"></div><div class="target-echo target-echo--delay"></div>${targetSvg}</div><img class="character-handler" src="${getIconImageUrl(piece.char)}" onerror="this.src='${DEFAULT_ICON}'">`;
    updateIcons();
  }
  function updateIcons() {
    const ol = overlayRef.current; if (!ol || !engineRef.current?.pts) return;
    const handler = ol.querySelector('.character-handler');
    const target = ol.querySelector('.target-icon');
    if (!handler || !target) return;
    const hp = engineRef.current.getHandlerPos(), tp = engineRef.current.getTargetPos();
    const dist = Math.hypot(hp.x - tp.x, hp.y - tp.y);
    const halfPx = pixelSize / 2;
    handler.style.left = `${(hp.x + PAD) * piece.scale - halfPx}px`; handler.style.top = `${(hp.y + PAD) * piece.scale - halfPx}px`;
    // 거리에 비례해서 도착지 원 크기 연속 변화 (가까울수록 큼)
    const maxDist = 450;
    const isTracing = engineRef.current.isTracing;
    // ㅇ,ㅁ 등 닫힌 도형: 시작=끝이므로 진행률 70% 이상일 때만 반응
    const progress = engineRef.current.pts?.length > 0 ? engineRef.current.maxReachedIdx / (engineRef.current.pts.length - 1) : 0;
    const isClosed = engineRef.current.isClosedLoop;
    const allowNear = isClosed ? progress > 0.7 : true;
    const proximity = (isTracing && allowNear && focusZoom) ? Math.max(0, 1 - dist / maxDist) : 0;
    const baseSize = 220;
    const maxSize = 700;
    const curSize = baseSize + proximity * (maxSize - baseSize);
    target.style.width = `${curSize}px`;
    const isNear = dist < 150 && isTracing && allowNear && focusZoom;
    if (isNear) {
      handler.classList.add('handler-near-goal');
      target.classList.add('target-near-goal');
    } else {
      handler.classList.remove('handler-near-goal');
      target.classList.remove('target-near-goal');
    }
    // 에코 링: 근접 시에만
    const echos = target.querySelectorAll('.target-echo');
    echos.forEach(e => { e.style.opacity = proximity > 0.2 ? '1' : '0'; e.style.animation = proximity > 0.2 ? `echoShrink ${0.5 + (1 - proximity) * 1.5}s infinite ease-in` : 'none'; });
    if (onNearGoal) onNearGoal(isNear);
    target.style.left = `${(tp.x + PAD) * piece.scale - halfPx}px`; target.style.top = `${(tp.y + PAD) * piece.scale - halfPx}px`;
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
    // 획 성공 → 실패 카운트 리셋, 슈퍼모드 해제
    failCountRef.current = 0;
    superModeRef.current = false;
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
    const wrap = hitRef.current; if (!wrap) return;

    function getPos(e) {
      let cx, cy;
      if (e.touches?.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      const rect = guideRef.current.getBoundingClientRect();
      return { x: (cx-rect.left)*(SIZE/rect.width) - PAD, y: (cy-rect.top)*(SIZE/rect.height) - PAD };
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
      const cPos = getPos(e);
      if (!isOnGlyph(cPos)) {
        // 글자 밖 → pointer-events 끄고 아래 요소에 이벤트 재전달
        const hit = hitRef.current;
        if (hit) {
          hit.style.pointerEvents = 'none';
          let cx, cy;
          if (e.touches?.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
          else { cx = e.clientX; cy = e.clientY; }
          const below = document.elementFromPoint(cx, cy);
          if (below && below !== hit) {
            below.dispatchEvent(new e.constructor(e.type, e));
          }
          setTimeout(() => { if (hit) hit.style.pointerEvents = 'auto'; }, 50);
        }
        return;
      }
      e.stopPropagation();
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
          // 그룹 해제 우선
          if (piece.groupId && onUngroup) { onUngroup(); return; }
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
        // 경로 이탈 감지 → 즉시 캐릭터 날아감 (슈퍼모드면 무시)
        const opc = engineRef.current.offPathCount || 0;
        const target = overlayRef.current?.querySelector('.target-icon');
        if (target) target.classList.add('target-calling');
        if (opc > 3 && !superModeRef.current) {
          // 휘우웅~ 날아가기
          engineRef.current.offPathCount = 0;
          engineRef.current.maxReachedIdx = 0;
          engineRef.current.isTracing = false;
          failCountRef.current++;
          playFallSound();
          stopPLoop();
          if (onNearGoal) onNearGoal(false);
          // 캐릭터 캔버스로 수직 낙하
          setFlyAway(true);
          setTimeout(() => {
            setFlyAway(false);
            const tCtx = traceRef.current?.getContext('2d');
            if (tCtx) tCtx.clearRect(0, 0, SIZE, SIZE);
            drawGuide();
            setupIcons();
            // 3번 실패 → 슈퍼모드 활성화
            if (failCountRef.current >= 3) {
              superModeRef.current = true;
            }
          }, 500);
        } else if (opc === 0) {
          if (target) target.classList.remove('target-calling');
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
        const h = overlayRef.current?.querySelector('.character-handler');
        const tgt = overlayRef.current?.querySelector('.target-icon');
        if (h) { h.style.transform = 'translate(-50%,-50%)'; h.classList.remove('handler-near-goal'); }
        if (tgt) { tgt.classList.remove('target-calling'); tgt.classList.remove('target-near-goal'); }
        if (onNearGoal) onNearGoal(false);
        if (engineRef.current.end()) {
          playComplete(); particleRef.current.burst(engineRef.current.getTargetPos().x, engineRef.current.getTargetPos().y, 15);
          completeStroke();
        } else {
          // 도착지 못 도달 → 실패
          failCountRef.current++;
          if (failCountRef.current >= 3) superModeRef.current = true;
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
      style={{ left: localPos.x, top: localPos.y, width: 0, height: 0 }}
    >
      <canvas ref={guideRef} className="free-trace-layer" style={{ width: pixelSize, height: pixelSize }} />
      <canvas ref={traceRef} className="free-trace-layer" style={{ width: pixelSize, height: pixelSize, zIndex: 3, display: editMode ? 'none' : undefined }} />
      {/* 히트 영역 — 글자 크기만큼만 (큰 canvas가 다른 글자를 가리지 않도록) */}
      <div ref={hitRef} className="free-trace-hit" style={{ width: 500 * piece.scale, height: 500 * piece.scale, zIndex: 5 }} />
      <div ref={overlayRef} className={`free-trace-layer free-trace-overlay ${flyAway ? 'overlay-fly-away' : ''}`} style={{ zIndex: 4, display: editMode ? 'none' : undefined }} />
      {editMode && (
        <VertexEditor
          source={getSource(piece.char, piece.id)}
          onUpdate={handleVertexUpdate}
        />
      )}
    </div>
  );
}
