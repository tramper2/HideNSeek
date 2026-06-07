import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { createPortal } from 'react-dom';
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

export const SeekerMinimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scene } = useThree();
  const status = useGameStore((s) => s.status);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const seekerCount = useGameStore((s) => s.seekerCount);
  const isPlayerSpotted = useGameStore((s) => s.isPlayerSpotted);

  useFrame(() => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'PLAYING' || gamePhase !== 'SEEKING') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = MAP_SIZE;
    const h = MAP_SIZE;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Room boundary
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= ROOM_SIZE; i += 4) {
      const [x] = toMap(i - ROOM_SIZE / 2, 0);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(w, x); ctx.stroke();
    }

    // Obstacles (simplified rectangles)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
    // Sofa [4, 4] size [4, 2]
    drawObstacle(ctx, 4, 4, 4, 2);
    // Charcoal Box [5, -5] size [2, 2]
    drawObstacle(ctx, 5, -5, 2, 2);

    // Get player position
    const playerObj = scene.getObjectByName('Player');
    const playerPos = playerObj ? playerObj.position : null;

    // Draw each seeker
    for (let i = 0; i < seekerCount; i++) {
      const seeker = scene.getObjectByName(`AISeeker-${i}`);
      if (!seeker) continue;

      const sx = seeker.position.x;
      const sz = seeker.position.z;
      const [mx, my] = toMap(sx, sz);

      // FOV cone
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(seeker.quaternion);
      const facingAngle = Math.atan2(forward.x, forward.z);
      const halfFov = FOV_ANGLE / 2;
      const rangePx = VISION_RANGE * SCALE;

      // Determine if this seeker can see the player
      let thisSeekerSees = false;
      if (playerPos) {
        const dx = playerPos.x - sx;
        const dz = playerPos.z - sz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const angleToPlayer = Math.atan2(dx, dz);
        const angleDiff = Math.abs(normalizeAngle(angleToPlayer - facingAngle));
        thisSeekerSees = dist <= VISION_RANGE && angleDiff <= halfFov;
      }

      // Draw FOV cone
      const coneColor = thisSeekerSees
        ? 'rgba(239, 68, 68, 0.25)'
        : 'rgba(148, 163, 184, 0.1)';
      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.arc(mx, my, rangePx, -facingAngle - halfFov + Math.PI / 2, -facingAngle + halfFov + Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      // FOV outline
      ctx.strokeStyle = thisSeekerSees
        ? 'rgba(239, 68, 68, 0.5)'
        : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.arc(mx, my, rangePx, -facingAngle - halfFov + Math.PI / 2, -facingAngle + halfFov + Math.PI / 2);
      ctx.closePath();
      ctx.stroke();

      // Seeker dot
      ctx.fillStyle = thisSeekerSees ? '#EF4444' : '#6366F1';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();

      // Seeker direction indicator
      ctx.strokeStyle = thisSeekerSees ? '#EF4444' : '#818CF8';
      ctx.lineWidth = 2;
      const dirLen = 12;
      const dirX = mx + Math.sin(facingAngle) * (-dirLen);
      const dirY = my - Math.cos(facingAngle) * (-dirLen);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(dirX, dirY);
      ctx.stroke();
    }

    // Draw player
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
  });

  if (status !== 'PLAYING' || gamePhase !== 'SEEKING') return null;

  return createPortal(
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
    </div>,
    document.body
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
