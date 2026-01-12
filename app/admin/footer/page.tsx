'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminHeader';

export default function AdminFooterPage() {
  const [settings, setSettings] = useState({
    companyName: 'Gulyaly',
    email: 'info@gulyaly.com',
    phone: '+7 (999) 123-45-67',
    telegram: '',
    whatsapp: '',
    vk: '',
    instagram: '',
    description: 'Цифровой магазин. Просто. Быстро. Красиво.',
    year: new Date().getFullYear(),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/footer');
      const data = await res.json();
      if (data) {
        setSettings({
          companyName: data.companyName || '',
          email: data.email || '',
          phone: data.phone || '',
          telegram: data.telegram || '',
          whatsapp: data.whatsapp || '',
          vk: data.vk || '',
          instagram: data.instagram || '',
          description: data.description || '',
          year: data.year || new Date().getFullYear(),
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
      const res = await fetch('/api/footer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage('Настройки успешно сохранены!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Ошибка сохранения настроек');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <AdminHeader />
      
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
            Настройки футера
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Управление контактами и социальными сетями
          </p>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl p-4 text-center font-semibold ${
            message 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Основная информация
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Название компании
                </label>
                <input
                  type="text"
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Год (для копирайта)
                </label>
                <input
                  type="number"
                  value={settings.year || new Date().getFullYear()}
                  onChange={(e) => setSettings({ ...settings, year: parseInt(e.target.value) })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                  min="2020"
                  max="2100"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Описание
              </label>
              <textarea
                value={settings.description || ''}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                rows={2}
                required
              />
            </div>
          </div>

          {/* Контакты */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Контакты
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                  placeholder="info@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
          </div>

          {/* Социальные сети */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Социальные сети
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Оставьте пустым, если не хотите показывать ссылку
            </p>
            
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Telegram
                </label>
                <input
                  type="url"
                  value={settings.telegram || ''}
                  onChange={(e) => setSettings({ ...settings, telegram: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://t.me/username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  WhatsApp
                </label>
                <input
                  type="url"
                  value={settings.whatsapp || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://wa.me/79991234567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  VK
                </label>
                <input
                  type="url"
                  value={settings.vk || ''}
                  onChange={(e) => setSettings({ ...settings, vk: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://vk.com/username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={settings.instagram || ''}
                  onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                  className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="https://instagram.com/username"
                />
              </div>
            </div>
          </div>

          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
            >
              {loading ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
