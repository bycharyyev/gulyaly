'use client';

import { useState, useEffect } from 'react';

export default function SupportMessages({ isAdmin = false, userId = null }: { isAdmin?: boolean, userId?: string | null }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        let url = '';
        if (isAdmin && userId) {
          // Если админ просматривает чат конкретного пользователя
          url = `/api/support/user/${userId}`;
        } else if (isAdmin) {
          // Все сообщения для админа
          url = '/api/support';
        } else {
          // Только сообщения текущего пользователя
          url = '/api/support/user';
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isAdmin, userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200/50 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-zinc-600 dark:text-zinc-400">Нет сообщений в поддержке</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-3xl border p-6 shadow-lg ${
            message.user?.role === 'ADMIN'
              ? 'border-purple-200 bg-purple-50/30 dark:border-purple-900/50 dark:bg-purple-900/10'
              : 'border-blue-200 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-900/10'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">
                  {message.user?.role === 'ADMIN' ? 'Администратор' : message.user?.name || 'Клиент'}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  message.status === 'NEW' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
                    : message.status === 'REPLIED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {message.status === 'NEW' ? 'Новое' : message.status === 'REPLIED' ? 'Отвечено' : 'Прочитано'}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(message.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>
          <h4 className="mt-4 font-semibold text-zinc-900 dark:text-white">
            {message.subject}
          </h4>
          <p className="mt-3 text-zinc-700 dark:text-zinc-300">
            {message.message}
          </p>
        </div>
      ))}
    </div>
  );
}