'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function AdminHeader() {
  const pathname = usePathname();
  const isSupportPage = pathname === '/admin/support';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className={`glass sticky top-0 z-50 border-b border-blue-200/20 dark:border-white/10 ${isSupportPage ? 'lg:block' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white p-1.5 shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <Image src="/logo.svg" alt="Gulyaly" width={32} height={32} className="w-full h-full" priority />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gulyaly</span>
            </Link>
            <span className="hidden sm:inline text-sm font-semibold text-blue-600 dark:text-blue-400">Админ Панель</span>
          </div>
          
          {/* Десктопная навигация */}
          <nav className="hidden lg:flex items-center gap-2 md:gap-4">
            <Link
              href="/admin"
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              📊 Главная
            </Link>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              👥 Пользователи
            </Link>
            <Link
              href="/admin/orders"
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              📦 Заказы
            </Link>
            <Link
              href="/admin/support"
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              💬 Поддержка
            </Link>
            <Link
              href="/admin/footer"
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Футер
            </Link>
            <Link
              href="/admin/sms"
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              SMS
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="apple-button rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-3 md:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:shadow-lg"
            >
              🚪 Выйти
            </button>
          </nav>
          
          {/* Мобильная кнопка бургера */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden touch-target flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
          <div className="lg:hidden py-4 space-y-2 border-t border-zinc-200 dark:border-zinc-700 mt-2">
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              📊 Главная
            </Link>
            <Link
              href="/admin/users"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              👥 Пользователи
            </Link>
            <Link
              href="/admin/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              📦 Заказы
            </Link>
            <Link
              href="/admin/support"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              💬 Поддержка
            </Link>
            <Link
              href="/admin/footer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Футер
            </Link>
            <Link
              href="/admin/sms"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-medium text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              SMS
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
              className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              🚪 Выйти
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
