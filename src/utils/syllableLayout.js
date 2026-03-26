// syllableLayout.js — 슬롯 위치 계산

import { VOWEL_TEMPLATES } from '../data.js';

// 모음에 따른 슬롯 레이아웃 (% 기준)
export function getSlotLayout(vowelChar) {
  if (!vowelChar) {
    // 모음 미정 — 기본 레이아웃 (초성만 큼직하게)
    return {
      chosung:  { x: 10, y: 10, w: 80, h: 80 },
      jungsung: { x: 60, y: 10, w: 35, h: 80 },
      jongsung: { x: 10, y: 60, w: 80, h: 35 },
    };
  }

  const tmpl = VOWEL_TEMPLATES[vowelChar];
  if (!tmpl) return getSlotLayout(null);

  if (tmpl.dir === 'right') {
    // 가로형 (ㅏㅑㅓㅕㅣ): 초성 좌측, 모음 우측, 받침 하단
    return {
      chosung:  { x: 5, y: 5, w: 50, h: 55 },
      jungsung: { x: 50, y: 5, w: 45, h: 55 },
      jongsung: { x: 5, y: 58, w: 90, h: 38 },
    };
  } else {
    // 세로형 (ㅗㅛㅜㅠㅡ): 초성 상단, 모음 중간, 받침 하단
    return {
      chosung:  { x: 10, y: 3, w: 80, h: 35 },
      jungsung: { x: 5, y: 36, w: 90, h: 28 },
      jongsung: { x: 10, y: 63, w: 80, h: 35 },
    };
  }
}
