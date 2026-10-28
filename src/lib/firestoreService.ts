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
  DiaryEntry,
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
 * 轉成寫入 households/{id} 的文件內容：
 * - memberIds：查詢「我所屬的群組」(array-contains)，也是安全規則的成員判定依據
 * - pendingInviteeEmails：查詢「寄給我的待回覆邀請」(array-contains)
 * - pendingJoinRequests 不寫入主文件，改存在 joinRequests 子集合 (非成員無法寫主文件)
 */
const toHouseholdDoc = (household: Household) => {
  const { pendingJoinRequests: _requests, ...rest } = household;
  return cleanForFirestore({
    ...rest,
    memberIds: Array.from(new Set([household.ownerId, ...household.members.map((m) => m.userId)])),
    pendingInviteeEmails: (household.pendingInvitations || [])
      .filter((inv) => inv.status === 'pending')
      .map((inv) => inv.inviteeEmail.toLowerCase()),
  });
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
   * 5. 儲存家庭資料：households/{householdId}，並同步邀請碼對照 inviteCodes/{code}
   */
  public static async saveHousehold(household: Household): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return false;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'households', household.id), toHouseholdDoc(household), { merge: true });
      if (household.inviteCode) {
        batch.set(doc(db, 'inviteCodes', household.inviteCode.toUpperCase()), {
          householdId: household.id,
          householdName: household.name,
        });
      }
      await batch.commit();
      return true;
    } catch (e) {
      console.error('Firestore saveHousehold error:', e);
      return false;
    }
  }

  /**
   * 5.0 讀取群組的待審核加入申請 (僅成員有權限讀取)
   */
  private static async withJoinRequests(house: Household): Promise<Household> {
    const { db } = getFirebaseServices();
    if (!db) return house;
    try {
      const snap = await getDocs(collection(db, 'households', house.id, 'joinRequests'));
      const requests: GroupJoinRequest[] = [];
      snap.forEach((d) => requests.push(d.data() as GroupJoinRequest));
      return { ...house, pendingJoinRequests: requests.sort((a, b) => a.createdAt - b.createdAt) };
    } catch {
      return { ...house, pendingJoinRequests: [] };
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
      return snap.exists() ? this.withJoinRequests(snap.data() as Household) : null;
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
      const list = await Promise.all(Array.from(map.values()).map((h) => this.withJoinRequests(h)));
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
      // 先刪邀請碼與加入申請 (規則需在群組文件仍存在時判定成員身分)
      const houseSnap = await getDoc(doc(db, 'households', householdId));
      const inviteCode = houseSnap.exists() ? (houseSnap.data() as Household).inviteCode : undefined;
      const reqSnap = await getDocs(collection(db, 'households', householdId, 'joinRequests'));
      const pre = writeBatch(db);
      reqSnap.forEach((d) => pre.delete(d.ref));
      if (inviteCode) pre.delete(doc(db, 'inviteCodes', inviteCode.toUpperCase()));
      await pre.commit();

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
    mutate: (house: Household) => GroupActionResult
  ): Promise<GroupActionResult> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return { success: false, message: '尚未連線至雲端資料庫' };

    try {
      const result = await runTransaction(db, async (t): Promise<GroupActionResult> => {
        const ref = doc(db, 'households', householdId);
        const snap = await t.get(ref);
        if (!snap.exists()) return { success: false, message: '找不到指定的群組' };

        const house = snap.data() as Household;
        const result = mutate(house);
        if (result.success) {
          t.set(ref, toHouseholdDoc(house));
        }
        return result;
      });
      // 主文件不含加入申請，回傳前補上，避免畫面上的待審核清單被清空
      if (result.household) result.household = await this.withJoinRequests(result.household);
      return result;
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
    try {
      // 非成員讀不到群組文件，只能透過 inviteCodes/{code} 對照取得群組 ID
      const codeSnap = await getDoc(doc(db, 'inviteCodes', code));
      if (!codeSnap.exists()) {
        return { success: false, message: '找不到此邀請碼對應的群組，請確認代碼是否正確。' };
      }
      const { householdId, householdName } = codeSnap.data() as { householdId: string; householdName: string };

      // 申請文件 ID 即申請者 uid，每人每群組最多一筆
      const reqRef = doc(db, 'households', householdId, 'joinRequests', applicant.uid);
      const existing = await getDoc(reqRef);
      if (existing.exists()) {
        return { success: true, message: `您已送出加入「${householdName}」的申請，請等待組長審核！` };
      }

      const request: GroupJoinRequest = {
        id: applicant.uid,
        householdId,
        householdName,
        applicantUserId: applicant.uid,
        applicantName: applicant.displayName || '訪客',
        applicantEmail: applicant.email,
        applicantCarrierCode: applicant.defaultCarrierCode,
        status: 'pending',
        createdAt: Date.now(),
      };
      await setDoc(reqRef, cleanForFirestore(request));
      return { success: true, message: `已送出加入「${householdName}」申請！請等待群組組長審核同意。` };
    } catch (e: any) {
      console.error('Firestore submitJoinRequest error:', e);
      return { success: false, message: '送出申請失敗，請稍後再試。' };
    }
  }

  /**
   * 5.9 組長審核加入申請 (同意或拒絕)
   */
  public static async respondToJoinRequest(
    householdId: string,
    requestId: string,
    action: 'approve' | 'reject'
  ): Promise<GroupActionResult> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return { success: false, message: '尚未連線至雲端資料庫' };

    try {
      const result = await runTransaction(db, async (t): Promise<GroupActionResult> => {
        const houseRef = doc(db, 'households', householdId);
        const reqRef = doc(db, 'households', householdId, 'joinRequests', requestId);
        const [houseSnap, reqSnap] = [await t.get(houseRef), await t.get(reqRef)];
        if (!houseSnap.exists()) return { success: false, message: '找不到指定的群組' };
        if (!reqSnap.exists()) return { success: false, message: '找不到該筆申請' };

        const house = houseSnap.data() as Household;
        const joinReq = reqSnap.data() as GroupJoinRequest;
        t.delete(reqRef);

        if (action === 'reject') {
          return { success: true, message: `已拒絕「${joinReq.applicantName}」的加入申請。`, household: house };
        }

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
        house.updatedAt = Date.now();
        t.set(houseRef, toHouseholdDoc(house));
        return { success: true, message: `已同意「${joinReq.applicantName}」加入群組！`, household: house };
      });
      if (result.household) result.household = await this.withJoinRequests(result.household);
      return result;
    } catch (e: any) {
      console.error('Firestore respondToJoinRequest error:', e);
      return { success: false, message: `審核失敗：${e?.message || '請稍後再試'}` };
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

  /**
   * 12. 生活日記：users/{userId}/diaries/{YYYY-MM-DD}
   */
  public static async saveDiaryEntry(userId: string, entry: DiaryEntry): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured || !userId || !entry?.date) return false;

    try {
      await setDoc(doc(db, 'users', userId, 'diaries', entry.date), cleanForFirestore(entry));
      return true;
    } catch (e) {
      console.error('Firestore saveDiaryEntry error:', e);
      return false;
    }
  }

  public static async deleteDiaryEntry(userId: string, date: string): Promise<boolean> {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured || !userId || !date) return false;

    try {
      await deleteDoc(doc(db, 'users', userId, 'diaries', date));
      return true;
    } catch (e) {
      console.error('Firestore deleteDiaryEntry error:', e);
      return false;
    }
  }

  public static subscribeToDiaryEntries(
    userId: string,
    onData: (entries: Record<string, DiaryEntry>) => void
  ): Unsubscribe | null {
    const { db, isConfigured } = getFirebaseServices();
    if (!db || !isConfigured) return null;

    try {
      return onSnapshot(collection(db, 'users', userId, 'diaries'), (snapshot) => {
        const entries: Record<string, DiaryEntry> = {};
        snapshot.forEach((d) => {
          const entry = d.data() as DiaryEntry;
          entries[entry.date || d.id] = { ...entry, date: entry.date || d.id };
        });
        onData(entries);
      });
    } catch (e) {
      console.error('Failed to subscribe to diary entries:', e);
      return null;
    }
  }
}
