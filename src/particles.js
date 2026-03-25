// particles.js — 세련된 파티클 이펙트

// 금빛/백색 톤으로 통일
const PARTICLE_COLORS = [
  '#fff8e1', '#ffe082', '#ffca28', '#ffffff', '#fff9c4'
];

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 0.8;
    this.life = 1.0;
    this.decay = 0.025 + Math.random() * 0.03;
    this.size = 2 + Math.random() * 4;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    // 원 또는 4갈래 반짝이만
    this.isStar = Math.random() > 0.6;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.1;
    this.gravity = 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.97;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const a = this.life;
    const s = this.size * (0.4 + a * 0.6);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = a * 0.85;

    if (this.isStar) {
      ctx.rotate(this.rotation);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a1 = (i * 90) * Math.PI / 180;
        const a2 = (i * 90 + 45) * Math.PI / 180;
        ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
        ctx.lineTo(Math.cos(a2) * s * 0.3, Math.sin(a2) * s * 0.3);
      }
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
      grad.addColorStop(0, this.color);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.frameCount = 0;
  }

  // 드래그 중 — 매 프레임 1개
  emit(x, y) {
    this.frameCount++;
    if (this.frameCount % 2 === 0) {
      this.particles.push(new Particle(x, y));
    }
  }

  // 획 완성
  burst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1;
      p.size = 3 + Math.random() * 5;
      this.particles.push(p);
    }
  }

  // 글자 완성
  celebrate(cx, cy) {
    this.burst(cx, cy, 25);
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
