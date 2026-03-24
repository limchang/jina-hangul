let engine;
let currentMode = 'consonants';
let currentDataList = CONSONANTS;
let currentCharIdx = 0;
let currentStrokeIdx = 0;

let guideCanvas, traceCanvas, arrowCanvas, gCtx, tCtx, aCtx;
let overlay, handlerIcon, targetIcon;
let arrowAnimId = null;
let arrowT = 0; // 0~1 along current stroke path
let completedStrokes = []; // baked stroke point arrays

function initApp() {
  guideCanvas = document.getElementById('guide-canvas');
  arrowCanvas = document.getElementById('arrow-canvas');
  traceCanvas = document.getElementById('trace-canvas');
  gCtx = guideCanvas.getContext('2d');
  aCtx = arrowCanvas.getContext('2d');
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
  guideCanvas.width = arrowCanvas.width = traceCanvas.width = 500;
  guideCanvas.height = arrowCanvas.height = traceCanvas.height = 500;
  guideCanvas.style.width = arrowCanvas.style.width = traceCanvas.style.width = '100%';
  guideCanvas.style.height = arrowCanvas.style.height = traceCanvas.style.height = '100%';
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
    stopArrowAnim();
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

function onPointerUp() {
  if (!engine.isTracing) return;
  handlerIcon.style.transform = 'translate(-50%, -50%)';
  if (engine.end()) {
    completeStroke();
  } else {
    // Reset visuals if they failed the stroke
    renderTrace();
    updateIcons();
    startArrowAnim(engine.pts);
  }
}

function completeStroke() {
  const charData = currentDataList[currentCharIdx];
  // Save completed stroke pts for re-drawing
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

function startArrowAnim(pts) {
  if (arrowAnimId) cancelAnimationFrame(arrowAnimId);
  if (!pts || pts.length < 2) return;
  arrowT = 0;
  let lastTime = null;

  function drawArrow(ctx, pts, t) {
    const total = pts.length - 1;
    const fi = Math.min(t * total, total - 0.01);
    const i = Math.floor(fi);
    const frac = fi - i;
    const px = pts[i].x + (pts[i+1].x - pts[i].x) * frac;
    const py = pts[i].y + (pts[i+1].y - pts[i].y) * frac;

    // Direction from a bit behind
    const bi = Math.max(0, i - 3);
    const dx = px - pts[bi].x;
    const dy = py - pts[bi].y;
    const angle = Math.atan2(dy, dx);

    ctx.clearRect(0, 0, 500, 500);

    // Shadow
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;

    // Arrowhead
    const R = 22, r = 13;
    ctx.beginPath();
    ctx.moveTo(R, 0);
    ctx.lineTo(-r, -r * 0.85);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r, r * 0.85);
    ctx.closePath();
    ctx.fillStyle = '#fff700';
    ctx.fill();
    ctx.strokeStyle = '#e6a800';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  function step(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    // 3초에 한 바퀴 (loop)
    arrowT = (arrowT + dt / 3000) % 1;
    drawArrow(aCtx, pts, arrowT);
    arrowAnimId = requestAnimationFrame(step);
  }
  arrowAnimId = requestAnimationFrame(step);
}

function stopArrowAnim() {
  if (arrowAnimId) { cancelAnimationFrame(arrowAnimId); arrowAnimId = null; }
  aCtx.clearRect(0, 0, 500, 500);
}

function drawGuide(clear = true) {
  if (clear) gCtx.clearRect(0, 0, 500, 500);
  const charData = currentDataList[currentCharIdx];

  // Glow layer
  gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
  gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  // Main guide (solid white shape)
  gCtx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  // Completed strokes in yellow on top
  completedStrokes.forEach(pts => {
    gCtx.beginPath();
    gCtx.strokeStyle = APP_CONFIG.TRACE_COLOR;
    gCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
    gCtx.lineCap = 'round';
    gCtx.lineJoin = 'round';
    gCtx.setLineDash([]);
    gCtx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) gCtx.lineTo(p.x, p.y);
    gCtx.stroke();
  });

  // Dashed direction guideline on top (orange dashes with dots)
  charData.strokes.forEach((s, si) => {
    const pts = samplePath(s.path, 80);
    if (pts.length < 2) return;

    // Draw dashed line
    gCtx.strokeStyle = si === currentStrokeIdx ? 'rgba(255,160,30,0.9)' : 'rgba(255,160,30,0.35)';
    gCtx.lineWidth = 5;
    gCtx.lineCap = 'round';
    gCtx.setLineDash([12, 14]);
    gCtx.beginPath();
    gCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gCtx.lineTo(pts[i].x, pts[i].y);
    gCtx.stroke();
    gCtx.setLineDash([]);

    // Start dot (green) and end arrow (orange) for current stroke only
    if (si === currentStrokeIdx) {
      // Start circle
      gCtx.beginPath();
      gCtx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
      gCtx.fillStyle = '#44ee88';
      gCtx.fill();
      gCtx.strokeStyle = '#fff';
      gCtx.lineWidth = 3;
      gCtx.stroke();

      // End arrowhead
      const ep = pts[pts.length - 1];
      const bp = pts[pts.length - 6];
      const angle = Math.atan2(ep.y - bp.y, ep.x - bp.x);
      gCtx.save();
      gCtx.translate(ep.x, ep.y);
      gCtx.rotate(angle);
      gCtx.beginPath();
      gCtx.moveTo(13, 0);
      gCtx.lineTo(-9, -8);
      gCtx.lineTo(-5, 0);
      gCtx.lineTo(-9, 8);
      gCtx.closePath();
      gCtx.fillStyle = 'rgba(255,140,20,0.9)';
      gCtx.fill();
      gCtx.restore();
    }
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
  tc.onclick = () => { tc.classList.add('active'); tv.classList.remove('active'); currentDataList = CONSONANTS; setupFooter(); loadCharacter(0); };
  tv.onclick = () => { tv.classList.add('active'); tc.classList.remove('active'); currentDataList = VOWELS; setupFooter(); loadCharacter(0); };
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
