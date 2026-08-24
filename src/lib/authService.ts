'use client';

import { UserProfile } from '@app/shared';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  signOut as fbSignOut,
  updateProfile,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseServices } from './firebase';
import { FirestoreService } from './firestoreService';

export interface AuthUser extends UserProfile {
  provider: 'google' | 'email';
  token?: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  USERS_DB: 'ai_expense_registered_users_v2',
  ACTIVE_SESSION: 'ai_expense_active_session_v2',
};

// 初始使用者資料庫
const INITIAL_REGISTERED_USERS: Record<string, { user: AuthUser; passwordHash: string }> = {};

const withTimeout = <T>(promise: Promise<T>, ms: number = 7000, errorMsg: string = '連線逾時，請確認網路連線或稍後再試'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
};

export class AuthService {
  private static getUsersDB(): Record<string, { user: AuthUser; passwordHash: string }> {
    if (typeof window === 'undefined') return INITIAL_REGISTERED_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS_DB);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(INITIAL_REGISTERED_USERS));
        return INITIAL_REGISTERED_USERS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_REGISTERED_USERS;
    }
  }

  private static saveUsersDB(db: Record<string, { user: AuthUser; passwordHash: string }>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(db));
  }

  public static getActiveSession(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 若為舊版示範帳號 (陳威廷/林怡君/訪客)，自動清除並強制導回登入頁
        if (
          !parsed ||
          !parsed.uid ||
          parsed.provider === 'guest' ||
          parsed.uid === 'user_tw_01' ||
          parsed.uid === 'user_tw_02' ||
          parsed.email === 'chen.wei@example.com' ||
          parsed.email === 'yichun.lin@example.com' ||
          parsed.email === 'guest@aiexpense.tw'
        ) {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
          localStorage.removeItem(STORAGE_KEYS.USERS_DB);
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static saveActiveSession(user: AuthUser | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  }

  // 1. Email 密碼登入 (優先使用 Firebase Auth，若未配置則使用本機資料庫)
  public static async loginWithEmail(email: string, password: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    const { auth, isConfigured } = getFirebaseServices();

    if (auth && isConfigured) {
      try {
        const userCred = await withTimeout(signInWithEmailAndPassword(auth, cleanEmail, password));
        const fbUser = userCred.user;

        let existingProfile = null;
        try {
          existingProfile = await FirestoreService.getUserProfile(fbUser.uid);
        } catch (e) {
          console.warn('Could not fetch existing profile from Firestore:', e);
        }

        const isLocalCompleted =
          typeof window !== 'undefined' &&
          (localStorage.getItem(`has_completed_onboarding_${fbUser.uid}`) === 'true' ||
            localStorage.getItem('ai_expense_has_completed_onboarding') === 'true');

        const userWithToken: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email || cleanEmail,
          displayName: existingProfile?.displayName || fbUser.displayName || cleanEmail.split('@')[0],
          photoURL: fbUser.photoURL || existingProfile?.photoURL || undefined,
          defaultCarrierCode: existingProfile?.defaultCarrierCode || '/AB1234+',
          defaultPaymentMethod: existingProfile?.defaultPaymentMethod || 'LINE Pay',
          monthlyBudget: existingProfile?.monthlyBudget || 35000,
          tagBudgets: existingProfile?.tagBudgets,
          tagItems: existingProfile?.tagItems,
          geminiApiKey: existingProfile?.geminiApiKey,
          hasCompletedOnboarding:
            existingProfile?.hasCompletedOnboarding !== undefined
              ? existingProfile.hasCompletedOnboarding
              : isLocalCompleted || true,
          provider: 'email',
          createdAt: (existingProfile as any)?.createdAt || Date.now(),
          token: await fbUser.getIdToken(),
          preferences: existingProfile?.preferences || {
            theme: 'system',
            currency: 'NT$',
            soundEnabled: true,
            hapticEnabled: true,
            autoDetectAnomaly: true,
          },
        };
        this.saveActiveSession(userWithToken);
        return userWithToken;
      } catch (err: any) {
        console.warn('Firebase Email login failed, checking fallback:', err.code);
        if (err.code === 'auth/operation-not-allowed') {
          throw new Error('Firebase 後台尚未啟用「電子郵件/密碼」登入功能，請先至 Firebase Console 的 Authentication > Sign-in method 將其「啟用」。');
        }
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          // 檢查是否為本機預設示範帳號
          const db = this.getUsersDB();
          const account = db[cleanEmail];
          if (account && account.passwordHash === password) {
            this.saveActiveSession(account.user);
            return account.user;
          }
          throw new Error('電子郵件或密碼不正確。');
        }
        throw new Error(err.message || '登入失敗');
      }
    }

    // 本機 Fallback
    const db = this.getUsersDB();
    const account = db[cleanEmail];

    if (!account) {
      throw new Error('此電子郵件尚未註冊，請先點擊註冊帳號。');
    }

    if (account.passwordHash !== password) {
      throw new Error('密碼不正確，請重新輸入。');
    }

    const userWithToken: AuthUser = {
      ...account.user,
      token: `session_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };

    this.saveActiveSession(userWithToken);
    return userWithToken;
  }

  // 2. Email 註冊新帳號
  public static async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    carrierCode = '/AB1234+'
  ): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    const { auth, isConfigured } = getFirebaseServices();

    if (password.length < 6) {
      throw new Error('密碼長度至少需要 6 個字元。');
    }

    if (auth && isConfigured) {
      try {
        const userCred = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, password));
        const fbUser = userCred.user;
        await updateProfile(fbUser, { displayName: displayName.trim() || cleanEmail.split('@')[0] });

        const newUser: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email || cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0],
          defaultCarrierCode: carrierCode.trim().toUpperCase(),
          defaultPaymentMethod: 'LINE Pay',
          monthlyBudget: 35000,
          provider: 'email',
          createdAt: Date.now(),
          token: await fbUser.getIdToken(),
          preferences: {
            theme: 'system',
            currency: 'NT$',
            soundEnabled: true,
            hapticEnabled: true,
            autoDetectAnomaly: true,
          },
        };
        this.saveActiveSession(newUser);
        return newUser;
      } catch (err: any) {
        console.error('Firebase register error:', err);
        if (err.code === 'auth/operation-not-allowed') {
          throw new Error('Firebase 後台尚未啟用「電子郵件/密碼」功能，請先至 Firebase Console 的 Authentication > Sign-in method 將其「啟用」。');
        }
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('該電子郵件已被註冊，請直接點擊「會員登入」。');
        }
        if (err.code === 'auth/invalid-email') {
          throw new Error('電子郵件格式不正確。');
        }
        if (err.code === 'auth/weak-password') {
          throw new Error('密碼強度不足，長度至少需要 6 個字元。');
        }
        throw new Error(err.message || '註冊失敗');
      }
    }

    // 本機 Fallback
    const db = this.getUsersDB();
    if (db[cleanEmail]) {
      throw new Error('該電子郵件已被註冊，請直接登入。');
    }

    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: AuthUser = {
      uid,
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      defaultCarrierCode: carrierCode.trim().toUpperCase(),
      defaultPaymentMethod: 'LINE Pay',
      monthlyBudget: 35000,
      provider: 'email',
      createdAt: Date.now(),
      token: `session_tok_${Date.now()}`,
      preferences: {
        theme: 'system',
        currency: 'NT$',
        soundEnabled: true,
        hapticEnabled: true,
        autoDetectAnomaly: true,
      },
    };

    db[cleanEmail] = {
      user: newUser,
      passwordHash: password,
    };

    this.saveUsersDB(db);
    this.saveActiveSession(newUser);
    return newUser;
  }

  // 3. Google SSO 登入 (Firebase GoogleAuthProvider)
  public static async loginWithGoogle(): Promise<AuthUser> {
    const { auth, isConfigured } = getFirebaseServices();

    if (auth && isConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await withTimeout(
          signInWithPopup(auth, provider),
          30000,
          'Google 登入連線逾時，請確認是否已允許彈窗或改用 Email 登入。'
        );
        const fbUser = res.user;

        let existingProfile = null;
        try {
          existingProfile = await FirestoreService.getUserProfile(fbUser.uid);
        } catch (e) {
          console.warn('Could not fetch existing profile from Firestore:', e);
        }

        const isLocalCompleted =
          typeof window !== 'undefined' &&
          (localStorage.getItem(`has_completed_onboarding_${fbUser.uid}`) === 'true' ||
            localStorage.getItem('ai_expense_has_completed_onboarding') === 'true');

        const user: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email || `google_${fbUser.uid}@gmail.com`,
          displayName: existingProfile?.displayName || fbUser.displayName || 'Google 用戶',
          photoURL: fbUser.photoURL || existingProfile?.photoURL || undefined,
          defaultCarrierCode: existingProfile?.defaultCarrierCode || '/GG8888+',
          defaultPaymentMethod: existingProfile?.defaultPaymentMethod || 'Google Pay',
          monthlyBudget: existingProfile?.monthlyBudget || 35000,
          tagBudgets: existingProfile?.tagBudgets,
          tagItems: existingProfile?.tagItems,
          geminiApiKey: existingProfile?.geminiApiKey,
          hasCompletedOnboarding:
            existingProfile?.hasCompletedOnboarding !== undefined
              ? existingProfile.hasCompletedOnboarding
              : isLocalCompleted || Boolean(existingProfile),
          provider: 'google',
          token: await fbUser.getIdToken(),
          createdAt: (existingProfile as any)?.createdAt || Date.now(),
          preferences: existingProfile?.preferences || {
            theme: 'system',
            currency: 'NT$',
            soundEnabled: true,
            hapticEnabled: true,
            autoDetectAnomaly: true,
          },
        };

        this.saveActiveSession(user);
        return user;
      } catch (err: any) {
        console.error('Firebase Google Sign-In error:', err);
        const errMsg = err?.message || '';

        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          throw new Error('Google 登入視窗已關閉。');
        }
        if (err.code === 'auth/operation-not-allowed') {
          throw new Error('Firebase 後台尚未啟用「Google」登入提供者，請至 Firebase Console 的 Authentication > Sign-in method 啟用 Google 登入。');
        }
        if (err.code === 'auth/popup-blocked') {
          throw new Error('Google 登入彈窗已被瀏覽器封鎖，請在網址列允許彈出視窗。');
        }
        if (err.code === 'auth/unauthorized-domain') {
          throw new Error('未授權的網域名稱，請在 Firebase 控制台 Authorized Domains 新增 localhost。');
        }
        if (errMsg.includes('Database is closing') || errMsg.includes('closing/hidden')) {
          throw new Error('瀏覽器快取連線刷新中，請重新整理網頁 (F5) 後再次登入即可。');
        }
        throw new Error(err.message || 'Google 登入失敗');
      }
    }

    // 本機 Fallback
    const uid = `user_google_${Date.now()}`;
    const email = `google.user_${Math.random().toString(36).substring(2, 6)}@gmail.com`;
    const user: AuthUser = {
      uid,
      email,
      displayName: 'Google 雲端用戶',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      defaultCarrierCode: '/GG8888+',
      defaultPaymentMethod: 'Google Pay',
      monthlyBudget: 40000,
      provider: 'google',
      token: `google_oauth_${Date.now()}`,
      createdAt: Date.now(),
      preferences: {
        theme: 'system',
        currency: 'NT$',
        soundEnabled: true,
        hapticEnabled: true,
        autoDetectAnomaly: true,
      },
    };

    const db = this.getUsersDB();
    db[email] = { user, passwordHash: 'sso_auth_token' };
    this.saveUsersDB(db);
    this.saveActiveSession(user);
    return user;
  }

  // 4. 登出 (同時清除 Firebase Auth Session 與 Local Storage)
  public static async logout() {
    const { auth } = getFirebaseServices();
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch {}
    }
    this.saveActiveSession(null);
  }
}
