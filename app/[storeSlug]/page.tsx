import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Image from 'next/image';

interface PageProps {
  params: Promise<{ storeSlug: string }>;
}

export default async function StorePage({ params }: PageProps) {
  const { storeSlug } = await params;

  // Find the store
  const store = await prisma.store.findUnique({
    where: {
      slug: storeSlug,
      isActive: true,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!store) {
    notFound();
  }

  // Get active products for this store
  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isActive: true,
    },
    include: {
      variants: {
        orderBy: { id: 'asc' },
      },
      store: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get footer settings
  const footerRes = await fetch(
    `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/footer`,
    { cache: 'no-store' }
  );
  const footerSettings = footerRes.ok ? await footerRes.json() : null;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Store Banner */}
      {store.banner && (
        <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden">
          <img
            src={store.banner}
            alt={`${store.name} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <main className="mx-auto max-w-7xl mobile-padding py-8">
        {/* Store Info */}
        <div className={`flex flex-col items-center ${store.banner ? '-mt-20 relative z-10' : ''} mb-8`}>
          <div className="flex items-center gap-4 mb-4">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl shadow-xl">
                🏪
              </div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
                {store.name}
              </h1>
              {store.description && (
                <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-lg">
                  {store.description}
                </p>
              )}
            </div>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {products.length} товаров в каталоге
          </div>
        </div>

        {/* Products Section */}
        <div id="products">
          <div className="mb-6 sm:mb-8 text-center px-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Каталог товаров
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Выберите товары из коллекции {store.name}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {(products as any[]).map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    store: store,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-zinc-500 dark:text-zinc-400 px-4 py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg">В этом магазине пока нет товаров</p>
              <p className="text-sm mt-2">Загляните позже!</p>
            </div>
          )}
        </div>
      </main>

      <Footer
        companyName={footerSettings?.companyName}
        year={footerSettings?.year}
        contacts={{
          email: footerSettings?.email,
          phone: footerSettings?.phone,
          telegram: footerSettings?.telegram,
          whatsapp: footerSettings?.whatsapp,
          vk: footerSettings?.vk,
          instagram: footerSettings?.instagram,
        }}
      />
    </div>
  );
}

export async function generateStaticParams() {
  // Generate static params for all active stores
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  return stores.map((store: { slug: string }) => ({
    storeSlug: store.slug,
  }));
}
