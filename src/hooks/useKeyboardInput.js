// useKeyboardInput.js — 키보드 입력 및 한글 조합
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONSONANTS, VOWELS } from '../data.js';
import { samplePath } from '../TracingEngine.js';
import { decompose } from '../utils/jamo.js';
import { isVowel } from '../utils/jamo.js';

export default function useKeyboardInput({ allChars, groupIdCounter, placeNewPiece, getNextPlacePos, placeNewPieceRef, getNextPlacePosRef, cardEditMode }) {
  const [kbMode, setKbMode] = useState(false); // 키보드 조합 입력 모드
  const kbInputRef = useRef(null);
  const kbPrevRef = useRef('');
  const kbComposingRef = useRef(false);
  const syllableCursorRef = useRef(null);
  const typingGroupRef = useRef(null); // 현재 타이핑 세션의 groupId

  // ── 키코드 매핑 ──
  const keyCharMap = useMemo(() => ({
    'KeyR': 'ㄱ', 'KeyS': 'ㄴ', 'KeyE': 'ㄷ', 'KeyF': 'ㄹ', 'KeyA': 'ㅁ',
    'KeyQ': 'ㅂ', 'KeyT': 'ㅅ', 'KeyD': 'ㅇ', 'KeyW': 'ㅈ', 'KeyC': 'ㅊ',
    'KeyZ': 'ㅋ', 'KeyX': 'ㅌ', 'KeyV': 'ㅍ', 'KeyG': 'ㅎ',
    'KeyK': 'ㅏ', 'KeyI': 'ㅑ', 'KeyJ': 'ㅓ', 'KeyU': 'ㅕ', 'KeyH': 'ㅗ',
    'KeyY': 'ㅛ', 'KeyN': 'ㅜ', 'KeyB': 'ㅠ', 'KeyM': 'ㅡ', 'KeyL': 'ㅣ',
  }), []);

  const VERT_VOWELS = useMemo(() => new Set(['ㅏ','ㅑ','ㅓ','ㅕ','ㅣ']), []);
  const C = 250; // 캔버스 중심 (글자 원점)

  // 두 자모 중심 간 거리 계산
  const distX = (bbA, bbB, s, pad) => (bbA.maxX - C) * s + pad + (C - bbB.minX) * s;
  const distY = (bbA, bbB, s, pad) => (bbA.maxY - C) * s + pad + (C - bbB.minY) * s;

  // 자모 바운딩 박스 캐시 (500x500 캔버스 기준)
  const bboxCache = useMemo(() => {
    const cache = {};
    [...CONSONANTS, ...VOWELS].forEach(item => {
      let minX = 500, maxX = 0, minY = 500, maxY = 0;
      item.strokes.forEach(s => {
        const pts = samplePath(s.path, 30);
        pts.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      });
      // 흰색 가이드 배경선 두께 반영 (GUIDE_STROKE_WIDTH+28)/2 = 51
      const guideR = 51;
      cache[item.char] = { minX: minX - guideR, maxX: maxX + guideR, minY: minY - guideR, maxY: maxY + guideR, w: maxX - minX + guideR * 2, h: maxY - minY + guideR * 2 };
    });
    return cache;
  }, []);

  // ── 키보드 조합 모드 — 숨겨진 input으로 한글 조합 입력 ──
  useEffect(() => {
    if (kbMode && kbInputRef.current) {
      kbInputRef.current.focus();
      kbInputRef.current.value = '';
      kbPrevRef.current = '';
      kbComposingRef.current = false;
      syllableCursorRef.current = null;
      typingGroupRef.current = groupIdCounter.current++;
    }
  }, [kbMode, groupIdCounter]);

  const placeSyllable = useCallback((syllable) => {
    const parts = decompose(syllable);
    const validParts = parts.filter(j => allChars[j]);
    if (validParts.length === 0) return;

    // 음절마다 새 groupId (한 글자 = 한 그룹)
    const syllableGroupId = groupIdCounter.current++;

    const scale = 0.5;
    const S = scale;
    const PAD = 5;

    if (!syllableCursorRef.current) {
      const pos = getNextPlacePosRef.current();
      syllableCursorRef.current = { x: pos.x, y: pos.y };
    }

    const SYLLABLE_GAP = 140; // 음절 간 추가 여백
    const ox = syllableCursorRef.current.x;
    const topY = syllableCursorRef.current.y; // 윗선 기준 (상단 정렬)
    // 자모 중심 Y = 윗선 + (캔버스중심 - bb상단) * scale → 상단 정렬
    const topAlignY = (bb) => topY + (C - bb.minY) * S;

    if (validParts.length === 1) {
      const bb = bboxCache[validParts[0]];
      placeNewPieceRef.current(validParts[0], ox, topAlignY(bb), false, syllableGroupId);
      syllableCursorRef.current.x += (bb.w / 2) * S + SYLLABLE_GAP;
      return;
    }

    // 복합 모음 처리: 3번째 자모가 모음이면 받침이 아니라 복합 모음의 일부
    const cho = validParts[0];
    const vowelParts = []; // 중성 자모들
    let jong = null;
    for (let vi = 1; vi < validParts.length; vi++) {
      if (isVowel(validParts[vi])) vowelParts.push(validParts[vi]);
      else { jong = validParts[vi]; break; }
    }
    const jung = vowelParts[0];
    const bc = bboxCache[cho], bj = bboxCache[jung], bk = jong ? bboxCache[jong] : null;
    const isVert = VERT_VOWELS.has(jung);
    const hasJong = !!jong;

    if (isVert) {
      // 모든 세로 모음 파트의 누적 너비 계산
      let prevBB = bc;
      let totalDx = 0;
      const vowelDxList = []; // 각 모음의 x 오프셋
      for (const vp of vowelParts) {
        const bv = bboxCache[vp];
        const ddx = distX(prevBB, bv, S, PAD);
        totalDx += ddx;
        vowelDxList.push(totalDx);
        prevBB = bv;
      }
      const lastVowelBB = bboxCache[vowelParts[vowelParts.length - 1]];
      const leftEdge = (C - bc.minX) * S;
      const rightEdge = totalDx + (lastVowelBB.maxX - C) * S;
      const totalW = leftEdge + rightEdge;
      const startX = ox - totalW / 2 + leftEdge; // 초성 중심

      const choX = startX;

      if (hasJong) {
        const choY = topAlignY(bc);
        placeNewPieceRef.current(cho, choX, choY, false, syllableGroupId);
        for (let vi = 0; vi < vowelParts.length; vi++) {
          placeNewPieceRef.current(vowelParts[vi], startX + vowelDxList[vi], topAlignY(bboxCache[vowelParts[vi]]), false, syllableGroupId);
        }
        const dyJong = distY(bc, bk, S, PAD);
        const jongX = startX + totalDx * 0.5;
        const jongY = choY + dyJong;
        placeNewPieceRef.current(jong, jongX, jongY, false, syllableGroupId);
      } else {
        placeNewPieceRef.current(cho, choX, topAlignY(bc), false, syllableGroupId);
        for (let vi = 0; vi < vowelParts.length; vi++) {
          placeNewPieceRef.current(vowelParts[vi], startX + vowelDxList[vi], topAlignY(bboxCache[vowelParts[vi]]), false, syllableGroupId);
        }
      }
      syllableCursorRef.current.x += totalW / 2 + SYLLABLE_GAP;
    } else {
      const dy1 = distY(bc, bj, S, PAD);
      const choY = topAlignY(bc);
      if (hasJong) {
        const dy2 = distY(bj, bk, S, PAD);
        placeNewPieceRef.current(cho, ox, choY, false, syllableGroupId);
        placeNewPieceRef.current(jung, ox, choY + dy1, false, syllableGroupId);
        placeNewPieceRef.current(jong, ox, choY + dy1 + dy2, false, syllableGroupId);
      } else {
        placeNewPieceRef.current(cho, ox, choY, false, syllableGroupId);
        placeNewPieceRef.current(jung, ox, choY + dy1, false, syllableGroupId);
      }
      const maxW = Math.max(bc.w, bj.w, bk ? bk.w : 0) * S;
      syllableCursorRef.current.x += maxW / 2 + SYLLABLE_GAP;
    }
  }, [allChars, bboxCache, groupIdCounter, getNextPlacePosRef, placeNewPieceRef, VERT_VOWELS]);

  const handleKbInput = useCallback((e) => {
    // compositionEnd에서만 배치 — input에서는 무시
  }, []);

  const handleCompositionStart = useCallback(() => {
    kbComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e) => {
    kbComposingRef.current = false;
    const val = kbInputRef.current?.value || '';
    if (val.length > 0) {
      placeSyllable(val[val.length - 1]);
    }
    if (kbInputRef.current) kbInputRef.current.value = '';
    kbPrevRef.current = '';
  }, [placeSyllable]);

  // ── 키보드 입력 → 글자 배치 (키코드 매핑) ──
  useEffect(() => {
    function onKeyDown(e) {
      if (cardEditMode || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') return; // 스페이스는 패닝용
      const char = keyCharMap[e.code] || e.key;
      if (allChars[char]) {
        e.preventDefault();
        const pos = getNextPlacePos();
        placeNewPiece(char, pos.x, pos.y);
      }
    }
    if (!kbMode) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  });

  // ── kbMode 시 input 포커스 ──
  // (kbMode effect는 위에서 이미 처리)

  return {
    kbMode, setKbMode,
    kbInputRef,
    bboxCache,
    handleKbInput, handleCompositionStart, handleCompositionEnd,
  };
}
