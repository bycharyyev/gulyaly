'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function AdminProductsPageContent() {
  const { data: session, status } = useSession();
  
  // Проверяем, что сессия и пользователь определены
  const isAdmin = session && session.user && (session.user as any)?.role === 'ADMIN';
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    images: [] as string[],
    variants: [{ name: '', price: '', description: '' }],
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      redirect('/login');
    } else {
      fetchProducts();
    }
  }, [session, status, isAdmin]);

  const fetchProducts = async () => {
    try {
      // Для админов получаем все продукты, включая неактивные
      const res = await fetch('/api/products/all');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить продукт?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      image: product.image || '',
      images: product.images || [],
      variants: product.variants.map((v: any) => ({
        name: v.name,
        price: (v.price / 100).toString(),
        description: v.description || '',
      })),
      isActive: product.isActive !== false
    });
    setShowAddForm(true);
  };

  const handleAddImage = () => {
    const url = prompt('Введите URL изображения:');
    if (url) {
      setFormData({ ...formData, images: [...formData.images, url] });
    }
  };

  const handleUploadImage = () => {
    // В реальном приложении здесь будет реализация загрузки файла
    alert('В реальном приложении здесь будет реализация загрузки файла');
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleAddVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { name: '', price: '', description: '' }] });
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      // Преобразуем цены в копейки
      const processedData = {
        ...formData,
        variants: formData.variants.map(v => ({
          ...v,
          price: Math.round(parseFloat(v.price) * 100),
        })),
      };

      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });

      if (res.ok) {
        alert('Продукт обновлён!');
        setShowAddForm(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        alert('Ошибка обновления продукта');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      const res = await fetch(`/api/products/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.ok) {
        alert(`Статус продукта изменён на ${newStatus ? 'активный' : 'неактивный'}`);
        fetchProducts();
      } else {
        alert('Ошибка изменения статуса продукта');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка');
    }
  };

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-800">
      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Загрузка...</div>
    </div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Управление продуктами
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingProduct(null);
              setFormData({
                name: '',
                description: '',
                image: '',
                images: [],
                variants: [{ name: '', price: '', description: '' }],
                isActive: true
              });
            }}
            className="apple-button rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none"
          >
            {showAddForm ? '✕ Отмена' : 'Добавить'}
          </button>
                          
          <a
            href="/admin/support"
            className="apple-button rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl flex-1 sm:flex-none text-center"
          >
            Поддержка
          </a>
        </div>
      </div>

        {/* Форма добавления */}
        {showAddForm && !editingProduct && (
          <form className="mb-8 rounded-3xl border border-blue-200/50 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-6 text-2xl font-bold text-blue-600 dark:text-blue-400">
              Новый продукт
            </h2>
            
            <div className="space-y-6">
              {/* Название */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Название
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                  placeholder="Например: Букет роз"
                />
              </div>

              {/* Описание */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Описание
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                  rows={3}
                  placeholder="Опишите продукт..."
                />
              </div>

              {/* Статус продукта */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Статус
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.isActive !== false}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="mr-2"
                    />
                    <span className="text-green-600 dark:text-green-400">Активен</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.isActive === false}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="mr-2"
                    />
                    <span className="text-red-600 dark:text-red-400">Неактивен</span>
                  </label>
                </div>
              </div>

              {/* Изображения */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Изображения
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddImage}
                      className="rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-all"
                    >
                      + URL
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadImage}
                      className="rounded-full bg-purple-500 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-600 transition-all"
                    >
                      + Загрузить
                    </button>
                  </div>
                </div>
                
                {Array.isArray(formData.images) && formData.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {formData.images.map((img, index) => (
                      <div key={index} className="group relative rounded-xl border-2 border-zinc-200 overflow-hidden">
                        <img 
                          src={img} 
                          alt={`Фото ${index + 1}`} 
                          className="h-32 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✖ Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {(!Array.isArray(formData.images) || formData.images.length === 0) && (
                  <div className="rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center text-zinc-500">
                    <p>Нет загруженных изображений</p>
                    <p className="text-sm mt-1">Используйте "URL" или "Загрузить"</p>
                  </div>
                )}
              </div>

              {/* Варианты */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Варианты
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white hover:bg-green-600 transition-all"
                  >
                    + Добавить вариант
                  </button>
                </div>
                
                <div className="space-y-4">
                  {formData.variants.map((variant: any, index: number) => (
                    <div key={index} className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/20">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          Вариант #{index + 1}
                        </span>
                        {formData.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ✖ Удалить
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="text"
                          required
                          placeholder="Название"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                        />
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="Цена (₽)"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                        />
                        <input
                          type="text"
                          placeholder="Описание"
                          value={variant.description}
                          onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                          className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-blue-600 px-8 py-4 font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Создание...' : 'Сохранить продукт'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setFormData({ name: '', description: '', image: '', images: [], variants: [{ name: '', price: '', description: '' }], isActive: true }); }}
                  className="rounded-full border-2 border-zinc-300 px-8 py-4 font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Список продуктов */}
        {loading ? (
          <div className="text-center text-xl font-bold">Загрузка...</div>
        ) : (
          <div className="space-y-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="card-hover rounded-3xl border-2 border-blue-200/50 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-lg backdrop-blur-xl dark:border-blue-900/50 dark:from-zinc-900 dark:to-purple-950/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 inline-block rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-xs font-bold text-white">
                      {product.isActive ? 'Активен' : 'Неактивен'}
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                      {product.description}
                    </p>
                    {/* Показываем первое изображение продукта */}
                    {product.image || (product.images && Array.isArray(product.images) && product.images.length > 0) ? (
                      <div className="mt-3 flex items-center">
                        <img
                          src={product.image || (Array.isArray(product.images) ? product.images[0] : '')}
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.variants?.map((variant: any) => (
                        <span
                          key={variant.id}
                          className="rounded-full bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-800 dark:text-green-400"
                        >
                          {variant.name}: {variant.price / 100} ₽
                        </span>
                      ))}
                    </div>
                    {/* Информация о дате создания и обновления */}
                    <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <p>Создан: {new Date(product.createdAt).toLocaleDateString('ru-RU')}</p>
                      <p>Обновлён: {new Date(product.updatedAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="rounded-2xl bg-yellow-500 px-6 py-3 text-sm font-bold text-white hover:bg-yellow-600 transition-all"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleToggleStatus(product.id, product.isActive)}
                      className={`rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all ${product.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                      {product.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded-2xl border-2 border-red-300 bg-red-50 px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-all dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                
                {/* Форма редактирования продукта - теперь находится рядом с продуктом */}
                {editingProduct && editingProduct.id === product.id && (
                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                    <h2 className="mb-6 text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Редактировать продукт
                    </h2>
                    
                    <div className="space-y-6">
                      {/* Название */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Название
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                          placeholder="Например: Букет роз"
                        />
                      </div>

                      {/* Описание */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Описание
                        </label>
                        <textarea
                          required
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-blue-900 dark:bg-zinc-800 dark:text-white"
                          rows={3}
                          placeholder="Опишите продукт..."
                        />
                      </div>

                      {/* Статус продукта */}
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Статус
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={formData.isActive !== false}
                              onChange={() => setFormData({ ...formData, isActive: true })}
                              className="mr-2"
                            />
                            <span className="text-green-600 dark:text-green-400">Активен</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={formData.isActive === false}
                              onChange={() => setFormData({ ...formData, isActive: false })}
                              className="mr-2"
                            />
                            <span className="text-red-600 dark:text-red-400">Неактивен</span>
                          </label>
                        </div>
                      </div>

                      {/* Отображение текущего изображения продукта */}
                      {(editingProduct.image || (editingProduct.images && Array.isArray(editingProduct.images) && editingProduct.images.length > 0)) && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Текущее изображение:</p>
                          <div className="flex items-center gap-4">
                            <img 
                              src={editingProduct.image || (Array.isArray(editingProduct.images) ? editingProduct.images[0] : '')}
                              alt="Текущее изображение продукта"
                              className="h-24 w-24 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Это текущее изображение продукта</p>
                          </div>
                        </div>
                      )}

                      {/* Изображения */}
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Изображения
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleAddImage}
                              className="rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-all"
                            >
                              + URL
                            </button>
                            <button
                              type="button"
                              onClick={handleUploadImage}
                              className="rounded-full bg-purple-500 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-600 transition-all"
                            >
                              + Загрузить
                            </button>
                          </div>
                        </div>
                        
                        {Array.isArray(formData.images) && formData.images.length > 0 && (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {formData.images.map((img, index) => (
                              <div key={index} className="group relative rounded-xl border-2 border-zinc-200 overflow-hidden">
                                <img 
                                  src={img} 
                                  alt={`Фото ${index + 1}`} 
                                  className="h-32 w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index)}
                                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ✕ Удалить
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {(!Array.isArray(formData.images) || formData.images.length === 0) && (
                          <div className="rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center text-zinc-500">
                            <p>Нет загруженных изображений</p>
                            <p className="text-sm mt-1">Используйте "URL" или "Загрузить"</p>
                          </div>
                        )}
                      </div>

                      {/* Варианты */}
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Варианты
                          </label>
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold text-white hover:bg-green-600 transition-all"
                          >
                            + Добавить вариант
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {formData.variants.map((variant, index) => (
                            <div key={index} className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/20">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                  Вариант #{index + 1}
                                </span>
                                {formData.variants.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(index)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    ✕ Удалить
                                  </button>
                                )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-3">
                                <input
                                  type="text"
                                  required
                                  placeholder="Название"
                                  value={variant.name}
                                  onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                  className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                                />
                                <input
                                  type="number"
                                  required
                                  step="0.01"
                                  placeholder="Цена (₽)"
                                  value={variant.price}
                                  onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                  className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                                />
                                <input
                                  type="text"
                                  placeholder="Описание"
                                  value={variant.description}
                                  onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                                  className="rounded-xl border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-800 dark:bg-zinc-800"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Кнопки */}
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={submitting}
                          className="flex-1 rounded-full bg-blue-600 px-8 py-4 font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                          {submitting ? 'Обновление...' : 'Сохранить изменения'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddForm(false); setEditingProduct(null); }}
                          className="rounded-full border-2 border-zinc-300 px-8 py-4 font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                )}  
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

export default function AdminPageWrapper() {
  return (
    <SessionProvider>
      <AdminProductsPageContent />
    </SessionProvider>
  );
}