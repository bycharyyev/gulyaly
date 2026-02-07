'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
}

interface Variant {
  name: string;
  price: string;
  description: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStores, setFetchingStores] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    storeId: '',
    name: '',
    description: '',
    image: '',
    isActive: false
  });
  
  const [variants, setVariants] = useState<Variant[]>([{ name: '', price: '', description: '' }]);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const res = await fetch('/api/seller/stores');
      if (!res.ok) throw new Error('Ошибка загрузки магазинов');
      const data = await res.json();
      setStores(data.stores || []);
      if (data.stores?.length > 0) {
        setFormData(prev => ({ ...prev, storeId: data.stores[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки магазинов');
    } finally {
      setFetchingStores(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        variants: variants.map(v => ({
          ...v,
          price: Math.round(parseFloat(v.price) * 100) // Convert to kopecks
        })).filter(v => v.name && v.price)
      };

      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка создания товара');
      }

      router.push('/seller/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
      setLoading(false);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', description: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  if (fetchingStores) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Сначала создайте магазин</h3>
            <p className="text-gray-600 mb-6">Чтобы добавить товар, нужен хотя бы один магазин</p>
            <button
              onClick={() => router.push('/seller/stores/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Создать магазин
            </button>
          </div>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Добавить товар</h1>
          <p className="text-gray-600 mt-1">Создайте новый товар для продажи</p>
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
              Магазин *
            </label>
            <select
              required
              value={formData.storeId}
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
              Название товара *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              placeholder="Например: Курс по программированию"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              placeholder="Подробное описание товара..."
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображение (URL)
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              placeholder="https://example.com/image.png"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Варианты товара *
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Добавить вариант
              </button>
            </div>
            
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Название варианта"
                      value={variant.name}
                      onChange={e => updateVariant(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-gray-900 bg-white placeholder-gray-400"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Цена (₽)"
                        value={variant.price}
                        onChange={e => updateVariant(index, 'price', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white placeholder-gray-400"
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="text"
                        placeholder="Описание"
                        value={variant.description}
                        onChange={e => updateVariant(index, 'description', e.target.value)}
                        className="flex-[2] px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="isActive" className="text-gray-700">
              Сразу опубликовать товар (активен)
            </label>
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
