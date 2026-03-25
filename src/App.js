// App.js — 초기화 + 글자 로딩 코어 로직

let engine;
let currentMode = 'consonants';
let currentDataList = CONSONANTS;
let currentCharIdx = 0;
let currentStrokeIdx = 0;

let guideCanvas, traceCanvas, arrowCanvas, gCtx, tCtx, aCtx;
let overlay, handlerIcon, targetIcon;
let completedStrokes = [];

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

function resize() {
  guideCanvas.width = arrowCanvas.width = traceCanvas.width = 500;
  guideCanvas.height = arrowCanvas.height = traceCanvas.height = 500;
  guideCanvas.style.width = arrowCanvas.style.width = traceCanvas.style.width = '100%';
  guideCanvas.style.height = arrowCanvas.style.height = traceCanvas.style.height = '100%';
  if (currentDataList) drawGuide();
}

function loadCharacter(idx) {
  currentCharIdx = idx;
  currentStrokeIdx = 0;
  completedStrokes = [];
  updateFooterActive();
  drawGuide();
  loadStroke(0);
}

function loadStroke(idx) {
  currentStrokeIdx = idx;
  const charData = currentDataList[currentCharIdx];
  const strokePath = charData.strokes[idx].path;

  const isClosed = strokePath.includes('A') || charData.char === 'ㅁ' || charData.char === 'ㅇ';
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
}

window.addEventListener('load', initApp);
