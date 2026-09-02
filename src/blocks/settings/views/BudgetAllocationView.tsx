'use client';

import React, { useState, useMemo } from 'react';
import { TagItem } from '@app/shared';
import {
  DollarSign,
  Sparkles,
  PieChart,
  TrendingDown,
  AlertTriangle,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAppStore, DEFAULT_GROUP_TAG_ITEMS, normalizeTagItems, sanitizeTagBudgets } from '@/lib/store';
import { Card, Button, TagPill, ProgressBar, Badge, Input } from '@/components';

interface BudgetAllocationViewProps {
  type: 'personal' | 'household';
  householdId?: string;
}

export const BudgetAllocationView: React.FC<BudgetAllocationViewProps> = ({
  type,
  householdId,
}) => {
  const {
    user,
    household,
    households,
    filteredTransactions,
    availableTagItems,
    groupTagItems,
    availableTags,
    updateUserProfile,
    updateHousehold,
    settleMonthlyBudget,
  } = useAppStore();

  const targetHousehold = householdId
    ? households.find((h) => h.id === householdId) || household
    : household;

  // 1. 取得當前總預算與標籤預算表
  const initialTotalBudget =
    type === 'household'
      ? targetHousehold?.monthlyBudget || 40000
      : user.monthlyBudget || 35000;

  const rawTagBudgets: Record<string, number> =
    type === 'household'
      ? targetHousehold?.tagBudgets || {}
      : user.tagBudgets || {};

  const targetTagItems = useMemo(() => {
    if (type === 'household') {
      if (targetHousehold?.tagItems && targetHousehold.tagItems.length > 0) {
        return targetHousehold.tagItems;
      }
      if (targetHousehold?.tags && targetHousehold.tags.length > 0) {
        return normalizeTagItems(targetHousehold.tags, DEFAULT_GROUP_TAG_ITEMS);
      }
      return groupTagItems;
    }
    return availableTagItems;
  }, [type, targetHousehold, availableTagItems, groupTagItems]);

  // 規範化預算字典：將技術 ID 鍵值清理轉為標準標籤名稱，並剔除幽靈項目
  const initialTagBudgets = useMemo(() => {
    return sanitizeTagBudgets(rawTagBudgets, targetTagItems);
  }, [rawTagBudgets, targetTagItems]);

  const [totalBudget, setTotalBudget] = useState<number>(initialTotalBudget);
  const [tagBudgets, setTagBudgets] = useState<Record<string, number>>(initialTagBudgets);
  const [searchTag, setSearchTag] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 2. 本月已消費金額統計 (依標籤名稱與 tagIds)
  const currentMonth = new Date().toISOString().substring(0, 7);
  const tagSpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    const monthlyTxs = filteredTransactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth)
    );

    monthlyTxs.forEach((tx) => {
      (tx.tags || []).forEach((t) => {
        if (t) {
          map[t] = (map[t] || 0) + (Number(tx.amount) || 0);
        }
      });
      (tx.tagIds || []).forEach((tid) => {
        if (tid) {
          map[tid] = (map[tid] || 0) + (Number(tx.amount) || 0);
        }
      });
    });

    return map;
  }, [filteredTransactions, currentMonth]);

  // 3. 計算已分配與未分配預算
  const allocatedTotal = useMemo(() => {
    return targetTagItems.reduce((sum, item) => {
      const b = tagBudgets[item.name] ?? tagBudgets[item.id] ?? 0;
      return sum + (Number(b) || 0);
    }, 0);
  }, [tagBudgets, targetTagItems]);

  const remainingUnallocated = totalBudget - allocatedTotal;
  const allocationPercent = Math.round((allocatedTotal / (totalBudget || 1)) * 100);

  // 4. 更新單一標籤預算 (統一以乾淨標籤名稱為準，移除技術 ID 鍵值)
  const handleSetTagBudget = (tagItem: { id: string; name: string }, amount: number) => {
    setTagBudgets((prev) => {
      const next = { ...prev };
      delete next[tagItem.id];
      if (amount <= 0 || isNaN(amount)) {
        delete next[tagItem.name];
      } else {
        next[tagItem.name] = amount;
      }
      return next;
    });
  };

  // 5. 儲存設定 (同時更新全域設定與當月獨立紀錄)
  const handleSave = () => {
    const cleanBudgets = sanitizeTagBudgets(tagBudgets, targetTagItems);

    if (type === 'household' && targetHousehold) {
      updateHousehold(
        {
          monthlyBudget: totalBudget,
          tagBudgets: cleanBudgets,
        },
        targetHousehold.id
      );
      settleMonthlyBudget(currentMonth, totalBudget, cleanBudgets, targetHousehold.id);
    } else {
      updateUserProfile({
        monthlyBudget: totalBudget,
        tagBudgets: cleanBudgets,
      });
      settleMonthlyBudget(currentMonth, totalBudget, cleanBudgets);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // 6. 🤖 AI 智慧依歷史支出比例自動建議預算
  const handleAiAutoAllocate = () => {
    const expenseTxs = filteredTransactions.filter((tx) => tx.type === 'expense');
    if (expenseTxs.length === 0) {
      alert('目前尚無歷史支出數據，無法進行 AI 智慧推算。');
      return;
    }

    const tagHistTotal: Record<string, number> = {};
    let allHistSum = 0;

    expenseTxs.forEach((tx) => {
      (tx.tags || []).forEach((t) => {
        if (t) {
          tagHistTotal[t] = (tagHistTotal[t] || 0) + (Number(tx.amount) || 0);
          allHistSum += Number(tx.amount) || 0;
        }
      });
    });

    if (allHistSum === 0) return;

    // 保留 10% 彈性未分配預備金，將 90% 依歷史佔比分配給各標籤
    const targetPool = Math.round(totalBudget * 0.9);
    const newBudgets: Record<string, number> = {};

    targetTagItems.forEach((item) => {
      const spent = tagHistTotal[item.name] || tagHistTotal[item.id] || 0;
      if (spent > 0) {
        const ratio = spent / allHistSum;
        const suggested = Math.max(500, Math.round((targetPool * ratio) / 100) * 100);
        newBudgets[item.name] = suggested;
      }
    });

    setTagBudgets(newBudgets);
    alert('✨ AI 已依據您的過往消費佔比完成各標籤預算智慧試算！請檢視並點選儲存。');
  };

  // 篩選標籤列表
  const filteredTagItems = targetTagItems.filter((t) =>
    t.name.toLowerCase().includes(searchTag.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. 總預算配置卡片 */}
      <Card variant="panel" padding="md" className="space-y-4 shadow-sm border-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>{type === 'household' ? '群組公帳每月總預算' : '個人每月總預算'}</span>
                <Badge variant={type === 'household' ? 'purple' : 'emerald'} size="xs">
                  {type === 'household' ? 'GROUP BUDGET' : 'PERSONAL BUDGET'}
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                設定每月支出目標上限，並可將總額分配給各分類標籤
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={handleAiAutoAllocate}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-teal-400" />}
              className="text-teal-300 border-teal-500/30 hover:border-teal-500"
              title="依過往消費佔比自動推算各標籤預算"
            >
              AI 智慧分配建議
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={savedSuccess ? <Check className="w-3.5 h-3.5" /> : undefined}
              className="px-4"
            >
              {savedSuccess ? '已儲存！' : '儲存預算配置'}
            </Button>
          </div>
        </div>

        {/* 總預算輸入與快捷按鈕 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              每月總預算金額 (NT$)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2 text-base font-black font-mono rounded-xl glass-input text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              快速調整總預算
            </label>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[30000, 40000, 50000, 60000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTotalBudget(amt)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                    totalBudget === amt
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ${amt / 1000}k
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTotalBudget((prev) => prev + 5000)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-800"
              >
                +5,000
              </button>
            </div>
          </div>
        </div>

        {/* 2. 預算分配比例即時儀表條 */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">標籤預算分配進度</span>
              <span className="font-mono text-emerald-400 font-extrabold">
                已分配 NT$ {allocatedTotal.toLocaleString()} ({allocationPercent}%)
              </span>
            </div>
            <div className="text-slate-400 font-mono">
              {remainingUnallocated >= 0 ? (
                <span>剩餘彈性預備金：NT$ {remainingUnallocated.toLocaleString()}</span>
              ) : (
                <span className="text-rose-400 font-bold">
                  ⚠️ 超出總預算 NT$ {Math.abs(remainingUnallocated).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <ProgressBar
            percentage={allocationPercent}
            variant={remainingUnallocated < 0 ? 'auto' : 'emerald'}
            height="md"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span>
              已為 {Object.keys(tagBudgets).length} 個標籤設定專屬預算
            </span>
            <button
              onClick={() => setTagBudgets({})}
              className="text-slate-400 hover:text-rose-400 underline transition text-[11px]"
            >
              清空所有標籤預算
            </button>
          </div>
        </div>
      </Card>

      {/* 3. 各標籤預算分配列表 */}
      <Card variant="panel" padding="md" className="space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-sm text-white">標籤預算明細表 ({targetTagItems.length} 個標籤)</h4>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 標籤預算項目 Grid (自然展開，隨頁面整體滾動) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredTagItems.map((tagItem) => {
            const budget = tagBudgets[tagItem.name] ?? tagBudgets[tagItem.id] ?? 0;
            const spent = tagSpendingMap[tagItem.name] ?? tagSpendingMap[tagItem.id] ?? 0;
            const hasBudget = budget > 0;
            const usagePercent = hasBudget ? Math.round((spent / budget) * 100) : 0;
            const isOverBudget = hasBudget && spent > budget;
            const isNearLimit = hasBudget && !isOverBudget && usagePercent >= 75;

            return (
              <div
                key={tagItem.id}
                className={`p-3 rounded-2xl border transition-all ${
                  hasBudget
                    ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Top: Tag name & Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <TagPill tag={tagItem.name} active={hasBudget} />

                  <div className="flex items-center gap-1.5">
                    {hasBudget && (
                      <Badge
                        variant={isOverBudget ? 'rose' : isNearLimit ? 'amber' : 'emerald'}
                        size="xs"
                      >
                        {isOverBudget ? '超支' : isNearLimit ? '接近上限' : '正常'}
                      </Badge>
                    )}
                    {hasBudget && (
                      <button
                        type="button"
                        onClick={() => handleSetTagBudget(tagItem, 0)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                        title="清除此標籤預算"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle: Spending vs Budget Input */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400">
                    本月已花費：
                    <span className="font-mono font-bold text-slate-200 ml-1">
                      ${spent.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">預算:</span>
                    <input
                      type="number"
                      value={budget || ''}
                      onChange={(e) =>
                        handleSetTagBudget(tagItem, Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-700 bg-slate-950 text-emerald-400 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Bottom: Progress Bar */}
                {hasBudget && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>已用 {usagePercent}%</span>
                      <span>佔總預算 {Math.round((budget / (totalBudget || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverBudget
                            ? 'bg-rose-500'
                            : isNearLimit
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredTagItems.length === 0 && (
          <p className="text-center py-6 text-xs text-slate-400">找不到符合「{searchTag}」的標籤。</p>
        )}
      </Card>
    </div>
  );
};
