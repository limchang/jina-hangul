// App.js — 기본 모드 / 붙이기 모드

let engine;
let appMode = 'basic'; // 'basic' or 'combine'
let currentMode = 'consonants';
let currentDataList = CONSONANTS;
let currentCharIdx = 0;
let currentStrokeIdx = 0;

let guideCanvas, traceCanvas, arrowCanvas, gCtx, tCtx, aCtx;
let overlay, handlerIcon, targetIcon;
let completedStrokes = [];

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
  setupModeToggle();

  window.addEventListener('resize', resize);

  setTimeout(() => {
    resize();
    loadCharacter(0);
  }, 50);
}

function setupModeToggle() {
  const btnBasic = document.getElementById('mode-basic');
  const btnCombine = document.getElementById('mode-combine');

  btnBasic.onclick = () => {
    if (appMode === 'basic') return;
    appMode = 'basic';
    btnBasic.classList.add('active');
    btnCombine.classList.remove('active');
    currentMode = 'consonants';
    currentDataList = CONSONANTS;
    setupPanels();
    loadCharacter(0);
  };

  btnCombine.onclick = () => {
    if (appMode === 'combine') return;
    appMode = 'combine';
    btnCombine.classList.add('active');
    btnBasic.classList.remove('active');
    currentMode = 'syllables';
    currentDataList = SYLLABLES;
    setupPanels();
    loadCharacter(0);
  };
}

function setCardMode(mode) {
  const card = document.getElementById('study-card');
  card.classList.remove('card-square', 'card-wide');

  if (mode === 'syllables') {
    card.classList.add('card-wide');
    cvW = 700; cvH = 500;
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
    setTimeout(() => nextChar(), 800);
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
