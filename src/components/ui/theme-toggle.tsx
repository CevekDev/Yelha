'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-provider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 rounded-xl flex items-center justify-center border border-white/[0.08] dark:border-white/[0.08] hover:bg-white/[0.06] dark:hover:bg-white/[0.06] light:border-black/10 light:hover:bg-black/[0.06] transition-all ${className ?? ''}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4 text-white/60" /> : <Moon className="w-4 h-4 text-black/60" />}
    </button>
  );
}
