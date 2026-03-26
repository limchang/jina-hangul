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

const SIZE = 500;

export default function VertexEditor({ source, onUpdate }) {
  const canvasRef = useRef(null);
  const vertsRef = useRef([]);
  const edgesRef = useRef([]);
  const dragRef = useRef(null);
  // dragRef: { type: 'vertex', idx, offsetX, offsetY }
  //       or { type: 'edge', i0, i1, off0x, off0y, off1x, off1y }

  // source 바뀌면 verts 재파싱
  useEffect(() => {
    if (!source) return;
    vertsRef.current = extractVerts(source);
    edgesRef.current = buildEdges(vertsRef.current);
    draw();
  }, [source]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    const d = dragRef.current;
    if (!d) return;

    if (d.type === 'vertex') {
      const v = vertsRef.current[d.idx];
      if (v) drawGlow(ctx, v.x, v.y);
    } else if (d.type === 'edge') {
      const v0 = vertsRef.current[d.i0], v1 = vertsRef.current[d.i1];
      if (v0 && v1) {
        drawGlow(ctx, v0.x, v0.y);
        drawGlow(ctx, v1.x, v1.y);
        // 선분 글로우
        ctx.beginPath();
        ctx.moveTo(v0.x, v0.y);
        ctx.lineTo(v1.x, v1.y);
        ctx.strokeStyle = 'rgba(255,100,150,0.3)';
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
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

      // 선분이 꼭지점보다 가까우면 (또는 비슷하면) 선분 드래그
      if (bestEdge && bestEdgeDist < bestVertDist * 0.9) {
        const a = verts[bestEdge.i0], b = verts[bestEdge.i1];
        dragRef.current = {
          type: 'edge', i0: bestEdge.i0, i1: bestEdge.i1,
          off0x: a.x - pos.x, off0y: a.y - pos.y,
          off1x: b.x - pos.x, off1y: b.y - pos.y,
        };
      } else if (bestVertIdx >= 0) {
        const v = verts[bestVertIdx];
        dragRef.current = { type: 'vertex', idx: bestVertIdx, offsetX: v.x - pos.x, offsetY: v.y - pos.y };
      }
      draw();
    }

    function onMove(e) {
      if (!dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const d = dragRef.current;

      if (d.type === 'vertex') {
        const newX = pos.x + d.offsetX;
        const newY = pos.y + d.offsetY;
        vertsRef.current = vertsRef.current.map((v, i) =>
          i === d.idx ? { ...v, x: newX, y: newY } : v
        );
      } else if (d.type === 'edge') {
        const new0x = pos.x + d.off0x, new0y = pos.y + d.off0y;
        const new1x = pos.x + d.off1x, new1y = pos.y + d.off1y;
        vertsRef.current = vertsRef.current.map((v, i) => {
          if (i === d.i0) return { ...v, x: new0x, y: new0y };
          if (i === d.i1) return { ...v, x: new1x, y: new1y };
          return v;
        });
      }

      if (onUpdate && source) {
        onUpdate(vertsToStrokes(source, vertsRef.current));
      }
      draw();
    }

    function onUp() {
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
