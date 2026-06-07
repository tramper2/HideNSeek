# Chameleon Hide & Seek (카멜레온 숨바꼭질)

웹 브라우저 환경에서 작동하는 3D 숨바꼭질 프로토타입 게임입니다. 플레이어는 방 안을 돌아다니며 뒤편 사물(소파, 식물, 벽면)의 색에 맞춰 자신의 캐릭터 몸을 드래그-페인팅하여 술래(AI Seeker)로부터 숨어야 합니다.

---
깃 푸시 주소 : https://github.com/tramper2/HideNSeek

## 🎮 게임 조작 방법

- ⌨️ **플레이어 이동**: `W`, `A`, `S`, `D` 또는 `방향키 (↑, ↓, ←, →)`
- 🖌️ **캐릭터 페인팅**: 🖌️ **페인팅 모드**에서 플레이어의 몸통(캡슐)을 클릭 및 드래그하면 선택한 브러시 크기, 색상 및 밝기로 표면을 실시간 채색합니다. 펜 모양 커서로 페인팅 가능 위치를 확인할 수 있습니다.
- 🖱️ **시점 회전**: 🎥 **시점 회전 모드**에서 화면을 클릭하고 드래그하여 플레이어 주변 카메라 시점을 공전시킵니다.
- 🔀 **조작 모드 전환**: 우측 패널의 모드 전환 버튼으로 **페인팅 모드**와 **시점 회전 모드**를 전환합니다. 캔버스 상단 중앙의 모드 배너와 커서 모양으로 현재 모드를 즉시 확인할 수 있습니다.
- 🎨 **위장 팔레트**: 🖌️ **페인팅 모드**에서만 우측 패널에 표시됩니다. 시점 회전 모드에서는 모드 전환 버튼만 최소 표시됩니다.
  - 6가지 대표 색상 + 기본 흰색 (벽/소파/식물 색상 매칭)
  - 명도 조절 슬라이더 (0%~100%, 기본값 50%)
  - 3단계 브러시 크기 (소/중/대)
- 🚪 **나가기**: 게임 중 우측 상단 `✕ 나가기` 버튼으로 언제든 메인 화면으로 돌아갈 수 있습니다.

### 게임 설정 (메인 화면)

- ⏱️ **은폐 시간**: 30초 / 60초 / 120초 중 선택
- 👥 **술래 수**: 1명 / 2명 / 3명 중 선택 (술래가 많을수록 탐지 범위가 넓어져 난이도 상승)

### 생존 규칙

술래의 감시 시야 원뿔(cone) 내에 들어가면 발각 위기 게이지가 상승합니다:

- **이동 중 발견**: 게이지 급격히 상승
- **정지 + 위장 성공**: 게이지가 천천히 상승 (위장은 속도를 늦출 뿐, 발견 자체를 막지는 못함)
- **정지 + 위장 실패**: 게이지가 빠르게 상승
- 술래가 플레이어를 **발견(Spotted)**하면 그 자리에 멈추고 플레이어를 응시합니다
- 최초 발견 시 **경고 알람 소리**가 재생됩니다
- 게이지 100% 도달 시 게임오버, 60초 생존 시 승리!

---

## 🛠️ 기술 스택

- **Vite** + **React 19** + **TypeScript**
- **Three.js** & **React Three Fiber (R3F)** & **@react-three/drei**
- **Vanilla CSS** (글래스모피즘 효과 및 애니메이션 적용)
- **canvas-confetti** (승리 시각 효과 연동)
- **Web Audio API** (발각 경고 사운드)
- **gh-pages** (GitHub Pages 배포)

---

## 🚀 로컬 실행 방법

1. **저장소 복제 및 의존성 설치**:
   ```bash
   git clone https://github.com/tramper2/HideNSeek.git
   cd HideNSeek
   npm install
   ```

2. **개발 서버 실행**:
   ```bash
   npm run dev
   ```
   실행 후 브라우저에서 로컬 개발 서버 주소(기본 `http://localhost:5173`)로 접속합니다.

3. **프로덕션 빌드 테스트**:
   ```bash
   npm run build
   ```

---

## 🌐 GitHub Pages 배포

> **중요**: `git push`만으로는 배포되지 않습니다. 아래 명령을 별도로 실행해야 합니다.

```bash
npm run deploy
```

이 명령은 다음 두 단계를 자동으로 수행합니다:
1. `npm run build` — TypeScript 컴파일 + Vite 프로덕션 빌드
2. `gh-pages -d dist` — 빌드 결과물(`dist/`)을 `gh-pages` 브랜치에 푸시

배포 완료 후 1~2분 뒤 https://tramper2.github.io/HideNSeek/ 에 반영됩니다.

### 배포 워크플로우 요약

```
코드 수정 → git push (소스 반영) → npm run deploy (배포 반영)
```

| 명령 | 역할 |
|------|------|
| `git push origin main` | 소스 코드를 `main` 브랜치에 반영 |
| `npm run deploy` | 빌드 후 `gh-pages` 브랜치에 배포 |

---

## 📂 프로젝트 구조

- `src/components/GameCanvas.tsx`: 3D 렌더링 영역(R3F) 관리, 다중 AI Seeker 렌더링, 카메라 공전 및 라이팅 제어
- `src/components/Player.tsx`: 플레이어 이동 물리(슬라이딩 충돌), 수동 Three.js Raycaster 기반 페인팅 시스템 (CanvasTexture + UV 드로잉)
- `src/components/AISeeker.tsx`: 술래 순찰 노드 이동, 시야 범위(FOV) 시각화, 라인오브사이트 레이캐스트 판별, 발견 시 정지 및 응시, Web Audio API 경고음
- `src/components/Environment.tsx`: 3D 맵 구성(벽면, 바닥, 장애물 배치) 및 충돌 경계 설정
- `src/components/GameUI.tsx`: 2D HTML UI (시작 화면, 술래 수/은폐 시간 설정, 모드 전환, 타이머, 발각 게이지, 나가기 버튼, 게임오버/승리 팝업)
- `src/hooks/useGameStore.ts`: `useSyncExternalStore` + WeakMap 캐싱 기반 성능 최적화 글로벌 스토어
- `src/utils/colorHelper.ts`: RGB 파싱 및 Euclidean 색상 유사도 분석 유틸리티

---

## 🔧 핵심 구현 사양

### 페인팅 시스템
- 512×512 HTML Canvas를 Three.js `CanvasTexture`로 변환하여 캡슐 메시에 매핑
- DOM `pointerdown/move/up` + Three.js `Raycaster`로 캡슐 메시 UV 좌표 획득
- 브러시 색상(HSL) × 명도 × 크기 조합으로 실시간 채색
- 페인팅 시 캔버스 평균 색상을 계산하여 위장 효과 판정에 사용

### AI 탐지 시스템
- 시야 범위 9.5유닛, FOV 60°, 시야 원뿔 시각화
- Raycaster 기반 라인오브사이트 판별 (장애물 뒤에 숨으면 탐지 불가)
- 배경색 vs 플레이어 평균색 Euclidean 거리 계산
- 다중 술래 지원: 각각 독립적인 시작 위치/순찰 경로, OR 로직으로 전역 탐지 상태 판정
- 발견 시 즉시 정지하고 플레이어 방향으로 회전

### 성능 최적화
- `useSyncExternalStore` getSnapshot 캐싱으로 React 리렌더링 최소화
- 프레임당 상태 업데이트 1회 통합 (다중 setState → 단일 setState)
- Store 레벨 변경 감지로 동일 값 리스너 통지 스킵
