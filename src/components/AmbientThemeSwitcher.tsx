import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useAmbientTheme,
  AmbientTheme,
  AmbientIntensity,
  themeColors,
} from '@/contexts/AmbientThemeContext';
import { cn } from '@/lib/utils';

const themes: { id: AmbientTheme; label: string }[] = [
  { id: 'mono', label: 'Mono' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'warm', label: 'Warm' },
  { id: 'minimal', label: 'Minimal' },
];

const intensities: AmbientIntensity[] = ['off', 'subtle', 'normal', 'vivid'];

export const AmbientThemeSwitcher: React.FC = () => {
  const { theme, intensity, enable3D, setTheme, setIntensity, setEnable3D } = useAmbientTheme();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="icon"
              variant="outline"
              aria-label="Ambient theme settings"
              className="h-10 w-10 rounded-full backdrop-blur-xl bg-background/60 border-border/60 shadow-lg"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          className="w-72 p-4 backdrop-blur-xl bg-background/80 border-border/60"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Theme
              </p>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((t) => {
                  const c = themeColors[t.id];
                  const active = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-colors',
                        active ? 'bg-foreground/10' : 'hover:bg-foreground/5'
                      )}
                      aria-label={`${t.label} theme`}
                    >
                      <div
                        className="h-8 w-8 rounded-full border border-border/40 shadow-inner"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${c.a}, ${c.b})`,
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">{t.label}</span>
                      {active && (
                        <Check className="absolute top-1 right-1 h-3 w-3 text-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Intensity
              </p>
              <div className="grid grid-cols-4 gap-1">
                {intensities.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIntensity(i)}
                    className={cn(
                      'rounded-md py-1.5 text-xs capitalize transition-colors',
                      intensity === i
                        ? 'bg-foreground text-background'
                        : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground'
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Label htmlFor="enable-3d" className="text-xs text-muted-foreground cursor-pointer">
                3D depth scene
              </Label>
              <Switch id="enable-3d" checked={enable3D} onCheckedChange={setEnable3D} />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AmbientThemeSwitcher;
