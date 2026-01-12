'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone'); // phone = ввод телефона, code = ввод SMS кода
  const [phone, setPhone] = useState<string | undefined>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState('');

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPhoneError('');

    // Проверка валидности номера
    if (!phone) {
      setPhoneError('Введите номер телефона');
      setLoading(false);
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      setPhoneError('Неверный формат номера телефона');
      setLoading(false);
      return;
    }

    try {
      // TODO: Интегрируйте ваш SMS сервис здесь
      // const response = await fetch('/api/auth/sms/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone })
      // });
      
      // Временно для разработки - переходим к вводу кода
      setStep('code');
      startCountdown();
    } catch (err) {
      setError('Ошибка отправки SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Интегрируйте проверку кода через ваш SMS сервис
      // const response = await fetch('/api/auth/sms/verify', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone, code })
      // });
      // 
      // if (response.ok) {
      //   // Проверяем, есть ли URL для возврата
      //   const returnUrl = sessionStorage.getItem('returnUrl');
      //   if (returnUrl) {
      //     sessionStorage.removeItem('returnUrl');
      //     router.push(returnUrl);
      //   } else {
      //     router.push('/profile');
      //   }
      //   router.refresh();
      // } else {
      //   setError('Неверный код');
      // }
      
      // Временно для разработки
      setError('SMS сервис не подключен. Интегрируйте ваш SMS API.');
    } catch (err) {
      setError('Ошибка проверки кода');
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
              {step === 'phone' ? 'Вход по SMS' : 'Введите код'}
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              {step === 'phone' 
                ? 'Введите номер телефона для получения кода' 
                : `Код отправлен на ${phone}`}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl sm:rounded-2xl bg-red-50 border-2 border-red-300 p-3 sm:p-4 text-center text-sm sm:text-base text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Шаг 1: Ввод телефона */}
          {step === 'phone' && (
            <form onSubmit={handleSendSMS} className="space-y-5 sm:space-y-6">
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
                    Номер телефона корректен
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !phone || !isValidPhoneNumber(phone || '')}
                className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
              >
                {loading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          )}

          {/* Шаг 2: Ввод SMS кода */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-5 sm:space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  🔢 Код из SMS
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-center text-2xl font-mono tracking-widest text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all"
              >
                {loading ? 'Проверка...' : 'Войти'}
              </button>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                    setError('');
                  }}
                  className="w-full rounded-full border-2 border-zinc-300 dark:border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  ← Изменить номер
                </button>

                {countdown === 0 ? (
                  <button
                    type="button"
                    onClick={handleSendSMS}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Отправить код повторно
                  </button>
                ) : (
                  <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                    Повторная отправка через {countdown} сек
                  </p>
                )}
              </div>
            </form>
          )}

          {/* Ссылка на главную */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
