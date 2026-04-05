// useCanvasNavigation.js — 캔버스 패닝/줌/핀치/스페이스키 네비게이션
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateMathQuiz } from '../utils/quiz.js';

export default function useCanvasNavigation({ dragNewRef, onPanStart }) {
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(2);
  const [focusZoom, setFocusZoom] = useState(false); // 도착지 근접 시 확대 (기본 off)
  const [panLocked, setPanLocked] = useState(true);
  const [mathQuiz, setMathQuiz] = useState(null);

  // Refs
  const focusZoomValRef = useRef(true);
  useEffect(() => { focusZoomValRef.current = focusZoom; }, [focusZoom]);
  const focusZoomActiveRef = useRef(false);
  const savedZoomRef = useRef(null);
  const spaceHeldRef = useRef(false);
  const panStart = useRef(null);
  const pinchRef = useRef(null);
  const panLayerRef = useRef(null);
  const panRafRef = useRef(null);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const panOffsetRef = useRef(panOffset);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  // ── 도착지 근접 시 확대/복귀 ──
  const onNearGoal = useCallback((near, piece) => {
    if (!focusZoomValRef.current) return;
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
  }, []);

  // ── 잠금 토글 ──
  const handleLockClick = useCallback(() => {
    if (!panLocked) {
      // 잠금: 바로
      setPanLocked(true);
    } else {
      // 해제: 곱셈 문제
      setMathQuiz(generateMathQuiz());
    }
  }, [panLocked]);

  // ── 퀴즈 정답 확인 ──
  const handleQuizAnswer = useCallback((val) => {
    if (val === mathQuiz?.answer) {
      setPanLocked(false);
      setMathQuiz(null);
    } else {
      // 틀림 — 새 문제
      setMathQuiz(generateMathQuiz());
    }
  }, [mathQuiz]);

  // ── 스페이스 키 = 패닝 모드 ──
  useEffect(() => {
    function onKeyDown(e) { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); spaceHeldRef.current = true; } }
    function onKeyUp(e) { if (e.code === 'Space') { spaceHeldRef.current = false; } }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

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
    if (onPanStart) onPanStart();
  }, [panOffset, panLocked, onPanStart]);

  // ── 패닝 이동/종료 이벤트 ──
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

  return {
    panOffset, setPanOffset,
    zoom, setZoom,
    focusZoom, setFocusZoom,
    panLocked, setPanLocked,
    mathQuiz, setMathQuiz,
    panLayerRef,
    panOffsetRef, zoomRef,
    onNearGoal,
    handleLockClick,
    handleQuizAnswer,
    startPan,
  };
}
