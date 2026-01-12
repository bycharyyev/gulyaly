'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export default function SupportChat({ userId = null }: { userId?: string | null }) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [adminStatus, setAdminStatus] = useState<{ isOnline: boolean; lastSeenAt: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = session?.user && (session.user as any)?.role === 'ADMIN';
  
  // Инициализация звука уведомления
  useEffect(() => {
    // Создаем приятный звук уведомления (мягкий тон)
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playNotificationSound = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Настройки для приятного звука
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Первая нота
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // Вторая нота
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      audioRef.current = { play: () => Promise.resolve(playNotificationSound()) } as any;
    }
  }, []);
  
  // Загрузка статуса админа для клиента
  useEffect(() => {
    if (!isAdmin) {
      const fetchAdminStatus = async () => {
        try {
          const res = await fetch('/api/support/admin-status');
          if (res.ok) {
            const data = await res.json();
            setAdminStatus(data);
          }
        } catch (error) {
          console.error('Ошибка загрузки статуса админа:', error);
        }
      };
      
      fetchAdminStatus();
      const interval = setInterval(fetchAdminStatus, 10000); // Обновляем каждые 10 секунд
      
      return () => clearInterval(interval);
    }
  }, [isAdmin]);
  
  // Функция для загрузки сообщений
  const fetchMessages = useCallback(async () => {
    try {
      let url = '';
      if (isAdmin && userId) {
        // Если админ просматривает чат конкретного пользователя
        url = `/api/support/user/${userId}`;
      } else if (isAdmin) {
        // Все сообщения для админа (не используется, но оставлено для совместимости)
        url = '/api/support';
      } else {
        // Только сообщения текущего пользователя
        url = '/api/support/user';
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Сортируем сообщения по дате (по возрастанию для хронологического порядка)
        const sortedMessages = data.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Воспроизводим звук, если пришло новое сообщение
        if (sortedMessages.length > lastMessageCount && lastMessageCount > 0) {
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
          }
        }
        setLastMessageCount(sortedMessages.length);
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId, lastMessageCount]);

  // Первоначальная загрузка сообщений
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Polling для автоматического обновления сообщений каждые 2 секунды
  useEffect(() => {
    if (status === 'authenticated') {
      // Очищаем предыдущий интервал, если он был
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Устанавливаем новый интервал для polling
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages();
      }, 2000); // Обновляем каждые 2 секунды

      // Очищаем интервал при размонтировании
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [fetchMessages, status]);

  // Автоматически прокручиваем к последнему сообщению только при изменении сообщений
  useEffect(() => {
    // Прокручиваем только если есть сообщения
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]); // Зависимость только от количества сообщений

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Функция для добавления реакции
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/support/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      });
      
      if (res.ok) {
        fetchMessages();
        setShowEmojiPicker(null);
      }
    } catch (error) {
      console.error('Ошибка добавления реакции:', error);
    }
  };

  // Фильтрация сообщений по поиску
  const filteredMessages = messages.filter(msg => 
    searchQuery.trim() === '' || 
    msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !uploadedFile) return;
    
    // Сброс индикатора печати
    setIsTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    setSending(true);
    
    try {
      let attachment = null;
      let attachmentType = null;
      
      // Загрузка файла, если есть
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachment = uploadData.url;
          attachmentType = uploadedFile.type.startsWith('image/') ? 'image' : 'file';
        }
      }
      
      let response;
      let sentMessage: any;

      if (isAdmin && userId) {
        // Админ отвечает клиенту через endpoint для ответов админа
        response = await fetch('/api/support/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            replyMessage: newMessage || '📎 Файл',
            targetUserId: userId,
            attachment,
            attachmentType
          }),
        });
      } else if (!isAdmin) {
        // Клиент отправляет сообщение в поддержку
        response = await fetch('/api/support', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            subject: 'Сообщение в поддержку',
            message: newMessage || '📎 Файл',
            attachment,
            attachmentType
          }),
        });
      }

      if (response && response.ok) {
        sentMessage = await response.json();
        // Добавляем новое сообщение в список
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        setUploadedFile(null);
        // Обновляем сообщения через небольшую задержку, чтобы убедиться, что сообщение сохранено
        setTimeout(() => {
          fetchMessages();
        }, 500);
      } else if (response) {
        const data = await response.json();
        alert(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <span className="ml-3 text-zinc-600 dark:text-zinc-400">Загрузка сообщений...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] sm:h-[550px] md:h-[600px]">
      {/* Статус админа (для клиента) */}
      {!isAdmin && adminStatus && (
        <div className="mb-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${adminStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`}></div>
            <span className="text-zinc-700 dark:text-zinc-300">
              {adminStatus.isOnline ? (
                <span className="font-semibold text-green-600 dark:text-green-400">Администратор онлайн</span>
              ) : (
                <span>Администратор офлайн - последний раз в сети {new Date(adminStatus.lastSeenAt).toLocaleString('ru-RU')}</span>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Поиск */}
      {messages.length > 0 && (
        <div className="mb-3 px-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск по истории чата..."
            className="w-full px-4 py-2 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
      
      {/* История сообщений */}
      <div className="flex-grow overflow-y-auto mb-4 space-y-4 max-h-[450px] p-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            {searchQuery ? 'Ничего не найдено' : (isAdmin ? 'Выберите пользователя для просмотра сообщений' : 'У вас пока нет сообщений в поддержке')}
          </div>
        ) : (
          filteredMessages.map((message) => {
            // Определяем, является ли сообщение от администратора
            // Проверяем наличие поля sender и его роль
            const isMessageFromAdmin = message.sender && message.sender.role === 'ADMIN';
            
            // Для позиционирования:
            // - Для клиента: его сообщения слева (blue), админ справа (purple)
            // - Для админа: его сообщения справа (purple), клиента слева (blue)
            const isMyMessage = isAdmin ? isMessageFromAdmin : !isMessageFromAdmin;
            
            // Статус сообщения: NEW - одна галочка, READ - две галочки, REPLIED - кружок
            // Показываем статус только для собственных отправленных сообщений
            const shouldShowStatus = isMyMessage;
            
            const getStatusIcon = () => {
              if (!shouldShowStatus) return null;
              
              if (message.status === 'NEW') {
                return <span className="text-xs ml-1 opacity-60" title="Отправлено">✓</span>; // Одна галочка
              } else if (message.status === 'READ') {
                return <span className="text-xs ml-1 opacity-80" title="Доставлено">✓✓</span>; // Две галочки
              } else if (message.status === 'REPLIED') {
                return <span className="text-xs ml-1 text-green-600 dark:text-green-400" title="Прочитано">●</span>; // Кружок
              }
              return null;
            };
            
            return (
              <div
                key={message.id}
                className={`p-4 rounded-2xl max-w-[80%] ${
                  isMyMessage
                    ? 'bg-purple-100 text-zinc-900 ml-auto dark:bg-purple-900/30 dark:text-white border border-purple-200 dark:border-purple-800'
                    : 'bg-blue-100 text-zinc-900 mr-auto dark:bg-blue-900/30 dark:text-white border border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">
                    {isMyMessage 
                      ? (isAdmin ? '👨‍💼 Администратор' : 'Вы')
                      : (isMessageFromAdmin ? '👨‍💼 Администратор' : (message.user?.name || message.user?.email || 'Клиент'))
                    }
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(() => {
                        const date = new Date(message.createdAt);
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        
                        const isToday = date.toDateString() === today.toDateString();
                        const isYesterday = date.toDateString() === yesterday.toDateString();
                        
                        if (isToday) {
                          return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        } else if (isYesterday) {
                          return `Вчера ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
                        } else {
                          return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + 
                                 date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        }
                      })()}
                    </span>
                    {getStatusIcon()}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                
                {/* Прикрепленный файл */}
                {message.attachment && (
                  <div className="mt-3">
                    {message.attachmentType === 'image' ? (
                      <div className="group relative">
                        <img 
                          src={message.attachment} 
                          alt="Attachment" 
                          className="max-w-full max-h-[300px] rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all border-2 border-white/50 dark:border-zinc-700/50"
                          onClick={() => window.open(message.attachment, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-full transition-all">
                            🔍 Открыть
                          </span>
                        </div>
                      </div>
                    ) : (
                      <a 
                        href={message.attachment} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-white to-zinc-50 dark:from-zinc-700 dark:to-zinc-600 rounded-xl hover:shadow-lg transition-all border-2 border-zinc-200 dark:border-zinc-600 group"
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Скачать файл</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">PDF документ</span>
                        </div>
                      </a>
                    )}
                  </div>
                )}
                
                {/* Реакции */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className="flex gap-1">
                      {Object.entries(message.reactions).map(([emoji, count]: [string, any]) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(message.id, emoji)}
                          className="px-2 py-1 bg-white dark:bg-zinc-700 rounded-full text-xs hover:scale-110 transition"
                        >
                          {emoji} {count > 1 && count}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Кнопка добавления реакции */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition text-sm"
                    >
                      ➕
                    </button>
                    
                    {showEmojiPicker === message.id && (
                      <div className="absolute bottom-full mb-2 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 flex gap-1 z-10">
                        {['👍', '❤️', '😂', '😢', '🔥', '🎉'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(message.id, emoji)}
                            className="text-xl hover:scale-125 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Индикатор печати */}
        {isTyping && (
          <div className="p-4 rounded-2xl max-w-[80%] bg-zinc-100 dark:bg-zinc-800 mr-auto animate-pulse">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">печатает...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки сообщения - для админа (с выбранным userId) и для клиента */}
      {(isAdmin && userId) || !isAdmin ? (
        <form onSubmit={handleSendMessage} className="mt-auto px-2 sm:px-4 pb-2 sm:pb-4">
          {/* Превью загруженного файла */}
          {uploadedFile && (
            <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 shadow-sm">
                  <span className="text-3xl">{uploadedFile.type.startsWith('image/') ? '🖼️' : '📝'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[250px]">{uploadedFile.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all shadow-sm hover:shadow-md"
                title="Удалить"
              >
                ✖
              </button>
            </div>
          )}
          
          <div className="flex gap-1 sm:gap-2">
            {/* Кнопка прикрепления файла */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Проверка размера (5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    alert('Файл слишком большой! Максимум 5MB');
                    e.target.value = '';
                    return;
                  }
                  
                  // Проверка типа файла
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!allowedTypes.includes(file.type)) {
                    alert('Разрешены только изображения (JPG, PNG, GIF, WebP) и PDF');
                    e.target.value = '';
                    return;
                  }
                  
                  setUploadedFile(file);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 hover:from-zinc-200 hover:to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 dark:hover:from-zinc-700 dark:hover:to-zinc-600 text-xl sm:text-2xl transition-all shadow-md hover:shadow-lg"
              title="Прикрепить файл (JPG, PNG, GIF, WebP, PDF - макс. 5MB)"
            >
              📎
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                
                // Индикатор печати
                if (!isTyping) {
                  setIsTyping(true);
                }
                
                // Сбрасываем индикатор через 2 секунды после остановки печати
                if (typingTimeout) {
                  clearTimeout(typingTimeout);
                }
                const timeout = setTimeout(() => {
                  setIsTyping(false);
                }, 2000);
                setTypingTimeout(timeout);
              }}
              placeholder={isAdmin ? "Введите ответ для клиента..." : "Введите ваше сообщение..."}
              className="flex-1 min-w-0 rounded-xl sm:rounded-2xl border-2 border-zinc-300 bg-white px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/30 transition-all shadow-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!newMessage.trim() && !uploadedFile)}
              className="flex-shrink-0 flex items-center justify-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-bold text-white shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
            >
              {sending ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-3 border-solid border-white border-r-transparent"></div>
                  <span className="hidden sm:inline">Отправка...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">📤</span>
                  <span className="hidden sm:inline">{isAdmin ? 'Ответить' : 'Отправить'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
