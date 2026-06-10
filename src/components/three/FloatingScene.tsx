import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Environment } from '@react-three/drei';
import * as THREE from 'three';

const GlassSphere = ({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.3;
      ref.current.rotation.y = state.clock.elapsedTime * speed * 0.2;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={1.5} floatingRange={[-0.3, 0.3]}>
      <mesh ref={ref} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 3]} />
        <MeshDistortMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0.1}
          metalness={0.9}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  );
};

const GlassTorus = ({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * speed * 0.5;
      ref.current.rotation.z = state.clock.elapsedTime * speed * 0.3;
    }
  });

  return (
    <Float speed={speed * 0.7} rotationIntensity={0.6} floatIntensity={2}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1, 0.4, 16, 32]} />
        <MeshWobbleMaterial
          color="#e0e0e0"
          transparent
          opacity={0.12}
          roughness={0.05}
          metalness={1}
          factor={0.3}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
};

const FloatingRing = ({ position, scale }: { position: [number, number, number]; scale: number }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.4;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={1}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1.5, 0.05, 16, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.95}
        />
      </mesh>
    </Float>
  );
};

const Particles = () => {
  const count = 80;
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
      ref.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
};

const SceneContent = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color="#ffffff" />

      <GlassSphere position={[-3, 1.5, -2]} scale={1.2} speed={1.5} />
      <GlassSphere position={[3.5, -1, -3]} scale={0.8} speed={2} />
      <GlassSphere position={[0, 2.5, -4]} scale={0.5} speed={1.8} />
      
      <GlassTorus position={[2, 1, -2]} scale={0.7} speed={1.2} />
      <GlassTorus position={[-2.5, -1.5, -3]} scale={0.5} speed={1.6} />
      
      <FloatingRing position={[0, 0, -3]} scale={1.5} />
      <FloatingRing position={[-4, 2, -5]} scale={0.8} />
      
      <Particles />

      <Environment preset="night" />
    </>
  );
};

const FloatingScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default FloatingScene;
