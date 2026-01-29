'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Address {
  id: string;
  title: string;
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  comment?: string;
  isDefault: boolean;
  createdAt: string;
}

interface AddressFormData {
  title: string;
  street: string;
  house: string;
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
  comment: string;
  isDefault: boolean;
}

export default function AddressManager() {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    title: 'Дом',
    street: '',
    house: '',
    apartment: '',
    entrance: '',
    floor: '',
    intercom: '',
    comment: '',
    isDefault: false
  });

  useEffect(() => {
    if (session?.user) {
      fetchAddresses();
    }
  }, [session]);

  const fetchAddresses = async () => {
    try {
      console.log('🔍 [ADDRESS-MANAGER] Загрузка адресов...');
      console.log('🔍 [ADDRESS-MANAGER] Сессия:', session);
      
      const response = await fetch('/api/addresses');
      
      console.log('🔍 [ADDRESS-MANAGER] Ответ:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ADDRESS-MANAGER] Адреса загружены:', data);
        setAddresses(data);
      } else {
        const data = await response.json();
        console.log('❌ [ADDRESS-MANAGER] Ошибка загрузки:', data);
        
        if (response.status === 401) {
          setError('Пожалуйста войдите в систему для управления адресами');
        } else {
          setError(data.error || 'Ошибка загрузки адресов');
        }
      }
    } catch (err) {
      console.error('💥 [ADDRESS-MANAGER] Исключение при загрузке:', err);
      setError('Ошибка загрузки адресов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔍 [ADDRESS-MANAGER] Отправка формы:', { formData, editingAddress });

    try {
      const url = editingAddress 
        ? `/api/addresses/${editingAddress.id}`
        : '/api/addresses';
      
      const method = editingAddress ? 'PUT' : 'POST';
      
      console.log('🔍 [ADDRESS-MANAGER] Запрос:', { url, method, formData });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('🔍 [ADDRESS-MANAGER] Ответ:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ADDRESS-MANAGER] Успешно:', data);
        await fetchAddresses();
        resetForm();
        setIsFormOpen(false);
      } else {
        const responseText = await response.text();
        console.log('🔍 [ADDRESS-MANAGER] Ответ сервера (raw):', responseText);
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: responseText };
        }
        console.log('❌ [ADDRESS-MANAGER] Ошибка:', data);
        setError(data.error || 'Ошибка сохранения адреса');
      }
    } catch (err) {
      console.error('💥 [ADDRESS-MANAGER] Исключение:', err);
      setError('Ошибка сохранения адреса');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      title: address.title,
      street: address.street,
      house: address.house,
      apartment: address.apartment || '',
      entrance: address.entrance || '',
      floor: address.floor || '',
      intercom: address.intercom || '',
      comment: address.comment || '',
      isDefault: address.isDefault
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('🔥🔥🔥 [ADDRESS-MANAGER] handleDelete START!');
    console.log('🔥🔥🔥 [ADDRESS-MANAGER] received id:', id);
    console.log('🔥🔥🔥 [ADDRESS-MANAGER] id type:', typeof id);
    
    if (!confirm('Вы уверены что хотите удалить этот адрес?')) {
      console.log('🔥🔥🔥 [ADDRESS-MANAGER] User cancelled deletion');
      return;
    }

    console.log('🔥🔥🔥 [ADDRESS-MANAGER] User confirmed deletion');
    
    try {
      const url = `/api/addresses/${id}`;
      console.log('🔥🔥🔥 [ADDRESS-MANAGER] Making DELETE request to:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      console.log('🔥🔥🔥 [ADDRESS-MANAGER] DELETE response:', response.status);

      if (response.ok) {
        await fetchAddresses();
      } else {
        const responseText = await response.text();
        console.log('🔍 [ADDRESS-MANAGER] Ответ сервера (raw):', responseText);
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: responseText };
        }
        console.log('❌ [ADDRESS-MANAGER] Ошибка:', data);
        setError(data.error || 'Ошибка удаления адреса');
      }
    } catch (err) {
      setError('Ошибка удаления адреса');
    }
  };

  const resetForm = () => {
    setFormData({
      title: 'Дом',
      street: '',
      house: '',
      apartment: '',
      entrance: '',
      floor: '',
      intercom: '',
      comment: '',
      isDefault: false
    });
    setEditingAddress(null);
  };

  if (!session) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Требуется авторизация
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          Пожалуйста войдите чтобы управлять адресами доставки
        </p>
        <a
          href="/login"
          className="inline-block rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          Войти в систему
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          📍 Мои адреса
        </h2>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          ➕ Добавить адрес
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border-2 border-red-300 p-4 text-center text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Форма добавления/редактирования */}
      {isFormOpen && (
        <div className="mb-8 rounded-2xl border-2 border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">
            {editingAddress ? '✏️ Редактировать адрес' : '➕ Добавить адрес'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Название адреса
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                >
                  <option value="Дом">🏠 Дом</option>
                  <option value="Работа">🏢 Работа</option>
                  <option value="Другое">📍 Другое</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Основной адрес
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Улица *
                </label>
                <input
                  type="text"
                  required
                  value={formData.street}
                  onChange={(e) => setFormData({...formData, street: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="Пример: Ленина"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Дом *
                </label>
                <input
                  type="text"
                  required
                  value={formData.house}
                  onChange={(e) => setFormData({...formData, house: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="Пример: 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Квартира/Офис
                </label>
                <input
                  type="text"
                  value={formData.apartment}
                  onChange={(e) => setFormData({...formData, apartment: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="42"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Подъезд
                </label>
                <input
                  type="text"
                  value={formData.entrance}
                  onChange={(e) => setFormData({...formData, entrance: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Этаж
                </label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({...formData, floor: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Домофон
                </label>
                <input
                  type="text"
                  value={formData.intercom}
                  onChange={(e) => setFormData({...formData, intercom: e.target.value})}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                  placeholder="1234"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Комментарий для курьера
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700 dark:text-white"
                rows={3}
                placeholder="Например: звонить перед приходом"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Сохранение...' : (editingAddress ? '💾 Сохранить' : '➕ Добавить')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="rounded-full border-2 border-zinc-300 px-6 py-3 font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список адресов */}
      {addresses.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            📍 У вас еще нет сохраненных адресов
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            Добавить первый адрес
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`rounded-2xl border-2 p-6 ${
                address.isDefault 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-600' 
                  : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {address.title === 'Дом' && '🏠'}
                      {address.title === 'Работа' && '🏢'}
                      {address.title === 'Другое' && '📍'}
                      {address.title}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                        Основной
                      </span>
                    )}
                  </div>
                  
                  <p className="text-zinc-700 dark:text-zinc-300 mb-2">
                    {address.street}, {address.house}
                    {address.apartment && `, кв. ${address.apartment}`}
                  </p>
                  
                  {(address.entrance || address.floor || address.intercom) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {address.entrance && `Подъезд ${address.entrance}`}
                      {address.floor && `, Этаж ${address.floor}`}
                      {address.intercom && `, Домофон ${address.intercom}`}
                    </p>
                  )}
                  
                  {address.comment && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                      💬 {address.comment}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(address)}
                    className="rounded-lg border-2 border-blue-300 p-2 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔥 [ADDRESS-MANAGER] DELETE BUTTON CLICKED!');
                      console.log('🔥 [ADDRESS-MANAGER] address object:', address);
                      console.log('🔥 [ADDRESS-MANAGER] address.id:', address.id);
                      handleDelete(address.id);
                    }}
                    className="rounded-lg border-2 border-red-300 p-2 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
