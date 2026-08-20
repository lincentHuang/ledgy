'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  Auth,
} from 'firebase/auth';

export interface FirebaseConfigType {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'ai_expense_firebase_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigType = {
  apiKey: "AIzaSyBZIQZKcHuAx8FssqIyMW-MFo_7wmIm4J8",
  authDomain: "ledgy-be1e6.firebaseapp.com",
  projectId: "ledgy-be1e6",
  storageBucket: "ledgy-be1e6.firebasestorage.app",
  messagingSenderId: "797221005704",
  appId: "1:797221005704:web:3f8230e08f81e689a0723d",
};

// 預設從環境變數、LocalStorage 或內建金鑰讀取
export const getActiveFirebaseConfig = (): FirebaseConfigType | null => {
  if (typeof window === 'undefined') return null;

  // 1. 先讀取使用者在 UI 設定中填寫的 Firebase Config
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse saved firebase config:', e);
  }

  // 2. 讀取環境變數 (NEXT_PUBLIC_FIREBASE_*)
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ledgy-be1e6';
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '797221005704',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:797221005704:web:3f8230e08f81e689a0723d',
    };
  }

  // 3. 預設內建官方專案連線
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (config: FirebaseConfigType | null) => {
  if (typeof window === 'undefined') return;
  if (!config) {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  } else {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  }
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export const getFirebaseServices = () => {
  if (typeof window === 'undefined') {
    return { app: null, db: null, auth: null, isConfigured: false };
  }

  const config = getActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, auth: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    if (!db) db = getFirestore(app);
    if (!auth) {
      try {
        auth = initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
          popupRedirectResolver: browserPopupRedirectResolver,
        });
      } catch {
        auth = getAuth(app);
      }
    }
    return { app, db, auth, isConfigured: true };
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    return { app: null, db: null, auth: null, isConfigured: false };
  }
};
