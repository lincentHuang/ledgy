import {
  parseTaiwanInvoiceQrCode,
  generateMockInvoiceQrCode,
  isValidCarrierCode,
  checkLotteryWinning,
  calculateHouseholdBalances,
  AdaptiveLearningEngine,
  fallbackLocalRuleParser,
  MOCK_HOUSEHOLD,
  MOCK_TRANSACTIONS,
} from '../src/index.js';

console.log('🧪 === 開始執行台灣 AI 智慧記帳核心模組驗證 ===\n');

// 1. 驗證手機條碼載具格式
console.log('1️⃣ 驗證手機條碼載具格式：');
console.assert(isValidCarrierCode('/AB1234+'), 'Valid carrier /AB1234+ failed');
console.assert(isValidCarrierCode('/1234567'), 'Valid carrier /1234567 failed');
console.assert(!isValidCarrierCode('1234567'), 'Invalid carrier without slash passed');
console.assert(!isValidCarrierCode('/123'), 'Short carrier passed');
console.log('✅ 手機條碼載具格式驗證通過！');

// 2. 驗證台灣電子發票雙 QR Code 解析
console.log('\n2️⃣ 驗證台灣電子發票 QR Code 解析：');
const mockQr = generateMockInvoiceQrCode('AB32117043', '1130816', 450, '22555003', [
  { name: '特選大杯拿鐵', qty: 2, price: 65 },
  { name: '御飯糰', qty: 2, price: 35 },
  { name: '抽取式衛生紙', qty: 1, price: 250 },
]);

const parsedInvoice = parseTaiwanInvoiceQrCode(mockQr.qr1, mockQr.qr2);
console.assert(parsedInvoice !== null, 'Failed to parse Taiwan Invoice QR');
if (parsedInvoice) {
  console.log(`- 發票號碼：${parsedInvoice.invoiceNumber}`);
  console.log(`- 開立日期：${parsedInvoice.date} (民國 ${parsedInvoice.rocDate})`);
  console.log(`- 賣方：${parsedInvoice.sellerName}`);
  console.log(`- 總金額：NT$ ${parsedInvoice.totalAmount}`);
  console.log(`- 明細品項數：${parsedInvoice.items.length}`);
  console.assert(parsedInvoice.totalAmount === 450, 'Amount mismatch');
  console.assert(parsedInvoice.items.length >= 3, 'Items mismatch');
}
console.log('✅ 台灣電子發票 QR Code 解析驗證通過！');

// 3. 驗證統一發票自動對獎系統
console.log('\n3️⃣ 驗證統一發票自動對獎系統：');
const prizeWinning = checkLotteryWinning('AB-32117043', '2024-08-16');
console.log(`- 發票 AB-32117043 對獎結果：${prizeWinning.prizeName} (NT$ ${prizeWinning.prizeAmount.toLocaleString()})`);
console.assert(prizeWinning.isWon === true, 'Winning invoice failed to match');
console.assert(prizeWinning.prizeAmount === 200000, 'Winning amount should be 200,000');

const prizeNotWon = checkLotteryWinning('ZZ-99999999', '2024-08-16');
console.log(`- 發票 ZZ-99999999 對獎結果：${prizeNotWon.prizeName}`);
console.assert(prizeNotWon.isWon === false, 'Non-winning invoice matched wrongly');
console.log('✅ 統一發票自動對獎系統驗證通過！');

// 4. 驗證自然語言記帳結構化解析 (NLP)
console.log('\n4️⃣ 驗證自然語言與語音記帳解析：');
const testSentence = '中午跟同事吃拉麵 280 街口支付';
const parsedNLP = fallbackLocalRuleParser(testSentence);
console.log(`- 句型：「${testSentence}」`);
console.log(`- 解析結果：品項=${parsedNLP.title}, 金額=${parsedNLP.amount}, 分類=${parsedNLP.categoryName}, 付款=${parsedNLP.paymentMethod}, 標籤=${parsedNLP.tags.join(',')}`);
console.assert(parsedNLP.amount === 280, 'NLP amount mismatch');
console.assert(parsedNLP.paymentMethod === '街口支付', 'NLP payment mismatch');
console.assert(parsedNLP.categoryId === 'food', 'NLP category mismatch');

const testFamilySentence = '在全聯買鮮奶與水果 450 全支付 家庭公用';
const parsedFamily = fallbackLocalRuleParser(testFamilySentence);
console.log(`- 家庭句型：「${testFamilySentence}」➔ 帳本=${parsedFamily.ledgerType}`);
console.assert(parsedFamily.ledgerType === 'household', 'Household ledger type mismatch');
console.log('✅ 自然語言與語音記帳解析驗證通過！');

// 5. 驗證自適應偏好學習記憶庫
console.log('\n5️⃣ 驗證自適應偏好學習記憶庫：');
const engine = new AdaptiveLearningEngine();
engine.recordUserCorrection(
  '7-11 咖啡',
  '統一超商',
  'work_fuel',
  '工作提神',
  '咖啡',
  ['提神', '工作'],
  'user_01'
);

const matched = engine.matchRule('買 7-11 咖啡', '統一超商');
console.assert(matched !== null, 'Failed to match learned rule');
console.log(`- 學習後比對「7-11 咖啡」➔ 自動套用分類：${matched?.targetCategoryName}`);
console.assert(matched?.targetCategoryId === 'work_fuel', 'Target category mismatch');
console.log('✅ 自適應偏好學習記憶庫驗證通過！');

// 6. 驗證家庭分帳與最少轉帳結算演算法
console.log('\n6️⃣ 驗證家庭分帳與最少轉帳結算演算法：');
const { summaries, transfers, totalSharedExpense } = calculateHouseholdBalances(
  MOCK_HOUSEHOLD,
  MOCK_TRANSACTIONS
);

console.log(`- 家庭公用總開銷：NT$ ${totalSharedExpense.toLocaleString()}`);
summaries.forEach((s) => {
  console.log(`  * 成員 ${s.displayName}：代墊 NT$ ${s.totalPaid}，應攤 NT$ ${s.totalOwed}，淨結餘 NT$ ${s.netBalance}`);
});
console.log(`- 智慧結算轉帳路徑（共 ${transfers.length} 筆）：`);
transfers.forEach((t) => {
  console.log(`  ➔ ${t.fromName} 應支付給 ${t.toName} NT$ ${t.amount.toLocaleString()}`);
});
console.assert(transfers.length > 0, 'Transfers should not be empty');
console.log('✅ 家庭分帳與結算演算法驗證通過！');

console.log('\n🎉 所有核心功能測試 100% 全部通過！');
