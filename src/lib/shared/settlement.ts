import { Transaction } from './types/expense';
import { Household, HouseholdMember, BalanceSummary, SettlementTransfer } from './types/family';

/**
 * 計算家庭中所有成員的公用支出代墊、應攤與淨結餘狀況
 */
export function calculateHouseholdBalances(
  household: Household,
  transactions: Transaction[]
): { summaries: BalanceSummary[]; transfers: SettlementTransfer[]; totalSharedExpense: number } {
  const members = household.members;
  const memberMap = new Map<string, HouseholdMember>();
  const paidMap = new Map<string, number>();
  const owedMap = new Map<string, number>();

  members.forEach(m => {
    memberMap.set(m.userId, m);
    paidMap.set(m.userId, 0);
    owedMap.set(m.userId, 0);
  });

  let totalSharedExpense = 0;

  // 篩選出屬於該家庭且為家庭公用帳本的支出
  const sharedTxList = transactions.filter(
    t => (t.householdId === household.id || t.ledgerType === 'household') && t.type === 'expense'
  );

  sharedTxList.forEach(tx => {
    const amount = tx.amount;
    totalSharedExpense += amount;
    const payerId = tx.splitInfo?.payerId || tx.userId;

    // 累加代墊金額
    if (paidMap.has(payerId)) {
      paidMap.set(payerId, (paidMap.get(payerId) || 0) + amount);
    }

    // 計算分攤
    if (tx.splitInfo && tx.splitInfo.splits && tx.splitInfo.splits.length > 0) {
      // 自訂或已有分攤清單
      tx.splitInfo.splits.forEach(s => {
        if (owedMap.has(s.userId)) {
          owedMap.set(s.userId, (owedMap.get(s.userId) || 0) + s.amount);
        }
      });
    } else {
      // 預設平攤給所有家庭成員
      const memberCount = Math.max(1, members.length);
      const splitAmount = Math.round(amount / memberCount);
      members.forEach(m => {
        owedMap.set(m.userId, (owedMap.get(m.userId) || 0) + splitAmount);
      });
    }
  });

  // 篩選並計算結算轉帳紀錄 (Transfers)
  const transferTxList = transactions.filter(
    t => (t.householdId === household.id || t.ledgerType === 'household') && t.type === 'transfer'
  );

  transferTxList.forEach(tx => {
    const fromUser = tx.splitInfo?.payerId || tx.userId;
    const toUser = tx.splitInfo?.splits?.[0]?.userId;
    const amount = tx.amount;

    // 付款還錢者 (fromUser) 結餘增加
    if (fromUser && paidMap.has(fromUser)) {
      paidMap.set(fromUser, (paidMap.get(fromUser) || 0) + amount);
    }
    // 收款清帳者 (toUser) 結餘相應沖銷
    if (toUser && owedMap.has(toUser)) {
      owedMap.set(toUser, (owedMap.get(toUser) || 0) + amount);
    }
  });

  const summaries: BalanceSummary[] = members.map(m => {
    const totalPaid = paidMap.get(m.userId) || 0;
    const totalOwed = owedMap.get(m.userId) || 0;
    const netBalance = totalPaid - totalOwed;
    return {
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      totalPaid,
      totalOwed,
      netBalance,
    };
  });

  // 計算結算路徑 (Greedy debt simplification)
  const transfers = computeDebtTransfers(summaries);

  return {
    summaries,
    transfers,
    totalSharedExpense,
  };
}

/**
 * 貪婪簡化債務演算法：計算家庭成員之間最少次數的轉帳結算路徑
 */
export function computeDebtTransfers(summaries: BalanceSummary[]): SettlementTransfer[] {
  const debtors: { userId: string; name: string; amount: number }[] = [];
  const creditors: { userId: string; name: string; amount: number }[] = [];

  summaries.forEach(s => {
    if (s.netBalance < -1) {
      // 應支付者
      debtors.push({ userId: s.userId, name: s.displayName, amount: -s.netBalance });
    } else if (s.netBalance > 1) {
      // 應收回者
      creditors.push({ userId: s.userId, name: s.displayName, amount: s.netBalance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: Math.round(settleAmt),
      });

      debtor.amount -= settleAmt;
      creditor.amount -= settleAmt;
    }

    if (debtor.amount < 1) dIdx++;
    if (creditor.amount < 1) cIdx++;
  }

  return transfers;
}
