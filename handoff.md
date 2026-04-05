# 진아 한글공부 앱 — 작업 핸드오프

## 프로젝트 개요
- **앱**: 진아의 프리미엄 한글 따라쓰기 앱
- **스택**: React 19 + Vite 8, 순수 CSS, Web Audio API, Vitest
- **배포**: GitHub Pages (https://limchang.github.io/jina-hangul/)
- **브랜치**: `drag-compose` (메인 작업 브랜치)
- **테스트**: `npm test` (71개 테스트)

---

## 최근 세션: 전면 리팩터링 (2026-04-02~04)

### Phase 1: 유틸리티 레이어 정리
- **TracingEngine 매직넘버 상수화** — 18개 숫자를 `TRACING` 상수 객체로 추출
- **TracingEngine DOM 분리** — `tempSvg`/`tempPath`/`pathCache` 전역 → `SvgPathSampler` 클래스 캡슐화
- **sound.js 중복 제거** — `createTone()` 헬퍼로 osc+gain 9회 반복 패턴 제거
- **sound.js 에러 처리** — 빈 `catch{}` 5곳에 `console.warn` 추가
- **sound.js 상태 캡슐화** — `sirenNodes`/`sizzleNodes` 전역 → `bgSounds` 객체
- **퀴즈 로직 추출** — 중복된 곱셈 퀴즈 생성 → `src/utils/quiz.js`

### Phase 2: FreeComposeMode 분해 (1,115줄 → 455줄)
- **하위 컴포넌트 추출** — `DraggableRemote`, `TrashZone`, `MathQuizModal`
- **useCanvasNavigation** — pan/zoom/pinch/스페이스키/퀴즈잠금 (254줄)
- **usePiecesManager** — 글자 CRUD/선택/그룹/자동순환 (168줄)
- **useDragFromPanel** — 패널→캔버스 드래그 (74줄)
- **useKeyboardInput** — 키보드 한글 조합/음절 배치 (208줄)
- `let nextId` 전역 변수 → `nextIdRef` 훅 내부 ref (HMR 안전)

### Phase 3: TracePiece 안정화
- **configRef 통합** — 3개 prop→ref 미러링 → 단일 `configRef` 객체
- **safeTimeout** — 미추적 `setTimeout` 7개 → 전수 추적, unmount 시 일괄 정리
- **이벤트 의존성 축소** — `[localPos, piece.done, editMode]` → `[]` (ref 패턴)

### Phase 4: CSS 모듈화 (1파일 → 11파일)
- `css/styles.css` (1,246줄) → 컴포넌트별 분리
- 각 컴포넌트에서 필요한 CSS만 import

### Phase 5: 타입 안전성
- `src/types.js` — Piece, Source, Stroke, MathQuiz, Point, BBox 타입 정의
- TracingEngine, sound.js, jamo.js, particles.js, quiz.js에 JSDoc 주석

### Phase 6: SVG Path 파싱 통합
- `src/utils/svgPath.js` — data.js와 VertexEditor.jsx의 정규식 파서 통합
- 미지원 명령어(C, S, T 등) 경고 로그 추가

### Phase 0: 테스트 인프라
- Vitest + jsdom 설치
- 5개 테스트 파일, 71개 테스트 케이스
- `npm test`로 실행

### 버그 수정
- **ALL 첫 글자 겹침** — 기존 글자 있을 때 `placeAll`이 화면 중앙 배치 → `getNextPlacePos()` 사용

---

## 이전 세션 작업 내역

### 버그 수정 (이전)
- ㅇ 닫힌 도형 시작 즉시 확대 — `allowNear` 조건 추가
- 돋보기 토글 즉시 반영 — ref 관리
- 복합 모음 받침 오분류 — 3번째 자모 모음 체크
- 경찰차 회전 크래시 — `isTracing` 선언 순서
- 글자 겹침 클릭 — 빈 영역 이벤트 재전달
- celebrate 파티클 좌표 — `250, 250`
- 도착지 도달 후 지나쳐도 성공 — `reachedGoal` 플래그

### 소방관 모드 / 자동차 모드 / 난이도 시스템 / TTS / PWA
- (상세 내역은 이전 핸드오프 참조)

---

## 파일 구조

```
src/
├── App.jsx                          앱 루트
├── main.jsx                         진입점
├── types.js                         공유 JSDoc 타입 정의
├── data.js                          자모 SVG 경로 + 음절 조합
├── TracingEngine.js                 획 추적 인식 (TRACING 상수, SvgPathSampler)
├── sound.js                         Web Audio 효과음 (createTone, bgSounds)
├── particles.js                     파티클 시스템
├── arrow.js                         획 순서 화살표
├── icon-map.js                      아이콘 매핑
├── sourceOverrides.js               런타임 소스 커스텀
├── components/
│   ├── FreeComposeMode.jsx          메인 캔버스 오케스트레이션 (455줄)
│   ├── TracePiece.jsx               개별 글자 따라쓰기 (725줄)
│   ├── FirefighterMode.jsx          별도 게임 모드
│   ├── CompositionCard.jsx          음절 조합 카드
│   ├── CompositionMode.jsx          조합 모드
│   ├── WordCards.jsx                낱말 카드
│   ├── VertexEditor.jsx             꼭지점 편집기
│   ├── DraggableRemote.jsx          이동 가능 리모컨
│   ├── TrashZone.jsx                휴지통 + 되돌리기
│   ├── MathQuizModal.jsx            수학 퀴즈 모달
│   ├── DragGhost.jsx                드래그 프리뷰
│   └── Slot.jsx                     초/중/종성 슬롯
├── hooks/
│   ├── useCanvasNavigation.js       pan/zoom/pinch (254줄)
│   ├── usePiecesManager.js          글자 CRUD (168줄)
│   ├── useDragFromPanel.js          패널 드래그 (74줄)
│   ├── useKeyboardInput.js          키보드 한글 조합 (208줄)
│   ├── usePinchZoom.js              핀치 줌 제스처
│   └── useTouchDrag.js              터치 드래그
├── utils/
│   ├── jamo.js                      자모 분해/합성
│   ├── quiz.js                      곱셈 퀴즈 생성
│   ├── svgPath.js                   SVG path 통합 파서
│   └── syllableLayout.js            슬롯 레이아웃
├── __tests__/
│   ├── TracingEngine.test.js        엔진 테스트 (19)
│   └── particles.test.js           파티클 테스트 (8)
└── utils/__tests__/
    ├── jamo.test.js                 자모 테스트 (14)
    ├── quiz.test.js                 퀴즈 테스트 (6)
    └── svgPath.test.js              SVG 파서 테스트 (13) ← 부분 합계, 전체 71개

css/
├── global.css                       변수, 리셋, 헤더
├── free-compose.css                 메인 캔버스 UI
├── trace-piece.css                  핸들러/타겟 오버레이
├── remote.css                       리모컨
├── quiz.css                         퀴즈 모달
├── trash-zone.css                   휴지통
├── word-cards.css                   낱말 카드
├── composition.css                  조합 모드
├── vertex-editor.css                꼭지점 편집기
└── firefighter.css                  소방관 게임 모드
```

---

## 남은 작업 / 알려진 이슈

- [ ] 도둑/불/환자 목적지를 이미지로 교체 (현재 이모지 임시)
- [ ] 코끼리, 경찰차 이미지 투명 배경 버전
- [ ] 진행도 추적 기능
- [ ] 소방 모드에서 낱말카드 일부 글자만 보이는 이슈
- [ ] TypeScript 전환 (선택 — JSDoc은 완료)
- [ ] 상태 관리 Zustand 도입 (선택 — 훅 추출로 상당 부분 해소)

---

## 명령어

```bash
npm run dev          # 개발 서버 (localhost:8080)
npm run build        # 프로덕션 빌드
npm test             # 테스트 실행 (71개)
npm run test:watch   # 테스트 워치 모드
npx gh-pages -d dist # GitHub Pages 배포
```
