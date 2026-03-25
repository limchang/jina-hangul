const svgNS = "http://www.w3.org/2000/svg";
const tempSvg = document.createElementNS(svgNS, "svg");
tempSvg.style.position = 'absolute';
tempSvg.style.width = '0';
tempSvg.style.height = '0';
tempSvg.style.visibility = 'hidden';
const tempPath = document.createElementNS(svgNS, "path");
tempSvg.appendChild(tempPath);

window.addEventListener('DOMContentLoaded', () => {
  document.body.appendChild(tempSvg);
});

function samplePath(pathStr, samples = 120) {
  tempPath.setAttribute("d", pathStr);
  const len = tempPath.getTotalLength();
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const p = tempPath.getPointAtLength((i / samples) * len);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

class TracingEngine {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.pts = [];
    this.reset();
  }

  setStroke(pathStr, isClosedLoop) {
    this.pts = samplePath(pathStr, 120);
    this.isClosedLoop = isClosedLoop;
    this.reset();
  }

  reset() {
    this.isTracing = false;
    this.maxReachedIdx = 0;
    this.offPathCount = 0;
  }

  start(x, y) {
    if (!this.pts || this.pts.length === 0) return false;
    
    // Check distance to the first point
    const startPt = this.pts[0];
    const dist = Math.hypot(x - startPt.x, y - startPt.y);
    
    // Allow a generous start radius for kids
    if (dist < 80) {
      this.isTracing = true;
      this.maxReachedIdx = 0;
      return true;
    }
    return false;
  }

  move(x, y) {
    if (!this.isTracing) return;

    // Always track raw pointer for visual effect
    this.pointerX = x;
    this.pointerY = y;

    let bestDist = Infinity;
    let bestIdx = this.maxReachedIdx;

    // Search ahead generously
    const searchLimit = Math.min(this.pts.length, this.maxReachedIdx + 50);
    for (let i = this.maxReachedIdx; i < searchLimit; i++) {
      const d = Math.hypot(x - this.pts[i].x, y - this.pts[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestDist < 140) {
      this.maxReachedIdx = Math.max(this.maxReachedIdx, bestIdx);
      this.offPathCount = 0;
    } else {
      // 경로에서 벗어나도 터치 중에는 드래그를 유지함
      // offPathCount만 증가시키고 트레이싱을 끊지 않음
      this.offPathCount = (this.offPathCount || 0) + 1;
    }
  }

  end() {
    this.isTracing = false;
    if (!this.pts || this.pts.length === 0) return false;

    const percent = this.maxReachedIdx / (this.pts.length - 1);
    
    // ㅁ is closed loop essentially (square), ㅇ is perfect closed loop
    // Ensure they drew almost all of it to prevent short-circuiting at the start point
    if (this.isClosedLoop) {
      if (percent > 0.85) return true;
    } else {
      if (percent > 0.85) return true;
    }
    
    // Did not complete -> reset
    this.maxReachedIdx = 0;
    return false;
  }

  draw() {
    if (this.maxReachedIdx === 0) return;

    const ctx = this.ctx;

    // Outer glow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 235, 80, 0.3)';
    ctx.lineWidth = this.config.TRACE_STROKE_WIDTH + 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    // Main trace
    ctx.beginPath();
    ctx.strokeStyle = this.config.TRACE_COLOR;
    ctx.lineWidth = this.config.TRACE_STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    // 마법 손가락 이펙트 — 터치 중일 때
    if (this.isTracing && this.pointerX !== undefined) {
      const px = this.pointerX, py = this.pointerY;
      const t = Date.now() / 1000;
      const pulse = 0.8 + Math.sin(t * 6) * 0.2;

      // 외곽 큰 빛 후광
      const grad1 = ctx.createRadialGradient(px, py, 0, px, py, 80 * pulse);
      grad1.addColorStop(0, 'rgba(255,255,180,0.5)');
      grad1.addColorStop(0.3, 'rgba(255,220,60,0.25)');
      grad1.addColorStop(0.6, 'rgba(255,150,255,0.1)');
      grad1.addColorStop(1, 'rgba(255,200,0,0)');
      ctx.beginPath();
      ctx.arc(px, py, 80 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad1;
      ctx.fill();

      // 중간 마법 링 (회전)
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 2);
      const grad2 = ctx.createRadialGradient(0, 0, 20, 0, 0, 45 * pulse);
      grad2.addColorStop(0, 'rgba(255,255,255,0)');
      grad2.addColorStop(0.5, 'rgba(180,130,255,0.3)');
      grad2.addColorStop(0.8, 'rgba(255,200,100,0.15)');
      grad2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grad2;
      ctx.fill();
      ctx.restore();

      // 밝은 코어
      const grad3 = ctx.createRadialGradient(px, py, 0, px, py, 22);
      grad3.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad3.addColorStop(0.4, 'rgba(255,255,180,0.8)');
      grad3.addColorStop(1, 'rgba(255,230,100,0)');
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.fillStyle = grad3;
      ctx.fill();

      // 미니 별 4개 (회전하며 주위를 돔)
      ctx.save();
      ctx.translate(px, py);
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + (i * Math.PI / 2);
        const r = 30 + Math.sin(t * 4 + i) * 8;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        const ss = 3 + Math.sin(t * 8 + i * 2) * 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, ss, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(i * 90 + t * 100) % 360}, 100%, 80%, 0.9)`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  getHandlerPos() {
    if (!this.pts || this.pts.length === 0) return {x:0,y:0};
    return this.pts[this.maxReachedIdx];
  }

  getTargetPos() {
    if (!this.pts || this.pts.length === 0) return {x:0,y:0};
    return this.pts[this.pts.length - 1];
  }
}
