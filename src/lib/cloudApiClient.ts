'use client';

import { Transaction, TaiwanInvoice, Household, UserProfile } from '@app/shared';

export class CloudApiClient {
  private static async req<T>(url: string, options?: RequestInit): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data !== undefined ? json.data : (json as T);
    } catch (e) {
      console.warn(`API request to ${url} failed:`, e);
      return null;
    }
  }

  // 1. 取得使用者交易記錄
  public static async getTransactions(userId: string, householdId?: string): Promise<Transaction[] | null> {
    const params = new URLSearchParams({ userId });
    if (householdId) params.append('householdId', householdId);
    return this.req<Transaction[]>(`/api/transactions?${params.toString()}`);
  }

  // 2. 儲存交易記錄
  public static async saveTransaction(tx: Transaction): Promise<Transaction | null> {
    return this.req<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  // 3. 刪除交易記錄
  public static async deleteTransaction(id: string): Promise<boolean> {
    const res = await this.req<{ success: boolean; deleted: boolean }>(`/api/transactions?id=${id}`, {
      method: 'DELETE',
    });
    return Boolean(res?.deleted || res?.success);
  }

  // 4. 取得發票清單
  public static async getInvoices(carrierCode?: string): Promise<TaiwanInvoice[] | null> {
    const params = new URLSearchParams();
    if (carrierCode) params.append('carrierCode', carrierCode);
    return this.req<TaiwanInvoice[]>(`/api/invoices?${params.toString()}`);
  }

  // 5. 儲存發票
  public static async saveInvoice(inv: TaiwanInvoice): Promise<TaiwanInvoice | null> {
    return this.req<TaiwanInvoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(inv),
    });
  }

  // 6. 取得單一家庭資料
  public static async getHousehold(householdId: string): Promise<Household | null> {
    return this.req<Household>(`/api/households?id=${householdId}`);
  }

  // 6.1 取得使用者所屬的所有群組列表 (複數群組支援)
  public static async getHouseholds(userId: string): Promise<Household[] | null> {
    return this.req<Household[]>(`/api/households?userId=${userId}`);
  }

  // 7. 透過邀請碼查詢家庭
  public static async getHouseholdByInviteCode(code: string): Promise<Household | null> {
    return this.req<Household>(`/api/households?inviteCode=${code}`);
  }

  // 8. 儲存家庭
  public static async saveHousehold(house: Household): Promise<Household | null> {
    return this.req<Household>('/api/households', {
      method: 'POST',
      body: JSON.stringify(house),
    });
  }

  // 8.1 刪除家庭
  public static async deleteHousehold(householdId: string): Promise<boolean> {
    const res = await this.req<{ success: boolean; deleted: boolean }>(`/api/households?id=${householdId}`, {
      method: 'DELETE',
    });
    return Boolean(res?.deleted || res?.success);
  }

  // 8.2 組長以 Email 邀請成員
  public static async inviteMemberByEmail(
    householdId: string,
    inviter: { uid: string; displayName: string },
    inviteeEmail: string,
    role: 'member' | 'admin' = 'member'
  ) {
    return this.req<{ success: boolean; message: string }>('/api/households', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invite_email',
        householdId,
        inviter,
        inviteeEmail,
        role,
      }),
    });
  }

  // 8.3 查詢指定 Email 的待回覆邀請
  public static async getPendingInvitationsForEmail(email: string) {
    return this.req<any[]>(`/api/households?emailInvitations=${encodeURIComponent(email)}`);
  }

  // 8.4 被邀請者回覆邀請 (accept / reject)
  public static async respondToInvitation(
    invitationId: string,
    email: string,
    responseAction: 'accept' | 'reject',
    userProfile: UserProfile
  ) {
    return this.req<{ success: boolean; message: string; household?: Household }>('/api/households', {
      method: 'POST',
      body: JSON.stringify({
        action: 'respond_invitation',
        invitationId,
        email,
        responseAction,
        userProfile,
      }),
    });
  }

  // 8.5 透過邀請碼申請加入群組 (需組長審核)
  public static async submitJoinRequest(inviteCode: string, applicant: UserProfile) {
    return this.req<{ success: boolean; message: string; household?: Household }>('/api/households', {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit_join_request',
        inviteCode,
        applicant,
      }),
    });
  }

  // 8.6 組長審核申請 (approve / reject)
  public static async respondToJoinRequest(
    householdId: string,
    requestId: string,
    responseAction: 'approve' | 'reject'
  ) {
    return this.req<{ success: boolean; message: string; household?: Household }>('/api/households', {
      method: 'POST',
      body: JSON.stringify({
        action: 'respond_join_request',
        householdId,
        requestId,
        responseAction,
      }),
    });
  }

  // 9. 財政部雲端發票與商品購物清單自動同步
  public static async syncMofInvoices(payload: {
    carrierCode: string;
    verificationCode?: string;
    appID?: string;
    force?: boolean;
    userId: string;
    householdId?: string;
  }): Promise<{
    success: boolean;
    count: number;
    totalAmount: number;
    invoices: TaiwanInvoice[];
    newTransactions: Transaction[];
    message: string;
  } | null> {
    try {
      const res = await fetch('/api/mof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('MOF API call error:', e);
      return null;
    }
  }

  // 10. 使用者個人設定檔案操作
  public static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.req<UserProfile>(`/api/users?userId=${userId}`);
  }

  public static async saveUserProfile(user: UserProfile): Promise<UserProfile | null> {
    return this.req<UserProfile>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }
}
