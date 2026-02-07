'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Store {
  id: string;
  name: string;
}

interface Variant {
  id?: string;
  name: string;
  price: number;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  isActive: boolean;
  storeId: string;
  store: Store;
  variants: Variant[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      const [productsRes, storesRes] = await Promise.all([
        fetch('/api/seller/products'),
        fetch('/api/seller/stores')
      ]);
      
      if (!productsRes.ok || !storesRes.ok) throw new Error('Ошибка загрузки');
      
      const productsData = await productsRes.json();
      const storesData = await storesRes.json();
      
      const product = productsData.products?.find((p: Product) => p.id === productId);
      if (!product) throw new Error('Товар не найден');
      
      setFormData(product);
      setStores(storesData.stores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка обновления');
      }

      router.push('/seller/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/seller/products')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Назад к товарам
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Редактировать товар</h1>
          <p className="text-gray-600 mt-1">{formData.name}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Магазин
            </label>
            <select
              value={formData.storeId || ''}
              onChange={e => setFormData({ ...formData, storeId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название товара
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображение (URL)
            </label>
            <input
              type="url"
              value={formData.image || ''}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
            {formData.image && (
              <img src={formData.image} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
            )}
          </div>

          {/* Variants Display (Read-only for now) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Варианты товара
            </label>
            <div className="space-y-2">
              {formData.variants?.map((variant, index) => (
                <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{variant.name}</span>
                  <span className="text-gray-600">{(variant.price / 100).toFixed(2)} ₽</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              * Редактирование вариантов доступно только для товаров без заказов
            </p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус товара
            </label>
            <select
              value={formData.isActive ? 'active' : 'draft'}
              onChange={e => setFormData({ ...formData, isActive: e.target.value === 'active' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/seller/products')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
