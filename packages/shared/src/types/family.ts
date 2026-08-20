export type HouseholdRole = 'owner' | 'admin' | 'member';

export interface HouseholdMember {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: HouseholdRole;
  carrierCode?: string;
  joinedAt: number;
}

export interface GroupInvitation {
  id: string;
  householdId: string;
  householdName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'member' | 'admin';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface GroupJoinRequest {
  id: string;
  householdId: string;
  householdName: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail?: string;
  applicantCarrierCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: HouseholdMember[];
  pendingJoinRequests?: GroupJoinRequest[];
  pendingInvitations?: GroupInvitation[];
  paymentMethods?: string[];
  tags?: string[];
  tagItems?: import('./expense').TagItem[];
  currency: string;
  defaultSplitMethod: 'equal' | 'exact' | 'percentage';
  monthlyBudget?: number;
  tagBudgets?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface BalanceSummary {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalPaid: number;       // 該成員代墊的總公用金額
  totalOwed: number;       // 該成員應分攤的總公用金額
  netBalance: number;      // totalPaid - totalOwed (> 0 代表應收回，< 0 代表應支付)
}

export interface SettlementTransfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}
