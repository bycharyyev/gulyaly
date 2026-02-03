'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  storeSlug?: string;
}

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
  
  // If it's an object from Prisma JSONB, handle it
  if (typeof images === 'object') {
    if (images === null) {
      return [];
    }
    // Try to stringify and parse to handle Prisma JSON wrapper
    try {
      const str = JSON.stringify(images);
      if (str.startsWith('{"prisma__"')) {
        // Prisma JSON wrapper - extract the value
        return [];
      }
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  
  return [];
}

export default function ProductCard({ product, storeSlug }: ProductCardProps) {
  const imagesArray = getImagesArray(product.images);
  const minPrice = Math.min(...product.variants.map(v => v.price));
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image || (imagesArray.length > 0 ? imagesArray[0] : '');

  // Build the product URL based on whether we have a store slug
  const productUrl = storeSlug ? `/${storeSlug}/${product.id}` : `/product/${product.id}`;

  return (
    <Link href={productUrl}>
      <div className="card-hover group h-full flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-transparent bg-white/80 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:border-purple-200 dark:bg-zinc-900/80 dark:hover:border-purple-500/50 transition-all">
        <div className="relative overflow-hidden flex-shrink-0">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              onError={() => setImageError(true)}
              className="aspect-square w-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="aspect-square bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
              <div className="text-4xl sm:text-5xl opacity-50">
                📦
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="p-4 sm:p-6 flex flex-col flex-grow">
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white line-clamp-2 min-h-[3.5rem] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {product.name}
          </h3>
          <p className="mt-2 sm:mt-3 line-clamp-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 min-h-[2.5rem] sm:min-h-[3rem]">
            {product.description}
          </p>
          <div className="mt-auto pt-4 flex items-end justify-between">
            <div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500">от</p>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(minPrice / 100)} ₽
              </p>
            </div>
            <button className="apple-button touch-target rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg">
              Подробнее
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}