'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SupportChatWrapper from '@/components/SupportChatWrapper';
import AddressManager from '@/components/AddressManager';
import AuthModal from '@/components/AuthModal';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type TabType = 'about' | 'orders' | 'profile' | 'support' | 'addresses';

type Order = {
  id: string;
  createdAt: string;
  product: { name: string };
  variant: { name: string };
  amount: number;
  status: string;
};

const statusLabels: Record<string, string> = {
  PENDING: 'Ожидание',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
};

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { data: session, status, update } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');

  // Загружаем данные пользователя
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setPhone((session.user as any).phone || '');
    }
  }, [session]);

  // Загружаем заказы при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'orders' && session?.user && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab, session]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Если пользователь не авторизован, показываем модальное окно входа
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-6xl">⏳</div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AuthModal 
          isOpen={true}
          onClose={() => router.push('/')}
          returnUrl="/profile"
          title="Требуется авторизация"
          message="Пожалуйста войдите чтобы получить доступ к личному кабинету"
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Требуется авторизация
            </h2>
            <p className="text-gray-600 mb-4">
              Пожалуйста войдите чтобы получить доступ к личному кабинету
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Открыть окно входа
            </button>
          </div>
        </div>
      </>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        // Обновляем сессию с новыми данными
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.name,
            phone: data.phone,
          },
        });
        alert('Профиль успешно обновлён!');
      } else {
        setError(data.error || 'Ошибка обновления профиля');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Произошла ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Вы уверены что хотите выйти?')) {
      signOut({ callbackUrl: '/' });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="mx-auto max-w-4xl px-2 sm:px-4 py-4 sm:py-8 lg:py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Личный кабинет
          </h1>
          <button
            onClick={handleLogout}
            className="apple-button rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:shadow-lg"
          >
            Выйти
          </button>
        </div>

        {/* Вкладки */}
        <div className="mt-4 sm:mt-8 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto -mx-2 sm:mx-0">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 px-2 sm:px-0">
            {[{ id: 'profile', label: 'Профиль' },
              { id: 'addresses', label: '📍 Адреса' },
              { id: 'orders', label: 'Заказы' },
              { id: 'support', label: 'Поддержка' },
              { id: 'about', label: 'О приложении' },].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`whitespace-nowrap border-b-2 px-1 py-3 sm:py-4 text-xs sm:text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Контент вкладок */}
        <div className="mt-4 sm:mt-8">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                Редактор профиля
              </h2>
              
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {error}
                </div>
              )}
              
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 space-y-6">
                {/* Отображение всех данных пользователя */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Ваши данные</h3>
                  
                  {/* Email - только для чтения */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Email
                    </label>
                    <div className="block w-full rounded-lg border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {session?.user?.email || 'Не указан'}
                    </div>
                  </div>

                  {/* ID пользователя - только для чтения */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      ID пользователя
                    </label>
                    <div className="block w-full rounded-lg border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-sm">
                      {session?.user?.id || 'Не указан'}
                    </div>
                  </div>

                  {/* Роль - только для чтения */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Роль
                    </label>
                    <div className="block w-full rounded-lg border border-zinc-200 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {(session?.user as any)?.role || 'USER'}
                    </div>
                  </div>
                </div>

                {/* Разделитель */}
                <div className="border-t border-zinc-200 dark:border-zinc-700"></div>

                {/* Редактируемые поля */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Редактирование</h3>
                  
                  {/* Имя - можно редактировать */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Введите ваше имя"
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Телефон - с OTP верификацией */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Телефон
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+7 (999) 123-45-67"
                        className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {phone !== (session?.user as any)?.phone && (
                        <button
                          className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                          onClick={() => {
                            // TODO: Открыть OTP верификацию
                            alert('OTP верификация будет добавлена');
                          }}
                        >
                          📱 Подтвердить
                        </button>
                      )}
                    </div>
                    {phone !== (session?.user as any)?.phone && (
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                        📱 Требуется OTP верификация для изменения номера телефона
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="pt-4">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving || (phone !== (session?.user as any)?.phone)}
                    className="w-full sm:w-auto apple-button rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3.5 text-base font-semibold text-white hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  {phone !== (session?.user as any)?.phone && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      Сначала подтвердите новый номер телефона через OTP
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div>
              <AddressManager />
            </div>
          )}

          {activeTab === 'about' && (
            <div className="prose dark:prose-invert">
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white">
                О сервисе Gulyaly.com
              </h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                Добро пожаловать в цифровой магазин Gulyaly.com! Мы предлагаем быструю и удобную покупку цифровых продуктов без лишних шагов.
              </p>
              <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                Просто выберите продукт, вариант и оплатите — всё готово!
              </p>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                История заказов
              </h2>
              
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="text-lg text-zinc-600 dark:text-zinc-400">
                    Загрузка заказов...
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-4xl mb-4">Нет заказов</div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    Заказов пока нет
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Оформите первый заказ на главной странице
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-zinc-200 p-4 sm:p-6 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                        <div className="flex-1">
                          <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                            {order.product.name}
                          </p>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500">
                            {order.variant.name}
                          </p>
                          <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:text-right sm:flex-col sm:items-end">
                          <p className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                            {(order.amount / 100).toFixed(2)} ₽
                          </p>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            order.status === 'COMPLETED' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : order.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white">
                Поддержка
              </h2>
              <div className="mt-4 sm:mt-6">
                <SupportChatWrapper />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
