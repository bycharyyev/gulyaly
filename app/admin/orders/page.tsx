'use client';

import { useState } from 'react';

const mockOrders = [
  {
    id: '1',
    user: 'user@example.com',
    product: 'Букет роз',
    variant: '10 роз',
    amount: 900,
    status: 'completed',
    date: '2026-01-10',
  },
  {
    id: '2',
    user: 'test@example.com',
    product: 'Букет роз',
    variant: '1 роза',
    amount: 100,
    status: 'pending',
    date: '2026-01-09',
  },
];

const statusLabels: Record<string, string> = {
  pending: 'Ожидание',
  processing: 'В обработке',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function AdminOrdersPage() {
  const [orders] = useState(mockOrders);
  const [filter, setFilter] = useState<string>('all');

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
        Управление заказами
      </h1>

      {/* Фильтры */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
        {['all', 'pending', 'processing', 'completed', 'cancelled'].map((status) => (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      {new Date(order.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {order.user}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="font-medium">{order.product}</div>
                      <div className="text-zinc-500 dark:text-zinc-400">{order.variant}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {order.amount} ₽
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="mt-8 text-center text-zinc-500 dark:text-zinc-400">
          Заказы не найдены
        </div>
      )}
    </div>
  );
}
