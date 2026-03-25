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
const VOWEL_TEMPLATES = {
  'ㅏ': [{dx: 0, path:'M 0 130 L 0 370'}, {dx: 0, path:'M 0 250 L 80 250'}],
  'ㅑ': [{dx: 0, path:'M 0 130 L 0 370'}, {dx: 0, path:'M 0 210 L 80 210'}, {dx: 0, path:'M 0 290 L 80 290'}],
  'ㅓ': [{dx: -80, path:'M -80 250 L 0 250'}, {dx: 0, path:'M 0 130 L 0 370'}],
  'ㅕ': [{dx: -80, path:'M -80 210 L 0 210'}, {dx: -80, path:'M -80 290 L 0 290'}, {dx: 0, path:'M 0 130 L 0 370'}],
};

const SYLLABLE_NAMES = {
  'ㅏ': '가나다라마바사아자차카타파하',
  'ㅑ': '갸냐댜랴먀뱌셔야쟈챠캬탸퍄햐',
  'ㅓ': '거너더러머버서어저처커터퍼허',
  'ㅕ': '겨녀뎌려며벼셔여져쳐켜텨펴혀',
};

const COMBINE_VOWELS = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ'];
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

// 동적 조합 생성 — 자음별 x범위 계산 → 여백 → ㅏ 배치 → 가운데 정렬
function buildSyllables(vowelChar) {
  const vt = VOWEL_TEMPLATES[vowelChar];
  const names = SYLLABLE_NAMES[vowelChar];
  const GAP = 60; // 자음과 모음 사이 여백
  const STROKE_W = 74;

  // 모음 템플릿의 x 최소값 계산 (ㅓ/ㅕ는 음수)
  let vowelMinDx = 0;
  vt.forEach(t => {
    getPathXCoords(t.path).forEach(x => { if (x < vowelMinDx) vowelMinDx = x; });
  });

  return CONSONANTS.map((c, i) => {
    const { minX, maxX } = getConsonantXBounds(c);
    // 모음의 가장 왼쪽 점이 자음 오른쪽 끝 + gap에 오도록
    const vowelBaseX = maxX + STROKE_W / 2 + GAP - vowelMinDx;

    // 모음 획 생성 (baseX 기준으로 오프셋)
    const vowelStrokes = vt.map(t => {
      return { path: offsetPathX(t.path, vowelBaseX) };
    });

    // 모음 오른쪽 끝 계산
    let vowMaxX = 0;
    vowelStrokes.forEach(s => {
      getPathXCoords(s.path).forEach(x => { if (x > vowMaxX) vowMaxX = x; });
    });
    vowMaxX += STROKE_W / 2;

    // 전체 글자 너비
    const totalLeft = minX - STROKE_W / 2;
    const totalWidth = vowMaxX - totalLeft;

    // 캔버스(700) 가운데 정렬용 오프셋
    const centerOffset = (700 - totalWidth) / 2 - totalLeft;

    // 자음 획에 오프셋 적용
    const consStrokes = c.strokes.map(s => ({
      path: offsetPathX(s.path, centerOffset)
    }));

    // 모음 획에도 오프셋 적용
    const finalVowelStrokes = vowelStrokes.map(s => ({
      path: offsetPathX(s.path, centerOffset)
    }));

    return {
      char: names[i],
      strokes: [...consStrokes, ...finalVowelStrokes]
    };
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
