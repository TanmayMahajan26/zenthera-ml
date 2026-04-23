import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const DnaStrand = ({ position, rotation, color }: { position: [number, number, number], rotation: [number, number, number], color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const points = 20;
  const radius = 1.5;
  const height = 10;

  useFrame((_state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {Array.from({ length: points }).map((_, i) => {
        const y = (i / points) * height - height / 2;
        const angle = (i / points) * Math.PI * 4;
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        return (
          <group key={i}>
            <mesh position={[x1, y, z1]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[x2, y, z2]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[(x1 + x2) / 2, y, (z1 + z2) / 2]} rotation={[0, 0, angle]}>
              <boxGeometry args={[radius * 2, 0.05, 0.05]} />
              <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const DnaHelix: React.FC = () => {
  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
          <DnaStrand position={[0, 0, 0]} rotation={[0.5, 0, 0.2]} color="#F15A24" />
        </Float>
        
        {/* Decorative background blobs */}
        <Float speed={4} rotationIntensity={0.5} floatIntensity={2}>
          <Sphere args={[1, 32, 32]} position={[-5, 5, -5]}>
            <MeshDistortMaterial color="#F15A24" speed={5} distort={0.4} opacity={0.1} transparent />
          </Sphere>
        </Float>
      </Canvas>
    </div>
  );
};

export default DnaHelix;
