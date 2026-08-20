export interface TaiwanInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  categoryId?: string;
  categoryName?: string;
  subCategory?: string;
  tags?: string[];
}

export interface TaiwanInvoice {
  id: string;
  invoiceNumber: string; // e.g. "AB-12345678" or "AB12345678"
  date: string; // YYYY-MM-DD
  rocDate: string; // e.g. "1130325"
  randomCode: string; // 4 digits
  salesAmount: number; // 未稅銷售額 (16進位轉10進位)
  totalAmount: number; // 總金額 (16進位轉10進位)
  buyerGUI: string; // 買方統編 (8位或 00000000)
  sellerGUI: string; // 賣方統編 (8位)
  sellerName?: string; // 賣方名稱
  encryptCode?: string; // 24 bytes
  items: TaiwanInvoiceItem[];
  carrierType?: 'phone_barcode' | 'citizen_cert' | 'credit_card' | 'member_card';
  carrierCode?: string; // e.g. "/AB1234+"
  isScanned: boolean;
  scanTime?: number;
  lotteryResult?: LotteryCheckResult;
}

export interface LotteryPeriod {
  period: string; // e.g. "11303" (113年 3-4月)
  year: number; // 民國年 113
  months: string; // "03-04"
  superPrize: string; // 特別獎 1000 萬 (8 碼)
  specialPrize: string; // 特獎 200 萬 (8 碼)
  firstPrizes: string[]; // 頭獎 20 萬 (3 組 8 碼)
  sixthPrizeAdd?: string[]; // 增開六獎 200 元 (末 3 碼)
  cloudInvoicePrizes?: {
    oneMillion: string[];
    twoThousand: string[];
    eightHundred: string[];
    fiveHundred: string[];
  };
}

export interface LotteryCheckResult {
  isWon: boolean;
  prizeName: string; // '特別獎' | '特獎' | '頭獎' | '二獎' | '三獎' | '四獎' | '五獎' | '六獎' | '雲端發票專屬獎' | '未中獎'
  prizeAmount: number;
  matchedNumber?: string;
  detail?: string;
}
