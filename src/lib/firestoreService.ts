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
  where,
  runTransaction,
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
  GroupInvitation,
  GroupJoinRequest,
} from '@app/shared';

type GroupActionResult = { success: boolean; message: string; household?: Household };

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

/**
 * 補上供 Firestore 查詢用的衍生欄位：
 * - memberIds：查詢「我所屬的群組」(array-contains)
 * - pendingInviteeEmails：查詢「寄給我的待回覆邀請」(array-contains)
 */
const withQueryFields = (household: Household): Household => ({
  ...household,
  memberIds: Array.from(new Set([household.ownerId, ...household.members.map((m) => m.userId)])),
  pendingInviteeEmails: (household.pendingInvitations || [])
    .filter((inv) => inv.status === 'pending')
    .map((inv) => inv.inviteeEmail.toLowerCase()),
});

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
      await setDoc(ref, cleanForFirestore(withQueryFields(household)), { merge: true });
      return true;
    } catch (e) {
      console.error('Firestore saveHousehold error:', e);
      return false;
    }
  }

  /**
   * 5.1 取得單一群組
   */
  public static async getHousehold(householdId: string): Promise<Household | null> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      const snap = await getDoc(doc(db, 'households', householdId));
      return snap.exists() ? (snap.data() as Household) : null;
    } catch (e) {
      console.error('Firestore getHousehold error:', e);
      return null;
    }
  }

  /**
   * 5.2 取得使用者所屬的所有群組 (成員或組長)
   * 回傳 null 代表無法連線，呼叫端應保留本機資料
   */
  public static async getHouseholdsByUser(userId: string): Promise<Household[] | null> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      const [memberSnap, ownerSnap] = await Promise.all([
        getDocs(query(collection(db, 'households'), where('memberIds', 'array-contains', userId))),
        getDocs(query(collection(db, 'households'), where('ownerId', '==', userId))),
      ]);
      const map = new Map<string, Household>();
      memberSnap.forEach((d) => map.set(d.id, d.data() as Household));
      ownerSnap.forEach((d) => map.set(d.id, d.data() as Household));
      return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
      console.error('Firestore getHouseholdsByUser error:', e);
      return null;
    }
  }

  /**
   * 5.3 刪除群組與其下所有公帳明細
   */
  public static async deleteHousehold(householdId: string): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const txSnap = await getDocs(collection(db, 'households', householdId, 'transactions'));
      const refs = [...txSnap.docs.map((d) => d.ref), doc(db, 'households', householdId)];
      // writeBatch 單批上限 500 筆
      for (let i = 0; i < refs.length; i += 450) {
        const batch = writeBatch(db);
        refs.slice(i, i + 450).forEach((r) => batch.delete(r));
        await batch.commit();
      }
      return true;
    } catch (e) {
      console.error('Firestore deleteHousehold error:', e);
      return false;
    }
  }

  /**
   * 5.4 在交易中讀取並修改群組 (避免多人同時操作互相覆蓋)
   */
  private static async mutateHousehold(
    householdId: string,
    mutate: (house: Household) => GroupActionResult & { changed?: boolean }
  ): Promise<GroupActionResult> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return { success: false, message: '尚未連線至雲端資料庫' };

    try {
      return await runTransaction(db, async (t) => {
        const ref = doc(db, 'households', householdId);
        const snap = await t.get(ref);
        if (!snap.exists()) return { success: false, message: '找不到指定的群組' };

        const house = snap.data() as Household;
        const { changed = true, ...result } = mutate(house);
        if (result.success && changed) {
          t.set(ref, cleanForFirestore(withQueryFields(house)));
        }
        return result;
      });
    } catch (e: any) {
      console.error('Firestore mutateHousehold error:', e);
      return { success: false, message: `操作失敗：${e?.message || '請稍後再試'}` };
    }
  }

  /**
   * 5.5 組長透過 Email 發送群組邀請
   */
  public static async inviteMemberByEmail(
    householdId: string,
    inviter: { uid: string; displayName: string },
    inviteeEmail: string,
    role: 'member' | 'admin' = 'member'
  ): Promise<GroupActionResult> {
    const emailClean = inviteeEmail.trim().toLowerCase();
    if (!emailClean) return { success: false, message: '請輸入有效的 Email' };

    return this.mutateHousehold(householdId, (house) => {
      if (house.members.some((m) => m.email?.toLowerCase() === emailClean)) {
        return { success: false, message: `Email ${emailClean} 已經在此群組中囉！` };
      }
      if (!house.pendingInvitations) house.pendingInvitations = [];
      const existing = house.pendingInvitations.find(
        (inv) => inv.inviteeEmail.toLowerCase() === emailClean && inv.status === 'pending'
      );
      if (existing) {
        return { success: false, message: `已發送過邀請至 ${emailClean}，等待對方確認中！` };
      }

      const invitation: GroupInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        householdId: house.id,
        householdName: house.name,
        inviterUserId: inviter.uid,
        inviterName: inviter.displayName,
        inviteeEmail: emailClean,
        role,
        status: 'pending',
        createdAt: Date.now(),
      };
      house.pendingInvitations.push(invitation);
      house.updatedAt = Date.now();
      return { success: true, message: `已成功發送邀請至 ${emailClean}！`, household: house };
    });
  }

  /**
   * 5.6 取得特定 Email 收到的待回覆群組邀請
   */
  public static async getPendingInvitationsForEmail(email: string): Promise<GroupInvitation[] | null> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured || !email) return null;

    const emailClean = email.trim().toLowerCase();
    try {
      const snap = await getDocs(
        query(collection(db, 'households'), where('pendingInviteeEmails', 'array-contains', emailClean))
      );
      const list: GroupInvitation[] = [];
      snap.forEach((d) => {
        const house = d.data() as Household;
        (house.pendingInvitations || []).forEach((inv) => {
          if (inv.inviteeEmail.toLowerCase() === emailClean && inv.status === 'pending') list.push(inv);
        });
      });
      return list;
    } catch (e) {
      console.error('Firestore getPendingInvitationsForEmail error:', e);
      return null;
    }
  }

  /**
   * 5.7 被邀請者回覆邀請 (同意或拒絕)
   */
  public static async respondToInvitation(
    invitation: GroupInvitation,
    action: 'accept' | 'reject',
    userProfile: UserProfile
  ): Promise<GroupActionResult> {
    return this.mutateHousehold(invitation.householdId, (house) => {
      const invIndex = (house.pendingInvitations || []).findIndex((inv) => inv.id === invitation.id);
      if (invIndex < 0) return { success: false, message: '找不到該邀請記錄。' };

      const inv = house.pendingInvitations![invIndex];
      if (action === 'accept') {
        inv.status = 'accepted';
        if (!house.members.some((m) => m.userId === userProfile.uid)) {
          house.members.push({
            userId: userProfile.uid,
            displayName: userProfile.displayName || '新成員',
            email: userProfile.email || inv.inviteeEmail,
            avatarUrl: userProfile.photoURL,
            role: inv.role || 'member',
            carrierCode: userProfile.defaultCarrierCode,
            joinedAt: Date.now(),
          });
        }
        house.updatedAt = Date.now();
        return { success: true, message: `🎉 成功加入群組「${house.name}」！`, household: house };
      }

      house.pendingInvitations!.splice(invIndex, 1);
      return { success: true, message: `已婉拒「${house.name}」的邀請。` };
    });
  }

  /**
   * 5.8 透過邀請碼申請加入群組 (需組長審核)
   */
  public static async submitJoinRequest(inviteCode: string, applicant: UserProfile): Promise<GroupActionResult> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return { success: false, message: '尚未連線至雲端資料庫' };

    const code = inviteCode.trim().toUpperCase();
    let householdId: string | null = null;
    try {
      const snap = await getDocs(query(collection(db, 'households'), where('inviteCode', '==', code)));
      householdId = snap.empty ? null : snap.docs[0].id;
    } catch (e) {
      console.error('Firestore submitJoinRequest lookup error:', e);
      return { success: false, message: '查詢邀請碼失敗，請稍後再試。' };
    }
    if (!householdId) {
      return { success: false, message: '找不到此邀請碼對應的群組，請確認代碼是否正確。' };
    }

    return this.mutateHousehold(householdId, (house) => {
      if (house.members.some((m) => m.userId === applicant.uid)) {
        return { success: false, message: `您已經是「${house.name}」的成員囉！` };
      }
      if (!house.pendingJoinRequests) house.pendingJoinRequests = [];
      const existing = house.pendingJoinRequests.find(
        (r) => r.applicantUserId === applicant.uid && r.status === 'pending'
      );
      if (existing) {
        return {
          success: true,
          changed: false,
          message: `您已送出加入「${house.name}」的申請，請等待組長審核！`,
          household: house,
        };
      }

      const request: GroupJoinRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        householdId: house.id,
        householdName: house.name,
        applicantUserId: applicant.uid,
        applicantName: applicant.displayName || '訪客',
        applicantEmail: applicant.email,
        applicantCarrierCode: applicant.defaultCarrierCode,
        status: 'pending',
        createdAt: Date.now(),
      };
      house.pendingJoinRequests.push(request);
      return {
        success: true,
        message: `已送出加入「${house.name}」申請！請等待群組組長審核同意。`,
        household: house,
      };
    });
  }

  /**
   * 5.9 組長審核加入申請 (同意或拒絕)
   */
  public static async respondToJoinRequest(
    householdId: string,
    requestId: string,
    action: 'approve' | 'reject'
  ): Promise<GroupActionResult> {
    return this.mutateHousehold(householdId, (house) => {
      const reqIndex = (house.pendingJoinRequests || []).findIndex((r) => r.id === requestId);
      if (reqIndex < 0) return { success: false, message: '找不到該筆申請' };

      const joinReq = house.pendingJoinRequests![reqIndex];
      house.pendingJoinRequests!.splice(reqIndex, 1);
      house.updatedAt = Date.now();

      if (action === 'approve') {
        if (!house.members.some((m) => m.userId === joinReq.applicantUserId)) {
          house.members.push({
            userId: joinReq.applicantUserId,
            displayName: joinReq.applicantName,
            email: joinReq.applicantEmail,
            role: 'member',
            carrierCode: joinReq.applicantCarrierCode,
            joinedAt: Date.now(),
          });
        }
        return { success: true, message: `已同意「${joinReq.applicantName}」加入群組！`, household: house };
      }
      return { success: true, message: `已拒絕「${joinReq.applicantName}」的加入申請。`, household: house };
    });
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
