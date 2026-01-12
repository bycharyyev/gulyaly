'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export default function SupportUsersList({ onSelectUser }: { onSelectUser: (userId: string) => void }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = session?.user && (session.user as any)?.role === 'ADMIN';

  // Функция для загрузки пользователей
  const fetchUsers = useCallback(async () => {
    try {
      if (isAdmin) {
        // Получаем всех пользователей, у которых есть сообщения в поддержке
        const res = await fetch('/api/support/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Polling для автоматического обновления списка пользователей
  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      // Очищаем предыдущий интервал
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Устанавливаем новый интервал
      pollingIntervalRef.current = setInterval(() => {
        fetchUsers();
      }, 3000); // Обновляем каждые 3 секунды

      // Очищаем интервал при размонтировании
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [fetchUsers, status, isAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
        Нет активных обращений
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          className="p-3 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white">{user.name}</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
            </div>
            {user.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold h-6 w-6">
                {user.unreadCount}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}