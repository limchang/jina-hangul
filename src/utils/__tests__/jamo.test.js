import { describe, it, expect } from 'vitest';
import { isConsonant, isVowel, composeSyllable, decompose, decomposeWord } from '../jamo.js';

describe('isConsonant', () => {
  it('자음 판별', () => {
    expect(isConsonant('ㄱ')).toBe(true);
    expect(isConsonant('ㅎ')).toBe(true);
    expect(isConsonant('ㅁ')).toBe(true);
  });
  it('모음은 false', () => {
    expect(isConsonant('ㅏ')).toBe(false);
    expect(isConsonant('ㅣ')).toBe(false);
  });
  it('한글 음절은 false', () => {
    expect(isConsonant('가')).toBe(false);
  });
});

describe('isVowel', () => {
  it('모음 판별', () => {
    expect(isVowel('ㅏ')).toBe(true);
    expect(isVowel('ㅣ')).toBe(true);
    expect(isVowel('ㅡ')).toBe(true);
  });
  it('자음은 false', () => {
    expect(isVowel('ㄱ')).toBe(false);
  });
});

describe('composeSyllable', () => {
  it('초성+중성 → 음절', () => {
    expect(composeSyllable('ㄱ', 'ㅏ')).toBe('가');
    expect(composeSyllable('ㅎ', 'ㅏ')).toBe('하');
    expect(composeSyllable('ㅇ', 'ㅣ')).toBe('이');
  });
  it('초성+중성+종성 → 음절', () => {
    expect(composeSyllable('ㅎ', 'ㅏ', 'ㄴ')).toBe('한');
    expect(composeSyllable('ㄱ', 'ㅡ', 'ㄹ')).toBe('글');
    expect(composeSyllable('ㅈ', 'ㅣ', 'ㄴ')).toBe('진');
  });
  it('빈 입력 → 빈 문자열', () => {
    expect(composeSyllable('', 'ㅏ')).toBe('');
    expect(composeSyllable('ㄱ', '')).toBe('');
  });
  it('잘못된 자모 → 빈 문자열', () => {
    expect(composeSyllable('a', 'ㅏ')).toBe('');
  });
});

describe('decompose', () => {
  it('음절 → 자모 분해', () => {
    expect(decompose('가')).toEqual(['ㄱ', 'ㅏ']);
    expect(decompose('한')).toEqual(['ㅎ', 'ㅏ', 'ㄴ']);
    expect(decompose('글')).toEqual(['ㄱ', 'ㅡ', 'ㄹ']);
  });
  it('자모 그대로 반환', () => {
    expect(decompose('ㄱ')).toEqual(['ㄱ']);
    expect(decompose('ㅏ')).toEqual(['ㅏ']);
  });
  it('복합 모음 분해', () => {
    // '게' = ㄱ + ㅔ → ㄱ + ㅓ + ㅣ
    const result = decompose('게');
    expect(result).toEqual(['ㄱ', 'ㅓ', 'ㅣ']);
  });
  it('비한글 그대로 반환', () => {
    expect(decompose('A')).toEqual(['A']);
    expect(decompose('1')).toEqual(['1']);
  });
});

describe('decomposeWord', () => {
  it('단어 → 지원 자모만 추출', () => {
    const result = decomposeWord('가나');
    expect(result).toEqual(['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ']);
  });
  it('받침 있는 단어', () => {
    const result = decomposeWord('한');
    expect(result).toEqual(['ㅎ', 'ㅏ', 'ㄴ']);
  });
  it('빈 문자열', () => {
    expect(decomposeWord('')).toEqual([]);
  });
  it('지원 안 되는 자모(ㄲ 등) 필터링', () => {
    // '까' = ㄲ + ㅏ → ㄲ은 data.js에 없으므로 필터됨, ㅏ만 남음
    const result = decomposeWord('까');
    expect(result).toEqual(['ㅏ']);
  });
});
