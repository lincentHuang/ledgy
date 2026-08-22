'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Transaction,
  Category,
  UserProfile,
  Household,
  HouseholdMember,
  GroupInvitation,
  GroupJoinRequest,
  TaiwanInvoice,
  LearningRule,
  SettlementTransfer,
  TagItem,
  DEFAULT_CATEGORIES,
  MOCK_USER,
  AdaptiveLearningEngine,
  checkLotteryWinning,
  parseTaiwanInvoiceQrCode,
  autoCategorizeInvoice,
  KNOWN_SELLER_GUIS,
  calculateHouseholdBalances,
} from '@app/shared';
import { AuthService, AuthUser } from './authService';
import { CloudApiClient } from './cloudApiClient';
import { Platform } from './platform';
import { FirestoreService } from './firestoreService';
import { getFirebaseServices } from './firebase';

export const DEFAULT_GROUP_PAYMENT_METHODS = [
  '公用現金 (公積金)',
  '公帳信用卡',
  '由組長代墊',
  '成員各自付款分攤',
  '銀行轉帳',
];

export const DEFAULT_GROUP_TAG_ITEMS: TagItem[] = [
  { id: 'gtag_household_public', name: '共同採買' },
  { id: 'gtag_home_utility', name: '房租水電' },
  { id: 'gtag_dining_together', name: '聚餐分攤' },
  { id: 'gtag_home_daily', name: '日用品採購' },
  { id: 'gtag_travel_transit', name: '旅遊交通' },
  { id: 'gtag_hotel_stay', name: '住宿費用' },
  { id: 'gtag_public_fund', name: '公基金儲值' },
  { id: 'gtag_uncategorized', name: '未歸類' },
];

export const DEFAULT_GROUP_TAGS = DEFAULT_GROUP_TAG_ITEMS.map((t) => t.name);

export const DEFAULT_TAG_ITEMS: TagItem[] = [
  { id: 'tag_food', name: '食' },
  { id: 'tag_clothing', name: '衣' },
  { id: 'tag_housing', name: '住' },
  { id: 'tag_transport', name: '行' },
  { id: 'tag_uncategorized', name: '未歸類' },
];

export const DEFAULT_TAGS_PRESETS = DEFAULT_TAG_ITEMS.map((t) => t.name);

export const generateTagKey = (name: string): string => {
  const clean = name.trim().replace(/^#/, '');
  return `tag_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
};

export const normalizeTagItems = (
  tags: (string | TagItem)[] | undefined,
  defaultItems: TagItem[] = DEFAULT_TAG_ITEMS
): TagItem[] => {
  if (!tags || tags.length === 0) return defaultItems;
  return tags.map((t, idx) => {
    if (typeof t === 'string') {
      const clean = t.trim().replace(/^#/, '');
      const matchedDefault = defaultItems.find((d) => d.name === clean);
      return {
        id: matchedDefault ? matchedDefault.id : `tag_legacy_${idx}_${clean}`,
        name: clean,
        order: idx,
      };
    }
    return {
      id: t.id || generateTagKey(t.name),
      name: (t.name || '').trim().replace(/^#/, ''),
      color: t.color,
      icon: t.icon,
      order: t.order ?? idx,
    };
  });
};

interface AppContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  // 👥 複數群組管理 (Multi-group support)
  households: Household[];
  activeHouseholdId: string | null;
  household: Household | null;
  switchActiveHousehold: (householdId: string) => void;
  createHousehold: (name: string, monthlyBudget?: number) => Household;
  joinHousehold: (inviteCode: string) => Promise<{ success: boolean; message: string; household?: Household }>;
  leaveHousehold: (householdId?: string) => void;
  deleteHousehold: (householdId: string) => void;
  addGroupMember: (member: { displayName: string; email?: string; carrierCode?: string; role?: 'member' | 'admin' }, targetHouseholdId?: string) => void;
  removeGroupMember: (memberUserId: string, targetHouseholdId?: string) => void;
  updateHousehold: (data: Partial<Household>, targetHouseholdId?: string) => void;

  // 👥 群組專屬付款方式與標籤
  addGroupPaymentMethod: (householdId: string, name: string) => void;
  removeGroupPaymentMethod: (householdId: string, name: string) => void;
  updateGroupPaymentMethod: (householdId: string, oldName: string, newName: string) => void;
  groupTagItems: TagItem[];
  addGroupTag: (householdId: string, tag: string, customKey?: string) => void;
  removeGroupTag: (householdId: string, tagOrKey: string) => void;
  updateGroupTag: (householdId: string, oldTagOrKey: string, newName: string) => void;
  reorderGroupTags: (householdId: string, newTagsOrItems: (string | TagItem)[]) => void;

  // ✉️ Email 邀請與待審核機制 (Email Invitations & Join Requests Approval)
  incomingInvitations: GroupInvitation[];
  inviteMemberByEmail: (email: string, role?: 'member' | 'admin', targetHouseholdId?: string) => Promise<{ success: boolean; message: string }>;
  respondToIncomingInvitation: (invitationId: string, action: 'accept' | 'reject') => Promise<{ success: boolean; message: string }>;
  requestJoinByCode: (inviteCode: string) => Promise<{ success: boolean; message: string; household?: Household }>;
  respondToJoinRequest: (requestId: string, action: 'approve' | 'reject', targetHouseholdId?: string) => Promise<{ success: boolean; message: string }>;
  
  // 帳本切換
  activeLedger: 'personal' | 'household';
  setActiveLedger: (ledger: 'personal' | 'household') => void;

  // 記帳與交易數據
  transactions: Transaction[];
  invoices: TaiwanInvoice[];
  categories: Category[];
  learningRules: LearningRule[];
  learningEngine: AdaptiveLearningEngine;

  // 個人付款方式與標籤 (支援永恆 key / ID 綁定)
  paymentMethods: string[];
  addPaymentMethod: (name: string) => void;
  removePaymentMethod: (name: string) => void;
  updatePaymentMethod: (oldName: string, newName: string) => void;
  availableTagItems: TagItem[];
  availableTags: string[];
  addCustomTag: (tag: string, customKey?: string) => void;
  removeCustomTag: (tagOrKey: string) => void;
  updateCustomTag: (oldTagOrKey: string, newName: string) => void;
  reorderCustomTags: (newTagsOrItems: (string | TagItem)[]) => void;

  // 根據當前帳本自動切換的付款方式與標籤
  currentPaymentMethods: string[];
  currentTagItems: TagItem[];
  currentTags: string[];
  getTagByKey: (key: string) => TagItem | undefined;
  getTagByName: (name: string) => TagItem | undefined;

  // 雲端與帳號操作
  isCloudConnected: boolean;
  syncToCloud: () => Promise<{ success: boolean; message: string }>;
  pullFromCloud: () => Promise<boolean>;
  restoreFullBackup: (bundle: { transactions?: Transaction[]; availableTagItems?: TagItem[]; households?: Household[]; invoices?: TaiwanInvoice[] }) => void;
  loginWithUser: (authUser: AuthUser) => void;
  logout: () => void;

  // 交易操作
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Transaction;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  addInvoice: (invoice: TaiwanInvoice) => void;
  scanAndImportInvoiceQr: (qr1: string, qr2?: string) => { invoice: TaiwanInvoice | null; message: string };
  checkAllInvoicesLottery: () => void;
  syncMofInvoices: (verificationCode?: string, appID?: string, force?: boolean) => Promise<{ success: boolean; count: number; totalAmount: number; message: string }>;
  settleTransfer: (transfer: SettlementTransfer) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;

  // 檢視與篩選模式 (列表: 歷史總紀錄, 週: 本週收支, 月: 本月收支, 標籤與搜尋)
  viewMode: 'list' | 'week' | 'month';
  setViewMode: (mode: 'list' | 'week' | 'month') => void;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  calendarMonth: number;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  selectedSubDates: string[];
  setSelectedSubDates: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTagFilter: string;
  setSelectedTagFilter: (tag: string) => void;
  selectedTagFilters: string[];
  setSelectedTagFilters: (tags: string[]) => void;
  toggleTagFilter: (tag: string) => void;
  dateRangeFilter: { startDate: string; endDate: string } | null;
  setDateRangeFilter: (range: { startDate: string; endDate: string } | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // 過濾後的即時視圖
  filteredTransactions: Transaction[];
  filteredInvoices: TaiwanInvoice[];
  householdBalances: ReturnType<typeof calculateHouseholdBalances> | null;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_PAYMENT_METHODS_LIST = [
  '現金',
  '信用卡 (一般)',
  'LINE Pay',
  '街口支付',
  '全支付/PX Pay',
  '悠遊卡/一卡通',
  'Apple Pay',
  '銀行轉帳',
];



const STORAGE_KEYS = {
  USER: 'ai_expense_user_v6',
  HOUSEHOLDS: 'ai_expense_households_v6',
  ACTIVE_HOUSEHOLD_ID: 'ai_expense_active_household_id_v6',
  TRANSACTIONS: 'ai_expense_transactions_v6',
  INVOICES: 'ai_expense_invoices_v6',
  RULES: 'ai_expense_rules_v6',
  ACTIVE_LEDGER: 'ai_expense_active_ledger_v6',
  PAYMENT_METHODS: 'ai_expense_payment_methods_v6',
  TAGS: 'ai_expense_tags_v6',
  TAG_ITEMS: 'ai_expense_tag_items_v6',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>({
    uid: '',
    email: '',
    displayName: '訪客',
    defaultCarrierCode: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // 👥 複數群組狀態
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  // ✉️ 收到的邀請通知列表
  const [incomingInvitations, setIncomingInvitations] = useState<GroupInvitation[]>([]);

  const [activeLedger, setActiveLedgerState] = useState<'personal' | 'household'>('personal');

  const setActiveLedger = (ledger: 'personal' | 'household') => {
    const effective: 'personal' | 'household' =
      ledger === 'household' && households.length === 0 ? 'personal' : (ledger || 'personal');
    setActiveLedgerState(effective);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LEDGER, effective);
    }
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<TaiwanInvoice[]>([]);
  const [learningRules, setLearningRules] = useState<LearningRule[]>([]);
  const [learningEngine] = useState(() => new AdaptiveLearningEngine([]));
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS_LIST);
  const [availableTagItems, setAvailableTagItems] = useState<TagItem[]>(DEFAULT_TAG_ITEMS);
  const availableTags = availableTagItems.map((t) => t.name);

  const [viewMode, setViewModeState] = useState<'list' | 'week' | 'month'>('list');
  const [weekOffset, setWeekOffsetState] = useState<number>(0);
  const [calendarYear, setCalendarYearState] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonthState] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedSubDates, setSelectedSubDates] = useState<string[]>([]);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ startDate: string; endDate: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isCloudConnected = true;

  const setViewMode = (mode: 'list' | 'week' | 'month') => {
    setViewModeState(mode);
    setSelectedSubDates([]); // 切換模式時重設子日期選取
  };

  const setWeekOffset: React.Dispatch<React.SetStateAction<number>> = (val) => {
    setWeekOffsetState(val);
    setSelectedSubDates([]); // 切換週時重設子日期選取
  };

  const setCalendarYear: React.Dispatch<React.SetStateAction<number>> = (val) => {
    setCalendarYearState(val);
    setSelectedSubDates([]);
  };

  const setCalendarMonth: React.Dispatch<React.SetStateAction<number>> = (val) => {
    setCalendarMonthState(val);
    setSelectedSubDates([]);
  };

  const selectedTagFilter = selectedTagFilters[0] || 'all';
  const setSelectedTagFilter = (tag: string) => {
    if (tag === 'all') {
      setSelectedTagFilters([]);
    } else {
      setSelectedTagFilters([tag]);
    }
  };

  const toggleTagFilter = (tag: string) => {
    if (tag === 'all') {
      setSelectedTagFilters([]);
    } else {
      if (selectedTagFilters.includes(tag)) {
        setSelectedTagFilters(selectedTagFilters.filter((t) => t !== tag));
      } else {
        setSelectedTagFilters([...selectedTagFilters.filter((t) => t !== 'all'), tag]);
      }
    }
  };

  // 計算當前選取的群組
  const household: Household | null =
    households.find((h) => h.id === activeHouseholdId) || households[0] || null;

  // 根據當前帳本自動切換的付款方式與標籤 (支援永久 key 與 display name)
  const currentPaymentMethods =
    activeLedger === 'household' && household
      ? (household.paymentMethods && household.paymentMethods.length > 0
          ? household.paymentMethods
          : DEFAULT_GROUP_PAYMENT_METHODS)
      : paymentMethods;

  const groupTagItems: TagItem[] = React.useMemo(() => {
    if (household) {
      if (household.tagItems && household.tagItems.length > 0) {
        return household.tagItems;
      }
      if (household.tags && household.tags.length > 0) {
        return normalizeTagItems(household.tags, DEFAULT_GROUP_TAG_ITEMS);
      }
    }
    return DEFAULT_GROUP_TAG_ITEMS;
  }, [household]);

  const currentTagItems: TagItem[] = React.useMemo(() => {
    if (activeLedger === 'household') {
      return groupTagItems;
    }
    return availableTagItems;
  }, [activeLedger, groupTagItems, availableTagItems]);

  const currentTags = React.useMemo(() => {
    return currentTagItems.map((t) => t.name);
  }, [currentTagItems]);

  const getTagByKey = (key: string): TagItem | undefined => {
    return currentTagItems.find((t) => t.id === key) || availableTagItems.find((t) => t.id === key) || DEFAULT_TAG_ITEMS.find((t) => t.id === key);
  };

  const getTagByName = (name: string): TagItem | undefined => {
    const clean = name.trim().replace(/^#/, '');
    return currentTagItems.find((t) => t.name === clean) || availableTagItems.find((t) => t.name === clean) || DEFAULT_TAG_ITEMS.find((t) => t.name === clean);
  };

  // 1. 初始化與載入 (Client-side hydration safe)
  useEffect(() => {
    try {
      const active = AuthService.getActiveSession();
      if (active) {
        setUser(active);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthReady(true);

      // 載入群組列表
      const storedHouseholds = localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS);
      let parsedHouseholds: Household[] = [];
      if (storedHouseholds) {
        try {
          parsedHouseholds = JSON.parse(storedHouseholds);
          setHouseholds(parsedHouseholds);
        } catch {
          setHouseholds([]);
        }
      }

      const storedActiveHId = localStorage.getItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
      if (storedActiveHId && parsedHouseholds.some((h) => h.id === storedActiveHId)) {
        setActiveHouseholdId(storedActiveHId);
      } else if (parsedHouseholds.length > 0) {
        setActiveHouseholdId(parsedHouseholds[0].id);
      } else {
        setActiveHouseholdId(null);
      }

      // 載入標籤庫 (優先讀取帶有永久 Key 的 TAG_ITEMS，向下相容舊版字串陣列)
      const storedTagItems = localStorage.getItem(STORAGE_KEYS.TAG_ITEMS);
      let loadedTagItems = DEFAULT_TAG_ITEMS;
      if (storedTagItems) {
        try {
          loadedTagItems = JSON.parse(storedTagItems);
          setAvailableTagItems(loadedTagItems);
        } catch {
          setAvailableTagItems(DEFAULT_TAG_ITEMS);
        }
      } else {
        const storedTags = localStorage.getItem(STORAGE_KEYS.TAGS);
        if (storedTags) {
          try {
            const parsedTags = JSON.parse(storedTags);
            loadedTagItems = normalizeTagItems(parsedTags, DEFAULT_TAG_ITEMS);
            setAvailableTagItems(loadedTagItems);
            localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(loadedTagItems));
          } catch {
            setAvailableTagItems(DEFAULT_TAG_ITEMS);
          }
        }
      }

      // 載入交易 (自動比對補齊永久 tagIds，確保更名時永不遺失關聯)
      const storedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (storedTx) {
        try {
          const parsed: Transaction[] = JSON.parse(storedTx);
          const normalized = parsed.map((t) => {
            const singleTag = t.tags && t.tags.length > 0 ? [t.tags[0]] : ['未歸類'];
            const matchedTag = loadedTagItems.find((item) => item.name === singleTag[0] || item.id === singleTag[0]);
            const tagIds = t.tagIds && t.tagIds.length > 0
              ? t.tagIds
              : [matchedTag ? matchedTag.id : generateTagKey(singleTag[0])];
            return {
              ...t,
              tags: singleTag,
              tagIds,
            };
          });
          setTransactions(normalized);
        } catch {
          setTransactions([]);
        }
      }

      // 載入發票
      const storedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (storedInvoices) {
        try {
          setInvoices(JSON.parse(storedInvoices));
        } catch {
          setInvoices([]);
        }
      }

      // 載入學習規則
      const storedRules = localStorage.getItem(STORAGE_KEYS.RULES);
      if (storedRules) {
        try {
          const rules = JSON.parse(storedRules);
          setLearningRules(rules);
          learningEngine.setRules(rules);
        } catch {}
      }

      // 載入帳本偏好：若無狀態或無群組，一律預設為「個人私帳」
      const storedLedger = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEDGER);
      if (storedLedger === 'household' && parsedHouseholds.length > 0) {
        setActiveLedgerState('household');
      } else {
        setActiveLedgerState('personal');
        localStorage.setItem(STORAGE_KEYS.ACTIVE_LEDGER, 'personal');
      }

      // 載入付款方式
      const storedPayments = localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
      if (storedPayments) {
        try {
          setPaymentMethods(JSON.parse(storedPayments));
        } catch {}
      }

      // 雲端資料同步 (拉取該使用者的真實群組與交易)
      if (active && active.uid) {
        CloudApiClient.getHouseholds(active.uid).then((serverHouseholds) => {
          if (serverHouseholds) {
            setHouseholds(serverHouseholds);
            localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(serverHouseholds));
            if (serverHouseholds.length > 0 && (!storedActiveHId || !serverHouseholds.some(h => h.id === storedActiveHId))) {
              setActiveHouseholdId(serverHouseholds[0].id);
              localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, serverHouseholds[0].id);
            }
          }
        });

        // 查詢當前 Email 是否有待回覆的群組邀請
        if (active.email) {
          CloudApiClient.getPendingInvitationsForEmail(active.email).then((invs) => {
            if (invs) setIncomingInvitations(invs);
          });
        }

        // 雲端 Firestore 與後端拉取
        const { isConfigured } = getFirebaseServices();
        if (isConfigured) {
          FirestoreService.pullFromCloud(active.uid, storedActiveHId || undefined).then((data) => {
            if (data && data.transactions && data.transactions.length > 0) {
              setTransactions(data.transactions);
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
            } else {
              CloudApiClient.getTransactions(active.uid, storedActiveHId || undefined).then((serverTx) => {
                if (serverTx && serverTx.length > 0) {
                  setTransactions(serverTx);
                  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(serverTx));
                }
              });
            }
          });
        } else {
          CloudApiClient.getTransactions(active.uid, storedActiveHId || undefined).then((serverTx) => {
            if (serverTx) {
              setTransactions(serverTx);
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(serverTx));
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to load storage/backend data:', e);
    } finally {
      setIsAuthReady(true);
    }
  }, [learningEngine]);

  // 🔄 即時監聽與自動同步 Cloud Firestore 帳目與個人資料數據 (跨裝置即時同步)
  useEffect(() => {
    if (!isAuthReady || !user.uid) return;

    const { isConfigured } = getFirebaseServices();
    if (!isConfigured) return;

    // 1. 建立 Firestore onSnapshot 即時監聽器 (交易明細)
    const unsubscribeTx = FirestoreService.subscribeToUserTransactions(user.uid, (cloudTx) => {
      if (cloudTx && cloudTx.length > 0) {
        setTransactions(cloudTx);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cloudTx));
      }
    });

    // 2. 建立 Firestore onSnapshot 即時監聽器 (個人檔案：標籤庫、預算、設定精靈狀態)
    const unsubscribeUser = FirestoreService.subscribeToUserProfile(user.uid, (cloudUser) => {
      if (cloudUser) {
        setUser((prev) => {
          const merged = { ...prev, ...cloudUser };
          AuthService.saveActiveSession(merged as AuthUser);
          return merged;
        });
        if (cloudUser.tagItems && Array.isArray(cloudUser.tagItems) && cloudUser.tagItems.length > 0) {
          setAvailableTagItems(cloudUser.tagItems);
          localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(cloudUser.tagItems));
          localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(cloudUser.tagItems.map((t) => t.name)));
        }
        if (cloudUser.paymentMethods && Array.isArray(cloudUser.paymentMethods) && cloudUser.paymentMethods.length > 0) {
          setPaymentMethods(cloudUser.paymentMethods);
          localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(cloudUser.paymentMethods));
        }
      }
    });

    return () => {
      if (unsubscribeTx) unsubscribeTx();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [isAuthReady, user.uid, activeHouseholdId]);

  // 🔄 原生桌面小工具 (WidgetKit) 自動同步最新數據
  useEffect(() => {
    if (!isAuthReady) return;

    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const activeTx = transactions.filter((t) => {
        if (activeLedger === 'household') {
          return t.householdId === activeHouseholdId;
        }
        return !t.householdId;
      });

      const todayExpense = activeTx
        .filter((t) => t.type === 'expense' && t.date === todayStr)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const monthExpense = activeTx
        .filter((t) => t.type === 'expense' && t.date.startsWith(thisMonthStr))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const monthBudget = activeLedger === 'household'
        ? (household?.monthlyBudget || 40000)
        : (user.monthlyBudget || 35000);

      const budgetRemaining = Math.max(0, monthBudget - monthExpense);
      const activeLedgerName = activeLedger === 'household' ? (household?.name || '群組公帳') : '個人私帳';
      const carrierCode = user.defaultCarrierCode || '/AB1234+';

      Platform.syncWidgetData({
        carrierCode,
        todayExpense,
        monthExpense,
        monthBudget,
        budgetRemaining,
        activeLedgerName,
      });
    } catch (err) {
      console.warn('Failed to sync widget data:', err);
    }
  }, [isAuthReady, transactions, user, activeLedger, activeHouseholdId, household]);

  const saveHouseholdsList = (list: Household[]) => {
    setHouseholds(list);
    localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(list));
  };

  const switchActiveHousehold = (householdId: string) => {
    setActiveHouseholdId(householdId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, householdId);
    if (user.uid) {
      CloudApiClient.getTransactions(user.uid, householdId).then((serverTx) => {
        if (serverTx) saveTx(serverTx);
      });
    }
  };

  const createHousehold = (name: string, monthlyBudget?: number): Household => {
    const now = Date.now();
    const newHousehold: Household = {
      id: `house_${now}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      ownerId: user.uid || 'user_guest',
      members: [
        {
          userId: user.uid || 'user_guest',
          displayName: user.displayName || '我',
          email: user.email,
          avatarUrl: user.photoURL,
          role: 'owner',
          carrierCode: user.defaultCarrierCode,
          joinedAt: now,
        },
      ],
      pendingJoinRequests: [],
      pendingInvitations: [],
      paymentMethods: [...DEFAULT_GROUP_PAYMENT_METHODS],
      tags: [...DEFAULT_GROUP_TAGS],
      currency: 'NT$',
      defaultSplitMethod: 'equal',
      monthlyBudget: monthlyBudget || 40000,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newHousehold, ...households];
    saveHouseholdsList(updated);
    setActiveHouseholdId(newHousehold.id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, newHousehold.id);
    CloudApiClient.saveHousehold(newHousehold);
    return newHousehold;
  };

  // 組長以 Email 邀請新成員
  const inviteMemberByEmail = async (
    email: string,
    role: 'member' | 'admin' = 'member',
    targetHouseholdId?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetHId = targetHouseholdId || activeHouseholdId;
    if (!targetHId) return { success: false, message: '尚未選取群組' };

    const res = await CloudApiClient.inviteMemberByEmail(
      targetHId,
      { uid: user.uid, displayName: user.displayName },
      email.trim().toLowerCase(),
      role
    );

    if (res && res.success) {
      const updatedH = await CloudApiClient.getHousehold(targetHId);
      if (updatedH) {
        const updatedList = households.map((h) => (h.id === targetHId ? updatedH : h));
        saveHouseholdsList(updatedList);
      }
      return { success: true, message: res.message };
    }
    return { success: false, message: res?.message || '邀請失敗，請稍後再試。' };
  };

  // 被邀請者回覆邀請 (同意/拒絕)
  const respondToIncomingInvitation = async (
    invitationId: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; message: string }> => {
    if (!user.email) return { success: false, message: '未設定 Email 帳號' };

    const res = await CloudApiClient.respondToInvitation(
      invitationId,
      user.email,
      action,
      user
    );

    if (res && res.success) {
      setIncomingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      if (action === 'accept' && res.household) {
        const filtered = households.filter((h) => h.id !== res.household!.id);
        const newHouseholds = [res.household, ...filtered];
        saveHouseholdsList(newHouseholds);
        setActiveHouseholdId(res.household.id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, res.household.id);
        const serverTx = await CloudApiClient.getTransactions(user.uid, res.household.id);
        if (serverTx) saveTx(serverTx);
      }
      return { success: true, message: res.message };
    }
    return { success: false, message: res?.message || '操作失敗，請稍後再試。' };
  };

  // 透過邀請碼申請加入群組 (提交審核申請)
  const requestJoinByCode = async (
    inviteCode: string
  ): Promise<{ success: boolean; message: string; household?: Household }> => {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) return { success: false, message: '請輸入 6 位群組邀請碼' };

    const res = await CloudApiClient.submitJoinRequest(cleanCode, user);
    if (res && res.success) {
      return { success: true, message: res.message, household: res.household };
    }
    return { success: false, message: res?.message || '申請失敗，請檢查邀請碼是否正確。' };
  };

  // 組長審核申請 (同意/拒絕)
  const respondToJoinRequest = async (
    requestId: string,
    action: 'approve' | 'reject',
    targetHouseholdId?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetHId = targetHouseholdId || activeHouseholdId;
    if (!targetHId) return { success: false, message: '尚未選取群組' };

    const res = await CloudApiClient.respondToJoinRequest(targetHId, requestId, action);
    if (res && res.success) {
      if (res.household) {
        const updatedList = households.map((h) => (h.id === targetHId ? res.household! : h));
        saveHouseholdsList(updatedList);
      }
      return { success: true, message: res.message };
    }
    return { success: false, message: res?.message || '審核操作失敗' };
  };

  const joinHousehold = async (
    inviteCode: string
  ): Promise<{ success: boolean; message: string; household?: Household }> => {
    return requestJoinByCode(inviteCode);
  };

  const leaveHousehold = (targetHouseholdId?: string) => {
    const hId = targetHouseholdId || activeHouseholdId;
    if (!hId) return;

    const remaining = households.filter((h) => h.id !== hId);
    saveHouseholdsList(remaining);

    if (activeHouseholdId === hId) {
      if (remaining.length > 0) {
        setActiveHouseholdId(remaining[0].id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, remaining[0].id);
      } else {
        setActiveHouseholdId(null);
        setActiveLedger('personal');
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
      }
    }
  };

  const deleteHousehold = (targetHouseholdId: string) => {
    CloudApiClient.deleteHousehold(targetHouseholdId);
    leaveHousehold(targetHouseholdId);
  };

  const addGroupMember = (
    member: { displayName: string; email?: string; carrierCode?: string; role?: 'member' | 'admin' },
    targetHouseholdId?: string
  ) => {
    const targetH = households.find((h) => h.id === (targetHouseholdId || activeHouseholdId));
    if (!targetH) return;

    const newMemberObj: HouseholdMember = {
      userId: `member_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      displayName: member.displayName.trim(),
      email: member.email || '',
      carrierCode: member.carrierCode || '',
      role: member.role || 'member',
      joinedAt: Date.now(),
    };

    const updated = {
      ...targetH,
      members: [...targetH.members, newMemberObj],
      updatedAt: Date.now(),
    };

    const updatedList = households.map((h) => (h.id === targetH.id ? updated : h));
    saveHouseholdsList(updatedList);
    CloudApiClient.saveHousehold(updated);
  };

  const removeGroupMember = (memberUserId: string, targetHouseholdId?: string) => {
    const targetH = households.find((h) => h.id === (targetHouseholdId || activeHouseholdId));
    if (!targetH) return;

    const updated = {
      ...targetH,
      members: targetH.members.filter((m) => m.userId !== memberUserId),
      updatedAt: Date.now(),
    };

    const updatedList = households.map((h) => (h.id === targetH.id ? updated : h));
    saveHouseholdsList(updatedList);
    CloudApiClient.saveHousehold(updated);
  };

  const updateHousehold = (data: Partial<Household>, targetHouseholdId?: string) => {
    const targetH = households.find((h) => h.id === (targetHouseholdId || activeHouseholdId));
    if (!targetH) return;

    const updated = {
      ...targetH,
      ...data,
      updatedAt: Date.now(),
    };

    const updatedList = households.map((h) => (h.id === targetH.id ? updated : h));
    saveHouseholdsList(updatedList);
    CloudApiClient.saveHousehold(updated);
  };

  // 群組付款方式操作
  const addGroupPaymentMethod = (householdId: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentList = targetH.paymentMethods || DEFAULT_GROUP_PAYMENT_METHODS;
    if (currentList.includes(clean)) return;
    const updatedMethods = [...currentList, clean];
    updateHousehold({ paymentMethods: updatedMethods }, householdId);
  };

  const removeGroupPaymentMethod = (householdId: string, name: string) => {
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentList = targetH.paymentMethods || DEFAULT_GROUP_PAYMENT_METHODS;
    if (currentList.length <= 1) {
      alert('請至少保留一種群組付款方式');
      return;
    }
    const updatedMethods = currentList.filter((p) => p !== name);
    updateHousehold({ paymentMethods: updatedMethods }, householdId);
  };

  const updateGroupPaymentMethod = (householdId: string, oldName: string, newName: string) => {
    const clean = newName.trim();
    if (!clean || oldName === clean) return;
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentList = targetH.paymentMethods || DEFAULT_GROUP_PAYMENT_METHODS;
    const updatedMethods = currentList.map((p) => (p === oldName ? clean : p));
    updateHousehold({ paymentMethods: updatedMethods }, householdId);
  };

  // 群組標籤分類操作 (支援永久 key / ID 綁定與更名自動連動)
  const addGroupTag = (householdId: string, tag: string, customKey?: string) => {
    let clean = tag.trim().replace(/^#/, '');
    if (!clean) return;
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentItems = normalizeTagItems(targetH.tagItems || targetH.tags, DEFAULT_GROUP_TAG_ITEMS);
    if (currentItems.some((t) => t.name === clean)) return;

    const newTagItem: TagItem = {
      id: customKey || generateTagKey(clean),
      name: clean,
      order: currentItems.length,
    };
    const updatedItems = [...currentItems, newTagItem];
    updateHousehold(
      {
        tagItems: updatedItems,
        tags: updatedItems.map((t) => t.name),
      },
      householdId
    );
  };

  const removeGroupTag = (householdId: string, tagOrKey: string) => {
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentItems = normalizeTagItems(targetH.tagItems || targetH.tags, DEFAULT_GROUP_TAG_ITEMS);
    const updatedItems = currentItems.filter((t) => t.id !== tagOrKey && t.name !== tagOrKey);
    updateHousehold(
      {
        tagItems: updatedItems,
        tags: updatedItems.map((t) => t.name),
      },
      householdId
    );
  };

  const updateGroupTag = (householdId: string, oldTagOrKey: string, newTag: string) => {
    let clean = newTag.trim().replace(/^#/, '');
    if (!clean) return;
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentItems = normalizeTagItems(targetH.tagItems || targetH.tags, DEFAULT_GROUP_TAG_ITEMS);
    const targetItem = currentItems.find((t) => t.id === oldTagOrKey || t.name === oldTagOrKey);
    if (!targetItem) return;

    const tagKey = targetItem.id;
    const oldName = targetItem.name;
    if (oldName === clean) return;

    // 1. 更新群組 tagItems (Key 保持永久不變)
    const updatedItems = currentItems.map((t) => (t.id === tagKey ? { ...t, name: clean } : t));

    // 2. 連動更新群組標籤預算
    const updatedTagBudgets = { ...(targetH.tagBudgets || {}) };
    const oldBudget = updatedTagBudgets[tagKey] ?? updatedTagBudgets[oldName];
    if (oldBudget !== undefined) {
      updatedTagBudgets[clean] = oldBudget;
      updatedTagBudgets[tagKey] = oldBudget;
      delete updatedTagBudgets[oldName];
    }

    updateHousehold(
      {
        tagItems: updatedItems,
        tags: updatedItems.map((t) => t.name),
        tagBudgets: updatedTagBudgets,
      },
      householdId
    );

    // 3. 連動更新群組既有所有交易中的標籤與 tagIds
    const updatedTx = transactions.map((t) => {
      const hasKey = t.tagIds?.includes(tagKey);
      const hasOldName = t.tags?.includes(oldName);
      const hasOldKey = t.tags?.includes(tagKey);

      if (hasKey || hasOldName || hasOldKey) {
        const newTagIds = Array.from(new Set([...(t.tagIds || []), tagKey]));
        const newTags = (t.tags || []).map((item) => (item === oldName || item === tagKey ? clean : item));
        if (!newTags.includes(clean)) {
          newTags.push(clean);
        }
        return {
          ...t,
          tags: newTags,
          tagIds: newTagIds,
        };
      }
      return t;
    });
    setTransactions(updatedTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTx));

    // 4. 連動更新目前已勾選的篩選條件
    if (selectedTagFilters.includes(oldName) || selectedTagFilters.includes(tagKey)) {
      setSelectedTagFilters(selectedTagFilters.map((t) => (t === oldName || t === tagKey ? clean : t)));
    }
  };

  const reorderGroupTags = (householdId: string, newTagsOrItems: (string | TagItem)[]) => {
    const targetH = households.find((h) => h.id === householdId);
    if (!targetH) return;
    const currentItems = normalizeTagItems(targetH.tagItems || targetH.tags, DEFAULT_GROUP_TAG_ITEMS);
    let updatedItems: TagItem[];

    if (newTagsOrItems.length > 0 && typeof newTagsOrItems[0] === 'object') {
      updatedItems = newTagsOrItems as TagItem[];
    } else {
      const tagNames = newTagsOrItems as string[];
      updatedItems = tagNames.map((name, idx) => {
        const existing = currentItems.find((t) => t.name === name || t.id === name);
        return existing
          ? { ...existing, order: idx }
          : { id: generateTagKey(name), name, order: idx };
      });
    }

    updateHousehold(
      {
        tagItems: updatedItems,
        tags: updatedItems.map((t) => t.name),
      },
      householdId
    );
  };

  // 個人付款方式操作
  const addPaymentMethod = (name: string) => {
    const clean = name.trim();
    if (!clean || paymentMethods.includes(clean)) return;
    const updated = [...paymentMethods, clean];
    setPaymentMethods(updated);
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(updated));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, paymentMethods: updated });
      CloudApiClient.saveUserProfile({ ...user, paymentMethods: updated });
    }
  };

  const removePaymentMethod = (name: string) => {
    if (paymentMethods.length <= 1) {
      alert('請至少保留一種付款方式');
      return;
    }
    const updated = paymentMethods.filter((p) => p !== name);
    setPaymentMethods(updated);
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(updated));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, paymentMethods: updated });
      CloudApiClient.saveUserProfile({ ...user, paymentMethods: updated });
    }
  };

  const updatePaymentMethod = (oldName: string, newName: string) => {
    const clean = newName.trim();
    if (!clean || oldName === clean) return;
    const updated = paymentMethods.map((p) => (p === oldName ? clean : p));
    setPaymentMethods(updated);
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(updated));
    const updatedTx = transactions.map((t) =>
      t.paymentMethod === oldName ? { ...t, paymentMethod: clean } : t
    );
    setTransactions(updatedTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTx));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, paymentMethods: updated });
      CloudApiClient.saveUserProfile({ ...user, paymentMethods: updated });
    }
  };

  // 個人標籤分類操作 (支援永久 key / ID 綁定與更名自動連動)
  const addCustomTag = (tag: string, customKey?: string) => {
    let clean = tag.trim().replace(/^#/, '');
    if (!clean) return;
    if (availableTagItems.some((t) => t.name === clean)) return;

    const newTagItem: TagItem = {
      id: customKey || generateTagKey(clean),
      name: clean,
      order: availableTagItems.length,
    };
    const updated = [...availableTagItems, newTagItem];
    setAvailableTagItems(updated);
    localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated.map((t) => t.name)));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, tagItems: updated });
      CloudApiClient.saveUserProfile({ ...user, tagItems: updated });
    }
  };

  const removeCustomTag = (tagOrKey: string) => {
    const updated = availableTagItems.filter((t) => t.id !== tagOrKey && t.name !== tagOrKey);
    setAvailableTagItems(updated);
    localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated.map((t) => t.name)));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, tagItems: updated });
      CloudApiClient.saveUserProfile({ ...user, tagItems: updated });
    }
  };

  const updateCustomTag = (oldTagOrKey: string, newTag: string) => {
    let clean = newTag.trim().replace(/^#/, '');
    if (!clean) return;
    const targetItem = availableTagItems.find((t) => t.id === oldTagOrKey || t.name === oldTagOrKey);
    if (!targetItem) return;

    const tagKey = targetItem.id;
    const oldName = targetItem.name;
    if (oldName === clean) return;

    // 1. 更新 availableTagItems (Key 保持永久不變，只更新 name)
    const updatedTagItems = availableTagItems.map((t) => (t.id === tagKey ? { ...t, name: clean } : t));
    setAvailableTagItems(updatedTagItems);
    localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(updatedTagItems));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updatedTagItems.map((t) => t.name)));

    // 2. 連動更新個人標籤預算 (Key 和 Name 雙向更新，確保更名後預算不遺失)
    let nextTagBudgets = user.tagBudgets;
    if (user.tagBudgets) {
      const updatedBudgets = { ...user.tagBudgets };
      const oldBudget = updatedBudgets[tagKey] ?? updatedBudgets[oldName];
      if (oldBudget !== undefined) {
        updatedBudgets[clean] = oldBudget;
        updatedBudgets[tagKey] = oldBudget;
        delete updatedBudgets[oldName];
        nextTagBudgets = updatedBudgets;
        updateUserProfile({ tagBudgets: updatedBudgets });
      }
    }

    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, tagItems: updatedTagItems, tagBudgets: nextTagBudgets });
      CloudApiClient.saveUserProfile({ ...user, tagItems: updatedTagItems, tagBudgets: nextTagBudgets });
    }

    // 3. 連動更新私帳既有所有交易中的標籤名稱與永久 tagIds (全面找回與同步)
    const updatedTx = transactions.map((t) => {
      const hasKey = t.tagIds?.includes(tagKey);
      const hasOldName = t.tags?.includes(oldName);
      const hasOldKey = t.tags?.includes(tagKey);

      if (hasKey || hasOldName || hasOldKey) {
        const newTagIds = Array.from(new Set([...(t.tagIds || []), tagKey]));
        const newTags = (t.tags || []).map((item) => (item === oldName || item === tagKey ? clean : item));
        if (!newTags.includes(clean)) {
          newTags.push(clean);
        }
        return {
          ...t,
          tags: newTags,
          tagIds: newTagIds,
        };
      }
      return t;
    });
    setTransactions(updatedTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTx));

    // 4. 連動更新 AI 學習規則中的 targetTags 與 targetTagIds
    const updatedRules = learningRules.map((r) => {
      const hasKey = r.targetTagIds?.includes(tagKey);
      const hasOldName = r.targetTags?.includes(oldName);
      if (hasKey || hasOldName) {
        const newTargetTagIds = Array.from(new Set([...(r.targetTagIds || []), tagKey]));
        const newTargetTags = (r.targetTags || []).map((item) => (item === oldName ? clean : item));
        return {
          ...r,
          targetTags: newTargetTags,
          targetTagIds: newTargetTagIds,
        };
      }
      return r;
    });
    setLearningRules(updatedRules);
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(updatedRules));

    // 5. 連動更新目前已勾選的篩選條件
    if (selectedTagFilters.includes(oldName) || selectedTagFilters.includes(tagKey)) {
      setSelectedTagFilters(selectedTagFilters.map((t) => (t === oldName || t === tagKey ? clean : t)));
    }
  };

  const reorderCustomTags = (newTagsOrItems: (string | TagItem)[]) => {
    let updatedItems: TagItem[];
    if (newTagsOrItems.length > 0 && typeof newTagsOrItems[0] === 'object') {
      updatedItems = newTagsOrItems as TagItem[];
    } else {
      const tagNames = newTagsOrItems as string[];
      updatedItems = tagNames.map((name, idx) => {
        const existing = availableTagItems.find((t) => t.name === name || t.id === name);
        return existing
          ? { ...existing, order: idx }
          : { id: generateTagKey(name), name, order: idx };
      });
    }
    setAvailableTagItems(updatedItems);
    localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(updatedItems));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updatedItems.map((t) => t.name)));
    if (user.uid) {
      FirestoreService.saveUserProfile({ ...user, tagItems: updatedItems });
      CloudApiClient.saveUserProfile({ ...user, tagItems: updatedItems });
    }
  };

  const loginWithUser = (authUser: AuthUser) => {
    setUser(authUser);
    setIsAuthenticated(true);
    AuthService.saveActiveSession(authUser);

    // 拉取該使用者名下的所有真實群組 (複數群組支援)
    CloudApiClient.getHouseholds(authUser.uid).then((serverHouseholds) => {
      const list = serverHouseholds || [];
      saveHouseholdsList(list);
      if (list.length > 0) {
        setActiveHouseholdId(list[0].id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID, list[0].id);
      } else {
        setActiveHouseholdId(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
      }
    });

    if (authUser.email) {
      CloudApiClient.getPendingInvitationsForEmail(authUser.email).then((invs) => {
        if (invs) setIncomingInvitations(invs);
      });
    }

    // 載入該使用者專屬真實交易與雲端個人資料 (優先從 Cloud Firestore 拉取)
    const { isConfigured } = getFirebaseServices();
    if (isConfigured) {
      FirestoreService.pullFromCloud(authUser.uid, authUser.activeHouseholdId).then((data) => {
        if (data) {
          if (data.user) {
            setUser((prev) => {
              const merged = { ...prev, ...data.user };
              AuthService.saveActiveSession(merged as AuthUser);
              return merged;
            });
            if (data.user.paymentMethods && Array.isArray(data.user.paymentMethods) && data.user.paymentMethods.length > 0) {
              setPaymentMethods(data.user.paymentMethods);
              localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(data.user.paymentMethods));
            }
          } else {
            // 雲端尚無 profile 時，立即上傳當前 authUser
            FirestoreService.saveUserProfile({
              ...authUser,
              tagItems: availableTagItems,
              paymentMethods,
            });
          }

          if (data.tagItems && Array.isArray(data.tagItems) && data.tagItems.length > 0) {
            setAvailableTagItems(data.tagItems);
            localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(data.tagItems));
            localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(data.tagItems.map((t) => t.name)));
          }

          if (data.transactions && data.transactions.length > 0) {
            setTransactions(data.transactions);
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
          } else {
            CloudApiClient.getTransactions(authUser.uid, authUser.activeHouseholdId).then((serverTx) => {
              if (serverTx && serverTx.length > 0) {
                setTransactions(serverTx);
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(serverTx));
              }
            });
          }
        }
      });
    } else {
      CloudApiClient.getUserProfile(authUser.uid).then((serverUser) => {
        if (serverUser) {
          setUser((prev) => {
            const merged = { ...prev, ...serverUser };
            AuthService.saveActiveSession(merged as AuthUser);
            return merged;
          });
          if (serverUser.tagItems && Array.isArray(serverUser.tagItems) && serverUser.tagItems.length > 0) {
            setAvailableTagItems(serverUser.tagItems);
            localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(serverUser.tagItems));
            localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(serverUser.tagItems.map((t) => t.name)));
          }
          if (serverUser.paymentMethods && Array.isArray(serverUser.paymentMethods) && serverUser.paymentMethods.length > 0) {
            setPaymentMethods(serverUser.paymentMethods);
            localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(serverUser.paymentMethods));
          }
        } else {
          CloudApiClient.saveUserProfile({ ...authUser, tagItems: availableTagItems, paymentMethods });
        }
      });

      CloudApiClient.getTransactions(authUser.uid, authUser.activeHouseholdId).then((serverTx) => {
        const list = serverTx || [];
        setTransactions(list);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
      });
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser({
      uid: '',
      email: '',
      displayName: '訪客',
      defaultCarrierCode: '',
    });
    setHouseholds([]);
    setActiveHouseholdId(null);
    setIncomingInvitations([]);
    setTransactions([]);
    setInvoices([]);
    localStorage.removeItem(STORAGE_KEYS.HOUSEHOLDS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_HOUSEHOLD_ID);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
  };

  const saveTx = (newTx: Transaction[]) => {
    const normalized = newTx.map((t) => ({
      ...t,
      tags: t.tags && t.tags.length > 0 ? [t.tags[0]] : ['未歸類'],
    }));
    setTransactions(normalized);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(normalized));
  };

  const saveInvoices = (newInvs: TaiwanInvoice[]) => {
    setInvoices(newInvs);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(newInvs));
  };

  const saveRules = (newRules: LearningRule[]) => {
    setLearningRules(newRules);
    learningEngine.setRules(newRules);
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(newRules));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    let fullUpdated: UserProfile | null = null;
    setUser((prev) => {
      const updated = { ...prev, ...profile };
      fullUpdated = updated;
      AuthService.saveActiveSession(updated as AuthUser);
      return updated;
    });

    if (profile.tagItems) {
      setAvailableTagItems(profile.tagItems);
      localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(profile.tagItems));
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(profile.tagItems.map((t) => t.name)));
    }

    if (profile.paymentMethods) {
      setPaymentMethods(profile.paymentMethods);
      localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(profile.paymentMethods));
    }

    // ☁️ 即時自動上傳與同步所有個人資料至 Cloud Firestore 與後端資料庫
    const targetUser = fullUpdated || { ...user, ...profile };
    if (targetUser && targetUser.uid) {
      const payloadToSave: UserProfile = {
        ...targetUser,
        tagItems: profile.tagItems || availableTagItems,
        paymentMethods: profile.paymentMethods || paymentMethods,
      };
      FirestoreService.saveUserProfile(payloadToSave);
      CloudApiClient.saveUserProfile(payloadToSave);
    }
  };

  const syncToCloud = async () => {
    try {
      const { isConfigured } = getFirebaseServices();
      if (isConfigured) {
        return await FirestoreService.syncLocalToCloud({
          user: {
            ...user,
            tagItems: availableTagItems,
            paymentMethods,
          },
          households,
          transactions,
          invoices,
          tagItems: availableTagItems,
          learningRules,
        });
      }

      for (const t of transactions) {
        await CloudApiClient.saveTransaction(t);
      }
      for (const inv of invoices) {
        await CloudApiClient.saveInvoice(inv);
      }
      for (const h of households) {
        await CloudApiClient.saveHousehold(h);
      }
      return { success: true, message: '全量數據已成功同步至雲端！' };
    } catch (e: any) {
      return { success: false, message: `同步失敗：${e.message}` };
    }
  };

  const pullFromCloud = async () => {
    if (!user.uid) return false;
    const { isConfigured } = getFirebaseServices();
    if (isConfigured) {
      const data = await FirestoreService.pullFromCloud(user.uid, household?.id);
      if (data) {
        restoreFullBackup({
          transactions: data.transactions,
          availableTagItems: data.tagItems || undefined,
          households: data.households.length > 0 ? data.households : undefined,
          invoices: data.invoices,
        });
        return true;
      }
    }

    const serverHouseholds = await CloudApiClient.getHouseholds(user.uid);
    if (serverHouseholds) {
      setHouseholds(serverHouseholds);
      localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(serverHouseholds));
    }
    const serverTx = await CloudApiClient.getTransactions(user.uid, household?.id);
    if (serverTx) {
      setTransactions(serverTx);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(serverTx));
    }
    const serverInvs = await CloudApiClient.getInvoices(user.defaultCarrierCode);
    if (serverInvs) {
      setInvoices(serverInvs);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(serverInvs));
    }
    return true;
  };

  const restoreFullBackup = (bundle: {
    transactions?: Transaction[];
    availableTagItems?: TagItem[];
    households?: Household[];
    invoices?: TaiwanInvoice[];
  }) => {
    if (bundle.transactions && Array.isArray(bundle.transactions)) {
      setTransactions(bundle.transactions);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(bundle.transactions));
    }
    if (bundle.availableTagItems && Array.isArray(bundle.availableTagItems)) {
      setAvailableTagItems(bundle.availableTagItems);
      localStorage.setItem(STORAGE_KEYS.TAG_ITEMS, JSON.stringify(bundle.availableTagItems));
    }
    if (bundle.households && Array.isArray(bundle.households)) {
      setHouseholds(bundle.households);
      localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(bundle.households));
    }
    if (bundle.invoices && Array.isArray(bundle.invoices)) {
      setInvoices(bundle.invoices);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(bundle.invoices));
    }
  };

  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const id = `tx_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // 異常偵測 (同日同金額疑似重複扣款)
    let isAnomaly = false;
    let anomalyReason = '';
    const duplicate = transactions.find(
      (t) =>
        t.date === txData.date &&
        t.amount === txData.amount &&
        (t.merchant === txData.merchant || t.title === txData.title) &&
        t.userId === (txData.userId || user.uid)
    );
    if (duplicate) {
      isAnomaly = true;
      anomalyReason = `偵測到疑似重複扣款：與今日「${duplicate.title}」金額 NT$ ${txData.amount} 完全相同！`;
    }

    const singleTag = txData.tags && txData.tags.length > 0 ? [txData.tags[0]] : ['未歸類'];
    const matchedTag = currentTagItems.find((t) => t.name === singleTag[0] || t.id === singleTag[0]);
    const tagIds = txData.tagIds && txData.tagIds.length > 0
      ? txData.tagIds
      : [matchedTag ? matchedTag.id : generateTagKey(singleTag[0])];

    const newTx: Transaction = {
      ...txData,
      id,
      userId: txData.userId || user.uid || 'user_guest',
      householdId: txData.ledgerType === 'household' ? (txData.householdId || household?.id) : undefined,
      tags: singleTag,
      tagIds,
      isAnomaly,
      anomalyReason,
      createdAt: now,
      updatedAt: now,
    };

    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    });
    CloudApiClient.saveTransaction(newTx);
    FirestoreService.saveTransaction(newTx);
    return newTx;
  };

  const updateTransaction = (id: string, updateData: Partial<Transaction>) => {
    let savedTarget: Transaction | null = null;
    setTransactions((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;

      if (
        updateData.categoryId &&
        updateData.categoryId !== target.categoryId &&
        (target.merchant || target.title)
      ) {
        const catObj = DEFAULT_CATEGORIES.find((c) => c.id === updateData.categoryId);
        learningEngine.recordUserCorrection(
          target.title,
          target.merchant,
          updateData.categoryId,
          catObj ? catObj.name : updateData.categoryId,
          updateData.subCategory || target.subCategory,
          updateData.tags || target.tags,
          user.uid,
          household?.id
        );
        saveRules(learningEngine.getRules());
      }

      const updated = prev.map((t) => {
        if (t.id === id) {
          const normalizedTags = updateData.tags !== undefined
            ? (updateData.tags.length > 0 ? [updateData.tags[0]] : ['未歸類'])
            : t.tags;

          const matchedTag = currentTagItems.find((ci) => ci.name === normalizedTags[0] || ci.id === normalizedTags[0]);
          const normalizedTagIds = updateData.tagIds !== undefined
            ? updateData.tagIds
            : (matchedTag ? [matchedTag.id] : (t.tagIds || [generateTagKey(normalizedTags[0])]));

          const u = {
            ...t,
            ...updateData,
            tags: normalizedTags,
            tagIds: normalizedTagIds,
            isAnomaly: updateData.isAnomaly !== undefined ? updateData.isAnomaly : false,
            anomalyReason: updateData.anomalyReason !== undefined ? updateData.anomalyReason : '',
            updatedAt: Date.now(),
          };
          savedTarget = u;
          return u;
        }
        return t;
      });
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    });

    if (savedTarget) {
      CloudApiClient.saveTransaction(savedTarget);
      FirestoreService.saveTransaction(savedTarget);
    }
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    CloudApiClient.deleteTransaction(id);
    if (target) {
      FirestoreService.deleteTransaction(target);
    }
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTransactions = (ids: string[]) => {
    const idSet = new Set(ids);
    const targets = transactions.filter((t) => idSet.has(t.id));
    ids.forEach((id) => CloudApiClient.deleteTransaction(id));
    targets.forEach((t) => FirestoreService.deleteTransaction(t));
    setTransactions((prev) => {
      const updated = prev.filter((t) => !idSet.has(t.id));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    });
  };

  const addInvoice = (invoice: TaiwanInvoice) => {
    const autoCategorized = autoCategorizeInvoice(invoice);
    const lotteryResult = checkLotteryWinning(autoCategorized.invoiceNumber, autoCategorized.date);
    const invoiceWithPrize: TaiwanInvoice = {
      ...autoCategorized,
      carrierCode: autoCategorized.carrierCode || user.defaultCarrierCode || '/AB1234+',
      lotteryResult,
    };

    const updatedInvoices = [invoiceWithPrize, ...invoices];
    saveInvoices(updatedInvoices);
    CloudApiClient.saveInvoice(invoiceWithPrize);

    let dominantCatId = 'food';
    let dominantCatName = '餐飲飲食';
    let dominantSubCat = '日常採買';
    const dynamicTags: string[] = ['電子發票', 'AI品項分類'];

    if (autoCategorized.items && autoCategorized.items.length > 0) {
      const catSums: Record<string, { amount: number; name: string; subCat?: string }> = {};
      autoCategorized.items.forEach((it) => {
        const cId = it.categoryId || 'food';
        if (!catSums[cId]) {
          catSums[cId] = { amount: 0, name: it.categoryName || '餐飲飲食', subCat: it.subCategory };
        }
        catSums[cId].amount += it.amount;
      });
      const sorted = Object.entries(catSums).sort((a, b) => b[1].amount - a[1].amount);
      if (sorted.length > 0) {
        dominantCatId = sorted[0][0];
        dominantCatName = sorted[0][1].name;
        dominantSubCat = sorted[0][1].subCat || '發票採買';
      }
    } else if (invoice.sellerGUI && KNOWN_SELLER_GUIS[invoice.sellerGUI]) {
      const known = KNOWN_SELLER_GUIS[invoice.sellerGUI];
      dominantCatId = known.categoryId;
      const c = DEFAULT_CATEGORIES.find((x) => x.id === dominantCatId);
      dominantCatName = c ? c.name : '日常消費';
      if (known.defaultTags) dynamicTags.push(...known.defaultTags);
    }

    const firstItemName = autoCategorized.items[0]?.name;
    const txTitle = firstItemName
      ? `${autoCategorized.sellerName || '發票消費'} - ${firstItemName}${autoCategorized.items.length > 1 ? ` 等 ${autoCategorized.items.length} 項` : ''}`
      : (autoCategorized.sellerName || '電子發票消費');

    addTransaction({
      userId: user.uid || 'user_guest',
      householdId: household?.id,
      title: txTitle,
      amount: autoCategorized.totalAmount,
      type: 'expense',
      ledgerType: 'personal',
      categoryId: dominantCatId,
      categoryName: dominantCatName,
      subCategory: dominantSubCat,
      paymentMethod: user.defaultPaymentMethod || '信用卡 (一般)',
      date: autoCategorized.date,
      merchant: autoCategorized.sellerName,
      invoiceNumber: autoCategorized.invoiceNumber,
      tags: dynamicTags,
      items: autoCategorized.items,
    });
  };

  const scanAndImportInvoiceQr = (qr1: string, qr2?: string) => {
    const parsed = parseTaiwanInvoiceQrCode(qr1, qr2);
    if (!parsed) {
      return { invoice: null, message: '發票 QR Code 格式不正確或未能辨識。' };
    }
    const exists = invoices.some((i) => i.invoiceNumber === parsed.invoiceNumber);
    if (exists) {
      return { invoice: parsed, message: `發票 ${parsed.invoiceNumber} 已經登錄過囉！` };
    }
    addInvoice(parsed);
    return { invoice: parsed, message: `成功登錄發票 ${parsed.invoiceNumber} (NT$ ${parsed.totalAmount})！` };
  };

  const checkAllInvoicesLottery = () => {
    const updated = invoices.map((inv) => ({
      ...inv,
      lotteryResult: checkLotteryWinning(inv.invoiceNumber, inv.date),
    }));
    saveInvoices(updated);
  };

  const syncMofInvoices = async (
    verificationCode?: string,
    appID?: string,
    force?: boolean
  ) => {
    const carrier = user.defaultCarrierCode || '/AB1234+';
    const res = await CloudApiClient.syncMofInvoices({
      carrierCode: carrier,
      verificationCode,
      appID,
      force,
      userId: user.uid || 'user_guest',
      householdId: household?.id,
    });

    if (!res || !res.success) {
      return {
        success: false,
        count: 0,
        totalAmount: 0,
        message: res?.message || '財政部伺服器連線失敗，請檢查驗證碼或稍後再試。',
      };
    }

    if (res.invoices && res.invoices.length > 0) {
      const mergedInvoices = [...res.invoices, ...invoices.filter((inv) => !res.invoices.some((r) => r.invoiceNumber === inv.invoiceNumber))];
      saveInvoices(mergedInvoices);
    }

    if (res.newTransactions && res.newTransactions.length > 0) {
      const mergedTx = [...res.newTransactions, ...transactions.filter((t) => !res.newTransactions.some((r) => r.id === t.id))];
      saveTx(mergedTx);
    }

    return {
      success: true,
      count: res.count,
      totalAmount: res.totalAmount,
      message: res.message,
    };
  };

  const settleTransfer = (transfer: SettlementTransfer) => {
    addTransaction({
      userId: transfer.fromUserId,
      householdId: household?.id,
      title: `群組結算轉帳：${transfer.fromName} 轉給 ${transfer.toName}`,
      amount: transfer.amount,
      type: 'transfer',
      ledgerType: 'household',
      categoryId: 'family',
      categoryName: '群組分帳',
      paymentMethod: '銀行轉帳',
      date: new Date().toISOString().split('T')[0],
      note: '群組分帳自動結算',
      tags: ['分帳結算'],
      splitInfo: {
        payerId: transfer.fromUserId,
        splitMethod: 'exact',
        splits: [
          { userId: transfer.toUserId, amount: transfer.amount, settled: true }
        ]
      }
    });
  };

  // 4. 嚴格帳本獨立過濾 (Strict Ledger Isolation)
  const filteredTransactions = transactions.filter((t) => {
    const isOwner =
      t.userId === user.uid || !t.userId || user.uid === 'user_tw_01' || user.uid === 'user_local_guest';
    const isHouseholdMember = Boolean(
      household &&
        (t.householdId === household.id ||
          (t.ledgerType === 'household' && household.members?.some((m) => m.userId === t.userId)))
    );

    if (activeLedger === 'personal' || !activeLedger) {
      return (t.ledgerType === 'personal' || !t.ledgerType) && isOwner;
    }
    if (activeLedger === 'household') {
      return t.ledgerType === 'household' && isHouseholdMember;
    }
    return false;
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (activeLedger === 'personal') {
      return !inv.carrierCode || inv.carrierCode === user.defaultCarrierCode;
    }
    if (activeLedger === 'household' && household) {
      const memberCarriers = household.members.map((m) => m.carrierCode).filter(Boolean);
      return memberCarriers.includes(inv.carrierCode);
    }
    return false;
  });

  const householdBalances =
    activeLedger === 'household' && household
      ? calculateHouseholdBalances(household, filteredTransactions)
      : null;

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthReady,
        households,
        activeHouseholdId,
        household,
        switchActiveHousehold,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        deleteHousehold,
        addGroupMember,
        removeGroupMember,
        updateHousehold,
        addGroupPaymentMethod,
        removeGroupPaymentMethod,
        updateGroupPaymentMethod,
        groupTagItems,
        addGroupTag,
        removeGroupTag,
        updateGroupTag,
        reorderGroupTags,
        incomingInvitations,
        inviteMemberByEmail,
        respondToIncomingInvitation,
        requestJoinByCode,
        respondToJoinRequest,
        activeLedger,
        setActiveLedger,
        transactions,
        invoices,
        categories: DEFAULT_CATEGORIES,
        learningRules,
        learningEngine,
        paymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        updatePaymentMethod,
        availableTagItems,
        availableTags,
        addCustomTag,
        removeCustomTag,
        updateCustomTag,
        reorderCustomTags,
        currentPaymentMethods,
        currentTagItems,
        currentTags,
        getTagByKey,
        getTagByName,
        isCloudConnected,
        syncToCloud,
        pullFromCloud,
        restoreFullBackup,
        loginWithUser,
        logout,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteTransactions,
        addInvoice,
        scanAndImportInvoiceQr,
        checkAllInvoicesLottery,
        syncMofInvoices,
        settleTransfer,
        updateUserProfile,
        viewMode,
        setViewMode,
        weekOffset,
        setWeekOffset,
        calendarYear,
        setCalendarYear,
        calendarMonth,
        setCalendarMonth,
        selectedSubDates,
        setSelectedSubDates,
        selectedTagFilter,
        setSelectedTagFilter,
        selectedTagFilters,
        setSelectedTagFilters,
        toggleTagFilter,
        dateRangeFilter,
        setDateRangeFilter,
        searchQuery,
        setSearchQuery,
        filteredTransactions,
        filteredInvoices,
        householdBalances,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
