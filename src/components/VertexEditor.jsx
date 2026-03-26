// VertexEditor.jsx — 꼭지점(vertex) 편집기
// 선택된 글자의 SVG path 꼭지점을 시각적으로 표시하고 드래그로 편집

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
      // Q cx cy x y — 제어점 + 끝점
      verts.push({ cmd: 'Q_CP', x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      verts.push({ cmd: 'Q_END', x: parseFloat(tokens[i+3]), y: parseFloat(tokens[i+4]) });
      i += 5;
    } else if (cmd === 'A') {
      // A rx ry rotation large-arc sweep x y
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
      const end = verts[i + 1]; // Q_END
      parts.push(`Q ${round(v.x)} ${round(v.y)} ${round(end.x)} ${round(end.y)}`);
      i += 2;
    } else if (v.cmd === 'Q_END') {
      // 이미 Q_CP에서 처리됨 — 건너뜀
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

// ── 꼭지점 타입별 색상 ──
const VERTEX_COLORS = {
  M: '#44ee88',       // 시작점 — 녹색
  L: '#ff4466',       // 직선 끝점 — 빨강
  Q_CP: '#4488ff',    // 곡선 제어점 — 파랑
  Q_END: '#ff4466',   // 곡선 끝점 — 빨강
  A: '#ff8844',       // 호 끝점 — 주황
};

const VERTEX_RADIUS = 10;
const HIT_RADIUS = 18; // 터치 히트 영역

export default function VertexEditor({ source, scale, onUpdate }) {
  const canvasRef = useRef(null);
  const [allVerts, setAllVerts] = useState([]); // [{strokeIdx, vertIdx, ...vertex}]
  const dragRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(-1); // 현재 드래그 중인 꼭지점 인덱스

  const SIZE = 500;
  const pixelSize = SIZE * scale;

  // source가 바뀔 때 vertex 배열 재파싱
  useEffect(() => {
    if (!source) return;
    const all = [];
    source.strokes.forEach((stroke, si) => {
      const verts = parsePath(stroke.path);
      verts.forEach((v, vi) => {
        if (v.cmd !== 'Z') {
          all.push({ ...v, strokeIdx: si, vertIdx: vi });
        }
      });
    });
    setAllVerts(all);
  }, [source]);

  // 캔버스에 꼭지점 그리기
  const drawVertices = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    if (!source) return;

    // 먼저 획을 연하게 그려주기 (참고용)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    source.strokes.forEach(s => ctx.stroke(new Path2D(s.path)));

    // Q 제어선 (제어점-끝점 연결선)
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < allVerts.length; i++) {
      if (allVerts[i].cmd === 'Q_CP' && i + 1 < allVerts.length) {
        const cp = allVerts[i], ep = allVerts[i + 1];
        // 이전 점과도 연결
        if (i > 0 && allVerts[i - 1].strokeIdx === cp.strokeIdx) {
          const prev = allVerts[i - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cp.x, cp.y);
        ctx.lineTo(ep.x, ep.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // 꼭지점 원 그리기
    allVerts.forEach((v, idx) => {
      const color = VERTEX_COLORS[v.cmd] || '#fff';
      const isActive = idx === activeIdx;
      const r = isActive ? VERTEX_RADIUS + 4 : VERTEX_RADIUS;

      // 외곽 글로우
      ctx.beginPath();
      ctx.arc(v.x, v.y, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
      ctx.fill();

      // 채움
      ctx.beginPath();
      ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 테두리
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // 제어점은 다이아몬드 표시 추가
      if (v.cmd === 'Q_CP') {
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    });
  }, [allVerts, activeIdx, source]);

  useEffect(() => { drawVertices(); }, [drawVertices]);

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

    function findVertex(pos) {
      let bestIdx = -1, bestDist = HIT_RADIUS;
      allVerts.forEach((v, idx) => {
        const d = Math.hypot(pos.x - v.x, pos.y - v.y);
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      return bestIdx;
    }

    function onDown(e) {
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const idx = findVertex(pos);
      if (idx >= 0) {
        dragRef.current = { idx, startX: pos.x, startY: pos.y, origX: allVerts[idx].x, origY: allVerts[idx].y };
        setActiveIdx(idx);
      }
    }

    function onMove(e) {
      if (!dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = toCanvas(e);
      const d = dragRef.current;
      const newX = d.origX + (pos.x - d.startX);
      const newY = d.origY + (pos.y - d.startY);

      setAllVerts(prev => {
        const next = [...prev];
        next[d.idx] = { ...next[d.idx], x: newX, y: newY };
        return next;
      });
    }

    function onUp(e) {
      if (!dragRef.current) return;
      dragRef.current = null;
      setActiveIdx(-1);

      // 변경된 vertex → path string으로 변환하여 부모에 알림
      flushUpdate();
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
  }, [allVerts]); // eslint-disable-line react-hooks/exhaustive-deps

  // vertex → source path 변환 후 onUpdate 호출
  function flushUpdate() {
    if (!source || !onUpdate) return;
    // 스트로크별로 vertex를 모아서 path 재생성
    const strokeMap = {};
    allVerts.forEach(v => {
      if (!strokeMap[v.strokeIdx]) strokeMap[v.strokeIdx] = [];
      strokeMap[v.strokeIdx].push(v);
    });

    const newStrokes = source.strokes.map((s, si) => {
      const verts = strokeMap[si];
      if (!verts) return s;
      // 원래 path에서 Z가 있었는지 확인
      const hasZ = s.path.trim().endsWith('Z');
      // vertex → full vertex array (Z 포함)
      const fullVerts = parsePath(s.path);
      // verts에서 Z 제외한 것들로 교체
      let vi = 0;
      const updated = fullVerts.map(fv => {
        if (fv.cmd === 'Z') return fv;
        const replacement = verts[vi++];
        if (!replacement) return fv;
        return { ...fv, x: replacement.x, y: replacement.y };
      });
      return { path: buildPath(updated) };
    });

    onUpdate(newStrokes);
  }

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="free-trace-layer vertex-editor-canvas"
      style={{ zIndex: 10, pointerEvents: 'auto', cursor: 'crosshair' }}
    />
  );
}
