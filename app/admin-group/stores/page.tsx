'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function AdminStoresPageContent() {
  const { data: session, status } = useSession();
  const isAdmin = session && session.user && (session.user as any)?.role === 'ADMIN';

  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    banner: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      redirect('/login');
    } else {
      fetchStores();
    }
  }, [session, status, isAdmin]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      setStores(data);
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Ошибка загрузки магазинов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores';
      const method = editingStore ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения');
        return;
      }

      setSuccess(editingStore ? 'Магазин обновлён!' : 'Магазин создан!');
      setShowAddForm(false);
      setEditingStore(null);
      setFormData({ name: '', slug: '', description: '', logo: '', banner: '', isActive: true });
      fetchStores();
    } catch (error) {
      console.error('Error saving store:', error);
      setError('Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (store: any) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      slug: store.slug,
      description: store.description || '',
      logo: store.logo || '',
      banner: store.banner || '',
      isActive: store.isActive,
    });
    setShowAddForm(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        setSuccess(`Магазин ${!currentStatus ? 'активирован' : 'деактивирован'}`);
        fetchStores();
      } else {
        setError('Ошибка изменения статуса');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setError('Произошла ошибка');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить магазин? Все товары останутся без привязки к магазину.')) return;

    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Магазин удалён');
        fetchStores();
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting store:', error);
      setError('Произошла ошибка');
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
    // Auto-generate slug from name
    if (!editingStore) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-800">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Загрузка...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Управление магазинами
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingStore(null);
              setFormData({ name: '', slug: '', description: '', logo: '', banner: '', isActive: true });
              setError('');
              setSuccess('');
            }}
            className="apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none"
          >
            {showAddForm ? '✕ Отмена' : '+ Добавить'}
          </button>

          <a
            href="/admin"
            className="apple-button rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none text-center"
          >
            Товары
          </a>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-green-100 border border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-3xl border border-blue-200/50 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-6 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {editingStore ? 'Редактировать магазин' : 'Новый магазин'}
          </h2>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Название *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                placeholder="Например: Adidas Russia"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                URL slug *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '-').substring(0, 50) })}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                placeholder="adidas-russia"
              />
              <p className="mt-1 text-xs text-zinc-500">Будет использоваться в URL: /{formData.slug || 'slug'}</p>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                rows={3}
                placeholder="Краткое описание магазина..."
              />
            </div>

            {/* Logo */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Логотип (URL)
              </label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Banner */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Баннер (URL)
              </label>
              <input
                type="url"
                value={formData.banner}
                onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                placeholder="https://example.com/banner.png"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Статус
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.isActive === true}
                    onChange={() => setFormData({ ...formData, isActive: true })}
                    className="mr-2"
                  />
                  <span className="text-green-600 dark:text-green-400">Активен</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.isActive === false}
                    onChange={() => setFormData({ ...formData, isActive: false })}
                    className="mr-2"
                  />
                  <span className="text-red-600 dark:text-red-400">Неактивен</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-blue-600 px-8 py-4 font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Сохранение...' : editingStore ? 'Сохранить изменения' : 'Создать магазин'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingStore(null);
                  setFormData({ name: '', slug: '', description: '', logo: '', banner: '', isActive: true });
                }}
                className="rounded-full border-2 border-zinc-300 px-8 py-4 font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Stores List */}
      {loading ? (
        <div className="text-center text-xl font-bold">Загрузка...</div>
      ) : stores.length === 0 ? (
        <div className="text-center text-zinc-500 dark:text-zinc-400 py-12">
          <div className="text-6xl mb-4">🏪</div>
          <p>Магазинов пока нет</p>
          <p className="text-sm mt-2">Создайте первый магазин</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="card-hover rounded-3xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20"
            >
              <div className="flex items-start gap-4">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl">
                    🏪
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {store.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        store.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {store.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                    /{store.slug} • {store._count?.products || 0} товаров
                  </p>
                  {store.description && (
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2">
                      {store.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`/${store.slug}`}
                    target="_blank"
                    className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-all"
                  >
                    👁 Открыть
                  </a>
                  <button
                    onClick={() => handleEdit(store)}
                    className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600 transition-all"
                  >
                    ✏ Изменить
                  </button>
                  <button
                    onClick={() => handleToggleStatus(store.id, store.isActive)}
                    className={`rounded-2xl px-4 py-2 text-sm font-bold text-white transition-all ${
                      store.isActive
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {store.isActive ? '⛔ Деактив' : '✅ Актив'}
                  </button>
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-all dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStoresPageWrapper() {
  return (
    <SessionProvider>
      <AdminStoresPageContent />
    </SessionProvider>
  );
}
