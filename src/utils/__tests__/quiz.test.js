import { describe, it, expect } from 'vitest';
import { generateMathQuiz } from '../quiz.js';

describe('generateMathQuiz', () => {
  it('a, b가 2~9 범위', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMathQuiz();
      expect(q.a).toBeGreaterThanOrEqual(2);
      expect(q.a).toBeLessThanOrEqual(9);
      expect(q.b).toBeGreaterThanOrEqual(2);
      expect(q.b).toBeLessThanOrEqual(9);
    }
  });

  it('answer = a * b', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMathQuiz();
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('options에 정답이 포함', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMathQuiz();
      expect(q.options).toContain(q.answer);
    }
  });

  it('options가 4개', () => {
    const q = generateMathQuiz();
    expect(q.options).toHaveLength(4);
  });

  it('options에 중복 없음', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMathQuiz();
      const unique = new Set(q.options);
      expect(unique.size).toBe(4);
    }
  });

  it('모든 options가 양수', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateMathQuiz();
      q.options.forEach(opt => expect(opt).toBeGreaterThan(0));
    }
  });
});
