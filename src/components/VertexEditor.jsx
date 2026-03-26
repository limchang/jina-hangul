// VertexEditor.jsx — 꼭지점(vertex) 편집기
// 점 표시 없이, 드래그하면 가장 가까운 꼭지점이 따라오는 방식
// 글로우 효과로 편집 중임을 표시

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ── SVG path string → vertex 배열 파싱 ──
export function parsePath(pathStr) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return [];
  const verts = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (cmd === 'M' || cmd === 'L') {
      verts.push({ cmd, x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      i += 3;
    } else if (cmd === 'Q') {
      verts.push({ cmd: 'Q_CP', x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      verts.push({ cmd: 'Q_END', x: parseFloat(tokens[i+3]), y: parseFloat(tokens[i+4]) });
      i += 5;
    } else if (cmd === 'A') {
      verts.push({
        cmd: 'A',
        rx: parseFloat(tokens[i+1]), ry: parseFloat(tokens[i+2]),
        rotation: parseFloat(tokens[i+3]),
        largeArc: parseFloat(tokens[i+4]), sweep: parseFloat(tokens[i+5]),
        x: parseFloat(tokens[i+6]), y: parseFloat(tokens[i+7])
      });
      i += 8;
    } else if (cmd === 'Z') {
      verts.push({ cmd: 'Z' });
      i += 1;
    } else {
      i += 1;
    }
  }
  return verts;
}

// ── vertex 배열 → SVG path string 재생성 ──
export function buildPath(verts) {
  const parts = [];
  let i = 0;
  while (i < verts.length) {
    const v = verts[i];
    if (v.cmd === 'M' || v.cmd === 'L') {
      parts.push(`${v.cmd} ${round(v.x)} ${round(v.y)}`);
      i++;
    } else if (v.cmd === 'Q_CP') {
      const end = verts[i + 1];
      parts.push(`Q ${round(v.x)} ${round(v.y)} ${round(end.x)} ${round(end.y)}`);
      i += 2;
    } else if (v.cmd === 'Q_END') {
      i++;
    } else if (v.cmd === 'A') {
      parts.push(`A ${round(v.rx)} ${round(v.ry)} ${v.rotation} ${v.largeArc} ${v.sweep} ${round(v.x)} ${round(v.y)}`);
      i++;
    } else if (v.cmd === 'Z') {
      parts.push('Z');
      i++;
    } else {
      i++;
    }
  }
  return parts.join(' ');
}

function round(n) { return Math.round(n * 10) / 10; }

// 모든 strokes에서 꼭지점 목록을 flat하게 추출
function extractVerts(source) {
  const all = [];
  source.strokes.forEach((stroke, si) => {
    const verts = parsePath(stroke.path);
    verts.forEach((v, vi) => {
      if (v.cmd !== 'Z') {
        all.push({ ...v, strokeIdx: si, vertIdx: vi });
      }
    });
  });
  return all;
}

// verts → strokes 배열로 변환
function vertsToStrokes(source, allVerts) {
  const strokeMap = {};
  allVerts.forEach(v => {
    if (!strokeMap[v.strokeIdx]) strokeMap[v.strokeIdx] = [];
    strokeMap[v.strokeIdx].push(v);
  });
  return source.strokes.map((s, si) => {
    const verts = strokeMap[si];
    if (!verts) return s;
    const fullVerts = parsePath(s.path);
    let vi = 0;
    const updated = fullVerts.map(fv => {
      if (fv.cmd === 'Z') return fv;
      const replacement = verts[vi++];
      if (!replacement) return fv;
      return { ...fv, x: replacement.x, y: replacement.y };
    });
    return { path: buildPath(updated) };
  });
}

const SIZE = 500;

export default function VertexEditor({ source, onUpdate }) {
  const canvasRef = useRef(null);
  const vertsRef = useRef([]); // 현재 꼭지점 배열 (ref로 — 리렌더 없이 빠르게 갱신)
  const dragRef = useRef(null); // { idx, offsetX, offsetY }

  // source 바뀌면 verts 재파싱
  useEffect(() => {
    if (!source) return;
    vertsRef.current = extractVerts(source);
    draw();
  }, [source]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    // 드래그 중인 꼭지점 근처 글로우만 표시
    const d = dragRef.current;
    if (d && d.idx >= 0) {
      const v = vertsRef.current[d.idx];
      if (v) {
        const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, 60);
        grad.addColorStop(0, 'rgba(255,100,150,0.5)');
        grad.addColorStop(0.5, 'rgba(255,100,150,0.15)');
        grad.addColorStop(1, 'rgba(255,100,150,0)');
        ctx.beginPath();
        ctx.arc(v.x, v.y, 60, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
  }

  // 마우스/터치 핸들러
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      let cx, cy;
      if (e.touches?.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else if (e.changedTouches?.length > 0) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      return {
        x: (cx - rect.left) * (SIZE / rect.width),
        y: (cy - rect.top) * (SIZE / rect.height)
      };
    }

    function findNearest(pos) {
      let bestIdx = -1, bestDist = Infinity;
      vertsRef.current.forEach((v, idx) => {
        const d = Math.hypot(pos.x - v.x, pos.y - v.y);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      return bestIdx;
    }

    function onDown(e) {
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const idx = findNearest(pos);
      if (idx >= 0) {
        const v = vertsRef.current[idx];
        dragRef.current = { idx, offsetX: v.x - pos.x, offsetY: v.y - pos.y };
        draw();
      }
    }

    function onMove(e) {
      if (!dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const d = dragRef.current;
      const newX = pos.x + d.offsetX;
      const newY = pos.y + d.offsetY;

      vertsRef.current = vertsRef.current.map((v, i) =>
        i === d.idx ? { ...v, x: newX, y: newY } : v
      );

      // 즉시 부모에 알림 (가이드 다시 그리기)
      if (onUpdate && source) {
        onUpdate(vertsToStrokes(source, vertsRef.current));
      }
      draw();
    }

    function onUp(e) {
      if (!dragRef.current) return;
      dragRef.current = null;
      draw();
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="free-trace-layer vertex-editor-canvas"
      style={{ zIndex: 10, pointerEvents: 'auto', cursor: 'grab' }}
    />
  );
}
