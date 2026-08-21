import { Category, PaymentMethodOption } from './types/expense';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: '餐飲飲食',
    icon: 'Utensils',
    color: '#EF4444', // red-500
    type: 'expense',
    subCategories: ['早餐', '午餐', '晚餐', '飲料點心', '咖啡外帶', '外送平台', '便利商店', '聚餐餐廳', '生鮮食材'],
    isSystem: true,
    budgetMonthly: 12000,
  },
  {
    id: 'transport',
    name: '交通運輸',
    icon: 'Car',
    color: '#F97316', // orange-500
    type: 'expense',
    subCategories: ['捷運公車', '高鐵台鐵', '計程車/Uber', '加油費', '停車費', 'ETC/過路費', '機車維修', '共享單車/機車'],
    isSystem: true,
    budgetMonthly: 3500,
  },
  {
    id: 'housing',
    name: '居家生活',
    icon: 'Home',
    color: '#3B82F6', // blue-500
    type: 'expense',
    subCategories: ['房租/房貸', '水電瓦斯', '管理費', '網路寬頻', '日用品消耗', '家具家電', '清潔修繕'],
    isSystem: true,
    budgetMonthly: 15000,
  },
  {
    id: 'shopping',
    name: '購物血拼',
    icon: 'ShoppingBag',
    color: '#EC4899', // pink-500
    type: 'expense',
    subCategories: ['服飾鞋包', '3C電子', '生活美妝', '網購平台', '書報雜誌', '寵物用品'],
    isSystem: true,
    budgetMonthly: 6000,
  },
  {
    id: 'entertainment',
    name: '休閒娛樂',
    icon: 'Gamepad2',
    color: '#8B5CF6', // purple-500
    type: 'expense',
    subCategories: ['電影展覽', '串流訂閱(Netflix/Spotify)', '遊戲課金', 'KTV/夜生活', '旅遊住宿', '運動健身'],
    isSystem: true,
    budgetMonthly: 4000,
  },
  {
    id: 'medical',
    name: '醫療保健',
    icon: 'HeartPulse',
    color: '#10B981', // emerald-500
    type: 'expense',
    subCategories: ['門診掛號', '藥品保健', '牙醫自費', '健康檢查', '醫療保險'],
    isSystem: true,
    budgetMonthly: 2000,
  },
  {
    id: 'education',
    name: '學習進修',
    icon: 'GraduationCap',
    color: '#06B6D4', // cyan-500
    type: 'expense',
    subCategories: ['線上課程', '專業書籍', '證照培訓', '學費/補習'],
    isSystem: true,
    budgetMonthly: 2000,
  },
  {
    id: 'family',
    name: '家庭公用',
    icon: 'Users',
    color: '#EAB308', // yellow-500
    type: 'expense',
    subCategories: ['大賣場公費採買', '公用維修', '孝親長輩', '育兒開銷', '家庭公積金'],
    isSystem: true,
    budgetMonthly: 8000,
  },
  {
    id: 'other_expense',
    name: '其他支出',
    icon: 'MoreHorizontal',
    color: '#6B7280', // gray-500
    type: 'expense',
    subCategories: ['紅包禮金', '手續費', '捐款慈善', '雜支支出'],
    isSystem: true,
    budgetMonthly: 2000,
  },
  {
    id: 'income_salary',
    name: '薪資收入',
    icon: 'Briefcase',
    color: '#22C55E', // green-500
    type: 'income',
    subCategories: ['正職月薪', '年終獎金', '加班費', '兼職接案', '發票中獎', '投資回報', '轉帳收入'],
    isSystem: true,
  }
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'cash', name: '現金', icon: 'Banknote', type: 'cash' },
  { id: 'credit_card', name: '信用卡 (一般)', icon: 'CreditCard', type: 'credit_card' },
  { id: 'line_pay', name: 'LINE Pay', icon: 'Smartphone', type: 'line_pay' },
  { id: 'jko_pay', name: '街口支付', icon: 'Smartphone', type: 'jko_pay' },
  { id: 'px_pay', name: '全支付/PX Pay', icon: 'QrCode', type: 'px_pay' },
  { id: 'easycard', name: '悠遊卡/一卡通', icon: 'CreditCard', type: 'easycard' },
  { id: 'bank_transfer', name: '銀行轉帳', icon: 'Landmark', type: 'bank_transfer' },
  { id: 'apple_pay', name: 'Apple Pay', icon: 'Smartphone', type: 'credit_card' },
];
