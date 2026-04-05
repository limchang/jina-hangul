import { describe, it, expect } from 'vitest';
import { ParticleSystem } from '../particles.js';

describe('ParticleSystem', () => {
  it('초기 상태 — 빈 파티클 배열', () => {
    const ps = new ParticleSystem();
    expect(ps.particles).toHaveLength(0);
  });

  describe('emit', () => {
    it('4프레임마다 1개 생성', () => {
      const ps = new ParticleSystem();
      ps.emit(100, 100); // frame 1
      ps.emit(100, 100); // frame 2
      ps.emit(100, 100); // frame 3
      expect(ps.particles).toHaveLength(0);
      ps.emit(100, 100); // frame 4 → 생성
      expect(ps.particles).toHaveLength(1);
    });
  });

  describe('burst', () => {
    it('지정 수만큼 즉시 생성', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100, 10);
      expect(ps.particles).toHaveLength(10);
    });

    it('기본값 6개', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100);
      expect(ps.particles).toHaveLength(6);
    });
  });

  describe('celebrate', () => {
    it('15 confetti + 4 sparkle = 19개', () => {
      const ps = new ParticleSystem();
      ps.celebrate(250, 250);
      expect(ps.particles).toHaveLength(19);
    });
  });

  describe('update', () => {
    it('파티클 위치 변경', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100, 1);
      const before = { x: ps.particles[0].x, y: ps.particles[0].y };
      ps.update();
      const after = ps.particles[0];
      // 속도가 있으므로 위치가 변해야 함
      expect(after.x !== before.x || after.y !== before.y).toBe(true);
    });

    it('수명 다한 파티클 제거', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100, 3);
      // 강제로 수명 0으로
      ps.particles.forEach(p => { p.life = 0; });
      ps.update();
      expect(ps.particles).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('모든 파티클 제거', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100, 20);
      ps.clear();
      expect(ps.particles).toHaveLength(0);
    });
  });

  describe('draw', () => {
    it('에러 없이 실행', () => {
      const ps = new ParticleSystem();
      ps.burst(100, 100, 5);
      const mockCtx = {
        globalAlpha: 1,
        fillStyle: '',
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        fillRect: () => {},
      };
      expect(() => ps.draw(mockCtx)).not.toThrow();
    });
  });
});
