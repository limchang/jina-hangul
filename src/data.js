// data.js — 한글 자음/모음/음절 데이터 + 조합 로직 (ES Module)

export const CONSONANTS = [
  { char:'ㄱ', strokes:[{path:'M 150 150 L 350 150 L 350 350'}] },
  { char:'ㄴ', strokes:[{path:'M 150 150 L 150 350 L 350 350'}] },
  { char:'ㄷ', strokes:[{path:'M 150 150 L 350 150'}, {path:'M 150 150 L 150 350 L 350 350'}] },
  { char:'ㄹ', strokes:[{path:'M 150 150 L 350 150 L 350 250'}, {path:'M 150 250 L 350 250'}, {path:'M 150 250 L 150 350 L 350 350'}] },
  { char:'ㅁ', strokes:[{path:'M 150 150 L 150 350'}, {path:'M 150 150 L 350 150 L 350 350'}, {path:'M 150 350 L 350 350'}] },
  { char:'ㅂ', strokes:[{path:'M 150 150 L 150 350'}, {path:'M 350 150 L 350 350'}, {path:'M 150 250 L 350 250'}, {path:'M 150 350 L 350 350'}] },
  { char:'ㅅ', strokes:[
    {path:'M 250 140 Q 210 240 160 360'},
    {path:'M 250 140 Q 290 240 340 360'}
  ] },
  { char:'ㅇ', strokes:[{path:'M 250 140 A 110 110 0 0 0 250 360 A 110 110 0 0 0 250 140 Z'}] },
  { char:'ㅈ', strokes:[{path:'M 150 150 L 350 150'}, {path:'M 250 150 L 160 360'}, {path:'M 250 150 L 340 360'}] },
  { char:'ㅊ', strokes:[{path:'M 250 90 L 250 140'}, {path:'M 150 150 L 350 150'}, {path:'M 250 150 L 160 360'}, {path:'M 250 150 L 340 360'}] },
  { char:'ㅋ', strokes:[{path:'M 150 150 L 350 150 L 350 350'}, {path:'M 150 250 L 350 250'}] },
  { char:'ㅌ', strokes:[{path:'M 150 150 L 350 150'}, {path:'M 150 250 L 350 250'}, {path:'M 150 150 L 150 350 L 350 350'}] },
  { char:'ㅍ', strokes:[{path:'M 130 150 L 370 150'}, {path:'M 190 150 L 190 350'}, {path:'M 310 150 L 310 350'}, {path:'M 130 350 L 370 350'}] },
  { char:'ㅎ', strokes:[
    {path:'M 250 100 L 250 140'},
    {path:'M 140 160 L 360 160'},
    {path:'M 250 190 A 85 85 0 0 0 250 360 A 85 85 0 0 0 250 190 Z'}
  ] }
];

export const VOWELS = [
  { char:'ㅏ', strokes:[{path:'M 250 130 L 250 370'}, {path:'M 250 250 L 330 250'}] },
  { char:'ㅑ', strokes:[{path:'M 250 130 L 250 370'}, {path:'M 250 210 L 330 210'}, {path:'M 250 290 L 330 290'}] },
  { char:'ㅓ', strokes:[{path:'M 170 250 L 250 250'}, {path:'M 250 130 L 250 370'}] },
  { char:'ㅕ', strokes:[{path:'M 170 210 L 250 210'}, {path:'M 170 290 L 250 290'}, {path:'M 250 130 L 250 370'}] },
  { char:'ㅗ', strokes:[{path:'M 250 130 L 250 260'}, {path:'M 130 260 L 370 260'}] },
  { char:'ㅛ', strokes:[{path:'M 190 130 L 190 260'}, {path:'M 310 130 L 310 260'}, {path:'M 130 260 L 370 260'}] },
  { char:'ㅜ', strokes:[{path:'M 130 240 L 370 240'}, {path:'M 250 240 L 250 370'}] },
  { char:'ㅠ', strokes:[{path:'M 130 240 L 370 240'}, {path:'M 190 240 L 190 370'}, {path:'M 310 240 L 310 370'}] },
  { char:'ㅡ', strokes:[{path:'M 150 250 L 350 250'}] },
  { char:'ㅣ', strokes:[{path:'M 250 130 L 250 370'}] }
];

export const VOWEL_TEMPLATES = {
  'ㅏ':  { dir:'right', strokes:[{path:'M 0 130 L 0 370'}, {path:'M 0 250 L 80 250'}] },
  'ㅑ':  { dir:'right', strokes:[{path:'M 0 130 L 0 370'}, {path:'M 0 210 L 80 210'}, {path:'M 0 290 L 80 290'}] },
  'ㅓ':  { dir:'right', strokes:[{path:'M -80 250 L 0 250'}, {path:'M 0 130 L 0 370'}] },
  'ㅕ':  { dir:'right', strokes:[{path:'M -80 210 L 0 210'}, {path:'M -80 290 L 0 290'}, {path:'M 0 130 L 0 370'}] },
  'ㅗ':  { dir:'bottom', strokes:[{path:'M 250 0 L 250 -130'}, {path:'M 130 0 L 370 0'}] },
  'ㅛ':  { dir:'bottom', strokes:[{path:'M 190 0 L 190 -130'}, {path:'M 310 0 L 310 -130'}, {path:'M 130 0 L 370 0'}] },
  'ㅜ':  { dir:'bottom', strokes:[{path:'M 130 0 L 370 0'}, {path:'M 250 0 L 250 130'}] },
  'ㅠ':  { dir:'bottom', strokes:[{path:'M 130 0 L 370 0'}, {path:'M 190 0 L 190 130'}, {path:'M 310 0 L 310 130'}] },
  'ㅡ':  { dir:'bottom', strokes:[{path:'M 150 0 L 350 0'}] },
  'ㅣ':  { dir:'right', strokes:[{path:'M 0 130 L 0 370'}] },
};

export const SYLLABLE_NAMES = {
  'ㅏ': '가나다라마바사아자차카타파하',
  'ㅑ': '갸냐댜랴먀뱌셔야쟈챠캬탸퍄햐',
  'ㅓ': '거너더러머버서어저처커터퍼허',
  'ㅕ': '겨녀뎌려며벼셔여져쳐켜텨펴혀',
  'ㅗ': '고노도로모보소오조초코토포호',
  'ㅛ': '교뇨됴료묘뵤쇼요죠쵸쿄툐표효',
  'ㅜ': '구누두루무부수우주추쿠투푸후',
  'ㅠ': '규뉴듀류뮤뷰슈유쥬츄큐튜퓨휴',
  'ㅡ': '그느드르므브스으즈츠크트프흐',
  'ㅣ': '기니디리미비시이지치키티피히',
};

export const COMBINE_VOWELS = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];

export const JONGSUNG_LIST = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 유니코드 초성 인덱스 (19개 체계)
const CHOSUNG_IDX = { 'ㄱ':0,'ㄴ':2,'ㄷ':3,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅅ':9,'ㅇ':11,'ㅈ':12,'ㅊ':14,'ㅋ':15,'ㅌ':16,'ㅍ':17,'ㅎ':18 };
// 유니코드 중성 인덱스 (21개 체계)
const JUNGSUNG_IDX = { 'ㅏ':0,'ㅑ':2,'ㅓ':4,'ㅕ':6,'ㅗ':8,'ㅛ':12,'ㅜ':13,'ㅠ':17,'ㅡ':18,'ㅣ':20 };
// 유니코드 종성 인덱스 (28개 체계, 0=없음)
const JONGSUNG_IDX = { 'ㄱ':1,'ㄴ':4,'ㄷ':7,'ㄹ':8,'ㅁ':16,'ㅂ':17,'ㅅ':19,'ㅇ':21,'ㅈ':22,'ㅊ':23,'ㅋ':24,'ㅌ':25,'ㅍ':26,'ㅎ':27 };

function getSyllableName(cho, jung, jong) {
  return String.fromCharCode(0xAC00 + CHOSUNG_IDX[cho] * 21 * 28 + JUNGSUNG_IDX[jung] * 28 + JONGSUNG_IDX[jong]);
}

export const APP_CONFIG = {
  GUIDE_COLOR: '#ffffff',
  GUIDE_STROKE_WIDTH: 74,
  TRACE_COLOR: '#ffeb3b',
  TRACE_STROKE_WIDTH: 74,
  DEFAULT_CHAR_IMG: 'img.png',
  STARFISH_SVG: `<svg viewBox="0 0 100 100"><path d="M50,5 L63,38 L95,38 L69,59 L79,91 L50,72 L21,91 L31,59 L5,38 L37,38 Z" fill="#ff9133" stroke="#cc5500" stroke-width="2"/><circle cx="42" cy="45" r="4" fill="black"/><circle cx="58" cy="45" r="4" fill="black"/><path d="M46,55 Q50,60 54,55" fill="none" stroke="black" stroke-width="2"/></svg>`
};

// ── 유틸 함수들 ──

function getPathXCoords(pathStr) {
  const xs = [];
  const ml = pathStr.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of ml) xs.push(parseFloat(m[1]));
  const qs = pathStr.matchAll(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of qs) { xs.push(parseFloat(m[1])); xs.push(parseFloat(m[3])); }
  const as = pathStr.matchAll(/A\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of as) xs.push(parseFloat(m[1]));
  return xs;
}

function getPathYCoords(pathStr) {
  const ys = [];
  const ml = pathStr.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of ml) ys.push(parseFloat(m[2]));
  const qs = pathStr.matchAll(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of qs) { ys.push(parseFloat(m[2])); ys.push(parseFloat(m[4])); }
  const as = pathStr.matchAll(/A\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of as) ys.push(parseFloat(m[2]));
  return ys;
}

function getConsonantXBounds(consonant) {
  let minX = Infinity, maxX = -Infinity;
  consonant.strokes.forEach(s => {
    getPathXCoords(s.path).forEach(x => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    });
  });
  return { minX, maxX };
}

function getConsonantYBounds(consonant) {
  let minY = Infinity, maxY = -Infinity;
  consonant.strokes.forEach(s => {
    getPathYCoords(s.path).forEach(y => {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
  });
  return { minY, maxY };
}

function offsetPathY(pathStr, offset) {
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

function offsetPathX(pathStr, offset) {
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

function scalePathXAroundCenter(pathStr, cx, scale) {
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

function scaleConsonantX(consonant, scale) {
  if (scale === 1) return consonant;
  const { minX, maxX } = getConsonantXBounds(consonant);
  const cx = (minX + maxX) / 2;
  return {
    char: consonant.char,
    strokes: consonant.strokes.map(s => ({
      path: scalePathXAroundCenter(s.path, cx, scale)
    }))
  };
}

function scalePathYAroundCenter(pathStr, cy, scale) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  const sy = (y) => String(Math.round((cy + (y - cy) * scale) * 10) / 10);
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      result.push(t, tokens[i+1], sy(parseFloat(tokens[i+2])));
      i += 3;
    } else if (t === 'Q') {
      result.push(t, tokens[i+1], sy(parseFloat(tokens[i+2])),
                     tokens[i+3], sy(parseFloat(tokens[i+4])));
      i += 5;
    } else if (t === 'A') {
      // ry도 스케일, y 좌표도 스케일
      const ry = parseFloat(tokens[i+2]) * scale;
      result.push(t, tokens[i+1], String(Math.round(ry * 10) / 10),
                     tokens[i+3], tokens[i+4], tokens[i+5],
                     tokens[i+6], sy(parseFloat(tokens[i+7])));
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

function scaleConsonantY(consonant, scale) {
  if (scale === 1) return consonant;
  const { minY, maxY } = getConsonantYBounds(consonant);
  const cy = (minY + maxY) / 2;
  return {
    char: consonant.char,
    strokes: consonant.strokes.map(s => ({
      path: scalePathYAroundCenter(s.path, cy, scale)
    }))
  };
}

function buildSyllablesRight(vtStrokes, names, GAP, SW, HALF) {
  let vowelMinDx = 0;
  vtStrokes.forEach(t => {
    getPathXCoords(t.path).forEach(x => { if (x < vowelMinDx) vowelMinDx = x; });
  });
  let vowelMaxDx = 0;
  vtStrokes.forEach(t => {
    getPathXCoords(t.path).forEach(x => { if (x > vowelMaxDx) vowelMaxDx = x; });
  });
  const TARGET_W = 700;

  // 가로형(ㅏㅑㅓㅕㅣ): 자음 가로만 축소
  const CONS_SCALE = 0.7;

  return CONSONANTS.map((c, i) => {
    let cons = scaleConsonantX(c, CONS_SCALE);
    let { minX, maxX } = getConsonantXBounds(cons);

    const vowelBaseX = maxX + HALF + GAP - vowelMinDx;
    const vowelStrokes = vtStrokes.map(t => ({ path: offsetPathX(t.path, vowelBaseX) }));

    let vowMaxX = 0;
    vowelStrokes.forEach(s => {
      getPathXCoords(s.path).forEach(x => { if (x > vowMaxX) vowMaxX = x; });
    });

    const totalLeft = minX - HALF;
    const totalRight = vowMaxX + HALF;
    const centerOffset = (TARGET_W - (totalRight - totalLeft)) / 2 - totalLeft;

    const consStrokes = cons.strokes.map(s => ({ path: offsetPathX(s.path, centerOffset) }));
    const finalVowelStrokes = vowelStrokes.map(s => ({ path: offsetPathX(s.path, centerOffset) }));

    return { char: names[i], strokes: [...consStrokes, ...finalVowelStrokes] };
  });
}

function buildSyllablesBottom(vtStrokes, names, GAP, SW, HALF) {
  let vowelMinDy = 0;
  vtStrokes.forEach(t => {
    getPathYCoords(t.path).forEach(y => { if (y < vowelMinDy) vowelMinDy = y; });
  });
  let vowelMaxDy = 0;
  vtStrokes.forEach(t => {
    getPathYCoords(t.path).forEach(y => { if (y > vowelMaxDy) vowelMaxDy = y; });
  });
  // 세로형(ㅗㅛㅜㅠㅡ): 자음 세로만 축소
  const CONS_SCALE = 0.7;

  return CONSONANTS.map((c, i) => {
    let cons = scaleConsonantY(c, CONS_SCALE);
    let { minY, maxY } = getConsonantYBounds(cons);

    const vowelBaseY = maxY + HALF + GAP - vowelMinDy;
    const vowelStrokes = vtStrokes.map(t => ({ path: offsetPathY(t.path, vowelBaseY) }));

    let vowMaxY = 0;
    vowelStrokes.forEach(s => {
      getPathYCoords(s.path).forEach(y => { if (y > vowMaxY) vowMaxY = y; });
    });

    const totalTop = minY - HALF;
    const totalBottom = vowMaxY + HALF;
    const centerOffsetY = (700 - (totalBottom - totalTop)) / 2 - totalTop;

    let allXs = [];
    cons.strokes.forEach(s => { allXs.push(...getPathXCoords(s.path)); });
    vowelStrokes.forEach(s => { allXs.push(...getPathXCoords(s.path)); });
    const xLeft = Math.min(...allXs) - HALF;
    const xRight = Math.max(...allXs) + HALF;
    const centerOffsetX = (500 - (xRight - xLeft)) / 2 - xLeft;

    const consStrokes = cons.strokes.map(s => ({
      path: offsetPathX(offsetPathY(s.path, centerOffsetY), centerOffsetX)
    }));
    const finalVowelStrokes = vowelStrokes.map(s => ({
      path: offsetPathX(offsetPathY(s.path, centerOffsetY), centerOffsetX)
    }));

    return { char: names[i], strokes: [...consStrokes, ...finalVowelStrokes] };
  });
}

export function buildSyllables(vowelChar) {
  const tmpl = VOWEL_TEMPLATES[vowelChar];
  const names = SYLLABLE_NAMES[vowelChar];
  const GAP = 60;
  const SW = 74;
  const HALF = SW / 2;

  if (tmpl.dir === 'right') {
    return buildSyllablesRight(tmpl.strokes, names, GAP, SW, HALF);
  } else {
    return buildSyllablesBottom(tmpl.strokes, names, GAP, SW, HALF);
  }
}

// ── 받침(종성) 조합 ──
// 붙이기1 결과를 그대로 가져와서 받침만 아래에 추가

export function buildSyllablesBatchim(vowelChar, batchimChar) {
  // 1) 붙이기1 결과 생성
  const baseSyllables = buildSyllables(vowelChar);
  const batchimCons = CONSONANTS.find(c => c.char === batchimChar);
  const tmpl = VOWEL_TEMPLATES[vowelChar];
  const TARGET_H = 700;
  const HALF = 37; // SW/2
  const BAT_SCALE = 0.5;
  const SMALL_GAP = 20;

  return baseSyllables.map((syl, i) => {
    const consChar = CONSONANTS[i].char;

    // 기존 2단 조합의 y 범위
    let baseMaxY = -Infinity;
    syl.strokes.forEach(s => {
      getPathYCoords(s.path).forEach(y => { if (y > baseMaxY) baseMaxY = y; });
    });

    // 기존 2단 조합의 x 범위
    let baseXs = [];
    syl.strokes.forEach(s => { baseXs.push(...getPathXCoords(s.path)); });
    const baseMinX = Math.min(...baseXs);
    const baseMaxX = Math.max(...baseXs);

    // 초성/모음 획 분리
    const consStrokeCount = CONSONANTS[i].strokes.length;
    const vowelStrokes = syl.strokes.slice(consStrokeCount);

    // 받침 폭/높이 경계: 모음의 주선(세로선 or 가로선)까지
    let batchimRightX, batchimTopY;
    if (tmpl.dir === 'right') {
      // 가로형: 모음 세로선(y범위 가장 큰 획)의 x좌표가 오른쪽 경계
      let bestYRange = 0, vertLineX = baseMaxX;
      vowelStrokes.forEach(s => {
        const ys = getPathYCoords(s.path);
        const xs = getPathXCoords(s.path);
        const yRange = Math.max(...ys) - Math.min(...ys);
        if (yRange > bestYRange) {
          bestYRange = yRange;
          vertLineX = xs[0];
        }
      });
      batchimRightX = vertLineX;
      batchimTopY = baseMaxY; // 가로형은 그대로
    } else {
      // 세로형: 모음 가로선(x범위 가장 큰 획)의 y좌표가 높이 경계
      let bestXRange = 0, horizLineY = baseMaxY;
      vowelStrokes.forEach(s => {
        const xs = getPathXCoords(s.path);
        const ys = getPathYCoords(s.path);
        const xRange = Math.max(...xs) - Math.min(...xs);
        if (xRange > bestXRange) {
          bestXRange = xRange;
          horizLineY = ys[0]; // 가로선의 y좌표
        }
      });
      batchimRightX = baseMaxX;
      batchimTopY = horizLineY; // 세로형은 가로선까지만
    }
    const baseWidth = batchimRightX - baseMinX;

    // 받침: 곡선(ㅅㅇㅈㅊㅎ 등) 여부에 따라 스케일 방식 분기
    const hasCurves = batchimCons.strokes.some(s => /[QA]/.test(s.path));
    let bat;
    if (hasCurves) {
      // 곡선 자음: XY 균일 스케일 (원형 유지)
      bat = scaleConsonantX(batchimCons, BAT_SCALE);
      bat = scaleConsonantY(bat, BAT_SCALE);
    } else {
      // 직선 자음: 세로 고정 축소, 가로는 기존 글자 폭에 맞춤
      bat = scaleConsonantY(batchimCons, BAT_SCALE);
      let { minX: batOrigMinX, maxX: batOrigMaxX } = getConsonantXBounds(bat);
      const batOrigWidth = batOrigMaxX - batOrigMinX;
      const batScaleX = batOrigWidth > 0 ? baseWidth / batOrigWidth : 1;
      bat = scaleConsonantX(bat, batScaleX);
    }
    let { minY: batMinY } = getConsonantYBounds(bat);

    // 받침 배치: 받침 최상단을 기준선 아래에 맞춤
    // 세로형: 모음 가로선 획폭 바로 아래에 밀착
    // 가로형: 기존 글자 아래에 간격두고 배치
    const batBaseY = tmpl.dir === 'bottom'
      ? batchimTopY + HALF + 5 - batMinY
      : batchimTopY + HALF + SMALL_GAP - batMinY + HALF;
    let batchimStrokes = bat.strokes.map(s => ({ path: offsetPathY(s.path, batBaseY) }));

    // 받침 x를 기존 글자 중앙에 맞춤
    let batXs = [];
    batchimStrokes.forEach(s => { batXs.push(...getPathXCoords(s.path)); });
    const batCenterX = (Math.min(...batXs) + Math.max(...batXs)) / 2;
    const baseCenterX = (baseMinX + batchimRightX) / 2;
    const batOffX = baseCenterX - batCenterX;
    batchimStrokes = batchimStrokes.map(s => ({ path: offsetPathX(s.path, batOffX) }));

    // 전체 (기존 + 받침)의 y 범위 → 세로 중앙 정렬
    let allYs = [];
    syl.strokes.forEach(s => { allYs.push(...getPathYCoords(s.path)); });
    batchimStrokes.forEach(s => { allYs.push(...getPathYCoords(s.path)); });
    const totalTop = Math.min(...allYs) - HALF;
    const totalBottom = Math.max(...allYs) + HALF;
    const shiftY = (TARGET_H - (totalBottom - totalTop)) / 2 - totalTop;

    const baseStrokes = syl.strokes.map(s => ({ path: offsetPathY(s.path, shiftY) }));
    const finalBatchimStrokes = batchimStrokes.map(s => ({ path: offsetPathY(s.path, shiftY) }));

    const charName = getSyllableName(consChar, vowelChar, batchimChar);
    return { char: charName, strokes: [...baseStrokes, ...finalBatchimStrokes] };
  });
}
