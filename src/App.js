// App.js — 듀얼 카드 초기화 + 글자 로딩

let engine;
let currentMode = 'consonants'; // 현재 활성 카드: 'consonants' or 'syllables'
let currentCharIdx = 0;
let currentStrokeIdx = 0;
let currentDataList = CONSONANTS;

// 듀얼 카드용 캔버스/컨텍스트
let guideCanvas, traceCanvas, arrowCanvas, gCtx, tCtx, aCtx;
let overlay, handlerIcon, targetIcon;
let completedStrokes = [];

// 보조 카드 (비활성 쪽 미리보기)
let guideCanvas2, gCtx2;

function initApp() {
  setActiveCard('cons');

  setupPanels();
  setupNav();
  setupInput();
  setupCardClick();

  window.addEventListener('resize', resize);

  setTimeout(() => {
    resize();
    loadCharacter(0);
  }, 50);
}

function setActiveCard(which) {
  const consCard = document.getElementById('card-cons');
  const sylCard = document.getElementById('card-syl');

  if (which === 'cons') {
    currentMode = 'consonants';
    currentDataList = CONSONANTS;
    consCard.classList.add('active-card');
    sylCard.classList.remove('active-card');

    guideCanvas = document.getElementById('guide-canvas-cons');
    arrowCanvas = document.getElementById('arrow-canvas-cons');
    traceCanvas = document.getElementById('trace-canvas-cons');
    overlay = document.getElementById('overlay-cons');

    guideCanvas2 = document.getElementById('guide-canvas-syl');
    gCtx2 = guideCanvas2.getContext('2d');
  } else {
    currentMode = 'syllables';
    currentDataList = SYLLABLES_A;
    sylCard.classList.add('active-card');
    consCard.classList.remove('active-card');

    guideCanvas = document.getElementById('guide-canvas-syl');
    arrowCanvas = document.getElementById('arrow-canvas-syl');
    traceCanvas = document.getElementById('trace-canvas-syl');
    overlay = document.getElementById('overlay-syl');

    guideCanvas2 = document.getElementById('guide-canvas-cons');
    gCtx2 = guideCanvas2.getContext('2d');
  }

  gCtx = guideCanvas.getContext('2d');
  aCtx = arrowCanvas.getContext('2d');
  tCtx = traceCanvas.getContext('2d');

  if (engine) {
    engine.ctx = tCtx;
  } else {
    engine = new TracingEngine(tCtx, APP_CONFIG);
  }
}

function setupCardClick() {
  document.getElementById('card-cons').onclick = () => {
    if (currentMode === 'consonants') return;
    stopArrowAnim();
    setActiveCard('cons');
    resize();
    loadCharacter(currentCharIdx);
    updatePanelActive();
  };
  document.getElementById('card-syl').onclick = () => {
    if (currentMode === 'syllables') return;
    stopArrowAnim();
    setActiveCard('syl');
    resize();
    loadCharacter(currentCharIdx);
    updatePanelActive();
  };
}

function resize() {
  // 모든 캔버스 사이즈 설정
  const allCanvases = document.querySelectorAll('.guide-cv, .arrow-cv, .trace-cv');
  allCanvases.forEach(cv => {
    cv.width = 500;
    cv.height = 500;
    cv.style.width = '100%';
    cv.style.height = '100%';
  });

  if (currentDataList) {
    drawGuide();
    drawPreview();
  }
}

// 비활성 카드에 미리보기 그리기
function drawPreview() {
  if (!gCtx2) return;
  gCtx2.clearRect(0, 0, 500, 500);

  const previewData = currentMode === 'consonants' ? SYLLABLES_A : CONSONANTS;
  if (!previewData[currentCharIdx]) return;
  const charData = previewData[currentCharIdx];
  const isPreviewSyl = currentMode === 'consonants'; // 프리뷰가 음절이면

  const pw = isPreviewSyl ? 48 : APP_CONFIG.GUIDE_STROKE_WIDTH;

  // 글로우
  gCtx2.strokeStyle = 'rgba(255,255,255,0.25)';
  gCtx2.lineWidth = pw + (isPreviewSyl ? 18 : 28);
  gCtx2.lineCap = 'round';
  gCtx2.lineJoin = 'round';
  gCtx2.setLineDash([]);
  charData.strokes.forEach(s => { gCtx2.stroke(new Path2D(s.path)); });

  // 메인 가이드
  gCtx2.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  gCtx2.lineWidth = pw;
  gCtx2.lineCap = 'round';
  gCtx2.lineJoin = 'round';
  gCtx2.setLineDash([]);
  charData.strokes.forEach(s => { gCtx2.stroke(new Path2D(s.path)); });
}

function loadCharacter(idx) {
  currentCharIdx = idx;
  currentStrokeIdx = 0;
  completedStrokes = [];
  updateFooterActive();
  drawGuide();
  drawPreview();
  loadStroke(0);
}

function loadStroke(idx) {
  currentStrokeIdx = idx;
  const charData = currentDataList[currentCharIdx];
  const strokePath = charData.strokes[idx].path;

  const isClosed = strokePath.includes('A') || charData.char === 'ㅁ' || charData.char === 'ㅇ'
    || charData.char === '마' || charData.char === '아';
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
      // 자음 카드 완성 → 음절 카드로 전환
      if (currentMode === 'consonants') {
        setActiveCard('syl');
        resize();
        loadCharacter(currentCharIdx);
        updatePanelActive();
      } else {
        // 음절 카드 완성 → 다음 글자의 자음 카드로
        const nextIdx = (currentCharIdx + 1) % CONSONANTS.length;
        setActiveCard('cons');
        resize();
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
  const activeCard = currentMode === 'consonants'
    ? document.getElementById('card-cons')
    : document.getElementById('card-syl');
  activeCard.classList.add('success-anim');
  setTimeout(() => activeCard.classList.remove('success-anim'), 400);
  overlay.innerHTML = '';
  particleSystem.celebrate(250, 250);
  startParticleLoop();
  setTimeout(() => stopParticleLoop(), 2000);
}

window.addEventListener('load', initApp);
