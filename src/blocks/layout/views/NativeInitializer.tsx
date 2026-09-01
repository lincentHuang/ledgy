'use client';

import { useEffect } from 'react';
import { Platform } from '@/lib/platform';

export function NativeInitializer() {
  useEffect(() => {
    // 啟動原生狀態列與樣式
    Platform.initStatusBar();

    // 💼 開發者數位版權與面試展示浮水印 Console 彩蛋
    if (typeof window !== 'undefined' && !(window as any).__LEDGY_BANNER_SHOWN__) {
      (window as any).__LEDGY_BANNER_SHOWN__ = true;
      console.log(
        `%c 🤖 智帳君 Ledgy v2.0 %c Technical Portfolio & AI Accounting Engine %c\n\n` +
          `✨ 架構亮點: Clean Modular • Gemini 多模態 AI • 載具雙 QR Code 離線解碼 • 圖論 AA 債務沖銷\n` +
          `👨‍💻 開發者: lincentHuang (黃鈴程) • https://github.com/lincentHuang/ledgy\n` +
          `📜 版權授權: PolyForm Noncommercial License (面試評估與技術展示專用，禁止未授權商業部署)\n`,
        'background: #059669; color: #ffffff; font-weight: 800; font-size: 12px; padding: 4px 8px; border-radius: 4px 0 0 4px;',
        'background: #0f172a; color: #34d399; font-weight: 700; font-size: 12px; padding: 4px 8px; border-radius: 0 4px 4px 0; border: 1px solid #059669;',
        'color: #94a3b8; font-size: 11px; line-height: 1.6;'
      );
    }

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

    // 📱 視窗與虛擬鍵盤自適應壓縮引擎 (模擬原生 App 鍵盤彈出時自動壓縮視窗)
    const handleViewportChange = () => {
      if (typeof window === 'undefined') return;

      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      const keyboardHeight = Math.max(0, window.innerHeight - height);
      const isKeyboardOpen = keyboardHeight > 120;

      document.documentElement.style.setProperty('--app-height', `${height}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      document.documentElement.style.setProperty('--keyboard-offset', `${offsetTop}px`);
      document.documentElement.style.setProperty('--is-keyboard-open', isKeyboardOpen ? '1' : '0');

      // 修正 iOS Safari 聚焦輸入框時將整頁往上頂導致頂部被裁切的現象
      if (isKeyboardOpen && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    };

    handleViewportChange();

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    // 聚焦輸入框時，確保輸入框或所在容器平滑對齊可視範圍
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        setTimeout(() => {
          handleViewportChange();
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        handleViewportChange();
        window.scrollTo(0, 0);
      }, 100);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      backSub?.then((sub) => sub.remove()).catch(() => {});
      urlSub?.then((sub) => sub.remove()).catch(() => {});
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return null;
}
