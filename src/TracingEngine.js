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
    const isSyl = typeof currentMode !== 'undefined' && currentMode === 'syllables';
    const tw = isSyl ? 48 : this.config.TRACE_STROKE_WIDTH;

    // Outer glow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 235, 80, 0.3)';
    ctx.lineWidth = tw + (isSyl ? 14 : 24);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    // Main trace
    ctx.beginPath();
    ctx.strokeStyle = this.config.TRACE_COLOR;
    ctx.lineWidth = tw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    // 손가락 글로우
    if (this.isTracing && this.pointerX !== undefined) {
      const px = this.pointerX, py = this.pointerY;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, 40);
      grad.addColorStop(0, 'rgba(255,255,240,0.5)');
      grad.addColorStop(0.5, 'rgba(255,240,200,0.15)');
      grad.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.beginPath();
      ctx.arc(px, py, 40, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
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
