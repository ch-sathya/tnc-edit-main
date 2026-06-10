import React from 'react';
import { motion } from 'framer-motion';

export const FluidGradientOrb: React.FC<{
  className?: string;
  size?: string;
  delay?: number;
  duration?: number;
}> = ({ className = '', size = 'w-96 h-96', delay = 0, duration = 20 }) => {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-[0.07] ${size} ${className}`}
      style={{ background: 'radial-gradient(circle, hsl(var(--foreground)), transparent)' }}
      animate={{
        x: [0, 50, -30, 20, 0],
        y: [0, -40, 30, -20, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export const GlassPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-glass)',
      }}
      whileHover={{
        borderColor: 'rgba(255, 255, 255, 0.3)',
        transition: { duration: 0.3 },
      }}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700"
        style={{
          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export const NoiseOverlay: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
};

export const GridPattern: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`absolute inset-0 opacity-[0.03] ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  );
};

export const SmoothCursor: React.FC = () => {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      className="fixed pointer-events-none z-40 hidden lg:block"
      animate={{ x: mousePos.x - 200, y: mousePos.y - 200 }}
      transition={{ type: 'spring', damping: 30, stiffness: 100, mass: 0.5 }}
    >
      <div
        className="w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--foreground)), transparent 70%)',
        }}
      />
    </motion.div>
  );
};
