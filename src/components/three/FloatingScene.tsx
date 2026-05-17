import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

const GlassSphere = ({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.25;
      ref.current.rotation.y = state.clock.elapsedTime * speed * 0.18;
    }
  });
  return (
    <Float speed={speed} rotationIntensity={0.3} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          roughness={0.2}
          metalness={0.8}
          distort={0.25}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
};

const GlassTorus = ({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.4;
      ref.current.rotation.z = state.clock.elapsedTime * speed * 0.25;
    }
  });
  return (
    <Float speed={speed * 0.7} rotationIntensity={0.5} floatIntensity={1.6}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1, 0.35, 12, 24]} />
        <MeshWobbleMaterial
          color="#e0e0e0"
          transparent
          opacity={0.1}
          roughness={0.15}
          metalness={0.9}
          factor={0.25}
          speed={1.2}
        />
      </mesh>
    </Float>
  );
};

const Particles = ({ count }: { count: number }) => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.015;
    }
  });

  if (count === 0) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ffffff" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
};

// Pause render loop when tab is hidden
const VisibilityPauser = () => {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [invalidate, gl]);
  return null;
};

const SceneContent = ({ particleCount }: { particleCount: number }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <directionalLight position={[-5, -3, 2]} intensity={0.25} />

      <GlassSphere position={[-3, 1.2, -2]} scale={1.1} speed={1.2} />
      <GlassSphere position={[3.2, -1, -3]} scale={0.75} speed={1.6} />
      <GlassTorus position={[1.8, 1.2, -2.5]} scale={0.65} speed={1} />

      <Particles count={particleCount} />
      <VisibilityPauser />
    </>
  );
};

interface Props {
  className?: string;
  particleCount?: number;
}

const FloatingScene: React.FC<Props> = ({ className = '', particleCount = 30 }) => {
  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.25]}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <SceneContent particleCount={particleCount} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default FloatingScene;
