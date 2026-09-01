import fs from 'fs';
import path from 'path';
import {
  Transaction,
  TaiwanInvoice,
  Household,
  UserProfile,
  GroupInvitation,
  GroupJoinRequest,
  LearningRule,
  MOCK_USER,
  MOCK_USER_LIN,
  MOCK_HOUSEHOLD,
  MOCK_TRANSACTIONS,
  MOCK_INVOICES,
  MOCK_LEARNING_RULES,
} from '@app/shared';

export interface DatabaseSchema {
  users: Record<string, UserProfile>;
  households: Record<string, Household>;
  transactions: Transaction[];
  invoices: TaiwanInvoice[];
  learningRules: LearningRule[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const today = new Date().toISOString().split('T')[0];

const SEED_TRANSACTIONS: Transaction[] = [
  // --- 家庭公帳 ---
  {
    id: 'tx_01',
    userId: 'user_tw_01',
    householdId: 'house_warm_family',
    title: '全聯生活生鮮採買 (週末煮火鍋)',
    amount: 1280,
    type: 'expense',
    ledgerType: 'household',
    categoryId: 'housing',
    categoryName: '居家生活',
    categoryIcon: 'Home',
    subCategory: '日用品消耗',
    paymentMethod: '全支付/PX Pay',
    date: today,
    merchant: '全聯實業',
    note: '買了牛肉片、高麗菜、火鍋底料與抽取式衛生紙',
    tags: ['家庭公用', '生活採買', '生鮮食材'],
    invoiceNumber: 'AB-32117043',
    splitInfo: {
      splitMethod: 'equal',
      payerId: 'user_tw_01',
      splits: [
        { userId: 'user_tw_01', amount: 640, settled: false },
        { userId: 'user_tw_02', amount: 640, settled: false },
      ],
    },
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'tx_03',
    userId: 'user_tw_02',
    householdId: 'house_warm_family',
    title: '台電電費 (7-8月夏季用電)',
    amount: 2450,
    type: 'expense',
    ledgerType: 'household',
    categoryId: 'housing',
    categoryName: '居家生活',
    categoryIcon: 'Home',
    subCategory: '水電瓦斯',
    paymentMethod: '銀行轉帳',
    date: today,
    merchant: '台灣電力公司',
    note: '夏季冷氣電費',
    tags: ['家庭公用', '固定繳費'],
    splitInfo: {
      splitMethod: 'equal',
      payerId: 'user_tw_02',
      splits: [
        { userId: 'user_tw_01', amount: 1225, settled: false },
        { userId: 'user_tw_02', amount: 1225, settled: false },
      ],
    },
    createdAt: Date.now() - 28800000,
    updatedAt: Date.now() - 28800000,
  },

  // --- 陳威廷 (user_tw_01) 私帳 ---
  {
    id: 'tx_02',
    userId: 'user_tw_01',
    title: '一蘭拉麵 + 抹茶杏仁豆腐',
    amount: 380,
    type: 'expense',
    ledgerType: 'personal',
    categoryId: 'food',
    categoryName: '餐飲飲食',
    categoryIcon: 'Utensils',
    subCategory: '午餐',
    paymentMethod: '街口支付',
    date: today,
    merchant: '一蘭拉麵',
    note: '跟同事一起吃中午',
    tags: ['外食', '同事聚餐'],
    invoiceNumber: 'CD-88392019',
    createdAt: Date.now() - 14400000,
    updatedAt: Date.now() - 14400000,
  },
  {
    id: 'tx_04',
    userId: 'user_tw_01',
    title: '星巴克 特選馥列白大杯',
    amount: 150,
    type: 'expense',
    ledgerType: 'personal',
    categoryId: 'food',
    categoryName: '餐飲飲食',
    categoryIcon: 'Utensils',
    subCategory: '咖啡外帶',
    paymentMethod: 'LINE Pay',
    date: today,
    merchant: '星巴克',
    note: '上班前提神',
    tags: ['咖啡', '工作提神'],
    createdAt: Date.now() - 32400000,
    updatedAt: Date.now() - 32400000,
  },
  {
    id: 'tx_05',
    userId: 'user_tw_01',
    title: '台灣中油 95無鉛汽油加滿',
    amount: 1150,
    type: 'expense',
    ledgerType: 'personal',
    categoryId: 'transport',
    categoryName: '交通運輸',
    categoryIcon: 'Car',
    subCategory: '加油費',
    paymentMethod: '信用卡 (一般)',
    date: today,
    merchant: '台灣中油',
    tags: ['加油', '交通'],
    invoiceNumber: 'EF-99281740',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'tx_06',
    userId: 'user_tw_01',
    title: '8月份 正職工程師薪資發放',
    amount: 72000,
    type: 'income',
    ledgerType: 'personal',
    categoryId: 'income_salary',
    categoryName: '薪資收入',
    categoryIcon: 'Briefcase',
    subCategory: '正職月薪',
    paymentMethod: '銀行轉帳',
    date: today,
    note: '8月公司薪水入帳',
    tags: ['薪資', '固定收入'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },

  // --- 林怡君 (user_tw_02) 私帳 ---
  {
    id: 'tx_lin_01',
    userId: 'user_tw_02',
    title: '寶雅生活館 醫美玻尿酸精華液 & 面膜',
    amount: 890,
    type: 'expense',
    ledgerType: 'personal',
    categoryId: 'shopping',
    categoryName: '日常購物',
    categoryIcon: 'ShoppingBag',
    subCategory: '美妝保養',
    paymentMethod: 'LINE Pay',
    date: today,
    merchant: '寶雅 POYA',
    note: '補貨日常保養品',
    tags: ['美妝保養', '個人護理'],
    invoiceNumber: 'XY-55201928',
    createdAt: Date.now() - 18000000,
    updatedAt: Date.now() - 18000000,
  },
  {
    id: 'tx_lin_02',
    userId: 'user_tw_02',
    title: 'Lady M 伯爵千層蛋糕 & 皇家伯爵茶',
    amount: 320,
    type: 'expense',
    ledgerType: 'personal',
    categoryId: 'food',
    categoryName: '餐飲飲食',
    categoryIcon: 'Utensils',
    subCategory: '甜點下午茶',
    paymentMethod: '信用卡 (一般)',
    date: today,
    merchant: 'Lady M 旗艦店',
    note: '跟閨蜜吃下午茶',
    tags: ['下午茶', '甜點', '個人放鬆'],
    createdAt: Date.now() - 10800000,
    updatedAt: Date.now() - 10800000,
  },
  {
    id: 'tx_lin_03',
    userId: 'user_tw_02',
    title: '8月份 UI/UX 設計主管薪資發放',
    amount: 65000,
    type: 'income',
    ledgerType: 'personal',
    categoryId: 'income_salary',
    categoryName: '薪資收入',
    categoryIcon: 'Briefcase',
    subCategory: '正職月薪',
    paymentMethod: '銀行轉帳',
    date: today,
    note: '8月設計主管薪水入帳',
    tags: ['薪資', '固定收入'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
];

const SEED_INVOICES: TaiwanInvoice[] = [
  {
    id: 'inv_mock_01',
    invoiceNumber: 'AB-32117043',
    date: today,
    rocDate: '1130816',
    randomCode: '6812',
    salesAmount: 1219,
    totalAmount: 1280,
    buyerGUI: '00000000',
    sellerGUI: '16740494',
    sellerName: '全聯實業股份有限公司',
    carrierCode: '/AB1234+',
    isScanned: true,
    scanTime: Date.now() - 3600000,
    items: [
      { name: '冷藏美國牛五花火鍋肉片', quantity: 2, unitPrice: 280, amount: 560 },
      { name: '產銷履歷高麗菜', quantity: 1, unitPrice: 85, amount: 85 },
      { name: '海底撈麻辣火鍋底料', quantity: 1, unitPrice: 195, amount: 195 },
      { name: '舒潔抽取式衛生紙 100抽*8包', quantity: 2, unitPrice: 220, amount: 440 },
    ],
    lotteryResult: {
      isWon: true,
      prizeName: '頭獎',
      prizeAmount: 200000,
      matchedNumber: '32117043',
      detail: '恭喜！發票號碼 32117043 與 113年07-08月頭獎完全相符，獲得 20 萬元！',
    },
  },
  {
    id: 'inv_mock_02',
    invoiceNumber: 'CD-88392019',
    date: today,
    rocDate: '1130816',
    randomCode: '4421',
    salesAmount: 362,
    totalAmount: 380,
    buyerGUI: '00000000',
    sellerGUI: '22555003',
    sellerName: '統一超商 7-ELEVEN',
    carrierCode: '/AB1234+',
    isScanned: true,
    scanTime: Date.now() - 14400000,
    items: [
      { name: '日式豚骨拉麵特盛', quantity: 1, unitPrice: 299, amount: 299 },
      { name: '抹茶杏仁豆腐', quantity: 1, unitPrice: 81, amount: 81 },
    ],
    lotteryResult: {
      isWon: false,
      prizeName: '未中獎',
      prizeAmount: 0,
    },
  },
  {
    id: 'inv_mock_03',
    invoiceNumber: 'EF-99281740',
    date: today,
    rocDate: '1130815',
    randomCode: '9120',
    salesAmount: 1095,
    totalAmount: 1150,
    buyerGUI: '00000000',
    sellerGUI: '28086000',
    sellerName: '台灣中油股份有限公司',
    carrierCode: '/AB1234+',
    isScanned: true,
    scanTime: Date.now() - 86400000,
    items: [{ name: '95無鉛汽油 35.8公升', quantity: 1, unitPrice: 1150, amount: 1150 }],
    lotteryResult: {
      isWon: false,
      prizeName: '未中獎',
      prizeAmount: 0,
    },
  },
  {
    id: 'inv_mock_lin_01',
    invoiceNumber: 'XY-55201928',
    date: today,
    rocDate: '1130816',
    randomCode: '1398',
    salesAmount: 848,
    totalAmount: 890,
    buyerGUI: '00000000',
    sellerGUI: '23859200',
    sellerName: '寶雅國際股份有限公司',
    carrierCode: '/XY9876-',
    isScanned: true,
    scanTime: Date.now() - 18000000,
    items: [
      { name: '玻尿酸保濕精華液 50ml', quantity: 1, unitPrice: 650, amount: 650 },
      { name: '茶樹控油面膜 5入裝', quantity: 1, unitPrice: 240, amount: 240 },
    ],
    lotteryResult: {
      isWon: true,
      prizeName: '六獎',
      prizeAmount: 200,
      matchedNumber: '55201928',
      detail: '恭喜！發票末三碼 928 對中 113年07-08月增開六獎，獲得 200 元！',
    },
  },
];

const getInitialDb = (): DatabaseSchema => ({
  users: {
    'user_tw_01': MOCK_USER,
    'user_tw_02': MOCK_USER_LIN,
  },
  households: {
    'house_warm_family': MOCK_HOUSEHOLD,
  },
  transactions: SEED_TRANSACTIONS,
  invoices: SEED_INVOICES,
  learningRules: MOCK_LEARNING_RULES,
});

export class ServerDb {
  private static ensureDb(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        const initial = getInitialDb();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('ServerDb read error, using fallback:', e);
      return getInitialDb();
    }
  }

  private static writeDb(db: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
      console.error('ServerDb write error:', e);
    }
  }

  // 1. 取得使用者專屬交易 (個人私帳 + 家庭公帳)
  public static getTransactions(userId: string, householdId?: string): Transaction[] {
    const db = this.ensureDb();
    return db.transactions.filter((t) => {
      const isPersonalOwner = t.userId === userId && t.ledgerType === 'personal';
      const isHousehold = Boolean(
        householdId && t.householdId === householdId && t.ledgerType === 'household'
      );
      return isPersonalOwner || isHousehold;
    });
  }

  // 2. 儲存或更新單筆交易
  public static saveTransaction(tx: Transaction): Transaction {
    const db = this.ensureDb();
    const index = db.transactions.findIndex((t) => t.id === tx.id);
    if (index >= 0) {
      db.transactions[index] = { ...tx, updatedAt: Date.now() };
    } else {
      db.transactions.unshift(tx);
    }
    this.writeDb(db);
    return tx;
  }

  // 3. 刪除交易
  public static deleteTransaction(id: string): boolean {
    const db = this.ensureDb();
    const initialLen = db.transactions.length;
    db.transactions = db.transactions.filter((t) => t.id !== id);
    this.writeDb(db);
    return db.transactions.length < initialLen;
  }

  // 4. 取得使用者名下的發票 (依載具條碼或 userId)
  public static getInvoices(carrierCode?: string): TaiwanInvoice[] {
    const db = this.ensureDb();
    if (!carrierCode) return db.invoices;
    return db.invoices.filter((inv) => !inv.carrierCode || inv.carrierCode === carrierCode);
  }

  // 5. 儲存發票
  public static saveInvoice(invoice: TaiwanInvoice): TaiwanInvoice {
    const db = this.ensureDb();
    const index = db.invoices.findIndex((inv) => inv.id === invoice.id || inv.invoiceNumber === invoice.invoiceNumber);
    if (index >= 0) {
      db.invoices[index] = invoice;
    } else {
      db.invoices.unshift(invoice);
    }
    this.writeDb(db);
    return invoice;
  }

  // 6. 取得群組資訊
  public static getHousehold(householdId: string): Household | null {
    const db = this.ensureDb();
    return db.households[householdId] || null;
  }

  // 6.1 取得特定使用者所屬的所有群組 (複數群組支援)
  public static getHouseholdsByUser(userId: string): Household[] {
    const db = this.ensureDb();
    return Object.values(db.households).filter(
      (h) => h.ownerId === userId || h.members.some((m) => m.userId === userId)
    );
  }

  // 7. 儲存或更新群組資訊
  public static saveHousehold(household: Household): Household {
    const db = this.ensureDb();
    db.households[household.id] = household;
    this.writeDb(db);
    return household;
  }

  // 7.1 刪除群組
  public static deleteHousehold(householdId: string): boolean {
    const db = this.ensureDb();
    if (db.households[householdId]) {
      delete db.households[householdId];
      db.transactions = db.transactions.filter((t) => t.householdId !== householdId);
      this.writeDb(db);
      return true;
    }
    return false;
  }

  // 8. 透過邀請碼查詢群組
  public static getHouseholdByInviteCode(inviteCode: string): Household | null {
    const db = this.ensureDb();
    const code = inviteCode.trim().toUpperCase();
    for (const h of Object.values(db.households)) {
      if (h.inviteCode === code) return h;
    }
    return null;
  }

  // 8.1 組長透過 Email 發送群組邀請
  public static inviteMemberByEmail(
    householdId: string,
    inviter: { uid: string; displayName: string },
    inviteeEmail: string,
    role: 'member' | 'admin' = 'member'
  ): { success: boolean; message: string; invitation?: GroupInvitation } {
    const db = this.ensureDb();
    const house = db.households[householdId];
    if (!house) return { success: false, message: '找不到指定的群組' };

    const emailClean = inviteeEmail.trim().toLowerCase();
    if (!emailClean) return { success: false, message: '請輸入有效的 Email' };

    // 檢查是否已在群組中
    if (house.members.some((m) => m.email?.toLowerCase() === emailClean)) {
      return { success: false, message: `Email ${emailClean} 已經在此群組中囉！` };
    }

    if (!house.pendingInvitations) house.pendingInvitations = [];

    // 檢查是否已有待處理的邀請
    const existing = house.pendingInvitations.find(
      (inv) => inv.inviteeEmail.toLowerCase() === emailClean && inv.status === 'pending'
    );
    if (existing) {
      return { success: false, message: `已發送過邀請至 ${emailClean}，等待對方確認中！` };
    }

    const invitation: GroupInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      householdId: house.id,
      householdName: house.name,
      inviterUserId: inviter.uid,
      inviterName: inviter.displayName,
      inviteeEmail: emailClean,
      role,
      status: 'pending',
      createdAt: Date.now(),
    };

    house.pendingInvitations.push(invitation);
    this.writeDb(db);
    return { success: true, message: `已成功發送邀請至 ${emailClean}！`, invitation };
  }

  // 8.2 取得特定 Email 收到的所有群組邀請 (待回覆)
  public static getPendingInvitationsForEmail(email: string): GroupInvitation[] {
    if (!email) return [];
    const db = this.ensureDb();
    const emailClean = email.trim().toLowerCase();
    const list: GroupInvitation[] = [];
    for (const house of Object.values(db.households)) {
      if (house.pendingInvitations) {
        for (const inv of house.pendingInvitations) {
          if (inv.inviteeEmail.toLowerCase() === emailClean && inv.status === 'pending') {
            list.push(inv);
          }
        }
      }
    }
    return list;
  }

  // 8.3 被邀請者回覆邀請 (同意或拒絕)
  public static respondToInvitation(
    invitationId: string,
    email: string,
    action: 'accept' | 'reject',
    userProfile: UserProfile
  ): { success: boolean; message: string; household?: Household } {
    const db = this.ensureDb();
    for (const house of Object.values(db.households)) {
      if (house.pendingInvitations) {
        const invIndex = house.pendingInvitations.findIndex((inv) => inv.id === invitationId);
        if (invIndex >= 0) {
          const inv = house.pendingInvitations[invIndex];
          if (action === 'accept') {
            inv.status = 'accepted';
            // 加入成員清單
            if (!house.members.some((m) => m.userId === userProfile.uid)) {
              house.members.push({
                userId: userProfile.uid,
                displayName: userProfile.displayName || '新成員',
                email: userProfile.email || email,
                avatarUrl: userProfile.photoURL,
                role: inv.role || 'member',
                carrierCode: userProfile.defaultCarrierCode,
                joinedAt: Date.now(),
              });
            }
            house.updatedAt = Date.now();
            this.writeDb(db);
            return { success: true, message: `🎉 成功加入群組「${house.name}」！`, household: house };
          } else {
            inv.status = 'rejected';
            house.pendingInvitations.splice(invIndex, 1);
            this.writeDb(db);
            return { success: true, message: `已婉拒「${house.name}」的邀請。` };
          }
        }
      }
    }
    return { success: false, message: '找不到該邀請記錄。' };
  }

  // 8.4 透過邀請碼申請加入群組 (需組長審核)
  public static submitJoinRequest(
    inviteCode: string,
    applicant: UserProfile
  ): { success: boolean; message: string; household?: Household; request?: GroupJoinRequest } {
    const db = this.ensureDb();
    const code = inviteCode.trim().toUpperCase();
    const house = Object.values(db.households).find((h) => h.inviteCode === code);
    if (!house) {
      return { success: false, message: '找不到此邀請碼對應的群組，請確認代碼是否正確。' };
    }

    if (house.members.some((m) => m.userId === applicant.uid)) {
      return { success: false, message: `您已經是「${house.name}」的成員囉！` };
    }

    if (!house.pendingJoinRequests) house.pendingJoinRequests = [];

    const existing = house.pendingJoinRequests.find(
      (req) => req.applicantUserId === applicant.uid && req.status === 'pending'
    );
    if (existing) {
      return { success: true, message: `您已送出加入「${house.name}」的申請，請等待組長審核！`, household: house, request: existing };
    }

    const request: GroupJoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      householdId: house.id,
      householdName: house.name,
      applicantUserId: applicant.uid,
      applicantName: applicant.displayName || '訪客',
      applicantEmail: applicant.email,
      applicantCarrierCode: applicant.defaultCarrierCode,
      status: 'pending',
      createdAt: Date.now(),
    };

    house.pendingJoinRequests.push(request);
    this.writeDb(db);
    return {
      success: true,
      message: `已送出加入「${house.name}」申請！請等待群組組長審核同意。`,
      household: house,
      request,
    };
  }

  // 8.5 組長審核加入申請 (同意或拒絕)
  public static respondToJoinRequest(
    householdId: string,
    requestId: string,
    action: 'approve' | 'reject'
  ): { success: boolean; message: string; household?: Household } {
    const db = this.ensureDb();
    const house = db.households[householdId];
    if (!house || !house.pendingJoinRequests) {
      return { success: false, message: '找不到該群組或申請記錄' };
    }

    const reqIndex = house.pendingJoinRequests.findIndex((r) => r.id === requestId);
    if (reqIndex < 0) {
      return { success: false, message: '找不到該筆申請' };
    }

    const joinReq = house.pendingJoinRequests[reqIndex];
    if (action === 'approve') {
      joinReq.status = 'approved';
      if (!house.members.some((m) => m.userId === joinReq.applicantUserId)) {
        house.members.push({
          userId: joinReq.applicantUserId,
          displayName: joinReq.applicantName,
          email: joinReq.applicantEmail,
          role: 'member',
          carrierCode: joinReq.applicantCarrierCode,
          joinedAt: Date.now(),
        });
      }
      house.pendingJoinRequests.splice(reqIndex, 1);
      house.updatedAt = Date.now();
      this.writeDb(db);
      return {
        success: true,
        message: `已同意「${joinReq.applicantName}」加入群組！`,
        household: house,
      };
    } else {
      joinReq.status = 'rejected';
      house.pendingJoinRequests.splice(reqIndex, 1);
      this.writeDb(db);
      return { success: true, message: `已拒絕「${joinReq.applicantName}」的加入申請。` };
    }
  }

  // 9. 使用者檔案操作
  public static getUserProfile(userId: string): UserProfile | null {
    const db = this.ensureDb();
    return db.users[userId] || null;
  }

  public static saveUserProfile(user: UserProfile): UserProfile {
    const db = this.ensureDb();
    db.users[user.uid] = user;
    this.writeDb(db);
    return user;
  }
}
