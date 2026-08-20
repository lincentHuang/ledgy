import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './defaultCategories';
import { Transaction } from './types/expense';

export interface ParsedExpenseAIResult {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  categoryName: string;
  subCategory?: string;
  paymentMethod: string;
  tags: string[];
  merchant?: string;
  note?: string;
  date?: string; // YYYY-MM-DD
  ledgerType?: 'personal' | 'household';
  confidence: number;
  engineType?: 'local_zero_token' | 'gemini_cloud';
  items?: {
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
}

/**
 * 建立超低 Token 消耗的 Micro-Prompt (節省 90% 以上 Token 成本，回應 <200ms)
 */
export function buildNaturalLanguageExpensePrompt(customFewShot = '', availableTags?: string[]): string {
  const tagsConstraint = availableTags && availableTags.length > 0
    ? `\n【重要標籤限制】tags 陣列中只能選擇包含在以下清單的「單一標籤」(長度嚴格為1)：[${availableTags.join(', ')}]。若無合適標籤，tags 必須填寫 ["未歸類"]，嚴禁填寫複數標籤或自創標籤。`
    : '\n每筆記帳嚴格僅限單一標籤，若無法確定標籤，tags 請填寫 ["未歸類"]。';

  return `你是台灣極速記帳助理。分析輸入並僅輸出單行JSON物件：
{"title":str,"amount":num,"type":"expense"|"income","categoryId":str,"categoryName":str,"subCategory":str,"paymentMethod":str,"tags":["單一標籤"],"merchant":str}
【數字與品名辨識關鍵規則】
1. 月份（如「11月」、「8月份」）、日期（「15號」）、年份（「113年」）、數量單位（「3杯」、「2個」、「5包」）、品牌名稱（「50嵐」、「7-11」）皆為品名/標題的一部分，絕對不是消費金額！title 必須完整保留這些詞彙（如「11月的房貸」、「3杯50嵐珍奶」）。
2. 若語音未提到具體消費金額（如「11月的房貸」），amount 請填寫 0。
3. 每筆記帳僅能有「單一標籤」，tags 長度必須為 1。
4. 可用categoryId代碼: food(餐飲), transport(交通), housing(居家), shopping(購物), entertainment(娛樂), medical(醫療), education(學習), family(家庭), other_expense(其他), income_salary(薪資收入)${tagsConstraint}
${customFewShot ? `偏好: ${customFewShot}` : ''}`;
}

/**
 * 將中文數字（如：五十、兩百、兩百五十、一千兩百、三千五、五百元、兩萬五、十萬）轉為阿拉伯數字
 */
export function parseChineseNumber(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[,，\s]/g, '');
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(clean)) return parseFloat(clean);

  const charMap: Record<string, number> = {
    '零': 0, '〇': 0, '0': 0,
    '一': 1, '壹': 1, '1': 1,
    '二': 2, '兩': 2, '两': 2, '貳': 2, '2': 2,
    '三': 3, '參': 3, '叁': 3, '3': 3,
    '四': 4, '肆': 4, '4': 4,
    '五': 5, '伍': 5, '5': 5,
    '六': 6, '陸': 6, '陆': 6, '6': 6,
    '七': 7, '柒': 7, '7': 7,
    '八': 8, '捌': 8, '8': 8,
    '九': 9, '玖': 9, '9': 9,
  };

  let total = 0;
  let section = 0;
  let currentNum = 0;
  let hasNumber = false;
  let lastUnit = 0;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (charMap[char] !== undefined) {
      currentNum = charMap[char];
      hasNumber = true;
      if (i === clean.length - 1) {
        if (clean.length > 1 && lastUnit > 1) {
          section += currentNum * (lastUnit / 10);
          currentNum = 0;
        }
      }
    } else {
      let unit = 1;
      if (char === '十' || char === '拾') unit = 10;
      else if (char === '百' || char === '佰') unit = 100;
      else if (char === '千' || char === '仟') unit = 1000;
      else if (char === '萬' || char === '万') unit = 10000;
      else continue;

      lastUnit = unit;

      if (unit === 10000) {
        section = (section + currentNum) * unit;
        total += section;
        section = 0;
      } else {
        if (currentNum === 0 && !hasNumber && unit === 10) currentNum = 1;
        section += currentNum * unit;
      }
      currentNum = 0;
      hasNumber = false;
    }
  }

  section += currentNum;
  total += section;
  return total;
}

/**
 * 0 Token 零延遲 本地智慧語意與關鍵字分類引擎 (Local 0-Token Semantic Engine)
 * 精準區分「真正金額」與「月份、日期、年份、數量詞單位、品牌型號」，絕不吃掉品名中的月份與數字。
 * 依照使用者「現有的標籤庫 (existingTags)」進行歸類；若無匹配標籤則預設為「未歸類」。
 */
export function fallbackLocalRuleParser(text: string, existingTags?: string[]): ParsedExpenseAIResult {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  let amount = 0;
  let matchedAmountText = '';
  let paymentMethod = '現金';
  let categoryId = 'other_expense';
  let categoryName = '其他支出';
  let subCategory = '日常支出';
  const rawCandidateTags: string[] = [];
  let ledgerType: 'personal' | 'household' = 'personal';
  let merchant: string | undefined = undefined;
  let type: 'expense' | 'income' = 'expense';

  // ================= 1. 非金額數字保護 (Token Protection) =================
  // 建立純英文字母 safe token (不含任何阿拉伯數字或中文字)，防止金額正則誤抓
  let tokenCounter = 0;
  const protectedTokens: { token: string; original: string }[] = [];

  const getNextToken = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const a = letters[Math.floor(tokenCounter / 26) % 26];
    const b = letters[tokenCounter % 26];
    tokenCounter++;
    return `TOKENXYZ${a}${b}ABC`;
  };

  const protectPattern = (str: string, regex: RegExp): string => {
    return str.replace(regex, (match) => {
      const token = getNextToken();
      protectedTokens.push({ token, original: match });
      return token;
    });
  };

  let workingText = raw;

  // 1.1 保護在地品牌與產品型號 (50嵐, 7-11, 85度C, 95無鉛, iPhone 15, PS5, 4K等)
  workingText = protectPattern(workingText, /50嵐|五十嵐|85度c|85度C|85度|7-11|7-eleven|711/gi);
  workingText = protectPattern(workingText, /9[258]無鉛(?:汽油)?|9[258]汽油/gi);
  workingText = protectPattern(workingText, /(?:iphone|pixel|galaxy|ipad|macbook|ps|switch)\s*[0-9]+[a-z]*/gi);
  workingText = protectPattern(workingText, /[0-9]+[kK]/g);
  workingText = protectPattern(workingText, /3[cC]/g);
  workingText = protectPattern(workingText, /台北\s*101/g);

  // 1.2 保護年份、月份、日期 (如: 11月的房貸, 8月份水電費, 10月5號, 113年, 2024年, 第一季)
  workingText = protectPattern(workingText, /(?:[0-9]{1,4}|[一二兩三四五六七八九十百千]{1,4})\s*(?:年份|年度|年)/g);
  workingText = protectPattern(workingText, /(?:[0-9]{1,2}|[一二兩三四五六七八九十]{1,3})\s*(?:月份|月)/g);
  workingText = protectPattern(workingText, /(?:[0-9]{1,2}|[一二兩三四五六七八九十]{1,3})\s*(?:號|日|期|季)/g);

  // 1.3 保護數量詞與單位 (如: 3杯, 2個, 5包, 2碗, 1盒, 2罐, 3瓶, 1顆, 2雙, 1箱, 2片, 1條, 1張, 100g, 500ml, 3樓等)
  workingText = protectPattern(
    workingText,
    /(?:[0-9]+|[一二兩三四五六七八九十百千]+)\s*(?:杯|個|份|碗|包|盒|罐|瓶|顆|隻|支|條|張|本|雙|箱|袋|片|斤|公斤|台斤|棟|間|把|組|套|付|趟|節|堂|次|台|門|部|粒|卷|串|打|吋|寸|度|樓|[fF]|室|[gG]|[mM][lL]|[cC][cC])/g
  );

  // ================= 2. 精準提取真正的金額 =================
  // A. 阿拉伯數字金額 (50元, 200塊, NT$280, 花了 1500, 一共300, 25000等)
  const arabicMatch = workingText.match(
    /(?:花了|共|金額|費用|總共|一共|付了|收了|賺了|是|為)?\s*(?:NT\$?|\$|新台幣)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:元整|元|塊錢|塊|TWD)?/i
  );

  if (arabicMatch && arabicMatch[1]) {
    const num = parseFloat(arabicMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      amount = num;
      matchedAmountText = arabicMatch[0].trim();
    }
  }

  // B. 中文數字金額 (如: 兩萬五、三百元、一千二、五千塊)
  if (amount === 0) {
    const chineseMatch = workingText.match(
      /(?:花了|共|金額|費用|總共|一共|付了|收了|賺了|是|為)?\s*(?:NT\$?|\$|新台幣)?\s*([零一壹二兩两貳三參叁四肆五伍六陸陆七柒八捌九玖十拾百佰千仟萬万]+)\s*(?:元整|元|塊錢|塊|TWD)?/i
    );
    if (chineseMatch && chineseMatch[1]) {
      const num = parseChineseNumber(chineseMatch[1]);
      if (num > 0) {
        amount = num;
        matchedAmountText = chineseMatch[0].trim();
      }
    }
  }

  // ================= 3. 偵測付款方式 =================
  if (/街口/i.test(lower)) paymentMethod = '街口支付';
  else if (/line\s*pay/i.test(lower)) paymentMethod = 'LINE Pay';
  else if (/全支付|px\s*pay/i.test(lower)) paymentMethod = '全支付/PX Pay';
  else if (/悠遊卡|一卡通|icash/i.test(lower)) paymentMethod = '悠遊卡/一卡通';
  else if (/apple\s*pay/i.test(lower)) paymentMethod = 'Apple Pay';
  else if (/google\s*pay/i.test(lower)) paymentMethod = 'Google Pay';
  else if (/信用卡|刷卡|簽帳卡|台新|國泰|玉山|富邦|中信|聯邦|永豐|星展/i.test(lower)) paymentMethod = '信用卡 (一般)';
  else if (/轉帳|匯款|網銀/i.test(lower)) paymentMethod = '銀行轉帳';
  else if (/現金|零錢/i.test(lower)) paymentMethod = '現金';

  // ================= 4. 偵測公帳 / 私帳意圖 =================
  if (/家庭|公用|公費|公帳|家裡|大家|我們/i.test(lower)) {
    ledgerType = 'household';
  }

  // ================= 5. 台灣在地商家比對與品牌庫 =================
  if (/麥當勞/i.test(lower)) { merchant = '麥當勞'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '午餐'; rawCandidateTags.push('餐飲·午餐', '午餐', '外食'); }
  else if (/肯德基|kfc/i.test(lower)) { merchant = '肯德基'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '午餐'; rawCandidateTags.push('餐飲·午餐', '午餐', '外食'); }
  else if (/摩斯/i.test(lower)) { merchant = '摩斯漢堡'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '午餐'; rawCandidateTags.push('餐飲·午餐', '午餐', '外食'); }
  else if (/漢堡王/i.test(lower)) { merchant = '漢堡王'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '午餐'; rawCandidateTags.push('餐飲·午餐', '午餐', '外食'); }
  else if (/星巴克|starbucks/i.test(lower)) { merchant = '星巴克'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '咖啡外帶'; rawCandidateTags.push('餐飲·飲料咖啡', '咖啡', '下午茶'); }
  else if (/路易莎|louisa/i.test(lower)) { merchant = '路易莎咖啡'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '咖啡外帶'; rawCandidateTags.push('餐飲·飲料咖啡', '咖啡'); }
  else if (/cama/i.test(lower)) { merchant = 'cama café'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '咖啡外帶'; rawCandidateTags.push('餐飲·飲料咖啡', '咖啡'); }
  else if (/50嵐|五十嵐/i.test(lower)) { merchant = '50嵐'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲', '下午茶'); }
  else if (/麻古/i.test(lower)) { merchant = '麻古茶坊'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/清心/i.test(lower)) { merchant = '清心福全'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/可不可/i.test(lower)) { merchant = '可不可熟成紅茶'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/迷客夏/i.test(lower)) { merchant = '迷客夏'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/得正/i.test(lower)) { merchant = '得正'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/五桐號/i.test(lower)) { merchant = '五桐號'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/龜記/i.test(lower)) { merchant = '龜記茗品'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/萬波/i.test(lower)) { merchant = '萬波島嶼紅茶'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '飲料點心'; rawCandidateTags.push('餐飲·飲料咖啡', '手搖飲'); }
  else if (/全聯/i.test(lower)) { merchant = '全聯福利中心'; categoryId = 'housing'; categoryName = '居家生活'; subCategory = '日用品消耗'; rawCandidateTags.push('居家·日用品', '生鮮食材', '日用品採購', '共同採買'); }
  else if (/家樂福/i.test(lower)) { merchant = '家樂福'; categoryId = 'housing'; categoryName = '居家生活'; subCategory = '日用品消耗'; rawCandidateTags.push('居家·日用品', '日用品採購', '共同採買'); }
  else if (/costco|好市多/i.test(lower)) { merchant = '好市多 Costco'; categoryId = 'housing'; categoryName = '居家生活'; subCategory = '日用品消耗'; rawCandidateTags.push('居家·日用品', '日用品採購', '共同採買'); }
  else if (/大潤發|愛買/i.test(lower)) { merchant = '大潤發/愛買'; categoryId = 'housing'; categoryName = '居家生活'; subCategory = '日用品消耗'; rawCandidateTags.push('居家·日用品', '日用品採購'); }
  else if (/寶雅|poya/i.test(lower)) { merchant = '寶雅 POYA'; categoryId = 'shopping'; categoryName = '購物血拼'; subCategory = '生活美妝'; rawCandidateTags.push('購物·美妝保養', '美妝保養'); }
  else if (/屈臣氏|康是美/i.test(lower)) { merchant = '屈臣氏/康是美'; categoryId = 'medical'; categoryName = '醫療保健'; subCategory = '藥品保健'; rawCandidateTags.push('醫療健康·藥品保健', '購物·美妝保養'); }
  else if (/7-11|7-eleven|小七/i.test(lower)) { merchant = '7-ELEVEN'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '便利商店'; rawCandidateTags.push('餐飲·午餐', '便利商店'); }
  else if (/全家/i.test(lower)) { merchant = '全家便利商店'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '便利商店'; rawCandidateTags.push('餐飲·午餐', '便利商店'); }
  else if (/uber\s*eats/i.test(lower)) { merchant = 'Uber Eats'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '外送平台'; rawCandidateTags.push('餐飲·午餐', '餐飲·晚餐'); }
  else if (/foodpanda|熊貓/i.test(lower)) { merchant = 'Foodpanda'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '外送平台'; rawCandidateTags.push('餐飲·午餐', '餐飲·晚餐'); }
  else if (/八方雲集|四海遊龍/i.test(lower)) { merchant = '八方雲集'; categoryId = 'food'; categoryName = '餐飲飲食'; subCategory = '午餐'; rawCandidateTags.push('餐飲·午餐'); }
  else if (/蝦皮|shopee/i.test(lower)) { merchant = '蝦皮購物'; categoryId = 'shopping'; categoryName = '購物血拼'; subCategory = '網購平台'; rawCandidateTags.push('購物·服飾鞋包', '購物·美妝保養'); }
  else if (/momo|pchome|酷澎|coupang/i.test(lower)) { merchant = '電商網購'; categoryId = 'shopping'; categoryName = '購物血拼'; subCategory = '網購平台'; rawCandidateTags.push('購物·服飾鞋包', '居家·日用品'); }
  else if (/uniqlo|gu|zara|h&m|net/i.test(lower)) { categoryId = 'shopping'; categoryName = '購物血拼'; subCategory = '服飾鞋包'; rawCandidateTags.push('購物·服飾鞋包'); }
  else if (/中油|台塑|加油站/i.test(lower)) { merchant = '加油站'; categoryId = 'transport'; categoryName = '交通運輸'; subCategory = '加油費'; rawCandidateTags.push('交通·加油'); }
  else if (/高鐵/i.test(lower)) { merchant = '台灣高鐵'; categoryId = 'transport'; categoryName = '交通運輸'; subCategory = '高鐵台鐵'; rawCandidateTags.push('交通·捷運公車', '旅遊交通'); }
  else if (/台鐵|火車/i.test(lower)) { merchant = '台灣鐵路'; categoryId = 'transport'; categoryName = '交通運輸'; subCategory = '高鐵台鐵'; rawCandidateTags.push('交通·捷運公車', '旅遊交通'); }
  else if (/捷運|mrt/i.test(lower)) { categoryId = 'transport'; categoryName = '交通運輸'; subCategory = '捷運公車'; rawCandidateTags.push('交通·捷運公車'); }

  // ================= 6. 精準分類與候選語意識別 =================
  if (!merchant) {
    // 🏠 居住、房屋貸款、房貸、信貸、車貸、房租、水電、瓦斯、電信
    if (/房貸|房屋貸款|車貸|信貸|學貸|貸款|房租|租金|管理費|公設費|大樓公費/i.test(lower)) {
      categoryId = 'housing';
      categoryName = '居家生活';
      subCategory = /貸/.test(lower) ? '房屋貸款' : '房租/房貸';
      rawCandidateTags.push('固定支出', '居家·水電瓦斯', '房租水電');
    } else if (/水費|電費|瓦斯|天然氣|欣欣|大台北瓦斯/i.test(lower)) {
      categoryId = 'housing';
      categoryName = '居家生活';
      subCategory = '水電瓦斯';
      rawCandidateTags.push('居家·水電瓦斯', '房租水電', '固定支出');
    } else if (/中華電信|遠傳|台灣大哥大|光世代|網路費|寬頻|手機費|電信費|電話費/i.test(lower)) {
      categoryId = 'housing';
      categoryName = '居家生活';
      subCategory = '網路寬頻';
      rawCandidateTags.push('居家·水電瓦斯', '固定支出');
    } else if (/衛生紙|洗髮精|沐浴乳|洗衣精|洗碗精|牙膏|牙刷|垃圾袋|抹布|電池|燈泡|日用品/i.test(lower)) {
      categoryId = 'housing';
      categoryName = '居家生活';
      subCategory = '日用品消耗';
      rawCandidateTags.push('居家·日用品', '日用品採購');
    }
    // 💰 收入類
    else if (/薪水|薪資|月薪|發薪|獎金|年終|兼職|接案|外快|發票中獎|中獎|股利|股息|利息/i.test(lower)) {
      type = 'income';
      categoryId = 'income_salary';
      categoryName = '薪資收入';
      subCategory = /獎金|年終/.test(lower) ? '年終獎金' : (/發票|中獎/.test(lower) ? '發票中獎' : '正職月薪');
      rawCandidateTags.push('固定支出');
    }
    // 🚗 交通類
    else if (/加油|95|98|92|油錢|柴油/i.test(lower)) {
      categoryId = 'transport';
      categoryName = '交通運輸';
      subCategory = '加油費';
      rawCandidateTags.push('交通·加油');
    } else if (/計程車|小黃|uber|yoxi|叫車/i.test(lower)) {
      categoryId = 'transport';
      categoryName = '交通運輸';
      subCategory = '計程車/Uber';
      rawCandidateTags.push('交通·計程車');
    } else if (/公車|捷運|高鐵|台鐵|火車|悠遊卡加值|一卡通加值|mrt/i.test(lower)) {
      categoryId = 'transport';
      categoryName = '交通運輸';
      subCategory = '捷運公車';
      rawCandidateTags.push('交通·捷運公車', '旅遊交通');
    } else if (/停車|停車費|停車場/i.test(lower)) {
      categoryId = 'transport';
      categoryName = '交通運輸';
      subCategory = '停車費';
      rawCandidateTags.push('交通·加油');
    } else if (/機車|汽車|換機油|輪胎|保養|維修/i.test(lower)) {
      categoryId = 'transport';
      categoryName = '交通運輸';
      subCategory = '機車維修';
      rawCandidateTags.push('交通·加油');
    }
    // 💊 醫療保健
    else if (/看病|診所|掛號|感冒|健保|牙醫|洗牙|眼科|藥局|止痛藥|維他命|普拿疼|看醫生|復健|中醫/i.test(lower)) {
      categoryId = 'medical';
      categoryName = '醫療保健';
      subCategory = '門診掛號';
      rawCandidateTags.push('醫療健康·藥品保健');
    }
    // 🛍️ 購物血拼
    else if (/衣服|外套|褲子|鞋子|包包|飾品|美妝|面膜|保養品/i.test(lower)) {
      categoryId = 'shopping';
      categoryName = '購物血拼';
      subCategory = /美妝|面膜|保養品/.test(lower) ? '生活美妝' : '服飾鞋包';
      rawCandidateTags.push(/美妝|面膜|保養品/.test(lower) ? '購物·美妝保養' : '購物·服飾鞋包');
    } else if (/充電線|耳機|滑鼠|鍵盤|手機|ipad|3c|電腦/i.test(lower)) {
      categoryId = 'shopping';
      categoryName = '購物血拼';
      subCategory = '3C電子';
      rawCandidateTags.push('購物·服飾鞋包');
    } else if (/貓砂|貓罐頭|狗飼料|寵物|貓咪|狗狗/i.test(lower)) {
      categoryId = 'shopping';
      categoryName = '購物血拼';
      subCategory = '寵物用品';
      rawCandidateTags.push('居家·日用品');
    }
    // 🎮 休閒娛樂
    else if (/電影|威秀|國賓|演唱會|展覽|門票|露營|飯店|住宿|旅遊|健身|運動|羽球|netflix|spotify|disney\+|steam|switch|遊戲|課金/i.test(lower)) {
      categoryId = 'entertainment';
      categoryName = '休閒娛樂';
      subCategory = '電影展覽';
      rawCandidateTags.push('休閒娛樂·電影展覽');
    }
    // 📚 學習進修
    else if (/買書|書籍|線上課程|學費|補習|多益|考試/i.test(lower)) {
      categoryId = 'education';
      categoryName = '學習進修';
      subCategory = '線上課程';
      rawCandidateTags.push('個人專用');
    }
    // 🥗 生鮮食材
    else if (/買菜|青菜|蔬菜|豬肉|牛肉|雞肉|水果|生鮮|魚肉|豆腐|雞蛋|鮮奶/i.test(lower)) {
      categoryId = 'food';
      categoryName = '餐飲飲食';
      subCategory = '生鮮食材';
      rawCandidateTags.push('生鮮食材', '共同採買');
    }
    // 🍳 早餐
    else if (/早餐|蛋餅|蘿蔔糕|飯糰|漢堡|吐司|豆漿|三明治|大冰奶|早點|早午餐/i.test(lower)) {
      categoryId = 'food';
      categoryName = '餐飲飲食';
      subCategory = '早餐';
      rawCandidateTags.push('餐飲·早餐');
    }
    // ☕ 咖啡 & 飲料
    else if (/咖啡|拿鐵|美式|摩卡|卡布奇諾|黑咖啡/i.test(lower)) {
      categoryId = 'food';
      categoryName = '餐飲飲食';
      subCategory = '咖啡外帶';
      rawCandidateTags.push('餐飲·飲料咖啡');
    } else if (/手搖|飲料|奶茶|珍奶|珍珠奶茶|綠茶|紅茶|烏龍|四季春|鮮奶茶|水果茶|冬瓜茶|豆花|冰|甜點|蛋糕|下午茶/i.test(lower)) {
      categoryId = 'food';
      categoryName = '餐飲飲食';
      subCategory = '飲料點心';
      rawCandidateTags.push('餐飲·飲料咖啡', '餐飲·下午茶');
    }
    // 🍜 午餐 / 晚餐 / 正餐
    else if (/拉麵|牛肉麵|便當|排骨飯|雞腿飯|滷肉飯|炒飯|炒麵|義大利麵|披薩|牛排|鐵板燒|水餃|鍋貼|火鍋|壽司|生魚片|熱炒|居酒屋|串燒|鹽酥雞|炸雞|宵夜|晚餐|午餐|吃/i.test(lower)) {
      categoryId = 'food';
      categoryName = '餐飲飲食';
      subCategory = /午餐|中午/.test(lower) ? '午餐' : (/宵夜|晚上|晚餐/.test(lower) ? '晚餐' : '午餐');
      rawCandidateTags.push(/宵夜|晚上|晚餐/.test(lower) ? '餐飲·晚餐' : '餐飲·午餐', '聚餐分攤');
    }
  }

  // ================= 7. 清理並完整保留品項名稱 (不誤刪月份、數量、品牌數字) =================
  let cleanTitle = raw;

  // 僅移除辨識出的金額片段
  if (matchedAmountText) {
    cleanTitle = cleanTitle.replace(matchedAmountText, '');
  }

  // 移除支付方式與公私帳口語詞
  cleanTitle = cleanTitle
    .replace(/街口支付|line\s*pay|全支付|px\s*pay|悠遊卡|一卡通|apple\s*pay|google\s*pay|信用卡|刷卡|現金|銀行轉帳|轉帳|匯款/gi, '')
    .replace(/算公帳|算私帳|家庭公帳|公帳|私帳|家庭|公用|個人/gi, '')
    .replace(/^(?:花了|一共|總共|付了|收了|買了|去|幫|幫忙)\s*/, '')
    .replace(/^[，。、？！\s,.\-—]+|[，。、？！\s,.\-—]+$/g, '')
    .trim();

  if (!cleanTitle) {
    if (merchant) {
      cleanTitle = `${merchant} 消費`;
    } else if (subCategory && subCategory !== '日常支出') {
      cleanTitle = subCategory;
    } else {
      cleanTitle = categoryName;
    }
  }

  // ================= 8. 嚴格對齊「當前現有標籤庫 (existingTags)」；無匹配則預設「未歸類」 =================
  let finalTags: string[] = [];

  if (existingTags && existingTags.length > 0) {
    for (const rawTag of rawCandidateTags) {
      // 1. 完全比對
      if (existingTags.includes(rawTag)) {
        finalTags.push(rawTag);
        continue;
      }
      // 2. 語意部分匹配 (如 '午餐' -> '餐飲·午餐', '水電瓦斯' -> '居家·水電瓦斯' 或 '房租水電')
      const matchedExisting = existingTags.find(
        (et) => et.includes(rawTag) || rawTag.includes(et)
      );
      if (matchedExisting) {
        finalTags.push(matchedExisting);
      }
    }

    // 若根據主分類尋找對應現有標籤
    if (finalTags.length === 0) {
      if (categoryId === 'food') {
        const foodTag = existingTags.find((t) => t.includes('餐飲') || t.includes('生鮮') || t.includes('聚餐'));
        if (foodTag) finalTags.push(foodTag);
      } else if (categoryId === 'housing') {
        const houseTag = existingTags.find((t) => t.includes('居家') || t.includes('水電') || t.includes('房租') || t.includes('固定支出'));
        if (houseTag) finalTags.push(houseTag);
      } else if (categoryId === 'transport') {
        const transTag = existingTags.find((t) => t.includes('交通') || t.includes('加油') || t.includes('旅遊'));
        if (transTag) finalTags.push(transTag);
      } else if (categoryId === 'shopping') {
        const shopTag = existingTags.find((t) => t.includes('購物') || t.includes('採買'));
        if (shopTag) finalTags.push(shopTag);
      } else if (categoryId === 'medical') {
        const medTag = existingTags.find((t) => t.includes('醫療'));
        if (medTag) finalTags.push(medTag);
      } else if (categoryId === 'entertainment') {
        const entTag = existingTags.find((t) => t.includes('娛樂') || t.includes('展覽') || t.includes('住宿'));
        if (entTag) finalTags.push(entTag);
      }
    }

    // 嚴格過濾只保留現有標籤清單中的項目，且每筆記帳嚴格僅限單一標籤
    finalTags = Array.from(new Set(finalTags)).filter((t) => existingTags.includes(t));

    // 若無任何匹配現有標籤，嚴格設定為「未歸類」；若有多個僅取最精準的第一個
    if (finalTags.length === 0) {
      finalTags = ['未歸類'];
    } else {
      finalTags = [finalTags[0]];
    }
  } else {
    finalTags = rawCandidateTags.length > 0 ? [rawCandidateTags[0]] : ['未歸類'];
  }

  return {
    title: cleanTitle,
    amount: amount > 0 ? amount : 0,
    type,
    categoryId,
    categoryName,
    subCategory,
    paymentMethod,
    tags: finalTags,
    ledgerType,
    merchant,
    confidence: cleanTitle ? 0.95 : 0.85,
    engineType: 'local_zero_token',
  };
}

/**
 * 建立發票 / 收據 Vision OCR 提示詞
 */
export function buildReceiptOcrPrompt(): string {
  return `請辨識這張圖片（電子發票證明聯、紙本收據明細、大賣場銷貨明細表、外送訂單截圖、刷卡明細單）。
請仔細提取：
1. 商家名稱 (merchant)
2. 消費日期 (date, 格式 YYYY-MM-DD，若為民國年如113年請轉為西元年2024)
3. 總金額 (totalAmount, 數字)
4. 發票號碼 (invoiceNumber, 格式如 AB-12345678, 若無則為 null)
5. 商品購物清單明細 (items)，每筆商品品項請包含：
   - 品名 (name)
   - 數量 (quantity)
   - 單價 (unitPrice)
   - 小計金額 (amount)
   - AI 單品分類代碼 (categoryId, 例如 food, housing, shopping, transport, entertainment, medical, education, finance)
   - AI 單品分類名稱 (categoryName, 例如 餐飲飲食、居家生活、日常購物、交通運輸、休閒娛樂)
   - AI 單品子分類 (subCategory, 例如 生鮮食材、日用品消耗、飲料飲品、外食等)
6. 整體主分類 (categoryId 與 categoryName)
7. 付款方式 (paymentMethod)

請嚴格僅回傳合法的 JSON：
{
  "merchant": "全聯實業股份有限公司",
  "date": "2024-08-16",
  "totalAmount": 540,
  "invoiceNumber": "AB-12345678",
  "paymentMethod": "全支付/PX Pay",
  "categoryId": "housing",
  "categoryName": "居家生活",
  "items": [
    { "name": "冷藏牛五花肉片", "quantity": 1, "unitPrice": 180, "amount": 180, "categoryId": "food", "categoryName": "餐飲飲食", "subCategory": "生鮮食材" },
    { "name": "舒潔抽取式衛生紙", "quantity": 1, "unitPrice": 270, "amount": 270, "categoryId": "housing", "categoryName": "居家生活", "subCategory": "日用品消耗" },
    { "name": "原萃無糖綠茶", "quantity": 2, "unitPrice": 45, "amount": 90, "categoryId": "food", "categoryName": "餐飲飲食", "subCategory": "飲料飲品" }
  ],
  "tags": ["超市採買", "生鮮日用品"]
}`;
}

/**
 * 建立智慧財務問答助理的 Context Prompt
 */
export function buildFinancialAssistantPrompt(
  transactions: Transaction[],
  userPrompt: string,
  householdName?: string
): string {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const thisMonthTx = transactions.filter(t => t.date.startsWith(currentMonth));

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap: Record<string, number> = {};

  thisMonthTx.forEach(t => {
    if (t.type === 'expense') {
      totalExpense += t.amount;
      const cat = t.categoryName || t.categoryId;
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    } else if (t.type === 'income') {
      totalIncome += t.amount;
    }
  });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `- ${cat}: NT$ ${amt.toLocaleString()} (${Math.round((amt / (totalExpense || 1)) * 100)}%)`)
    .join('\n');

  const recentTxList = transactions.slice(0, 15).map(t => 
    `- [${t.date}] ${t.title} (${t.categoryName || t.categoryId}) NT$ ${t.amount} [${t.paymentMethod}] ${t.ledgerType === 'household' ? '【家庭公用】' : ''}`
  ).join('\n');

  return `你是一位溫暖、專業且精通台灣生活與個人財務規劃的「AI 智慧財務理財顧問」。
你有權存取使用者的本地/家庭帳本資料，請根據以下真實財務數據回答使用者的問題，並給予具體、客觀且有溫度的財務洞察與省錢建議。

【當前帳本摘要 (當月 ${currentMonth})】：
- 當月總支出：NT$ ${totalExpense.toLocaleString()}
- 當月總收入：NT$ ${totalIncome.toLocaleString()}
- 當月淨結餘：NT$ ${(totalIncome - totalExpense).toLocaleString()}
${householdName ? `- 所在家庭空間：${householdName}` : ''}

【支出分類排行】：
${topCategories || '無紀錄'}

【最近 15 筆消費明細】：
${recentTxList || '無近期紀錄'}

【使用者提問】：
${userPrompt}

請給出條理分明、親切易懂的回答（可以使用 Markdown 列表與粗體），並在回答中主動提及實際數據與比例！`;
}
