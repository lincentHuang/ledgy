export type TransactionType = 'expense' | 'income' | 'transfer';
export type LedgerType = 'personal' | 'household';

export interface TransactionItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
  categoryId?: string;
  categoryName?: string;
  subCategory?: string;
  tags?: string[];
}

export interface SplitInfo {
  splitMethod: 'equal' | 'exact' | 'percentage' | 'full_reimburse';
  payerId: string;
  splits: {
    userId: string;
    amount: number;
    settled: boolean;
  }[];
}

export interface TagItem {
  id: string; // 唯一永久 key / ID (例如: 'tag_food_lunch', 'tag_1787123456_abcd')
  name: string; // 顯示名稱 (例如: '餐飲·午餐')
  color?: string; // 標籤顏色
  icon?: string; // 標籤圖示
  order?: number; // 自訂排序順序
}

export interface Transaction {
  id: string;
  userId: string;
  householdId?: string;
  title: string;
  amount: number;
  type: TransactionType;
  ledgerType: LedgerType;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  subCategory?: string;
  paymentMethod: string;
  date: string; // ISO string: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  merchant?: string;
  note?: string;
  tags: string[]; // 標籤名稱列表 (向下相容)
  tagIds?: string[]; // 標籤永久 key/ID 列表 (更名時永不遺失)
  invoiceNumber?: string;
  carrierCode?: string;
  receiptImageUrl?: string;
  items?: TransactionItem[];
  splitInfo?: SplitInfo;
  isAnomaly?: boolean;
  anomalyReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  subCategories: string[];
  isSystem?: boolean;
  budgetMonthly?: number;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  icon: string;
  type: 'cash' | 'credit_card' | 'line_pay' | 'jko_pay' | 'px_pay' | 'easycard' | 'bank_transfer' | 'other';
  lastFourDigits?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  householdId?: string;
  userId?: string;
  totalBudget: number;
  categoryBudgets: Record<string, number>;
}
