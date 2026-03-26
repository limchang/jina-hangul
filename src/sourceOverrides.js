// sourceOverrides.js — piece별 소스 오버라이드 관리
import { CONSONANTS, VOWELS } from './data.js';

// 런타임 소스 오버라이드 — piece.id 단위
export const pieceOverrides = {};

export function getOriginalSource(char) {
  return CONSONANTS.find(c => c.char === char) || VOWELS.find(v => v.char === char);
}

export function getSource(char, pieceId) {
  if (pieceId && pieceOverrides[pieceId]) return pieceOverrides[pieceId];
  return getOriginalSource(char);
}
