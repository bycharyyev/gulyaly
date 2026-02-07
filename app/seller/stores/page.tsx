'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isActive: boolean;
  commission: string;
  createdAt: string;
  products: { id: string; name: string; isActive: boolean }[];
  _count: {
    products: number;
    reviews: number;
  };
}

export default function SellerStoresPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/seller/login');
      return;
    }
    loadStores();
  }, [session, status, router]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seller/stores');
      if (!res.ok) throw new Error('Ошибка загрузки магазинов');
      const data = await res.json();
      setStores(data.stores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm('Вы уверены? Магазин будет удален навсегда.')) return;
    
    try {
      setDeletingId(storeId);
      const res = await fetch(`/api/seller/stores/${storeId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка удаления');
      }
      setStores(stores.filter(s => s.id !== storeId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Мои магазины</h1>
            <p className="text-gray-600 mt-1">Управление магазинами</p>
          </div>
          <button
            onClick={() => router.push('/seller/stores/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Создать магазин
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stores Grid */}
        {stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">У вас пока нет магазинов</h3>
            <p className="text-gray-600 mb-6">Создайте свой первый магазин и начните продавать</p>
            <button
              onClick={() => router.push('/seller/stores/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Создать магазин
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => (
              <div key={store.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {store.logo ? (
                        <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                          🏪
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{store.name}</h3>
                        <p className="text-sm text-gray-500">/{store.slug}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {store.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {store.description || 'Нет описания'}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>📦 {store._count.products} товаров</span>
                    <span>⭐ {store._count.reviews} отзывов</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/seller/stores/${store.id}/edit`)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      disabled={deletingId === store.id}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50"
                    >
                      {deletingId === store.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
