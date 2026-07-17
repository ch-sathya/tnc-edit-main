import React from 'react';
import { FluidGradientOrb, GridPattern } from './FluidBackground';

/**
 * Global ambient layer rendered once behind the entire app.
 * Pure 2D fluid glass atmosphere — no 3D.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, hsl(var(--foreground) / 0.06), transparent 60%)',
        }}
      />
      <GridPattern />
      <FluidGradientOrb className="top-[-10%] left-[-10%]" size="w-[40rem] h-[40rem]" duration={28} />
      <FluidGradientOrb className="top-[30%] right-[-15%]" size="w-[36rem] h-[36rem]" delay={4} duration={32} />
      <FluidGradientOrb className="bottom-[-15%] left-[20%]" size="w-[44rem] h-[44rem]" delay={8} duration={36} />
    </div>
  );
};

export default AmbientBackground;
