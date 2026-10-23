export interface UserPreferences {
  theme?: 'dark' | 'light' | 'system';
  currency?: string;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  autoDetectAnomaly?: boolean;
  weekStartDay?: number; // 0 = 週日, 1 = 週一 (預設), 6 = 週六
  monthStartDay?: number; // 1 ~ 28 (預設 1 號)
}

export interface MonthlyBudgetRecord {
  totalBudget: number;
  tagBudgets: Record<string, number>;
  isSettled?: boolean;
  settledAt?: number;
  settledBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  defaultCarrierCode?: string;
  defaultPaymentMethod?: string;
  activeHouseholdId?: string;
  geminiApiKey?: string;
  monthlyBudget?: number;
  tagBudgets?: Record<string, number>;
  monthlyBudgets?: Record<string, MonthlyBudgetRecord>; // Key: "YYYY-MM" (如 "2026-09")
  tagItems?: import('./expense').TagItem[];
  isAnonymous?: boolean;
  hasCompletedOnboarding?: boolean;
  paymentMethods?: string[];
  preferences?: UserPreferences;
  dateNotes?: Record<string, string>; // Key: "YYYY-MM-DD" (例如 "2026-09-30") -> Value: 當日備忘/活動說明
  fixedCosts?: FixedCost[]; // 個人私帳的每月固定成本
}

/** 每月固定成本 (房租、訂閱、保險…)：每月指定日提醒是否已繳費，確認後自動入帳 */
export interface FixedCost {
  id: string;
  title: string;
  amount: number;
  dayOfMonth: number; // 1 ~ 31 (若當月沒有該日，以月底計)
  tag?: string;
  paymentMethod?: string;
  categoryId?: string;
  ledgerType: 'personal' | 'household';
  householdId?: string;
  active: boolean;
  // Key: "YYYY-MM" -> 已入帳的交易 ID，或 'skipped' 表示本月略過
  paidMonths?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface LearningRule {
  id: string;
  userId: string;
  householdId?: string;
  vendorPattern: string;       // e.g. "7-ELEVEN", "全聯", "星巴克"
  keywordPattern?: string;     // e.g. "咖啡", "鮮奶", "高鐵"
  targetCategoryId: string;
  targetCategoryName?: string;
  targetSubCategory?: string;
  targetTags?: string[];
  targetTagIds?: string[];
  targetPaymentMethod?: string;
  confidence: number;          // 0 ~ 1.0
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}
