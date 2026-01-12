'use client';

import { SessionProvider } from 'next-auth/react';
import SupportChat from './SupportChat';

export default function SupportChatWrapper({ userId = null }: { userId?: string | null }) {
  return (
    <SessionProvider>
      <SupportChat userId={userId} />
    </SessionProvider>
  );
}