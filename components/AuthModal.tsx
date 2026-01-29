'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
  title?: string;
  message?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  returnUrl,
  title = '🔐 Требуется авторизация',
  message = 'Войдите или зарегистрируйтесь, чтобы продолжить'
}: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
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
      console.log('🔍 [AUTH-MODAL] Отправка OTP:', { phone });
      
      const response = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      console.log('🔍 [AUTH-MODAL] Ответ send-otp:', data);

      if (response.ok) {
        setStep('code');
        startCountdown();
      } else {
        setError(data.error || 'Ошибка отправки SMS');
      }
    } catch (err) {
      console.error('💥 [AUTH-MODAL] Ошибка отправки SMS:', err);
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
      console.log('🔍 [AUTH-MODAL] Проверка OTP:', { phone, code });
      
      // Сначала проверяем/создаем пользователя
      const loginResponse = await fetch('/api/sms/login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone || '',
          code: code,
        }),
      });

      const loginData = await loginResponse.json();
      console.log('🔍 [AUTH-MODAL] Ответ login-otp:', loginData);

      if (loginResponse.ok) {
        console.log('✅ [AUTH-MODAL] OTP верифицирован, начинаем вход в NextAuth');
        
        // Импортируем signIn динамически чтобы избежать SSR ошибок
        const { signIn } = await import('next-auth/react');
        
        // Входим через NextAuth
        const result = await signIn('credentials', {
          phone: phone,
          password: 'otp-login',
          redirect: false,
        });

        console.log('🔍 [AUTH-MODAL] Результат signIn:', result);

        if (result?.error) {
          console.log('❌ [AUTH-MODAL] Ошибка signIn:', result.error);
          setError('Ошибка создания сессии: ' + result.error);
        } else if (result?.ok) {
          console.log('✅ [AUTH-MODAL] Успешный вход');
          setError('✅ Вход успешен!');
          
          // Закрываем модальное окно и перенаправляем
          setTimeout(() => {
            onClose();
            if (returnUrl) {
              router.push(returnUrl);
            } else {
              router.push('/');
            }
            router.refresh();
          }, 1000);
        } else {
          console.log('❌ [AUTH-MODAL] Неизвестная ошибка signIn');
          setError('Ошибка создания сессии: неизвестная ошибка');
        }
      } else {
        console.log('❌ [AUTH-MODAL] Ошибка верификации OTP:', loginData.error);
        setError(loginData.error || 'Неверный код');
      }
    } catch (err) {
      console.error('💥 [AUTH-MODAL] Ошибка проверки кода:', err);
      setError('Ошибка проверки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    // Сохраняем URL для возврата
    if (returnUrl) {
      sessionStorage.setItem('returnUrl', returnUrl);
    }
    router.push('/login');
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl transform transition-transform animate-slide-up">
        {/* Header */}
        <div className="relative border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white p-2 shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Image src="/logo.svg" alt="Gulyaly" width={32} height={32} className="w-full h-full" priority />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white pr-10">
              {title}
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 ml-13">
            {message}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border-2 border-red-300 p-4 text-center text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Шаг 1: Ввод телефона */}
          {step === 'phone' && (
            <form onSubmit={handleSendSMS} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  📞 Номер телефона
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

              <button
                type="submit"
                disabled={loading || !phone || !isValidPhoneNumber(phone || '')}
                className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
              >
                {loading ? '📤 Отправка...' : '📤 Получить код'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Перейти на полную страницу входа →
                </button>
              </div>
            </form>
          )}

          {/* Шаг 2: Ввод SMS кода */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  🔢 Код из SMS
                </label>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Код отправлен на {phone}
                </p>
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
                {loading ? '🔍 Проверка...' : '✅ Войти'}
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
                    📤 Отправить код повторно
                  </button>
                ) : (
                  <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                    Повторная отправка через {countdown} сек
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
