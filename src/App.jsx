import React, { useEffect, useRef, useCallback } from 'react';
import { Agentation } from 'agentation';
import { CONSONANTS, VOWELS, VOWEL_TEMPLATES, COMBINE_VOWELS, JONGSUNG_LIST, APP_CONFIG, buildSyllables, buildSyllablesBatchim } from './data.js';
import { ICON_MAP } from './icon-map.js';
import { TracingEngine, initSvgHelper, samplePath } from './TracingEngine.js';
import { ParticleSystem } from './particles.js';
import { startArrowAnim, stopArrowAnim } from './arrow.js';
import { playStart, playComplete, playCelebrate, playFail } from './sound.js';

// 전역 mutable state — useRef 대신 모듈 레벨에서 관리 (canvas 로직과의 호환성)
const S = {
  appMode: 'basic',
  currentMode: 'consonants',
  currentDataList: CONSONANTS,
  currentCharIdx: 0,
  currentStrokeIdx: 0,
  completedStrokes: [],
  selectedVowel: 'ㅏ',
  cvW: 500,
  cvH: 500,
  SYLLABLES: buildSyllables('ㅏ'),
  selectedBatchim: 'ㄱ',
  SYLLABLES_BATCHIM: buildSyllablesBatchim('ㅏ', 'ㄱ'),
  engine: null,
  particleSystem: new ParticleSystem(),
  particleAnimId: null,
  gCtx: null,
  tCtx: null,
  aCtx: null,
  activeTouchId: null,
};

function getIconImageUrl(char) {
  if (ICON_MAP[char]) return ICON_MAP[char];
  return `icons/${char}/character/img.png`;
}

// ── 렌더링 함수 (Canvas 직접 조작) ──

function drawGuide(clear = true) {
  const { gCtx, cvW, cvH, currentDataList, currentCharIdx, currentStrokeIdx, completedStrokes } = S;
  if (!gCtx || !currentDataList) return;
  if (clear) gCtx.clearRect(0, 0, cvW, cvH);
  const charData = currentDataList[currentCharIdx];
  if (!charData) return;

  const guideW = APP_CONFIG.GUIDE_STROKE_WIDTH;
  const traceW = APP_CONFIG.TRACE_STROKE_WIDTH;

  gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
  gCtx.lineWidth = guideW + 28;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  gCtx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  gCtx.lineWidth = guideW;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  completedStrokes.forEach(pts => {
    gCtx.beginPath();
    gCtx.strokeStyle = APP_CONFIG.TRACE_COLOR;
    gCtx.lineWidth = traceW;
    gCtx.lineCap = 'round';
    gCtx.lineJoin = 'round';
    gCtx.setLineDash([]);
    gCtx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) gCtx.lineTo(p.x, p.y);
    gCtx.stroke();
  });

  if (currentStrokeIdx < charData.strokes.length) {
    const pts = samplePath(charData.strokes[currentStrokeIdx].path, 80);
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

function renderTrace() {
  const { tCtx, cvW, cvH, engine, particleSystem } = S;
  if (!tCtx) return;
  tCtx.clearRect(0, 0, cvW, cvH);
  engine.draw();
  particleSystem.draw(tCtx);
}

function setupIcons(overlay, handlerRef, targetRef) {
  if (!overlay) return;
  const char = S.currentDataList[S.currentCharIdx].char;
  overlay.innerHTML = `
    <div id="target-icon" class="target-icon">${APP_CONFIG.STARFISH_SVG}</div>
    <img id="handler-icon" class="character-handler" src="${getIconImageUrl(char)}" onerror="this.src='img.png'">
  `;
  handlerRef.current = document.getElementById('handler-icon');
  targetRef.current = document.getElementById('target-icon');
  updateIcons(handlerRef, targetRef);
}

function updateIcons(handlerRef, targetRef) {
  if (!S.engine.pts || !handlerRef.current) return;
  const hp = S.engine.getHandlerPos();
  const tp = S.engine.getTargetPos();
  handlerRef.current.style.left = `${(hp.x / S.cvW) * 100}%`;
  handlerRef.current.style.top = `${(hp.y / S.cvH) * 100}%`;
  targetRef.current.style.left = `${(tp.x / S.cvW) * 100}%`;
  targetRef.current.style.top = `${(tp.y / S.cvH) * 100}%`;
}

function startParticleLoop() {
  function loop() {
    S.particleSystem.update();
    renderTrace();
    S.particleAnimId = requestAnimationFrame(loop);
  }
  if (!S.particleAnimId) {
    S.particleAnimId = requestAnimationFrame(loop);
  }
}

function stopParticleLoop() {
  if (S.particleAnimId) {
    cancelAnimationFrame(S.particleAnimId);
    S.particleAnimId = null;
  }
}

// ── React Component ──

export default function App() {
  const guideRef = useRef(null);
  const arrowRef = useRef(null);
  const traceRef = useRef(null);
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const handlerIconRef = useRef(null);
  const targetIconRef = useRef(null);
  const forceUpdateRef = useRef(null);
  const [, setTick] = React.useState(0);
  forceUpdateRef.current = () => setTick(t => t + 1);

  // ── Core functions ──

  const setCardMode = useCallback((mode) => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.remove('card-square', 'card-wide', 'card-tall', 'card-large');

    if (mode === 'syllables' && S.appMode === 'combine2') {
      // 받침 모드: 가로형→700×700, 세로형→500×700
      const dir = VOWEL_TEMPLATES[S.selectedVowel].dir;
      if (dir === 'right') {
        card.classList.add('card-large');
        S.cvW = 700; S.cvH = 700;
      } else {
        card.classList.add('card-tall');
        S.cvW = 500; S.cvH = 700;
      }
    } else if (mode === 'syllables') {
      const dir = VOWEL_TEMPLATES[S.selectedVowel].dir;
      if (dir === 'bottom') {
        card.classList.add('card-tall');
        S.cvW = 500; S.cvH = 700;
      } else {
        card.classList.add('card-wide');
        S.cvW = 700; S.cvH = 500;
      }
    } else {
      card.classList.add('card-square');
      S.cvW = 500; S.cvH = 500;
    }
  }, []);

  const resize = useCallback(() => {
    setCardMode(S.currentMode);
    const canvases = [guideRef.current, arrowRef.current, traceRef.current];
    canvases.forEach(c => {
      if (!c) return;
      c.width = S.cvW;
      c.height = S.cvH;
      c.style.width = '100%';
      c.style.height = '100%';
    });
    if (S.currentDataList) drawGuide();
  }, [setCardMode]);

  const loadStroke = useCallback((idx) => {
    S.currentStrokeIdx = idx;
    const charData = S.currentDataList[S.currentCharIdx];
    const strokePath = charData.strokes[idx].path;
    const ch = charData.char;
    const isClosed = strokePath.includes('A') || ch === 'ㅁ' || ch === 'ㅇ' || ch === '마' || ch === '아';
    S.engine.setStroke(strokePath, isClosed);
    drawGuide(false);
    renderTrace();
    setupIcons(overlayRef.current, handlerIconRef, targetIconRef);
    startArrowAnim(S.engine.pts, S.aCtx, S.cvW, S.cvH);
  }, []);

  const loadCharacter = useCallback((idx) => {
    S.currentCharIdx = idx;
    S.currentStrokeIdx = 0;
    S.completedStrokes = [];
    resize();
    drawGuide();
    loadStroke(0);
    forceUpdateRef.current();
  }, [resize, loadStroke]);

  const nextChar = useCallback(() => {
    loadCharacter((S.currentCharIdx + 1) % S.currentDataList.length);
  }, [loadCharacter]);

  const prevChar = useCallback(() => {
    loadCharacter((S.currentCharIdx - 1 + S.currentDataList.length) % S.currentDataList.length);
  }, [loadCharacter]);

  const showSuccessAnim = useCallback(() => {
    stopArrowAnim(S.aCtx, S.cvW, S.cvH);
    const card = cardRef.current;
    if (card) {
      card.classList.add('success-anim');
      setTimeout(() => card.classList.remove('success-anim'), 400);
    }
    if (overlayRef.current) overlayRef.current.innerHTML = '';
    playCelebrate();
    S.particleSystem.celebrate(S.cvW / 2, S.cvH / 2);
    startParticleLoop();
    setTimeout(() => stopParticleLoop(), 2000);
  }, []);

  const completeStroke = useCallback(() => {
    const charData = S.currentDataList[S.currentCharIdx];
    S.completedStrokes.push([...S.engine.pts]);
    S.currentStrokeIdx++;
    if (S.currentStrokeIdx >= charData.strokes.length) {
      showSuccessAnim();
      setTimeout(() => nextChar(), 800);
    } else {
      loadStroke(S.currentStrokeIdx);
    }
  }, [showSuccessAnim, nextChar, loadStroke]);

  // ── Input handlers ──

  const getPointerPos = useCallback((e) => {
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      if (S.activeTouchId !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === S.activeTouchId) {
            clientX = e.touches[i].clientX;
            clientY = e.touches[i].clientY;
            break;
          }
        }
        if (clientX === undefined) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = traceRef.current.getBoundingClientRect();
    const scaleX = S.cvW / rect.width;
    const scaleY = S.cvH / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  // Store completeStroke in ref so event handlers always have latest
  const completeStrokeRef = useRef(completeStroke);
  completeStrokeRef.current = completeStroke;

  // ── Initialize ──

  useEffect(() => {
    initSvgHelper();
    S.gCtx = guideRef.current.getContext('2d');
    S.aCtx = arrowRef.current.getContext('2d');
    S.tCtx = traceRef.current.getContext('2d');
    S.engine = new TracingEngine(S.tCtx, APP_CONFIG);

    // Setup input events (native for passive:false)
    const card = cardRef.current;

    function onPointerDown(e) {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        S.activeTouchId = e.touches[0].identifier;
      }
      const pos = getPointerPos(e);
      if (S.engine.start(pos.x, pos.y)) {
        playStart();
        stopArrowAnim(S.aCtx, S.cvW, S.cvH);
        S.particleSystem.burst(pos.x, pos.y, 6);
        startParticleLoop();
        renderTrace();
        updateIcons(handlerIconRef, targetIconRef);
        if (handlerIconRef.current) {
          handlerIconRef.current.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(5deg)';
        }
      }
    }

    function onPointerMove(e) {
      if (!S.engine.isTracing) return;
      e.preventDefault();
      const pos = getPointerPos(e);
      S.engine.move(pos.x, pos.y);
      S.particleSystem.emit(pos.x, pos.y);
      renderTrace();
      updateIcons(handlerIconRef, targetIconRef);
    }

    function onPointerUp(e) {
      if (e.touches && e.touches.length > 0) return;
      S.activeTouchId = null;
      if (!S.engine.isTracing) return;
      if (handlerIconRef.current) {
        handlerIconRef.current.style.transform = 'translate(-50%, -50%)';
      }
      if (S.engine.end()) {
        playComplete();
        const tp = S.engine.getTargetPos();
        S.particleSystem.burst(tp.x, tp.y, 15);
        completeStrokeRef.current();
      } else {
        playFail();
        stopParticleLoop();
        renderTrace();
        updateIcons(handlerIconRef, targetIconRef);
        startArrowAnim(S.engine.pts, S.aCtx, S.cvW, S.cvH);
      }
    }

    function onTouchCancel(e) { e.preventDefault(); }

    card.addEventListener('mousedown', onPointerDown);
    card.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    card.addEventListener('touchstart', onPointerDown, { passive: false });
    card.addEventListener('touchmove', onPointerMove, { passive: false });
    card.addEventListener('touchend', onPointerUp, { passive: false });
    card.addEventListener('touchcancel', onTouchCancel, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });

    window.addEventListener('resize', resize);

    // Initial load
    setTimeout(() => {
      resize();
      loadCharacter(0);
    }, 50);

    return () => {
      card.removeEventListener('mousedown', onPointerDown);
      card.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      card.removeEventListener('touchstart', onPointerDown);
      card.removeEventListener('touchmove', onPointerMove);
      card.removeEventListener('touchend', onPointerUp);
      card.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('resize', resize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel rendering ──

  const handleModeBasic = useCallback(() => {
    if (S.appMode === 'basic') return;
    S.appMode = 'basic';
    S.currentMode = 'consonants';
    S.currentDataList = CONSONANTS;
    loadCharacter(0);
  }, [loadCharacter]);

  const handleModeCombine = useCallback(() => {
    if (S.appMode === 'combine') return;
    S.appMode = 'combine';
    S.currentMode = 'syllables';
    S.currentDataList = S.SYLLABLES;
    loadCharacter(0);
  }, [loadCharacter]);

  const handleModeCombine2 = useCallback(() => {
    if (S.appMode === 'combine2') return;
    S.appMode = 'combine2';
    S.currentMode = 'syllables';
    S.SYLLABLES_BATCHIM = buildSyllablesBatchim(S.selectedVowel, S.selectedBatchim);
    S.currentDataList = S.SYLLABLES_BATCHIM;
    loadCharacter(0);
  }, [loadCharacter]);

  const handleConsClick = useCallback((i) => {
    if (S.appMode === 'combine') {
      S.currentMode = 'syllables';
      S.currentDataList = S.SYLLABLES;
    } else if (S.appMode === 'combine2') {
      S.currentMode = 'syllables';
      S.currentDataList = S.SYLLABLES_BATCHIM;
    } else {
      S.currentMode = 'consonants';
      S.currentDataList = CONSONANTS;
    }
    loadCharacter(i);
  }, [loadCharacter]);

  const handleVowClick = useCallback((i) => {
    if (S.appMode === 'combine') {
      const v = COMBINE_VOWELS[i];
      S.selectedVowel = v;
      S.SYLLABLES = buildSyllables(v);
      S.currentDataList = S.SYLLABLES;
      loadCharacter(S.currentCharIdx);
    } else if (S.appMode === 'combine2') {
      const v = COMBINE_VOWELS[i];
      S.selectedVowel = v;
      S.SYLLABLES_BATCHIM = buildSyllablesBatchim(v, S.selectedBatchim);
      S.currentDataList = S.SYLLABLES_BATCHIM;
      loadCharacter(S.currentCharIdx);
    } else {
      S.currentMode = 'vowels';
      S.currentDataList = VOWELS;
      loadCharacter(i);
    }
  }, [loadCharacter]);

  const handleBatchimClick = useCallback((i) => {
    S.selectedBatchim = JONGSUNG_LIST[i];
    S.SYLLABLES_BATCHIM = buildSyllablesBatchim(S.selectedVowel, S.selectedBatchim);
    S.currentDataList = S.SYLLABLES_BATCHIM;
    loadCharacter(S.currentCharIdx);
  }, [loadCharacter]);

  // Derive render state
  const appMode = S.appMode;
  const currentMode = S.currentMode;
  const currentCharIdx = S.currentCharIdx;
  const selectedVowel = S.selectedVowel;
  const selectedBatchim = S.selectedBatchim;

  const consItems = CONSONANTS;
  const vowItems = (appMode === 'combine' || appMode === 'combine2')
    ? COMBINE_VOWELS.map(v => ({ char: v })) : VOWELS;

  return (
    <>
      {import.meta.env.DEV && <Agentation />}
      <div id="bg-layer"></div>
      <div id="app-container">
        <header>
          <div className="btn-home" onClick={() => location.reload()} title="홈으로">
            <svg viewBox="0 0 100 100">
              <path d="M25 50 L50 25 L75 50 V75 H60 V55 H40 V75 H25 Z" fill="white" />
            </svg>
          </div>
          <h1 className="app-title">진아의 한글 공부</h1>
          <div className="mode-toggle">
            <div
              className={`mode-btn ${appMode === 'basic' ? 'active' : ''}`}
              onClick={handleModeBasic}
            >기본</div>
            <div
              className={`mode-btn ${appMode === 'combine' ? 'active' : ''}`}
              onClick={handleModeCombine}
            >붙이기</div>
            <div
              className={`mode-btn ${appMode === 'combine2' ? 'active' : ''}`}
              onClick={handleModeCombine2}
            >붙이기2</div>
          </div>
        </header>

        <div className="main-layout">
          <aside className="side-panel left-panel" id="panel-cons">
            <div className="panel-label">자 음</div>
            <div className="panel-list" id="cons-list">
              {consItems.map((item, i) => (
                <div
                  key={item.char}
                  className={`thumb ${
                    ((appMode === 'combine' || appMode === 'combine2') && i === currentCharIdx) ||
                    (appMode === 'basic' && currentMode === 'consonants' && i === currentCharIdx)
                      ? 'active' : ''
                  }`}
                  onClick={() => handleConsClick(i)}
                >{item.char}</div>
              ))}
            </div>
          </aside>

          <main>
            <div className="nav-arrow left" title="이전" onClick={prevChar}>&#10094;</div>

            <div className="study-card card-square" id="study-card" ref={cardRef}>
              <canvas id="guide-canvas" ref={guideRef}></canvas>
              <canvas id="arrow-canvas" ref={arrowRef}></canvas>
              <canvas id="trace-canvas" ref={traceRef}></canvas>
              <div id="overlay-icons" ref={overlayRef}></div>
            </div>

            <div className="nav-arrow right" title="다음" onClick={nextChar}>&#10095;</div>
          </main>

          <aside className="side-panel right-panel" id="panel-vow">
            <div className="panel-label">모 음</div>
            <div className="panel-list" id="vow-list">
              {vowItems.map((item, i) => (
                <div
                  key={item.char}
                  className={`thumb ${
                    ((appMode === 'combine' || appMode === 'combine2') && COMBINE_VOWELS[i] === selectedVowel) ||
                    (appMode === 'basic' && currentMode === 'vowels' && i === currentCharIdx)
                      ? 'active' : ''
                  }`}
                  onClick={() => handleVowClick(i)}
                >{item.char}</div>
              ))}
            </div>

            {appMode === 'combine2' && (
              <>
                <div className="panel-label">받 침</div>
                <div className="panel-list" id="batchim-list">
                  {JONGSUNG_LIST.map((ch, i) => (
                    <div
                      key={ch}
                      className={`thumb ${ch === selectedBatchim ? 'active' : ''}`}
                      onClick={() => handleBatchimClick(i)}
                    >{ch}</div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
