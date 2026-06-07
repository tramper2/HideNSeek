import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameStore, useGameStore } from '../hooks/useGameStore';
import { hexToRgb, getDistance } from '../utils/colorHelper';

// Predefined patrol nodes (X, Z coordinate)
const PATROL_NODES: [number, number][] = [
  [8, 8],    // Sofa corner
  [-8, 8],   // South-West corner
  [-8, -8],  // Column corner
  [8, -8],   // North-East corner
  [0, 0],    // Center
];

const SEEKER_SPEED = 2.8;
const VISION_RANGE = 9.5;
const FOV_ANGLE = Math.PI / 3; // 60 degrees total FOV
const COLOR_THRESHOLD = 110; // Max distance is ~441. Lower means painting must be very close to match.

export const AISeeker: React.FC = () => {
  const seekerRef = useRef<THREE.Group>(null);
  
  // Patrol state
  const [currentNodeIdx, setCurrentNodeIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimer = useRef(0);
  const [currentYaw, setCurrentYaw] = useState(0);

  const status = useGameStore((state) => state.status);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isPlayerMoving = useGameStore((state) => state.isPlayerMoving);
  const playerAvgColor = useGameStore((state) => state.playerAvgColor);

  // Initialize and reset AI position on game status change
  useFrame((state, delta) => {
    if (status !== 'PLAYING' || !seekerRef.current) {
      if (status === 'START' && seekerRef.current) {
        // Position at north wait point
        seekerRef.current.position.set(0, 1.0, -4);
        seekerRef.current.rotation.set(0, 0, 0);
      }
      return;
    }

    if (gamePhase === 'HIDING') {
      seekerRef.current.position.set(0, 1.0, -4);
      seekerRef.current.rotation.set(0, 0, 0);
      gameStore.setState({
        isPlayerSpotted: false,
        detectionGauge: 0,
      });
      return;
    }

    const aiPos = seekerRef.current.position;
    const targetNode = PATROL_NODES[currentNodeIdx];
    const targetVec = new THREE.Vector3(targetNode[0], 1.0, targetNode[1]);
    
    // 1. Patrol Logic
    if (isPaused) {
      pauseTimer.current += delta;
      
      // Look around (sweep search effect) using sine wave
      const sweepAngle = Math.sin(state.clock.getElapsedTime() * 4.5) * 0.7;
      seekerRef.current.rotation.y = currentYaw + sweepAngle;

      if (pauseTimer.current >= 1.5) {
        setIsPaused(false);
        pauseTimer.current = 0;
        // Select next node sequentially
        setCurrentNodeIdx((prev) => (prev + 1) % PATROL_NODES.length);
      }
    } else {
      const distToTarget = aiPos.distanceTo(targetVec);
      
      if (distToTarget < 0.25) {
        setIsPaused(true);
        setCurrentYaw(seekerRef.current.rotation.y);
      } else {
        // Move towards target
        const dir = new THREE.Vector3().subVectors(targetVec, aiPos).normalize();
        aiPos.addScaledVector(dir, SEEKER_SPEED * delta);

        // Rotate to face travel direction
        const targetRotation = Math.atan2(dir.x, dir.z);
        seekerRef.current.rotation.y = THREE.MathUtils.lerp(
          seekerRef.current.rotation.y,
          targetRotation,
          10 * delta
        );
      }
    }

    // 2. Detection Logic (FOV & Line of Sight Check)
    const playerObj = state.scene.getObjectByName('Player');
    if (!playerObj) return;

    const playerPos = playerObj.position.clone();
    // Shift slightly upward to get torso/body center
    playerPos.y += 0.2; 
    
    const eyePos = aiPos.clone();
    eyePos.y += 0.3; // AI Seeker's head height

    const vecToPlayer = new THREE.Vector3().subVectors(playerPos, eyePos);
    const distToPlayer = vecToPlayer.length();

    let spotted = false;
    let backgroundHex = '#D1D5DB'; // default floor
    let currentDist = 0;

    // Check if player is within physical range
    if (distToPlayer <= VISION_RANGE) {
      // Calculate angle between AI's forward direction and vector to player
      const aiForward = new THREE.Vector3(0, 0, 1).applyQuaternion(seekerRef.current.quaternion);
      const angle = aiForward.angleTo(vecToPlayer.clone().normalize());

      if (angle <= FOV_ANGLE / 2) {
        // Line-of-sight raycasting check
        const raycaster = new THREE.Raycaster();
        raycaster.set(eyePos, vecToPlayer.clone().normalize());
        
        // Raycast against entire scene
        const intersects = raycaster.intersectObjects(state.scene.children, true);
        
        let firstObstacleHit: any = null;
        let isPlayerHit = false;
        let playerHitIndex = -1;

        // Traverse intersections to find the first valid hit
        for (let i = 0; i < intersects.length; i++) {
          const hit = intersects[i];
          const hitObj = hit.object;

          // Skip intersection with AI itself
          if (
            hitObj.name === 'AISeeker' || 
            hitObj.parent?.name === 'AISeeker' || 
            (hitObj.userData && hitObj.userData.isAI)
          ) {
            continue;
          }

          // Check if it's the player
          if (hitObj.userData && hitObj.userData.isPlayer) {
            isPlayerHit = true;
            playerHitIndex = i;
            break;
          }

          // Hit an obstacle/wall first
          firstObstacleHit = hit;
          break;
        }

        // Line of sight is clear if player is hit first
        if (isPlayerHit && !firstObstacleHit) {
          spotted = true;

          // Find background color behind the player
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

    // 3. Update game state based on detection
    const bgRGB = hexToRgb(backgroundHex);
    currentDist = getDistance(bgRGB, playerAvgColor);

    // Save Seeker state to store
    gameStore.setState({
      bgColor: bgRGB,
      colorDistance: currentDist,
      isPlayerSpotted: spotted,
    });

    const storeState = gameStore.getState();
    let gauge = storeState.detectionGauge;

    if (spotted) {
      if (isPlayerMoving) {
        // Moving in sight triggers rapid alert
        gauge += delta * 85; 
      } else {
        // Standing still: Alert climbs if color difference exceeds threshold
        if (currentDist > COLOR_THRESHOLD) {
          // Alert climb rate scales with color distance
          const scale = (currentDist - COLOR_THRESHOLD) / (441 - COLOR_THRESHOLD);
          gauge += delta * (15 + scale * 35);
        } else {
          // Successfully camouflaged: Alert gauge cools down
          gauge -= delta * 15;
        }
      }
    } else {
      // Out of sight: Alert cools down
      gauge -= delta * 20;
    }

    // Clamp gauge between 0 and 100
    gauge = Math.max(0, Math.min(100, gauge));
    gameStore.setState({ detectionGauge: gauge });

    // Trigger Game Over
    if (gauge >= 100) {
      gameStore.setGameOver();
    }
  });

  // Color variables for vision cone based on player spotted status
  const isPlayerSpotted = useGameStore((state) => state.isPlayerSpotted);
  const detectionGauge = useGameStore((state) => state.detectionGauge);

  // Spotlight color gradient: yellow/orange to bright red as alert rises
  const coneColor = isPlayerSpotted 
    ? (detectionGauge > 50 ? '#EF4444' : '#F59E0B') 
    : '#10B981'; // Green when calm / no player in sight

  return (
    <group ref={seekerRef} position={[0, 1.0, -4]} name="AISeeker" userData={{ isAI: true }}>
      {/* AI Body: Crimson cone/pyramid */}
      <mesh castShadow receiveShadow raycast={() => null}>
        <coneGeometry args={[0.55, 1.8, 4]} />
        <meshStandardMaterial color="#1E1B4B" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* AI Eye / Scanning visor (Glowing Crimson) */}
      <mesh position={[0, 0.4, 0.45]} raycast={() => null}>
        <boxGeometry args={[0.45, 0.12, 0.1]} />
        <meshStandardMaterial 
          color={isPlayerSpotted ? '#FF0000' : '#00FF88'} 
          emissive={isPlayerSpotted ? '#FF0000' : '#00FF88'} 
          emissiveIntensity={1.5} 
          roughness={0.1} 
        />
      </mesh>

      {/* Visual field of view: transparent spotlight cone projection */}
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
