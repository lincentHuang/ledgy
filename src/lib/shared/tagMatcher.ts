import { LearningRule } from './types/user';

/**
 * 台灣在地高頻消費關鍵字庫（依食、衣、住、行、育、樂、醫、寵等領域分類）
 * 關鍵字長度皆 >= 2，避免單字誤觸
 */
export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  food: [
    // 品牌與外食通路
    '麥當勞', '肯德基', 'kfc', '摩斯', '摩斯漢堡', '漢堡王', '頂呱呱', '胖老爹', '拿坡里', '達美樂', '必勝客',
    '星巴克', 'starbucks', '路易莎', 'louisa', 'cama', '85度c', '85度C', '伯朗咖啡',
    '50嵐', '五十嵐', '麻古', '麻古茶坊', '清心', '清心福全', '可不可', '可不可熟成紅茶', '迷客夏', '得正',
    '五桐號', '龜記', '萬波', '珍煮丹', '茶湯會', '大苑子', '再睡5分鐘', '一手私藏', '鶴茶樓',
    '八方雲集', '四海遊龍', '爭鮮', '壽司郎', '藏壽司', '點爭鮮', '鼎泰豐', '瓦城', '王品', '西堤',
    '陶板屋', '石二鍋', '肉多多', '築間', '乾杯', '屋馬', '碳佐麻里', '胡同', '老乾杯', '輕井澤',
    '鬍鬚張', '三商巧福', '梁社漢', '梁社漢排骨', '正忠排骨', '吉野家', 'すき家', 'sukiya',
    '7-11', '7-eleven', '711', '小七', '全家', '全家便利商店', '萊爾富', 'ok超商', '全聯', '家樂福', '好市多', 'costco', '愛買', '大潤發', '美廉社',
    'uber eats', 'ubereats', 'foodpanda', '熊貓外送', '外送平台',
    // 飲食餐點品項
    '大麥克', '麥克雞塊', '薯條', '漢堡', '三明治', '蛋餅', '蘿蔔糕', '飯糰', '燒餅', '油條', '吐司', '厚片', '豆漿', '米漿',
    '早餐', '早點', '早午餐', '午餐', '晚餐', '宵夜', '點心', '下午茶',
    '便當', '排骨飯', '雞腿飯', '滷肉飯', '控肉飯', '炒飯', '燴飯', '丼飯', '咖哩飯', '豬排飯', '牛排', '鐵板燒',
    '牛肉麵', '陽春麵', '乾麵', '炒麵', '炸醬麵', '麻醬麵', '拉麵', '烏龍麵', '蕎麥麵', '義大利麵', '涼麵',
    '水餃', '鍋貼', '蒸餃', '湯包', '小籠包', '餛飩', '扁食', '肉圓', '碗粿', '蚵仔煎', '臭豆腐', '麵線',
    '鹹酥雞', '鹽酥雞', '炸雞', '雞排', '滷味', '烤肉', '燒肉', '串燒', '居酒屋', '熱炒',
    '火鍋', '麻辣鍋', '涮涮鍋', '壽喜燒', '生魚片', '壽司', '握壽司', '手捲', '披薩',
    '珍珠奶茶', '珍奶', '奶茶', '鮮奶茶', '紅茶', '綠茶', '烏龍茶', '青茶', '四季春', '水果茶', '冬瓜茶', '多多綠',
    '咖啡', '拿鐵', '美式', '美式咖啡', '摩卡', '卡布奇諾', '焦糖瑪奇朵', '濃縮咖啡', '冰美式',
    '蛋糕', '甜點', '泡芙', '鬆餅', '紅豆餅', '車輪餅', '豆花', '剉冰', '刨冰', '雪花冰', '冰淇淋', '霜淇淋',
    '麵包', '烘焙', '貝果', '可頌', '零食', '餅乾', '洋芋片', '巧克力', '糖果',
    '買菜', '生鮮', '食材', '蔬菜', '水果', '雞肉', '豬肉', '牛肉', '魚肉', '海鮮', '雞蛋', '鮮奶', '牛奶', '優格',
    '聚餐', '大餐', '外食', '外帶', '內用', '用餐', '吃飯', '喝飲料', '喝咖啡', '美食', '料理'
  ],

  clothing: [
    // 品牌與通路
    'uniqlo', '優衣庫', 'gu', 'zara', 'h&m', 'net', 'gap', 'mango', 'muji', '無印良品', 'lululemon',
    'nike', '耐吉', 'adidas', '愛迪達', 'puma', 'new balance', 'nb', 'converse', 'vans', 'under armour', 'asics',
    '蝦皮', 'shopee', '淘寶', 'shein', '寶雅', 'poya', '屈臣氏', '康是美',
    // 衣著配件品項
    '衣服', '上衣', '襯衫', 't恤', 't-shirt', '短袖', '長袖', '背心', '帽t', '大學t', '毛衣', '針織衫',
    '外套', '風衣', '羽絨衣', '羽絨外套', '大衣', '西裝', '洋裝', '連身裙', '裙子', '短裙', '長裙',
    '褲子', '牛仔褲', '短褲', '長褲', '休閒褲', '運動褲', '棉褲', '瑜珈褲', '內衣', '內褲', '發熱衣', '涼感衣',
    '襪子', '絲襪', '短襪', '隱形襪', '船襪',
    '鞋子', '球鞋', '慢跑鞋', '運動鞋', '布鞋', '皮鞋', '高跟鞋', '娃娃鞋', '涼鞋', '拖鞋', '雨鞋', '靴子', '馬汀靴',
    '包包', '後背包', '側背包', '斜背包', '手提包', '托特包', '帆布包', '皮夾', '錢包', '長夾', '短夾', '零錢包', '卡夾',
    '皮帶', '腰帶', '圍巾', '披肩', '手套', '帽子', '棒球帽', '漁夫帽', '毛帽', '太陽眼鏡', '墨鏡',
    '飾品', '項鍊', '手鍊', '手環', '戒指', '耳環', '耳針', '髮夾', '髮圈', '手錶',
    '剪髮', '理髮', '洗頭', '染髮', '燙髮', '護髮', '做臉', '美甲', '美睫',
    '化妝品', '保養品', '口紅', '唇膏', '粉底', '防曬', '精華液', '乳液', '化妝水', '面膜', '香水', '卸妝水', '洗面乳'
  ],

  housing: [
    // 居住固定費用
    '房租', '租金', '房貸', '貸款', '水費', '自來水', '電費', '台電', '瓦斯費', '瓦斯', '天然氣',
    '欣欣天然氣', '欣湖天然氣', '大台北瓦斯', '網路費', '中華電信', '寬頻', '光世代', '第四台', '有線電視',
    '管理費', '社區管理費', '大樓管理費', '車位租金', '停車位管理費', '清潔費',
    // 居家通路
    'ikea', '宜家家居', '特力屋', '宜得利', 'nitori', 'hola', '小北百貨', '勝立百貨',
    // 日用品與居家消耗品
    '衛生紙', '抽取式衛生紙', '平板衛生紙', '濕紙巾', '廚房紙巾', '面紙',
    '洗衣精', '洗衣粉', '洗衣膠囊', '柔軟精', '洗碗精', '洗手乳', '沐浴乳', '香皂', '肥皂', '洗髮精', '潤髮乳',
    '牙膏', '牙刷', '牙線', '漱口水', '刮鬍刀', '刮鬍泡', '衛生棉', '棉條', '護墊',
    '垃圾袋', '抹布', '菜瓜布', '海綿', '拖把', '掃把', '畚箕', '除塵紙', '吸塵器耗材', '芳香劑', '除濕劑', '克潮靈',
    '防蟲劑', '殺蟲劑', '燈泡', '延長線', '電池', '濾水器', '濾心', '蓮蓬頭', '水管', '螺絲', '五金',
    '水電維修', '換鎖', '開鎖', '通水管', '修水電', '裝潢', '油漆',
    '家具', '桌子', '椅子', '沙發', '床墊', '床架', '枕頭', '棉被', '被單', '床包', '床單', '窗簾', '地墊', '收納盒', '收納箱', '衣架'
  ],

  transport: [
    // 加油與能源
    '加油', '汽油', '柴油', '92', '95', '98', '95無鉛', '98無鉛', '92無鉛', '加滿',
    '中油', '台灣中油', '台塑', '台塑石油', '全國加油站', '福懋加油站', '山隆加油站', '加油站',
    '充電', '充電費', '特斯拉充電', 'supercharger', 'gogoro', '換電',
    // 大眾運輸
    '捷運', '台北捷運', '高雄捷運', '台中捷運', '桃園捷運', '機捷', '環狀線', '輕軌',
    '悠遊卡', '一卡通', 'icash', '公車', '市區公車', '客運', '國光客運', '統聯客運', '和欣客運', '首都客運',
    '高鐵', '台灣高鐵', '台鐵', '台灣鐵路', '火車', '自強號', '區間車', '太魯閣', '普悠瑪', '新自強',
    '機票', '飛機', '航空', '長榮航空', '中華航空', '星宇航空', '台灣虎航', '渡輪', '船票',
    // 計程車與共享乘車
    '計程車', '小黃', '叫車', 'uber', 'line taxi', 'yoxi', '55688', '台灣大車隊', '大都會車隊',
    'irent', 'wemo', 'gosmart', 'zipcar', 'youbike', 'ubike', '共享單車',
    // 停車與車輛維護
    '停車', '停車費', '停車場', '路邊停車', '嘟嘟房', '台灣聯通', '車麻吉',
    'etag', '國道通行費', '過路費', '高速公路',
    '機車保養', '換機油', '齒輪油', '煞車皮', '輪胎', '補胎', '驗車', '定檢',
    '洗車', '打蠟', '汽車美容', '修車', '保養廠', '機車行', '汽車零件', '維修', '拖吊',
    '牌照稅', '燃料稅', '強制險', '第三責任險', '車險', '駕訓班', '罰單'
  ],

  entertainment: [
    '電影', '威秀', '國賓', '秀泰', '新光影城', 'netflix', 'disney', 'disney+', 'spotify', 'youtube premium', 'kkbox',
    '演唱會', '門票', '展覽', '博物館', '遊樂園', '六福村', '劍湖山', '麗寶樂園',
    '唱歌', 'ktv', '錢櫃', '好樂迪', '享溫馨', '桌遊', '密室逃脫', '保齡球', '撞球',
    '遊戲', 'steam', 'switch', 'playstation', 'ps5', 'ps4', 'xbox', '手遊', '課金',
    '健身房', '健身', '運動中心', '瑜珈', '攀岩', '游泳', '羽球', '籃球', '潛水', '滑雪', '露營', '乳清蛋白', '高蛋白',
    '飯店', '民宿', '住宿', '訂房', 'agoda', 'booking', 'airbnb', 'klook', 'kkday', '行程', '伴手禮', '旅遊'
  ],

  medical: [
    '看醫生', '診所', '醫院', '掛號', '掛號費', '感冒', '健保', '部分負擔',
    '藥局', '拿藥', '處方籤', '買藥', '普拿疼', '胃藥', '止痛藥', '感冒藥', '眼藥水', '貼布', '紗布', '優碘', '棉花棒', '口罩', '快篩',
    '大樹藥局', '杏一', '維康', '丁丁藥局',
    '保健食品', '維他命', '益生菌', '魚油', '葉黃素', '膠原蛋白', '鈣片', 'b群',
    '看牙', '洗牙', '補牙', '拔牙', '植牙', '假牙', '牙套', '牙齒矯正', '眼科', '配眼鏡', '眼鏡', '隱形眼鏡', '保養液',
    '健檢', '體檢', '疫苗', '流感疫苗', '復健', '推拿', '中醫', '針灸', '心理諮商'
  ],

  pet: [
    '飼料', '貓飼料', '狗飼料', '罐頭', '副食罐', '主食罐', '凍乾', '肉泥', '肉乾',
    '貓砂', '豆腐砂', '礦砂', '貓抓板', '貓跳台', '貓砂盆', '逗貓棒', '潔牙骨', '牽繩', '胸背帶',
    '寵物美容', '寵物洗澡', '寵物剪毛', '獸醫', '動物醫院', '寵物看診', '驅蟲', '心疥爽', '全能狗', '狂犬病', '疫苗',
    '寵物用品', '魚中魚', '萬達', '東森寵物'
  ],

  childcare: [
    '尿布', '奶粉', '配方奶', '奶瓶', '奶嘴', '副食品', '嬰兒推車', '推車', '汽座', '安全座椅', '嬰兒床',
    '圍兜', '紗布巾', '濕紙巾', '玩具', '童書', '繪本', '托嬰', '托嬰費', '保母', '保母費',
    '幼兒園', '學費', '月費', '註冊費', '補習', '補習費', '安親班', '才藝班'
  ]
};

/**
 * 判斷一個標籤名稱屬於哪一個核心領域（Food, Clothing, Housing, Transport 等）
 */
export function getDomainForTag(tagName: string): string | null {
  const clean = tagName.trim().toLowerCase().replace(/^[#·]/, '');

  if (/^(?:食|餐|飲|吃|飯|麵|早餐|午餐|晚餐|宵夜|點心|甜點|手搖|咖啡|生鮮|超市|外送|外食|餐飲|下午茶|美食|料理)$/.test(clean) ||
      /食|餐|飲|飯|麵|茶|咖啡|早|午|晚|宵夜|甜點|生鮮|美食|料理/.test(clean)) {
    return 'food';
  }

  if (/^(?:衣|服|穿|鞋|包|飾|穿搭|美妝|保養|服飾|配件)$/.test(clean) ||
      /衣|服|穿|鞋|包|飾|穿搭|美妝|保養|包包|飾品/.test(clean)) {
    return 'clothing';
  }

  if (/^(?:住|居|家|房|水電|瓦斯|生活|日用|租|修繕|固定支出|房租|居家)$/.test(clean) ||
      /住|居|家|房|水電|瓦斯|生活|日用|租|修繕|物業/.test(clean)) {
    return 'housing';
  }

  if (/^(?:行|交通|加油|通勤|車輛|車資|車)$/.test(clean) ||
      /交通|加油|通勤|車輛|捷運|高鐵|客運|鐵路|車票|機車|汽車|停車/.test(clean)) {
    return 'transport';
  }

  if (/娛|玩|休閒|電影|活動|門票|遊戲|旅遊|運動|健身/.test(clean)) {
    return 'entertainment';
  }

  if (/醫|藥|健|病|診所|醫院/.test(clean)) {
    return 'medical';
  }

  if (/寵|貓|狗|毛孩/.test(clean)) {
    return 'pet';
  }

  if (/育兒|童|寶寶|小孩|嬰/.test(clean)) {
    return 'childcare';
  }

  return null;
}

/**
 * 針對使用者的自訂標籤庫，動態計算輸入文字最符合的標籤
 */
export function matchTagIntelligently(
  text: string,
  title?: string,
  merchant?: string,
  availableTags?: string[],
  learningRules?: LearningRule[]
): string {
  if (!availableTags || availableTags.length === 0) return '未歸類';

  const cleanText = (text || '').toLowerCase();
  const cleanTitle = (title || '').toLowerCase();
  const cleanMerchant = (merchant || '').toLowerCase();
  const fullContent = `${cleanText} ${cleanTitle} ${cleanMerchant}`.trim();

  // 1. 優先比對使用者的「自適應學習記憶規則」(最高優先權)
  if (learningRules && learningRules.length > 0) {
    for (const rule of learningRules) {
      const vendorPattern = (rule.vendorPattern || '').toLowerCase();
      const keywordPattern = (rule.keywordPattern || '').toLowerCase();

      const isVendorMatched = vendorPattern && cleanMerchant.includes(vendorPattern);
      const isKeywordMatched =
        keywordPattern &&
        (cleanTitle.includes(keywordPattern) ||
          cleanText.includes(keywordPattern) ||
          keywordPattern.includes(cleanTitle));

      if (isVendorMatched || isKeywordMatched) {
        if (rule.targetTags && rule.targetTags.length > 0) {
          const matchedTag = rule.targetTags[0];
          if (availableTags.includes(matchedTag)) {
            return matchedTag;
          }
          const fuzzyMatched = availableTags.find(
            (t) => t === matchedTag || t.includes(matchedTag) || matchedTag.includes(t)
          );
          if (fuzzyMatched) return fuzzyMatched;
        }
      }
    }
  }

  // 2. 檢查輸入文字中是否有「直接包含標籤名稱」
  for (const tag of availableTags) {
    if (tag === '未歸類') continue;
    const cleanTag = tag.toLowerCase().replace(/^[#·]/, '');
    if (cleanTag.length >= 2 && fullContent.includes(cleanTag)) {
      return tag;
    }
  }

  // 3. 關鍵字庫加權評分系統 (針對可用的標籤庫進行多維度匹配)
  const tagScores: Record<string, number> = {};
  availableTags.forEach((t) => (tagScores[t] = 0));

  for (const tag of availableTags) {
    if (tag === '未歸類') continue;
    const domain = getDomainForTag(tag);

    if (domain && DOMAIN_KEYWORDS[domain]) {
      const keywords = DOMAIN_KEYWORDS[domain];
      for (const kw of keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerKw.length >= 2 && fullContent.includes(lowerKw)) {
          // 關鍵字越長越明確（如「麥當勞」、「95無鉛」、「uniqlo」、「健身房」）權重越高
          const weight = lowerKw.length >= 3 ? lowerKw.length * 10 : lowerKw.length * 4;
          tagScores[tag] = (tagScores[tag] || 0) + weight;
        }
      }
    }

    // 支援使用者自訂標籤名稱的 2-gram 詞彙比對（例如「運動健身」拆為「運動」、「健身」）
    const customClean = tag.toLowerCase().replace(/^[#·]/, '');
    if (customClean.length >= 2) {
      for (let i = 0; i <= customClean.length - 2; i++) {
        const sub = customClean.substring(i, i + 2);
        if (fullContent.includes(sub)) {
          tagScores[tag] = (tagScores[tag] || 0) + 20;
        }
      }
    }
  }

  // 找出最高得分的標籤
  let bestTag = '未歸類';
  let maxScore = 0;

  for (const [tag, score] of Object.entries(tagScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestTag = tag;
    }
  }

  if (maxScore > 0) {
    return bestTag;
  }

  return availableTags.includes('未歸類') ? '未歸類' : availableTags[0] || '未歸類';
}

/**
 * 從交易品項文字中智慧提取關鍵字（移除金額、助詞、口語詞），供自我學習引擎儲存
 */
export function extractLearningKeywords(title: string, merchant?: string): string[] {
  const result: string[] = [];

  if (merchant && merchant.trim()) {
    result.push(merchant.trim());
  }

  const clean = (title || '')
    .replace(/[0-9]+(?:\.[0-9]+)?\s*(?:元|塊|twd|nt\$|\$)?/gi, '')
    .replace(/街口支付|line\s*pay|全支付|px\s*pay|悠遊卡|一卡通|apple\s*pay|google\s*pay|信用卡|刷卡|現金|轉帳/gi, '')
    .replace(/算公帳|算私帳|家庭公帳|公帳|私帳|家庭|公用|個人/gi, '')
    .replace(/^(?:花了|一共|總共|付了|收了|買了|去|幫|幫忙)\s*/, '')
    .replace(/^[，。、？！\s,.\-—]+|[，。、？！\s,.\-—]+$/g, '')
    .trim();

  if (clean && clean.length >= 2) {
    result.push(clean);
  }

  return Array.from(new Set(result));
}
