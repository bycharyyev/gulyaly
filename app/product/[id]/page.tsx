'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthModal } from '@/lib/AuthModalContext';
import Header from '@/components/Header';
import { Product } from '@/types';

// Helper function to safely handle images array
function getImagesArray(images: any): string[] {
  if (!images) return [];
  
  // If it's already an array, return it
  if (Array.isArray(images)) {
    return images as string[];
  }
  
  // If it's a JSON string, parse it
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  
  // If it's an object (from Prisma JSON field), handle Prisma-specific formats
  if (typeof images === 'object') {
    // Handle Prisma JsonNull and DbNull
    if (images === null) {
      return [];
    }
    
    // If it has a 'set' property (from Prisma update operations), use its value
    if (images.set && Array.isArray(images.set)) {
      return images.set;
    }
    
    // If it's a Buffer (in case of binary data), convert to string and parse
    if (Buffer.isBuffer(images)) {
      try {
        const str = images.toString('utf8');
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    
    // If it's a plain object, try to convert to JSON string then parse
    try {
      const str = JSON.stringify(images);
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  
  return [];
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const { openAuthModal } = useAuthModal();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handlePurchase = async () => {
    if (!selectedVariant) return;
    
    // Проверка авторизации
    if (!session) {
      openAuthModal({
        title: 'Требуется авторизация',
        message: 'Войдите, чтобы продолжить выбор',
        returnUrl: window.location.pathname,
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: selectedVariant.id }),
      });

      const data = await response.json();

      if (data.url) {
        // Перенаправляем на Stripe Checkout
        window.location.href = data.url;
      } else {
        alert(data.error || 'Ошибка создания сессии оплаты');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Произошла ошибка. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProduct = async () => {
      const resolvedParams = await params;
      const productId = resolvedParams.id;
      
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        
        // Обработка изображений перед установкой продукта
        const processedProduct = {
          ...data,
          images: getImagesArray(data.images)
        };
        
        setProduct(processedProduct);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      } catch (error) {
        console.error('Ошибка загрузки продукта:', error);
      } finally {
        setProductLoading(false);
      }
    };

    loadProduct();
  }, [params]);

  if (productLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Продукт не найден</h1>
          </div>
        </main>
      </div>
    );
  }

  const imagesArray = product.images || []; // Теперь это уже массив
  const imageUrl = product.image || (imagesArray.length > 0 ? imagesArray[0] : '');

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="mx-auto max-w-7xl mobile-padding py-8 sm:py-12">
        <div className="grid gap-8 sm:gap-10 md:gap-12 lg:grid-cols-2">
          {/* Изображение продукта */}
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={product.name}
                onError={() => setImageError(true)}
                className="aspect-square w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <div className="text-8xl opacity-30">
                  📦
                </div>
              </div>
            )}
          </div>
          
          {/* Информация о продукте */}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {product.name}
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>

            {/* Выбор варианта */}
            <div className="mt-8 sm:mt-10">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                Сравните варианты
              </h2>
              <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                {product.variants && product.variants.length > 0 ? (
                  product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`card-hover w-full rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 text-left transition-all ${
                        selectedVariant && selectedVariant.id === variant.id
                          ? 'border-zinc-900 bg-zinc-50 shadow-lg dark:border-white dark:bg-zinc-800'
                          : 'border-zinc-200/50 bg-white/50 backdrop-blur-xl hover:border-zinc-300 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                            {variant.name}
                          </p>
                          {variant.description && (
                            <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                              {variant.description}
                            </p>
                          )}
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                          {variant.price / 100} ₽
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    <p>Нет доступных вариантов</p>
                  </div>
                )}
              </div>
            </div>

            {/* Кнопка покупки */}
            <div className="mt-8 sm:mt-10">
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="apple-button touch-target w-full rounded-full bg-zinc-900 px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900"
              >
                {loading ? 'Загрузка...' : `Оформить заказ • ${(selectedVariant ? selectedVariant.price : 0) / 100} ₽`}
              </button>
              <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-500">
                Безопасная оплата через Stripe
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}