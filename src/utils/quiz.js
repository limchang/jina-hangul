/** @typedef {import('../types.js').MathQuiz} MathQuiz */

/**
 * 곱셈 퀴즈 생성 — 2~9 사이 두 수의 곱
 * @returns {MathQuiz}
 */
export function generateMathQuiz() {
  const a = 2 + Math.floor(Math.random() * 8); // 2~9
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = a * b;
  // 오답 3개 생성 (중복 방지)
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const w = answer + (Math.floor(Math.random() * 21) - 10);
    if (w !== answer && w > 0) wrongs.add(w);
  }
  const options = [...wrongs, answer].sort(() => Math.random() - 0.5);
  return { a, b, answer, options };
}
