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

// 초성 역매핑 (인덱스 → 자모)
const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 한글 음절 → 자모 배열로 분해 (초성, 중성, 종성)
// 예: '진' → ['ㅈ', 'ㅣ', 'ㄴ'], '아' → ['ㅇ', 'ㅏ']
export function decompose(syllable) {
  const code = syllable.charCodeAt(0);
  // 이미 자모이면 그대로
  if (CONS_CHARS.has(syllable) || VOW_CHARS.has(syllable)) return [syllable];
  // 한글 음절 범위
  if (code < 0xAC00 || code > 0xD7A3) return [syllable];
  const offset = code - 0xAC00;
  const cho = CHO_LIST[Math.floor(offset / (21 * 28))];
  const jung = JUNG_LIST[Math.floor((offset % (21 * 28)) / 28)];
  const jong = JONG_LIST[offset % 28];
  // 복합 모음 → 기본 자모로 분해
  const COMPOUND_VOWEL = {
    'ㅐ': ['ㅏ','ㅣ'], 'ㅒ': ['ㅑ','ㅣ'], 'ㅔ': ['ㅓ','ㅣ'], 'ㅖ': ['ㅕ','ㅣ'],
    'ㅘ': ['ㅗ','ㅏ'], 'ㅙ': ['ㅗ','ㅏ','ㅣ'], 'ㅚ': ['ㅗ','ㅣ'],
    'ㅝ': ['ㅜ','ㅓ'], 'ㅞ': ['ㅜ','ㅓ','ㅣ'], 'ㅟ': ['ㅜ','ㅣ'], 'ㅢ': ['ㅡ','ㅣ'],
  };
  const jungParts = COMPOUND_VOWEL[jung] || [jung];
  const result = [cho, ...jungParts];
  if (jong) result.push(jong);
  return result;
}

// 문자열 → 모든 글자를 자모로 분해
export function decomposeWord(word) {
  const jamos = [];
  for (const ch of word) {
    jamos.push(...decompose(ch));
  }
  // data.js에 있는 자모만 필터 (ㄲ, ㅐ 등 지원 안 되는 건 제외)
  return jamos.filter(j => CONS_CHARS.has(j) || VOW_CHARS.has(j));
}
