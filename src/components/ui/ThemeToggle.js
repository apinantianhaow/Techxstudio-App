'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative w-10 h-10 flex items-center justify-center rounded-full
        bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
        transition-colors duration-300"
      aria-label="สลับธีม"
    >
      <AnimatePresence mode="wait">
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-5 h-5 text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-5 h-5 text-primary-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
