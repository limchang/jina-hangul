// FreeComposeMode.jsx — 자유 배치 모드 (만들기2)
// 드래그해서 놓으면 바로 따라쓰기, 빈 공간 드래그 = 캔버스 이동, 선택 글자 강조

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONSONANTS, VOWELS, APP_CONFIG } from '../data.js';
import { initSvgHelper, samplePath } from '../TracingEngine.js';
import { getSource, pieceOverrides } from '../sourceOverrides.js';
import TracePiece from './TracePiece.jsx';
import WordCards, { renderLayoutPreview } from './WordCards.jsx';
import { decompose, decomposeWord } from '../utils/jamo.js';
import { isVowel } from '../utils/jamo.js';

let nextId = 1;

// 배치 기억 — 낱말별 글자 위치 저장
const LAYOUT_KEY = 'jina-word-layouts';
function loadWordLayout(word) {
  try {
    const all = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return all[word] || null;
  } catch { return null; }
}
function saveWordLayout(word, layout) {
  try {
    const all = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    all[word] = layout;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch {}
}

// Canvas로 가이드 글자 이미지 생성
function renderJamoImage(source) {
  const SIZE = 500;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  // 흰색 배경선
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = APP_CONFIG.GUIDE_STROKE_WIDTH + 28;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  // 노란 점선 가이드
  ctx.strokeStyle = 'rgba(255,200,0,0.55)';
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 14]);
  source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));
  ctx.setLineDash([]);
  return canvas.toDataURL();
}

export default function FreeComposeMode() {
  const [pieces, setPieces] = useState([]);
  const [dragNew, setDragNew] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // 그룹 선택
  let groupIdCounter = useRef(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panLocked, setPanLocked] = useState(false);
  const [mathQuiz, setMathQuiz] = useState(null);
  const [focusZoom, setFocusZoom] = useState(true); // 도착지 근접 시 확대
  const focusZoomActiveRef = useRef(false);
  const savedZoomRef = useRef(null);
  const spaceHeldRef = useRef(false);

  const onNearGoal = useCallback((near, piece) => {
    if (!focusZoom) return;
    if (near && !focusZoomActiveRef.current) {
      focusZoomActiveRef.current = true;
      savedZoomRef.current = zoomRef.current;
      const oldZ = zoomRef.current;
      const newZ = Math.min(oldZ * 1.5, 3);
      // 목적지 중심으로 확대 — pan 보정
      const po = panOffsetRef.current;
      const cx = piece.x * oldZ + po.x; // 목적지의 현재 화면 좌표
      const cy = piece.y * oldZ + po.y;
      const newPanX = cx - piece.x * newZ;
      const newPanY = cy - piece.y * newZ;
      // DOM 직접 조작 (smooth) — 드래그 안 풀림
      if (panLayerRef.current) {
        panLayerRef.current.style.transition = 'transform 0.35s ease-out';
        panLayerRef.current.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newZ})`;
        setTimeout(() => { if (panLayerRef.current) panLayerRef.current.style.transition = ''; }, 400);
      }
      setZoom(newZ);
      setPanOffset({ x: newPanX, y: newPanY });
    } else if (!near && focusZoomActiveRef.current) {
      focusZoomActiveRef.current = false;
      if (savedZoomRef.current !== null) {
        const oldZ = zoomRef.current;
        const newZ = savedZoomRef.current;
        // 화면 중앙 기준 복귀
        const screenCX = window.innerWidth / 2, screenCY = window.innerHeight / 2;
        const po = panOffsetRef.current;
        const newPanX = screenCX - (screenCX - po.x) * (newZ / oldZ);
        const newPanY = screenCY - (screenCY - po.y) * (newZ / oldZ);
        if (panLayerRef.current) {
          panLayerRef.current.style.transition = 'transform 0.35s ease-out';
          panLayerRef.current.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newZ})`;
          setTimeout(() => { if (panLayerRef.current) panLayerRef.current.style.transition = ''; }, 400);
        }
        setZoom(newZ);
        setPanOffset({ x: newPanX, y: newPanY });
        savedZoomRef.current = null;
      }
    }
  }, [focusZoom]);

  const handleLockClick = useCallback(() => {
    if (!panLocked) {
      // 잠금: 바로
      setPanLocked(true);
    } else {
      // 해제: 곱셈 문제
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
      setMathQuiz({ a, b, answer, options });
    }
  }, [panLocked]);

  const handleQuizAnswer = useCallback((val) => {
    if (val === mathQuiz?.answer) {
      setPanLocked(false);
      setMathQuiz(null);
    } else {
      // 틀림 — 새 문제
      const a = 2 + Math.floor(Math.random() * 8);
      const b = 2 + Math.floor(Math.random() * 8);
      const answer = a * b;
      const wrongs = new Set();
      while (wrongs.size < 3) {
        const w = answer + (Math.floor(Math.random() * 21) - 10);
        if (w !== answer && w > 0) wrongs.add(w);
      }
      const options = [...wrongs, answer].sort(() => Math.random() - 0.5);
      setMathQuiz({ a, b, answer, options });
    }
  }, [mathQuiz]);
  const [gridOn, setGridOn] = useState(false);
  const [kbMode, setKbMode] = useState(false); // 키보드 조합 입력 모드
  const kbInputRef = useRef(null);
  const kbPrevRef = useRef(''); // 이전 입력값 추적
  const GRID_SIZE = 100;
  const [cardEditMode, setCardEditMode] = useState(false);
  const wordCardsRef = useRef(null);
  const dragNewRef = useRef(null);
  const panStart = useRef(null);
  const pinchRef = useRef(null);
  const panLayerRef = useRef(null);
  const panRafRef = useRef(null);

  useEffect(() => { initSvgHelper(); }, []);

  // ── 스페이스 키 = 패닝 모드 ──
  useEffect(() => {
    function onKeyDown(e) { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); spaceHeldRef.current = true; } }
    function onKeyUp(e) { if (e.code === 'Space') { spaceHeldRef.current = false; } }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  // ── 키보드 입력 → 글자 배치 (키코드 매핑) ──
  const keyCharMap = useMemo(() => ({
    'KeyR': 'ㄱ', 'KeyS': 'ㄴ', 'KeyE': 'ㄷ', 'KeyF': 'ㄹ', 'KeyA': 'ㅁ',
    'KeyQ': 'ㅂ', 'KeyT': 'ㅅ', 'KeyD': 'ㅇ', 'KeyW': 'ㅈ', 'KeyC': 'ㅊ',
    'KeyZ': 'ㅋ', 'KeyX': 'ㅌ', 'KeyV': 'ㅍ', 'KeyG': 'ㅎ',
    'KeyK': 'ㅏ', 'KeyI': 'ㅑ', 'KeyJ': 'ㅓ', 'KeyU': 'ㅕ', 'KeyH': 'ㅗ',
    'KeyY': 'ㅛ', 'KeyN': 'ㅜ', 'KeyB': 'ㅠ', 'KeyM': 'ㅡ', 'KeyL': 'ㅣ',
  }), []);

  const allChars = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = c; });
    VOWELS.forEach(v => { map[v.char] = v; });
    return map;
  }, []);

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

  // ── 키보드 조합 모드 — 숨겨진 input으로 한글 조합 입력 ──
  useEffect(() => {
    if (kbMode && kbInputRef.current) {
      kbInputRef.current.focus();
      kbInputRef.current.value = '';
      kbPrevRef.current = '';
      kbPlacedLenRef.current = 0;
      kbComposingRef.current = false;
      syllableCursorRef.current = null;
      typingGroupRef.current = groupIdCounter.current++;
    }
  }, [kbMode]);

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

  const syllableCursorRef = useRef(null);
  const typingGroupRef = useRef(null); // 현재 타이핑 세션의 groupId
  const VERT_VOWELS = new Set(['ㅏ','ㅑ','ㅓ','ㅕ','ㅣ']);
  const C = 250; // 캔버스 중심 (글자 원점)

  // 두 자모 중심 간 거리 계산: A의 가장자리와 B의 가장자리가 pad만큼 떨어지도록
  // 가로: A 오른쪽~B 왼쪽 = (A.maxX - C)*s + pad + (C - B.minX)*s
  // 세로: A 아래~B 위 = (A.maxY - C)*s + pad + (C - B.minY)*s
  const distX = (bbA, bbB, s, pad) => (bbA.maxX - C) * s + pad + (C - bbB.minX) * s;
  const distY = (bbA, bbB, s, pad) => (bbA.maxY - C) * s + pad + (C - bbB.minY) * s;

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

    const SYLLABLE_GAP = 80; // 음절 간 추가 여백 (과하게)
    const ox = syllableCursorRef.current.x;
    const topY = syllableCursorRef.current.y; // 윗선 기준 (상단 정렬)
    // 자모 중심 Y = 윗선 + (캔버스중심 - bb상단) * scale → 상단 정렬
    const topAlignY = (bb) => topY + (C - bb.minY) * S;

    if (validParts.length === 1) {
      const bb = bboxCache[validParts[0]];
      placeNewPieceRef.current(validParts[0], ox, topAlignY(bb), false, syllableGroupId);
      syllableCursorRef.current.x += (bb.maxX - C) * S + SYLLABLE_GAP;
      return;
    }

    const cho = validParts[0], jung = validParts[1], jong = validParts[2];
    const bc = bboxCache[cho], bj = bboxCache[jung], bk = jong ? bboxCache[jong] : null;
    const isVert = VERT_VOWELS.has(jung);
    const hasJong = !!jong;

    // 음절 내 자모 최우측/최하단 추적
    let rightmost = ox;

    if (isVert) {
      // 초성(좌) + 중성(우)
      const dx = distX(bc, bj, S, PAD);
      const choX = ox;
      const jungX = ox + dx;

      if (hasJong) {
        const choY = topAlignY(bc);
        const jungY = topAlignY(bj);
        const dyJong = distY(bc, bk, S, PAD);
        const jongX = ox + dx * 0.5;
        const jongY = choY + dyJong;

        placeNewPieceRef.current(cho, choX, choY, false, syllableGroupId);
        placeNewPieceRef.current(jung, jungX, jungY, false, syllableGroupId);
        placeNewPieceRef.current(jong, jongX, jongY, false, syllableGroupId);
      } else {
        placeNewPieceRef.current(cho, choX, topAlignY(bc), false, syllableGroupId);
        placeNewPieceRef.current(jung, jungX, topAlignY(bj), false, syllableGroupId);
      }
      rightmost = jungX + (bj.maxX - C) * S;
    } else {
      // 초성(위) + 중성(아래)
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
      const maxW = Math.max(bc.maxX - C, bj.maxX - C, bk ? bk.maxX - C : 0);
      rightmost = ox + maxW * S;
    }

    // 다음 음절 커서: 이 음절의 오른쪽 끝 + 음절 간 여백
    syllableCursorRef.current.x = rightmost + SYLLABLE_GAP;
  }, [allChars, bboxCache]);

  const kbTimerRef = useRef(null);
  const kbComposingRef = useRef(false);
  const kbPlacedLenRef = useRef(0); // 이미 배치한 글자 수

  // 대기 타이머 — 500ms 입력 없으면 조합 중인 글자도 강제 배치
  const resetKbTimer = useCallback(() => {
    if (kbTimerRef.current) clearTimeout(kbTimerRef.current);
    kbTimerRef.current = setTimeout(() => {
      const val = kbInputRef.current?.value || '';
      if (val.length > kbPlacedLenRef.current) {
        // 아직 배치 안 한 글자들 모두 배치
        for (let i = kbPlacedLenRef.current; i < val.length; i++) {
          placeSyllable(val[i]);
        }
        kbPlacedLenRef.current = val.length;
        if (kbInputRef.current) kbInputRef.current.value = '';
        kbPlacedLenRef.current = 0;
        kbPrevRef.current = '';
      }
    }, 500);
  }, [placeSyllable]);

  const handleKbInput = useCallback((e) => {
    // compositionEnd 직후 input 이벤트는 무시 (이미 배치됨)
    if (!kbComposingRef.current && kbInputRef.current?.value === '') return;
    resetKbTimer();
  }, [resetKbTimer]);

  const handleCompositionStart = useCallback(() => {
    kbComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e) => {
    kbComposingRef.current = false;
    if (kbTimerRef.current) clearTimeout(kbTimerRef.current);
    const val = kbInputRef.current?.value || '';
    if (val.length > 0) {
      // 완성된 글자 배치
      placeSyllable(val[val.length - 1]);
    }
    // 즉시 비우기
    if (kbInputRef.current) kbInputRef.current.value = '';
    kbPlacedLenRef.current = 0;
    kbPrevRef.current = '';
  }, [placeSyllable]);

  // ── 휠 줌 (마우스 위치 기준) ──
  useEffect(() => {
    function onWheel(e) {
      if (e.target.closest('.remote') || e.target.closest('.word-tray') || e.target.closest('.left-controls')) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const oldZ = zoomRef.current;
      const newZ = Math.min(3, Math.max(0.3, oldZ * factor));
      const po = panOffsetRef.current;
      const cx = e.clientX, cy = e.clientY;
      const newPanX = cx - (cx - po.x) * (newZ / oldZ);
      const newPanY = cy - (cy - po.y) * (newZ / oldZ);
      setZoom(newZ);
      setPanOffset({ x: newPanX, y: newPanY });
      if (panLayerRef.current) {
        panLayerRef.current.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newZ})`;
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // ── 핀치 줌 (ref 기반 — zoom deps 제거) ──
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        // 핀치 시작 — 패닝 중단
        panStart.current = null;
        if (panRafRef.current) { cancelAnimationFrame(panRafRef.current); panRafRef.current = null; }
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchRef.current = { startDist: d, startZoom: zoomRef.current, startPan: { ...panOffsetRef.current }, cx, cy };
      }
    }
    function onTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const scale = d / pinchRef.current.startDist;
        const newZoom = Math.min(3, Math.max(0.3, pinchRef.current.startZoom * scale));
        // 현재 두 손가락 중앙
        const curCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const curCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // 줌 보정 + 2손가락 이동(패닝)
        const { cx, cy, startPan, startZoom } = pinchRef.current;
        const zoomPanX = cx - (cx - startPan.x) * (newZoom / startZoom);
        const zoomPanY = cy - (cy - startPan.y) * (newZoom / startZoom);
        const newPanX = zoomPanX + (curCX - cx);
        const newPanY = zoomPanY + (curCY - cy);
        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
        if (panLayerRef.current) {
          panLayerRef.current.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newZoom})`;
        }
      }
    }
    function onTouchEnd(e) {
      if (e.touches.length < 2) pinchRef.current = null;
    }
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSource = useCallback((pieceId, char, newStrokes) => {
    pieceOverrides[pieceId] = { char, strokes: newStrokes };
  }, []);

  const jamoImages = useMemo(() => {
    const map = {};
    CONSONANTS.forEach(c => { map[c.char] = renderJamoImage(c); });
    VOWELS.forEach(v => { map[v.char] = renderJamoImage(v); });
    return map;
  }, []);

  const getNextPlacePos = useCallback(() => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    if (pieces.length === 0) return { x: (screenCX - panOffset.x) / zoom, y: (screenCY - panOffset.y) / zoom };
    const last = pieces[pieces.length - 1];
    const gap = 500 * last.scale * 0.8;
    return { x: last.x + gap, y: last.y };
  }, [pieces, panOffset]);

  const placeNewPiece = useCallback((char, x, y, focus = true, groupId = null) => {
    const newId = nextId++;
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    setPieces(prev => [...prev, { id: newId, char, x, y, scale, done: false, groupId }]);
    setSelectedId(newId);
    if (focus) {
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;
      setPanOffset({ x: screenCX - x * zoom, y: screenCY - y * zoom });
    }
  }, [pieces, zoom]);

  const placeAll = useCallback((items) => {
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    const gap = 500 * scale * 0.8;
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const centerX = (screenCX - panOffset.x) / zoom;
    const centerY = (screenCY - panOffset.y) / zoom;
    const totalW = (items.length - 1) * gap;
    const startX = centerX - totalW / 2;
    const newPieces = items.map((item, i) => ({
      id: nextId++, char: item.char,
      x: startX + i * gap, y: centerY,
      scale, done: false
    }));
    const firstPiece = newPieces[0];
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(firstPiece.id);
    setPanOffset({ x: screenCX - firstPiece.x * zoom, y: screenCY - firstPiece.y * zoom });
  }, [pieces, zoom, panOffset]);

  // ── 낱말카드에서 자모 배치 ──
  const deployWord = useCallback((jamos, word, updatePreview, dropX, dropY) => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const cx = ((dropX || screenCX) - panOffset.x) / zoom;
    const cy = ((dropY || screenCY) - panOffset.y) / zoom;
    const saved = loadWordLayout(word);
    let newPieces;
    if (saved && saved.length > 0 && saved[0].char) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = saved.map(s => ({ id: nextId++, char: s.char, word, x: s.x + offX, y: s.y + offY, scale: s.scale, done: false }));
    } else if (saved && saved.length === jamos.length) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      const offX = cx - avgX, offY = cy - avgY;
      newPieces = jamos.map((char, i) => ({ id: nextId++, char, word, x: saved[i].x + offX, y: saved[i].y + offY, scale: saved[i].scale, done: false }));
    } else {
      const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (jamos.length - 1) * gap;
      newPieces = jamos.map((char, i) => ({ id: nextId++, char, word, x: cx - totalW / 2 + i * gap, y: cy, scale, done: false }));
    }
    setPieces(prev => [...prev, ...newPieces]);
    setSelectedId(newPieces[0].id);
  }, [pieces, panOffset]);

  // ── 패널에서 클릭 or 드래그 ──
  const dragMovedRef = useRef(false);
  const lastTouchTimeRef = useRef(0);
  const startDragNew = useCallback((char, type, e) => {
    e.preventDefault(); e.stopPropagation();
    const isTouch = !!e.touches;
    // 터치 직후 synthesized mousedown 무시 (300ms 이내)
    if (!isTouch && Date.now() - lastTouchTimeRef.current < 300) return;
    if (isTouch) lastTouchTimeRef.current = Date.now();
    let x, y;
    if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
    dragNewRef.current = { char, type, x, y, startX: x, startY: y, wasTouch: isTouch };
    dragMovedRef.current = false;
    setDragNew({ char, type, x, y });
  }, []);

  // 최신 값 참조용 refs
  const panOffsetRef = useRef(panOffset);
  const zoomValRef = useRef(zoom);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { zoomValRef.current = zoom; }, [zoom]);
  const getNextPlacePosRef = useRef(null);
  const placeNewPieceRef = useRef(null);
  useEffect(() => { getNextPlacePosRef.current = getNextPlacePos; }, [getNextPlacePos]);
  useEffect(() => { placeNewPieceRef.current = placeNewPiece; }, [placeNewPiece]);

  // 드래그 이벤트 — 한 번만 등록
  useEffect(() => {
    function onMove(e) {
      if (!dragNewRef.current) return;
      e.preventDefault();
      let x, y;
      if (e.touches) { x = e.touches[0].clientX; y = e.touches[0].clientY; } else { x = e.clientX; y = e.clientY; }
      const d = dragNewRef.current;
      if (d && (Math.abs(x - d.startX) > 10 || Math.abs(y - d.startY) > 10)) dragMovedRef.current = true;
      dragNewRef.current = { ...d, x, y };
      setDragNew({ ...dragNewRef.current });
    }
    function onEnd(e) {
      const d = dragNewRef.current; if (!d) return;
      dragNewRef.current = null; setDragNew(null);
      if (e.type === 'mouseup' && d.wasTouch) return;
      let ex, ey;
      if (e.changedTouches) { ex = e.changedTouches[0].clientX; ey = e.changedTouches[0].clientY; } else { ex = e.clientX; ey = e.clientY; }
      const po = panOffsetRef.current, z = zoomValRef.current;
      if (!dragMovedRef.current) {
        // 클릭만 → 다음 위치에 자동 배치
        const pos = getNextPlacePosRef.current(); placeNewPieceRef.current(d.char, pos.x, pos.y);
      } else {
        // 드래그 → 리모컨 위에 놓으면 취소
        const remoteEl = document.querySelector('.remote');
        if (remoteEl) {
          const r = remoteEl.getBoundingClientRect();
          if (ex >= r.left && ex <= r.right && ey >= r.top && ey <= r.bottom) return;
        }
        placeNewPieceRef.current(d.char, (ex - po.x) / z, (ey - po.y) / z, false);
      }
    }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchend', onEnd); window.removeEventListener('mouseup', onEnd); };
  }, []); // 한 번만 등록

  // ── 캔버스 패닝: 2손가락 터치 or 스페이스+마우스 ──
  const startPan = useCallback((e) => {
    if (e.target.closest('.remote') || e.target.closest('.trash-zone') || e.target.closest('.word-tray') || e.target.closest('.word-card') || e.target.closest('.left-controls')) return;
    if (dragNewRef.current || panLocked) return;
    // 마우스: 스페이스 눌린 상태에서만 패닝
    if (!e.touches && !spaceHeldRef.current) return;
    // 터치: 2손가락에서만 패닝 (1손가락은 무시)
    if (e.touches && e.touches.length < 2) return;
    e.preventDefault();
    let x, y;
    if (e.touches && e.touches.length >= 2) {
      x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches) {
      x = e.touches[0].clientX; y = e.touches[0].clientY;
    } else {
      x = e.clientX; y = e.clientY;
    }
    panStart.current = { startX: x, startY: y, origX: panOffset.x, origY: panOffset.y };
    setSelectedId(null);
  }, [panOffset, panLocked]);

  useEffect(() => {
    function onMove(e) {
      if (!panStart.current || pinchRef.current) return;
      // 마우스: 스페이스 떼면 패닝 중단
      if (!e.touches && !spaceHeldRef.current) { panStart.current = null; return; }
      e.preventDefault();
      let x, y;
      if (e.touches && e.touches.length >= 2) {
        x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      } else if (e.touches) {
        x = e.touches[0].clientX; y = e.touches[0].clientY;
      } else {
        x = e.clientX; y = e.clientY;
      }
      const ps = panStart.current;
      const nx = ps.origX + (x - ps.startX);
      const ny = ps.origY + (y - ps.startY);
      ps.lastX = nx; ps.lastY = ny;
      // rAF로 DOM 직접 조작 — React 리렌더 없이 transform 갱신
      if (!panRafRef.current) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = null;
          if (panLayerRef.current && panStart.current) {
            panLayerRef.current.style.transform = `translate(${panStart.current.lastX}px, ${panStart.current.lastY}px) scale(${zoomRef.current})`;
          }
        });
      }
    }
    function onEnd() {
      if (!panStart.current) return;
      if (panRafRef.current) { cancelAnimationFrame(panRafRef.current); panRafRef.current = null; }
      // 패닝 종료 시 state 동기화
      const final = panStart.current.lastX !== undefined
        ? { x: panStart.current.lastX, y: panStart.current.lastY }
        : { x: panStart.current.origX, y: panStart.current.origY };
      panStart.current = null;
      setPanOffset(final);
    }
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('mousemove', onMove); window.removeEventListener('touchend', onEnd); window.removeEventListener('mouseup', onEnd); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const undoRef = useRef(null);

  const resetAll = useCallback(() => {
    // 되돌리기용 백업
    setPieces(prev => {
      undoRef.current = { pieces: prev, panOffset, selectedId, overrides: { ...pieceOverrides } };
      return [];
    });
    nextId = Date.now(); setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
  }, [panOffset, selectedId]);

  const undoReset = useCallback(() => {
    if (!undoRef.current) return;
    const snap = undoRef.current;
    undoRef.current = null;
    setPieces(snap.pieces);
    setPanOffset(snap.panOffset);
    setSelectedId(snap.selectedId);
    Object.assign(pieceOverrides, snap.overrides);
    nextId = Math.max(...snap.pieces.map(p => p.id), 0) + 1;
  }, []);

  const editingCardRef = useRef(null);

  const startCardEdit = useCallback(() => {
    editingCardRef.current = null;
    resetAll(); setCardEditMode(true);
  }, [resetAll]);

  const startEditExistingCard = useCallback((word, cardIdx) => {
    editingCardRef.current = { word, cardIdx };
    // 현재 pieces 백업 후 클리어
    setPieces([]);
        setSelectedId(null);
    setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
    // 저장된 레이아웃 로드
    const saved = loadWordLayout(word);
    const chars = word.split('');
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    let newPieces;
    if (saved && saved.length > 0 && saved[0].char) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      newPieces = saved.map(s => ({ id: nextId++, char: s.char, x: s.x - avgX + screenCX, y: s.y - avgY + screenCY, scale: s.scale, done: false }));
    } else if (saved && saved.length === chars.length) {
      const avgX = saved.reduce((s, p) => s + p.x, 0) / saved.length;
      const avgY = saved.reduce((s, p) => s + p.y, 0) / saved.length;
      newPieces = chars.map((char, i) => ({ id: nextId++, char, x: saved[i].x - avgX + screenCX, y: saved[i].y - avgY + screenCY, scale: saved[i].scale, done: false }));
    } else {
      const scale = 0.5;
      const gap = 500 * scale * 0.8;
      const totalW = (chars.length - 1) * gap;
      newPieces = chars.map((char, i) => ({ id: nextId++, char, x: screenCX - totalW / 2 + i * gap, y: screenCY, scale, done: false }));
    }
    setPieces(newPieces);
    if (newPieces.length > 0) setSelectedId(newPieces[0].id);
    setCardEditMode(true);
  }, []);

  const finishCardEdit = useCallback(() => {
    if (pieces.length === 0) {
      // 편집 중 기존 카드 삭제 (글자 다 지운 경우)
      if (editingCardRef.current && wordCardsRef.current) {
        wordCardsRef.current.removeCardByName(editingCardRef.current.word);
      }
      editingCardRef.current = null;
      setCardEditMode(false);
      return;
    }
    const cardName = pieces.map(p => p.char).join('');
    const previewPieces = pieces.map(p => ({ ...p, done: false, source: getSource(p.char, p.id) }));
    const img = renderLayoutPreview(previewPieces);
    saveWordLayout(cardName, pieces.map(p => ({ char: p.char, x: p.x, y: p.y, scale: p.scale })));
    if (editingCardRef.current && wordCardsRef.current) {
      // 기존 카드 갱신
      wordCardsRef.current.updateCard(editingCardRef.current.word, cardName, img);
    } else if (wordCardsRef.current) {
      // 새 카드 추가
      wordCardsRef.current.addCardDirect(cardName, img);
    }
    editingCardRef.current = null;
    setPieces([]); nextId = Date.now(); setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
    setCardEditMode(false);
  }, [pieces]);

  const [trashHover, setTrashHover] = useState(false);
  const isOverTrash = useCallback((cx, cy) => {
    const el = document.getElementById('trash-zone'); if (!el) return false;
    const r = el.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }, []);

  const [panSmooth, setPanSmooth] = useState(false);

  const findNextPiece = useCallback((donePiece, candidates) => {
    if (candidates.length === 0) return null;
    const T = 100, cx = donePiece.x, cy = donePiece.y;
    const right = candidates.filter(p => Math.abs(p.y - cy) < T && p.x > cx).sort((a, b) => a.x - b.x);
    if (right.length > 0) return right[0];
    const below = candidates.filter(p => p.y > cy + T).sort((a, b) => Math.abs(a.y - b.y) < T ? a.x - b.x : a.y - b.y);
    if (below.length > 0) return below[0];
    return candidates.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
  }, []);

  const markDone = useCallback((id) => {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, done: true } : p));
  }, []);

  const selectPiece = useCallback((id) => setSelectedId(id), []);

  return (
    <div className="free-fullscreen" onMouseDown={startPan} onTouchStart={startPan}>
      <div ref={panLayerRef} className={`free-pan-layer ${panSmooth ? 'free-pan-layer--smooth' : ''}`} style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {gridOn && <div className="grid-overlay" style={{ backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` }} />}
        {/* 그룹 테두리 — 가이드 외곽 따라 부드럽게 */}
        {(() => {
          const groups = {};
          pieces.forEach(p => { if (p.groupId) { if (!groups[p.groupId]) groups[p.groupId] = []; groups[p.groupId].push(p); } });
          return Object.entries(groups).map(([gid, gpieces]) => {
            // 각 자모의 실제 바운딩 박스로 원 생성
            const circles = [];
            gpieces.forEach(p => {
              const bb = bboxCache[p.char];
              if (!bb) return;
              const s = p.scale;
              const cx = p.x, cy = p.y;
              const rx = (bb.w / 2) * s + 8;
              const ry = (bb.h / 2) * s + 8;
              circles.push({ cx, cy, rx, ry });
            });
            if (circles.length === 0) return null;
            // 전체 바운딩
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            circles.forEach(c => { minX = Math.min(minX, c.cx - c.rx); maxX = Math.max(maxX, c.cx + c.rx); minY = Math.min(minY, c.cy - c.ry); maxY = Math.max(maxY, c.cy + c.ry); });
            const pad = 15;
            const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
            const ox = minX - pad, oy = minY - pad;
            // 메타볼 방식: 각 원을 SVG ellipse로 그려서 filter blur+threshold로 합침
            return (
              <svg key={`g${gid}`} className="group-blob" style={{ left: ox, top: oy, width: w, height: h }}>
                <defs>
                  <filter id={`blob${gid}`}>
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" />
                  </filter>
                </defs>
                <g filter={`url(#blob${gid})`}>
                  {circles.map((c, i) => (
                    <ellipse key={i} cx={c.cx - ox} cy={c.cy - oy} rx={c.rx} ry={c.ry} fill="rgba(255,255,255,0.12)" />
                  ))}
                </g>
              </svg>
            );
          });
        })()}
        {pieces.map(piece => (
          <TracePiece
            key={piece.id} piece={piece} selected={piece.id === selectedId}
            inputLocked={panSmooth || panLocked}
            onDone={() => markDone(piece.id)}
            onResetDone={() => setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, done: false } : p))}
            onDelete={() => { delete pieceOverrides[piece.id]; setPieces(prev => prev.filter(p => p.id !== piece.id)); }}
            isOverTrash={isOverTrash} setTrashHover={setTrashHover}
            onSelect={() => selectPiece(piece.id)}
            onUngroup={piece.groupId ? () => setPieces(prev => prev.map(p => p.groupId === piece.groupId ? { ...p, groupId: null } : p)) : null}
            onNearGoal={(near) => onNearGoal(near, piece)}
            onSourceUpdate={(ns) => updateSource(piece.id, piece.char, ns)}
            onMoved={(nx, ny) => {
              const sx = gridOn ? Math.round(nx / GRID_SIZE) * GRID_SIZE : nx;
              const sy = gridOn ? Math.round(ny / GRID_SIZE) * GRID_SIZE : ny;
              setPieces(prev => {
                const target = prev.find(p => p.id === piece.id);
                if (!target) return prev;
                const dx = sx - target.x, dy = sy - target.y;
                if (target.groupId) {
                  return prev.map(p => p.groupId === target.groupId ? { ...p, x: p.x + dx, y: p.y + dy } : p);
                }
                return prev.map(p => p.id === piece.id ? { ...p, x: sx, y: sy } : p);
              });
            }}
          />
        ))}
      </div>

      <DraggableRemote startY={window.innerHeight - 130}>
        <div className="remote-row">
          <div className="remote-btn remote-btn--all" onClick={() => placeAll(CONSONANTS)}>ALL</div>
          {CONSONANTS.map(c => (
            <div key={c.char} className="remote-btn" onTouchStart={(e) => startDragNew(c.char, 'jamo', e)} onMouseDown={(e) => startDragNew(c.char, 'jamo', e)}>{c.char}</div>
          ))}
        </div>
        <div className="remote-row">
          <div className="remote-btn remote-btn--all" onClick={() => placeAll(VOWELS)}>ALL</div>
          {VOWELS.map(v => (
            <div key={v.char} className="remote-btn" onTouchStart={(e) => startDragNew(v.char, 'jamo', e)} onMouseDown={(e) => startDragNew(v.char, 'jamo', e)}>{v.char}</div>
          ))}
        </div>
      </DraggableRemote>

      {cardEditMode && pieces.length === 0 && <div className="free-center-hint">카드 만들기 · 글자를 배치하고 완료를 누르세요</div>}

      <div style={{ display: cardEditMode ? 'none' : undefined }}>
        <WordCards ref={wordCardsRef} onDeploy={deployWord} isOverTrash={isOverTrash} setTrashHover={setTrashHover} onNewCard={startCardEdit} onEditCard={startEditExistingCard} onPlaceAll={placeAll} />
      </div>

      {cardEditMode && <button className="card-edit-done-btn" onClick={finishCardEdit}>완료</button>}

      {/* 상단 중앙 컨트롤 바 */}
      <div className="left-controls">
        <TrashZone trashHover={trashHover} onClearAll={resetAll} onUndo={undoReset} />
        <div className={`zoom-btn ${panLocked ? 'zoom-btn--active' : ''}`} onClick={handleLockClick}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {panLocked
              ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
              : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></>
            }
          </svg>
        </div>
        <div className="ctrl-divider" />
        <div className={`zoom-btn ${gridOn ? 'zoom-btn--active' : ''}`} onClick={() => setGridOn(g => !g)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="4" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/>
            <line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="20" x2="20" y2="20"/>
          </svg>
        </div>
        <div className={`zoom-btn ${focusZoom ? 'zoom-btn--active' : ''}`} onClick={() => setFocusZoom(f => !f)} title="도착지 자동 확대">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
        {[1, 1.5, 2].map(z => (
          <div key={z} className={`zoom-btn ${Math.abs(zoom - z) < 0.05 ? 'zoom-btn--active' : ''}`}
            onClick={() => {
              const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
              const newPanX = cx - (cx - panOffset.x) * (z / zoom);
              const newPanY = cy - (cy - panOffset.y) * (z / zoom);
              setZoom(z); setPanOffset({ x: newPanX, y: newPanY });
            }}>
            x{z === 1.5 ? '1.5' : z}
          </div>
        ))}
        <div className="ctrl-divider" />
        <div className={`zoom-btn ${kbMode ? 'zoom-btn--active' : ''}`}
          onClick={() => setKbMode(k => !k)} title="키보드 입력 모드">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/>
            <line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/>
            <line x1="8" y1="16" x2="16" y2="16"/>
          </svg>
        </div>
      </div>

      {/* 키보드 조합 입력 모드 — 숨겨진 input */}
      {kbMode && (
        <input
          ref={kbInputRef}
          className="kb-hidden-input"
          autoFocus
          onInput={handleKbInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={() => { if (kbMode && kbInputRef.current) setTimeout(() => kbInputRef.current?.focus(), 100); }}
        />
      )}

      {dragNew && jamoImages[dragNew.char] && (
        <img className="drag-ghost-img" src={jamoImages[dragNew.char]} style={{ left: dragNew.x, top: dragNew.y }} draggable={false} />
      )}

      {mathQuiz && (
        <div className="quiz-overlay" onClick={() => setMathQuiz(null)}>
          <div className="quiz-card" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-question">{mathQuiz.a} × {mathQuiz.b} = ?</div>
            <div className="quiz-options">
              {mathQuiz.options.map((opt, i) => (
                <div key={i} className="quiz-option" onClick={() => handleQuizAnswer(opt)}>{opt}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 드래그 이동 가능한 리모컨 래퍼 ──
function DraggableRemote({ children, startY = 10 }) {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: startY });
  const dragRef = useRef(null);
  const onDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    let cx, cy;
    if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } else { cx = e.clientX; cy = e.clientY; }
    dragRef.current = { startX: cx, startY: cy, origX: pos.x, origY: pos.y };
  };
  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current) return;
      let cx, cy;
      if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; } else { cx = e.clientX; cy = e.clientY; }
      const d = dragRef.current;
      setPos({ x: d.origX + (cx - d.startX), y: d.origY + (cy - d.startY) });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('mousemove', onMove); window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp); window.addEventListener('touchend', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('touchend', onUp); };
  }, []);
  return (
    <div className="remote" style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}>
      <div className="remote-handle" onMouseDown={onDown} onTouchStart={onDown}>⠿</div>
      <div className="remote-inner">{children}</div>
      <div className="remote-handle" onMouseDown={onDown} onTouchStart={onDown}>⠿</div>
    </div>
  );
}

// ── 휴지통 ──
function TrashZone({ trashHover, onClearAll, onUndo }) {
  const [undoMode, setUndoMode] = useState(false);
  const timerRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (undoMode) {
      // 되돌리기
      setUndoMode(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (onUndo) onUndo();
    } else {
      // 삭제 → 되돌리기 모드 전환
      onClearAll();
      setUndoMode(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setUndoMode(false), 4000);
    }
  };

  return (
    <div id="trash-zone"
      className={`trash-zone ${trashHover ? 'trash-zone--hover' : ''} ${undoMode ? 'trash-zone--undo' : ''}`}
      onClick={handleClick}>
      {undoMode ? (
        <>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span className="trash-undo-label">되돌리기</span>
        </>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      )}
    </div>
  );
}
