import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';

const ROOM_SIZE = 24;
const MAP_SIZE = 200;
const SCALE = MAP_SIZE / ROOM_SIZE; // pixels per world unit
const OFFSET = MAP_SIZE / 2; // center offset

// Convert world XZ to minimap XY
function toMap(worldX: number, worldZ: number): [number, number] {
  return [worldX * SCALE + OFFSET, worldZ * SCALE + OFFSET];
}

const FOV_ANGLE = Math.PI / 3; // 60°
const VISION_RANGE = 9.5;

// Shared data structure for 3D state tracking to 2D UI translation
export const globalMinimapData = {
  playerPos: null as { x: number; z: number } | null,
  seekerPosList: [] as { x: number; z: number; facingAngle: number }[],
};

// ── 3D tracking component (Must be rendered inside R3F <Canvas>)
export const MinimapTracker: React.FC = () => {
  const status = useGameStore((s) => s.status);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const seekerCount = useGameStore((s) => s.seekerCount);

  useFrame((state) => {
    if (status !== 'PLAYING' || gamePhase !== 'SEEKING') return;

    // Track Player Position
    const playerObj = state.scene.getObjectByName('Player');
    if (playerObj) {
      globalMinimapData.playerPos = {
        x: playerObj.position.x,
        z: playerObj.position.z,
      };
    } else {
      globalMinimapData.playerPos = null;
    }

    // Track Seeker Positions and Orientation Angles
    const seekerList = [];
    for (let i = 0; i < seekerCount; i++) {
      const seeker = state.scene.getObjectByName(`AISeeker-${i}`);
      if (seeker) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(seeker.quaternion);
        const facingAngle = Math.atan2(forward.x, forward.z);
        seekerList.push({
          x: seeker.position.x,
          z: seeker.position.z,
          facingAngle,
        });
      }
    }
    globalMinimapData.seekerPosList = seekerList;
  });

  return null;
};

// ── 2D HUD Minimap component (Rendered outside <Canvas> in DOM layer)
export const SeekerMinimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useGameStore((s) => s.status);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const isPlayerSpotted = useGameStore((s) => s.isPlayerSpotted);

  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (canvas && status === 'PLAYING' && gamePhase === 'SEEKING') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = MAP_SIZE;
          const h = MAP_SIZE;

          // Clear previous canvas
          ctx.clearRect(0, 0, w, h);

          // Draw Background panel
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(0, 0, w, h);

          // Draw Room boundaries
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, w, h);

          // Draw Grid
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
          ctx.lineWidth = 0.5;
          for (let i = 0; i <= ROOM_SIZE; i += 4) {
            const [x] = toMap(i - ROOM_SIZE / 2, 0);
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(w, x); ctx.stroke();
          }

          // Draw Obstacles (Sofa & Crate)
          ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
          drawObstacle(ctx, 4, 4, 4, 2);   // Sofa
          drawObstacle(ctx, 5, -5, 2, 2);  // Charcoal Box

          // Get latest coordinate updates
          const playerPos = globalMinimapData.playerPos;
          const seekerPosList = globalMinimapData.seekerPosList;

          // Render each Seeker
          seekerPosList.forEach((seeker) => {
            const sx = seeker.x;
            const sz = seeker.z;
            const [mx, my] = toMap(sx, sz);

            const facingAngle = seeker.facingAngle;
            const halfFov = FOV_ANGLE / 2;
            const rangePx = VISION_RANGE * SCALE;

            // Check if player is detected by this seeker
            let thisSeekerSees = false;
            if (playerPos) {
              const dx = playerPos.x - sx;
              const dz = playerPos.z - sz;
              const dist = Math.sqrt(dx * dx + dz * dz);
              const angleToPlayer = Math.atan2(dx, dz);
              const angleDiff = Math.abs(normalizeAngle(angleToPlayer - facingAngle));
              thisSeekerSees = dist <= VISION_RANGE && angleDiff <= halfFov;
            }

            // Draw FOV cone shape
            const coneColor = thisSeekerSees
              ? 'rgba(239, 68, 68, 0.25)'
              : 'rgba(148, 163, 184, 0.1)';
            ctx.fillStyle = coneColor;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.arc(mx, my, rangePx, -facingAngle - halfFov + Math.PI / 2, -facingAngle + halfFov + Math.PI / 2);
            ctx.closePath();
            ctx.fill();

            // Draw FOV boundary lines
            ctx.strokeStyle = thisSeekerSees
              ? 'rgba(239, 68, 68, 0.5)'
              : 'rgba(148, 163, 184, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.arc(mx, my, rangePx, -facingAngle - halfFov + Math.PI / 2, -facingAngle + halfFov + Math.PI / 2);
            ctx.closePath();
            ctx.stroke();

            // Seeker center indicator dot
            ctx.fillStyle = thisSeekerSees ? '#EF4444' : '#6366F1';
            ctx.beginPath();
            ctx.arc(mx, my, 5, 0, Math.PI * 2);
            ctx.fill();

            // Seeker direction nose indicator
            ctx.strokeStyle = thisSeekerSees ? '#EF4444' : '#818CF8';
            ctx.lineWidth = 2;
            const dirLen = 12;
            const dirX = mx + Math.sin(facingAngle) * (-dirLen);
            const dirY = my - Math.cos(facingAngle) * (-dirLen);
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(dirX, dirY);
            ctx.stroke();
          });

          // Render Player indicator dot
          if (playerPos) {
            const [px, py] = toMap(playerPos.x, playerPos.z);
            ctx.fillStyle = isPlayerSpotted ? '#FBBF24' : '#10B981';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    if (status === 'PLAYING' && gamePhase === 'SEEKING') {
      animId = requestAnimationFrame(renderLoop);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, gamePhase, isPlayerSpotted]);

  if (status !== 'PLAYING' || gamePhase !== 'SEEKING') return null;

  return (
    <div className="minimap-container">
      <div className="minimap-label">🕵️ 술래 시야</div>
      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        className="minimap-canvas"
      />
      <div className="minimap-legend">
        <span><b style={{ color: '#10B981' }}>●</b> 나</span>
        <span><b style={{ color: '#6366F1' }}>●</b> 술래</span>
        <span><b style={{ color: '#EF4444' }}>◐</b> 발견</span>
      </div>
    </div>
  );
};

function drawObstacle(ctx: CanvasRenderingContext2D, cx: number, cz: number, sx: number, sz: number) {
  const [x, z] = toMap(cx - sx / 2, cz - sz / 2);
  ctx.fillRect(x, z, sx * SCALE, sz * SCALE);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
