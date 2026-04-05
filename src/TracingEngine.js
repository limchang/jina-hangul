// TracingEngine.js — 획 추적 인식 엔진 (ES Module)

/** @typedef {import('./types.js').Point} Point */
/** @typedef {import('./types.js').Difficulty} Difficulty */

/**
 * 트레이싱 관련 상수 모음
 * @type {Readonly<Record<string, number>>}
 */
// ── 매직 넘버 상수화 ──
const TRACING = {
  START_RADIUS: 110,             // 시작점 인식 반경
  CLOSED_SEARCH_AHEAD: 15,      // 닫힌 도형 전방 탐색 범위
  OPEN_SEARCH_AHEAD: 50,        // 열린 도형 전방 탐색 범위
  ON_PATH_THRESHOLD: 140,       // 경로 근접 판정 거리
  STRICT_OFF_PATH: 52,          // 엄격 이탈 판정 거리
  LENIENT_OFF_PATH: 100,        // 완화 이탈 판정 거리
  CLOSED_LOOP_HALF: 0.5,        // 닫힌 도형 절반 진행률
  OPEN_GOAL_PCT: 0.75,          // 열린 도형 도달 비율
  CLOSED_GOAL_PCT: 0.85,        // 닫힌 도형 도달 비율
  GOAL_DISTANCE: 150,           // 도착지 근접 거리
  NORMAL_LENIENT_PCT: 0.7,      // 노말 모드 완화 전환 진행률
  OPEN_COMPLETE_PCT: 0.85,      // 열린 도형 완성 비율
  CLOSED_COMPLETE_PCT: 0.9,     // 닫힌 도형 완성 비율
  DEFAULT_SAMPLE_COUNT: 120,    // 기본 샘플 수
  GLOW_WIDTH_OFFSET: 24,        // 글로우 선 폭 오프셋
  CURSOR_GLOW_RADIUS: 70,       // 커서 글로우 반경
  CURSOR_DOT_RADIUS: 8,         // 커서 점 반경
  CURSOR_GRADIENT_INNER: 4,     // 그래디언트 내부 반경
};

// ── SVG 경로 샘플러 클래스 (DOM 의존성 분리) ──
const svgNS = "http://www.w3.org/2000/svg";

/**
 * SVG 경로를 Point 배열로 샘플링하는 클래스
 */
class SvgPathSampler {
  constructor() {
    /** @type {SVGSVGElement | null} */
    this.tempSvg = null;
    /** @type {SVGPathElement | null} */
    this.tempPath = null;
    /** @type {Map<string, Point[]>} */
    this.pathCache = new Map();
  }

  /** DOM에 임시 SVG 엘리먼트를 생성하여 경로 샘플링을 준비한다 */
  init() {
    if (this.tempSvg) return;
    this.tempSvg = document.createElementNS(svgNS, "svg");
    this.tempSvg.style.position = 'absolute';
    this.tempSvg.style.width = '0';
    this.tempSvg.style.height = '0';
    this.tempSvg.style.visibility = 'hidden';
    this.tempPath = document.createElementNS(svgNS, "path");
    this.tempSvg.appendChild(this.tempPath);
    document.body.appendChild(this.tempSvg);
  }

  /**
   * SVG 경로 문자열을 샘플링하여 Point 배열로 변환
   * @param {string} pathStr - SVG path의 d 속성 문자열
   * @param {number} [samples] - 샘플 개수
   * @returns {Point[]}
   */
  sample(pathStr, samples = TRACING.DEFAULT_SAMPLE_COUNT) {
    const key = `${pathStr}|${samples}`;
    const cached = this.pathCache.get(key);
    if (cached) return cached;
    if (!this.tempPath) this.init();
    this.tempPath.setAttribute("d", pathStr);
    const len = this.tempPath.getTotalLength();
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const p = this.tempPath.getPointAtLength((i / samples) * len);
      pts.push({ x: p.x, y: p.y });
    }
    this.pathCache.set(key, pts);
    return pts;
  }
}

// ── 싱글턴 인스턴스 (기존 공개 API 유지) ──
const defaultSampler = new SvgPathSampler();

/** SVG 헬퍼를 초기화한다 (DOM에 임시 SVG 추가) */
export function initSvgHelper() {
  defaultSampler.init();
}

/**
 * SVG 경로 문자열을 샘플링하여 Point 배열로 반환
 * @param {string} pathStr - SVG path의 d 속성 문자열
 * @param {number} [samples] - 샘플 개수
 * @returns {Point[]}
 */
export function samplePath(pathStr, samples = TRACING.DEFAULT_SAMPLE_COUNT) {
  return defaultSampler.sample(pathStr, samples);
}

/**
 * 캔버스 위에서 획 추적을 관리하는 엔진
 */
export class TracingEngine {
  /**
   * @param {CanvasRenderingContext2D} ctx - 드로잉 컨텍스트
   * @param {object} config - TRACE_STROKE_WIDTH, TRACE_COLOR 등 설정
   */
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    /** @type {Point[]} */
    this.pts = [];
    /** @type {Difficulty} */
    this.difficulty = 'easy'; // 'easy' | 'normal' | 'hard'
    this.reset();
  }

  /**
   * 추적할 획(stroke)을 설정한다
   * @param {string} pathStr - SVG path의 d 속성 문자열
   * @param {boolean} isClosedLoop - 닫힌 도형 여부
   */
  setStroke(pathStr, isClosedLoop) {
    this.pts = samplePath(pathStr, TRACING.DEFAULT_SAMPLE_COUNT);
    this.isClosedLoop = isClosedLoop;
    this.reset();
  }

  reset() {
    this.isTracing = false;
    this.maxReachedIdx = 0;
    this.offPathCount = 0;
    this.reachedGoal = false;
  }

  /**
   * 트레이싱 시작 — 시작점 근처에서 터치하면 활성화
   * @param {number} x
   * @param {number} y
   * @returns {boolean} 시작점 인식 성공 여부
   */
  start(x, y) {
    if (!this.pts || this.pts.length === 0) return false;
    const startPt = this.pts[0];
    const dist = Math.hypot(x - startPt.x, y - startPt.y);
    if (dist < TRACING.START_RADIUS) {
      this.isTracing = true;
      this.maxReachedIdx = 0;
      return true;
    }
    return false;
  }

  /**
   * 포인터 이동 시 경로 추적 업데이트
   * @param {number} x
   * @param {number} y
   * @returns {void}
   */
  move(x, y) {
    if (!this.isTracing) return;
    this.pointerX = x;
    this.pointerY = y;

    let bestDist = Infinity;
    let bestIdx = this.maxReachedIdx;
    // 닫힌 도형: 진행률 낮을 때 끝점 근처 점프 방지 (앞으로 제한된 범위만 탐색)
    const searchAhead = this.isClosedLoop && this.maxReachedIdx < this.pts.length * TRACING.CLOSED_LOOP_HALF
      ? TRACING.CLOSED_SEARCH_AHEAD
      : TRACING.OPEN_SEARCH_AHEAD;
    const searchLimit = Math.min(this.pts.length, this.maxReachedIdx + searchAhead);
    for (let i = this.maxReachedIdx; i < searchLimit; i++) {
      const d = Math.hypot(x - this.pts[i].x, y - this.pts[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestDist < TRACING.ON_PATH_THRESHOLD) {
      this.maxReachedIdx = Math.max(this.maxReachedIdx, bestIdx);
    }
    // 도착지 근처 도달 기록 — 지나쳐도 성공 판정용
    const goalPt = this.pts[this.pts.length - 1];
    const goalDist = Math.hypot(x - goalPt.x, y - goalPt.y);
    const percent = this.pts.length > 1 ? this.maxReachedIdx / (this.pts.length - 1) : 0;
    const goalThreshold = this.isClosedLoop ? TRACING.CLOSED_GOAL_PCT : TRACING.OPEN_GOAL_PCT;
    if (percent > goalThreshold && goalDist < TRACING.GOAL_DISTANCE) {
      this.reachedGoal = true;
    }
    // offPath 판정 — 난이도별 분기
    if (this.difficulty === 'easy') {
      // 이지: 이탈 판정 없음
      this.offPathCount = 0;
    } else if (this.difficulty === 'normal') {
      // 노말: 도착지 도달 후 이탈 무시
      if (this.reachedGoal) {
        this.offPathCount = 0;
      } else {
        const progress = this.pts.length > 1 ? this.maxReachedIdx / (this.pts.length - 1) : 0;
        const offThreshold = progress > TRACING.NORMAL_LENIENT_PCT ? TRACING.LENIENT_OFF_PATH : TRACING.STRICT_OFF_PATH;
        if (bestDist < offThreshold) {
          this.offPathCount = 0;
        } else {
          this.offPathCount = (this.offPathCount || 0) + 1;
        }
      }
    } else {
      // 하드: 항상 엄격 판정, reachedGoal 무시
      if (bestDist < TRACING.STRICT_OFF_PATH) {
        this.offPathCount = 0;
      } else {
        this.offPathCount = (this.offPathCount || 0) + 1;
      }
    }
  }

  /**
   * 트레이싱 종료 — 획 완성 여부를 판정
   * @returns {boolean} 획 완성 성공 여부
   */
  end() {
    this.isTracing = false;
    if (!this.pts || this.pts.length === 0) return false;
    const percent = this.maxReachedIdx / (this.pts.length - 1);
    const threshold = this.isClosedLoop ? TRACING.CLOSED_COMPLETE_PCT : TRACING.OPEN_COMPLETE_PCT;
    // 도착지에 도달했었으면 지나쳐도 성공
    if (percent > threshold || this.reachedGoal) return true;
    this.maxReachedIdx = 0;
    this.reachedGoal = false;
    return false;
  }

  /**
   * 현재 트레이싱 진행 상태를 캔버스에 그린다
   * @param {boolean} waterMode - 물 모드 활성화 여부
   * @returns {void}
   */
  draw(waterMode) {
    if (this.maxReachedIdx === 0) return;
    const ctx = this.ctx;
    const tw = this.config.TRACE_STROKE_WIDTH;
    const glowColor = waterMode ? 'rgba(79,195,247,0.3)' : 'rgba(255, 235, 80, 0.3)';
    const mainColor = waterMode ? '#4fc3f7' : this.config.TRACE_COLOR;

    ctx.beginPath();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = tw + TRACING.GLOW_WIDTH_OFFSET;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = tw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    for (let i = 1; i <= this.maxReachedIdx; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
    ctx.stroke();

    if (this.isTracing && this.pointerX !== undefined) {
      const px = this.pointerX, py = this.pointerY;
      const grad = ctx.createRadialGradient(px, py, TRACING.CURSOR_GRADIENT_INNER, px, py, TRACING.CURSOR_GLOW_RADIUS);
      if (waterMode) {
        grad.addColorStop(0, 'rgba(255,255,255,0.7)');
        grad.addColorStop(0.3, 'rgba(79,195,247,0.4)');
        grad.addColorStop(1, 'rgba(79,195,247,0)');
      } else {
        grad.addColorStop(0, 'rgba(255,255,255,0.7)');
        grad.addColorStop(0.3, 'rgba(255,235,80,0.3)');
        grad.addColorStop(1, 'rgba(255,230,150,0)');
      }
      ctx.beginPath();
      ctx.arc(px, py, TRACING.CURSOR_GLOW_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, TRACING.CURSOR_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  }

  /**
   * 현재 트레이싱 핸들러(진행 지점) 좌표
   * @returns {Point}
   */
  getHandlerPos() {
    if (!this.pts || this.pts.length === 0) return {x:0,y:0};
    return this.pts[this.maxReachedIdx];
  }

  /**
   * 획의 도착 지점 좌표
   * @returns {Point}
   */
  getTargetPos() {
    if (!this.pts || this.pts.length === 0) return {x:0,y:0};
    return this.pts[this.pts.length - 1];
  }
}
