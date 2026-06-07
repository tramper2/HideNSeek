# Chameleon Hide & Seek (카멜레온 숨바꼭질)

웹 브라우저 환경에서 작동하는 3D 숨바꼭질 프로토타입 게임입니다. 플레이어는 방 안을 돌아다니며 뒤편 사물(소파, 식물, 벽면)의 색에 맞춰 자신의 캐릭터 몸을 드래그-페인팅하여 술래(AI Seeker)로부터 숨어야 합니다.

---
깃 푸시 주소 : https://github.com/tramper2/HideNSeek

## 🎮 게임 조작 방법

- ⌨️ **플레이어 이동**: `W`, `A`, `S`, `D` 또는 `방향키 (↑, ↓, ←, →)`
- 🖱️ **시점 회전**: 화면 배경을 클릭하고 드래그하여 플레이어 주변 카메라 시점을 공전시킵니다.
- 🖌️ **캐릭터 페인팅**: 플레이어의 몸통(중앙의 캡슐)을 클릭 및 드래그하면 선택한 브러시 크기, 색상 및 밝기로 표면을 실시간 채색합니다.
- 🎨 **위장 패널**: 우측 상단 플로팅 패널을 통해 6가지 대표 색상 및 기본 흰색, 명도 조절 슬라이더, 3단계 브러시 크기(소, 중, 대)를 변경할 수 있습니다.
- 🕵️ **생존 규칙**: 술래의 감시 시야 원뿔(cone) 내에 있을 때, 
  - **움직이고 있거나**
  - **뒤쪽 배경색과 몸의 평균 색상이 다르면 (유클리드 거리 110 초과)**
  - 발각 위기 게이지가 차오르며, 100% 도달 시 정체가 드러나 게임이 종료(GAMEOVER)됩니다.
  - 60초 동안 들키지 않고 버텨내면 플레이어의 승리(VICTORY)입니다!

---

## 🛠️ 기술 스택

- **Vite** + **React** + **TypeScript**
- **Three.js** & **React Three Fiber (R3F)** & **@react-three/drei**
- **Vanilla CSS** (글래스모피즘 효과 및 애니메이션 적용)
- **canvas-confetti** (승리 시각 효과 연동)
- **gh-pages** (GitHub Pages 배포 자동화 패키지)

---

## 🚀 로컬 실행 방법

1. **저장소 복제 및 의존성 설치**:
   ```bash
   npm install
   ```

2. **개발 서버 실행**:
   ```bash
   npm run dev
   ```
   실행 후 브라우저에서 `http://localhost:5173/`으로 접속합니다.

3. **프로덕션 빌드 테스트**:
   ```bash
   npm run build
   ```

4. **GitHub Pages 배포**:
   ```bash
   npm run deploy
   ```
   (배포용 정적 빌드가 진행된 후 `gh-pages` 브랜치로 `dist` 폴더가 자동 푸시됩니다.)

---

## 📂 프로젝트 구조

- `src/components/GameCanvas.tsx`: 3D 렌더링 영역(R3F) 관리 및 카메라 공전, 라이팅 제어
- `src/components/Player.tsx`: 플레이어의 이동 물리(슬라이딩 충돌) 및 마우스 드래그 CanvasTexture 실시간 드로잉 루프
- `src/components/AISeeker.tsx`: 술래의 순찰 노드 이동, 시야 범위 시각화 및 라인오브사이트/색상 일치율 레이캐스트 판별
- `src/components/Environment.tsx`: 3D 맵 구성(벽면, 바닥, 장애물 배치) 및 충돌 경계 설정
- `src/components/GameUI.tsx`: 2D HTML UI(시작 화면, 패널 제어, 타이머, 발각 게이지, 게임오버/승리 팝업)
- `src/hooks/useGameStore.ts`: 게임 전반의 상태를 동기화하기 위한 `useSyncExternalStore` 기반의 성능 최적화된 독립 스토어
- `src/utils/colorHelper.ts`: RGB 파싱 및 Euclidean 색상 유사도 분석 유틸리티
