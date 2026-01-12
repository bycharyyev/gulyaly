'use client';

import { useAuthModal } from '@/lib/AuthModalContext';
import AuthModal from '@/components/AuthModal';

export default function AuthModalWrapper() {
  const { isOpen, returnUrl, title, message, closeAuthModal } = useAuthModal();
  
  return (
    <AuthModal
      isOpen={isOpen}
      onClose={closeAuthModal}
      returnUrl={returnUrl}
      title={title}
      message={message}
    />
  );
}
