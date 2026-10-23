import type { FixedCost } from './types/user';

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM" (以本地時區計算) */
export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** 當月實際扣款日：若當月沒有該日 (例如 31 號遇到 2 月)，以月底計 */
export function getFixedCostDueDay(cost: Pick<FixedCost, 'dayOfMonth'>, year: number, monthIndex: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(Math.round(cost.dayOfMonth) || 1, 1), 31);
  return Math.min(day, lastDay);
}

/** 當月扣款日期字串 "YYYY-MM-DD" */
export function getFixedCostDueDate(cost: Pick<FixedCost, 'dayOfMonth'>, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  return `${y}-${pad(m + 1)}-${pad(getFixedCostDueDay(cost, y, m))}`;
}

export type FixedCostMonthStatus = 'paid' | 'skipped' | 'due' | 'upcoming';

/** 判斷某筆固定成本在指定月份的狀態 */
export function getFixedCostStatus(cost: FixedCost, today: Date = new Date()): FixedCostMonthStatus {
  const record = cost.paidMonths?.[getMonthKey(today)];
  if (record === 'skipped') return 'skipped';
  if (record) return 'paid';
  const dueDay = getFixedCostDueDay(cost, today.getFullYear(), today.getMonth());
  return today.getDate() >= dueDay ? 'due' : 'upcoming';
}

/** 本月已到扣款日、但尚未確認繳費也未略過的固定成本 */
export function listDueFixedCosts(costs: FixedCost[], today: Date = new Date()): FixedCost[] {
  return costs
    .filter((c) => c.active && getFixedCostStatus(c, today) === 'due')
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}
