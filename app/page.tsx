import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { Product, ProductVariant } from '@/types';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

type ProductWithVariants = Product & { variants: ProductVariant[] };

export default async function Home() {
  // Get only ACTIVE and APPROVED products from stores
  const products = await prisma.product.findMany({
    where: { 
      isActive: true,
      status: 'ACTIVE',
      store: {
        isActive: true,
        owner: {
          banned: false
        }
      }
    },
    include: { 
      variants: { orderBy: { id: 'asc' } },
      store: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as any[];

  // Get active stores
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get footer settings
  const footerRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/footer`, {
    cache: 'no-store'
  });
  const footerSettings = footerRes.ok ? await footerRes.json() : null;

  const hasStoreProducts = products.length > 0;
  const hasStores = stores.length > 0;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl mobile-padding">
        {/* Hero Section */}
        <div className="flex min-h-[30vh] sm:min-h-[35vh] flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-2 sm:p-3 shadow-xl border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Image src="/logo.svg" alt="Gulyaly" width={64} height={64} className="w-full h-full" priority />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-transparent">
            Цифровой помощник
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg text-zinc-700 dark:text-zinc-300 px-4">
            Умный выбор товаров
          </p>
          <p className="mt-1 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 px-4">
            Сравнивайте, анализируйте и находите лучший вариант для вас
          </p>
          
          <div className="mt-6 sm:mt-8">
            <a
              href="#products"
              className="apple-button rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl dark:bg-blue-500"
            >
              Начать подбор
            </a>
          </div>
        </div>

        {/* Stores Section */}
        {hasStores && (
          <div id="stores" className="pb-12">
            <div className="mb-6 sm:mb-8 text-center px-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Магазины
              </h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                Выберите магазин для просмотра товаров
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stores.map((store: any) => (
                <Link
                  key={store.id}
                  href={`/${store.slug}`}
                  className="card-hover group flex flex-col items-center rounded-2xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg hover:shadow-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20 transition-all"
                >
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-16 h-16 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl mb-4">
                      🏪
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {store.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {store._count?.products || 0} товаров
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        <div id="products" className="pb-8 sm:pb-12">
          <div className="mb-6 sm:mb-8 text-center px-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {hasStores ? 'Другие товары' : 'Доступные варианты'}
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Сравните характеристики и выберите оптимальное решение
            </p>
          </div>

          {hasStoreProducts ? (
            <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {products.map((product: any) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : hasStores ? (
            <div className="text-center text-zinc-500 dark:text-zinc-400 px-4 py-8">
              <p>Товары без магазина появятся здесь</p>
            </div>
          ) : (
            <div className="text-center text-zinc-500 dark:text-zinc-400 px-4">
              <p>Товары будут доступны после настройки базы данных</p>
              <p className="mt-2 text-sm">Выполните: npm run db:push && npm run db:seed</p>
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
