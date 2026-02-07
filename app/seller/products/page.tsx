'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  variants: {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
  }[];
}

export default function SellerProductsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/seller/login');
      return;
    }
    loadProducts();
  }, [session, status, router]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seller/products');
      if (!res.ok) throw new Error('Ошибка загрузки товаров');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Вы уверены? Товар будет деактивирован.')) return;
    
    try {
      setDeletingId(productId);
      const res = await fetch(`/api/seller/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка удаления');
      }
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Активен</span>
      : <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Черновик</span>;
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
            <h1 className="text-3xl font-bold text-gray-900">Мои товары</h1>
            <p className="text-gray-600 mt-1">Управление товарами</p>
          </div>
          <button
            onClick={() => router.push('/seller/products/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            + Добавить товар
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Products Table */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">У вас пока нет товаров</h3>
            <p className="text-gray-600 mb-6">Добавьте свой первый товар</p>
            <button
              onClick={() => router.push('/seller/products/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Добавить товар
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Товар</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Магазин</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Цена</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Статус</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.store?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.variants?.length > 0 ? (
                        <span>
                          от {(Math.min(...product.variants.map(v => v.price)) / 100).toFixed(2)} ₽
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.isActive)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/seller/products/${product.id}/edit`)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded transition disabled:opacity-50"
                        >
                          {deletingId === product.id ? '...' : 'Удалить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
