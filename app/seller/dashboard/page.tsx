'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SellerDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/seller/login');
      return;
    }

    const user = session.user as any;

    // Basic role check
    if (user.role !== 'SELLER') {
      setError('У вас нет доступа к панели продавца');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    // Load dashboard data (API will check all other validations)
    loadDashboard();
  }, [session, status, router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seller/dashboard');
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка загрузки данных (${res.status})`);
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-xl mb-4">❌ {error}</div>
          <p className="text-gray-600">Перенаправление...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Панель продавца</h1>
          <p className="text-gray-600 mt-2">
            Добро пожаловать, {session?.user?.name || 'Продавец'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Мои магазины"
            value={dashboardData?.stores?.length || 0}
            icon="🏪"
            link="/seller/stores"
          />
          <StatCard
            title="Товары"
            value={dashboardData?.productsCount || 0}
            icon="📦"
            link="/seller/products"
          />
          <StatCard
            title="Заказы"
            value={dashboardData?.ordersCount || 0}
            icon="📋"
            link="/seller/orders"
          />
          <StatCard
            title="Баланс"
            value={`${((dashboardData?.balance || 0) / 100).toFixed(2)} ₽`}
            icon="💰"
            link="/seller/payouts"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton
              label="Добавить товар"
              icon="➕"
              onClick={() => router.push('/seller/products/new')}
            />
            <ActionButton
              label="Управление магазином"
              icon="⚙️"
              onClick={() => router.push('/seller/stores')}
            />
            <ActionButton
              label="Запросить выплату"
              icon="💸"
              onClick={() => router.push('/seller/payouts')}
            />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Последние заказы</h2>
          {dashboardData?.recentOrders?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recentOrders.map((order: any) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Пока нет заказов</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, link }: any) {
  const router = useRouter();
  
  return (
    <div
      onClick={() => router.push(link)}
      className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function OrderRow({ order }: any) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div>
        <p className="font-medium">Заказ #{order.id.slice(0, 8)}</p>
        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <p className="font-medium">{(order.amount / 100).toFixed(2)} ₽</p>
        <p className="text-sm text-gray-600">{order.status}</p>
      </div>
    </div>
  );
}
