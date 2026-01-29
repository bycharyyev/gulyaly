'use client';

import { useEffect } from 'react';

export default function ThemeScript() {
  useEffect(() => {
    // This runs only on the client after hydration
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  return null;
}
