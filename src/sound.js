// sound.js — 간단한 효과음 (Web Audio API)

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// 드래그 시작 — 짧은 팝 사운드
export function playStart() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

// 획 완성 — 밝은 띵 사운드
export function playComplete() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1047, ctx.currentTime);       // C6
  osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.08); // E6

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

// 글자 완성 — 축하 멜로디 (도미솔)
export function playCelebrate() {
  const ctx = getCtx();
  const notes = [1047, 1319, 1568]; // C6, E6, G6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

    const t = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// 착! 바닥에 박히는 사운드 — 짧고 강한 임팩트
export function playSlam() {
  const ctx = getCtx();

  // 저음 쿵
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);

  // 고음 착
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(800, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
  gain2.gain.setValueAtTime(0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.08);
}

// 둥실 — 롱프레스 해제 시 부드러운 뜨는 소리
export function playFloat() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

// 착지 — 해제된 글자를 다시 놓을 때
export function playLand() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

// 휘우웅~ 낙하 사운드
export function playFallSound() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.45);
}

// 자모 이름 매핑
const JAMO_NAMES = {
  'ㄱ':'기역','ㄴ':'니은','ㄷ':'디귿','ㄹ':'리을','ㅁ':'미음',
  'ㅂ':'비읍','ㅅ':'시옷','ㅇ':'이응','ㅈ':'지읒','ㅊ':'치읓',
  'ㅋ':'키읔','ㅌ':'티읕','ㅍ':'피읖','ㅎ':'히읗',
  'ㅏ':'아','ㅑ':'야','ㅓ':'어','ㅕ':'여','ㅗ':'오',
  'ㅛ':'요','ㅜ':'우','ㅠ':'유','ㅡ':'으','ㅣ':'이'
};

// Google Translate TTS로 발음 재생
const ttsCache = {}; // URL → Audio 캐시 (같은 글자 반복 시 즉시 재생)

export function speakChar(char, delay = 0) {
  const name = JAMO_NAMES[char];
  if (!name) return;
  const doSpeak = () => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=${encodeURIComponent(name)}`;
    if (!ttsCache[name]) ttsCache[name] = new Audio(url);
    const audio = ttsCache[name];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // 네트워크 실패 시 Web Speech API 폴백
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(name);
        utter.lang = 'ko-KR';
        utter.rate = 0.85;
        speechSynthesis.speak(utter);
      }
    });
  };
  if (delay > 0) setTimeout(doSpeak, delay);
  else doSpeak();
}

// 경찰차 — 삐뽀삐뽀 사이렌 (따라쓰기 중 지속)
let sirenNodes = null;

export function startSiren() {
  try {
    if (sirenNodes) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    gain.gain.value = 0.08;
    // 삐뽀: 두 음 사이를 LFO로 왕복
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'square'; // 사각파 → 삐-뽀 끊어지는 느낌
    lfo.frequency.value = 3; // 초당 3번 삐뽀
    lfoGain.gain.value = 200; // 주파수 변조 폭
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.frequency.value = 700; // 중심 주파수 (500~900 왕복)
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    lfo.start();
    sirenNodes = { osc, lfo, gain, ctx };
  } catch {}
}

export function stopSiren() {
  if (!sirenNodes) return;
  try {
    const { osc, lfo, gain } = sirenNodes;
    gain.gain.setValueAtTime(gain.gain.value, sirenNodes.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sirenNodes.ctx.currentTime + 0.15);
    setTimeout(() => {
      try { osc.stop(); lfo.stop(); } catch {}
    }, 200);
  } catch {}
  sirenNodes = null;
}

// 불모드 — 치지직 소리 (따라쓰기 중 지속)
let sizzleNodes = null;

export function startSizzle() {
  try {
    if (sizzleNodes) return; // 이미 재생 중
    const ctx = getCtx();
    // 화이트 노이즈 생성 (2초 루프)
    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    // 밴드패스 필터 — 치지직 느낌 (고주파 강조)
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4000;
    bp.Q.value = 1.5;
    // 하이패스 — 저음 제거
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    // 볼륨 — LFO로 치지지지 느낌 (불규칙 떨림)
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    // LFO 떨림
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 8;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    noise.connect(bp);
    bp.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    sizzleNodes = { noise, lfo, gain, ctx };
  } catch {}
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try {
    const { noise, lfo, gain } = sizzleNodes;
    // 페이드 아웃
    gain.gain.setValueAtTime(gain.gain.value, sizzleNodes.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sizzleNodes.ctx.currentTime + 0.15);
    setTimeout(() => {
      try { noise.stop(); lfo.stop(); } catch {}
    }, 200);
  } catch {}
  sizzleNodes = null;
}

// 불모드 글자 완성 — 쏴~ 물 소리 + 상승 멜로디
export function playWaterComplete() {
  try {
    const ctx = getCtx();
    // 물 소리
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 2500; filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 0.3);
    // 상승 멜로디
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc.connect(g2); g2.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + 0.1 + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch {}
}

// 실패 (놓았는데 완성 안 됨) — 낮은 붕 사운드
export function playFail() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(330, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}
