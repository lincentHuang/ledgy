'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Share, PlusSquare, X, Smartphone, ArrowDown } from 'lucide-react';
import { Button } from '@/components';

export const PwaInstallPrompt: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. 檢查是否已經在獨立 App 模式下運行 (PWA Standalone 或 Capacitor 原生)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (window as any).Capacitor?.isNativePlatform();

    setIsStandalone(Boolean(standalone));
    if (standalone) return;

    // 2. 檢查使用者先前是否已主動關閉過
    const dismissedAt = localStorage.getItem('ledgy_pwa_prompt_dismissed');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return; // 7 天內不再打擾
      }
    }

    // 3. 判斷是否為 iOS 裝置
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 4. 監聽 Android / Chrome 專屬安裝事件
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 針對 iOS Safari，稍候 2 秒後優雅顯示引導
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    localStorage.setItem('ledgy_pwa_prompt_dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(!showIosGuide);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative rounded-2xl bg-slate-900/95 border border-emerald-500/40 p-4 shadow-2xl backdrop-blur-xl text-slate-100 shadow-emerald-950/40">
        {/* 關閉按鈕 */}
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          aria-label="關閉提示"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/30">
            <Smartphone className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>加到主畫面，體驗完整 App</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              全螢幕沉浸體驗、秒開載具、離線記帳與長按桌面捷徑。
            </p>
          </div>
        </div>

        {/* iOS 操作指引展開區 */}
        {showIosGuide && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-800">
                1
              </span>
              <span>
                點擊 Safari 下方工具列的 <strong className="text-white inline-flex items-center gap-0.5"><Share className="w-3.5 h-3.5 text-emerald-400 inline" /> 分享按鈕</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-800">
                2
              </span>
              <span>
                滑動選單並點選 <strong className="text-white inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> 加入主畫面</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 justify-end pt-1 font-semibold">
              <span>完成後即可從桌面一鍵全螢幕開啟！</span>
              <ArrowDown className="w-3 h-3 animate-bounce" />
            </div>
          </div>
        )}

        {/* 底部操作按鈕 */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
          >
            稍後再說
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInstallClick}
            className="text-[11px] font-bold py-1.5 px-3"
          >
            {isIos ? (showIosGuide ? '收起教學' : '查看安裝教學') : '立即加到桌面'}
          </Button>
        </div>
      </div>
    </div>
  );
};
