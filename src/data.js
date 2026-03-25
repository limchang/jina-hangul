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
// 실제 한글 폰트 비율 참고
// 자음 영역: x 65~250, y 65~435 (좌측, 세로 꽉)
// ㅏ 세로줄: x=310, y 65~435
// ㅏ 가로줄: x 310~430, y=250
const SYLLABLES_A = [
  { char:'가', strokes:[
    {path:'M 80 110 L 240 110 L 240 390'},                 // ㄱ
    {path:'M 310 65 L 310 435'},                            // ㅏ 세로
    {path:'M 310 250 L 430 250'}                            // ㅏ 가로
  ]},
  { char:'나', strokes:[
    {path:'M 80 110 L 80 390 L 240 390'},                  // ㄴ
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'다', strokes:[
    {path:'M 80 110 L 240 110'},                            // ㄷ 위
    {path:'M 80 110 L 80 390 L 240 390'},                  // ㄷ 아래
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'라', strokes:[
    {path:'M 80 100 L 240 100 L 240 200'},                 // ㄹ 1
    {path:'M 80 200 L 240 200'},                            // ㄹ 2
    {path:'M 80 200 L 80 390 L 240 390'},                  // ㄹ 3
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'마', strokes:[
    {path:'M 80 110 L 80 390'},                             // ㅁ 왼
    {path:'M 80 110 L 240 110 L 240 390'},                 // ㅁ 오+위
    {path:'M 80 390 L 240 390'},                            // ㅁ 아래
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'바', strokes:[
    {path:'M 80 110 L 80 390'},                             // ㅂ 왼
    {path:'M 240 110 L 240 390'},                           // ㅂ 오
    {path:'M 80 250 L 240 250'},                            // ㅂ 중
    {path:'M 80 390 L 240 390'},                            // ㅂ 아래
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'사', strokes:[
    {path:'M 160 100 Q 120 240 70 400'},                   // ㅅ 왼
    {path:'M 160 100 Q 200 240 250 400'},                  // ㅅ 오
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'아', strokes:[
    {path:'M 160 110 A 90 90 0 0 0 160 390 A 90 90 0 0 0 160 110 Z'}, // ㅇ
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'자', strokes:[
    {path:'M 80 120 L 240 120'},                            // ㅈ 위
    {path:'M 160 120 L 70 400'},                            // ㅈ 왼
    {path:'M 160 120 L 250 400'},                           // ㅈ 오
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'차', strokes:[
    {path:'M 160 70 L 160 110'},                            // ㅊ 점
    {path:'M 80 120 L 240 120'},                            // ㅊ 위
    {path:'M 160 120 L 70 400'},                            // ㅊ 왼
    {path:'M 160 120 L 250 400'},                           // ㅊ 오
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'카', strokes:[
    {path:'M 80 110 L 240 110 L 240 390'},                 // ㅋ 1
    {path:'M 80 250 L 240 250'},                            // ㅋ 2
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'타', strokes:[
    {path:'M 80 110 L 240 110'},                            // ㅌ 위
    {path:'M 80 250 L 240 250'},                            // ㅌ 중
    {path:'M 80 110 L 80 390 L 240 390'},                  // ㅌ 아래
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'파', strokes:[
    {path:'M 65 110 L 255 110'},                            // ㅍ 위
    {path:'M 120 110 L 120 390'},                           // ㅍ 왼기둥
    {path:'M 200 110 L 200 390'},                           // ㅍ 오기둥
    {path:'M 65 390 L 255 390'},                            // ㅍ 아래
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
  ]},
  { char:'하', strokes:[
    {path:'M 160 70 L 160 110'},                            // ㅎ 점
    {path:'M 80 130 L 240 130'},                            // ㅎ 가로
    {path:'M 160 180 A 70 70 0 0 0 160 390 A 70 70 0 0 0 160 180 Z'}, // ㅎ 원
    {path:'M 310 65 L 310 435'},
    {path:'M 310 250 L 430 250'}
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
