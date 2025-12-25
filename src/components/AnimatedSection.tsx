import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimatedSection = ({ 
  children, 
  delay = 0, 
  className,
  direction = 'up'
}: AnimatedSectionProps) => {
  const getTransformOrigin = () => {
    switch (direction) {
      case 'up': return 'translateY(20px)';
      case 'down': return 'translateY(-20px)';
      case 'left': return 'translateX(20px)';
      case 'right': return 'translateX(-20px)';
      default: return 'translateY(20px)';
    }
  };

  return (
    <div
      className={cn(
        'animate-in fade-in duration-500 fill-mode-both',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        '--tw-enter-translate-y': direction === 'up' ? '20px' : direction === 'down' ? '-20px' : '0',
        '--tw-enter-translate-x': direction === 'left' ? '20px' : direction === 'right' ? '-20px' : '0',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

interface StaggeredListProps {
  children: React.ReactNode[];
  baseDelay?: number;
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList = ({ 
  children, 
  baseDelay = 0,
  staggerDelay = 100,
  className 
}: StaggeredListProps) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedSection delay={baseDelay + index * staggerDelay}>
          {child}
        </AnimatedSection>
      ))}
    </div>
  );
};
