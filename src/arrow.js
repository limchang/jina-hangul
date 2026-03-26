// arrow.js — 획순 안내 애니메이션 (ES Module)
// 인스턴스별 독립 애니메이션 지원 — 경량화 버전

export function drawArrowFrame(ctx, pts, t, cvW, cvH) {
  const total = pts.length - 1;
  ctx.clearRect(0, 0, cvW, cvH);

  const headIdx = Math.min(Math.floor(t * total), total - 1);
  const trailLen = Math.floor(total * 0.35);
  const trailStart = Math.max(0, headIdx - trailLen);

  // 단일 path로 트레일 그리기 (세그먼트별 개별 stroke 제거)
  if (headIdx > trailStart) {
    ctx.beginPath();
    ctx.moveTo(pts[trailStart].x, pts[trailStart].y);
    for (let i = trailStart + 1; i <= headIdx; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 220, 80, 0.45)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // 화살표 머리 위치
  const fi = Math.min(t * total, total - 0.01);
  const i = Math.floor(fi);
  const frac = fi - i;
  const px = pts[i].x + (pts[i + 1].x - pts[i].x) * frac;
  const py = pts[i].y + (pts[i + 1].y - pts[i].y) * frac;

  const bi = Math.max(0, i - 3);
  const dx = px - pts[bi].x;
  const dy = py - pts[bi].y;
  const angle = Math.atan2(dy, dx);

  // 화살표 (shadow/glow 제거)
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

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

// 인스턴스별 애니메이션 — handle 객체를 반환
export function startArrowAnim(pts, aCtx, cvW, cvH) {
  if (_globalAnimId) cancelAnimationFrame(_globalAnimId);
  if (!pts || pts.length < 2) return { id: null };
  let t = 0;
  let lastTime = null;
  let animId = null;

  function step(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    t = (t + dt / 2500) % 1;
    drawArrowFrame(aCtx, pts, t, cvW, cvH);
    animId = requestAnimationFrame(step);
    _globalAnimId = animId;
  }
  animId = requestAnimationFrame(step);
  _globalAnimId = animId;
  return { get id() { return animId; }, stop() { if (animId) { cancelAnimationFrame(animId); animId = null; } } };
}

let _globalAnimId = null;

export function stopArrowAnim(aCtx, cvW, cvH) {
  if (_globalAnimId) { cancelAnimationFrame(_globalAnimId); _globalAnimId = null; }
  if (aCtx) aCtx.clearRect(0, 0, cvW, cvH);
}

// 독립 인스턴스용 — 글로벌 상태를 건드리지 않음
export function createArrowAnim(pts, aCtx, cvW, cvH) {
  if (!pts || pts.length < 2) return { stop() {} };
  let t = 0;
  let lastTime = null;
  let animId = null;
  let running = true;

  function step(ts) {
    if (!running) return;
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    t = (t + dt / 2500) % 1;
    drawArrowFrame(aCtx, pts, t, cvW, cvH);
    animId = requestAnimationFrame(step);
  }
  animId = requestAnimationFrame(step);

  return {
    stop() {
      running = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      if (aCtx) aCtx.clearRect(0, 0, cvW, cvH);
    }
  };
}
