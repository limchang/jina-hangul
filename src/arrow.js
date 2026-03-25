// arrow.js — 획순 안내 애니메이션 (트레일 + 화살표)
let arrowAnimId = null;
let arrowT = 0;

function startArrowAnim(pts) {
  if (arrowAnimId) cancelAnimationFrame(arrowAnimId);
  if (!pts || pts.length < 2) return;
  arrowT = 0;
  let lastTime = null;

  function step(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    // 2.5초에 한 바퀴
    arrowT = (arrowT + dt / 2500) % 1;
    drawArrowFrame(aCtx, pts, arrowT);
    arrowAnimId = requestAnimationFrame(step);
  }
  arrowAnimId = requestAnimationFrame(step);
}

function drawArrowFrame(ctx, pts, t) {
  const total = pts.length - 1;
  ctx.clearRect(0, 0, 500, 500);

  // 현재 화살표 위치 인덱스
  const headIdx = Math.min(Math.floor(t * total), total - 1);

  // === 1) 트레일: 화살표가 지나간 경로를 밝게 표시 ===
  // 꼬리 페이드 — 최근 30%만 보이고 나머지는 사라짐
  const trailLen = Math.floor(total * 0.35);
  const trailStart = Math.max(0, headIdx - trailLen);

  if (headIdx > trailStart) {
    for (let seg = trailStart; seg < headIdx; seg++) {
      const progress = (seg - trailStart) / (headIdx - trailStart); // 0(꼬리)~1(머리)
      const alpha = progress * 0.6;
      const width = 8 + progress * 16;

      ctx.beginPath();
      ctx.moveTo(pts[seg].x, pts[seg].y);
      ctx.lineTo(pts[seg + 1].x, pts[seg + 1].y);
      ctx.strokeStyle = `rgba(255, 220, 80, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 트레일 위에 얇은 밝은 중심선
    ctx.beginPath();
    ctx.moveTo(pts[trailStart].x, pts[trailStart].y);
    for (let i = trailStart + 1; i <= headIdx; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // === 2) 화살표 머리 ===
  const fi = Math.min(t * total, total - 0.01);
  const i = Math.floor(fi);
  const frac = fi - i;
  const px = pts[i].x + (pts[i + 1].x - pts[i].x) * frac;
  const py = pts[i].y + (pts[i + 1].y - pts[i].y) * frac;

  // 방향 계산
  const bi = Math.max(0, i - 3);
  const dx = px - pts[bi].x;
  const dy = py - pts[bi].y;
  const angle = Math.atan2(dy, dx);

  // 화살표 글로우
  ctx.save();
  ctx.translate(px, py);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
  glow.addColorStop(0, 'rgba(255,240,100,0.5)');
  glow.addColorStop(1, 'rgba(255,220,50,0)');
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.restore();

  // 화살표
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;

  const R = 20, r = 12;
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(-r, -r * 0.85);
  ctx.lineTo(-r * 0.35, 0);
  ctx.lineTo(-r, r * 0.85);
  ctx.closePath();
  ctx.fillStyle = '#fff700';
  ctx.fill();
  ctx.strokeStyle = '#e6a800';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function stopArrowAnim() {
  if (arrowAnimId) { cancelAnimationFrame(arrowAnimId); arrowAnimId = null; }
  aCtx.clearRect(0, 0, 500, 500);
}
