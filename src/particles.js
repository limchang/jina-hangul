// particles.js — 경량 파티클 시스템 (ES Module)

const SPARKLE_COLOR = '#fff8b0';

const CONFETTI_COLORS = [
  '#FF6B8A', '#FFD93D', '#6BCB77', '#4D96FF', '#9B72FF', '#45D0E8'
];

// 경량 파티클 — save/restore 없이 단순 도형만 사용
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'sparkle' | 'confetti'
    const angle = type === 'confetti'
      ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
      : Math.random() * Math.PI * 2;
    const speed = type === 'confetti'
      ? 2 + Math.random() * 3
      : 0.3 + Math.random() * 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = type === 'confetti' ? 0.012 + Math.random() * 0.01 : 0.04 + Math.random() * 0.03;
    this.size = type === 'confetti' ? 4 + Math.random() * 5 : 3 + Math.random() * 3;
    this.color = type === 'confetti'
      ? CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]
      : SPARKLE_COLOR;
    this.gravity = type === 'confetti' ? 0.08 : 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.97;
    this.life -= this.decay;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.frameCount = 0;
  }

  emit(x, y) {
    this.frameCount++;
    if (this.frameCount % 4 === 0) {
      this.particles.push(new Particle(x, y, 'sparkle'));
    }
  }

  burst(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, 'confetti'));
    }
  }

  celebrate(cx, cy) {
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(
        cx + (Math.random() - 0.5) * 60,
        cy + (Math.random() - 0.5) * 30,
        'confetti'
      ));
    }
    for (let i = 0; i < 4; i++) {
      const p = new Particle(
        cx + (Math.random() - 0.5) * 80,
        cy + (Math.random() - 0.5) * 80,
        'sparkle'
      );
      p.size = 5 + Math.random() * 4;
      p.decay = 0.015;
      this.particles.push(p);
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  draw(ctx) {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      const a = p.life;
      const s = p.size * a;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = p.color;
      if (p.type === 'sparkle') {
        // 단순 원
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, 6.283);
        ctx.fill();
      } else {
        // 단순 사각형 — rotate 없이
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
  }
}
