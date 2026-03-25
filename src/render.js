// render.js — 가이드/트레이스 렌더링 + 아이콘

function drawGuide(clear = true) {
  if (clear) gCtx.clearRect(0, 0, 500, 500);
  const charData = currentDataList[currentCharIdx];

  // 음절은 획이 많으므로 가이드 두께를 줄임
  const isSyllable = currentMode === 'syllables';
  const guideW = isSyllable ? 48 : APP_CONFIG.GUIDE_STROKE_WIDTH;
  const traceW = isSyllable ? 48 : APP_CONFIG.TRACE_STROKE_WIDTH;

  // Glow layer
  gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
  gCtx.lineWidth = guideW + (isSyllable ? 18 : 28);
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  // Main guide (solid white shape)
  gCtx.strokeStyle = APP_CONFIG.GUIDE_COLOR;
  gCtx.lineWidth = guideW;
  gCtx.lineCap = 'round';
  gCtx.lineJoin = 'round';
  gCtx.setLineDash([]);
  charData.strokes.forEach(s => { gCtx.stroke(new Path2D(s.path)); });

  // Completed strokes in yellow on top
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

  // 현재 획 시작점만 표시 (화살표 애니메이션이 경로를 안내)
  if (currentStrokeIdx < charData.strokes.length) {
    const pts = samplePath(charData.strokes[currentStrokeIdx].path, 80);
    if (pts.length >= 2) {
      // 시작점 초록 점
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
  tCtx.clearRect(0, 0, 500, 500);
  engine.draw();
  // 파티클 렌더링
  if (typeof particleSystem !== 'undefined') {
    particleSystem.draw(tCtx);
  }
}

function getIconImageUrl(char) {
  if (typeof ICON_MAP !== 'undefined' && ICON_MAP[char]) {
    return ICON_MAP[char];
  }
  return `icons/${char}/character/img.png`;
}

function setupIcons() {
  const char = currentDataList[currentCharIdx].char;
  overlay.innerHTML = `
    <div id="target-icon" class="target-icon">${APP_CONFIG.STARFISH_SVG}</div>
    <img id="handler-icon" class="character-handler" src="${getIconImageUrl(char)}" onerror="this.src='img.png'">
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
