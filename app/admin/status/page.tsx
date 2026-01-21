'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function AdminStatusPageContent() {
  const { data: session, status } = useSession();
  
  // Проверяем, что сессия и пользователь определены
  const isAdmin = session && session.user && (session.user as any)?.role === 'ADMIN';
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      redirect('/login');
    } else {
      fetchStats();
    }
  }, [session, status, isAdmin]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/status');
      if (!res.ok) {
        throw new Error('Ошибка получения статуса');
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-800">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Загрузка...</div>
    </div>;
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return <div className="p-8">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Загрузка статуса сервера...</div>
    </div>;
  }

  if (error) {
    return <div className="p-8">
      <div className="text-2xl font-bold text-red-600">Ошибка: {error}</div>
      <button 
        onClick={fetchStats}
        className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-white font-bold hover:bg-blue-700"
      >
        Повторить
      </button>
    </div>;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Статус сервера
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <a
            href="/admin"
            className="apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none"
          >
            ← Продукты
          </a>
          <button
            onClick={fetchStats}
            className="apple-button rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none"
          >
            Обновить
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Системная информация */}
        <div className="rounded-3xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20">
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Система</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">CPU:</span>
              <p className="text-zinc-900 dark:text-white">{stats?.server.cpu}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Память:</span>
              <p className="text-zinc-900 dark:text-white">{stats?.server.memory.used} / {stats?.server.memory.total} ({stats?.server.memory.percent}%)</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${stats?.server.memory.percent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Диск:</span>
              <p className="text-zinc-900 dark:text-white">{stats?.server.disk.used} / {stats?.server.disk.total} ({stats?.server.disk.percent})</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: stats?.server.disk.percent.replace('%', '') }}
                ></div>
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Загрузка (1/5/15 мин):</span>
              <p className="text-zinc-900 dark:text-white">
                {stats?.server.loadAverage['1min']} / {stats?.server.loadAverage['5min']} / {stats?.server.loadAverage['15min']}
              </p>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Uptime:</span>
              <p className="text-zinc-900 dark:text-white">{stats?.server.uptime}</p>
            </div>
          </div>
        </div>

        {/* Приложение */}
        <div className="rounded-3xl border-2 border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-purple-900/50 dark:from-zinc-900 dark:to-purple-950/20">
          <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">Приложение</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Пользователей онлайн:</span>
              <p className="text-2xl font-bold text-green-600">{stats?.app.onlineUsers}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Всего пользователей:</span>
              <p className="text-2xl font-bold text-blue-600">{stats?.app.totalUsers}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Активных заказов:</span>
              <p className="text-2xl font-bold text-orange-600">{stats?.app.activeOrders}</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Последнее обновление:</span>
              <p className="text-zinc-900 dark:text-white">{new Date(stats?.app.lastUpdated).toLocaleString('ru-RU')}</p>
            </div>
          </div>
        </div>

        {/* Процессы */}
        <div className="rounded-3xl border-2 border-green-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-green-900/50 dark:from-zinc-900 dark:to-purple-950/20 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">Процессы</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Количество Node.js процессов:</span>
              <p className="text-2xl font-bold text-blue-600">{stats?.server.processes}</p>
            </div>
            {stats?.server.processesList && stats.server.processesList.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Список процессов:</span>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {stats.server.processesList.map((proc: any, index: number) => (
                    <div key={index} className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded mb-1">
                      <div className="font-mono truncate">{proc.command.substring(0, 50)}</div>
                      <div className="flex justify-between">
                        <span>PID: {proc.pid}</span>
                        <span>CPU: {proc.cpu}%</span>
                        <span>MEM: {proc.mem}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* График онлайна (простой) */}
      <div className="mt-8 rounded-3xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20">
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Статистика онлайна (последние 24 часа)</h2>
        <div className="h-48 flex items-end space-x-1">
          {[...Array(24)].map((_, i) => {
            // Генерируем случайные данные для демонстрации
            const value = Math.floor(Math.random() * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                  style={{ height: `${value}%` }}
                ></div>
                <span className="text-xs mt-1 text-zinc-600 dark:text-zinc-400">{i}</span>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Количество пользователей онлайн по часам</p>
      </div>
    </div>
  );
}

export default function AdminStatusPageWrapper() {
  return (
    <SessionProvider>
      <AdminStatusPageContent />
    </SessionProvider>
  );
}