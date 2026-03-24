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
  { char:'ㅗ', strokes:[{path:'M 250 150 L 250 250'}, {path:'M 160 250 L 340 250'}] },
  { char:'ㅛ', strokes:[{path:'M 210 150 L 210 250'}, {path:'M 290 150 L 290 250'}, {path:'M 160 250 L 340 250'}] },
  { char:'ㅜ', strokes:[{path:'M 160 250 L 340 250'}, {path:'M 250 250 L 250 350'}] },
  { char:'ㅠ', strokes:[{path:'M 160 250 L 340 250'}, {path:'M 210 250 L 210 350'}, {path:'M 290 250 L 290 350'}] },
  { char:'ㅡ', strokes:[{path:'M 150 250 L 350 250'}] },
  { char:'ㅣ', strokes:[{path:'M 250 130 L 250 370'}] }
];

// 가갸거겨고교구규그기 - 자음(ㄱ)은 왼쪽위 셀, 모음은 오른쪽/아래 셀
// 캔버스 500x500 기준
// 자음 영역: x 80~260, y 60~300  (좌상단 2/3 높이)
// 모음(세로계열 ㅏㅑㅓㅕ): x 270~340, y 60~440
// 모음(가로계열 ㅗㅛㅜㅠ): 자음 영역 아래 x 80~420, y 300~440
// 모음(ㅡ,ㅣ): 별도
const SYLLABLES_GA = [
  { char:'가', strokes:[
    // ㄱ (자음, 좌상단)
    {path:'M 100 100 L 240 100 L 240 260'},
    // ㅏ (모음, 오른쪽 세로)
    {path:'M 290 70 L 290 430'},
    {path:'M 290 250 L 370 250'}
  ]},
  { char:'갸', strokes:[
    {path:'M 100 100 L 240 100 L 240 260'},
    {path:'M 290 70 L 290 430'},
    {path:'M 290 190 L 370 190'},
    {path:'M 290 310 L 370 310'}
  ]},
  { char:'거', strokes:[
    {path:'M 100 100 L 240 100 L 240 260'},
    {path:'M 210 250 L 290 250'},
    {path:'M 290 70 L 290 430'}
  ]},
  { char:'겨', strokes:[
    {path:'M 100 100 L 240 100 L 240 260'},
    {path:'M 210 190 L 290 190'},
    {path:'M 210 310 L 290 310'},
    {path:'M 290 70 L 290 430'}
  ]},
  { char:'고', strokes:[
    // ㄱ (자음, 위쪽)
    {path:'M 100 80 L 400 80 L 400 200'},
    // ㅗ (모음, 아래)
    {path:'M 250 230 L 250 360'},
    {path:'M 100 360 L 400 360'}
  ]},
  { char:'교', strokes:[
    {path:'M 100 80 L 400 80 L 400 200'},
    {path:'M 180 230 L 180 360'},
    {path:'M 320 230 L 320 360'},
    {path:'M 100 360 L 400 360'}
  ]},
  { char:'구', strokes:[
    {path:'M 100 80 L 400 80 L 400 200'},
    {path:'M 100 290 L 400 290'},
    {path:'M 250 290 L 250 420'}
  ]},
  { char:'규', strokes:[
    {path:'M 100 80 L 400 80 L 400 200'},
    {path:'M 100 290 L 400 290'},
    {path:'M 180 290 L 180 420'},
    {path:'M 320 290 L 320 420'}
  ]},
  { char:'그', strokes:[
    {path:'M 100 80 L 400 80 L 400 200'},
    {path:'M 100 360 L 400 360'}
  ]},
  { char:'기', strokes:[
    {path:'M 100 100 L 240 100 L 240 260'},
    {path:'M 320 70 L 320 430'}
  ]}
];

const APP_CONFIG = {
  GUIDE_COLOR: '#ffffff',
  GUIDE_STROKE_WIDTH: 74,
  TRACE_COLOR: '#ffeb3b',
  TRACE_STROKE_WIDTH: 74,
  DEFAULT_CHAR_IMG: 'gazelle.png',
  STARFISH_SVG: `<svg viewBox="0 0 100 100"><path d="M50,5 L63,38 L95,38 L69,59 L79,91 L50,72 L21,91 L31,59 L5,38 L37,38 Z" fill="#ff9133" stroke="#cc5500" stroke-width="2"/><circle cx="42" cy="45" r="4" fill="black"/><circle cx="58" cy="45" r="4" fill="black"/><path d="M46,55 Q50,60 54,55" fill="none" stroke="black" stroke-width="2"/></svg>`
};
