import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gameStore, useGameStore } from '../hooks/useGameStore';
import { getCanvasAverageColor, hexToRgb } from '../utils/colorHelper';

// Collision system constants
const ROOM_LIMIT = 11.5;

// ── Audio: coin collection sound
let coinAudioCtx: AudioContext | null = null;

function playCoinSound() {
  try {
    if (!coinAudioCtx) coinAudioCtx = new AudioContext();
    const ctx = coinAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext may not be available
  }
}

function checkCollision(x: number, z: number): boolean {
  // Room boundary collision
  if (Math.abs(x) > ROOM_LIMIT || Math.abs(z) > ROOM_LIMIT) return true;

  // Obstacle 1: Sofa (Box) [4, 4] size [4, 2] -> X range: [2, 6], Z range: [3, 5]
  // With radius expansion: X: [1.5, 6.5], Z: [2.5, 5.5]
  if (x >= 1.5 && x <= 6.5 && z >= 2.5 && z <= 5.5) return true;

  // Obstacle 2: Charcoal Box (Box) [5, -5] size [2, 2] -> X range: [4, 6], Z range: [-6, -4]
  // With radius expansion: X: [3.5, 6.5], Z: [-6.5, -3.5]
  if (x >= 3.5 && x <= 6.5 && z >= -6.5 && z <= -3.5) return true;

  // Obstacle 3: Forest Column (Cylinder) [-4, -4] radius 0.8 -> Collision distance = 0.8 + 0.5 = 1.3
  const distForest = Math.sqrt(Math.pow(x - (-4), 2) + Math.pow(z - (-4), 2));
  if (distForest < 1.3) return true;

  // Obstacle 4: Beige Column (Cylinder) [-5, 5] radius 0.6 -> Collision distance = 0.6 + 0.5 = 1.1
  const distBeige = Math.sqrt(Math.pow(x - (-5), 2) + Math.pow(z - 5, 2));
  if (distBeige < 1.1) return true;

  return false;
}

// Convert Hex to HSL color
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

interface PlayerProps {
  controlsRef: React.RefObject<any>;
  setIsPainting: (painting: boolean) => void;
}

export const Player: React.FC<PlayerProps> = ({ controlsRef, setIsPainting }) => {
  const playerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const lastUpdateRef = useRef<number>(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // ── React 상태 구독 (렌더링 트리거 목적)
  const status = useGameStore((state) => state.status);
  const uiMode = useGameStore((state) => state.uiMode);
  const brushColor = useGameStore((state) => state.brushColor);
  const brushBrightness = useGameStore((state) => state.brushBrightness);
  const brushSize = useGameStore((state) => state.brushSize);
  const isPlayerMoving = useGameStore((state) => state.isPlayerMoving);

  // ── Refs: 클로저 stale 문제 방지 — 이벤트 핸들러에서는 항상 이 ref를 참조
  const statusRef = useRef(status);
  const uiModeRef = useRef(uiMode);
  const brushColorRef = useRef(brushColor);
  const brushBrightnessRef = useRef(brushBrightness);
  const brushSizeRef = useRef(brushSize);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { uiModeRef.current = uiMode; }, [uiMode]);
  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushBrightnessRef.current = brushBrightness; }, [brushBrightness]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  const { camera, gl } = useThree();
  const isPaintingRef = useRef(false);

  // Key state listener
  const keys = useRef({ w: false, a: false, s: false, d: false });

  // Keyboard input setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING') return;
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') keys.current.w = true;
      if (key === 'a' || e.key === 'ArrowLeft') keys.current.a = true;
      if (key === 's' || e.key === 'ArrowDown') keys.current.s = true;
      if (key === 'd' || e.key === 'ArrowRight') keys.current.d = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') keys.current.w = false;
      if (key === 'a' || e.key === 'ArrowLeft') keys.current.a = false;
      if (key === 's' || e.key === 'ArrowDown') keys.current.s = false;
      if (key === 'd' || e.key === 'ArrowRight') keys.current.d = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Create painting canvas (한 번만 생성)
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 512, 512);
    }
    return c;
  }, []);

  // Set initial store average color
  useEffect(() => {
    const avg = getCanvasAverageColor(canvas);
    gameStore.setState({ playerAvgColor: avg });
  }, [canvas]);

  // Memoize CanvasTexture to prevent recreating it on every component render
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [canvas]);

  // Force texture reset on game start
  useEffect(() => {
    if (status === 'PLAYING') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);
      }
      texture.needsUpdate = true;
      gameStore.setState({ playerAvgColor: { r: 255, g: 255, b: 255 } });
      if (playerRef.current) {
        playerRef.current.position.set(0, 0.9, 4);
        playerRef.current.rotation.set(0, Math.PI, 0); // Face towards center of the room
      }
    }
  }, [status, canvas, texture]);

  // Calculate and update canvas average color
  const updateAverageColor = (force = false) => {
    const now = performance.now();
    if (force || now - lastUpdateRef.current > 150) {
      lastUpdateRef.current = now;
      const avg = getCanvasAverageColor(canvas);
      gameStore.setState({ playerAvgColor: avg });
    }
  };

  // ── 실제 캔버스에 원 하나를 그리는 순수 함수
  const paintDot = (uvX: number, uvY: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = uvX * canvas.width;
    const y = (1 - uvY) * canvas.height;
    const radius = brushSizeRef.current * 120;
    const hsl = hexToHsl(brushColorRef.current);

    ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${brushBrightnessRef.current * 100}%)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    texture.needsUpdate = true;
    updateAverageColor();
  };

  // ── 수동 Raycaster 기반 페인팅 (R3F 포인터 이벤트 대신 DOM 이벤트 사용)
  useEffect(() => {
    const domElement = gl.domElement;

    const getNDC = (e: PointerEvent) => {
      const rect = domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const tryPaint = (e: PointerEvent) => {
      if (!meshRef.current) return false;
      const ndc = getNDC(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(meshRef.current);
      if (hits.length > 0 && hits[0].uv) {
        paintDot(hits[0].uv.x, hits[0].uv.y);
        return true;
      }
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (statusRef.current !== 'PLAYING' || uiModeRef.current !== 'PAINT') return;
      const painted = tryPaint(e);
      if (painted) {
        isPaintingRef.current = true;
        setIsPainting(true);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPaintingRef.current || uiModeRef.current !== 'PAINT') return;
      tryPaint(e);
    };

    const onPointerUp = () => {
      if (isPaintingRef.current) {
        isPaintingRef.current = false;
        setIsPainting(false);
        updateAverageColor(true);
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    // 마우스가 캔버스 밖에서 떼어질 때 대비
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, raycaster, setIsPainting]);

  // Frame tick updates: Movement and Camera Follow
  useFrame((r3fState, delta) => {
    if (!playerRef.current || statusRef.current !== 'PLAYING') return;

    // 1. Rotation Calculations (A/D keys rotate player)
    const rotationSpeed = 3.0; // rad/s
    if (keys.current.a) {
      playerRef.current.rotation.y += rotationSpeed * delta;
    }
    if (keys.current.d) {
      playerRef.current.rotation.y -= rotationSpeed * delta;
    }

    // 2. Movement Calculations (W/S keys move player relative to local forward direction)
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRef.current.quaternion);
    forward.y = 0; // Lock movement to XZ plane
    forward.normalize();

    const moveDirection = new THREE.Vector3();
    if (keys.current.w) {
      moveDirection.add(forward);
    }
    if (keys.current.s) {
      moveDirection.sub(forward);
    }

    const isMoving = moveDirection.lengthSq() > 0;
    if (isMoving !== isPlayerMoving) {
      gameStore.setState({ isPlayerMoving: isMoving });
    }

    if (isMoving) {
      moveDirection.normalize();
      const speed = 4.5;
      const step = speed * delta;

      const newPos = playerRef.current.position.clone();

      const tryX = newPos.x + moveDirection.x * step;
      if (!checkCollision(tryX, newPos.z)) {
        newPos.x = tryX;
      }

      const tryZ = newPos.z + moveDirection.z * step;
      if (!checkCollision(newPos.x, tryZ)) {
        newPos.z = tryZ;
      }

      playerRef.current.position.copy(newPos);
    }

    // 2. Camera Tracking lock
    if (controlsRef.current) {
      controlsRef.current.target.copy(playerRef.current.position);
      controlsRef.current.update();
    }

    // 3. Coin collection — 플레이어 위치와 미수집 동전 거리 체크
    const coinGroup = r3fState.scene.getObjectByName('Coins');
    if (coinGroup) {
      const playerPos = playerRef.current.position;
      coinGroup.children.forEach((coinMesh: THREE.Object3D) => {
        if (!coinMesh.userData.isCoin) return;
        const coinIdx = coinMesh.userData.coinIndex as number;
        if (coinIdx < gameStore.getState().coinsCollected) return;
        const dist = playerPos.distanceTo(coinMesh.position);
        if (dist < 1.2) {
          gameStore.collectCoin();
          playCoinSound();
        }
      });
    }
  });

  return (
    <group ref={playerRef} position={[0, 0.9, 4]} name="Player">
      {/* Player character visual geometry: Capsule mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        userData={{ isPlayer: true }}
      >
        <capsuleGeometry args={[0.4, 1.0, 8, 16]} />
        <meshStandardMaterial map={texture} roughness={0.6} />
      </mesh>

      {/* Decorative Visor/Eyes to show front direction */}
      <mesh position={[0, 0.5, 0.35]}>
        <boxGeometry args={[0.5, 0.15, 0.1]} />
        <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};
