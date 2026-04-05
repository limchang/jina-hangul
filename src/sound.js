// sound.js — 간단한 효과음 (Web Audio API)

/** @type {AudioContext | null} */
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * osc+gain 생성 헬퍼 — 반복 패턴 제거
 * @param {AudioContext} ctx
 * @param {OscillatorType} [type]
 * @returns {{ osc: OscillatorNode, gain: GainNode }}
 */
function createTone(ctx, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  return { osc, gain };
}

// 배경음 상태 (사이렌/치지직)
const bgSounds = {
  siren: null,   // was sirenNodes
  sizzle: null,  // was sizzleNodes
};

/**
 * 드래그 시작 — 짧은 팝 사운드
 * @returns {void}
 */
export function playStart() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');

  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

/**
 * 획 완성 — 밝은 띵 사운드
 * @returns {void}
 */
export function playComplete() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');

  osc.frequency.setValueAtTime(1047, ctx.currentTime);       // C6
  osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.08); // E6

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

/**
 * 글자 완성 — 축하 멜로디 (도미솔)
 * @returns {void}
 */
export function playCelebrate() {
  const ctx = getCtx();
  const notes = [1047, 1319, 1568]; // C6, E6, G6
  notes.forEach((freq, i) => {
    const { osc, gain } = createTone(ctx, 'sine');

    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

    const t = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  });
}

/**
 * 착! 바닥에 박히는 사운드 — 짧고 강한 임팩트
 * @returns {void}
 */
export function playSlam() {
  const ctx = getCtx();

  // 저음 쿵
  const { osc: osc1, gain: gain1 } = createTone(ctx, 'sine');
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);

  // 고음 착
  const { osc: osc2, gain: gain2 } = createTone(ctx, 'square');
  osc2.frequency.setValueAtTime(800, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
  gain2.gain.setValueAtTime(0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.08);
}

/**
 * 둥실 — 롱프레스 해제 시 부드러운 뜨는 소리
 * @returns {void}
 */
export function playFloat() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');
  osc.frequency.setValueAtTime(523, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

/**
 * 착지 — 해제된 글자를 다시 놓을 때
 * @returns {void}
 */
export function playLand() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

/**
 * 휘우웅~ 낙하 사운드
 * @returns {void}
 */
export function playFallSound() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.45);
}

// 자모 이름 → MP3 파일 매핑 (자모는 파일명이 자모 자체)
const JAMO_CHARS = new Set('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split(''));

// MP3 오디오 캐시
const audioCache = {};

// 사이렌/치지직 볼륨 낮추기 (ducking) — TTS가 들리도록
function duckBgSounds() {
  const duckTo = 0.01;
  if (bgSounds.siren) {
    bgSounds.siren.gain.gain.setValueAtTime(bgSounds.siren.gain.gain.value, bgSounds.siren.ctx.currentTime);
    bgSounds.siren.gain.gain.linearRampToValueAtTime(duckTo, bgSounds.siren.ctx.currentTime + 0.05);
  }
  if (bgSounds.sizzle) {
    bgSounds.sizzle.gain.gain.setValueAtTime(bgSounds.sizzle.gain.gain.value, bgSounds.sizzle.ctx.currentTime);
    bgSounds.sizzle.gain.gain.linearRampToValueAtTime(duckTo, bgSounds.sizzle.ctx.currentTime + 0.05);
  }
}

function unduckBgSounds() {
  if (bgSounds.siren) {
    bgSounds.siren.gain.gain.setValueAtTime(bgSounds.siren.gain.gain.value, bgSounds.siren.ctx.currentTime);
    bgSounds.siren.gain.gain.linearRampToValueAtTime(0.08, bgSounds.siren.ctx.currentTime + 0.15);
  }
  if (bgSounds.sizzle) {
    bgSounds.sizzle.gain.gain.setValueAtTime(bgSounds.sizzle.gain.gain.value, bgSounds.sizzle.ctx.currentTime);
    bgSounds.sizzle.gain.gain.linearRampToValueAtTime(0.06, bgSounds.sizzle.ctx.currentTime + 0.15);
  }
}

/**
 * 네이버 TTS MP3로 발음 재생
 * @param {string} char - 재생할 한글 글자 또는 자모
 * @param {number} [delay] - 재생 지연 시간(ms)
 */
export function speakChar(char, delay = 0) {
  // 한글이 아니면 무시
  if (!/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char)) return;
  // 자모이면 자모 파일, 완성 글자면 글자 파일
  const fileName = JAMO_CHARS.has(char) ? char : char;
  const doSpeak = () => {
    if (!audioCache[fileName]) {
      audioCache[fileName] = new Audio(`./audio/${fileName}.mp3`);
      audioCache[fileName].onerror = () => {
        // MP3 파일이 없으면 Web Speech API 폴백
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(char);
          utter.lang = 'ko-KR';
          utter.rate = 0.9;
          speechSynthesis.speak(utter);
        }
      };
    }
    const audio = audioCache[fileName];
    audio.currentTime = 0;
    // 배경음 줄이고 → 재생 → 끝나면 복구
    duckBgSounds();
    audio.play().then(() => {
      audio.onended = () => unduckBgSounds();
    }).catch(() => unduckBgSounds());
  };
  if (delay > 0) setTimeout(doSpeak, delay);
  else doSpeak();
}

/**
 * 경찰차 — 삐뽀삐뽀 사이렌 (따라쓰기 중 지속)
 * @returns {void}
 */
export function startSiren() {
  try {
    if (bgSounds.siren) return;
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
    bgSounds.siren = { osc, lfo, gain, ctx };
  } catch (e) {
    console.warn('Siren start failed:', e);
  }
}

/**
 * 사이렌 사운드 정지
 * @returns {void}
 */
export function stopSiren() {
  if (!bgSounds.siren) return;
  try {
    const { osc, lfo, gain } = bgSounds.siren;
    gain.gain.setValueAtTime(gain.gain.value, bgSounds.siren.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, bgSounds.siren.ctx.currentTime + 0.15);
    setTimeout(() => {
      // oscillator가 이미 중지된 경우 무시
      try { osc.stop(); lfo.stop(); } catch {}
    }, 200);
  } catch {}
  bgSounds.siren = null;
}

/**
 * 불모드 — 치지직 소리 (따라쓰기 중 지속)
 * @returns {void}
 */
export function startSizzle() {
  try {
    if (bgSounds.sizzle) return; // 이미 재생 중
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
    bgSounds.sizzle = { noise, lfo, gain, ctx };
  } catch (e) {
    console.warn('Sizzle start failed:', e);
  }
}

/**
 * 치지직 사운드 정지
 * @returns {void}
 */
export function stopSizzle() {
  if (!bgSounds.sizzle) return;
  try {
    const { noise, lfo, gain } = bgSounds.sizzle;
    // 페이드 아웃
    gain.gain.setValueAtTime(gain.gain.value, bgSounds.sizzle.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, bgSounds.sizzle.ctx.currentTime + 0.15);
    setTimeout(() => {
      // oscillator가 이미 중지된 경우 무시
      try { noise.stop(); lfo.stop(); } catch {}
    }, 200);
  } catch {}
  bgSounds.sizzle = null;
}

/**
 * 불모드 글자 완성 — 쏴~ 물 소리 + 상승 멜로디
 * @returns {void}
 */
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
      const { osc, gain: g2 } = createTone(ctx, 'sine');
      const t = ctx.currentTime + 0.1 + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch (e) {
    console.warn('Water complete sound failed:', e);
  }
}

/**
 * 실패 (놓았는데 완성 안 됨) — 낮은 붕 사운드
 * @returns {void}
 */
export function playFail() {
  const ctx = getCtx();
  const { osc, gain } = createTone(ctx, 'sine');

  osc.frequency.setValueAtTime(330, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}
