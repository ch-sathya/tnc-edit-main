import React, { lazy, Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GridPattern } from './FluidBackground';
import { useAmbientTheme, intensityConfig, themeColors } from '@/contexts/AmbientThemeContext';

const FloatingScene = lazy(() => import('@/components/three/FloatingScene'));

const ThemedOrb: React.FC<{
  className?: string;
  size?: string;
  delay?: number;
  duration?: number;
  color: string;
  opacity: number;
}> = ({ className = '', size = 'w-96 h-96', delay = 0, duration = 28, color, opacity }) => {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${size} ${className}`}
      style={{
        background: `radial-gradient(circle, ${color}, transparent)`,
        opacity,
      }}
      animate={{
        x: [0, 40, -20, 0],
        y: [0, -30, 20, 0],
        scale: [1, 1.15, 0.95, 1],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};

/**
 * Global ambient layer — themed and configurable.
 * Reads preferences from AmbientThemeContext.
 */
export const AmbientBackground: React.FC = () => {
  const { theme, intensity, enable3D } = useAmbientTheme();
  const cfg = intensityConfig[intensity];
  const colors = themeColors[theme];

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const show3D =
    enable3D &&
    cfg.show3D &&
    !reducedMotion &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(min-width: 1280px)').matches;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Soft radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, hsl(var(--foreground) / 0.05), transparent 60%)',
        }}
      />

      <GridPattern />

      <ThemedOrb
        className="top-[-10%] left-[-10%]"
        size="w-[36rem] h-[36rem]"
        duration={32}
        color={colors.orb}
        opacity={cfg.orbOpacity}
      />
      <ThemedOrb
        className="bottom-[-15%] right-[-10%]"
        size="w-[40rem] h-[40rem]"
        delay={6}
        duration={38}
        color={colors.orb}
        opacity={cfg.orbOpacity * 0.85}
      />

      {show3D && (
        <div
          className="absolute inset-0"
          style={{
            opacity: cfg.sceneOpacity,
            maskImage:
              'radial-gradient(ellipse at center, black 35%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 35%, transparent 80%)',
          }}
        >
          <Suspense fallback={null}>
            <FloatingScene particleCount={cfg.particleCount} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default AmbientBackground;
