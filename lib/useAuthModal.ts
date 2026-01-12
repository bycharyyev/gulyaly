'use client';

import { create } from 'zustand';

interface AuthModalStore {
  isOpen: boolean;
  returnUrl?: string;
  title?: string;
  message?: string;
  openAuthModal: (options?: { returnUrl?: string; title?: string; message?: string }) => void;
  closeAuthModal: () => void;
}

export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  returnUrl: undefined,
  title: undefined,
  message: undefined,
  openAuthModal: (options) => set({ 
    isOpen: true, 
    returnUrl: options?.returnUrl,
    title: options?.title,
    message: options?.message,
  }),
  closeAuthModal: () => set({ 
    isOpen: false, 
    returnUrl: undefined,
    title: undefined,
    message: undefined,
  }),
}));
