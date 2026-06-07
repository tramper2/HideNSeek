# Walkthrough - Chameleon Hide and Seek

This document provides a summary of the successfully implemented features, game mechanics, and deployment results, including the recent additions and fixes.

---

## 🌟 What Was Accomplished

We created and refined a fully playable, web-based 3D hide-and-seek game utilizing Vite, React, TypeScript, React Three Fiber (R3F), and Vanilla CSS. All files have been built and deployed directly to the GitHub repository's `gh-pages` branch.

### 1. File Structure & Setup
- `src/main.tsx` & `src/App.tsx`: Main React entry points.
- [App.css](file:///home/tramp/projects/HideNseek/src/App.css) & [index.css](file:///home/tramp/projects/HideNseek/src/index.css): Reset styles, design system, Glassmorphism HUD panels, and button designs.
- [colorHelper.ts](file:///home/tramp/projects/HideNseek/src/utils/colorHelper.ts): RGB conversions, Euclidean color distance matching, and pixel sampling.
- [useGameStore.ts](file:///home/tramp/projects/HideNseek/src/hooks/useGameStore.ts): State store managing game status, countdown timer, phase transitions, and UI controls mode.
- [Environment.tsx](file:///home/tramp/projects/HideNseek/src/components/Environment.tsx): Standard Three.js geometry room walls and obstacles (Sofa, Columns, Crate) tagged with color metadata.
- [Player.tsx](file:///home/tramp/projects/HideNseek/src/components/Player.tsx): Character capsule with sliding collision boundaries and a memory-backed HTML5 canvas mapped to `<canvasTexture>` for real-time body painting.
- [AISeeker.tsx](file:///home/tramp/projects/HideNseek/src/components/AISeeker.tsx): Patrol behavior with FOV scanning sweeps, Raycast-based visibility (Line of Sight), and color difference detection.
- [GameUI.tsx](file:///home/tramp/projects/HideNseek/src/components/GameUI.tsx): Floating panels for paint brush customizers, alert indicators, dual countdown timers, and fullscreen screen overlays.

---

## 🎮 Core Game Mechanics Refined

### 1. Configurable Hiding Phase (사용자 설정형 은폐 단계)
- When the game starts, players are granted a preparational Hiding Phase of **30, 60, or 120 seconds**, configurable directly on the Start Screen.
- A countdown timer labeled `"은폐 가능 시간"` is displayed in the HUD.
- During this phase, the AI Seeker remains stationary at the center `[0, 1.0, 0]` and its detection algorithm is disabled (alert gauge remains locked at 0%).
- After the hiding time runs out, the game transitions to the **Seeking Phase** (생존 시간), where the AI Seeker starts patrolling and the 60-second countdown begins.

### 2. Gesture Mode Toggle (조작 모드 분리)
To resolve the input conflict between camera rotation and body painting, we introduced a **UIMode Toggle** in the HUD panel:
- **페인팅 모드 (Paint Mode - Default)**: OrbitControls are completely disabled. Clicking and dragging on the player character draws color smoothly onto the body texture without any camera movement.
- **시점 회전 모드 (Orbit Mode)**: OrbitControls are enabled. Clicking and dragging on the background allows the player to orbit and adjust the camera angle freely.

### 3. Start Screen Redirection
- Clicking "다시 도전" (Game Over screen) or "메인 화면으로" (Victory screen) resets the game state back to `'START'`.
- The user is returned to the main start menu rather than launching immediately into gameplay, allowing them to adjust brush preferences before starting again.

---

## 🚀 Deployment Results

- **Git Commit**: Pushed all updates to the main branch on GitHub.
- **Vite Build**: Verified compilation success with `npm run build` (zero errors/warnings).
- **GitHub Pages**: Automated bundling & publishing to the remote `gh-pages` branch using the `deploy` script.

> [!TIP]
> The game is successfully deployed at **https://tramper2.github.io/HideNSeek/**.
