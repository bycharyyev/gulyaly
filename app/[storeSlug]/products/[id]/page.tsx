import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

interface PageProps {
  params: Promise<{ storeSlug: string; id: string }>;
}

export default async function StoreProductPage({ params }: PageProps) {
  const { storeSlug, id } = await params;

  // First, verify the store exists and is active
  const store = await prisma.store.findUnique({
    where: {
      slug: storeSlug,
      isActive: true,
    },
  });

  if (!store) {
    notFound();
  }

  // Get the product for this store
  const product = await prisma.product.findFirst({
    where: {
      id,
      storeId: store.id,
      isActive: true,
    },
    include: {
      variants: {
        orderBy: { id: 'asc' },
      },
      store: true,
    },
  });

  if (!product) {
    notFound();
  }

  // Get footer settings
  const footerRes = await fetch(
    `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/footer`,
    { cache: 'no-store' }
  );
  const footerSettings = footerRes.ok ? await footerRes.json() : null;

  const productAny = product as any;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl mobile-padding py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-blue-500 transition-colors">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/${storeSlug}`} className="hover:text-blue-500 transition-colors">
            {store.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-blue-200/50 dark:border-blue-900/50">
              <img
                src={product.image || (productAny.images?.[0] || '/placeholder.svg')}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {productAny.images && Array.isArray(productAny.images) && productAny.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productAny.images.map((img: string, index: number) => (
                  <div
                    key={index}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <Link
                href={`/${storeSlug}`}
                className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                ← Вернуться в {store.name}
              </Link>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-6">
              <Link
                href={`/${storeSlug}`}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs">
                    🏪
                  </div>
                )}
                <span>{store.name}</span>
              </Link>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg leading-relaxed">
              {product.description}
            </p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  Варианты
                </h2>
                <div className="space-y-3">
                  {product.variants.map((variant: typeof product.variants[0]) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-4 rounded-2xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20"
                    >
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">
                          {variant.name}
                        </h3>
                        {variant.description && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {variant.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {variant.price / 100} ₽
                        </span>
                        <Link
                          href={`/checkout?productId=${product.id}&variantId=${variant.id}`}
                          className="block mt-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                        >
                          Купить
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single variant (no variants or single variant case) */}
            {product.variants.length === 0 && (
              <div className="p-6 rounded-2xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20">
                <span className="text-zinc-500 dark:text-zinc-400">Цена:</span>
                <span className="ml-2 text-3xl font-bold text-green-600 dark:text-green-400">
                  Уточняйте
                </span>
              </div>
            )}
          </div>
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
