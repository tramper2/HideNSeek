import { useSyncExternalStore } from 'react';

export type GameStatus = 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
export type GamePhase = 'HIDING' | 'SEEKING';
export type UIMode = 'PAINT' | 'ORBIT';

export interface GameState {
  status: GameStatus;
  gamePhase: GamePhase;
  uiMode: UIMode;
  maxHidingTime: number; // User configurable hiding time
  hidingTimer: number;
  timer: number;
  brushColor: string;
  brushBrightness: number;
  brushSize: number;
  isPlayerMoving: boolean;
  playerAvgColor: { r: number; g: number; b: number };
  detectionGauge: number; // 0 to 100
  isPlayerSpotted: boolean;
  bgColor: { r: number; g: number; b: number };
  colorDistance: number;
}

const defaultState: GameState = {
  status: 'START',
  gamePhase: 'HIDING',
  uiMode: 'PAINT',
  maxHidingTime: 30,
  hidingTimer: 30,
  timer: 60,
  brushColor: '#991B1B', // Default to sofa red
  brushBrightness: 1.0,
  brushSize: 0.15, // Medium size (0.05 소, 0.15 중, 0.3 대)
  isPlayerMoving: false,
  playerAvgColor: { r: 255, g: 255, b: 255 },
  detectionGauge: 0,
  isPlayerSpotted: false,
  bgColor: { r: 210, g: 210, b: 210 }, // default light grey floor
  colorDistance: 0,
};

let state: GameState = { ...defaultState };
const listeners = new Set<() => void>();

export const gameStore = {
  getState() {
    return state;
  },
  setState(nextState: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) {
    const changes = typeof nextState === 'function' ? nextState(state) : nextState;
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reset() {
    state = { ...defaultState };
    listeners.forEach((listener) => listener());
  },
  startGame() {
    this.setState({
      status: 'PLAYING',
      gamePhase: 'HIDING',
      uiMode: 'PAINT',
      hidingTimer: state.maxHidingTime,
      timer: 60,
      detectionGauge: 0,
      isPlayerSpotted: false,
    });
  },
  setGameOver() {
    this.setState({ status: 'GAMEOVER' });
  },
  setVictory() {
    this.setState({ status: 'VICTORY' });
  }
};

export function useGameStore<T>(selector: (state: GameState) => T): T {
  return useSyncExternalStore(
    gameStore.subscribe,
    () => selector(gameStore.getState()),
    () => selector(defaultState)
  );
}
export type { GameState as State };
