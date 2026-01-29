'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Проверяем сохраненную тему или системные настройки
    try {
      const savedTheme = localStorage.getItem('theme');
      
      // Если есть сохраненная тема, используем её, иначе по умолчанию светлая
      const shouldBeDark = savedTheme === 'dark';
      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // Ignore localStorage errors during SSR
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {
        // Ignore localStorage errors
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="relative inline-flex h-12 w-24 items-center rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-12 w-24 items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl"
      aria-label="Переключить тему"
    >
      {/* Переключатель */}
      <span
        className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
          isDark ? 'translate-x-12' : 'translate-x-1'
        }`}
      >
        <span className="flex h-full w-full items-center justify-center text-xl">
          {isDark ? '🌙' : '☀️'}
        </span>
      </span>
      
      {/* Фоновые иконки */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <span className={`text-lg transition-opacity ${!isDark ? 'opacity-0' : 'opacity-100'}`}>
          ☀️
        </span>
        <span className={`text-lg transition-opacity ${isDark ? 'opacity-0' : 'opacity-100'}`}>
          🌙
        </span>
      </div>
    </button>
  );
}
