'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  MessageSquare, 
  Settings, 
  LogOut,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Shield,
  Database,
  Globe,
  Lock
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  unreadMessages: number;
  pendingOrders: number;
  onlineUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

const AdminDashboard: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
      value: number;
      isPositive: boolean;
    };
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }> = ({ title, value, icon, trend, color }) => {
    const colorClasses = {
      blue: 'bg-blue-500 border-blue-200',
      green: 'bg-green-500 border-green-200',
      yellow: 'bg-yellow-500 border-yellow-200',
      red: 'bg-red-500 border-red-200',
      purple: 'bg-purple-500 border-purple-200',
    };

    return (
      <div className={`relative overflow-hidden rounded-lg border ${colorClasses[color].split(' ')[1]} bg-white p-6 shadow-sm transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className={`flex items-center text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`mr-1 h-3 w-3 ${!trend.isPositive ? 'rotate-180' : ''}`} />
                {trend.value}%
              </div>
            )}
          </div>
          <div className={`rounded-lg p-3 ${colorClasses[color].split(' ')[0]} bg-opacity-10`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка панели управления...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Доступ запрещен</h2>
          <p className="mt-2 text-gray-600">У вас нет прав для доступа к админ-панели</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Панель управления Gulyaly</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="mr-1 h-4 w-4" />
                Обновлено: {lastUpdate.toLocaleTimeString()}
              </div>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(session.user as any).name?.[0] || 'A'}
                  </span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {(session.user as any).name || 'Admin'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="mr-1 h-4 w-4" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Banner */}
        {stats?.systemHealth && stats.systemHealth !== 'healthy' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            stats.systemHealth === 'critical' 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">
                {stats.systemHealth === 'critical' ? 'Критические проблемы' : 'Требуется внимание'}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Всего пользователей"
            value={stats?.totalUsers || 0}
            icon={<Users className="h-6 w-6 text-blue-600" />}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
          <StatCard
            title="Всего заказов"
            value={stats?.totalOrders || 0}
            icon={<ShoppingCart className="h-6 w-6 text-green-600" />}
            trend={{ value: 8, isPositive: true }}
            color="green"
          />
          <StatCard
            title="Общая выручка"
            value={`${stats?.totalRevenue ? (stats.totalRevenue / 100).toLocaleString() : '0'} ₽`}
            icon={<DollarSign className="h-6 w-6 text-yellow-600" />}
            trend={{ value: 15, isPositive: true }}
            color="yellow"
          />
          <StatCard
            title="Товары"
            value={stats?.totalProducts || 0}
            icon={<Package className="h-6 w-6 text-purple-600" />}
            color="purple"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Непрочитанные сообщения"
            value={stats?.unreadMessages || 0}
            icon={<MessageSquare className="h-6 w-6 text-red-600" />}
            color="red"
          />
          <StatCard
            title="Ожидающие заказы"
            value={stats?.pendingOrders || 0}
            icon={<Clock className="h-6 w-6 text-yellow-600" />}
            color="yellow"
          />
          <StatCard
            title="Онлайн пользователи"
            value={stats?.onlineUsers || 0}
            icon={<Activity className="h-6 w-6 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Система"
            value={stats?.systemHealth === 'healthy' ? 'Здорова' : 
                   stats?.systemHealth === 'warning' ? 'Предупреждение' : 'Критично'}
            icon={<Database className="h-6 w-6 text-blue-600" />}
            color={stats?.systemHealth === 'healthy' ? 'green' : 
                   stats?.systemHealth === 'warning' ? 'yellow' : 'red'}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Последние заказы</h2>
              <button 
                onClick={() => router.push('/admin/orders')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Все заказы →
              </button>
            </div>
            <div className="space-y-3">
              {/* Placeholder for recent orders */}
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Загрузка последних заказов...</p>
              </div>
            </div>
          </div>

          {/* Recent Support Messages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Поддержка</h2>
              <button 
                onClick={() => router.push('/admin/support')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Все сообщения →
              </button>
            </div>
            <div className="space-y-3">
              {/* Placeholder for recent messages */}
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Загрузка сообщений поддержки...</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Статус системы</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">API</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">База данных</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Платежи</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
