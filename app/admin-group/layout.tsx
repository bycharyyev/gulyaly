import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import { logAuthEvent } from '@/lib/auth-logger';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Проверяем авторизацию и роль ADMIN
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    // Логируем попытку несанкционированного доступа
    logAuthEvent('access_denied', {
      userId: (session?.user as any)?.id,
      email: session?.user?.email || undefined,
      role: (session?.user as any)?.role,
      path: '/admin',
    });
    
    redirect('/admin/login'); // Перенаправляем на логин если не админ
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />

      {/* Content */}
      <main className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
