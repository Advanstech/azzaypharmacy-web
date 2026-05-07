'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1 bg-glass-1 p-1 rounded-xl border border-glass-border">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'light' ? 'bg-teal-500/10 text-teal-400' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'dark' ? 'bg-teal-500/10 text-teal-400' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'system' ? 'bg-teal-500/10 text-teal-400' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="System"
      >
        <Monitor size={14} />
      </button>
    </div>
  );
}
