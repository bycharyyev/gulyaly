'use client';

import { useSession, signOut } from 'next-auth/react';

export default function TestAuthPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест авторизации</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Статус сессии:</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Session:</strong> {session ? 'YES' : 'NO'}</p>
        
        {session && (
          <div className="mt-4">
            <h3 className="font-semibold">Данные сессии:</h3>
            <pre className="bg-white p-2 rounded mt-2 text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
            
            <button
              onClick={() => signOut()}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
            >
              Выйти
            </button>
          </div>
        )}
        
        {!session && (
          <div className="mt-4">
            <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded">
              Войти
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
