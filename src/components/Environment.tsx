import React from 'react';

export interface ObstacleInfo {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  type: 'box' | 'cylinder';
  name: string;
}

export const obstacles: ObstacleInfo[] = [
  // Red Sofa
  {
    name: 'Sofa',
    type: 'box',
    position: [4, 0.75, 4],
    size: [4, 1.5, 2],
    color: '#991B1B',
  },
  // Forest Green Column
  {
    name: 'Forest Column',
    type: 'cylinder',
    position: [-4, 2, -4],
    size: [0.8, 0.8, 4], // radiusTop, radiusBottom, height
    color: '#065F46',
  },
  // Charcoal Box / Crate
  {
    name: 'Charcoal Box',
    type: 'box',
    position: [5, 1, -5],
    size: [2, 2, 2],
    color: '#1F2937',
  },
  // Beige Column
  {
    name: 'Beige Column',
    type: 'cylinder',
    position: [-5, 1.5, 5],
    size: [0.6, 0.6, 3],
    color: '#FEF3C7',
  }
];

export const Environment: React.FC = () => {
  const wallHeight = 5;
  const roomSize = 24; // 24x24 units room
  const halfSize = roomSize / 2;

  return (
    <group name="Environment">
      {/* Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]} 
        receiveShadow
        userData={{ color: '#D1D5DB' }}
      >
        <planeGeometry args={[roomSize, roomSize]} />
        <meshStandardMaterial color="#D1D5DB" roughness={0.8} />
      </mesh>

      {/* Grid helper on the floor for visual styling */}
      <gridHelper args={[roomSize, 24, '#4B5563', '#9CA3AF']} position={[0, 0.01, 0]} material-opacity={0.35} material-transparent />

      {/* Walls with color codes */}
      {/* North Wall: Beige (#FEF3C7) */}
      <mesh 
        position={[0, wallHeight / 2, -halfSize]} 
        receiveShadow
        castShadow
        userData={{ color: '#FEF3C7' }}
      >
        <boxGeometry args={[roomSize, wallHeight, 0.5]} />
        <meshStandardMaterial color="#FEF3C7" roughness={0.5} />
      </mesh>

      {/* South Wall: Mint (#D1FAE5) */}
      <mesh 
        position={[0, wallHeight / 2, halfSize]} 
        receiveShadow
        castShadow
        userData={{ color: '#D1FAE5' }}
      >
        <boxGeometry args={[roomSize, wallHeight, 0.5]} />
        <meshStandardMaterial color="#D1FAE5" roughness={0.5} />
      </mesh>

      {/* East Wall: Indigo (#E0E7FF) */}
      <mesh 
        position={[halfSize, wallHeight / 2, 0]} 
        rotation={[0, -Math.PI / 2, 0]} 
        receiveShadow
        castShadow
        userData={{ color: '#E0E7FF' }}
      >
        <boxGeometry args={[roomSize, wallHeight, 0.5]} />
        <meshStandardMaterial color="#E0E7FF" roughness={0.5} />
      </mesh>

      {/* West Wall: Slate/Charcoal (#1F2937) */}
      <mesh 
        position={[-halfSize, wallHeight / 2, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
        receiveShadow
        castShadow
        userData={{ color: '#1F2937' }}
      >
        <boxGeometry args={[roomSize, wallHeight, 0.5]} />
        <meshStandardMaterial color="#1F2937" roughness={0.5} />
      </mesh>

      {/* Obstacles */}
      {obstacles.map((obs, index) => {
        if (obs.type === 'box') {
          return (
            <mesh
              key={index}
              position={obs.position}
              castShadow
              receiveShadow
              userData={{ color: obs.color, isObstacle: true }}
            >
              <boxGeometry args={obs.size} />
              <meshStandardMaterial color={obs.color} roughness={0.7} metalness={0.1} />
            </mesh>
          );
        } else {
          const [rTop, rBot, height] = obs.size;
          return (
            <mesh
              key={index}
              position={obs.position}
              castShadow
              receiveShadow
              userData={{ color: obs.color, isObstacle: true }}
            >
              <cylinderGeometry args={[rTop, rBot, height, 16]} />
              <meshStandardMaterial color={obs.color} roughness={0.7} metalness={0.1} />
            </mesh>
          );
        }
      })}
    </group>
  );
};
