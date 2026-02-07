'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import SupportChatWrapper from '@/components/SupportChatWrapper';
import SupportUsersList from '@/components/SupportUsersList';

function AdminSupportPageContent() {
  const { data: session, status } = useSession();
  
  // Проверяем, что сессия и пользователь определены
  const isAdmin = session && session.user && (session.user as any)?.role === 'ADMIN';
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'chat'>('clients'); // Для мобильной навигации

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab('chat'); // Автоматически переключаемся на чат на мобильном
  };

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Загрузка...</div>
    </div>;
  }

  if (!isAdmin) {
    redirect('/login');
  }

  return (
    <div className="bg-white rounded-none lg:rounded-2xl lg:rounded-3xl border-0 lg:border border-zinc-200/50 p-2 sm:p-4 lg:p-6 lg:p-8 shadow-none lg:shadow-xl dark:bg-zinc-900 dark:border-zinc-800 min-h-[calc(100vh-2rem)] lg:min-h-0">
      
      {/* Мобильный Tab Bar */}
      <div className="lg:hidden mb-4">
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'clients'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            👥 Клиенты
            {activeTab === 'clients' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            disabled={!selectedUserId}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'chat'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-500 dark:text-zinc-400'
            } disabled:opacity-40`}
          >
            Чат
            {activeTab === 'chat' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>
      </div>
      
      {/* Десктопный layout (всегда видны обе панели) */}
      <div className="hidden lg:flex gap-8">
        <div className="lg:w-1/3">
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">
            Клиенты
          </h3>
          <SupportUsersList onSelectUser={handleSelectUser} />
        </div>
        <div className="lg:w-2/3">
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">
            Чат
          </h3>
          {selectedUserId ? (
            <SupportChatWrapper userId={selectedUserId} />
          ) : (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              ← Выберите клиента для начала чата
            </div>
          )}
        </div>
      </div>
      
      {/* Мобильный layout (переключение по tab) */}
      <div className="lg:hidden">
        {activeTab === 'clients' ? (
          <div>
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">
              Клиенты
            </h3>
            <SupportUsersList onSelectUser={handleSelectUser} />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                Чат
              </h3>
              <button
                onClick={() => setActiveTab('clients')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Назад к клиентам
              </button>
            </div>
            {selectedUserId ? (
              <SupportChatWrapper userId={selectedUserId} />
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                Выберите клиента
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportPageWrapper() {
  return (
    <SessionProvider>
      <AdminSupportPageContent />
    </SessionProvider>
  );
}
