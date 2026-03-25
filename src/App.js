// App.js — 단일 카드, 모드별 비율 변경

let engine;
let currentMode = 'consonants';
let currentDataList = CONSONANTS;
let currentCharIdx = 0;
let currentStrokeIdx = 0;

let guideCanvas, traceCanvas, arrowCanvas, gCtx, tCtx, aCtx;
let overlay, handlerIcon, targetIcon;
let completedStrokes = [];

// 현재 캔버스 크기 (정사각형: 500×500, 가로형: 1000×500)
let cvW = 500, cvH = 500;

function initApp() {
  guideCanvas = document.getElementById('guide-canvas');
  arrowCanvas = document.getElementById('arrow-canvas');
  traceCanvas = document.getElementById('trace-canvas');
  gCtx = guideCanvas.getContext('2d');
  aCtx = arrowCanvas.getContext('2d');
  tCtx = traceCanvas.getContext('2d');
  overlay = document.getElementById('overlay-icons');

  engine = new TracingEngine(tCtx, APP_CONFIG);

  setupPanels();
  setupNav();
  setupInput();

  window.addEventListener('resize', resize);

  setTimeout(() => {
    resize();
    loadCharacter(0);
  }, 50);
}

function setCardMode(mode) {
  const card = document.getElementById('study-card');
  card.classList.remove('card-square', 'card-wide');

  if (mode === 'syllables') {
    card.classList.add('card-wide');
    cvW = 1000; cvH = 500;
  } else {
    card.classList.add('card-square');
    cvW = 500; cvH = 500;
  }
}

function resize() {
  setCardMode(currentMode);

  guideCanvas.width = arrowCanvas.width = traceCanvas.width = cvW;
  guideCanvas.height = arrowCanvas.height = traceCanvas.height = cvH;
  guideCanvas.style.width = arrowCanvas.style.width = traceCanvas.style.width = '100%';
  guideCanvas.style.height = arrowCanvas.style.height = traceCanvas.style.height = '100%';

  if (currentDataList) drawGuide();
}

function loadCharacter(idx) {
  currentCharIdx = idx;
  currentStrokeIdx = 0;
  completedStrokes = [];
  resize();
  updateFooterActive();
  drawGuide();
  loadStroke(0);
}

function loadStroke(idx) {
  currentStrokeIdx = idx;
  const charData = currentDataList[currentCharIdx];
  const strokePath = charData.strokes[idx].path;

  const ch = charData.char;
  const isClosed = strokePath.includes('A') || ch === 'ㅁ' || ch === 'ㅇ'
    || ch === '마' || ch === '아';
  engine.setStroke(strokePath, isClosed);

  drawGuide(false);
  renderTrace();
  setupIcons();
  startArrowAnim(engine.pts);
}

function completeStroke() {
  const charData = currentDataList[currentCharIdx];
  completedStrokes.push([...engine.pts]);

  currentStrokeIdx++;
  if (currentStrokeIdx >= charData.strokes.length) {
    showSuccessAnim();
    setTimeout(() => {
      if (currentMode === 'consonants') {
        // 자음 완성 → 같은 글자의 음절 카드로
        currentMode = 'syllables';
        currentDataList = SYLLABLES_A;
        loadCharacter(currentCharIdx);
        updatePanelActive();
      } else {
        // 음절 완성 → 다음 글자 자음으로
        currentMode = 'consonants';
        currentDataList = CONSONANTS;
        const nextIdx = (currentCharIdx + 1) % CONSONANTS.length;
        loadCharacter(nextIdx);
        updatePanelActive();
      }
    }, 800);
  } else {
    loadStroke(currentStrokeIdx);
  }
}

function showSuccessAnim() {
  stopArrowAnim();
  const card = document.getElementById('study-card');
  card.classList.add('success-anim');
  setTimeout(() => card.classList.remove('success-anim'), 400);
  overlay.innerHTML = '';
  particleSystem.celebrate(cvW / 2, cvH / 2);
  startParticleLoop();
  setTimeout(() => stopParticleLoop(), 2000);
}

window.addEventListener('load', initApp);
