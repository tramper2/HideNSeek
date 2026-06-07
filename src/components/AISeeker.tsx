import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameStore, useGameStore } from '../hooks/useGameStore';
import { hexToRgb, getDistance } from '../utils/colorHelper';

// Predefined patrol nodes (X, Z coordinate)
const PATROL_NODES: [number, number][] = [
  [8, 8],    // Sofa corner
  [-8, 8],   // South-West corner
  [-8, -8],  // Column corner
  [8, -8],  // North-East corner
  [0, 0],    // Center
];

// Different starting positions per seeker index
const START_POSITIONS: [number, number, number][] = [
  [0, 1.0, -4],
  [-6, 1.0, 6],
  [6, 1.0, 6],
];

// Offset patrol routes per seeker so they spread out
const PATROL_OFFSETS: number[] = [0, 2, 4]; // Starting node index offset

const SEEKER_SPEED = 2.8;
const VISION_RANGE = 9.5;
const FOV_ANGLE = Math.PI / 3; // 60 degrees total FOV
const COLOR_THRESHOLD = 110; // 색상 거리가 이 값 이하면 위장 성공으로 판정

// ── Audio: spotted alert sound using Web Audio API
let audioCtx: AudioContext | null = null;

function playSpottedSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;

    // Two-tone alarm beep
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(660, now, 0.15);
    playTone(880, now + 0.18, 0.15);
    playTone(1100, now + 0.36, 0.25);
  } catch {
    // AudioContext may not be available
  }
}

interface AISeekerProps {
  index: number;
}

export const AISeeker: React.FC<AISeekerProps> = ({ index }) => {
  const seekerRef = useRef<THREE.Group>(null);

  // Patrol state
  const [currentNodeIdx, setCurrentNodeIdx] = useState(PATROL_OFFSETS[index] ?? 0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimer = useRef(0);
  const [currentYaw, setCurrentYaw] = useState(0);

  // Track per-seeker spotted state for stopping + audio
  const mySpottedRef = useRef(false);
  const wasSpottedRef = useRef(false);

  const status = useGameStore((state) => state.status);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isPlayerMoving = useGameStore((state) => state.isPlayerMoving);
  const playerAvgColor = useGameStore((state) => state.playerAvgColor);
  const isPlayerSpotted = useGameStore((state) => state.isPlayerSpotted);

  const startPos = START_POSITIONS[index] ?? START_POSITIONS[0];

  // Reset state on game start
  useEffect(() => {
    mySpottedRef.current = false;
    wasSpottedRef.current = false;
    setCurrentNodeIdx(PATROL_OFFSETS[index] ?? 0);
    setIsPaused(false);
    pauseTimer.current = 0;
  }, [status, index]);

  useFrame((state, delta) => {
    // store에서 직접 읽어서 stale React state 문제 방지
    const currentStatus = gameStore.getState().status;
    if (currentStatus !== 'PLAYING' || !seekerRef.current) {
      if (currentStatus === 'START' && seekerRef.current) {
        seekerRef.current.position.set(...startPos);
        seekerRef.current.rotation.set(0, 0, 0);
      }
      return;
    }

    if (gamePhase === 'HIDING') {
      seekerRef.current.position.set(...startPos);
      seekerRef.current.rotation.set(0, 0, 0);
      mySpottedRef.current = false;
      wasSpottedRef.current = false;
      // Only first seeker resets the global detection state
      if (index === 0) {
        gameStore.setState({
          isPlayerSpotted: false,
          detectionGauge: 0,
        });
      }
      return;
    }

    const aiPos = seekerRef.current.position;

    // ── Detection Logic (runs before movement so spotted state is current)
    const playerObj = state.scene.getObjectByName('Player');
    let spotted = false;
    let backgroundHex = '#D1D5DB';
    let currentDist = 0;

    if (playerObj) {
      const playerPos = playerObj.position.clone();
      playerPos.y += 0.2;

      const eyePos = aiPos.clone();
      eyePos.y += 0.3;

      const vecToPlayer = new THREE.Vector3().subVectors(playerPos, eyePos);
      const distToPlayer = vecToPlayer.length();

      if (distToPlayer <= VISION_RANGE) {
        const aiForward = new THREE.Vector3(0, 0, 1).applyQuaternion(seekerRef.current.quaternion);
        const angle = aiForward.angleTo(vecToPlayer.clone().normalize());

        if (angle <= FOV_ANGLE / 2) {
          const raycaster = new THREE.Raycaster();
          raycaster.set(eyePos, vecToPlayer.clone().normalize());
          const intersects = raycaster.intersectObjects(state.scene.children, true);

          let firstObstacleHit: any = null;
          let isPlayerHit = false;
          let playerHitIndex = -1;

          for (let i = 0; i < intersects.length; i++) {
            const hit = intersects[i];
            const hitObj = hit.object;

            if (
              hitObj.name === 'AISeeker' ||
              hitObj.parent?.name === 'AISeeker' ||
              (hitObj.userData && hitObj.userData.isAI)
            ) continue;

            if (hitObj.userData && hitObj.userData.isPlayer) {
              isPlayerHit = true;
              playerHitIndex = i;
              break;
            }

            firstObstacleHit = hit;
            break;
          }

          if (isPlayerHit && !firstObstacleHit) {
            spotted = true;
            for (let j = playerHitIndex + 1; j < intersects.length; j++) {
              const bgObj = intersects[j].object;
              if (bgObj.userData && bgObj.userData.color) {
                backgroundHex = bgObj.userData.color;
                break;
              }
            }
          }
        }
      }
    }

    // ── Audio: play sound on first spotted transition
    if (spotted && !wasSpottedRef.current) {
      playSpottedSound();
    }
    wasSpottedRef.current = spotted;
    mySpottedRef.current = spotted;

    // ── Gauge accumulation
    const bgRGB = hexToRgb(backgroundHex);
    currentDist = getDistance(bgRGB, playerAvgColor);

    const storeState = gameStore.getState();
    let gauge = storeState.detectionGauge;

    if (spotted) {
      if (isPlayerMoving) {
        // 이동 중 = 위장 무효, 항상 급격히 상승
        gauge += delta * 85;
      } else if (currentDist > COLOR_THRESHOLD) {
        // 정지 + 위장 실패 = 색상 차이에 비례하여 상승
        const scale = (currentDist - COLOR_THRESHOLD) / (441 - COLOR_THRESHOLD);
        gauge += delta * (15 + scale * 35);
      } else {
        // 정지 + 위장 성공 = 술래가 구별 못함! 게이지 감소
        gauge -= delta * 15;
      }
    } else if (index === 0) {
      // 시야 밖 = 쿨다운 (첫 번째 술래만)
      gauge -= delta * 20;
    }

    gauge = Math.max(0, Math.min(100, gauge));

    // ── 모든 상태 업데이트를 한 번에 통합 (리렌더링 최소화)
    const update: Record<string, any> = {
      bgColor: bgRGB,
      colorDistance: currentDist,
      detectionGauge: gauge,
    };

    if (index === 0) {
      update.isPlayerSpotted = spotted;
    } else if (spotted) {
      update.isPlayerSpotted = true;
    }

    gameStore.setState(update);

    if (gauge >= 100 && gameStore.getState().status === 'PLAYING') {
      gameStore.setGameOver();
      return;
    }

    // ── Movement: STOP when this seeker spotted the player
    if (spotted && playerObj) {
      // Face the player but don't move
      const playerPos = playerObj.position.clone();
      const dirToPlayer = new THREE.Vector3().subVectors(playerPos, aiPos);
      dirToPlayer.y = 0;
      const targetRotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      seekerRef.current.rotation.y = THREE.MathUtils.lerp(
        seekerRef.current.rotation.y,
        targetRotation,
        10 * delta
      );
      return;
    }

    // ── Patrol Logic (normal movement when not spotting)
    const targetNode = PATROL_NODES[currentNodeIdx];
    const targetVec = new THREE.Vector3(targetNode[0], 1.0, targetNode[1]);

    if (isPaused) {
      pauseTimer.current += delta;
      const sweepAngle = Math.sin(state.clock.getElapsedTime() * 4.5) * 0.7;
      seekerRef.current.rotation.y = currentYaw + sweepAngle;

      if (pauseTimer.current >= 1.5) {
        setIsPaused(false);
        pauseTimer.current = 0;
        setCurrentNodeIdx((prev) => (prev + 1) % PATROL_NODES.length);
      }
    } else {
      const distToTarget = aiPos.distanceTo(targetVec);

      if (distToTarget < 0.25) {
        setIsPaused(true);
        setCurrentYaw(seekerRef.current.rotation.y);
      } else {
        const dir = new THREE.Vector3().subVectors(targetVec, aiPos).normalize();
        aiPos.addScaledVector(dir, SEEKER_SPEED * delta);
        const targetRotation = Math.atan2(dir.x, dir.z);
        seekerRef.current.rotation.y = THREE.MathUtils.lerp(
          seekerRef.current.rotation.y,
          targetRotation,
          10 * delta
        );
      }
    }
  });

  const detectionGauge = useGameStore((s) => s.detectionGauge);

  // Color for vision cone
  const coneColor = isPlayerSpotted
    ? (detectionGauge > 50 ? '#EF4444' : '#F59E0B')
    : '#10B981';

  return (
    <group ref={seekerRef} position={[...startPos]} name={`AISeeker-${index}`} userData={{ isAI: true }}>
      {/* AI Body */}
      <mesh castShadow receiveShadow raycast={() => null}>
        <coneGeometry args={[0.55, 1.8, 4]} />
        <meshStandardMaterial color="#1E1B4B" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* AI Eye visor */}
      <mesh position={[0, 0.4, 0.45]} raycast={() => null}>
        <boxGeometry args={[0.45, 0.12, 0.1]} />
        <meshStandardMaterial
          color={isPlayerSpotted ? '#FF0000' : '#00FF88'}
          emissive={isPlayerSpotted ? '#FF0000' : '#00FF88'}
          emissiveIntensity={1.5}
          roughness={0.1}
        />
      </mesh>

      {/* Vision cone */}
      <mesh position={[0, -0.6, 2.8]} rotation={[Math.PI / 3.8, 0, 0]} raycast={() => null}>
        <coneGeometry args={[3.2, 7.5, 16, 1, true]} />
        <meshBasicMaterial
          color={coneColor}
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
