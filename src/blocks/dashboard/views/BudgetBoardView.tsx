'use client';

import React, { useState, useMemo } from 'react';
import { TagItem, Transaction } from '@app/shared';
import {
  PieChart,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Sliders,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  PiggyBank,
  Sparkles,
  ArrowLeft,
  Check,
  CreditCard,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  useAppStore,
  DEFAULT_GROUP_TAG_ITEMS,
  DEFAULT_TAG_ITEMS,
  normalizeTagItems,
  sanitizeTagBudgets,
  generateTagKey,
} from '@/lib/store';
import { Card, Button, Badge, ProgressBar, TagPill } from '@/components';

// 標籤圖示智慧對應表
const getTagIcon = (tagName: string) => {
  const name = tagName.toLowerCase();
  if (name.includes('食') || name.includes('餐') || name.includes('吃') || name.includes('飲料') || name.includes('咖啡'))
    return <Utensils className="w-4 h-4 text-amber-400" />;
  if (name.includes('行') || name.includes('車') || name.includes('交通') || name.includes('油') || name.includes('捷運'))
    return <Car className="w-4 h-4 text-sky-400" />;
  if (name.includes('住') || name.includes('房') || name.includes('水電') || name.includes('租') || name.includes('瓦斯'))
    return <Home className="w-4 h-4 text-indigo-400" />;
  if (name.includes('購') || name.includes('買') || name.includes('衣') || name.includes('物') || name.includes('超商'))
    return <ShoppingBag className="w-4 h-4 text-pink-400" />;
  if (name.includes('樂') || name.includes('玩') || name.includes('娛樂') || name.includes('遊戲') || name.includes('電影'))
    return <Gamepad2 className="w-4 h-4 text-purple-400" />;
  if (name.includes('醫') || name.includes('藥') || name.includes('健') || name.includes('診'))
    return <HeartPulse className="w-4 h-4 text-rose-400" />;
  if (name.includes('育') || name.includes('學') || name.includes('書') || name.includes('課'))
    return <GraduationCap className="w-4 h-4 text-emerald-400" />;
  if (name.includes('工') || name.includes('薪') || name.includes('商') || name.includes('公務'))
    return <Briefcase className="w-4 h-4 text-cyan-400" />;
  return <PieChart className="w-4 h-4 text-teal-400" />;
};

export interface BudgetBoardViewProps {
  onBack?: () => void;
  onOpenQuickInput?: () => void;
  onManageBudget?: () => void;
  type?: 'personal' | 'household';
  householdId?: string;
  embedded?: boolean; // 若嵌入在設定頁中
}

type BoardLayoutMode = 'kanban' | 'grid';
type SortOption = 'usage' | 'spent' | 'budget' | 'name';

interface TagBudgetHealth {
  tagItem: TagItem;
  budget: number;
  spent: number;
  remaining: number;
  overAmount: number;
  usagePercent: number;
  hasBudget: boolean;
  status: 'over' | 'warning' | 'safe' | 'unused' | 'unbudgeted';
  txs: Transaction[];
  dailyAllowance?: number;
}

export const BudgetBoardView: React.FC<BudgetBoardViewProps> = ({
  onBack,
  onOpenQuickInput,
  onManageBudget,
  type: propType,
  householdId,
  embedded = false,
}) => {
  const {
    user,
    household,
    households,
    activeLedger,
    filteredTransactions,
    availableTagItems,
    groupTagItems,
    updateUserProfile,
    updateHousehold,
    settleMonthlyBudget,
  } = useAppStore();

  // 1. 決定帳本模式 (個人私帳 或 群組公帳)
  const currentLedgerType = propType || (activeLedger === 'household' ? 'household' : 'personal');
  const targetHousehold = householdId
    ? households.find((h) => h.id === householdId) || household
    : household;

  // 2. 月份導航狀態 (預設當前西元年月份，格式 YYYY-MM)
  const realCurrentMonth = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(realCurrentMonth);

  // 檢視模式與排序/搜尋
  const [boardLayout, setBoardLayout] = useState<BoardLayoutMode>('kanban');
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);

  // 快速微調預算狀態
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; amount: number } | null>(null);

  // 3. 切換月份邏輯
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
    setExpandedTagId(null);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
    setExpandedTagId(null);
  };

  const handleResetCurrentMonth = () => {
    setSelectedMonth(realCurrentMonth);
    setExpandedTagId(null);
  };

  // 4. 計算月份天數與時間燃盡率 (Burn Rate / Pacing)
  const pacingStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const isThisMonth = selectedMonth === realCurrentMonth;

    let daysPassed = totalDays;
    let daysRemaining = 0;

    if (isThisMonth) {
      const todayDate = new Date().getDate();
      daysPassed = Math.min(todayDate, totalDays);
      daysRemaining = Math.max(0, totalDays - todayDate);
    } else if (selectedMonth < realCurrentMonth) {
      daysPassed = totalDays;
      daysRemaining = 0;
    } else {
      daysPassed = 0;
      daysRemaining = totalDays;
    }

    const timeProgressPercent = Math.round((daysPassed / totalDays) * 100);

    return {
      year,
      month,
      totalDays,
      daysPassed,
      daysRemaining,
      timeProgressPercent,
      isThisMonth,
    };
  }, [selectedMonth, realCurrentMonth]);

  // 5. 取得標籤池與預算快照
  const targetTagItems = useMemo(() => {
    if (currentLedgerType === 'household') {
      if (targetHousehold?.tagItems && targetHousehold.tagItems.length > 0) {
        return targetHousehold.tagItems;
      }
      if (targetHousehold?.tags && targetHousehold.tags.length > 0) {
        return normalizeTagItems(targetHousehold.tags, DEFAULT_GROUP_TAG_ITEMS);
      }
      return groupTagItems;
    }
    return availableTagItems.length > 0 ? availableTagItems : DEFAULT_TAG_ITEMS;
  }, [currentLedgerType, targetHousehold, availableTagItems, groupTagItems]);

  // 取得月度預算與標籤配額 (若該月已有 settleMonthlyBudget 結算 snapshot 則優先讀取，否則 fallback 當前設定)
  const monthlyBudgetRecord = useMemo(() => {
    const monthlyBudgets =
      currentLedgerType === 'household'
        ? targetHousehold?.monthlyBudgets
        : user.monthlyBudgets;

    const snapshot = monthlyBudgets?.[selectedMonth];
    if (snapshot) {
      return {
        totalBudget: snapshot.totalBudget,
        tagBudgets: sanitizeTagBudgets(snapshot.tagBudgets || {}, targetTagItems),
        isSettled: Boolean(snapshot.isSettled),
      };
    }

    const fallbackTotal =
      currentLedgerType === 'household'
        ? targetHousehold?.monthlyBudget || 40000
        : user.monthlyBudget || 35000;

    const fallbackTagBudgets =
      currentLedgerType === 'household'
        ? targetHousehold?.tagBudgets || {}
        : user.tagBudgets || {};

    return {
      totalBudget: fallbackTotal,
      tagBudgets: sanitizeTagBudgets(fallbackTagBudgets, targetTagItems),
      isSettled: false,
    };
  }, [currentLedgerType, targetHousehold, user, selectedMonth, targetTagItems]);

  // 6. 統計該月所有支出交易 (依標籤歸類)
  const monthTransactions = useMemo(() => {
    return filteredTransactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(selectedMonth)
    );
  }, [filteredTransactions, selectedMonth]);

  // 7. 計算各標籤健康指標與綜合大盤
  const {
    allHealthList,
    totalSpent,
    totalBudget,
    allocatedBudgetTotal,
    remainingTotalBudget,
    overallUsagePercent,
    dailyAllowanceAvg,
    overList,
    warningList,
    safeList,
    unusedList,
    unbudgetedList,
  } = useMemo(() => {
    const totalBud = monthlyBudgetRecord.totalBudget;
    const tagBudgets = monthlyBudgetRecord.tagBudgets;

    // 計算各標籤支出與對應交易陣列
    const tagTxsMap: Record<string, Transaction[]> = {};
    const tagSpentMap: Record<string, number> = {};
    let totalExp = 0;

    monthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      totalExp += amt;

      const matchedNames: string[] = [];
      (tx.tags || []).forEach((t) => {
        if (t && !matchedNames.includes(t)) matchedNames.push(t);
      });
      (tx.tagIds || []).forEach((tid) => {
        if (tid && !matchedNames.includes(tid)) matchedNames.push(tid);
      });

      if (matchedNames.length === 0) {
        matchedNames.push('未歸類');
      }

      matchedNames.forEach((key) => {
        tagSpentMap[key] = (tagSpentMap[key] || 0) + amt;
        if (!tagTxsMap[key]) tagTxsMap[key] = [];
        tagTxsMap[key].push(tx);
      });
    });

    // 建立所有已知標籤的健康指標清單
    const healthList: TagBudgetHealth[] = targetTagItems.map((item) => {
      const budget = tagBudgets[item.name] ?? tagBudgets[item.id] ?? 0;
      const spent = tagSpentMap[item.name] ?? tagSpentMap[item.id] ?? 0;
      const hasBudget = budget > 0;
      const remaining = hasBudget ? Math.max(0, budget - spent) : 0;
      const overAmount = hasBudget ? Math.max(0, spent - budget) : 0;
      const usagePercent = hasBudget ? Math.round((spent / budget) * 100) : spent > 0 ? 100 : 0;

      // 取得該標籤本月交易紀錄
      const txs = tagTxsMap[item.name] || tagTxsMap[item.id] || [];

      // 剩餘天數平均每日可用
      const dailyAllowance =
        hasBudget && pacingStats.daysRemaining > 0 && remaining > 0
          ? Math.round(remaining / pacingStats.daysRemaining)
          : undefined;

      let status: TagBudgetHealth['status'] = 'unused';
      if (!hasBudget) {
        status = spent > 0 ? 'unbudgeted' : 'unused';
      } else if (spent > budget) {
        status = 'over';
      } else if (usagePercent >= 70) {
        status = 'warning';
      } else if (spent > 0) {
        status = 'safe';
      } else {
        status = 'unused';
      }

      return {
        tagItem: item,
        budget,
        spent,
        remaining,
        overAmount,
        usagePercent,
        hasBudget,
        status,
        txs,
        dailyAllowance,
      };
    });

    // 計算總分配預算
    const allocatedTotal = healthList.reduce((sum, h) => sum + h.budget, 0);
    const remTotal = totalBud - totalExp;
    const overallPercent = Math.round((totalExp / (totalBud || 1)) * 100);
    const dailyAvg =
      pacingStats.daysRemaining > 0 && remTotal > 0
        ? Math.round(remTotal / pacingStats.daysRemaining)
        : 0;

    // 分欄分組
    const over = healthList.filter((h) => h.status === 'over');
    const warning = healthList.filter((h) => h.status === 'warning');
    const safe = healthList.filter((h) => h.status === 'safe');
    const unused = healthList.filter((h) => h.status === 'unused' && h.hasBudget);
    const unbudgeted = healthList.filter((h) => h.status === 'unbudgeted');

    return {
      allHealthList: healthList,
      totalSpent: totalExp,
      totalBudget: totalBud,
      allocatedBudgetTotal: allocatedTotal,
      remainingTotalBudget: remTotal,
      overallUsagePercent: overallPercent,
      dailyAllowanceAvg: dailyAvg,
      overList: over,
      warningList: warning,
      safeList: safe,
      unusedList: unused,
      unbudgetedList: unbudgeted,
    };
  }, [
    monthlyBudgetRecord,
    targetTagItems,
    monthTransactions,
    pacingStats.daysRemaining,
  ]);

  // 8. 篩選與排序邏輯 (用於網格模式或搜尋)
  const filteredAndSortedList = useMemo(() => {
    let list = allHealthList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((h) => h.tagItem.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'usage') return b.usagePercent - a.usagePercent;
      if (sortBy === 'spent') return b.spent - a.spent;
      if (sortBy === 'budget') return b.budget - a.budget;
      if (sortBy === 'name') return a.tagItem.name.localeCompare(b.tagItem.name);
      return 0;
    });
  }, [allHealthList, searchQuery, sortBy]);

  // 9. 即時微調標籤預算並儲存
  const handleSaveTagBudget = (tagItem: TagItem, newAmount: number) => {
    const updatedTagBudgets = { ...monthlyBudgetRecord.tagBudgets };
    delete updatedTagBudgets[tagItem.id];

    if (newAmount <= 0) {
      delete updatedTagBudgets[tagItem.name];
    } else {
      updatedTagBudgets[tagItem.name] = newAmount;
    }

    const clean = sanitizeTagBudgets(updatedTagBudgets, targetTagItems);

    if (currentLedgerType === 'household' && targetHousehold) {
      updateHousehold(
        {
          tagBudgets: clean,
        },
        targetHousehold.id
      );
      settleMonthlyBudget(selectedMonth, totalBudget, clean, targetHousehold.id);
    } else {
      updateUserProfile({
        tagBudgets: clean,
      });
      settleMonthlyBudget(selectedMonth, totalBudget, clean);
    }

    setEditingTag(null);
  };

  // 渲染個別預算卡片
  const renderBudgetCard = (item: TagBudgetHealth) => {
    const isExpanded = expandedTagId === item.tagItem.id;
    const isEditing = editingTag?.id === item.tagItem.id;

    // 依狀態定義卡片樣式
    const statusConfig = {
      over: {
        border: 'border-rose-500/50 bg-rose-950/20 shadow-rose-950/20',
        badge: 'rose' as const,
        label: '嚴重超支',
        textColor: 'text-rose-400',
        barColor: 'bg-rose-500',
      },
      warning: {
        border: 'border-amber-500/50 bg-amber-950/20 shadow-amber-950/20',
        badge: 'amber' as const,
        label: '接近上限',
        textColor: 'text-amber-400',
        barColor: 'bg-amber-500',
      },
      safe: {
        border: 'border-emerald-500/30 bg-slate-900/90 shadow-emerald-950/20',
        badge: 'emerald' as const,
        label: '安全健康',
        textColor: 'text-emerald-400',
        barColor: 'bg-emerald-500',
      },
      unused: {
        border: 'border-slate-800 bg-slate-950/50',
        badge: 'slate' as const,
        label: '未動用',
        textColor: 'text-slate-400',
        barColor: 'bg-slate-700',
      },
      unbudgeted: {
        border: 'border-sky-500/30 bg-sky-950/10',
        badge: 'sky' as const,
        label: '未設預算',
        textColor: 'text-sky-400',
        barColor: 'bg-sky-600',
      },
    }[item.status];

    return (
      <div
        key={item.tagItem.id}
        className={`p-3.5 rounded-2xl border transition-all duration-200 shadow-lg ${statusConfig.border}`}
      >
        {/* Top: 標籤名稱、圖示與狀態標籤 */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 flex-shrink-0">
              {getTagIcon(item.tagItem.name)}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-white truncate block">
                #{item.tagItem.name}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {item.txs.length} 筆消費
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={statusConfig.badge} size="xs">
              {statusConfig.label}
            </Badge>

            {/* 展開明細按鈕 */}
            {item.txs.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandedTagId(isExpanded ? null : item.tagItem.id)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title={isExpanded ? '收合支出明細' : '展開檢視支出明細'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Middle: 金額與進度資訊 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-baseline justify-between text-xs">
            <div className="text-slate-400">
              已花費{' '}
              <span className={`font-mono font-black text-sm ${statusConfig.textColor}`}>
                NT$ {item.spent.toLocaleString()}
              </span>
            </div>

            <div className="text-slate-300 font-mono text-[11px]">
              {item.hasBudget ? (
                <span>
                  預算 NT$ <span className="font-bold">{item.budget.toLocaleString()}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setEditingTag({
                      id: item.tagItem.id,
                      name: item.tagItem.name,
                      amount: item.spent > 0 ? Math.ceil(item.spent / 500) * 500 : 3000,
                    })
                  }
                  className="text-teal-400 hover:text-teal-300 underline font-bold transition flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> 設定預算
                </button>
              )}
            </div>
          </div>

          {/* 進度條 */}
          {item.hasBudget && (
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${statusConfig.barColor}`}
                  style={{ width: `${Math.min(100, item.usagePercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>
                  {item.status === 'over' ? (
                    <span className="text-rose-400 font-bold">
                      超支 +NT$ {item.overAmount.toLocaleString()} ({item.usagePercent}%)
                    </span>
                  ) : (
                    <span>
                      已用 {item.usagePercent}% · 剩餘 NT$ {item.remaining.toLocaleString()}
                    </span>
                  )}
                </span>

                {item.dailyAllowance !== undefined && item.status !== 'over' && (
                  <span className="text-emerald-400 font-bold">
                    每日約 ${item.dailyAllowance}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 快速微調預算列 */}
          {isEditing ? (
            <div className="pt-2 border-t border-white/5 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">調整每月預算：</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTag((prev) =>
                        prev ? { ...prev, amount: Math.max(0, prev.amount - 500) } : null
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                  >
                    -500
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTag((prev) =>
                        prev ? { ...prev, amount: prev.amount + 500 } : null
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                  >
                    +500
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTag((prev) =>
                        prev ? { ...prev, amount: prev.amount + 1000 } : null
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-mono"
                  >
                    +1k
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={editingTag?.amount ?? ''}
                  onChange={(e) =>
                    setEditingTag((prev) =>
                      prev ? { ...prev, amount: Math.max(0, Number(e.target.value)) } : null
                    )
                  }
                  placeholder="輸入預算金額"
                  className="flex-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => handleSaveTagBudget(item.tagItem, editingTag?.amount || 0)}
                  leftIcon={<Check className="w-3 h-3" />}
                >
                  儲存
                </Button>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setEditingTag(null)}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() =>
                  setEditingTag({
                    id: item.tagItem.id,
                    name: item.tagItem.name,
                    amount: item.budget,
                  })
                }
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                title="快速微調此預算額度"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>微調額度</span>
              </button>
            </div>
          )}
        </div>

        {/* 展開：穿透式支出明細抽屜 (Drilldown) */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
              <span className="font-bold text-slate-300">本月支出紀錄明細</span>
              <span className="font-mono text-emerald-400">
                共 {item.txs.length} 筆 · 合計 NT$ {item.spent.toLocaleString()}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 overscroll-contain">
              {item.txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800/60 text-xs hover:border-slate-700 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-200 truncate">
                      {tx.title || tx.merchant || '日常消費'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <span>{tx.date}</span>
                      {tx.paymentMethod && (
                        <span>· {tx.paymentMethod}</span>
                      )}
                    </div>
                  </div>

                  <div className="font-mono font-extrabold text-rose-400 flex-shrink-0">
                    -NT$ {Number(tx.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. 頂部大盤標題列與月份切換器 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {!embedded && onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
              title="返回總覽"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex-shrink-0">
            <PieChart className="w-5 h-5" />
          </div>

          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <span>預算看板模式</span>
              <Badge variant={currentLedgerType === 'household' ? 'purple' : 'emerald'} size="xs">
                {currentLedgerType === 'household' ? 'GROUP KANBAN' : 'PERSONAL KANBAN'}
              </Badge>
            </h2>
            <p className="text-xs text-slate-400">
              各分類預算執行狀態、超支預警與每日限額一目了然
            </p>
          </div>
        </div>

        {/* 月份導航器 */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="上一月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-mono font-extrabold text-slate-200">
              {pacingStats.year} 年 {pacingStats.month} 月
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="下一月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!pacingStats.isThisMonth && (
            <button
              type="button"
              onClick={handleResetCurrentMonth}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 text-xs font-bold transition"
            >
              當月
            </button>
          )}

          {onManageBudget && (
            <Button
              size="sm"
              variant="glass"
              onClick={onManageBudget}
              leftIcon={<Sliders className="w-3.5 h-3.5 text-emerald-400" />}
              className="text-xs"
            >
              分配總表
            </Button>
          )}
        </div>
      </div>

      {/* 2. 總預算戰情室指標卡片 (Top Pacing & Burn Rate Dashboard) */}
      <Card variant="panel" padding="md" className="space-y-4 border-emerald-500/20 shadow-xl">
        {/* 指標概覽 3 欄 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* A. 總預算 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>每月總目標預算</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono font-black text-xl text-white">
              NT$ {totalBudget.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">
              標籤已配置 NT$ {allocatedBudgetTotal.toLocaleString()}
            </div>
          </div>

          {/* B. 本月累計支出 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>本月累計總支出</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-mono font-black text-xl text-amber-400">
              NT$ {totalSpent.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">
              消耗率 {overallUsagePercent}% ({monthTransactions.length} 筆支出)
            </div>
          </div>

          {/* C. 預算剩餘 / 超支與建議每日限額 */}
          <div
            className={`p-3 rounded-2xl border space-y-1 ${
              remainingTotalBudget >= 0
                ? 'bg-slate-950/70 border-slate-800'
                : 'bg-rose-950/40 border-rose-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>{remainingTotalBudget >= 0 ? '預算總剩餘額度' : '⚠️ 已超出總預算'}</span>
              <PiggyBank
                className={`w-3.5 h-3.5 ${
                  remainingTotalBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              />
            </div>
            <div
              className={`font-mono font-black text-xl ${
                remainingTotalBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              NT$ {Math.abs(remainingTotalBudget).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              {pacingStats.daysRemaining > 0 && remainingTotalBudget > 0 ? (
                <span>剩餘 {pacingStats.daysRemaining} 天 · 建議每日 ≤ ${dailyAllowanceAvg}</span>
              ) : remainingTotalBudget < 0 ? (
                <span className="text-rose-400">請審視各項支出並節制花費</span>
              ) : (
                <span>本月帳期已到期結算</span>
              )}
            </div>
          </div>
        </div>

        {/* 燃盡率步調進度條 (時間進度 vs 預算進度) */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-bold">時間步調與預算燃盡對比</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              {pacingStats.isThisMonth ? (
                <span>
                  本月第 {pacingStats.daysPassed}/{pacingStats.totalDays} 天 (時間已過 {pacingStats.timeProgressPercent}%)
                </span>
              ) : (
                <span>月份結算已完成 (100%)</span>
              )}
            </div>
          </div>

          {/* 雙層進度指示 */}
          <div className="space-y-1">
            <ProgressBar
              percentage={overallUsagePercent}
              variant={remainingTotalBudget < 0 ? 'auto' : 'emerald'}
              height="md"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>預算已消耗 {overallUsagePercent}%</span>
              <span>
                {pacingStats.isThisMonth
                  ? overallUsagePercent <= pacingStats.timeProgressPercent
                    ? '👏 花費步調良好（低於時間進度）'
                    : '⚠️ 預算消耗略快（高於時間進度）'
                  : '歷史紀錄'}
              </span>
            </div>
          </div>
        </div>

        {/* 即時健康度膠囊分類統計 (Status Counter Pills) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
          <span className="text-slate-400 text-[11px] font-bold">看板分類統計：</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              嚴重超支 {overList.length} 項
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              接近上限 {warningList.length} 項
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              安全寬裕 {safeList.length} 項
            </span>
            {unusedList.length > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
                未動用 {unusedList.length} 項
              </span>
            )}
            {unbudgetedList.length > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-teal-950/80 border border-teal-800 text-teal-300 font-mono text-[11px]">
                未設預算 {unbudgetedList.length} 項
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 3. 看板檢視工具列 (看板分欄 vs 網格全覽切換 & 搜尋 & 排序) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* 檢視模式切換 */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setBoardLayout('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              boardLayout === 'kanban'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>看板分欄模式</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardLayout('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              boardLayout === 'grid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>網格大盤模式</span>
          </button>
        </div>

        {/* 搜尋與排序 */}
        <div className="flex items-center gap-2">
          {boardLayout === 'grid' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none"
              >
                <option value="usage" className="bg-slate-900">依使用率 (高→低)</option>
                <option value="spent" className="bg-slate-900">依已支出 (高→低)</option>
                <option value="budget" className="bg-slate-900">依預算金額</option>
                <option value="name" className="bg-slate-900">依標籤名稱</option>
              </select>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-40 sm:w-48 px-3 py-1.5 pl-8 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. 看板模式主內容 */}
      {boardLayout === 'kanban' ? (
        <div className="space-y-4">
          {/* 三大核心看板分欄 (Kanban Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* 🔴 欄位 1: 超支警報欄 (Over Budget) */}
            <div className="space-y-3 bg-slate-950/60 p-3 rounded-3xl border border-rose-900/40">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-rose-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="font-extrabold text-sm text-rose-300">🔴 超支警報</h3>
                </div>
                <Badge variant="rose" size="xs">
                  {overList.length} 項
                </Badge>
              </div>

              {overList.length > 0 ? (
                <div className="space-y-2.5">
                  {overList.map((item) => renderBudgetCard(item))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-500 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/60 mx-auto mb-1.5" />
                  目前無任何超支項目，控制良好！
                </div>
              )}
            </div>

            {/* 🟡 欄位 2: 接近上限欄 (Warning) */}
            <div className="space-y-3 bg-slate-950/60 p-3 rounded-3xl border border-amber-900/40">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-amber-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="font-extrabold text-sm text-amber-300">🟡 接近上限 (≥70%)</h3>
                </div>
                <Badge variant="amber" size="xs">
                  {warningList.length} 項
                </Badge>
              </div>

              {warningList.length > 0 ? (
                <div className="space-y-2.5">
                  {warningList.map((item) => renderBudgetCard(item))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-500 text-xs">
                  目前無接近上限項目
                </div>
              )}
            </div>

            {/* 🟢 欄位 3: 安全寬裕欄 (Safe) */}
            <div className="space-y-3 bg-slate-950/60 p-3 rounded-3xl border border-emerald-900/40">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-emerald-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-extrabold text-sm text-emerald-300">🟢 安全寬裕 (&lt;70%)</h3>
                </div>
                <Badge variant="emerald" size="xs">
                  {safeList.length} 項
                </Badge>
              </div>

              {safeList.length > 0 ? (
                <div className="space-y-2.5">
                  {safeList.map((item) => renderBudgetCard(item))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 text-slate-500 text-xs">
                  尚無安全寬裕項目
                </div>
              )}
            </div>
          </div>

          {/* ⚪ 次要分欄：未動用預算 & 未設定預算但有消費 (可折疊收納) */}
          {(unusedList.length > 0 || unbudgetedList.length > 0) && (
            <Card variant="panel" padding="md" className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-300">
                    其他標籤狀況 (尚未動用 {unusedList.length} 項 · 未設預算 {unbudgetedList.length} 項)
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {unbudgetedList.map((item) => renderBudgetCard(item))}
                {unusedList.map((item) => renderBudgetCard(item))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* 🗂️ 網格全盤大盤模式 (Grid Mode) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAndSortedList.map((item) => renderBudgetCard(item))}

          {filteredAndSortedList.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              找不到符合「{searchQuery}」的標籤項目
            </div>
          )}
        </div>
      )}
    </div>
  );
};
