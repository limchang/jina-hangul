/**
 * SVG Path 유틸리티 — 통합 파서
 * 지원 명령어: M, L, Q, A, Z
 * 미지원 명령어 발견 시 console.warn 출력
 */

// 이미 경고한 path 문자열을 추적 (중복 경고 방지)
const _warnedPaths = new Set();

/**
 * 미지원 SVG 명령어 확인 (C, S, T, H, V 등)
 * @param {string} pathStr
 */
function warnUnsupportedCommands(pathStr) {
  if (_warnedPaths.has(pathStr)) return;
  const unsupported = pathStr.match(/[CcSsTtHhVv]/g);
  if (unsupported) {
    _warnedPaths.add(pathStr);
    console.warn(`SVG path contains unsupported commands: ${[...new Set(unsupported)].join(', ')}`);
  }
}

function round(n) { return Math.round(n * 10) / 10; }

/**
 * path 문자열에서 모든 X 좌표 추출
 * @param {string} pathStr
 * @returns {number[]}
 */
export function getPathXCoords(pathStr) {
  warnUnsupportedCommands(pathStr);
  const xs = [];
  const ml = pathStr.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of ml) xs.push(parseFloat(m[1]));
  const qs = pathStr.matchAll(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of qs) { xs.push(parseFloat(m[1])); xs.push(parseFloat(m[3])); }
  const as = pathStr.matchAll(/A\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of as) xs.push(parseFloat(m[1]));
  return xs;
}

/**
 * path 문자열에서 모든 Y 좌표 추출
 * @param {string} pathStr
 * @returns {number[]}
 */
export function getPathYCoords(pathStr) {
  warnUnsupportedCommands(pathStr);
  const ys = [];
  const ml = pathStr.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of ml) ys.push(parseFloat(m[2]));
  const qs = pathStr.matchAll(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of qs) { ys.push(parseFloat(m[2])); ys.push(parseFloat(m[4])); }
  const as = pathStr.matchAll(/A\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of as) ys.push(parseFloat(m[2]));
  return ys;
}

/**
 * path를 X축으로 offset만큼 이동
 * @param {string} pathStr
 * @param {number} offset
 * @returns {string}
 */
export function offsetPathX(pathStr, offset) {
  warnUnsupportedCommands(pathStr);
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      result.push(t, String(parseFloat(tokens[i+1]) + offset), tokens[i+2]);
      i += 3;
    } else if (t === 'Q') {
      result.push(t, String(parseFloat(tokens[i+1]) + offset), tokens[i+2],
                     String(parseFloat(tokens[i+3]) + offset), tokens[i+4]);
      i += 5;
    } else if (t === 'A') {
      result.push(t, tokens[i+1], tokens[i+2], tokens[i+3], tokens[i+4], tokens[i+5],
                     String(parseFloat(tokens[i+6]) + offset), tokens[i+7]);
      i += 8;
    } else if (t === 'Z') {
      result.push(t);
      i += 1;
    } else {
      result.push(t);
      i += 1;
    }
  }
  return result.join(' ');
}

/**
 * path를 Y축으로 offset만큼 이동
 * @param {string} pathStr
 * @param {number} offset
 * @returns {string}
 */
export function offsetPathY(pathStr, offset) {
  warnUnsupportedCommands(pathStr);
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      result.push(t, tokens[i+1], String(parseFloat(tokens[i+2]) + offset));
      i += 3;
    } else if (t === 'Q') {
      result.push(t, tokens[i+1], String(parseFloat(tokens[i+2]) + offset),
                     tokens[i+3], String(parseFloat(tokens[i+4]) + offset));
      i += 5;
    } else if (t === 'A') {
      result.push(t, tokens[i+1], tokens[i+2], tokens[i+3], tokens[i+4], tokens[i+5],
                     tokens[i+6], String(parseFloat(tokens[i+7]) + offset));
      i += 8;
    } else if (t === 'Z') {
      result.push(t);
      i += 1;
    } else {
      result.push(t);
      i += 1;
    }
  }
  return result.join(' ');
}

/**
 * path의 X좌표를 center 기준으로 scale 적용
 * @param {string} pathStr
 * @param {number} cx
 * @param {number} scale
 * @returns {string}
 */
export function scalePathXAroundCenter(pathStr, cx, scale) {
  warnUnsupportedCommands(pathStr);
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  const sx = (x) => String(Math.round((cx + (x - cx) * scale) * 10) / 10);
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      result.push(t, sx(parseFloat(tokens[i+1])), tokens[i+2]);
      i += 3;
    } else if (t === 'Q') {
      // Q cx cy x y — control point와 end point 모두 스케일
      result.push(t, sx(parseFloat(tokens[i+1])), tokens[i+2],
                     sx(parseFloat(tokens[i+3])), tokens[i+4]);
      i += 5;
    } else if (t === 'A') {
      // A rx ry rotation large-arc sweep x y
      // rx도 스케일, x 좌표도 스케일
      const rx = parseFloat(tokens[i+1]) * scale;
      result.push(t, String(Math.round(rx * 10) / 10), tokens[i+2],
                     tokens[i+3], tokens[i+4], tokens[i+5],
                     sx(parseFloat(tokens[i+6])), tokens[i+7]);
      i += 8;
    } else if (t === 'Z') {
      result.push(t);
      i += 1;
    } else {
      result.push(t);
      i += 1;
    }
  }
  return result.join(' ');
}

/**
 * path 문자열을 꼭지점 배열로 파싱 (VertexEditor용)
 * @param {string} d — SVG path d attribute
 * @returns {{ cmd: string, x: number, y: number, rx?: number, ry?: number, rotation?: number, largeArc?: number, sweep?: number }[]}
 */
export function parsePathVertices(d) {
  warnUnsupportedCommands(d);
  const tokens = d.match(/[A-Za-z]|[-+]?[\d.]+/g);
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

/**
 * 꼭지점 배열을 path 문자열로 재구성
 * @param {{ cmd: string, x: number, y: number, rx?: number, ry?: number, rotation?: number, largeArc?: number, sweep?: number }[]} verts
 * @returns {string}
 */
export function buildPathFromVertices(verts) {
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
