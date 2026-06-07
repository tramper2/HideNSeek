import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gameStore, useGameStore } from '../hooks/useGameStore';
import { getCanvasAverageColor, hexToRgb } from '../utils/colorHelper';

// Collision system constants
const ROOM_LIMIT = 11.5;

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
  const lastUpdateRef = useRef<number>(0);
  
  const status = useGameStore((state) => state.status);
  const uiMode = useGameStore((state) => state.uiMode);
  const brushColor = useGameStore((state) => state.brushColor);
  const brushBrightness = useGameStore((state) => state.brushBrightness);
  const brushSize = useGameStore((state) => state.brushSize);
  const isPlayerMoving = useGameStore((state) => state.isPlayerMoving);

  const { camera } = useThree();
  const isPaintingRef = useRef(false);

  // Key state listener
  const keys = useRef({ w: false, a: false, s: false, d: false });

  // Keyboard input setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PLAYING') return;
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
  }, [status]);

  // Create painting canvas
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'; // Start white
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

  // Force texture recalculation on game reset/status change
  useEffect(() => {
    if (status === 'PLAYING') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);
      }
      if (texture) {
        texture.needsUpdate = true;
      }
      gameStore.setState({ playerAvgColor: { r: 255, g: 255, b: 255 } });
      if (playerRef.current) {
        playerRef.current.position.set(0, 0.9, 4); // Reset position
      }
    }
  }, [status, canvas]);

  // Calculate and update canvas average color
  const updateAverageColor = (force = false) => {
    const now = performance.now();
    if (force || now - lastUpdateRef.current > 150) {
      lastUpdateRef.current = now;
      const avg = getCanvasAverageColor(canvas);
      gameStore.setState({ playerAvgColor: avg });
    }
  };

  // Paint texture on drag
  const drawOnTexture = (e: any) => {
    e.stopPropagation();
    if (!isPaintingRef.current || !e.uv || uiMode !== 'PAINT') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const u = e.uv.x;
    const v = e.uv.y;
    const x = u * canvas.width;
    const y = (1 - v) * canvas.height;

    // Brush radius
    const radius = brushSize * 120; // 0.05 -> 6px, 0.15 -> 18px, 0.3 -> 36px
    const hsl = hexToHsl(brushColor);
    
    ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${brushBrightness * 100}%)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (texture) {
      texture.needsUpdate = true;
    }

    updateAverageColor();
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (status !== 'PLAYING' || uiMode !== 'PAINT') return;
    isPaintingRef.current = true;
    setIsPainting(true); // Disable OrbitControls
  };

  // Global mouse up event listener to cancel paint drag safely
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPaintingRef.current) {
        isPaintingRef.current = false;
        setIsPainting(false); // Enable OrbitControls
        updateAverageColor(true); // Final force update
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [setIsPainting, canvas]);

  // Frame tick updates: Movement and Camera Follow
  useFrame((_, delta) => {
    if (!playerRef.current || status !== 'PLAYING') return;

    // 1. Movement Calculations relative to Camera
    const moveX = (keys.current.d ? 1 : 0) - (keys.current.a ? 1 : 0);
    const moveZ = (keys.current.s ? 1 : 0) - (keys.current.w ? 1 : 0);

    const isMoving = moveX !== 0 || moveZ !== 0;
    if (isMoving !== isPlayerMoving) {
      gameStore.setState({ isPlayerMoving: isMoving });
    }

    if (isMoving) {
      // Get camera forward and right directions projected to horizontal plane
      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camForward.y = 0;
      camForward.normalize();

      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      camRight.y = 0;
      camRight.normalize();

      // Desired movement direction vector
      const moveDirection = new THREE.Vector3()
        .addScaledVector(camRight, moveX)
        .addScaledVector(camForward, moveZ)
        .normalize();

      const speed = 4.5; // Units per second
      const step = speed * delta;

      const newPos = playerRef.current.position.clone();
      
      // Slide physics (try moving along X axis first, then Z axis)
      const tryX = newPos.x + moveDirection.x * step;
      if (!checkCollision(tryX, newPos.z)) {
        newPos.x = tryX;
      }
      
      const tryZ = newPos.z + moveDirection.z * step;
      if (!checkCollision(newPos.x, tryZ)) {
        newPos.z = tryZ;
      }

      playerRef.current.position.copy(newPos);

      // Rotate player to face movement direction smoothly
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      playerRef.current.rotation.y = THREE.MathUtils.lerp(
        playerRef.current.rotation.y,
        targetRotation,
        15 * delta
      );
    }

    // 2. Camera Tracking lock
    if (controlsRef.current) {
      // OrbitControls target matches player pos
      controlsRef.current.target.copy(playerRef.current.position);
      controlsRef.current.update();
    }
  });

  return (
    <group ref={playerRef} position={[0, 0.9, 4]} name="Player">
      {/* Player character visual geometry: Capsule mesh */}
      <mesh
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={drawOnTexture}
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
