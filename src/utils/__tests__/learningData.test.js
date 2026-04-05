import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLearningData,
  saveLearningData,
  recordCompletion,
  recordFailure,
  getRecommendedChar,
  startSession,
  endSession,
  updateStreak,
  getLearningStats,
} from '../learningData.js';

beforeEach(() => {
  localStorage.clear();
});

describe('loadLearningData', () => {
  it('빈 상태에서 기본값 반환', () => {
    const data = loadLearningData();
    expect(data.version).toBe(1);
    expect(data.profile.name).toBe('진아');
    expect(data.charStats).toEqual({});
    expect(data.sessions).toEqual([]);
    expect(data.achievements.totalStars).toBe(0);
    expect(data.achievements.streak).toBe(0);
  });

  it('저장된 데이터 로드', () => {
    const saved = {
      version: 1,
      profile: { name: '진아', createdAt: '2026-04-05' },
      charStats: { 'ㄱ': { completions: 1, failures: 0, avgTime: 10, lastPracticed: '2026-04-05' } },
      sessions: [],
      achievements: { totalStars: 1, streak: 1, badges: [] },
    };
    localStorage.setItem('jina-learning-data', JSON.stringify(saved));
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].completions).toBe(1);
    expect(data.achievements.totalStars).toBe(1);
  });

  it('잘못된 JSON이면 기본값 반환', () => {
    localStorage.setItem('jina-learning-data', '{broken');
    const data = loadLearningData();
    expect(data.version).toBe(1);
    expect(data.charStats).toEqual({});
  });
});

describe('saveLearningData', () => {
  it('localStorage에 저장', () => {
    const data = loadLearningData();
    data.achievements.totalStars = 5;
    saveLearningData(data);
    const raw = JSON.parse(localStorage.getItem('jina-learning-data'));
    expect(raw.achievements.totalStars).toBe(5);
  });
});

describe('recordCompletion', () => {
  it('completions 증가, avgTime 갱신, totalStars 증가', () => {
    recordCompletion('ㄱ', 10);
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].completions).toBe(1);
    expect(data.charStats['ㄱ'].avgTime).toBe(10);
    expect(data.achievements.totalStars).toBe(1);
  });

  it('여러 번 완성 시 평균 시간 갱신', () => {
    recordCompletion('ㄱ', 10);
    recordCompletion('ㄱ', 20);
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].completions).toBe(2);
    expect(data.charStats['ㄱ'].avgTime).toBe(15);
    expect(data.achievements.totalStars).toBe(2);
  });

  it('lastPracticed 갱신', () => {
    recordCompletion('ㄴ', 5);
    const data = loadLearningData();
    expect(data.charStats['ㄴ'].lastPracticed).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('recordFailure', () => {
  it('failures 증가', () => {
    recordFailure('ㄱ');
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].failures).toBe(1);
  });

  it('여러 번 실패', () => {
    recordFailure('ㄱ');
    recordFailure('ㄱ');
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].failures).toBe(2);
  });

  it('실패해도 completions는 변하지 않음', () => {
    recordCompletion('ㄱ', 10);
    recordFailure('ㄱ');
    const data = loadLearningData();
    expect(data.charStats['ㄱ'].completions).toBe(1);
    expect(data.charStats['ㄱ'].failures).toBe(1);
  });
});

describe('getRecommendedChar', () => {
  it('미연습 글자 우선', () => {
    recordCompletion('ㄱ', 10);
    const result = getRecommendedChar(['ㄱ', 'ㄴ', 'ㄷ']);
    expect(result).toBe('ㄴ');
  });

  it('모두 연습했으면 실패 많은 순', () => {
    recordCompletion('ㄱ', 10);
    recordCompletion('ㄴ', 10);
    recordCompletion('ㄷ', 10);
    recordFailure('ㄷ');
    recordFailure('ㄷ');
    recordFailure('ㄴ');
    const result = getRecommendedChar(['ㄱ', 'ㄴ', 'ㄷ']);
    expect(result).toBe('ㄷ');
  });

  it('미연습도 없고 실패도 없으면 순서대로', () => {
    recordCompletion('ㄱ', 10);
    recordCompletion('ㄴ', 10);
    const result = getRecommendedChar(['ㄱ', 'ㄴ']);
    expect(result).toBe('ㄱ');
  });

  it('빈 목록이면 undefined', () => {
    const result = getRecommendedChar([]);
    expect(result).toBeUndefined();
  });
});

describe('startSession / endSession', () => {
  it('세션 기록', () => {
    startSession();
    endSession(['ㄱ', 'ㄴ'], 2);
    const data = loadLearningData();
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].completedChars).toEqual(['ㄱ', 'ㄴ']);
    expect(data.sessions[0].stars).toBe(2);
    expect(data.sessions[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('startSession 없이 endSession 호출하면 duration 0', () => {
    endSession(['ㄱ'], 1);
    const data = loadLearningData();
    expect(data.sessions[0].duration).toBe(0);
  });
});

describe('updateStreak', () => {
  it('세션 없으면 streak 0', () => {
    updateStreak();
    const data = loadLearningData();
    expect(data.achievements.streak).toBe(0);
  });

  it('오늘 학습했으면 streak 유지 (최소 1)', () => {
    startSession();
    endSession(['ㄱ'], 1);
    updateStreak();
    const data = loadLearningData();
    expect(data.achievements.streak).toBe(1);
  });

  it('어제 학습했으면 streak +1', () => {
    const data = loadLearningData();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    data.sessions.push({
      date: yesterday.toISOString().slice(0, 10),
      duration: 60,
      completedChars: ['ㄱ'],
      stars: 1,
    });
    data.achievements.streak = 2;
    saveLearningData(data);
    updateStreak();
    const updated = loadLearningData();
    expect(updated.achievements.streak).toBe(3);
  });

  it('이틀 이상 안 했으면 streak 리셋', () => {
    const data = loadLearningData();
    data.sessions.push({
      date: '2025-01-01',
      duration: 60,
      completedChars: ['ㄱ'],
      stars: 1,
    });
    data.achievements.streak = 5;
    saveLearningData(data);
    updateStreak();
    const updated = loadLearningData();
    expect(updated.achievements.streak).toBe(0);
  });
});

describe('getLearningStats', () => {
  it('요약 통계 반환', () => {
    recordCompletion('ㄱ', 10);
    recordCompletion('ㄴ', 15);
    startSession();
    endSession(['ㄱ', 'ㄴ'], 2);
    const stats = getLearningStats();
    expect(stats.totalStars).toBe(2);
    expect(stats.completedChars).toBe(2);
    expect(stats.totalSessions).toBe(1);
    expect(stats.streak).toBe(0); // updateStreak 안 호출했으므로
  });
});
