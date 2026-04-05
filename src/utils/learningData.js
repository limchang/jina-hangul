// learningData.js — localStorage 기반 학습 데이터 저장/조회

const STORAGE_KEY = 'jina-learning-data';

/**
 * @typedef {{ completions: number, failures: number, avgTime: number, lastPracticed: string }} CharStat
 */

/**
 * @typedef {{ date: string, duration: number, completedChars: string[], stars: number }} Session
 */

/**
 * @typedef {{
 *   version: number,
 *   profile: { name: string, createdAt: string },
 *   charStats: Record<string, CharStat>,
 *   sessions: Session[],
 *   achievements: { totalStars: number, streak: number, badges: string[] }
 * }} LearningData
 */

/** @type {number|null} 현재 세션 시작 시각 (ms) */
let sessionStartTime = null;

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 * @returns {string}
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 기본 학습 데이터
 * @returns {LearningData}
 */
function createDefault() {
  return {
    version: 1,
    profile: { name: '진아', createdAt: today() },
    charStats: {},
    sessions: [],
    achievements: { totalStars: 0, streak: 0, badges: [] },
  };
}

/**
 * localStorage에서 학습 데이터 로드, 없으면 기본값 반환
 * @returns {LearningData}
 */
export function loadLearningData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefault();
    const data = JSON.parse(raw);
    if (!data || data.version === undefined) return createDefault();
    return data;
  } catch {
    return createDefault();
  }
}

/**
 * localStorage에 학습 데이터 저장
 * @param {LearningData} data
 */
export function saveLearningData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage가 꽉 찼거나 접근 불가
  }
}

/**
 * 글자 완성 기록 (completions++, avgTime 갱신, lastPracticed 갱신, totalStars++)
 * @param {string} char - 완성한 글자
 * @param {number} timeSeconds - 소요 시간 (초)
 */
export function recordCompletion(char, timeSeconds) {
  const data = loadLearningData();
  if (!data.charStats[char]) {
    data.charStats[char] = { completions: 0, failures: 0, avgTime: 0, lastPracticed: '' };
  }
  const stat = data.charStats[char];
  const totalTime = stat.avgTime * stat.completions + timeSeconds;
  stat.completions += 1;
  stat.avgTime = totalTime / stat.completions;
  stat.lastPracticed = today();
  data.achievements.totalStars += 1;
  saveLearningData(data);
}

/**
 * 글자 실패 기록
 * @param {string} char - 실패한 글자
 */
export function recordFailure(char) {
  const data = loadLearningData();
  if (!data.charStats[char]) {
    data.charStats[char] = { completions: 0, failures: 0, avgTime: 0, lastPracticed: '' };
  }
  data.charStats[char].failures += 1;
  data.charStats[char].lastPracticed = today();
  saveLearningData(data);
}

/**
 * 다음 추천 글자 (미연습 우선 → 실패 많은 순 → 순서대로)
 * @param {string[]} allChars - 전체 글자 목록
 * @returns {string} 추천 글자
 */
export function getRecommendedChar(allChars) {
  const data = loadLearningData();
  // 1. 미연습 글자 우선
  const unpracticed = allChars.filter(ch => !data.charStats[ch]);
  if (unpracticed.length > 0) return unpracticed[0];
  // 2. 실패 많은 순
  const sorted = [...allChars].sort((a, b) => {
    const fa = data.charStats[a]?.failures || 0;
    const fb = data.charStats[b]?.failures || 0;
    return fb - fa;
  });
  if (sorted.length > 0 && (data.charStats[sorted[0]]?.failures || 0) > 0) {
    return sorted[0];
  }
  // 3. 순서대로
  return allChars[0];
}

/**
 * 세션 시작 시각 기록
 */
export function startSession() {
  sessionStartTime = Date.now();
}

/**
 * 세션 종료, sessions 배열에 추가
 * @param {string[]} completedChars - 이번 세션에서 완성한 글자들
 * @param {number} stars - 획득한 별 수
 */
export function endSession(completedChars, stars) {
  const data = loadLearningData();
  const now = Date.now();
  const duration = sessionStartTime ? Math.round((now - sessionStartTime) / 1000) : 0;
  data.sessions.push({
    date: today(),
    duration,
    completedChars,
    stars,
  });
  sessionStartTime = null;
  saveLearningData(data);
}

/**
 * 연속 학습일수 계산 (오늘 이미 학습했으면 유지, 어제 학습했으면 +1, 아니면 리셋)
 */
export function updateStreak() {
  const data = loadLearningData();
  const sessions = data.sessions;
  if (sessions.length === 0) {
    data.achievements.streak = 0;
    saveLearningData(data);
    return;
  }

  const todayStr = today();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const sessionDates = new Set(sessions.map(s => s.date));

  if (sessionDates.has(todayStr)) {
    // 오늘 학습 기록이 있으면 streak 유지 (최소 1)
    if (data.achievements.streak === 0) data.achievements.streak = 1;
  } else if (sessionDates.has(yesterdayStr)) {
    // 어제 학습했으면 +1
    data.achievements.streak += 1;
  } else {
    // 연속 끊김
    data.achievements.streak = 0;
  }

  saveLearningData(data);
}

/**
 * 요약 통계 반환
 * @returns {{ totalStars: number, streak: number, completedChars: number, totalSessions: number }}
 */
export function getLearningStats() {
  const data = loadLearningData();
  const completedChars = Object.values(data.charStats).filter(s => s.completions > 0).length;
  return {
    totalStars: data.achievements.totalStars,
    streak: data.achievements.streak,
    completedChars,
    totalSessions: data.sessions.length,
  };
}
