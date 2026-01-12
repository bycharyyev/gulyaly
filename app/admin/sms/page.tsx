'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminHeader';

export default function AdminSMSPage() {
  const [settings, setSettings] = useState({
    deviceID: '',
    secret: '',
    gatewayURL: 'https://sms.ibnux.net/',
    simNumber: 0,
    enabled: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Тестовое сообщение от Gulyaly');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/sms-settings');
      const data = await res.json();
      if (data) {
        setSettings({
          deviceID: data.deviceID || '',
          secret: data.secret || '',
          gatewayURL: data.gatewayURL || 'https://sms.ibnux.net/',
          simNumber: data.simNumber || 0,
          enabled: data.enabled || false
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/sms-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage('Настройки успешно сохранены!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await res.json();
        setMessage(`Ошибка: ${errorData.error || 'Не удалось сохранить'}`);
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      setMessage(`Ошибка при сохранении: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      alert('Введите номер телефона');
      return;
    }

    setTestLoading(true);
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('SMS отправлена успешно!');
      } else {
        alert(`Ошибка: ${data.message}`);
      }
    } catch (error) {
      alert('Ошибка при отправке SMS');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <AdminHeader />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
            Настройки SMS
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Конфигурация SMS Gateway для отправки OTP кодов
          </p>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl p-4 text-center font-semibold ${
            message.includes('успешно')
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gateway Configuration */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Конфигурация Gateway
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  Включить SMS Gateway
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  URL Gateway
                </label>
                <input
                  type="url"
                  value={settings.gatewayURL || ''}
                  onChange={(e) => setSettings({ ...settings, gatewayURL: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://sms.ibnux.net/"
                  required
                />
                <p className="mt-1 text-xs text-zinc-500">
                  URL вашего SMS Gateway сервера
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={settings.deviceID || ''}
                  onChange={(e) => setSettings({ ...settings, deviceID: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                  placeholder="sadsdgsadasfsf"
                  required
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Идентификатор устройства из Android приложения
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={settings.secret || ''}
                  onChange={(e) => setSettings({ ...settings, secret: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                  placeholder="b0ecc194-ibnu-ibnu-b12b-bc7e8c60919b"
                  required
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Секретный ключ из приложения (будет хеширован MD5)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Номер SIM-карты
                </label>
                <select
                  value={settings.simNumber}
                  onChange={(e) => setSettings({ ...settings, simNumber: parseInt(e.target.value) })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value={0}>По умолчанию (0)</option>
                  <option value={1}>SIM 1</option>
                  <option value={2}>SIM 2</option>
                  <option value={3}>SIM 3</option>
                  <option value={4}>SIM 4</option>
                </select>
                <p className="mt-1 text-xs text-zinc-500">
                  Выберите SIM-карту для отправки SMS
                </p>
              </div>
            </div>
          </div>

          {/* Test SMS */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Тестирование
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Номер телефона
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="+79991234567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Текст сообщения
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <button
                type="button"
                onClick={handleTestSMS}
                disabled={testLoading || !settings.enabled}
                className="w-full rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testLoading ? 'Отправка...' : 'Отправить тестовое SMS'}
              </button>
              
              {!settings.enabled && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Сначала включите SMS Gateway и сохраните настройки
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </form>

        {/* Documentation */}
        <div className="mt-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">
            Инструкция по настройке
          </h3>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300 list-decimal list-inside">
            <li>Скачайте Android приложение: <a href="https://github.com/ibnux/SMSGateway-android" target="_blank" className="text-blue-600 hover:underline">GitHub</a></li>
            <li>Установите приложение на Android устройство</li>
            <li>Откройте приложение и скопируйте Device ID и Secret Key</li>
            <li>Вставьте Device ID и Secret в форму выше</li>
            <li>Убедитесь что устройство подключено к интернету</li>
            <li>Включите SMS Gateway и сохраните настройки</li>
            <li>Протестируйте отправку SMS</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
