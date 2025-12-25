import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
}

type TransitionPhase = 'idle' | 'exiting' | 'entering';

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [displayChildren, setDisplayChildren] = useState(children);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger transition if path actually changed
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      
      // Start exit animation
      setPhase('exiting');
      
      // After exit animation, swap content and enter
      const exitTimer = setTimeout(() => {
        setDisplayChildren(children);
        setPhase('entering');
        
        // After enter animation, go idle
        const enterTimer = setTimeout(() => {
          setPhase('idle');
        }, 300);
        
        return () => clearTimeout(enterTimer);
      }, 200);
      
      return () => clearTimeout(exitTimer);
    } else {
      // Same path, just update children
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  const getTransitionClasses = () => {
    switch (phase) {
      case 'exiting':
        return 'opacity-0 scale-[0.98] translate-y-2';
      case 'entering':
        return 'opacity-100 scale-100 translate-y-0';
      case 'idle':
      default:
        return 'opacity-100 scale-100 translate-y-0';
    }
  };

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform',
        getTransitionClasses()
      )}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
