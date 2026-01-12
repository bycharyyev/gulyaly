'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import SupportForm from '@/components/SupportForm';
import SupportChatWrapper from '@/components/SupportChatWrapper';
import { useSession } from 'next-auth/react';
import { useAuthModal } from '@/lib/AuthModalContext';

export default function SupportPage() {
  const { data: session, status } = useSession();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (status !== 'loading' && !session) {
      openAuthModal({
        title: '💬 Требуется авторизация',
        message: 'Войдите, чтобы обратиться в поддержку',
        returnUrl: '/support',
      });
    }
  }, [session, status, openAuthModal]);

  if (!session && status !== 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Требуется авторизация
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Войдите в систему, чтобы продолжить
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Header />
      
      <main className="mx-auto max-w-4xl px-2 sm:px-4 py-4 sm:py-8 lg:py-12 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-12 text-center px-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            💬 Поддержка
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            Нужна помощь? Напишите нам, и мы ответим в ближайшее время
          </p>
        </div>

        <div className="grid gap-6 sm:gap-12 lg:grid-cols-2">
          <div>
            <SupportForm />
          </div>
          
          <div>
            <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 px-2">
              💬 Чат с поддержкой
            </h2>
            <SupportChatWrapper />
          </div>
        </div>
      </main>
    </div>
  );
}