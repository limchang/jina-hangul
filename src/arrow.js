// arrow.js — 화살표 애니메이션
let arrowAnimId = null;
let arrowT = 0;

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

    const bi = Math.max(0, i - 3);
    const dx = px - pts[bi].x;
    const dy = py - pts[bi].y;
    const angle = Math.atan2(dy, dx);

    ctx.clearRect(0, 0, 500, 500);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;

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
