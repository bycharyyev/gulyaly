'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 1.5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
      <div className="flex flex-col items-center">
        {/* Logo with pulse animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white p-4 sm:p-6 shadow-2xl border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center animate-float">
            <Image 
              src="/logo.svg" 
              alt="Gulyaly" 
              width={128} 
              height={128} 
              className="w-full h-full"
              priority
            />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
          Gulyaly
        </h2>

        {/* Spinner */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Loading bar */}
        <div className="mt-8 w-64 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-loading-bar"></div>
        </div>
      </div>
    </div>
  );
}
