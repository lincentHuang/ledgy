'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Check,
  Users,
  Wallet,
  SkipForward,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Modal } from '@/components';
import { Platform } from '@/lib/platform';
import { DEFAULT_CATEGORIES, FixedCost, Household } from '@app/shared';
import { getFixedCostStatus, FixedCostMonthStatus } from '@/lib/shared/fixedCosts';

interface FixedCostsViewProps {
  onBack: () => void;
}

const STATUS_STYLE: Record<FixedCostMonthStatus, { label: string; className: string }> = {
  paid: { label: '本月已繳', className: 'bg-emerald-950 text-emerald-300 border-emerald-700/60' },
  skipped: { label: '本月略過', className: 'bg-slate-800 text-slate-400 border-slate-700' },
  due: { label: '待確認', className: 'bg-amber-950 text-amber-300 border-amber-600/60' },
  upcoming: { label: '未到期', className: 'bg-slate-900 text-slate-400 border-slate-700' },
};

const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.id !== 'income_salary');

const getHouseholdTags = (h?: Household | null, fallback: string[] = []) => {
  if (!h) return fallback;
  if (h.tagItems && h.tagItems.length > 0) return h.tagItems.map((t) => t.name);
  if (h.tags && h.tags.length > 0) return h.tags;
  return fallback;
};

type FormState = {
  title: string;
  amount: string;
  dayOfMonth: number;
  ledgerKey: string; // 'personal' 或 householdId
  tag: string;
  paymentMethod: string;
  categoryId: string;
  active: boolean;
};

export const FixedCostsView: React.FC<FixedCostsViewProps> = ({ onBack }) => {
  const {
    allFixedCosts,
    households,
    activeLedger,
    activeHouseholdId,
    availableTags,
    paymentMethods,
    groupTagItems,
    user,
    addFixedCost,
    updateFixedCost,
    deleteFixedCost,
    confirmFixedCostPaid,
    skipFixedCostThisMonth,
  } = useAppStore();

  const [editing, setEditing] = useState<FixedCost | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FixedCost | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const monthlyTotal = useMemo(
    () => allFixedCosts.filter((c) => c.active).reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [allFixedCosts]
  );
  const paidCount = allFixedCosts.filter((c) => c.active && getFixedCostStatus(c) === 'paid').length;
  const activeCount = allFixedCosts.filter((c) => c.active).length;

  const groups = useMemo(() => {
    const list: { key: string; name: string; isGroup: boolean; items: FixedCost[] }[] = [
      {
        key: 'personal',
        name: '個人私帳',
        isGroup: false,
        items: allFixedCosts.filter((c) => c.ledgerType === 'personal'),
      },
      ...households.map((h) => ({
        key: h.id,
        name: h.name,
        isGroup: true,
        items: allFixedCosts.filter((c) => c.ledgerType === 'household' && c.householdId === h.id),
      })),
    ];
    return list
      .map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.dayOfMonth - b.dayOfMonth) }))
      .filter((g) => g.items.length > 0);
  }, [allFixedCosts, households]);

  const getOptionsForLedger = (ledgerKey: string) => {
    if (ledgerKey === 'personal') {
      return { tags: availableTags, payments: paymentMethods };
    }
    const h = households.find((x) => x.id === ledgerKey);
    return {
      tags: getHouseholdTags(h, groupTagItems.map((t) => t.name)),
      payments: h?.paymentMethods && h.paymentMethods.length > 0 ? h.paymentMethods : paymentMethods,
    };
  };

  const openCreate = () => {
    const ledgerKey =
      activeLedger === 'household' && activeHouseholdId && households.some((h) => h.id === activeHouseholdId)
        ? activeHouseholdId
        : 'personal';
    const opts = getOptionsForLedger(ledgerKey);
    setEditing(null);
    setForm({
      title: '',
      amount: '',
      dayOfMonth: new Date().getDate(),
      ledgerKey,
      tag: opts.tags[0] || '',
      paymentMethod: user.defaultPaymentMethod || opts.payments[0] || '現金',
      categoryId: 'housing',
      active: true,
    });
    setIsFormOpen(true);
  };

  const openEdit = (cost: FixedCost) => {
    setEditing(cost);
    setForm({
      title: cost.title,
      amount: String(cost.amount),
      dayOfMonth: cost.dayOfMonth,
      ledgerKey: cost.ledgerType === 'household' && cost.householdId ? cost.householdId : 'personal',
      tag: cost.tag || '',
      paymentMethod: cost.paymentMethod || '',
      categoryId: cost.categoryId || 'housing',
      active: cost.active,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const formOptions = form ? getOptionsForLedger(form.ledgerKey) : { tags: [], payments: [] };
  const canSave = Boolean(form && form.title.trim() && Number(form.amount) > 0);

  const handleSave = () => {
    if (!form || !canSave) return;
    const isGroup = form.ledgerKey !== 'personal';
    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      dayOfMonth: form.dayOfMonth,
      tag: form.tag || undefined,
      paymentMethod: form.paymentMethod || undefined,
      categoryId: form.categoryId,
      ledgerType: (isGroup ? 'household' : 'personal') as FixedCost['ledgerType'],
      householdId: isGroup ? form.ledgerKey : undefined,
      active: form.active,
    };
    if (editing) {
      updateFixedCost(editing, payload);
    } else {
      addFixedCost(payload);
    }
    Platform.haptic('success');
    closeForm();
  };

  const inputClass =
    'w-full min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50';

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95 shrink-0"
            aria-label="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">每月固定成本</h1>
            <p className="text-[11px] text-slate-400 truncate">到了扣款日會提醒你確認繳費，確認後自動記帳</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 transition whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          新增
        </button>
      </div>

      {/* 摘要 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass-panel rounded-2xl p-3 min-w-0">
          <p className="text-[11px] text-slate-400 whitespace-nowrap">每月固定支出</p>
          <p className="text-base sm:text-lg font-bold text-white tabular-nums truncate">
            NT$ {monthlyTotal.toLocaleString()}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-3 min-w-0">
          <p className="text-[11px] text-slate-400 whitespace-nowrap">本月已繳</p>
          <p className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums truncate">
            {paidCount} / {activeCount} 筆
          </p>
        </div>
      </div>

      {/* 列表 */}
      {groups.length === 0 ? (
        <div className="glass-panel rounded-3xl p-5 sm:p-8 text-center space-y-3">
          <CalendarClock className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-slate-200">還沒有固定成本</p>
          <p className="text-xs text-slate-400">例如房租、電信費、Netflix、保險，設定每月幾號扣款即可自動提醒。</p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
          >
            新增第一筆固定成本
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 px-1 min-w-0">
              {g.isGroup ? (
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{g.name}</span>
            </h2>
            <ul className="space-y-2">
              {g.items.map((cost) => {
                const status = cost.active ? getFixedCostStatus(cost) : null;
                return (
                  <li
                    key={cost.id}
                    className={`glass-panel rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 ${cost.active ? '' : 'opacity-50'}`}
                  >
                    <div className="w-11 shrink-0 rounded-xl bg-slate-900 border border-slate-800 py-1 text-center">
                      <p className="text-[9px] text-slate-500 leading-none">每月</p>
                      <p className="text-base font-bold text-white leading-tight tabular-nums">{cost.dayOfMonth}</p>
                      <p className="text-[9px] text-slate-500 leading-none">號</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                        <p className="text-sm font-bold text-white truncate max-w-full">{cost.title}</p>
                        {status ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold whitespace-nowrap shrink-0 ${STATUS_STYLE[status].className}`}
                          >
                            {STATUS_STYLE[status].label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-700 text-slate-500 whitespace-nowrap shrink-0">
                            已停用
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        NT$ <span className="tabular-nums">{Number(cost.amount).toLocaleString()}</span>
                        {cost.tag ? ` · #${cost.tag}` : ''}
                        {cost.paymentMethod ? ` · ${cost.paymentMethod}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {status === 'due' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              confirmFixedCostPaid(cost);
                              Platform.haptic('success');
                            }}
                            className="p-1.5 sm:p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition"
                            title="已繳費，記一筆"
                            aria-label="已繳費，記一筆"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => skipFixedCostThisMonth(cost)}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition"
                            title="本月略過"
                            aria-label="本月略過"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(cost)}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white active:scale-95 transition"
                        title="編輯"
                        aria-label="編輯"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(cost)}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-rose-950 text-slate-500 hover:text-rose-400 active:scale-95 transition"
                        title="刪除"
                        aria-label="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* 新增 / 編輯表單 */}
      <Modal
        isOpen={isFormOpen && Boolean(form)}
        onClose={closeForm}
        title={editing ? '編輯固定成本' : '新增固定成本'}
        icon={<CalendarClock className="w-5 h-5 text-emerald-400" />}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold whitespace-nowrap"
            >
              儲存
            </button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-400">名稱</span>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：房租、中華電信、Netflix"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block space-y-1 min-w-0">
                <span className="text-xs font-bold text-slate-400">每月金額</span>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="block space-y-1 min-w-0">
                <span className="text-xs font-bold text-slate-400">每月幾號扣款</span>
                <select
                  className={inputClass}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} 號{d >= 29 ? '（小月以月底計）' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-400">記入帳本</span>
              <select
                className={inputClass}
                value={form.ledgerKey}
                onChange={(e) => {
                  const opts = getOptionsForLedger(e.target.value);
                  setForm({
                    ...form,
                    ledgerKey: e.target.value,
                    tag: opts.tags.includes(form.tag) ? form.tag : opts.tags[0] || '',
                    paymentMethod: opts.payments.includes(form.paymentMethod)
                      ? form.paymentMethod
                      : opts.payments[0] || '',
                  });
                }}
              >
                <option value="personal">個人私帳</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}（群組共用）
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block space-y-1 min-w-0">
                <span className="text-xs font-bold text-slate-400">標籤</span>
                <select
                  className={inputClass}
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                >
                  <option value="">未歸類</option>
                  {formOptions.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 min-w-0">
                <span className="text-xs font-bold text-slate-400">付款方式</span>
                <select
                  className={inputClass}
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {formOptions.payments.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-400">分類</span>
              <select
                className={inputClass}
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5">
              <span className="text-sm text-slate-200">啟用提醒</span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-5 h-5 accent-emerald-500"
              />
            </label>
          </div>
        )}
      </Modal>

      {/* 刪除確認 */}
      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="刪除固定成本？"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingDelete) deleteFixedCost(pendingDelete);
                setPendingDelete(null);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold whitespace-nowrap"
            >
              刪除
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          將刪除「{pendingDelete?.title}」，之後不會再提醒。已記過的帳目不受影響。
        </p>
      </Modal>
    </div>
  );
};
