// particles.js — 반짝임 + 종이 컨페티 파티클

// 반짝임(스파클) — 드래그 중 사용
const SPARKLE_COLOR = '#fff8b0';

class Sparkle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 0.5;
    this.life = 1.0;
    this.decay = 0.04 + Math.random() * 0.03;
    this.size = 3 + Math.random() * 4;
    this.rotation = Math.random() * Math.PI;
    this.rotSpeed = (Math.random() - 0.5) * 0.15;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const a = this.life;
    const s = this.size * a;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = a * 0.9;
    // 4갈래 반짝임 ✦
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a1 = (i * 90) * Math.PI / 180;
      const a2 = (i * 90 + 45) * Math.PI / 180;
      ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
      ctx.lineTo(Math.cos(a2) * s * 0.2, Math.sin(a2) * s * 0.2);
    }
    ctx.closePath();
    ctx.fillStyle = SPARKLE_COLOR;
    ctx.fill();
    ctx.restore();
  }
}

// 종이 컨페티 — 완성 시 사용
const CONFETTI_COLORS = [
  '#FF6B8A', '#FF9A5C', '#FFD93D', '#6BCB77',
  '#4D96FF', '#9B72FF', '#FF6EB4', '#45D0E8'
];

class Confetti {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = 2.5 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = 0.008 + Math.random() * 0.008;
    this.w = 4 + Math.random() * 6;
    this.h = 3 + Math.random() * 4;
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.3;
    this.gravity = 0.08 + Math.random() * 0.04;
    // 3D 펄럭임 시뮬레이션
    this.flipPhase = Math.random() * Math.PI * 2;
    this.flipSpeed = 3 + Math.random() * 4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.99;
    // 좌우 흔들림
    this.vx += Math.sin(this.flipPhase) * 0.1;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
    this.flipPhase += this.flipSpeed * 0.05;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const a = this.life;
    // 3D 펄럭임: scaleX가 sin으로 변함
    const scaleX = Math.cos(this.flipPhase);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scaleX, 1);
    ctx.globalAlpha = Math.min(a * 1.5, 1);
    ctx.fillStyle = this.color;
    // 둥근 모서리 사각형
    const r = 1.5;
    ctx.beginPath();
    ctx.moveTo(-this.w / 2 + r, -this.h / 2);
    ctx.lineTo(this.w / 2 - r, -this.h / 2);
    ctx.quadraticCurveTo(this.w / 2, -this.h / 2, this.w / 2, -this.h / 2 + r);
    ctx.lineTo(this.w / 2, this.h / 2 - r);
    ctx.quadraticCurveTo(this.w / 2, this.h / 2, this.w / 2 - r, this.h / 2);
    ctx.lineTo(-this.w / 2 + r, this.h / 2);
    ctx.quadraticCurveTo(-this.w / 2, this.h / 2, -this.w / 2, this.h / 2 - r);
    ctx.lineTo(-this.w / 2, -this.h / 2 + r);
    ctx.quadraticCurveTo(-this.w / 2, -this.h / 2, -this.w / 2 + r, -this.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.frameCount = 0;
  }

  // 드래그 중 — 반짝임
  emit(x, y) {
    this.frameCount++;
    if (this.frameCount % 3 === 0) {
      this.particles.push(new Sparkle(x, y));
    }
  }

  // 획 완성 — 반짝임 + 작은 컨페티
  burst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Confetti(x, y));
    }
    for (let i = 0; i < 5; i++) {
      const s = new Sparkle(x, y);
      s.size = 5 + Math.random() * 4;
      s.decay = 0.02;
      this.particles.push(s);
    }
  }

  // 글자 완성 — 컨페티 폭발
  celebrate(cx, cy) {
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Confetti(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 30));
    }
    for (let i = 0; i < 8; i++) {
      const s = new Sparkle(cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 80);
      s.size = 6 + Math.random() * 5;
      s.decay = 0.015;
      this.particles.push(s);
    }
  }

  update() {
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }
}

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
