'use client';

import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  onSnapshot,
  writeBatch,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import {
  Transaction,
  TaiwanInvoice,
  Household,
  UserProfile,
  LearningRule,
  TagItem,
} from '@app/shared';

/**
 * 遞迴過濾掉物件中的 undefined 欄位，以符合 Cloud Firestore 規範
 */
const cleanForFirestore = <T extends Record<string, any>>(obj: T): Partial<T> => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const val = obj[key];
    if (val !== undefined) {
      if (typeof val === 'object' && val !== null) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
};

export class FirestoreService {
  /**
   * 0. 測試 Firebase 連線
   */
  public static async testConnection(): Promise<{ success: boolean; message: string }> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) {
      return { success: false, message: '尚未配置 Firebase 連線金鑰' };
    }

    try {
      const testRef = doc(db, '_system', 'connection_test');
      await setDoc(testRef, { lastPing: Date.now() }, { merge: true });
      return { success: true, message: 'Cloud Firestore 連線成功！' };
    } catch (e: any) {
      console.error('Firestore connection test failed:', e);
      return { success: false, message: `連線失敗：${e?.message || '請確認 Firestore 規則與金鑰'}` };
    }
  }

  /**
   * 1. 儲存或更新單筆帳目至 Firestore
   * - 個人帳目存於：users/{userId}/transactions/{txId}
   * - 家庭公帳存於：households/{householdId}/transactions/{txId}
   */
  public static async saveTransaction(tx: Transaction): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const cleanData = cleanForFirestore(tx);
      if (tx.ledgerType === 'household' && tx.householdId) {
        const ref = doc(db, 'households', tx.householdId, 'transactions', tx.id);
        await setDoc(ref, cleanData, { merge: true });
      } else {
        const ref = doc(db, 'users', tx.userId, 'transactions', tx.id);
        await setDoc(ref, cleanData, { merge: true });
      }
      return true;
    } catch (e) {
      console.error('Firestore saveTransaction error:', e);
      return false;
    }
  }

  /**
   * 2. 刪除 Firestore 中的單筆帳目
   */
  public static async deleteTransaction(tx: Transaction): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      if (tx.ledgerType === 'household' && tx.householdId) {
        const ref = doc(db, 'households', tx.householdId, 'transactions', tx.id);
        await deleteDoc(ref);
      } else {
        const ref = doc(db, 'users', tx.userId, 'transactions', tx.id);
        await deleteDoc(ref);
      }
      return true;
    } catch (e) {
      console.error('Firestore deleteTransaction error:', e);
      return false;
    }
  }

  /**
   * 3. 儲存發票至使用者名下：users/{userId}/invoices/{invoiceId}
   */
  public static async saveInvoice(userId: string, invoice: TaiwanInvoice): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const ref = doc(db, 'users', userId, 'invoices', invoice.id);
      await setDoc(ref, cleanForFirestore(invoice), { merge: true });
      return true;
    } catch (e) {
      console.error('Firestore saveInvoice error:', e);
      return false;
    }
  }

  /**
   * 4. 儲存使用者個人檔案：users/{userId}
   */
  public static async saveUserProfile(user: UserProfile): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, cleanForFirestore(user), { merge: true });
      return true;
    } catch (e) {
      console.error('Firestore saveUserProfile error:', e);
      return false;
    }
  }

  /**
   * 5. 儲存家庭資料：households/{householdId}
   */
  public static async saveHousehold(household: Household): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const ref = doc(db, 'households', household.id);
      await setDoc(ref, cleanForFirestore(household), { merge: true });
      return true;
    } catch (e) {
      console.error('Firestore saveHousehold error:', e);
      return false;
    }
  }

  /**
   * 6. 一鍵批量上傳本機資料至 Firestore 雲端資料庫
   */
  public static async syncLocalToCloud(params: {
    user: UserProfile;
    households: Household[];
    transactions: Transaction[];
    invoices: TaiwanInvoice[];
    tagItems: TagItem[];
    learningRules: LearningRule[];
  }): Promise<{ success: boolean; message: string }> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) {
      return { success: false, message: '未設定或無法連線至 Firebase，請先確認 Firebase Config 設定。' };
    }

    try {
      const batch = writeBatch(db);

      // 上傳 User
      const userRef = doc(db, 'users', params.user.uid);
      batch.set(userRef, cleanForFirestore({ ...params.user, tagItems: params.tagItems }), { merge: true });

      // 上傳 Households
      params.households.forEach((house) => {
        const houseRef = doc(db, 'households', house.id);
        batch.set(houseRef, cleanForFirestore(house), { merge: true });
      });

      // 上傳 Transactions (批次上限 500 筆，超過分批)
      params.transactions.forEach((tx) => {
        if (tx.ledgerType === 'household' && tx.householdId) {
          const txRef = doc(db, 'households', tx.householdId, 'transactions', tx.id);
          batch.set(txRef, cleanForFirestore(tx), { merge: true });
        } else {
          const txRef = doc(db, 'users', tx.userId || params.user.uid, 'transactions', tx.id);
          batch.set(txRef, cleanForFirestore(tx), { merge: true });
        }
      });

      // 上傳 Invoices
      params.invoices.forEach((inv) => {
        const invRef = doc(db, 'users', params.user.uid, 'invoices', inv.id);
        batch.set(invRef, cleanForFirestore(inv), { merge: true });
      });

      // 上傳 Learning Rules
      params.learningRules.forEach((r) => {
        const ruleRef = doc(db, 'users', params.user.uid, 'learning_rules', r.id);
        batch.set(ruleRef, cleanForFirestore(r), { merge: true });
      });

      await batch.commit();
      return {
        success: true,
        message: `成功同步 ${params.transactions.length} 筆帳目、${params.tagItems.length} 個自訂標籤與 ${params.invoices.length} 張發票至 Cloud Firestore！`,
      };
    } catch (e: any) {
      console.error('Firestore batch sync error:', e);
      return { success: false, message: `同步失敗：${e.message || '請確認 Firestore 權限與連線'}` };
    }
  }

  /**
   * 7. 從 Firestore 雲端拉取使用者與家庭的最新資料
   */
  public static async pullFromCloud(
    userId: string,
    householdId?: string
  ): Promise<{
    user: UserProfile | null;
    tagItems: TagItem[] | null;
    households: Household[];
    transactions: Transaction[];
    invoices: TaiwanInvoice[];
    rules: LearningRule[];
  } | null> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      // 1. 讀取 User
      const userSnap = await getDoc(doc(db, 'users', userId));
      let user: UserProfile | null = null;
      let tagItems: TagItem[] | null = null;
      if (userSnap.exists()) {
        const raw = userSnap.data();
        user = raw as UserProfile;
        if (raw.tagItems && Array.isArray(raw.tagItems)) {
          tagItems = raw.tagItems;
        }
      }

      // 2. 讀取個人帳目
      const userTxSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
      const personalTx: Transaction[] = [];
      userTxSnap.forEach((d) => personalTx.push(d.data() as Transaction));

      // 3. 讀取家庭公帳
      const householdTx: Transaction[] = [];
      const households: Household[] = [];
      if (householdId) {
        const houseSnap = await getDoc(doc(db, 'households', householdId));
        if (houseSnap.exists()) households.push(houseSnap.data() as Household);

        const houseTxSnap = await getDocs(collection(db, 'households', householdId, 'transactions'));
        houseTxSnap.forEach((d) => householdTx.push(d.data() as Transaction));
      }

      // 4. 讀取發票
      const invSnap = await getDocs(collection(db, 'users', userId, 'invoices'));
      const invoices: TaiwanInvoice[] = [];
      invSnap.forEach((d) => invoices.push(d.data() as TaiwanInvoice));

      // 5. 讀取規則
      const ruleSnap = await getDocs(collection(db, 'users', userId, 'learning_rules'));
      const rules: LearningRule[] = [];
      ruleSnap.forEach((d) => rules.push(d.data() as LearningRule));

      const allTx = [...personalTx, ...householdTx].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      return {
        user,
        tagItems,
        households,
        transactions: allTx,
        invoices,
        rules,
      };
    } catch (e) {
      console.error('Firestore pull error:', e);
      return null;
    }
  }

  /**
   * 8. 即時監聽個人與家庭帳目 (Real-time Cloud Listener)
   */
  public static subscribeToUserTransactions(
    userId: string,
    onData: (txList: Transaction[]) => void
  ): Unsubscribe | null {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      const q = query(collection(db, 'users', userId, 'transactions'));
      return onSnapshot(q, (snapshot) => {
        const txList: Transaction[] = [];
        snapshot.forEach((doc) => {
          txList.push(doc.data() as Transaction);
        });
        txList.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        onData(txList);
      });
    } catch (e) {
      console.error('Failed to subscribe to user transactions:', e);
      return null;
    }
  }

  /**
   * 9. 取得使用者個人設定檔案
   */
  public static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (e) {
      console.error('Firestore getUserProfile error:', e);
      return null;
    }
  }

  /**
   * 10. 即時監聽使用者個人設定檔案 (跨裝置即時連動標籤、預算與個人資料)
   */
  public static subscribeToUserProfile(
    userId: string,
    onData: (user: UserProfile) => void
  ): Unsubscribe | null {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      return onSnapshot(doc(db, 'users', userId), (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data() as UserProfile);
        }
      });
    } catch (e) {
      console.error('Failed to subscribe to user profile:', e);
      return null;
    }
  }

  /**
   * 11. 儲存單一學習規則：users/{userId}/learning_rules/{ruleId}
   */
  public static async saveLearningRule(userId: string, rule: LearningRule): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured || !userId || !rule?.id) return false;

    try {
      const ref = doc(db, 'users', userId, 'learning_rules', rule.id);
      await setDoc(ref, cleanForFirestore(rule), { merge: true });
      return true;
    } catch (e) {
      console.error('Firestore saveLearningRule error:', e);
      return false;
    }
  }
}
