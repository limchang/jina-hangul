// TracingEngine.js — 획 추적 인식 엔진 (ES Module)

const svgNS = "http://www.w3.org/2000/svg";
let tempSvg = null;
let tempPath = null;

export function initSvgHelper() {
  if (tempSvg) return;
  tempSvg = document.createElementNS(svgNS, "svg");
  tempSvg.style.position = 'absolute';
  tempSvg.style.width = '0';
  tempSvg.style.height = '0';
  tempSvg.style.visibility = 'hidden';
  tempPath = document.createElementNS(svgNS, "path");
  tempSvg.appendChild(tempPath);
  document.body.appendChild(tempSvg);
}

export function samplePath(pathStr, samples = 120) {
  if (!tempPath) initSvgHelper();
  tempPath.setAttribute("d", pathStr);
  const len = tempPath.getTotalLength();
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const p = tempPath.getPointAtLength((i / samples) * len);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

export class TracingEngine {
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
    const startPt = this.pts[0];
    const dist = Math.hypot(x - startPt.x, y - startPt.y);
    if (dist < 110) {
      this.isTracing = true;
      this.maxReachedIdx = 0;
      return true;
    }
    return false;
  }

  move(x, y) {
    if (!this.isTracing) return;
    this.pointerX = x;
    this.pointerY = y;

    let bestDist = Infinity;
    let bestIdx = this.maxReachedIdx;
    // 닫힌 도형: 진행률 낮을 때 끝점 근처 점프 방지 (앞으로 15개만 탐색)
    const searchAhead = this.isClosedLoop && this.maxReachedIdx < this.pts.length * 0.5 ? 15 : 50;
    const searchLimit = Math.min(this.pts.length, this.maxReachedIdx + searchAhead);
    for (let i = this.maxReachedIdx; i < searchLimit; i++) {
      const d = Math.hypot(x - this.pts[i].x, y - this.pts[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestDist < 140) {
      this.maxReachedIdx = Math.max(this.maxReachedIdx, bestIdx);
    }
    // offPath 판정 — 도착지 근처일수록 후하게
    const progress = this.pts.length > 1 ? this.maxReachedIdx / (this.pts.length - 1) : 0;
    const offThreshold = progress > 0.7 ? 100 : 52; // 70% 이상 진행 시 판정 넓힘
    if (bestDist < offThreshold) {
      this.offPathCount = 0;
    } else {
      this.offPathCount = (this.offPathCount || 0) + 1;
    }
  }

  end() {
    this.isTracing = false;
    if (!this.pts || this.pts.length === 0) return false;
    const percent = this.maxReachedIdx / (this.pts.length - 1);
    // 닫힌 도형은 90% 이상 필요 (시작=끝이라 쉽게 완료되는 것 방지)
    const threshold = this.isClosedLoop ? 0.9 : 0.85;
    if (percent > threshold) return true;
    this.maxReachedIdx = 0;
    return false;
  }

  draw() {
    if (this.maxReachedIdx === 0) return;
    const ctx = this.ctx;
    const tw = this.config.TRACE_STROKE_WIDTH;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 235, 80, 0.3)';
    ctx.lineWidth = tw + 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = this.config.TRACE_COLOR;
    ctx.lineWidth = tw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    if (this.isTracing && this.pointerX !== undefined) {
      const px = this.pointerX, py = this.pointerY;
      // 외곽 글로우
      const grad = ctx.createRadialGradient(px, py, 4, px, py, 70);
      grad.addColorStop(0, 'rgba(255,255,255,0.7)');
      grad.addColorStop(0.3, 'rgba(255,235,80,0.3)');
      grad.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.beginPath();
      ctx.arc(px, py, 70, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // 중심 점
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
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
