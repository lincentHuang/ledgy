import type { Transaction } from './types/expense';

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" (以本地時區計算) */
export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const DIARY_MOODS = [
  { emoji: '😄', label: '開心' },
  { emoji: '🙂', label: '平靜' },
  { emoji: '😐', label: '普通' },
  { emoji: '😮‍💨', label: '疲累' },
  { emoji: '😢', label: '難過' },
  { emoji: '😠', label: '生氣' },
];

/** 我記的帳：個人私帳 + 群組帳本中由我記錄的帳目 (日記看的是「我今天有沒有記帳」) */
export function isMyTransaction(t: Transaction, uid: string): boolean {
  return !t.userId || t.userId === uid;
}

/** 依日期分組 (只取我記的帳)：Key "YYYY-MM-DD" */
export function groupMyTransactionsByDate(transactions: Transaction[], uid: string): Record<string, Transaction[]> {
  const map: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    if (!t.date || !isMyTransaction(t, uid)) return;
    const key = t.date.slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return map;
}

export function sumByType(list: Transaction[], type: Transaction['type']): number {
  return list.filter((t) => t.type === type).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/** 從今天 (或昨天，若今天還沒做) 往回連續有紀錄的天數 */
export function countStreak(hasRecord: (dateKey: string) => boolean, today: Date = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!hasRecord(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (hasRecord(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** "2026 年 10 月 28 日 (星期三)" */
export function formatDiaryDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return dateKey;
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${y} 年 ${m} 月 ${d} 日 (${weekDays[new Date(y, m - 1, d).getDay()]})`;
}
