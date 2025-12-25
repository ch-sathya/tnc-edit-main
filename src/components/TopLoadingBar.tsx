import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const TopLoadingBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start loading
    setVisible(true);
    setProgress(0);

    // Clear any existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Animate progress quickly to ~30%, then slow down
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += currentProgress < 30 ? 8 : currentProgress < 70 ? 3 : 1;
      if (currentProgress >= 90) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        currentProgress = 90;
      }
      setProgress(currentProgress);
    }, 50);

    // Complete after a short delay (simulating page load)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setProgress(100);
      
      // Hide after completion animation
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease-out' }}
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))',
        }}
      />
    </div>
  );
};

// Hook to manually control loading bar for data fetches
let globalSetLoading: ((loading: boolean) => void) | null = null;

export const useLoadingBar = () => {
  return {
    start: () => globalSetLoading?.(true),
    complete: () => globalSetLoading?.(false),
  };
};

export const TopLoadingBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    globalSetLoading = setIsLoading;
    return () => {
      globalSetLoading = null;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        currentProgress += currentProgress < 30 ? 6 : currentProgress < 70 ? 2 : 0.5;
        if (currentProgress >= 90) {
          currentProgress = 90;
        }
        setProgress(currentProgress);
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 300);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  return (
    <>
      {progress > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
          style={{ opacity: progress < 100 ? 1 : 0, transition: 'opacity 200ms ease-out' }}
        >
          <div
            className="h-full bg-primary transition-all duration-150 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: '0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))',
            }}
          />
        </div>
      )}
      {children}
    </>
  );
};