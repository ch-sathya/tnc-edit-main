import React, { lazy, Suspense } from 'react';
import { FluidGradientOrb, GridPattern } from './FluidBackground';

const FloatingScene = lazy(() => import('@/components/three/FloatingScene'));

/**
 * Global ambient layer rendered once behind the entire app.
 * Provides the fluid-glass / claygarden atmosphere across every page:
 * - drifting gradient orbs
 * - subtle grid texture
 * - very low-opacity 3D scene (desktop only) for depth
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Soft radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, hsl(var(--foreground) / 0.06), transparent 60%)',
        }}
      />

      {/* Subtle grid */}
      <GridPattern />

      {/* Fluid drifting orbs */}
      <FluidGradientOrb className="top-[-10%] left-[-10%]" size="w-[40rem] h-[40rem]" duration={28} />
      <FluidGradientOrb className="top-[30%] right-[-15%]" size="w-[36rem] h-[36rem]" delay={4} duration={32} />
      <FluidGradientOrb className="bottom-[-15%] left-[20%]" size="w-[44rem] h-[44rem]" delay={8} duration={36} />

      {/* Lightweight 3D layer — desktop only, very low opacity */}
      <div className="hidden lg:block absolute inset-0 opacity-40">
        <Suspense fallback={null}>
          <FloatingScene />
        </Suspense>
      </div>
    </div>
  );
};

export default AmbientBackground;
