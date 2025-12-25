import React from 'react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  className?: string;
}

export const PageLoader = ({ className }: PageLoaderProps) => {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated rings */}
        <div className="relative w-20 h-20">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-[spin_3s_linear_infinite]" />
          
          {/* Middle ring with gradient */}
          <div 
            className="absolute inset-2 rounded-full border-4 border-transparent animate-[spin_2s_linear_infinite_reverse]"
            style={{
              borderTopColor: 'hsl(var(--primary))',
              borderRightColor: 'hsl(var(--primary) / 0.5)',
            }}
          />
          
          {/* Inner ring */}
          <div 
            className="absolute inset-4 rounded-full border-4 border-transparent animate-[spin_1.5s_linear_infinite]"
            style={{
              borderTopColor: 'hsl(var(--accent-foreground))',
              borderLeftColor: 'hsl(var(--accent-foreground) / 0.3)',
            }}
          />
          
          {/* Center pulse */}
          <div className="absolute inset-6 rounded-full bg-primary/30 animate-pulse" />
          <div className="absolute inset-7 rounded-full bg-primary animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
        
        {/* Loading text with wave animation */}
        <div className="flex items-center gap-1">
          {['L', 'o', 'a', 'd', 'i', 'n', 'g'].map((letter, index) => (
            <span
              key={index}
              className="text-sm font-medium text-muted-foreground animate-bounce"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationDuration: '1s',
              }}
            >
              {letter}
            </span>
          ))}
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-primary animate-bounce"
                style={{
                  animationDelay: `${0.7 + i * 0.15}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
            style={{
              width: '40%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
