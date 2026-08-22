'use client';

import { useEffect } from 'react';
import { Platform } from '@/lib/platform';

export function NativeInitializer() {
  useEffect(() => {
    // 啟動原生狀態列與樣式
    Platform.initStatusBar();

    // 🌐 註冊 PWA Service Worker (支援離線快取與秒開)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 🔗 檢查 Web PWA App Shortcuts 網址參數 (/?action=voice 等)
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action } }));
          }, 350);
        }
      } catch (err) {
        console.warn('Failed to parse URL action param:', err);
      }
    }

    // 支援 Android 原生返回鍵
    const backSub = Platform.onBackButton(() => {
      // 可處理返回
    });

    // 支援 iOS / Android 桌面 Widget Deep Link 快捷跳轉
    const urlSub = Platform.onAppUrlOpen((url) => {
      try {
        const parsed = new URL(url);
        const action = (parsed.hostname || parsed.pathname || '').replace(/^\//, '');
        if (action) {
          window.dispatchEvent(new CustomEvent('app-deep-link', { detail: { action } }));
        }
      } catch {
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
