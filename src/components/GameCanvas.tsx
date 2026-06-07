import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Environment } from './Environment';
import { Player } from './Player';
import { AISeeker } from './AISeeker';
import { useGameStore } from '../hooks/useGameStore';

export const GameCanvas: React.FC = () => {
  const status = useGameStore((state) => state.status);
  const controlsRef = useRef<any>(null);
  
  // Track if player is currently drawing to disable camera orbiting
  const [isPainting, setIsPainting] = useState(false);

  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: [0, 6, 8], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Sky/Atmosphere Color */}
        <color attach="background" args={['#0F172A']} />
        <fog attach="fog" args={['#0F172A', 15, 30]} />

        {/* Ambient illumination */}
        <ambientLight intensity={0.5} />

        {/* Key Directional Light for casting shadows */}
        <directionalLight
          castShadow
          position={[10, 15, 10]}
          intensity={1.0}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={40}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0001}
        />

        {/* Secondary soft fill light */}
        <directionalLight position={[-10, 8, -10]} intensity={0.3} color="#38BDF8" />

        {/* Subtle floor-bounce point light */}
        <pointLight position={[0, 4, 0]} intensity={0.4} distance={20} color="#FEF3C7" />

        {/* Environment Static Assets (Walls, Obstacles, Floor) */}
        <Environment />

        {/* Player Character */}
        <Player controlsRef={controlsRef} setIsPainting={setIsPainting} />

        {/* AI Seeker Seeker */}
        <AISeeker />

        {/* Camera orbital controller following the player */}
        <OrbitControls
          ref={controlsRef}
          enabled={!isPainting && status === 'PLAYING'}
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2.1} // Prevent camera from slipping under the floor
          target={[0, 0.9, 0]}
        />
      </Canvas>
    </div>
  );
};
export default GameCanvas;
