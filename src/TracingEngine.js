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
    
    let bestDist = Infinity;
    let bestIdx = this.maxReachedIdx;

    // Search ahead up to 35 points to allow fast tracing but strictly prevent start-to-end skipping
    const searchLimit = Math.min(this.pts.length, this.maxReachedIdx + 35);
    for (let i = this.maxReachedIdx; i < searchLimit; i++) {
      const d = Math.hypot(x - this.pts[i].x, y - this.pts[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // Must be reasonably close to the path
    if (bestDist < 90) {
      this.maxReachedIdx = Math.max(this.maxReachedIdx, bestIdx);
      this.offPathCount = 0;
    } else {
      // Allow a few frames of being off-path before giving up (tolerance for kids)
      this.offPathCount = (this.offPathCount || 0) + 1;
      if (this.offPathCount > 8) {
        this.isTracing = false;
        this.maxReachedIdx = 0;
        this.offPathCount = 0;
      }
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
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.config.TRACE_COLOR;
    this.ctx.lineWidth = this.config.TRACE_STROKE_WIDTH;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) {
      this.ctx.lineTo(this.pts[i].x, this.pts[i].y);
    }
    this.ctx.stroke();
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
