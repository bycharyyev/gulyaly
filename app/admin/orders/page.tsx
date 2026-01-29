'use client';

import { useState, useEffect } from 'react';

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидание',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${filter}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки заказов');
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления статуса');
      }

      await loadOrders(); // Перезагружаем заказы
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <span className="ml-3 text-zinc-600 dark:text-zinc-400">Загрузка заказов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button 
          onClick={loadOrders}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
        Управление заказами
      </h1>

      {/* Фильтры */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
        {['all', 'PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {status === 'all' ? 'Все' : statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Таблица заказов */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Дата
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Пользователь
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Продукт
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Сумма
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Статус
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      <div>
                        <div className="font-medium">{order.userName || 'Unknown'}</div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-xs">
                          {order.userEmail || order.userPhone || 'No contact'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="font-medium">{order.productName}</div>
                      <div className="text-zinc-500 dark:text-zinc-400">{order.variantName}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {order.amount / 100} ₽
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                      >
                        <option value="PENDING">Ожидание</option>
                        <option value="PAID">Оплачен</option>
                        <option value="PROCESSING">В обработке</option>
                        <option value="COMPLETED">Выполнен</option>
                        <option value="CANCELLED">Отменён</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
          Заказы не найдены
        </div>
      )}
    </div>
  );
}
