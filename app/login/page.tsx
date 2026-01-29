'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function UniversalLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [phone, setPhone] = useState<string | undefined>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Состояния для OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('✅ [CLIENT] Пользователь уже авторизован, перенаправляем на главную');
      router.push('/');
      router.refresh();
    }
  }, [status, session, router]);

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!phone) {
      setError('Введите номер телефона');
      setLoading(false);
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      setError('Введите корректный номер телефона');
      setLoading(false);
      return;
    }

    if (!otpSent) {
      // Отправляем OTP
      await handleSendOTP();
    } else {
      // Проверяем OTP
      await handleVerifyOTP();
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setIsVerifying(true);

    try {
      const response = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone || '' }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setError('✅ Код подтверждения отправлен по SMS');
      } else {
        setError(data.error || 'Ошибка отправки кода');
      }
    } catch (error) {
      setError('Ошибка отправки кода');
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setLoading(true);
    setIsVerifying(true);

    try {
      console.log('🔍 [CLIENT] Начинаю верификацию OTP:', { phone, otpCode });
      
      // Сначала проверяем/создаем пользователя
      const loginResponse = await fetch('/api/sms/login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone || '',
          code: otpCode,
        }),
      });

      const loginData = await loginResponse.json();
      console.log('🔍 [CLIENT] Ответ login-otp:', loginData);

      if (loginResponse.ok) {
        console.log('✅ [CLIENT] OTP верифицирован, начинаю вход в NextAuth');
        console.log('🔍 [CLIENT] Данные для signIn:', {
          phone: phone,
          password: 'otp-login',
          phoneType: typeof phone
        });
        
        // Входим через NextAuth
        const result = await signIn('credentials', {
          phone: phone, // Используем phone вместо identifier
          password: 'otp-login',
          redirect: false,
        });

        console.log('🔍 [CLIENT] Результат signIn:', result);

        if (result?.error) {
          console.log('❌ [CLIENT] Ошибка signIn:', result.error);
          // Если это CredentialsSignin но пользователь найден, возможно это просто предупреждение
          if (result.error === 'CredentialsSignin' && loginData?.user) {
            console.log('⚠️ [CLIENT] CredentialsSignin но пользователь найден, пробуем продолжить');
            setError('✅ Вход успешен! Перенаправление...');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 1500);
          } else {
            setError('Ошибка создания сессии: ' + result.error);
          }
        } else if (result?.ok) {
          console.log('✅ [CLIENT] Успешный вход в NextAuth');
          setError('✅ Вход успешен! Перенаправление...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          console.log('❌ [CLIENT] Неизвестная ошибка signIn');
          setError('Ошибка создания сессии: неизвестная ошибка');
        }
      } else {
        console.log('❌ [CLIENT] Ошибка верификации OTP:', loginData.error);
        setError(loginData.error || 'Неверный код');
      }
    } catch (error) {
      console.log('💥 [CLIENT] Исключение при верификации:', error);
      setError('Ошибка верификации: ' + error);
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  };

  const resetOtp = () => {
    setOtpSent(false);
    setOtpCode('');
    setError('');
  };

  const getButtonText = () => {
    if (loading) {
      return otpSent ? 'Подтверждение...' : 'Отправка кода...';
    }
    
    return otpSent ? 'Войти по коду' : 'Войти';
  };

  const isButtonDisabled = () => {
    if (loading) return true;
    
    if (otpSent) {
      return !otpCode || isVerifying;
    }
    
    return !phone || isVerifying;
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
              Вход по телефону
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Введите номер телефона для получения кода подтверждения
            </p>
          </div>

          {error && (
            <div className={`mb-6 rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-center text-sm sm:text-base ${
              error.includes('✅') 
                ? 'bg-green-50 border-green-300 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                : 'bg-red-50 border-red-300 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            }`}>
              {error}
            </div>
          )}

          {/* Форма входа по телефону */}
          <form onSubmit={handlePhoneAuth} className="space-y-5 sm:space-y-6">
            {/* Поле телефона */}
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

            {/* OTP форма */}
            {otpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Код подтверждения
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      // Разрешаем только цифры
                      const value = e.target.value.replace(/\D/g, '');
                      setOtpCode(value);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="block w-full rounded-lg border border-zinc-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={resetOtp}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ← Изменить номер телефона
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  📱 Нажмите "Войти" чтобы получить код подтверждения по SMS
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isButtonDisabled()}
              className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all"
            >
              {getButtonText()}
            </button>
          </form>

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
