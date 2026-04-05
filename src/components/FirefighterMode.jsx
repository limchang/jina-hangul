// FirefighterMode.jsx — 소방관 게임모드
// 불타는 글자를 따라쓰면 물방울로 진화!

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { TracingEngine, samplePath, initSvgHelper } from '../TracingEngine.js';
import { speakChar } from '../sound.js';
import '../../css/firefighter.css';

const ALL_CHARS = [...CONSONANTS, ...VOWELS];
const SIZE = 2000;
const PAD = 750;
const DISPLAY_SIZE = 340; // 캔버스 CSS 크기
const SCALE = DISPLAY_SIZE / SIZE;

// ── 불 이모지 배치 (경량화) ──
// 파티클 대신 획 위에 🔥 이모지를 듬성듬성 배치
function buildFirePositions(strokes, spacing = 120) {
  const positions = [];
  for (const s of strokes) {
    const pts = samplePath(s.path, Math.max(4, Math.ceil(200 / spacing)));
    for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(spacing / 20))) {
      positions.push({
        x: pts[i].x + (Math.random() - 0.5) * 20,
        y: pts[i].y - 15,
        size: 30 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2, // 흔들림 위상
      });
    }
  }
  return positions;
}

// ── 물 파티클 ──
class WaterParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 20;
    this.y = y + (Math.random() - 0.5) * 20;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = 1 + Math.random() * 2;
    this.life = 0.7 + Math.random() * 0.3;
    this.size = 4 + Math.random() * 6;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // 중력
    this.life -= 0.02;
    this.size *= 0.98;
  }
}

// ── 증기 파티클 ──
class SteamParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 30;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = -(0.5 + Math.random() * 1.5);
    this.life = 0.5 + Math.random() * 0.5;
    this.size = 8 + Math.random() * 12;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.012;
    this.size *= 1.01;
  }
}

export default function FirefighterMode({ onExit }) {
  const [currentChar, setCurrentChar] = useState(null);
  const [score, setScore] = useState(0);
  const [fireIntensity, setFireIntensity] = useState(1); // 1=맹렬, 0=꺼짐
  const [extinguished, setExtinguished] = useState(false);
  const [combo, setCombo] = useState(0);

  const guideRef = useRef(null);
  const traceRef = useRef(null);
  const fireCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const stateRef = useRef({ strokeIdx: 0, completed: [], inited: false });
  const firePositions = useRef([]);
  const waterParticles = useRef([]);
  const steamParticles = useRef([]);
  const animRef = useRef(null);
  const fireIntensityRef = useRef(1);

  // 랜덤 글자 선택
  const pickNewChar = useCallback(() => {
    const ch = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
    setCurrentChar(ch);
    setFireIntensity(1);
    fireIntensityRef.current = 1;
    setExtinguished(false);
    stateRef.current = { strokeIdx: 0, completed: [], inited: false };
    firePositions.current = [];
    waterParticles.current = [];
    steamParticles.current = [];
  }, []);

  useEffect(() => { initSvgHelper(); pickNewChar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 글자가 바뀔 때 캔버스 초기화
  useEffect(() => {
    if (!currentChar) return;
    const gCanvas = guideRef.current, tCanvas = traceRef.current, fCanvas = fireCanvasRef.current;
    gCanvas.width = tCanvas.width = fCanvas.width = SIZE;
    gCanvas.height = tCanvas.height = fCanvas.height = SIZE;
    engineRef.current = new TracingEngine(tCanvas.getContext('2d'), APP_CONFIG);
    stateRef.current.inited = true;
    firePositions.current = buildFirePositions(currentChar.strokes);
    drawGuide();
    loadStroke(0);
    speakChar(currentChar.char);
  }, [currentChar]); // eslint-disable-line react-hooks/exhaustive-deps

  function drawGuide() {
    const gCtx = guideRef.current?.getContext('2d');
    if (!gCtx || !currentChar) return;
    const S = stateRef.current;
    gCtx.clearRect(0, 0, SIZE, SIZE);
    gCtx.save();
    gCtx.translate(PAD, PAD);
    // 흰색 배경선
    gCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    gCtx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
    gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
    gCtx.setLineDash([]);
    currentChar.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    // 노란 점선 가이드
    gCtx.strokeStyle = 'rgba(255,200,0,0.55)';
    gCtx.lineWidth = 6;
    gCtx.setLineDash([18, 14]);
    currentChar.strokes.forEach(s => gCtx.stroke(new Path2D(s.path)));
    gCtx.setLineDash([]);
    // 완성된 획
    S.completed.forEach(pts => {
      gCtx.beginPath();
      gCtx.strokeStyle = '#6bcbff';
      gCtx.lineWidth = APP_CONFIG.TRACE_STROKE_WIDTH;
      gCtx.lineCap = 'round'; gCtx.lineJoin = 'round';
      gCtx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) gCtx.lineTo(p.x, p.y);
      gCtx.stroke();
    });
    // 시작점
    if (S.strokeIdx < currentChar.strokes.length) {
      const pts = samplePath(currentChar.strokes[S.strokeIdx].path, 80);
      if (pts.length >= 2) {
        gCtx.beginPath(); gCtx.arc(pts[0].x, pts[0].y, 14, 0, Math.PI * 2);
        gCtx.fillStyle = '#44ee88'; gCtx.fill();
        gCtx.strokeStyle = '#fff'; gCtx.lineWidth = 3; gCtx.stroke();
      }
    }
    gCtx.restore();
  }

  function loadStroke(idx) {
    stateRef.current.strokeIdx = idx;
    const stroke = currentChar.strokes[idx];
    if (!stroke) return;
    const isClosed = stroke.path.includes('A') || currentChar.char === 'ㅁ' || currentChar.char === 'ㅇ';
    engineRef.current.setStroke(stroke.path, isClosed);
    drawGuide();
  }

  function renderTrace() {
    const tCtx = traceRef.current?.getContext('2d');
    if (!tCtx) return;
    tCtx.clearRect(0, 0, SIZE, SIZE);
    tCtx.save();
    tCtx.translate(PAD, PAD);
    engineRef.current.draw();
    tCtx.restore();
  }

  // ── 불/물/증기 파티클 렌더링 ──
  function renderFire() {
    const ctx = fireCanvasRef.current?.getContext('2d');
    if (!ctx || !currentChar) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(PAD, PAD);

    const intensity = fireIntensityRef.current;
    const now = Date.now() * 0.003;

    // 🔥 이모지를 듬성듬성 배치 (파티클 대신)
    if (intensity > 0.05) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const fp of firePositions.current) {
        const bobY = Math.sin(now + fp.phase) * 8;
        const alpha = intensity * (0.6 + 0.4 * Math.sin(now * 1.5 + fp.phase));
        ctx.globalAlpha = alpha;
        ctx.font = `${fp.size}px serif`;
        ctx.fillText('🔥', fp.x, fp.y + bobY);
      }
    }

    // 물 파티클
    for (let i = waterParticles.current.length - 1; i >= 0; i--) {
      const p = waterParticles.current[i];
      p.update();
      if (p.life <= 0) { waterParticles.current.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
    }

    // 증기 파티클
    for (let i = steamParticles.current.length - 1; i >= 0; i--) {
      const p = steamParticles.current[i];
      p.update();
      if (p.life <= 0) { steamParticles.current.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = '#e0e0e0';
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 메인 애니메이션 루프
  useEffect(() => {
    function loop() {
      renderFire();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [currentChar]); // eslint-disable-line react-hooks/exhaustive-deps

  // 획 완성
  function completeStroke() {
    const S = stateRef.current;
    S.completed.push([...engineRef.current.pts]);
    S.strokeIdx++;

    // 물방울 발사! 완성된 획 위에서
    const lastPts = S.completed[S.completed.length - 1];
    for (let i = 0; i < 25; i++) {
      const pt = lastPts[Math.floor(Math.random() * lastPts.length)];
      waterParticles.current.push(new WaterParticle(pt.x, pt.y));
    }
    // 증기 효과
    for (let i = 0; i < 10; i++) {
      const pt = lastPts[Math.floor(Math.random() * lastPts.length)];
      steamParticles.current.push(new SteamParticle(pt.x, pt.y));
    }

    // 불 줄이기
    const totalStrokes = currentChar.strokes.length;
    const remaining = totalStrokes - S.strokeIdx;
    const newIntensity = remaining / totalStrokes;
    setFireIntensity(newIntensity);
    fireIntensityRef.current = newIntensity;

    // 사이렌 효과음
    playWaterSound();

    if (S.strokeIdx >= totalStrokes) {
      // 진화 성공!
      setExtinguished(true);
      setScore(prev => prev + 1);
      setCombo(prev => prev + 1);
      speakChar(currentChar.char, 300);
      playSirenSuccess();
      // 2초 후 다음 글자
      setTimeout(() => pickNewChar(), 2200);
    } else {
      loadStroke(S.strokeIdx);
    }
  }

  // ── 터치/마우스 이벤트 ──
  useEffect(() => {
    const canvas = guideRef.current;
    if (!canvas) return;

    function getPos(e) {
      let cx, cy;
      if (e.touches?.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      const rect = guideRef.current.getBoundingClientRect();
      return { x: (cx - rect.left) * (SIZE / rect.width) - PAD, y: (cy - rect.top) * (SIZE / rect.height) - PAD };
    }

    function onDown(e) {
      if (extinguished) return;
      e.preventDefault();
      const cPos = getPos(e);
      if (engineRef.current && engineRef.current.start(cPos.x, cPos.y)) {
        playWaterStart();
        renderTrace();
      }
    }

    function onMove(e) {
      if (!engineRef.current?.isTracing) return;
      e.preventDefault();
      const cPos = getPos(e);
      engineRef.current.move(cPos.x, cPos.y);
      // 따라쓰는 위치에 물방울 뿌리기
      if (Math.random() < 0.4) {
        waterParticles.current.push(new WaterParticle(cPos.x, cPos.y));
        steamParticles.current.push(new SteamParticle(cPos.x, cPos.y - 10));
      }
      renderTrace();
    }

    function onUp(e) {
      if (!engineRef.current?.isTracing) return;
      if (engineRef.current.end()) {
        completeStroke();
      } else {
        // 실패 — 트레이스 리셋
        renderTrace();
      }
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [currentChar, extinguished]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fire-mode">
      {/* 헤더 */}
      <div className="fire-header">
        <button className="fire-exit-btn" onClick={onExit}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="fire-score">
          <span className="fire-score-icon">🚒</span>
          <span className="fire-score-num">{score}</span>
        </div>
        {combo > 1 && <div className="fire-combo">{combo} COMBO!</div>}
      </div>

      {/* 글자 + 불 영역 */}
      <div className="fire-stage">
        <div className={`fire-char-label ${extinguished ? 'fire-char-label--done' : ''}`}>
          {currentChar?.char}
        </div>
        <div className="fire-canvas-wrap" style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}>
          <canvas ref={guideRef} className="fire-canvas-layer" style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }} />
          <canvas ref={traceRef} className="fire-canvas-layer" style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, zIndex: 2 }} />
          <canvas ref={fireCanvasRef} className="fire-canvas-layer" style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, zIndex: 3, pointerEvents: 'none' }} />
          {/* 불 글로우 오버레이 */}
          {!extinguished && (
            <div className="fire-glow" style={{ opacity: fireIntensity * 0.7 }} />
          )}
        </div>
        {extinguished && (
          <div className="fire-success">
            <div className="fire-success-text">진화 성공!</div>
          </div>
        )}
      </div>

      {/* 진행 바 */}
      <div className="fire-progress-wrap">
        <div className="fire-progress-bar">
          <div className="fire-progress-fill" style={{ width: `${(1 - fireIntensity) * 100}%` }} />
        </div>
        <div className="fire-progress-label">
          {extinguished ? '🎉 완료!' : `🔥 ${Math.round(fireIntensity * 100)}%`}
        </div>
      </div>
    </div>
  );
}

// ── 효과음 ──
function playWaterStart() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

function playWaterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 쏴아~ 물 뿌리는 소리
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 0.3);
  } catch {}
}

function playSirenSuccess() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch {}
}
