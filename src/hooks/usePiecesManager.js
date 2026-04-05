// usePiecesManager.js — 글자 조각 CRUD 관리
import { useState, useCallback, useRef, useEffect } from 'react';
import { pieceOverrides } from '../sourceOverrides.js';

export default function usePiecesManager({ zoom, panOffset, setPanOffset, panOffsetRef, zoomRef, gridOn }) {
  const [pieces, setPieces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // 그룹 선택
  const groupIdCounter = useRef(1);
  const nextIdRef = useRef(1);
  const undoRef = useRef(null);

  // ALL 순환 모드: { items: [...], idx: number } | null
  const autoQueueRef = useRef(null);
  const [autoQueueType, setAutoQueueType] = useState(null); // 'consonant' | 'vowel' | null (버튼 활성 표시용)

  const GRID_SIZE = 100;

  const getNextPlacePos = useCallback(() => {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    if (pieces.length === 0) return { x: (screenCX - panOffset.x) / zoom, y: (screenCY - panOffset.y) / zoom };
    const last = pieces[pieces.length - 1];
    const gap = 500 * last.scale * 0.8;
    return { x: last.x + gap, y: last.y };
  }, [pieces, panOffset, zoom]);

  const placeNewPiece = useCallback((char, x, y, focus = true, groupId = null) => {
    const newId = nextIdRef.current++;
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    setPieces(prev => [...prev, { id: newId, char, x, y, scale, done: false, groupId }]);
    setSelectedId(newId);
    if (focus) {
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;
      setPanOffset({ x: screenCX - x * zoom, y: screenCY - y * zoom });
    }
  }, [pieces, zoom, setPanOffset]);

  // placeNewPiece에서 focus 시 panOffset 업데이트 필요 — 외부에서 처리
  // 별도 ref로 최신 함수 노출
  const getNextPlacePosRef = useRef(null);
  const placeNewPieceRef = useRef(null);
  useEffect(() => { getNextPlacePosRef.current = getNextPlacePos; }, [getNextPlacePos]);
  useEffect(() => { placeNewPieceRef.current = placeNewPiece; }, [placeNewPiece]);

  // ALL 순환: 토글 방식 — 이미 켜져 있으면 끄고, 아니면 첫 글자 배치 후 큐 등록
  const placeAll = useCallback((items, type) => {
    // 같은 타입으로 이미 순환 중이면 토글 OFF
    if (autoQueueRef.current && autoQueueRef.current.items === items) {
      autoQueueRef.current = null;
      setAutoQueueType(null);
      return;
    }
    autoQueueRef.current = { items, idx: 0 };
    setAutoQueueType(type);
    // 첫 글자 배치 — 기존 글자가 있으면 마지막 글자 옆에, 없으면 화면 중앙
    const scale = pieces.length > 0 ? pieces[pieces.length - 1].scale : 0.5;
    const pos = getNextPlacePosRef.current ? getNextPlacePosRef.current() : (() => {
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;
      return { x: (screenCX - panOffsetRef.current.x) / zoomRef.current, y: (screenCY - panOffsetRef.current.y) / zoomRef.current };
    })();
    const x = pos.x;
    const y = pos.y;
    const newId = nextIdRef.current++;
    autoQueueRef.current.idx = 1;
    setPieces(prev => [...prev, { id: newId, char: items[0].char, x, y, scale, done: false }]);
    setSelectedId(newId);
  }, [pieces, panOffsetRef, zoomRef]);

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
    setPieces(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, done: true } : p);
      // ALL 순환 모드: 다음 글자 자동 배치
      const q = autoQueueRef.current;
      if (q && q.idx < q.items.length) {
        const donePiece = updated.find(p => p.id === id);
        const scale = donePiece?.scale ?? 0.5;
        const gap = 500 * scale * 0.85;
        const x = (donePiece?.x ?? 0) + gap;
        const y = donePiece?.y ?? 0;
        const newId = nextIdRef.current++;
        autoQueueRef.current = { ...q, idx: q.idx + 1 };
        setSelectedId(newId);
        // 새 글자 중심으로 pan 이동
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        setPanOffset({ x: screenCX - x * zoomRef.current, y: screenCY - y * zoomRef.current });
        return [...updated, { id: newId, char: q.items[q.idx].char, x, y, scale, done: false }];
      }
      // 마지막 글자 완성 → 순환 종료
      if (q && q.idx >= q.items.length) { autoQueueRef.current = null; setAutoQueueType(null); }
      return updated;
    });
  }, [setPanOffset, zoomRef]);

  const selectPiece = useCallback((id) => setSelectedId(id), []);

  const resetDone = useCallback((id) => {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, done: false } : p));
  }, []);

  const deletePiece = useCallback((id) => {
    delete pieceOverrides[id];
    setPieces(prev => prev.filter(p => p.id !== id));
  }, []);

  const ungroupPiece = useCallback((groupId) => {
    setPieces(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null } : p));
  }, []);

  const movePiece = useCallback((id, nx, ny) => {
    const sx = gridOn ? Math.round(nx / GRID_SIZE) * GRID_SIZE : nx;
    const sy = gridOn ? Math.round(ny / GRID_SIZE) * GRID_SIZE : ny;
    setPieces(prev => {
      const target = prev.find(p => p.id === id);
      if (!target) return prev;
      const dx = sx - target.x, dy = sy - target.y;
      if (target.groupId) {
        return prev.map(p => p.groupId === target.groupId ? { ...p, x: p.x + dx, y: p.y + dy } : p);
      }
      return prev.map(p => p.id === id ? { ...p, x: sx, y: sy } : p);
    });
  }, [gridOn]);

  const resetAll = useCallback(() => {
    // 되돌리기용 백업
    setPieces(prev => {
      undoRef.current = { pieces: prev, panOffset, selectedId, overrides: { ...pieceOverrides } };
      return [];
    });
    nextIdRef.current = Date.now(); setSelectedId(null); setPanOffset({ x: 0, y: 0 });
    Object.keys(pieceOverrides).forEach(k => delete pieceOverrides[k]);
  }, [panOffset, selectedId, setPanOffset]);

  const undoReset = useCallback(() => {
    if (!undoRef.current) return;
    const snap = undoRef.current;
    undoRef.current = null;
    setPieces(snap.pieces);
    setPanOffset(snap.panOffset);
    setSelectedId(snap.selectedId);
    Object.assign(pieceOverrides, snap.overrides);
    nextIdRef.current = Math.max(...snap.pieces.map(p => p.id), 0) + 1;
  }, [setPanOffset]);

  return {
    pieces, setPieces,
    selectedId, setSelectedId,
    selectedGroup, setSelectedGroup,
    groupIdCounter,
    nextIdRef,
    placeNewPiece, placeNewPieceRef,
    getNextPlacePos, getNextPlacePosRef,
    markDone, selectPiece, resetDone, deletePiece,
    ungroupPiece, movePiece, resetAll, undoReset,
    findNextPiece, placeAll,
    autoQueueRef, autoQueueType, setAutoQueueType,
  };
}
