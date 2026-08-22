import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhizhangkun.app',
  appName: '智帳君 Ledgy',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // 在開發實機調試時，可取消註解以下行直接熱重載本機開發伺服器：
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#020617',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
};

export default config;
