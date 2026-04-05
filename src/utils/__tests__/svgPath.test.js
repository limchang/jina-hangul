import { describe, it, expect } from 'vitest';
import {
  getPathXCoords, getPathYCoords,
  offsetPathX, offsetPathY,
  scalePathXAroundCenter,
  parsePathVertices, buildPathFromVertices,
} from '../svgPath.js';

describe('getPathXCoords', () => {
  it('M/L 좌표 추출', () => {
    expect(getPathXCoords('M 150 200 L 350 400')).toEqual([150, 350]);
  });
  it('Q 좌표 추출 (control + end)', () => {
    expect(getPathXCoords('Q 100 200 300 400')).toEqual([100, 300]);
  });
  it('A 좌표 추출', () => {
    const xs = getPathXCoords('A 110 110 0 0 0 250 360');
    expect(xs).toEqual([250]);
  });
  it('복합 경로', () => {
    const xs = getPathXCoords('M 150 150 L 350 150 L 350 350');
    expect(xs).toEqual([150, 350, 350]);
  });
});

describe('getPathYCoords', () => {
  it('M/L 좌표 추출', () => {
    expect(getPathYCoords('M 150 200 L 350 400')).toEqual([200, 400]);
  });
  it('Q 좌표 추출', () => {
    expect(getPathYCoords('Q 100 200 300 400')).toEqual([200, 400]);
  });
});

describe('offsetPathX', () => {
  it('M/L X좌표 이동', () => {
    const result = offsetPathX('M 100 200 L 300 400', 50);
    expect(result).toBe('M 150 200 L 350 400');
  });
  it('Q X좌표 이동', () => {
    const result = offsetPathX('Q 100 200 300 400', 10);
    expect(result).toBe('Q 110 200 310 400');
  });
  it('Z 유지', () => {
    const result = offsetPathX('M 100 200 Z', 50);
    expect(result).toBe('M 150 200 Z');
  });
});

describe('offsetPathY', () => {
  it('M/L Y좌표 이동', () => {
    const result = offsetPathY('M 100 200 L 300 400', 50);
    expect(result).toBe('M 100 250 L 300 450');
  });
  it('Q Y좌표 이동', () => {
    const result = offsetPathY('Q 100 200 300 400', 10);
    expect(result).toBe('Q 100 210 300 410');
  });
});

describe('scalePathXAroundCenter', () => {
  it('center 기준 X 스케일', () => {
    // center=200, scale=0.5: x=100 → 200 + (100-200)*0.5 = 150
    const result = scalePathXAroundCenter('M 100 200', 200, 0.5);
    expect(result).toBe('M 150 200');
  });
  it('center와 같은 좌표는 변하지 않음', () => {
    const result = scalePathXAroundCenter('M 200 100', 200, 2);
    expect(result).toBe('M 200 100');
  });
});

describe('parsePathVertices / buildPathFromVertices 왕복', () => {
  it('M/L 왕복', () => {
    const d = 'M 150 150 L 350 150 L 350 350';
    const verts = parsePathVertices(d);
    expect(verts).toHaveLength(3);
    expect(verts[0]).toEqual({ cmd: 'M', x: 150, y: 150 });
    expect(verts[1]).toEqual({ cmd: 'L', x: 350, y: 150 });
    const rebuilt = buildPathFromVertices(verts);
    expect(rebuilt).toBe('M 150 150 L 350 150 L 350 350');
  });

  it('Q 왕복 (control + end)', () => {
    const d = 'M 250 140 Q 210 240 160 360';
    const verts = parsePathVertices(d);
    expect(verts).toHaveLength(3); // M, Q_CP, Q_END
    expect(verts[1].cmd).toBe('Q_CP');
    expect(verts[2].cmd).toBe('Q_END');
    const rebuilt = buildPathFromVertices(verts);
    expect(rebuilt).toBe('M 250 140 Q 210 240 160 360');
  });

  it('A 왕복', () => {
    const d = 'M 250 140 A 110 110 0 0 0 250 360';
    const verts = parsePathVertices(d);
    expect(verts).toHaveLength(2);
    expect(verts[1].cmd).toBe('A');
    expect(verts[1].rx).toBe(110);
    expect(verts[1].x).toBe(250);
    const rebuilt = buildPathFromVertices(verts);
    expect(rebuilt).toBe('M 250 140 A 110 110 0 0 0 250 360');
  });

  it('Z 포함 왕복', () => {
    const d = 'M 250 140 A 110 110 0 0 0 250 360 A 110 110 0 0 0 250 140 Z';
    const verts = parsePathVertices(d);
    expect(verts[verts.length - 1].cmd).toBe('Z');
    const rebuilt = buildPathFromVertices(verts);
    expect(rebuilt).toBe(d);
  });
});
