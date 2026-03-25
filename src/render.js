// render.js — 가이드/트레이스 렌더링 + 아이콘

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
      gCtx.beginPath();
      gCtx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
      gCtx.fillStyle = '#44ee88';
      gCtx.fill();
      gCtx.strokeStyle = '#fff';
      gCtx.lineWidth = 3;
      gCtx.stroke();

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
  // 파티클 렌더링
  if (typeof particleSystem !== 'undefined') {
    particleSystem.draw(tCtx);
  }
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
