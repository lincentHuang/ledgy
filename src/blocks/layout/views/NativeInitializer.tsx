'use client';

import { useEffect } from 'react';
import { Platform } from '@/lib/platform';

export function NativeInitializer() {
  useEffect(() => {
    // 啟動原生狀態列與樣式
    Platform.initStatusBar();

    // 支援 Android 原生返回鍵
    const backSub = Platform.onBackButton(() => {
      // 可處理返回
    });

    // 支援 iOS / Android 桌面 Widget Deep Link 快捷跳轉
    const urlSub = Platform.onAppUrlOpen((url) => {
      try {
        const parsed = new URL(url);
        // 例如 zhizhangkun://voice -> hostname: 'voice' 或 pathname: 'voice'
        const action = (parsed.hostname || parsed.pathname || '').replace(/^\//, '');
        if (action) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action } }));
        }
      } catch {
        // Simple string matching fallback
        if (url.includes('voice')) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action: 'voice' } }));
        } else if (url.includes('scanner')) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action: 'scanner' } }));
        } else if (url.includes('quick-input')) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action: 'quick-input' } }));
        } else if (url.includes('barcode')) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action: 'barcode' } }));
        }
      }
    });

    return () => {
      backSub?.then((sub) => sub.remove()).catch(() => {});
      urlSub?.then((sub) => sub.remove()).catch(() => {});
    };
  }, []);

  return null;
}
