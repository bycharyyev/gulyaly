'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  returnUrl?: string;
  title?: string;
  message?: string;
  openAuthModal: (options?: { returnUrl?: string; title?: string; message?: string }) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | undefined>();
  const [title, setTitle] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const openAuthModal = (options?: { returnUrl?: string; title?: string; message?: string }) => {
    setIsOpen(true);
    setReturnUrl(options?.returnUrl);
    setTitle(options?.title);
    setMessage(options?.message);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setReturnUrl(undefined);
    setTitle(undefined);
    setMessage(undefined);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, returnUrl, title, message, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
