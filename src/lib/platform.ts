import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App, URLOpenListenerEvent } from '@capacitor/app';

export interface WidgetData {
  carrierCode?: string;
  todayExpense?: number;
  monthExpense?: number;
  monthBudget?: number;
  budgetRemaining?: number;
  activeLedgerName?: string;
}

export interface WidgetBridgePlugin {
  syncWidgetData(options: { data: WidgetData }): Promise<{ success: boolean }>;
  reloadWidgets(): Promise<{ success: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * 平台檢測與原生橋接封裝
 */
export const Platform = {
  /** 是否運行於 iOS / Android 原生 App 容器中 */
  isNative: (): boolean => Capacitor.isNativePlatform(),

  /** 是否運行於純 Web 瀏覽器 / PWA */
  isWeb: (): boolean => !Capacitor.isNativePlatform(),

  /** 取得當前平台名稱 ('ios' | 'android' | 'web') */
  getPlatform: (): 'ios' | 'android' | 'web' => {
    const p = Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return p;
    return 'web';
  },

  /** 觸覺震動回饋 (原生呼叫 Haptics，Web 降級為 navigator.vibrate) */
  haptic: async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    try {
      if (Capacitor.isNativePlatform()) {
        if (type === 'light') {
          await Haptics.impact({ style: ImpactStyle.Light });
        } else if (type === 'medium') {
          await Haptics.impact({ style: ImpactStyle.Medium });
        } else if (type === 'heavy') {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } else if (type === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else if (type === 'warning') {
          await Haptics.notification({ type: NotificationType.Warning });
        } else if (type === 'error') {
          await Haptics.notification({ type: NotificationType.Error });
        }
      } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'light') navigator.vibrate(10);
        else if (type === 'medium') navigator.vibrate(20);
        else if (type === 'heavy') navigator.vibrate(40);
        else if (type === 'success') navigator.vibrate([15, 30, 15]);
        else if (type === 'error') navigator.vibrate([30, 50, 30]);
      }
    } catch {
      // 靜默處理不受支援之環境
    }
  },

  /** 初始化原生狀態列 (深色背景與白字) */
  initStatusBar: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#020617' });
        }
      } catch (e) {
        console.warn('StatusBar configuration skipped:', e);
      }
    }
  },

  /** 監聽原生返回鍵 (Android Hardware Back Button) */
  onBackButton: (callback: () => void) => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return App.addListener('backButton', () => {
        callback();
      });
    }
    return null;
  },

  /** 監聽 Deep Link 喚醒 (例如 zhizhangkun://voice) */
  onAppUrlOpen: (callback: (url: string) => void) => {
    if (Capacitor.isNativePlatform()) {
      return App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        if (event?.url) {
          callback(event.url);
        }
      });
    }
    return null;
  },

  /** 將記帳數據與條碼同步至原生桌面小工具 (WidgetKit / AppGroup) */
  syncWidgetData: async (data: WidgetData) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await WidgetBridge.syncWidgetData({ data });
      } catch (e) {
        console.warn('WidgetBridge sync skipped/failed:', e);
      }
    }
  },
};
