// TracePiece.jsx — 개별 글자 따라쓰기 컴포넌트
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../data.js';
import { TracingEngine, samplePath } from '../TracingEngine.js';
import { ParticleSystem } from '../particles.js';

import { playStart, playComplete, playCelebrate, playFail, playSlam, playFloat, playLand, playFallSound, speakChar, playWaterComplete, startSizzle, stopSizzle, startSiren, stopSiren } from '../sound.js';
import { ICON_MAP } from '../icon-map.js';
import { getSource } from '../sourceOverrides.js';
import VertexEditor from './VertexEditor.jsx';

const DEFAULT_ICON = 'icons/default/character/police-car.png';

function getIconImageUrl(char) {
  if (ICON_MAP[char]) return ICON_MAP[char];
  return DEFAULT_ICON;
}

// 불꽃 그리기 — 시간 기반 애니메이션, startIdx 이후만
function drawFireOnPath(ctx, pts, startIdx, seed) {
  const t = performance.now() * 0.003; // 시간 흐름
  for (let pi = startIdx; pi < pts.length; pi++) {
    const pt = pts[pi];
    const h = pt.x * 7.3 + pt.y * 13.7 + seed * 31;

    // 1) 넓은 열기 글로우
    const g = ctx.createRadialGradient(pt.x, pt.y - 15, 0, pt.x, pt.y - 15, 55);
    g.addColorStop(0, 'rgba(255,80,0,0.22)');
    g.addColorStop(0.5, 'rgba(255,40,0,0.08)');
    g.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(pt.x - 55, pt.y - 70, 110, 110);

    // 2) 불꽃 입자 5겹 — 시간에 따라 흔들림
    for (let fi = 0; fi < 5; fi++) {
      const phase = t + h * 0.1 + fi * 2.3;
      const sway = Math.sin(phase * 1.7 + fi) * 14; // 좌우 흔들림
      const rise = Math.sin(phase * 0.9 + fi * 1.1); // 위아래 출렁
      const ox = sway;
      const oy = -10 - fi * 13 - Math.abs(rise) * 8;
      const r = 9 - fi * 1.2 + Math.sin(phase) * 2;
      if (r < 1.5) continue;

      // 아래(fi=0): 밝은 흰노랑, 위(fi=4): 어두운 빨강
      const blend = fi / 4;
      const cr = 255;
      const cg = Math.round(255 - blend * 200 + Math.sin(phase) * 15);
      const cb = Math.round(120 - blend * 110);
      ctx.globalAlpha = (0.7 - fi * 0.1) * (0.8 + Math.sin(phase * 2) * 0.2);
      ctx.beginPath();
      ctx.arc(pt.x + ox, pt.y + oy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${cr},${Math.max(0, cg)},${Math.max(0, cb)})`;
      ctx.fill();
    }

    // 3) 밝은 코어 (흰노랑 중심) — 가장 아래 레이어
    const coreAlpha = 0.4 + Math.sin(t * 2 + h) * 0.15;
    ctx.globalAlpha = coreAlpha;
    ctx.beginPath();
    ctx.arc(pt.x + Math.sin(t + h) * 3, pt.y - 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8c4';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export default function TracePiece({ piece, selected, inputLocked, onDone, onResetDone, onDelete, onSelect, onUngroup, isOverTrash, setTrashHover, onNearGoal, onSourceUpdate, onMoved, focusZoom = true, fireSkin = false, fireTheme = false, difficulty = 'easy', onHandlerMove }) {
  const source = getSource(piece.char, piece.id);
  const [editMode, setEditMode] = useState(false);
  const focusZoomRef = useRef(focusZoom);
  useEffect(() => { focusZoomRef.current = focusZoom; }, [focusZoom]);
  const fireSkinRef = useRef(fireSkin);
  useEffect(() => { fireSkinRef.current = fireSkin; }, [fireSkin]);
  const fireThemeRef = useRef(fireTheme);
  useEffect(() => { fireThemeRef.current = fireTheme; }, [fireTheme]);
  useEffect(() => { if (engineRef.current) engineRef.current.difficulty = difficulty; }, [difficulty]);
  const guideRef = useRef(null);

  const traceRef = useRef(null);
  const overlayRef = useRef(null);
  const engineRef = useRef(null);
  const particleRef = useRef(new ParticleSystem());
  const waterDropsRef = useRef([]); // 소방관 스킨 물방울 파티클
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
    const fire = fireSkinRef.current || fireThemeRef.current;
    const fireWaiting = fireThemeRef.current && !fireSkinRef.current && !piece.done;
    gCtx.clearRect(0, 0, SIZE, SIZE);
    gCtx.save();
    gCtx.translate(PAD, PAD);
    // 완성된 글자는 배경선/점선 가이드 안 그림
    if (!piece.done) {
      // 배경선 — 대기 글자도 표시 (글자 모양 보이게)
      gCtx.strokeStyle = fire ? 'rgba(255,100,30,0.15)' : 'rgba(255,255,255,0.25)';
      gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
      gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
      gCtx.setLineDash([]);
      src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
      // 점선 가이드 — 대기 글자는 숨김
      if (!fireWaiting) {
        gCtx.strokeStyle = fire ? 'rgba(255,80,0,0.5)' : 'rgba(255,200,0,0.55)';
        gCtx.lineWidth = 6;
        gCtx.setLineDash([18, 14]);
        src.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
        gCtx.setLineDash([]);
      }
    }
    // 완성된 획
    S.completed.forEach(pts => {
      gCtx.beginPath();
      gCtx.strokeStyle = fire ? '#4fc3f7' : APP_CONFIG.TRACE_COLOR;
      gCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
      gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
      gCtx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) gCtx.lineTo(p.x, p.y);
      gCtx.stroke();
    });
    if (!hideStartDot && !fireWaiting && S.strokeIdx < src.strokes.length) {
      const pts = samplePath(src.strokes[S.strokeIdx].path, 80);
      if (pts.length >= 2) {
        gCtx.beginPath(); gCtx.arc(pts[0].x, pts[0].y, 12, 0, Math.PI * 2);
        gCtx.fillStyle = fire ? '#4fc3f7' : '#44ee88'; gCtx.fill();
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

  // fireSkin/fireTheme/done 변경 시 가이드+아이콘 다시 그리기 + 불 애니메이션 루프
  const fireAnimRef = useRef(null);
  useEffect(() => {
    if (stateRef.current.inited) { drawGuide(); setupIcons(); }
    if (fireSkin && !piece.done) {
      function fireLoop() { renderTrace(); fireAnimRef.current = requestAnimationFrame(fireLoop); }
      fireAnimRef.current = requestAnimationFrame(fireLoop);
    }
    return () => { if (fireAnimRef.current) { cancelAnimationFrame(fireAnimRef.current); fireAnimRef.current = null; } };
  }, [fireSkin, fireTheme, piece.done]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const isFire = fireSkinRef.current;
    const eng = engineRef.current;

    // 소방관 스킨 — 모든 미완성 획에 동적 불꽃 (매 프레임 애니메이션)
    if (isFire) {
      const src = getSource(piece.char, piece.id);
      if (src && stateRef.current.strokeIdx < src.strokes.length) {
        for (let si = 0; si < src.strokes.length; si++) {
          // 완성된 획은 건너뜀
          if (si < stateRef.current.strokeIdx) continue;
          const firePts = samplePath(src.strokes[si].path, 25);
          if (si === stateRef.current.strokeIdx && eng.pts?.length > 0) {
            // 현재 획: 지나간 부분은 불 제거
            const progress = eng.pts.length > 1 ? eng.maxReachedIdx / (eng.pts.length - 1) : 0;
            const fireStart = Math.floor(progress * firePts.length);
            drawFireOnPath(tCtx, firePts, fireStart, si);
          } else {
            // 대기 획: 전체에 불
            drawFireOnPath(tCtx, firePts, 0, si);
          }
        }
      }
    }

    eng.draw(isFire);
    // 소방관 스킨 — 완성된 획 물색을 불 위에 다시 그리기 (물색 > 불)
    if (isFire && stateRef.current.completed.length > 0) {
      tCtx.strokeStyle = '#4fc3f7';
      tCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
      tCtx.lineCap = 'round'; tCtx.lineJoin = 'round';
      for (const pts of stateRef.current.completed) {
        tCtx.beginPath();
        tCtx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) tCtx.lineTo(p.x, p.y);
        tCtx.stroke();
      }
    }
    particleRef.current.draw(tCtx);

    // 소방관 스킨 — 물방울 파티클
    if (isFire) {
      const drops = waterDropsRef.current;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx; d.y += d.vy; d.vy += 0.12; d.life -= 0.025;
        if (d.life <= 0) { drops.splice(i, 1); continue; }
        tCtx.globalAlpha = d.life * 0.7;
        tCtx.beginPath();
        tCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        tCtx.fillStyle = d.light ? '#b3e5fc' : '#4fc3f7';
        tCtx.fill();
      }
      tCtx.globalAlpha = 1;
    }
    tCtx.restore();
  }

  function setupIcons() {
    const ol = overlayRef.current; if (!ol) return;
    const fire = fireSkinRef.current;
    // fireTheme: done이거나 대기 중(불 안 붙은) → 오버레이 비움
    if (fireThemeRef.current && (piece.done || !fire)) {
      ol.innerHTML = '';
      return;
    }
    if (piece.done) {
      ol.innerHTML = '';
      return;
    }
    if (fire) {
      // 불모드: 소화기 핸들러 + 물색 타겟
      const targetSvg = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(79,195,247,0.6)" stroke-width="2"/><circle cx="20" cy="20" r="5" fill="rgba(79,195,247,0.7)"/></svg>`;
      ol.innerHTML = `<div class="target-icon free-target">${targetSvg}</div><div class="character-handler fire-handler-extinguisher">🧯</div>`;
    } else {
      const targetSvg = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,235,80,0.8)" stroke-width="3"/><circle cx="20" cy="20" r="6" fill="rgba(255,235,80,0.9)"/></svg>`;
      ol.innerHTML = `<div class="target-icon free-target"><div class="target-echo"></div><div class="target-echo target-echo--delay"></div>${targetSvg}</div><img class="character-handler" src="${getIconImageUrl(piece.char)}" onerror="this.src='${DEFAULT_ICON}'">`;
    }
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
    const proximity = (isTracing && allowNear && focusZoomRef.current) ? Math.max(0, 1 - dist / maxDist) : 0;
    const baseSize = 220;
    const maxSize = 700;
    const curSize = baseSize + proximity * (maxSize - baseSize);
    target.style.width = `${curSize}px`;
    const isNear = dist < 150 && isTracing && allowNear && focusZoomRef.current;
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
    // 경로 방향으로 핸들러 회전 (자동차 모드, 불모드 제외)
    if (!fireSkinRef.current && engineRef.current?.pts?.length > 3) {
      const eng = engineRef.current;
      const idx = isTracing ? eng.maxReachedIdx : 0;
      const nextIdx = Math.min(idx + 3, eng.pts.length - 1);
      if (nextIdx > idx) {
        const dx = eng.pts[nextIdx].x - eng.pts[idx].x;
        const dy = eng.pts[nextIdx].y - eng.pts[idx].y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
        handler.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
      }
    }
    // 소화기 위치를 부모에 전달 (코끼리 따라다님)
    if (onHandlerMove && isTracing) {
      const rect = handler.getBoundingClientRect();
      onHandlerMove({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else if (onHandlerMove && !isTracing) {
      onHandlerMove(null);
    }
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
    // 소방관 스킨 — 획 완성 시 물 폭발
    if (fireSkinRef.current) {
      const tp = engineRef.current.getTargetPos();
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        waterDropsRef.current.push({
          x: tp.x, y: tp.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 6,
          life: 0.6 + Math.random() * 0.4,
          light: Math.random() > 0.3,
        });
      }
    }
    if (S.strokeIdx >= curSource.strokes.length) {
      overlayRef.current.innerHTML = '';
      if (onHandlerMove) onHandlerMove(null);
      if (fireSkinRef.current || fireThemeRef.current) {
        // 불모드 완성 — 트레이스 캔버스 클리어 + 불 애니메이션 정지
        const tCtx = traceRef.current?.getContext('2d');
        if (tCtx) tCtx.clearRect(0, 0, SIZE, SIZE);
        if (fireAnimRef.current) { cancelAnimationFrame(fireAnimRef.current); fireAnimRef.current = null; }
        stopPLoop();
        waterDropsRef.current = [];
        speakChar(piece.char, 200);
        playWaterComplete();
        setJustDone(true);
        drawGuideWith(curSource);
        setTimeout(() => { onDone(); }, 150);
        setTimeout(() => setJustDone(false), 600);
      } else {
        particleRef.current.celebrate(250, 250); startPLoop();
        playCelebrate();
        speakChar(piece.char, 400);
        setJustDone(true);
        setTimeout(() => { onDone(); playSlam(); }, 150);
        setTimeout(() => setJustDone(false), 600);
        setTimeout(() => stopPLoop(), 2000);
      }
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
      if (editMode) return;
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
          if (fireSkinRef.current) startSizzle();
          else startSiren();
          if (stateRef.current.strokeIdx === 0) speakChar(piece.char);
          particleRef.current.burst(cPos.x, cPos.y, 6); startPLoop(); renderTrace(); updateIcons();
          const h = overlayRef.current?.querySelector('.character-handler');
          if (h) h.style.transform = 'translate(-50%,-50%) scale(1.15) rotate(5deg)';
          return;
        }
      }

      // 잠금 모드면 롱프레스(편집)와 이동 차단
      if (inputLocked) return;

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
        particleRef.current.emit(cPos.x, cPos.y);
        // 소방관 스킨 — 손가락에서 물 튀김
        if (fireSkinRef.current) {
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            waterDropsRef.current.push({
              x: cPos.x, y: cPos.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1,
              size: 2 + Math.random() * 4,
              life: 0.3 + Math.random() * 0.3,
              light: Math.random() > 0.4,
            });
          }
        }
        renderTrace(); updateIcons();
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
          stopSizzle(); stopSiren();
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
        stopSizzle(); stopSiren();
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
      className={`free-trace-wrap ${justDone ? (fireTheme ? 'free-trace-wrap--extinguished' : 'free-trace-wrap--slam') : piece.done ? (fireTheme ? 'free-trace-wrap--fire-done' : 'free-trace-wrap--done') : ''} ${selected ? 'free-trace-wrap--selected' : ''} ${unlocked ? 'free-trace-wrap--unlocked' : ''} ${editMode ? 'free-trace-wrap--editing' : ''} ${fireSkin && !piece.done ? 'free-trace-wrap--fire' : ''}`}
      style={{ left: localPos.x, top: localPos.y, width: 0, height: 0 }}
    >
      <canvas ref={guideRef} className="free-trace-layer" style={{ width: pixelSize, height: pixelSize }} />
      <canvas ref={traceRef} className="free-trace-layer" style={{ width: pixelSize, height: pixelSize, zIndex: 3, display: editMode ? 'none' : undefined }} />
      {/* 히트 영역 — 글자 크기만큼만 (큰 canvas가 다른 글자를 가리지 않도록) */}
      <div ref={hitRef} className="free-trace-hit" style={{ width: 500 * piece.scale, height: 500 * piece.scale, zIndex: 5 }} />
      <div ref={overlayRef} className={`free-trace-layer free-trace-overlay ${flyAway ? 'overlay-fly-away' : ''}`} style={{ zIndex: 4, display: editMode ? 'none' : undefined }} />
      {editMode && (
        <>
          <VertexEditor
            source={getSource(piece.char, piece.id)}
            onUpdate={handleVertexUpdate}
          />
          <button className="edit-done-btn" onClick={(e) => { e.stopPropagation(); setEditMode(false); }}>✔ 확인</button>
        </>
      )}
    </div>
  );
}
