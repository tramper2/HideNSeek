import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';

// 동전 배치 위치 (장애물/벽과 겹치지 않는 전략적 위치)
const COIN_POSITIONS: [number, number, number][] = [
  [9, 0.5, 9],
  [-9, 0.5, 9],
  [9, 0.5, -9],
  [-9, 0.5, -9],
  [0, 0.5, 0],
  [-2, 0.5, 7],
  [7, 0.5, -2],
];

function Coin({ position, index }: { position: [number, number, number]; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coinsCollected = useGameStore((s) => s.coinsCollected);

  // 수집된 동전은 렌더링하지 않음
  if (index < coinsCollected) return null;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Y축 회전 애니메이션
    meshRef.current.rotation.y += delta * 2;
    // 위아래 살짝 떠다니는 효과
    meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.003 + index) * 0.1;
  });

  return (
    <mesh ref={meshRef} position={position} userData={{ isCoin: true, coinIndex: index }}>
      <cylinderGeometry args={[0.3, 0.3, 0.08, 16]} />
      <meshStandardMaterial
        color="#FBBF24"
        emissive="#F59E0B"
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

export const Coins: React.FC = () => {
  const status = useGameStore((s) => s.status);
  const coinsTotal = useGameStore((s) => s.coinsTotal);

  if (status !== 'PLAYING') return null;

  return (
    <group name="Coins">
      {COIN_POSITIONS.slice(0, coinsTotal).map((pos, i) => (
        <Coin key={i} position={pos} index={i} />
      ))}
    </group>
  );
};
