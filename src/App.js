let engine;
let currentMode = 'consonants';
let currentDataList = CONSONANTS;
let currentCharIdx = 0;
let currentStrokeIdx = 0;

let guideCanvas, traceCanvas, gCtx, tCtx;
let overlay, handlerIcon, targetIcon;

function initApp() {
  guideCanvas = document.getElementById('guide-canvas');
  traceCanvas = document.getElementById('trace-canvas');
  gCtx = guideCanvas.getContext('2d');
  tCtx = traceCanvas.getContext('2d');
  overlay = document.getElementById('overlay-icons');
  
  engine = new TracingEngine(tCtx, APP_CONFIG);
  
  setupTabs();
  setupFooter();
  setupNav();
  
  window.addEventListener('resize', resize);
  
  const card = document.getElementById('study-card');
  card.addEventListener('mousedown', onPointerDown);
  card.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  
  card.addEventListener('touchstart', onPointerDown, {passive: false});
  card.addEventListener('touchmove', onPointerMove, {passive: false});
  window.addEventListener('touchend', onPointerUp);
  
  // Quick delay to ensure logic sizes are correct
  setTimeout(() => {
    resize();
    loadCharacter(0);
  }, 50);
}

function resize() {
  const rect = document.getElementById('study-card').getBoundingClientRect();
  
  // Internal Resolution (500x500 map)
  guideCanvas.width = 500;
  guideCanvas.height = 500;
  traceCanvas.width = 500;
  traceCanvas.height = 500;
  
  // External CSS styling bounds
  guideCanvas.style.width = '100%';
  guideCanvas.style.height = '100%';
  traceCanvas.style.width = '100%';
  traceCanvas.style.height = '100%';
  
  if (currentDataList) drawGuide();
}

function getPointerPos(e) {
  if (e.touches && e.touches.length > 0) e = e.touches[0];
  const rect = traceCanvas.getBoundingClientRect();
  const scaleX = 500 / rect.width;
  const scaleY = 500 / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function onPointerDown(e) {
  e.preventDefault();
  const pos = getPointerPos(e);
  if (engine.start(pos.x, pos.y)) {
    renderTrace();
    updateIcons();
    handlerIcon.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(5deg)';
  }
}

function onPointerMove(e) {
  if (!engine.isTracing) return;
  e.preventDefault();
  const pos = getPointerPos(e);
  engine.move(pos.x, pos.y);
  renderTrace();
  updateIcons();
}

function onPointerUp(e) {
  if (!engine.isTracing) return;
  handlerIcon.style.transform = 'translate(-50%, -50%)';
  if (engine.end()) {
    completeStroke();
  } else {
    // Reset visuals if they failed the stroke
    renderTrace();
    updateIcons();
  }
}

function completeStroke() {
  const charData = currentDataList[currentCharIdx];
  // Bake the successful trace into the guide canvas
  gCtx.beginPath();
  gCtx.strokeStyle = APP_CONFIG.TRACE_COLOR;
  gCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.moveTo(engine.pts[0].x, engine.pts[0].y);
  for (const p of engine.pts) gCtx.lineTo(p.x, p.y);
  gCtx.stroke();
  
  currentStrokeIdx++;
  if (currentStrokeIdx >= charData.strokes.length) {
    showSuccessAnim();
    setTimeout(() => nextChar(), 800);
  } else {
    loadStroke(currentStrokeIdx);
  }
}

function showSuccessAnim() {
  const card = document.getElementById('study-card');
  card.classList.add('success-anim');
  setTimeout(() => card.classList.remove('success-anim'), 400);
  overlay.innerHTML = '';
}

function loadCharacter(idx) {
  currentCharIdx = idx;
  currentStrokeIdx = 0;
  updateFooterActive();
  drawGuide();
  loadStroke(0);
}

function loadStroke(idx) {
  currentStrokeIdx = idx;
  const charData = currentDataList[currentCharIdx];
  const strokePath = charData.strokes[idx].path;
  
  const isClosed = strokePath.includes('A') || charData.char === 'ㅁ';
  engine.setStroke(strokePath, isClosed);
  
  renderTrace();
  setupIcons();
}

function drawGuide() {
  gCtx.clearRect(0, 0, 500, 500);
  const charData = currentDataList[currentCharIdx];
  
  gCtx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  
  charData.strokes.forEach(s => {
    const p2d = new Path2D(s.path);
    gCtx.stroke(p2d);
  });
}

function renderTrace() {
  tCtx.clearRect(0, 0, 500, 500);
  engine.draw();
}

function getIconImageUrl(char) {
  return `icons/${char}/character/img.png`;
}

function setupIcons() {
  const char = currentDataList[currentCharIdx].char;
  overlay.innerHTML = `
    <div id="target-icon" class="target-icon">${APP_CONFIG.STARFISH_SVG}</div>
    <img id="handler-icon" class="character-handler" src="${getIconImageUrl(char)}" onerror="this.src='gazelle.png'">
  `;
  handlerIcon = document.getElementById('handler-icon');
  targetIcon = document.getElementById('target-icon');
  updateIcons();
}

function updateIcons() {
  if (!engine.pts) return;
  const hp = engine.getHandlerPos();
  const tp = engine.getTargetPos();
  
  handlerIcon.style.left = `${(hp.x / 500) * 100}%`;
  handlerIcon.style.top = `${(hp.y / 500) * 100}%`;
  targetIcon.style.left = `${(tp.x / 500) * 100}%`;
  targetIcon.style.top = `${(tp.y / 500) * 100}%`;
}

function setupTabs() {
  const tc = document.getElementById('tab-cons');
  const tv = document.getElementById('tab-vow');
  tc.onclick = () => { currentMode='consonants'; currentDataList=CONSONANTS; tc.classList.add('active'); tv.classList.remove('active'); setupFooter(); loadCharacter(0); };
  tv.onclick = () => { currentMode='vowels'; currentDataList=VOWELS; tv.classList.add('active'); tc.classList.remove('active'); setupFooter(); loadCharacter(0); };
}

function setupFooter() {
  const footer = document.getElementById('footer-menu');
  footer.innerHTML = '';
  currentDataList.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerText = item.char;
    div.onclick = () => loadCharacter(i);
    footer.appendChild(div);
  });
}

function updateFooterActive() {
  const footer = document.getElementById('footer-menu');
  Array.from(footer.children).forEach((el, i) => {
    if (i === currentCharIdx) {
      el.classList.add('active');
      el.scrollIntoView({behavior:'smooth', inline:'center'});
    } else {
      el.classList.remove('active');
    }
  });
}

function setupNav() {
  document.querySelector('.nav-arrow.left').onclick = () => prevChar();
  document.querySelector('.nav-arrow.right').onclick = () => nextChar();
}

function nextChar() { loadCharacter((currentCharIdx + 1) % currentDataList.length); }
function prevChar() { loadCharacter((currentCharIdx - 1 + currentDataList.length) % currentDataList.length); }

window.addEventListener('load', initApp);
