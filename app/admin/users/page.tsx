'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function AdminUsersPageContent() {
  const { data: session, status } = useSession();
  
  // Проверяем, что сессия и пользователь определены
  const isAdmin = session && session.user && (session.user as any)?.role === 'ADMIN';
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    role: '',
    isOnline: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      redirect('/login');
    } else {
      fetchUsers();
    }
  }, [session, status, isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      role: user.role,
      isOnline: user.isOnline
    });
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Пользователь обновлён!');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('Ошибка обновления пользователя');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        alert(`Роль пользователя изменена на ${newRole}`);
        fetchUsers();
      } else {
        alert('Ошибка изменения роли пользователя');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка');
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

  return (
    <div>
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Управление пользователями
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <a
            href="/admin"
            className="apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none"
          >
            ← Продукты
          </a>
        </div>
      </div>

      {/* Список пользователей */}
      {loading ? (
        <div className="text-center text-xl font-bold">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {users.map((user) => (
            <div
              key={user.id}
              className="card-hover rounded-3xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="inline-block rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-xs font-bold text-white">
                      {user.role}
                    </div>
                    {user.isOnline && (
                      <div className="inline-block rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">
                        Онлайн
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {user.name}
                  </h3>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </p>
                  {user.phone && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Телефон: {user.phone} {user.phoneVerified && '(подтвержден)'}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Зарегистрирован: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Последний вход: {new Date(user.lastSeenAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleUserRole(user.id, user.role)}
                    className="rounded-2xl bg-yellow-500 px-4 py-2 text-xs font-bold text-white hover:bg-yellow-600 transition-all"
                  >
                    {user.role === 'ADMIN' ? 'Понизить' : 'Повысить'}
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="rounded-2xl bg-blue-500 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 transition-all"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-all dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              
              {/* Форма редактирования пользователя */}
              {editingUser && editingUser.id === user.id && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                  <h2 className="mb-4 text-xl font-bold text-blue-600 dark:text-blue-400">
                    Редактировать пользователя
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Роль
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Статус онлайн
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isOnline}
                            onChange={(e) => setFormData({...formData, isOnline: e.target.checked})}
                            className="mr-2"
                          />
                          <span className="text-green-600 dark:text-green-400">На сайте</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={submitting}
                        className="flex-1 rounded-full bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                      >
                        {submitting ? 'Обновление...' : 'Сохранить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="rounded-full border-2 border-zinc-300 px-6 py-3 font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPageWrapper() {
  return (
    <SessionProvider>
      <AdminUsersPageContent />
    </SessionProvider>
  );
}