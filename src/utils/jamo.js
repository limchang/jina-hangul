// jamo.js — 자모 타입 판별 + 유니코드 음절 합성

import { CONSONANTS, VOWELS } from '../data.js';

const CONS_CHARS = new Set(CONSONANTS.map(c => c.char));
const VOW_CHARS = new Set(VOWELS.map(v => v.char));

export function isConsonant(ch) { return CONS_CHARS.has(ch); }
export function isVowel(ch) { return VOW_CHARS.has(ch); }

// 초성 유니코드 인덱스 (19개 체계)
const CHO = { 'ㄱ':0,'ㄴ':2,'ㄷ':3,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅅ':9,'ㅇ':11,'ㅈ':12,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18 };
const JUNG = { 'ㅏ':0,'ㅑ':2,'ㅓ':4,'ㅕ':6,'ㅗ':8,'ㅛ':12,'ㅜ':13,'ㅠ':17,'ㅡ':18,'ㅣ':20 };
const JONG = { '':0,'ㄱ':1,'ㄴ':4,'ㄷ':7,'ㄹ':8,'ㅁ':16,'ㅂ':17,'ㅅ':19,'ㅇ':21,'ㅈ':22,'ㅊ':23,'ㅋ':24,'ㅌ':25,'ㅍ':26,'ㅎ':27 };

export function composeSyllable(cho, jung, jong = '') {
  if (!cho || !jung) return '';
  const c = CHO[cho], j = JUNG[jung], jj = JONG[jong] || 0;
  if (c === undefined || j === undefined) return '';
  return String.fromCharCode(0xAC00 + c * 21 * 28 + j * 28 + jj);
}
