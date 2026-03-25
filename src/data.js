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

// 자음 + ㅏ 조합 (가~하)
// 캔버스: 1000 × 500 (가로형)
// 자음 영역: x 60~430, y 60~440 (왼쪽 절반)
// ㅏ 세로줄: x=600, y 60~440
// ㅏ 가로줄: x 600~820, y=250
const SYLLABLES_A = [
  { char:'가', strokes:[
    {path:'M 100 100 L 400 100 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'나', strokes:[
    {path:'M 100 100 L 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'다', strokes:[
    {path:'M 100 100 L 400 100'},
    {path:'M 100 100 L 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'라', strokes:[
    {path:'M 100 90 L 400 90 L 400 210'},
    {path:'M 100 210 L 400 210'},
    {path:'M 100 210 L 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'마', strokes:[
    {path:'M 100 100 L 100 400'},
    {path:'M 100 100 L 400 100 L 400 400'},
    {path:'M 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'바', strokes:[
    {path:'M 100 100 L 100 400'},
    {path:'M 400 100 L 400 400'},
    {path:'M 100 250 L 400 250'},
    {path:'M 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'사', strokes:[
    {path:'M 250 90 Q 180 240 80 420'},
    {path:'M 250 90 Q 320 240 420 420'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'아', strokes:[
    {path:'M 250 100 A 150 150 0 0 0 250 400 A 150 150 0 0 0 250 100 Z'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'자', strokes:[
    {path:'M 100 110 L 400 110'},
    {path:'M 250 110 L 90 420'},
    {path:'M 250 110 L 410 420'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'차', strokes:[
    {path:'M 250 55 L 250 100'},
    {path:'M 100 110 L 400 110'},
    {path:'M 250 110 L 90 420'},
    {path:'M 250 110 L 410 420'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'카', strokes:[
    {path:'M 100 100 L 400 100 L 400 400'},
    {path:'M 100 250 L 400 250'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'타', strokes:[
    {path:'M 100 100 L 400 100'},
    {path:'M 100 250 L 400 250'},
    {path:'M 100 100 L 100 400 L 400 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'파', strokes:[
    {path:'M 70 100 L 430 100'},
    {path:'M 180 100 L 180 400'},
    {path:'M 320 100 L 320 400'},
    {path:'M 70 400 L 430 400'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]},
  { char:'하', strokes:[
    {path:'M 250 55 L 250 100'},
    {path:'M 100 120 L 400 120'},
    {path:'M 250 180 A 110 110 0 0 0 250 400 A 110 110 0 0 0 250 180 Z'},
    {path:'M 600 60 L 600 440'},
    {path:'M 600 250 L 820 250'}
  ]}
];

const APP_CONFIG = {
  GUIDE_COLOR: '#ffffff',
  GUIDE_STROKE_WIDTH: 74,
  TRACE_COLOR: '#ffeb3b',
  TRACE_STROKE_WIDTH: 74,
  DEFAULT_CHAR_IMG: 'img.png',
  STARFISH_SVG: `<svg viewBox="0 0 100 100"><path d="M50,5 L63,38 L95,38 L69,59 L79,91 L50,72 L21,91 L31,59 L5,38 L37,38 Z" fill="#ff9133" stroke="#cc5500" stroke-width="2"/><circle cx="42" cy="45" r="4" fill="black"/><circle cx="58" cy="45" r="4" fill="black"/><path d="M46,55 Q50,60 54,55" fill="none" stroke="black" stroke-width="2"/></svg>`
};
