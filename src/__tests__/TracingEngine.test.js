import { describe, it, expect, beforeEach } from 'vitest';
import { TracingEngine } from '../TracingEngine.js';

// jsdom은 SVG getTotalLength/getPointAtLength를 미지원
// samplePath를 우회하여 pts를 직접 주입해 엔진 로직만 테스트

function makeStraightPts(x1, y1, x2, y2, count = 120) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

function makeCirclePts(cx, cy, r, count = 120) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const angle = (i / count) * Math.PI * 2;
    pts.push({ x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) });
  }
  return pts;
}

describe('TracingEngine', () => {
  let engine;
  const mockCtx = {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    arc: () => {},
    fill: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    clearRect: () => {},
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
  };
  const config = { TRACE_COLOR: '#ffeb3b', TRACE_STROKE_WIDTH: 74 };

  beforeEach(() => {
    engine = new TracingEngine(mockCtx, config);
    // setStroke 우회 — pts 직접 주입
    engine.pts = makeStraightPts(0, 0, 100, 0);
    engine.isClosedLoop = false;
    engine.reset();
  });

  describe('start', () => {
    it('시작점 근처에서 true 반환', () => {
      expect(engine.start(0, 0)).toBe(true);
      expect(engine.isTracing).toBe(true);
    });

    it('시작점에서 멀면 false', () => {
      expect(engine.start(500, 500)).toBe(false);
      expect(engine.isTracing).toBe(false);
    });

    it('반경 110 내에서 true', () => {
      expect(engine.start(100, 0)).toBe(true);
    });

    it('반경 110 밖에서 false', () => {
      expect(engine.start(120, 0)).toBe(false);
    });

    it('pts가 비어있으면 false', () => {
      engine.pts = [];
      expect(engine.start(0, 0)).toBe(false);
    });
  });

  describe('move', () => {
    it('경로를 따라 이동하면 maxReachedIdx 증가', () => {
      engine.start(0, 0);
      engine.move(50, 0);
      expect(engine.maxReachedIdx).toBeGreaterThan(0);
    });

    it('tracing 상태가 아니면 무시', () => {
      engine.move(50, 0);
      expect(engine.maxReachedIdx).toBe(0);
    });

    it('경로 끝까지 이동 시 reachedGoal 설정', () => {
      engine.start(0, 0);
      for (let x = 0; x <= 100; x += 2) {
        engine.move(x, 0);
      }
      expect(engine.reachedGoal).toBe(true);
    });
  });

  describe('end', () => {
    it('충분히 진행하면 true', () => {
      engine.start(0, 0);
      for (let x = 0; x <= 100; x += 5) {
        engine.move(x, 0);
      }
      expect(engine.end()).toBe(true);
    });

    it('진행 부족하면 false', () => {
      engine.start(0, 0);
      engine.move(10, 0);
      expect(engine.end()).toBe(false);
    });

    it('end 후 isTracing = false', () => {
      engine.start(0, 0);
      engine.end();
      expect(engine.isTracing).toBe(false);
    });

    it('reachedGoal이면 percent 낮아도 true', () => {
      engine.start(0, 0);
      engine.move(50, 0);
      engine.reachedGoal = true; // 강제 설정
      expect(engine.end()).toBe(true);
    });
  });

  describe('difficulty', () => {
    it('기본값 easy', () => {
      expect(engine.difficulty).toBe('easy');
    });

    it('easy 모드 — offPathCount 항상 0', () => {
      engine.difficulty = 'easy';
      engine.start(0, 0);
      engine.move(0, 500);
      expect(engine.offPathCount).toBe(0);
    });

    it('hard 모드 — 경로 이탈 시 offPathCount 증가', () => {
      engine.difficulty = 'hard';
      engine.start(0, 0);
      engine.move(50, 200);
      expect(engine.offPathCount).toBeGreaterThan(0);
    });

    it('normal 모드 — reachedGoal 시 이탈 무시', () => {
      engine.difficulty = 'normal';
      engine.start(0, 0);
      engine.reachedGoal = true;
      engine.move(50, 500); // 크게 벗어남
      expect(engine.offPathCount).toBe(0);
    });
  });

  describe('closed loop', () => {
    it('닫힌 도형 설정', () => {
      engine.pts = makeCirclePts(250, 250, 110);
      engine.isClosedLoop = true;
      engine.reset();
      expect(engine.isClosedLoop).toBe(true);
    });

    it('닫힌 도형 초반에 전방 탐색 제한', () => {
      engine.pts = makeCirclePts(250, 250, 110);
      engine.isClosedLoop = true;
      engine.reset();
      // 시작점 근처에서 시작
      engine.start(250, 140);
      // 약간 이동
      engine.move(280, 150);
      // 초반이므로 절반 이전에 있어야 함
      expect(engine.maxReachedIdx).toBeLessThan(engine.pts.length * 0.5);
    });
  });

  describe('reset', () => {
    it('reset 후 초기 상태', () => {
      engine.start(0, 0);
      engine.move(50, 0);
      engine.reset();
      expect(engine.isTracing).toBe(false);
      expect(engine.maxReachedIdx).toBe(0);
      expect(engine.offPathCount).toBe(0);
      expect(engine.reachedGoal).toBe(false);
    });
  });

  describe('getHandlerPos / getTargetPos', () => {
    it('핸들러 위치 반환', () => {
      const pos = engine.getHandlerPos();
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
    });

    it('타겟 위치 = 경로 끝점', () => {
      const target = engine.getTargetPos();
      expect(target.x).toBeCloseTo(100, 0);
      expect(target.y).toBeCloseTo(0, 0);
    });

    it('pts 비어있으면 {0,0}', () => {
      engine.pts = [];
      expect(engine.getHandlerPos()).toEqual({ x: 0, y: 0 });
      expect(engine.getTargetPos()).toEqual({ x: 0, y: 0 });
    });
  });
});
