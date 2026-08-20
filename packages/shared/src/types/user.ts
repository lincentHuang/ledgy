export interface UserPreferences {
  theme?: 'dark' | 'light' | 'system';
  currency?: string;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  autoDetectAnomaly?: boolean;
  weekStartDay?: number; // 0 = 週日, 1 = 週一 (預設), 6 = 週六
  monthStartDay?: number; // 1 ~ 28 (預設 1 號)
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
  tagItems?: import('./expense').TagItem[];
  isAnonymous?: boolean;
  preferences?: UserPreferences;
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
