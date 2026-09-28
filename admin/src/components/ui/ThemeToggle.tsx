'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // resolvedTheme reflects the OS setting when theme is "system"
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className="h-8 w-8" />;

  const isDark = resolvedTheme === 'dark';
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="icon-btn" aria-label="Toggle theme">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
