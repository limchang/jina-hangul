// VertexEditor.jsx — 꼭지점(vertex) 편집기
// 점 표시 없이, 드래그하면 가장 가까운 꼭지점 or 선분이 따라옴
// 선분 가운데를 잡으면 양쪽 끝점이 평행 이동

import React, { useRef, useEffect } from 'react';

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

// ── 점에서 선분까지의 거리 + 최근접점 ──
function pointToSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0.15, Math.min(0.85, t)); // 선분 끝 15% 제외 (꼭지점 근처는 단독 이동)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// 같은 stroke 내에서 인접한 vertex 쌍(선분) 목록 생성
function buildEdges(verts) {
  const edges = [];
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i], b = verts[i + 1];
    if (a.strokeIdx !== b.strokeIdx) continue;
    // Q_CP → Q_END는 곡선이지만 선분으로 근사
    edges.push({ i0: i, i1: i + 1 });
  }
  return edges;
}

// 같은 좌표(±3px)를 공유하는 꼭지점 그룹 맵 생성
// vertIdx → [vertIdx, vertIdx, ...] (자기 자신 포함)
function buildLinkedGroups(verts) {
  const SNAP = 3;
  const groups = {};
  for (let i = 0; i < verts.length; i++) {
    const linked = [i];
    for (let j = 0; j < verts.length; j++) {
      if (i === j) continue;
      if (Math.abs(verts[i].x - verts[j].x) < SNAP && Math.abs(verts[i].y - verts[j].y) < SNAP) {
        linked.push(j);
      }
    }
    groups[i] = linked;
  }
  return groups;
}

const SIZE = 500;

export default function VertexEditor({ source, onUpdate }) {
  const canvasRef = useRef(null);
  const vertsRef = useRef([]);
  const edgesRef = useRef([]);
  const linkedRef = useRef({}); // 좌표 공유 그룹
  const dragRef = useRef(null);
  // dragRef: { type: 'vertex', indices: [...], offsets: [{dx,dy},...] }
  //       or { type: 'edge', pairs: [{idx, dx, dy},...] }

  // source 바뀌면 verts 재파싱
  useEffect(() => {
    if (!source) return;
    vertsRef.current = extractVerts(source);
    edgesRef.current = buildEdges(vertsRef.current);
    linkedRef.current = buildLinkedGroups(vertsRef.current);
  }, [source]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    const d = dragRef.current;
    if (!d || !d.pairs) return;
    // 모든 움직이는 꼭지점에 글로우
    d.pairs.forEach(p => {
      const v = vertsRef.current[p.idx];
      if (v) drawGlow(ctx, v.x, v.y);
    });
  }

  function drawGlow(ctx, x, y) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 50);
    grad.addColorStop(0, 'rgba(255,100,150,0.45)');
    grad.addColorStop(0.5, 'rgba(255,100,150,0.12)');
    grad.addColorStop(1, 'rgba(255,100,150,0)');
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

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

    // 꼭지점 idx에 연결된 모든 인덱스를 모아서 pairs 생성
    function collectPairs(indices, pos) {
      const seen = new Set();
      indices.forEach(i => {
        (linkedRef.current[i] || [i]).forEach(li => seen.add(li));
      });
      return [...seen].map(idx => {
        const v = vertsRef.current[idx];
        return { idx, dx: v.x - pos.x, dy: v.y - pos.y };
      });
    }

    function onDown(e) {
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const verts = vertsRef.current;
      const edges = edgesRef.current;

      // 가장 가까운 꼭지점 찾기
      let bestVertIdx = -1, bestVertDist = Infinity;
      verts.forEach((v, idx) => {
        const d = Math.hypot(pos.x - v.x, pos.y - v.y);
        if (d < bestVertDist) { bestVertDist = d; bestVertIdx = idx; }
      });

      // 가장 가까운 선분 찾기
      let bestEdge = null, bestEdgeDist = Infinity;
      edges.forEach(edge => {
        const a = verts[edge.i0], b = verts[edge.i1];
        const d = pointToSegDist(pos.x, pos.y, a.x, a.y, b.x, b.y);
        if (d < bestEdgeDist) { bestEdgeDist = d; bestEdge = edge; }
      });

      // 선분이 꼭지점보다 가까우면 선분 드래그 (양쪽 + 연결 그룹)
      if (bestEdge && bestEdgeDist < bestVertDist * 0.9) {
        dragRef.current = { pairs: collectPairs([bestEdge.i0, bestEdge.i1], pos) };
      } else if (bestVertIdx >= 0) {
        // 꼭지점 + 연결 그룹
        dragRef.current = { pairs: collectPairs([bestVertIdx], pos) };
      }
      draw();
    }

    function onMove(e) {
      if (!dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const pairs = dragRef.current.pairs;

      vertsRef.current = vertsRef.current.map((v, i) => {
        const p = pairs.find(p => p.idx === i);
        if (p) return { ...v, x: pos.x + p.dx, y: pos.y + p.dy };
        return v;
      });

      if (onUpdate && source) {
        onUpdate(vertsToStrokes(source, vertsRef.current));
      }
      draw();
    }

    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      // 즉시 캔버스 클리어 (글로우 잔상 제거)
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, SIZE, SIZE);
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
