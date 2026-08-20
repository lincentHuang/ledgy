import { TaiwanInvoice, TaiwanInvoiceItem } from './types/invoice';

// 常用台灣企業統編與商家名稱對照庫
export const KNOWN_SELLER_GUIS: Record<string, { name: string; categoryId: string; defaultTags: string[] }> = {
  '22555003': { name: '統一超商 7-ELEVEN', categoryId: 'food', defaultTags: ['超商', '外食'] },
  '23060248': { name: '全家便利商店 FamilyMart', categoryId: 'food', defaultTags: ['超商', '外食'] },
  '22384437': { name: '萊爾富便利商店', categoryId: 'food', defaultTags: ['超商'] },
  '84149961': { name: 'OK 超商 (來來超商)', categoryId: 'food', defaultTags: ['超商'] },
  '16740494': { name: '全聯實業股份有限公司', categoryId: 'housing', defaultTags: ['超市', '生鮮日用品'] },
  '23535435': { name: '家樂福 Carrefour', categoryId: 'housing', defaultTags: ['量販店', '家庭採買'] },
  '03700444': { name: '台灣麥當勞 McDonald\'s', categoryId: 'food', defaultTags: ['速食', '外食'] },
  '84117001': { name: '星巴克 Starbucks (悠旅生活)', categoryId: 'food', defaultTags: ['咖啡', '下午茶'] },
  '22896500': { name: '台灣屈臣氏 Watsons', categoryId: 'shopping', defaultTags: ['藥妝', '生活用品'] },
  '23136285': { name: '康是美 COSMED', categoryId: 'shopping', defaultTags: ['藥妝'] },
  '23859200': { name: '寶雅國際股份有限公司', categoryId: 'shopping', defaultTags: ['美妝保養', '生活百貨'] },
  '28086000': { name: '台灣中油股份有限公司', categoryId: 'transport', defaultTags: ['加油', '交通'] },
  '70774619': { name: '全國加油站', categoryId: 'transport', defaultTags: ['加油'] },
  '54366661': { name: '優步台灣 Uber Eats', categoryId: 'food', defaultTags: ['外送'] },
  '54652287': { name: '富胖達 Foodpanda', categoryId: 'food', defaultTags: ['外送'] },
  '53738288': { name: '蝦皮購物 Shopee', categoryId: 'shopping', defaultTags: ['網購'] },
  '28445747': { name: '富邦媒體科技 momo購物', categoryId: 'shopping', defaultTags: ['網購'] },
  '16097091': { name: '台灣高鐵', categoryId: 'transport', defaultTags: ['高鐵', '長途交通'] },
  '20847427': { name: '台北大眾捷運', categoryId: 'transport', defaultTags: ['捷運'] },
  '70762986': { name: '誠品生活', categoryId: 'entertainment', defaultTags: ['書籍', '休閒'] },
  '23867626': { name: '微風廣場', categoryId: 'shopping', defaultTags: ['百貨'] },
};

/**
 * AI 單品分類識別引擎：針對發票上的個別品項名稱自動識別分類
 */
export function classifyInvoiceItemCategory(itemName: string, sellerName = ''): {
  categoryId: string;
  categoryName: string;
  subCategory: string;
  tags: string[];
} {
  const name = (itemName || '').toLowerCase();
  const seller = (sellerName || '').toLowerCase();

  // 1. 餐飲 / 生鮮 / 食材 / 飲料
  if (
    name.includes('肉') ||
    name.includes('牛') ||
    name.includes('豬') ||
    name.includes('雞') ||
    name.includes('菜') ||
    name.includes('蛋') ||
    name.includes('魚') ||
    name.includes('海鮮') ||
    name.includes('火鍋') ||
    name.includes('食材') ||
    name.includes('豆腐') ||
    name.includes('米') ||
    name.includes('油') && !name.includes('汽油') ||
    name.includes('醬') ||
    name.includes('調味')
  ) {
    return {
      categoryId: 'food',
      categoryName: '餐飲飲食',
      subCategory: '生鮮食材',
      tags: ['生鮮食材', '煮飯採買'],
    };
  }

  if (
    name.includes('茶') ||
    name.includes('咖啡') ||
    name.includes('拿鐵') ||
    name.includes('美式') ||
    name.includes('奶') ||
    name.includes('飲') ||
    name.includes('水') && !name.includes('化妝水') && !name.includes('水管') ||
    name.includes('可樂') ||
    name.includes('汽水') ||
    name.includes('果汁')
  ) {
    return {
      categoryId: 'food',
      categoryName: '餐飲飲食',
      subCategory: '飲料飲品',
      tags: ['飲料', '手搖咖啡'],
    };
  }

  if (
    name.includes('便當') ||
    name.includes('飯糰') ||
    name.includes('拉麵') ||
    name.includes('麵') ||
    name.includes('堡') ||
    name.includes('薯條') ||
    name.includes('炸雞') ||
    name.includes('蛋糕') ||
    name.includes('甜點') ||
    name.includes('餅乾') ||
    name.includes('零食') ||
    name.includes('糖') ||
    name.includes('麵包') ||
    seller.includes('超商') ||
    seller.includes('7-eleven') ||
    seller.includes('全家') ||
    seller.includes('麥當勞') ||
    seller.includes('星巴克')
  ) {
    return {
      categoryId: 'food',
      categoryName: '餐飲飲食',
      subCategory: '外食點心',
      tags: ['外食', '點心點心'],
    };
  }

  // 2. 居家生活 / 日常消耗品
  if (
    name.includes('衛生紙') ||
    name.includes('面紙') ||
    name.includes('紙巾') ||
    name.includes('洗衣精') ||
    name.includes('洗碗精') ||
    name.includes('清潔劑') ||
    name.includes('垃圾袋') ||
    name.includes('抹布') ||
    name.includes('掃把') ||
    name.includes('拖把') ||
    name.includes('濾芯') ||
    name.includes('電池') ||
    name.includes('燈泡')
  ) {
    return {
      categoryId: 'housing',
      categoryName: '居家生活',
      subCategory: '日用品消耗',
      tags: ['居家生活', '日用品消耗'],
    };
  }

  // 3. 美妝保養 / 個人護理 / 服飾購物
  if (
    name.includes('面膜') ||
    name.includes('精華液') ||
    name.includes('乳液') ||
    name.includes('化妝水') ||
    name.includes('防曬') ||
    name.includes('洗髮') ||
    name.includes('沐浴') ||
    name.includes('護手霜') ||
    name.includes('牙膏') ||
    name.includes('牙刷') ||
    name.includes('唇膏') ||
    name.includes('保養') ||
    seller.includes('寶雅') ||
    seller.includes('屈臣氏') ||
    seller.includes('康是美')
  ) {
    return {
      categoryId: 'shopping',
      categoryName: '日常購物',
      subCategory: '美妝保養',
      tags: ['美妝保養', '個人護理'],
    };
  }

  // 4. 交通運輸 / 加油
  if (
    name.includes('95') ||
    name.includes('98') ||
    name.includes('92') ||
    name.includes('汽油') ||
    name.includes('柴油') ||
    name.includes('加油') ||
    name.includes('停車') ||
    name.includes('高鐵') ||
    name.includes('捷運') ||
    seller.includes('中油') ||
    seller.includes('加油站')
  ) {
    return {
      categoryId: 'transport',
      categoryName: '交通運輸',
      subCategory: '加油交通',
      tags: ['加油', '交通'],
    };
  }

  // 5. 醫療保健
  if (
    name.includes('藥') ||
    name.includes('維他命') ||
    name.includes('保健') ||
    name.includes('口罩') ||
    name.includes('酒精') ||
    name.includes('葉黃素')
  ) {
    return {
      categoryId: 'health',
      categoryName: '醫療保健',
      subCategory: '藥品保健',
      tags: ['健康保健'],
    };
  }

  // 預設分類
  return {
    categoryId: 'food',
    categoryName: '餐飲飲食',
    subCategory: '一般消費',
    tags: ['日常消費'],
  };
}

/**
 * 自動為發票中的每筆購物清單進行 AI 分類，並計算類別統計
 */
export function autoCategorizeInvoice(invoice: TaiwanInvoice): TaiwanInvoice {
  if (!invoice.items || invoice.items.length === 0) {
    return invoice;
  }

  const enrichedItems = invoice.items.map((it) => {
    const classification = classifyInvoiceItemCategory(it.name, invoice.sellerName);
    return {
      ...it,
      categoryId: it.categoryId || classification.categoryId,
      categoryName: it.categoryName || classification.categoryName,
      subCategory: it.subCategory || classification.subCategory,
      tags: it.tags && it.tags.length > 0 ? it.tags : classification.tags,
    };
  });

  return {
    ...invoice,
    items: enrichedItems,
  };
}

/**
 * 將民國年字串 (如 1130325) 轉換為 ISO 日期字串 (如 2024-03-25)
 */
export function rocDateToIsoDate(rocDate: string): string {
  if (!rocDate || rocDate.length < 7) {
    return new Date().toISOString().split('T')[0];
  }
  const rocYear = parseInt(rocDate.substring(0, 3), 10);
  const month = rocDate.substring(3, 5);
  const day = rocDate.substring(5, 7);
  const ceYear = rocYear + 1911;
  return `${ceYear}-${month}-${day}`;
}

/**
 * 將 16 進位金額字串轉換為 10 進位數字
 */
export function hexAmountToDecimal(hexStr: string): number {
  if (!hexStr) return 0;
  const cleanHex = hexStr.trim();
  const num = parseInt(cleanHex, 16);
  return isNaN(num) ? 0 : num;
}

/**
 * 驗證手機條碼載具格式是否合規 (例如 /AB1234+ 或 /1234567)
 */
export function isValidCarrierCode(code: string): boolean {
  if (!code) return false;
  const regex = /^\/[0-9A-Z.+/-]{7}$/;
  return regex.test(code.trim().toUpperCase());
}

/**
 * 解析台灣電子發票單一或雙 QR Code
 */
export function parseTaiwanInvoiceQrCode(qrText1: string, qrText2?: string): TaiwanInvoice | null {
  if (!qrText1 || qrText1.length < 77) {
    return null;
  }

  try {
    const raw = qrText1;
    const invoiceNumber = raw.substring(0, 10).toUpperCase();
    const rocDate = raw.substring(10, 17);
    const randomCode = raw.substring(17, 21);
    const salesAmountHex = raw.substring(21, 29);
    const totalAmountHex = raw.substring(29, 37);
    const buyerGUI = raw.substring(37, 45);
    const sellerGUI = raw.substring(45, 53);
    const encryptCode = raw.substring(53, 77);

    const invoiceNumberRegex = /^[A-Z]{2}[0-9]{8}$/;
    if (!invoiceNumberRegex.test(invoiceNumber)) {
      return null;
    }

    const salesAmount = hexAmountToDecimal(salesAmountHex);
    const totalAmount = hexAmountToDecimal(totalAmountHex);
    const date = rocDateToIsoDate(rocDate);

    // 解析商品品項
    const items: TaiwanInvoiceItem[] = [];
    const itemString = (raw.length > 77 ? raw.substring(77) : '') + (qrText2 ? qrText2 : '');

    if (itemString) {
      parseInvoiceItems(itemString, items);
    }

    // 取得賣方商家資訊
    const knownSeller = KNOWN_SELLER_GUIS[sellerGUI];
    const sellerName = knownSeller ? knownSeller.name : `統一編號 ${sellerGUI}`;

    const baseInvoice: TaiwanInvoice = {
      id: `inv_${invoiceNumber}_${Date.now()}`,
      invoiceNumber: `${invoiceNumber.substring(0, 2)}-${invoiceNumber.substring(2)}`,
      date,
      rocDate,
      randomCode,
      salesAmount,
      totalAmount,
      buyerGUI,
      sellerGUI,
      sellerName,
      encryptCode,
      items,
      isScanned: true,
      scanTime: Date.now(),
    };

    // 自動進行 AI 單品分類
    return autoCategorizeInvoice(baseInvoice);
  } catch (err) {
    console.error('Failed to parse Taiwan Invoice QR code:', err);
    return null;
  }
}

/**
 * 解析商品明細字串 (支援 :品名:數量:單價... 或 ** 格式)
 */
function parseInvoiceItems(itemStr: string, itemsList: TaiwanInvoiceItem[]) {
  let clean = itemStr.replace(/^[:*]+/, '');
  const parts = clean.split(':').filter((p) => p.trim() !== '');

  for (let i = 0; i < parts.length; i += 3) {
    if (i + 2 < parts.length) {
      const name = parts[i].trim();
      const qty = parseFloat(parts[i + 1]) || 1;
      const price = parseFloat(parts[i + 2]) || 0;
      if (name && !name.startsWith('**')) {
        itemsList.push({
          name,
          quantity: qty,
          unitPrice: price,
          amount: qty * price,
        });
      }
    }
  }
}

/**
 * 產生標準測試用電子發票 QR Code 字串
 */
export function generateMockInvoiceQrCode(
  invNum = 'AB12345678',
  rocDate = '1130815',
  amount = 450,
  sellerGui = '22555003',
  items = [
    { name: '7-11 御飯糰 (鮪魚)', qty: 2, price: 35 },
    { name: '特選拿鐵大杯', qty: 2, price: 55 },
    { name: '舒潔抽取式衛生紙', qty: 1, price: 270 },
  ]
): { qr1: string; qr2: string } {
  const hexAmount = amount.toString(16).padStart(8, '0');
  const randomCode = '8888';
  const buyerGui = '00000000';
  const encrypt = 'ABCDEF1234567890ABCDEF12';

  let itemPart = ':**';
  items.forEach((it) => {
    itemPart += `:${it.name}:${it.qty}:${it.price}`;
  });

  const qr1 = `${invNum}${rocDate}${randomCode}${hexAmount}${hexAmount}${buyerGui}${sellerGui}${encrypt}${itemPart}`;
  const qr2 = `**${invNum}:續商品明細`;

  return { qr1, qr2 };
}
