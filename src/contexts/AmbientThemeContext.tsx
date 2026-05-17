import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type AmbientTheme = 'aurora' | 'mono' | 'warm' | 'minimal';
export type AmbientIntensity = 'off' | 'subtle' | 'normal' | 'vivid';

interface AmbientThemeState {
  theme: AmbientTheme;
  intensity: AmbientIntensity;
  enable3D: boolean;
  setTheme: (t: AmbientTheme) => void;
  setIntensity: (i: AmbientIntensity) => void;
  setEnable3D: (b: boolean) => void;
}

const STORAGE_KEY = 'ambient-theme-prefs-v1';

const defaults: Omit<AmbientThemeState, 'setTheme' | 'setIntensity' | 'setEnable3D'> = {
  theme: 'mono',
  intensity: 'subtle',
  enable3D: true,
};

const AmbientThemeContext = createContext<AmbientThemeState | null>(null);

export const AmbientThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AmbientTheme>(defaults.theme);
  const [intensity, setIntensity] = useState<AmbientIntensity>(defaults.intensity);
  const [enable3D, setEnable3D] = useState<boolean>(defaults.enable3D);

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.intensity) setIntensity(parsed.intensity);
      if (typeof parsed.enable3D === 'boolean') setEnable3D(parsed.enable3D);
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, intensity, enable3D }));
    } catch {}
  }, [theme, intensity, enable3D]);

  const value = useMemo(
    () => ({ theme, intensity, enable3D, setTheme, setIntensity, setEnable3D }),
    [theme, intensity, enable3D]
  );

  return <AmbientThemeContext.Provider value={value}>{children}</AmbientThemeContext.Provider>;
};

export const useAmbientTheme = () => {
  const ctx = useContext(AmbientThemeContext);
  if (!ctx) throw new Error('useAmbientTheme must be used within AmbientThemeProvider');
  return ctx;
};

// Derived numerics per intensity, used by AmbientBackground / FloatingScene
export const intensityConfig: Record<
  AmbientIntensity,
  { orbOpacity: number; sceneOpacity: number; particleCount: number; show3D: boolean }
> = {
  off:     { orbOpacity: 0.03, sceneOpacity: 0,    particleCount: 0,  show3D: false },
  subtle:  { orbOpacity: 0.05, sceneOpacity: 0.18, particleCount: 24, show3D: true },
  normal:  { orbOpacity: 0.08, sceneOpacity: 0.30, particleCount: 40, show3D: true },
  vivid:   { orbOpacity: 0.12, sceneOpacity: 0.45, particleCount: 60, show3D: true },
};

export const themeColors: Record<AmbientTheme, { a: string; b: string; orb: string }> = {
  aurora:  { a: '#7dd3c0', b: '#a78bfa', orb: 'hsl(160 60% 70%)' },
  mono:    { a: '#ffffff', b: '#cccccc', orb: 'hsl(0 0% 100%)' },
  warm:    { a: '#f5c89b', b: '#e89b6f', orb: 'hsl(28 70% 70%)' },
  minimal: { a: '#e8e4dd', b: '#c9b99a', orb: 'hsl(40 20% 80%)' },
};
