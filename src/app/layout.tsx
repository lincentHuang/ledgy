import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { NativeInitializer, ErrorBoundary } from '@/blocks/layout';

export const metadata: Metadata = {
  title: '智帳君 AI 記帳 - 台灣發票自動化與家庭共享記帳',
  description:
    '專為台灣打造的 AI 智慧記帳系統，支援手機條碼載具、雙 QR Code 掃描、統一發票自動對獎、多模態自然語言記帳與家庭分帳。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen h-[100dvh] overflow-hidden antialiased selection:bg-emerald-500 selection:text-white">
        <ErrorBoundary>
          <NativeInitializer />
          <AppProvider>{children}</AppProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
