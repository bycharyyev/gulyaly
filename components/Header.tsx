'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const isProfilePage = pathname === '/profile';
  
  return (
    <header className="glass sticky top-0 z-50 border-b border-blue-200/20 dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white p-1.5 shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <Image src="/logo.svg" alt="Gulyaly" width={32} height={32} className="w-full h-full" priority />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gulyaly</span>
            </Link>
          </div>
          
          {/* Десктопная навигация */}
          <nav className="hidden sm:flex items-center gap-3 md:gap-4">
            {session ? (
              <>
                {!isProfilePage && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-base">
                      {session.user?.name?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <span>Профиль</span>
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="apple-button rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Войти
                </Link>
                <Link
                  href="/profile"
                  className="apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 md:px-5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg"
                >
                  Профиль
                </Link>
              </>
            )}
          </nav>
          
          {/* Мобильная кнопка бургера */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden touch-target flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Меню"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 space-y-2 border-t border-zinc-200 dark:border-zinc-700 mt-2">
            {session ? (
              <>
                {!isProfilePage && (
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {session.user?.name?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <span>Профиль</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <span>Выйти</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-medium text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Войти
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Профиль
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
