'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Order {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  product: {
    id: string;
    name: string;
    store: {
      id: string;
      name: string;
    };
  };
  variant: {
    id: string;
    name: string;
    price: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  transaction: {
    id: string;
    totalAmount: number;
    platformFee: number;
    sellerAmount: number;
    status: string;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
  } | null;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  completed: number;
  disputed: number;
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/seller/login');
      return;
    }
    loadOrders();
  }, [session, status, router, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const url = filter 
        ? `/api/seller/orders?status=${filter}`
        : '/api/seller/orders';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка загрузки заказов');
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'PAID': 'bg-blue-100 text-blue-700',
      'PROCESSING': 'bg-purple-100 text-purple-700',
      'SHIPPED': 'bg-indigo-100 text-indigo-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'DISPUTED': 'bg-red-100 text-red-700',
      'CANCELLED': 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Заказы</h1>
          <p className="text-gray-600 mt-1">Управление заказами ваших товаров</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard title="Всего" value={stats.total} color="bg-gray-100" />
            <StatCard title="Ожидают" value={stats.pending} color="bg-yellow-50" />
            <StatCard title="Оплачены" value={stats.paid} color="bg-blue-50" />
            <StatCard title="Завершены" value={stats.completed} color="bg-green-50" />
            <StatCard title="Споры" value={stats.disputed} color="bg-red-50" />
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg transition ${!filter ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Все
          </button>
          {['PENDING', 'PAID', 'COMPLETED', 'DISPUTED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition ${filter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {status === 'PENDING' && 'Ожидают'}
              {status === 'PAID' && 'Оплачены'}
              {status === 'COMPLETED' && 'Завершены'}
              {status === 'DISPUTED' && 'Споры'}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет заказов</h3>
            <p className="text-gray-600">
              {filter ? 'Нет заказов с выбранным статусом' : 'Заказы появятся, когда покупатели купят ваши товары'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Заказ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Товар</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Покупатель</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Сумма</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">
                        #{order.id.slice(0, 8)}
                      </span>
                      {order.dispute && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                          Спор
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.product.name}</p>
                        <p className="text-sm text-gray-500">{order.variant.name}</p>
                        <p className="text-xs text-gray-400">{order.product.store.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.user.name || order.user.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{(order.amount / 100).toFixed(2)} ₽</p>
                        {order.transaction && (
                          <p className="text-xs text-green-600">
                            +{(order.transaction.sellerAmount / 100).toFixed(2)} ₽
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
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

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
