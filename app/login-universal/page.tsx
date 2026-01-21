'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function UniversalLoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<string | undefined>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let identifier = '';
      
      if (authMethod === 'email') {
        if (!email || !password) {
          setError('Введите email и пароль');
          setLoading(false);
          return;
        }
        identifier = email;
      } else {
        if (!phone || !password) {
          setError('Введите номер телефона и пароль');
          setLoading(false);
          return;
        }
        
        if (!isValidPhoneNumber(phone)) {
          setError('Неверный формат номера телефона');
          setLoading(false);
          return;
        }
        identifier = phone;
      }

      const result = await signIn('credentials', {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверные учетные данные');
      } else {
        // Проверяем, есть ли URL для возврата
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl');
          router.push(returnUrl);
        } else {
          router.push('/profile');
        }
        router.refresh();
      }
    } catch (err) {
      setError('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl sm:rounded-3xl border-2 border-blue-200/50 bg-white/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl dark:border-blue-900/50 dark:bg-zinc-900/90">
          {/* Заголовок */}
          <div className="text-center mb-6 sm:mb-8">
            <Link href="/" className="inline-flex items-center justify-center gap-4 mb-4 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white p-2.5 shadow-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <Image src="/logo.svg" alt="Gulyaly" width={48} height={48} className="w-full h-full" priority />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gulyaly
              </h1>
            </Link>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Вход в аккаунт
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Выберите способ входа
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl sm:rounded-2xl bg-red-50 border-2 border-red-300 p-3 sm:p-4 text-center text-sm sm:text-base text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Переключатель метода аутентификации */}
          <div className="mb-6 flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                authMethod === 'email'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                authMethod === 'phone'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Телефон
            </button>
          </div>

          {/* Форма входа */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {authMethod === 'email' ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="block w-full rounded-lg border border-zinc-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Номер телефона
                </label>
                <PhoneInput
                  international
                  defaultCountry="RU"
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    setPhoneError('');
                  }}
                  className="phone-input-custom"
                  placeholder="Введите номер телефона"
                />
                {phoneError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    ⚠️ {phoneError}
                  </p>
                )}
                {phone && isValidPhoneNumber(phone) && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✅ Номер телефона корректен
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="block w-full rounded-lg border border-zinc-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (authMethod === 'email' ? !email : !phone) || !password}
              className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          {/* Ссылка на регистрацию */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Зарегистрироваться
              </Link>
            </p>
          </div>

          {/* Ссылка на главную */}
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}