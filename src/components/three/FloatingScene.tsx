import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Monochrome glass sphere — physical transmission material,
 * slow rotation, tuned for the fluid.glass / claygarden aesthetic.
 */
const GlassBlob: React.FC<{
  position: [number, number, number];
  scale?: number;
  speed?: number;
  rough?: number;
}> = ({ position, scale = 1, speed = 0.15, rough = 0.15 }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * speed * 0.4;
    ref.current.rotation.y = state.clock.elapsedTime * speed;
  });

  return (
    <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.9} floatingRange={[-0.15, 0.15]}>
      <mesh ref={ref} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          thickness={1.4}
          roughness={rough}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0}
          attenuationColor="#ffffff"
          attenuationDistance={2.5}
        />
      </mesh>
    </Float>
  );
};

const ThinRing: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.12;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.25;
  });

  return (
    <Float speed={0.4} rotationIntensity={0.1} floatIntensity={0.6}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1.6, 0.015, 32, 128]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </Float>
  );
};

const SceneContent: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 4]} intensity={0.55} color="#ffffff" />
      <pointLight position={[-6, -4, 3]} intensity={0.25} color="#ffffff" />

      {/* Fewer, larger, slower — monochrome glass */}
      <GlassBlob position={[-2.6, 0.8, -2]} scale={1.6} speed={0.12} rough={0.12} />
      <GlassBlob position={[3.2, -0.6, -3]} scale={1.1} speed={0.18} rough={0.2} />
      <GlassBlob position={[0.4, 2.2, -4]} scale={0.7} speed={0.22} rough={0.1} />

      <ThinRing position={[0, 0, -3]} scale={1.8} />
      <ThinRing position={[-3.5, 1.8, -5]} scale={0.9} />

      <Environment preset="studio" />
    </>
  );
};

const FloatingScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  // Respect reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.25]}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default FloatingScene;
