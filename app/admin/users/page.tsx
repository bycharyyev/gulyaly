'use client';

const mockUsers = [
  {
    id: '1',
    email: 'user@example.com',
    name: 'Пользователь 1',
    role: 'user',
    ordersCount: 5,
    createdAt: '2026-01-01',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Администратор',
    role: 'admin',
    ordersCount: 0,
    createdAt: '2025-12-15',
  },
];

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
        Управление пользователями
      </h1>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Имя
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Роль
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Заказов
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Дата регистрации
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
                {mockUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      {user.email}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {user.name}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {user.role === 'admin' ? 'Админ' : 'Польз.'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {user.ordersCount}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
