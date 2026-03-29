# 진아 한글공부 앱 — 작업 핸드오프

## 프로젝트 개요
- **앱**: 진아의 프리미엄 한글 따라쓰기 앱
- **스택**: React 19 + Vite 8, 순수 CSS, Web Audio API
- **배포**: GitHub Pages (https://limchang.github.io/jina-hangul/)
- **브랜치**: `drag-compose` (메인 작업 브랜치)

---

## 이번 세션 작업 내역

### 1. 버그 수정
- **ㅇ 닫힌 도형 시작 즉시 확대 버그** — `isNear`에 `allowNear` 조건 추가 (진행률 70%+ 필요)
- **돋보기 토글 즉시 반영 안 됨** — `focusZoom`을 ref로 관리하여 클로저 캡처 문제 해결
- **복합 모음(예: ㅖ→ㅕ+ㅣ) 받침 오분류** — 3번째 자모가 모음이면 복합 모음으로 처리
- **rightmost 미정의 변수 크래시** — `placeSyllable`의 불필요한 라인 제거
- **경찰차 회전 크래시** — `isTracing` 선언 전 참조 → 선언 이후로 이동
- **글자 겹침 클릭 문제** — 빈 영역 클릭 시 아래 요소로 재전달
- **celebrate 파티클 좌표** — `SIZE/2` → 글자 중심(`250, 250`)으로 수정
- **도착지 도달 후 지나쳐도 성공** — `reachedGoal` 플래그로 경로 이탈 무시

### 2. 소방관 모드 (화재진압 스킨)
- **🔥 토글 버튼**으로 기존 캔버스에 불끄기 테마 ON/OFF
- **불꽃 이펙트**: 미완성 획 경로 위에 시간 기반 동적 불꽃 (5겹 입자, 좌우 흔들림, 위아래 출렁)
- **글자 단위 불**: 모든 획에 불, 글자 전체 완성 시에만 꺼짐
- **물 닿으면 불 꺼짐**: `maxReachedIdx` 기준 지나간 구간 불 제거, 물색 트레이스가 최상위
- **물방울 파티클**: 따라쓰기 중 손가락에서 사방으로 튀김
- **치지직 소리**: 따라쓰기 중 화이트노이즈 기반 지속 재생
- **소화기 핸들러(🧯)**: 불모드 따라쓰기 시작점 아이콘
- **코끼리 소방관**: 오른쪽 아래 등장, 소화기 위치로 코가 따라다님, 대기 시 왼쪽 아래
- **"불이야! 불을 꺼주자!" TTS**: Google Translate TTS로 모드 진입 시 재생
- **배치 순서대로 불 이동**: `pieces.find(p => !p.done)`
- **대기 글자 가이드 숨김**: 배경선만 표시, 점선/아이콘 숨김
- **모드 전환 시 캔버스 비우기**

### 3. 자동차 모드 (기본 모드)
- **경찰차/소방차/구급차** 탑뷰 이미지 — piece ID 기반 순환 배정
- **경로 방향 회전**: `atan2`로 진행 방향 각도 계산, 핸들러 실시간 회전
- **차량별 목적지**: 경찰차→🦹도둑, 소방차→🔥불, 구급차→🤕환자
- **삐뽀삐뽀 사이렌**: 따라쓰기 중 사각파 LFO로 500~900Hz 왕복 재생

### 4. 난이도 시스템
- **EASY**: 경로 이탈 판정 없음 (기본값)
- **NORMAL**: 도착지 근처에서만 이탈 허용
- **HARD**: 항상 엄격 판정 (52px)
- 컨트롤 바에 EASY/NORMAL/HARD 텍스트 버튼 (클릭 순환)

### 5. 발음 음성 (TTS)
- **Google Translate TTS** — 자연스러운 한국어 발음
- 첫 획 시작 시 즉시 재생, 마지막 획 완성 시 400ms 지연 재생
- Audio 객체 캐싱 (같은 글자 반복 시 즉시 재생)
- 네트워크 실패 시 Web Speech API 폴백

### 6. PWA 지원
- `manifest.json` — 앱 이름, 아이콘, standalone 모드
- `sw.js` — 정적 자산 stale-while-revalidate 캐싱, 오프라인 HTML 폴백
- Apple 메타 태그

### 7. UX 개선
- **기본 캔버스 잠금** — 잠금 시 롱프레스(편집)/이동 차단, 따라쓰기는 허용
- **기본 배율 x2**
- **자동 줌 기본 OFF**
- **편집 모드 확인 버튼** — 화면 하단 중앙 고정 (✔ 확인)
- **글자 완성 후 글로우 제거** — 배경선/점선 가이드 안 그림
- **불모드 키보드 버튼 숨김** — 불 켤 때 키보드 자동 해제

### 8. 게임 모드 (FirefighterMode)
- 별도 전체화면 게임 — 랜덤 글자 불타는 상태로 등장
- 따라쓰면 물방울+증기 파티클, 불 줄어듦
- 점수/콤보 시스템
- (현재 스킨 모드가 메인이므로 보조 기능)

---

## 파일 구조 핵심

| 파일 | 역할 |
|------|------|
| `src/App.jsx` | 앱 루트, 게임모드 전환 |
| `src/components/FreeComposeMode.jsx` | 메인 캔버스, 자모 배치, 모드 관리 |
| `src/components/TracePiece.jsx` | 개별 글자 따라쓰기, 불꽃/차량/소화기 렌더링 |
| `src/TracingEngine.js` | 획 추적 인식, 난이도별 이탈 판정 |
| `src/sound.js` | 효과음 (사이렌, 치지직, TTS, 완성음 등) |
| `src/particles.js` | 파티클 시스템 (sparkle, confetti) |
| `src/components/FirefighterMode.jsx` | 별도 게임 모드 |
| `src/components/WordCards.jsx` | 낱말 카드 저장/불러오기 |
| `src/components/VertexEditor.jsx` | 꼭지점 편집기 |
| `src/data.js` | 자모 SVG 경로, 음절 조합 로직 |
| `src/utils/jamo.js` | 자모 분해/합성 |
| `css/styles.css` | 전체 스타일 (1100+ lines) |

---

## 이미지 에셋

| 경로 | 용도 |
|------|------|
| `public/icons/default/character/police-car.png` | 경찰차 (탑뷰) |
| `public/icons/default/character/fire-truck.png` | 소방차 (탑뷰) |
| `public/icons/default/character/ambulance.png` | 구급차 (탑뷰) |
| `public/icons/firefighter-elephant.png` | 소방관 코끼리 |
| `public/icons/thief.png` | 도둑 (미사용, 이모지로 대체) |

---

## 남은 작업 / 알려진 이슈

- [ ] 도둑/불/환자 목적지를 이미지로 교체 (현재 이모지 임시)
- [ ] 코끼리 이미지 투명 배경 버전 필요
- [ ] 경찰차위.png도 투명 배경 버전 필요
- [ ] Zustand 도입 (useState 15개 → 스토어 분리) — 대규모 리팩토링
- [ ] 코드 스플리팅 — FreeComposeMode 분할
- [ ] 진행도 추적 기능
- [ ] 소방 모드에서 낱말카드 글자 배치 시 일부 글자만 보이는 이슈 (대기 글자 배경선만 표시)

---

## 배포 방법

```bash
npm run build
npx gh-pages -d dist
```

URL: https://limchang.github.io/jina-hangul/
