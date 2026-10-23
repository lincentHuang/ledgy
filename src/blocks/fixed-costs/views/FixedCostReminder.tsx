'use client';

import React, { useState } from 'react';
import { BellRing, Check, SkipForward, Users, Wallet, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Platform } from '@/lib/platform';
import { FixedCost } from '@app/shared';
import { getFixedCostDueDate } from '@/lib/shared/fixedCosts';

interface FixedCostReminderProps {
  onManage?: () => void;
}

/** 首頁到期提醒：本月已到扣款日但尚未確認的固定成本，確認後直接入帳 */
export const FixedCostReminder: React.FC<FixedCostReminderProps> = ({ onManage }) => {
  const { dueFixedCosts, households, confirmFixedCostPaid, skipFixedCostThisMonth } = useAppStore();
  // 每筆可在確認前修改實際金額 (例如電費、水費每月不同)
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});

  if (dueFixedCosts.length === 0) return null;

  const getLedgerName = (cost: FixedCost) =>
    cost.ledgerType === 'household'
      ? households.find((h) => h.id === cost.householdId)?.name || '群組帳本'
      : '個人私帳';

  const handleConfirm = (cost: FixedCost) => {
    const draft = amountDrafts[cost.id];
    const amount = draft !== undefined && draft !== '' ? Number(draft) : cost.amount;
    confirmFixedCostPaid(cost, Number.isFinite(amount) ? amount : cost.amount);
    Platform.haptic('success');
  };

  return (
    <section className="rounded-3xl border border-amber-500/40 bg-amber-950/30 p-3 sm:p-4 space-y-2.5 shadow-lg shadow-amber-950/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <h2 className="text-sm font-bold text-amber-200 truncate">
            固定成本繳費提醒 ({dueFixedCosts.length})
          </h2>
        </div>
        {onManage && (
          <button
            type="button"
            onClick={onManage}
            className="flex items-center gap-0.5 text-[11px] font-bold text-amber-300/80 hover:text-amber-200 whitespace-nowrap shrink-0"
          >
            管理
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {dueFixedCosts.map((cost) => (
          <li
            key={`${cost.householdId || 'personal'}_${cost.id}`}
            className="rounded-2xl bg-slate-900/80 border border-slate-800 p-2.5 sm:p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{cost.title}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0">
                  {cost.ledgerType === 'household' ? (
                    <Users className="w-3 h-3 text-purple-400 shrink-0" />
                  ) : (
                    <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  <span className="truncate">{getLedgerName(cost)}</span>
                  <span className="shrink-0 whitespace-nowrap">· {getFixedCostDueDate(cost).slice(5).replace('-', '/')} 扣款</span>
                </p>
              </div>
              <label className="flex items-center gap-1 shrink-0 rounded-xl bg-slate-950 border border-slate-700 px-2 py-1 focus-within:ring-1 focus-within:ring-amber-400">
                <span className="text-[11px] text-slate-500">NT$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amountDrafts[cost.id] ?? String(cost.amount)}
                  onChange={(e) => setAmountDrafts((prev) => ({ ...prev, [cost.id]: e.target.value }))}
                  className="w-16 sm:w-20 bg-transparent text-right text-sm font-bold text-white tabular-nums outline-none"
                  aria-label={`${cost.title} 實際金額`}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirm(cost)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition text-white text-xs font-bold py-2 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                已繳費，記一筆
              </button>
              <button
                type="button"
                onClick={() => skipFixedCostThisMonth(cost)}
                className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-slate-300 text-xs font-medium px-3 py-2 whitespace-nowrap shrink-0"
              >
                <SkipForward className="w-3.5 h-3.5" />
                本月略過
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
