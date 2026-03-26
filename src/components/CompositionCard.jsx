// CompositionCard.jsx — 글자 조합 카드 + 따라쓰기

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CONSONANTS, VOWELS, VOWEL_TEMPLATES, APP_CONFIG, buildSyllables, buildSyllablesBatchim } from '../data.js';
import { TracingEngine, initSvgHelper, samplePath } from '../TracingEngine.js';
import { ParticleSystem } from '../particles.js';
import { startArrowAnim, stopArrowAnim } from '../arrow.js';
import { playStart, playComplete, playCelebrate, playFail } from '../sound.js';
import { getSlotLayout } from '../utils/syllableLayout.js';
import { composeSyllable } from '../utils/jamo.js';
import Slot from './Slot.jsx';

export default function CompositionCard({ chosung, jungsung, jongsung, onClear, scale, isDragging }) {
  const guideRef = useRef(null);
  const arrowRef = useRef(null);
  const traceRef = useRef(null);
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const engineRef = useRef(null);
  const particleRef = useRef(new ParticleSystem());
  const stateRef = useRef({ strokeIdx: 0, completed: [], cvW: 500, cvH: 500 });
  const [tracingActive, setTracingActive] = useState(false);
  const activeTouchRef = useRef(null);
  const particleAnimRef = useRef(null);

  const layout = getSlotLayout(jungsung);
  const syllableReady = !!(chosung && jungsung);
  const syllableChar = syllableReady ? composeSyllable(chosung, jungsung, jongsung || '') : '';

  // 음절 데이터 생성
  const getSyllableData = useCallback(() => {
    if (!chosung || !jungsung) return null;
    const consIdx = CONSONANTS.findIndex(c => c.char === chosung);
    if (consIdx < 0) return null;

    let syllables;
    if (jongsung) {
      syllables = buildSyllablesBatchim(jungsung, jongsung);
    } else {
      syllables = buildSyllables(jungsung);
    }
    return syllables[consIdx] || null;
  }, [chosung, jungsung, jongsung]);

  // 카드 크기 결정
  const getCardSize = useCallback(() => {
    if (!jungsung) return { w: 500, h: 500, cls: 'card-square' };
    const tmpl = VOWEL_TEMPLATES[jungsung];
    if (!tmpl) return { w: 500, h: 500, cls: 'card-square' };
    if (jongsung) {
      return tmpl.dir === 'right'
        ? { w: 700, h: 700, cls: 'card-large' }
        : { w: 500, h: 700, cls: 'card-tall' };
    }
    if (tmpl.dir === 'right') return { w: 700, h: 500, cls: 'card-wide' };
    return { w: 500, h: 700, cls: 'card-tall' };
  }, [jungsung, jongsung]);

  // 따라쓰기 시작
  useEffect(() => {
    if (!syllableReady) {
      setTracingActive(false);
      return;
    }

    const data = getSyllableData();
    if (!data) return;

    initSvgHelper();
    const { w, h } = getCardSize();
    const S = stateRef.current;
    S.cvW = w;
    S.cvH = h;
    S.strokeIdx = 0;
    S.completed = [];

    const gCtx = guideRef.current.getContext('2d');
    const aCtx = arrowRef.current.getContext('2d');
    const tCtx = traceRef.current.getContext('2d');

    [guideRef, arrowRef, traceRef].forEach(r => {
      r.current.width = w;
      r.current.height = h;
      r.current.style.width = '100%';
      r.current.style.height = '100%';
    });

    if (!engineRef.current) {
      engineRef.current = new TracingEngine(tCtx, APP_CONFIG);
    } else {
      engineRef.current.ctx = tCtx;
    }

    // 가이드 그리기
    drawGuide(gCtx, data, S);
    // 첫 획 로드
    loadStroke(0, data, engineRef.current, aCtx, S, overlayRef.current, syllableChar);
    setTracingActive(true);

    // 타이머로 슬롯 → 따라쓰기 전환 딜레이
    const timer = setTimeout(() => setTracingActive(true), 300);
    return () => clearTimeout(timer);
  }, [chosung, jungsung, jongsung]); // eslint-disable-line react-hooks/exhaustive-deps

  // 입력 이벤트
  useEffect(() => {
    if (!tracingActive || isDragging) return;
    const card = cardRef.current;
    if (!card) return;

    function getPos(e) {
      let cx, cy;
      if (e.touches && e.touches.length > 0) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        cx = e.changedTouches[0].clientX;
        cy = e.changedTouches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      const rect = traceRef.current.getBoundingClientRect();
      const S = stateRef.current;
      return {
        x: (cx - rect.left) * (S.cvW / rect.width),
        y: (cy - rect.top) * (S.cvH / rect.height),
      };
    }

    function onDown(e) {
      if (e.touches && e.touches.length > 1) return; // 핀치 줌 무시
      e.preventDefault();
      if (e.touches) activeTouchRef.current = e.touches[0].identifier;
      const engine = engineRef.current;
      if (!engine) return;
      const pos = getPos(e);
      if (engine.start(pos.x, pos.y)) {
        playStart();
        const S = stateRef.current;
        stopArrowAnim(arrowRef.current.getContext('2d'), S.cvW, S.cvH);
        particleRef.current.burst(pos.x, pos.y, 6);
        startPLoop();
        renderTrace();
      }
    }

    function onMove(e) {
      const engine = engineRef.current;
      if (!engine || !engine.isTracing) return;
      e.preventDefault();
      const pos = getPos(e);
      engine.move(pos.x, pos.y);
      particleRef.current.emit(pos.x, pos.y);
      renderTrace();
    }

    function onUp(e) {
      if (e.touches && e.touches.length > 0) return;
      activeTouchRef.current = null;
      const engine = engineRef.current;
      if (!engine || !engine.isTracing) return;
      if (engine.end()) {
        playComplete();
        const tp = engine.getTargetPos();
        particleRef.current.burst(tp.x, tp.y, 15);
        completeStroke();
      } else {
        playFail();
        stopPLoop();
        renderTrace();
        const S = stateRef.current;
        startArrowAnim(engine.pts, arrowRef.current.getContext('2d'), S.cvW, S.cvH);
      }
    }

    card.addEventListener('mousedown', onDown);
    card.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    card.addEventListener('touchstart', onDown, { passive: false });
    card.addEventListener('touchmove', onMove, { passive: false });
    card.addEventListener('touchend', onUp, { passive: false });
    window.addEventListener('touchend', onUp, { passive: false });

    return () => {
      card.removeEventListener('mousedown', onDown);
      card.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      card.removeEventListener('touchstart', onDown);
      card.removeEventListener('touchmove', onMove);
      card.removeEventListener('touchend', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [tracingActive, isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderTrace() {
    const S = stateRef.current;
    const tCtx = traceRef.current.getContext('2d');
    tCtx.clearRect(0, 0, S.cvW, S.cvH);
    engineRef.current.draw();
    particleRef.current.draw(tCtx);
  }

  function startPLoop() {
    function loop() {
      particleRef.current.update();
      renderTrace();
      particleAnimRef.current = requestAnimationFrame(loop);
    }
    if (!particleAnimRef.current) particleAnimRef.current = requestAnimationFrame(loop);
  }

  function stopPLoop() {
    if (particleAnimRef.current) {
      cancelAnimationFrame(particleAnimRef.current);
      particleAnimRef.current = null;
    }
  }

  function completeStroke() {
    const S = stateRef.current;
    const data = getSyllableData();
    if (!data) return;
    S.completed.push([...engineRef.current.pts]);
    S.strokeIdx++;
    if (S.strokeIdx >= data.strokes.length) {
      // 글자 완성!
      playCelebrate();
      stopArrowAnim(arrowRef.current.getContext('2d'), S.cvW, S.cvH);
      if (overlayRef.current) overlayRef.current.innerHTML = '';
      particleRef.current.celebrate(S.cvW / 2, S.cvH / 2);
      startPLoop();
      setTimeout(() => stopPLoop(), 2000);
    } else {
      loadStroke(S.strokeIdx, data, engineRef.current, arrowRef.current.getContext('2d'), S, overlayRef.current, syllableChar);
    }
  }

  const { cls } = getCardSize();

  return (
    <div
      className={`study-card ${cls} composition-card`}
      id="composition-card"
      ref={cardRef}
      style={{ transform: `scale(${scale})`, zIndex: 100 }}
    >
      <canvas id="guide-canvas" ref={guideRef}></canvas>
      <canvas id="arrow-canvas" ref={arrowRef}></canvas>
      <canvas id="trace-canvas" ref={traceRef}></canvas>
      <div id="overlay-icons" ref={overlayRef}></div>

      {/* 슬롯 오버레이 — 따라쓰기 중엔 반투명 */}
      <div className={`slots-overlay ${tracingActive ? 'slots--tracing' : ''}`}>
        <Slot label="초성" char={chosung} layout={layout.chosung} onClear={() => onClear('chosung')} />
        <Slot label="중성" char={jungsung} layout={layout.jungsung} onClear={() => onClear('jungsung')} />
        <Slot label="종성" char={jongsung} layout={layout.jongsung} onClear={() => onClear('jongsung')} />
      </div>

      {syllableChar && (
        <div className="syllable-preview">{syllableChar}</div>
      )}
    </div>
  );
}

// ── 헬퍼 함수 ──

function drawGuide(gCtx, data, S) {
  gCtx.clearRect(0, 0, S.cvW, S.cvH);
  const guideW = APP_CONFIG.GUIDE_STROKE_WIDTH;
  const traceW = APP_CONFIG.TRACE_STROKE_WIDTH;

  gCtx.strokeStyle = 'rgba(255,200,0,0.55)';
  gCtx.lineWidth = 6;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([18, 14]);
  data.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });
  gCtx.setLineDash([]);

  S.completed.forEach(pts => {
    gCtx.beginPath();
    gCtx.strokeStyle = APP_CONFIG.TRACE_COLOR;
    gCtx.lineWidth = traceW;
    gCtx.lineCap = 'round';
    gCtx.lineJoin = 'round';
    gCtx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) gCtx.lineTo(p.x, p.y);
    gCtx.stroke();
  });

  if (S.strokeIdx < data.strokes.length) {
    const pts = samplePath(data.strokes[S.strokeIdx].path, 80);
    if (pts.length >= 2) {
      gCtx.beginPath();
      gCtx.arc(pts[0].x, pts[0].y, 12, 0, Math.PI * 2);
      gCtx.fillStyle = '#44ee88';
      gCtx.fill();
      gCtx.strokeStyle = '#fff';
      gCtx.lineWidth = 3;
      gCtx.stroke();
    }
  }
}

function loadStroke(idx, data, engine, aCtx, S, overlay, syllableChar) {
  const strokePath = data.strokes[idx].path;
  const ch = data.char || syllableChar;
  const isClosed = strokePath.includes('A') || ch === 'ㅁ' || ch === 'ㅇ' || ch === '마' || ch === '아';
  engine.setStroke(strokePath, isClosed);

  // 가이드 다시 그리기
  const gCtx = engine.ctx.canvas.previousElementSibling.previousElementSibling.getContext('2d');
  drawGuide(gCtx, data, S);

  startArrowAnim(engine.pts, aCtx, S.cvW, S.cvH);

  // 아이콘
  if (overlay) {
    overlay.innerHTML = `
      <div class="target-icon">${APP_CONFIG.STARFISH_SVG}</div>
      <img class="character-handler" src="img.png" onerror="this.src='img.png'">
    `;
    const handler = overlay.querySelector('.character-handler');
    const target = overlay.querySelector('.target-icon');
    if (handler && target) {
      const hp = engine.getHandlerPos();
      const tp = engine.getTargetPos();
      handler.style.left = `${(hp.x / S.cvW) * 100}%`;
      handler.style.top = `${(hp.y / S.cvH) * 100}%`;
      target.style.left = `${(tp.x / S.cvW) * 100}%`;
      target.style.top = `${(tp.y / S.cvH) * 100}%`;
    }
  }
}
