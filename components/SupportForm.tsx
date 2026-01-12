'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SupportForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      });

      if (res.ok) {
        setSuccess(true);
        setSubject('');
        setMessage('');
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
        router.refresh(); // Обновляем страницу для отображения нового сообщения
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка при отправке сообщения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-blue-200/50 bg-white p-4 sm:p-6 lg:p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
        💬 Написать в поддержку
      </h2>
      
      {success && (
        <div className="mb-4 sm:mb-6 rounded-lg bg-green-100 p-3 sm:p-4 text-sm sm:text-base text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ✅ Ваше сообщение отправлено в поддержку!
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            📝 Тема сообщения
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-blue-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
            placeholder="Кратко опишите проблему или вопрос"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            ✉️ Сообщение
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-blue-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
            placeholder="Подробно опишите вашу проблему или вопрос..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all touch-target"
        >
          {submitting ? 'Отправка...' : '✉️ Отправить сообщение'}
        </button>
      </form>
    </div>
  );
}