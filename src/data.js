const CONSONANTS = [
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
  // 'ㅇ' uses two arcs to ensure robust rendering of a circle
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

const VOWELS = [
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

// 모음 원본 데이터 (500×500 기준, 좌표를 상대값으로 활용)
// 모음 템플릿
// dir: 'right' = 자음 오른쪽에 배치 (가로 확장), 'bottom' = 자음 아래에 배치 (세로 확장)
// path는 x=0,y=0 기준 상대좌표
const VOWEL_TEMPLATES = {
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

const SYLLABLE_NAMES = {
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

const COMBINE_VOWELS = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];
let selectedVowel = 'ㅏ';

// path 문자열에서 모든 x좌표를 추출
function getPathXCoords(pathStr) {
  const xs = [];
  // M/L x y
  const ml = pathStr.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of ml) xs.push(parseFloat(m[1]));
  // Q cx cy x y
  const qs = pathStr.matchAll(/Q\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of qs) { xs.push(parseFloat(m[1])); xs.push(parseFloat(m[3])); }
  // A rx ry ... x y
  const as = pathStr.matchAll(/A\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  for (const m of as) xs.push(parseFloat(m[1]));
  return xs;
}

// path 문자열에서 모든 y좌표를 추출
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

// 자음의 x 범위 계산
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

// 자음의 y 범위 계산
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

// path를 토큰으로 분해 → y좌표만 offset → 재조립
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

// path를 토큰으로 분해 → x좌표만 offset → 재조립
function offsetPathX(pathStr, offset) {
  // 토큰 분리: 명령어(문자) 또는 숫자
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;

  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      // M/L x y
      result.push(t, String(parseFloat(tokens[i+1]) + offset), tokens[i+2]);
      i += 3;
    } else if (t === 'Q') {
      // Q cx cy x y
      result.push(t, String(parseFloat(tokens[i+1]) + offset), tokens[i+2],
                     String(parseFloat(tokens[i+3]) + offset), tokens[i+4]);
      i += 5;
    } else if (t === 'A') {
      // A rx ry rotation large-arc sweep x y
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

// 자음에 곡선(Q/A)이 포함되어 있는지 확인
function hasConsonantCurves(consonant) {
  return consonant.strokes.some(s => /[QA]/.test(s.path));
}

// 직선 자음의 x좌표를 중심 기준으로 스케일 (곡률 유지 — 곡선 자음은 건너뜀)
// scale: 0~1 (1이면 원래 크기)
function scaleConsonantX(consonant, scale) {
  if (hasConsonantCurves(consonant)) return consonant; // 곡선은 건드리지 않음
  if (scale >= 1) return consonant;

  const { minX, maxX } = getConsonantXBounds(consonant);
  const cx = (minX + maxX) / 2;

  return {
    char: consonant.char,
    strokes: consonant.strokes.map(s => ({
      path: scalePathXAroundCenter(s.path, cx, scale)
    }))
  };
}

// path의 x좌표를 cx 기준으로 scale 적용
function scalePathXAroundCenter(pathStr, cx, scale) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      const x = parseFloat(tokens[i+1]);
      const newX = cx + (x - cx) * scale;
      result.push(t, String(Math.round(newX * 10) / 10), tokens[i+2]);
      i += 3;
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

// 직선 자음의 y좌표를 중심 기준으로 스케일
function scaleConsonantY(consonant, scale) {
  if (hasConsonantCurves(consonant)) return consonant;
  if (scale >= 1) return consonant;

  const { minY, maxY } = getConsonantYBounds(consonant);
  const cy = (minY + maxY) / 2;

  return {
    char: consonant.char,
    strokes: consonant.strokes.map(s => ({
      path: scalePathYAroundCenter(s.path, cy, scale)
    }))
  };
}

function scalePathYAroundCenter(pathStr, cy, scale) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?[\d.]+/g);
  if (!tokens) return pathStr;
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      const y = parseFloat(tokens[i+2]);
      const newY = cy + (y - cy) * scale;
      result.push(t, tokens[i+1], String(Math.round(newY * 10) / 10));
      i += 3;
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

// 동적 조합 생성
function buildSyllables(vowelChar) {
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

// 가로형 (ㅏㅑㅓㅕ): 자음 오른쪽에 모음, 캔버스 700×500
function buildSyllablesRight(vtStrokes, names, GAP, SW, HALF) {
  let vowelMinDx = 0;
  vtStrokes.forEach(t => {
    getPathXCoords(t.path).forEach(x => { if (x < vowelMinDx) vowelMinDx = x; });
  });

  // 모음 폭 계산 (템플릿 기준)
  let vowelMaxDx = 0;
  vtStrokes.forEach(t => {
    getPathXCoords(t.path).forEach(x => { if (x > vowelMaxDx) vowelMaxDx = x; });
  });
  const vowelWidth = (vowelMaxDx - vowelMinDx) + SW; // 모음 전체 폭 (획폭 포함)

  const TARGET_W = 700; // 캔버스 폭

  return CONSONANTS.map((c, i) => {
    // 자음 스케일링: 자음폭 + gap + 모음폭이 캔버스를 넘으면 자음을 축소
    let cons = c;
    let { minX, maxX } = getConsonantXBounds(cons);
    const consWidth = (maxX - minX) + SW;
    const totalNeeded = consWidth + GAP + vowelWidth;

    if (totalNeeded > TARGET_W && !hasConsonantCurves(c)) {
      const availForCons = TARGET_W - GAP - vowelWidth;
      const scale = (availForCons - SW) / (consWidth - SW); // 획폭 제외한 부분만 스케일
      cons = scaleConsonantX(c, Math.max(scale, 0.6)); // 최소 60%
      ({ minX, maxX } = getConsonantXBounds(cons));
    }

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

// 세로형 (ㅜㅠ): 자음 아래에 모음, 캔버스 500×700
function buildSyllablesBottom(vtStrokes, names, GAP, SW, HALF) {
  // 모음 템플릿의 y 최소값
  let vowelMinDy = 0;
  vtStrokes.forEach(t => {
    getPathYCoords(t.path).forEach(y => { if (y < vowelMinDy) vowelMinDy = y; });
  });

  // 모음 높이 계산
  let vowelMaxDy = 0;
  vtStrokes.forEach(t => {
    getPathYCoords(t.path).forEach(y => { if (y > vowelMaxDy) vowelMaxDy = y; });
  });
  const vowelHeight = (vowelMaxDy - vowelMinDy) + SW;
  const TARGET_H = 700;

  return CONSONANTS.map((c, i) => {
    let { minY, maxY } = getConsonantYBounds(c);
    const consHeight = (maxY - minY) + SW;
    const totalNeeded = consHeight + GAP + vowelHeight;

    // 세로형에서는 자음 y축 스케일링 (곡선 건너뜀)
    let cons = c;
    if (totalNeeded > TARGET_H && !hasConsonantCurves(c)) {
      const availForCons = TARGET_H - GAP - vowelHeight;
      const scale = (availForCons - SW) / (consHeight - SW);
      cons = scaleConsonantY(c, Math.max(scale, 0.6));
      ({ minY, maxY } = getConsonantYBounds(cons));
    }

    const vowelBaseY = maxY + HALF + GAP - vowelMinDy;

    const vowelStrokes = vtStrokes.map(t => ({ path: offsetPathY(t.path, vowelBaseY) }));

    let vowMaxY = 0;
    vowelStrokes.forEach(s => {
      getPathYCoords(s.path).forEach(y => { if (y > vowMaxY) vowMaxY = y; });
    });

    const totalTop = minY - HALF;
    const totalBottom = vowMaxY + HALF;
    const centerOffsetY = (700 - (totalBottom - totalTop)) / 2 - totalTop;

    // x축은 500 기준 가운데 정렬
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

let SYLLABLES = buildSyllables('ㅏ');

const APP_CONFIG = {
  GUIDE_COLOR: '#ffffff',
  GUIDE_STROKE_WIDTH: 74,
  TRACE_COLOR: '#ffeb3b',
  TRACE_STROKE_WIDTH: 74,
  DEFAULT_CHAR_IMG: 'img.png',
  STARFISH_SVG: `<svg viewBox="0 0 100 100"><path d="M50,5 L63,38 L95,38 L69,59 L79,91 L50,72 L21,91 L31,59 L5,38 L37,38 Z" fill="#ff9133" stroke="#cc5500" stroke-width="2"/><circle cx="42" cy="45" r="4" fill="black"/><circle cx="58" cy="45" r="4" fill="black"/><path d="M46,55 Q50,60 54,55" fill="none" stroke="black" stroke-width="2"/></svg>`
};
