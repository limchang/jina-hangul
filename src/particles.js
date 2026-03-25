// particles.js — 마법 파티클 이펙트 시스템

const PARTICLE_COLORS = [
  '#ffeb3b', '#ff9800', '#ff5722', '#e91e63', '#9c27b0',
  '#00bcd4', '#4caf50', '#8bc34a', '#fff176', '#ffffff',
  '#ff80ab', '#ea80fc', '#80d8ff', '#b9f6ca', '#ffe57f'
];

const PARTICLE_SHAPES = ['circle', 'star', 'sparkle', 'heart'];

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // 살짝 위로
    this.life = 1.0;
    this.decay = 0.015 + Math.random() * 0.025;
    this.size = 4 + Math.random() * 10;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.shape = PARTICLE_SHAPES[Math.floor(Math.random() * PARTICLE_SHAPES.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.gravity = 0.03 + Math.random() * 0.05;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const a = this.life;
    const s = this.size * (0.5 + a * 0.5);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = a;

    switch (this.shape) {
      case 'star':
        this._drawStar(ctx, s);
        break;
      case 'sparkle':
        this._drawSparkle(ctx, s);
        break;
      case 'heart':
        this._drawHeart(ctx, s);
        break;
      default:
        this._drawCircle(ctx, s);
    }

    ctx.restore();
  }

  _drawCircle(ctx, s) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.6, this.color);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  _drawStar(ctx, s) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 72 - 90) * Math.PI / 180;
      const a2 = ((i * 72) + 36 - 90) * Math.PI / 180;
      ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
      ctx.lineTo(Math.cos(a2) * s * 0.4, Math.sin(a2) * s * 0.4);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  _drawSparkle(ctx, s) {
    ctx.beginPath();
    // 4갈래 반짝이
    for (let i = 0; i < 4; i++) {
      const a1 = (i * 90) * Math.PI / 180;
      const a2 = (i * 90 + 45) * Math.PI / 180;
      ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
      ctx.lineTo(Math.cos(a2) * s * 0.25, Math.sin(a2) * s * 0.25);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  _drawHeart(ctx, s) {
    const hs = s * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, hs * 0.4);
    ctx.bezierCurveTo(-hs, -hs * 0.3, -hs * 0.5, -hs, 0, -hs * 0.4);
    ctx.bezierCurveTo(hs * 0.5, -hs, hs, -hs * 0.3, 0, hs * 0.4);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// 터치 지점 주변의 마법 링 이펙트
class MagicRing {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = 50 + Math.random() * 20;
    this.life = 1.0;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.15;
    this.life -= 0.04;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * this.life;
    ctx.stroke();
    ctx.restore();
  }
}

// 파티클 매니저
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.frameCount = 0;
  }

  // 터치 이동 시 파티클 생성
  emit(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y));
    }
    // 가끔 마법 링 추가
    this.frameCount++;
    if (this.frameCount % 6 === 0) {
      this.rings.push(new MagicRing(x, y));
    }
  }

  // 획 완성 시 폭발 이펙트
  burst(x, y, count = 40) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.size = 6 + Math.random() * 14;
      p.decay = 0.01 + Math.random() * 0.015;
      this.particles.push(p);
    }
    for (let i = 0; i < 5; i++) {
      const r = new MagicRing(x + (Math.random()-0.5)*30, y + (Math.random()-0.5)*30);
      r.maxRadius = 60 + Math.random() * 40;
      this.rings.push(r);
    }
  }

  // 글자 완성 시 대폭발 + 무지개
  celebrate(cx, cy) {
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.burst(cx + (Math.random()-0.5)*80, cy + (Math.random()-0.5)*80, 50);
      }, wave * 150);
    }
  }

  update() {
    this.particles.forEach(p => p.update());
    this.rings.forEach(r => r.update());
    this.particles = this.particles.filter(p => p.life > 0);
    this.rings = this.rings.filter(r => r.life > 0);
  }

  draw(ctx) {
    this.rings.forEach(r => r.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
    this.rings = [];
  }
}

// 전역 파티클 시스템
const particleSystem = new ParticleSystem();
let particleAnimId = null;

function startParticleLoop() {
  function loop() {
    particleSystem.update();
    renderTrace();
    particleAnimId = requestAnimationFrame(loop);
  }
  if (!particleAnimId) {
    particleAnimId = requestAnimationFrame(loop);
  }
}

function stopParticleLoop() {
  if (particleAnimId) {
    cancelAnimationFrame(particleAnimId);
    particleAnimId = null;
  }
}
