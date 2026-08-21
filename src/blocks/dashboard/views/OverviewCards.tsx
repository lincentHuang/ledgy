'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  TrendingDown,
  TrendingUp,
  CreditCard,
  DollarSign,
  Wallet,
  PiggyBank,
  ShieldAlert,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { Card, Button, ProgressBar } from '@/components';

export const OverviewCards: React.FC = () => {
  const {
    filteredTransactions,
    activeLedger,
    user,
    household,
    viewMode,
    weekOffset,
    calendarYear,
    calendarMonth,
    selectedSubDates,
    selectedTagFilter,
    selectedTagFilters,
    dateRangeFilter,
    searchQuery,
    getTagByKey,
    getTagByName,
    updateTransaction,
    deleteTransaction,
  } = useAppStore();

  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const weekStartDay = user.preferences?.weekStartDay ?? 1; // 0 = 週日, 1 = 週一 (預設), 6 = 週六
  const monthStartDay = user.preferences?.monthStartDay ?? 1; // 1 ~ 28

  // 1. 週日期範圍計算 (依據 weekOffset 與 weekStartDay)
  const now = new Date();
  const currentDay = now.getDay();
  const diff = (currentDay - weekStartDay + 7) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diff + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  // 2. 月記帳週期計算 (依據 calendarYear, calendarMonth 與 monthStartDay)
  let startOfMonth: Date;
  let endOfMonth: Date;
  let monthCycleTitle = `${calendarYear} 年 ${calendarMonth} 月`;
  if (monthStartDay === 1) {
    startOfMonth = new Date(calendarYear, calendarMonth - 1, 1);
    endOfMonth = new Date(calendarYear, calendarMonth, 0);
  } else {
    startOfMonth = new Date(calendarYear, calendarMonth - 2, monthStartDay);
    endOfMonth = new Date(calendarYear, calendarMonth - 1, monthStartDay - 1);
    monthCycleTitle = `${calendarYear}年${calendarMonth}月帳期`;
  }
  startOfMonth.setHours(0, 0, 0, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
  const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

  // 3. 依據檢視模式 + 子日期選取 + 標籤複選 + 日期區間 + 搜尋 篩選目標交易
  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());
  const isSubDatesActive = selectedSubDates.length > 0;
  const isDateRangeFiltered = viewMode === 'list' && Boolean(dateRangeFilter?.startDate && dateRangeFilter?.endDate);

  const targetTransactions = filteredTransactions.filter((tx) => {
    // 1. 日期過濾 (若在週/月中指定點選特定幾天，嚴格只計算該幾天；若無選取，預設為該區塊全部計算)
    if (isSubDatesActive) {
      if (!selectedSubDates.includes(tx.date)) return false;
    } else {
      if (viewMode === 'week') {
        if (tx.date < startOfWeekStr || tx.date > endOfWeekStr) return false;
      } else if (viewMode === 'month') {
        if (tx.date < startOfMonthStr || tx.date > endOfMonthStr) return false;
      } else if (isDateRangeFiltered && dateRangeFilter) {
        if (tx.date < dateRangeFilter.startDate || tx.date > dateRangeFilter.endDate) return false;
      }
    }

    // 2. 標籤複選篩選 (只要符合選中的任一標籤名稱或 key 即可)
    if (isTagFiltered) {
      const matchesTag =
        (tx.tags || []).some((t) => activeTags.includes(t)) ||
        (tx.tagIds || []).some((tid) => {
          const item = getTagByKey(tid);
          return activeTags.includes(tid) || (item && activeTags.includes(item.name));
        });
      if (!matchesTag) return false;
    }

    // 3. 搜尋字串篩選
    if (isSearchFiltered) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (tx.title || '').toLowerCase().includes(q) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
        (tx.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    return true;
  });

  const totalExpense = targetTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // 4. 預算分配計算 (支援全域預算或複選標籤合併之個別預算，支援 key 與 name 雙向對應)
  const currentTagBudgets =
    activeLedger === 'household' ? household?.tagBudgets : user?.tagBudgets;

  const specificTagBudget = isTagFiltered && currentTagBudgets
    ? activeTags.reduce((sum, tag) => {
        const item = getTagByName(tag) || getTagByKey(tag);
        const amt =
          currentTagBudgets[tag] ??
          (item ? currentTagBudgets[item.id] ?? currentTagBudgets[item.name] : 0) ??
          0;
        return sum + amt;
      }, 0)
    : undefined;

  const defaultMonthlyBudget =
    activeLedger === 'household' && household?.monthlyBudget
      ? household.monthlyBudget
      : user?.monthlyBudget || 35000;

  // 判斷該標籤是否有個別設定預算；若篩選標籤且未個別配置，預算應為 0 (而非 fallback 全域總預算)
  const hasTagBudgetSet = isTagFiltered ? Boolean(specificTagBudget && specificTagBudget > 0) : true;
  const monthlyBudget = isTagFiltered ? (specificTagBudget || 0) : defaultMonthlyBudget;
  const weeklyBudget = Math.round(monthlyBudget / 4);

  // 歷史總預算計算 (依據交易涵蓋的月份數、自訂天數或已選天數計算)
  let historyMonthsCount = 1;
  let historyBudget = monthlyBudget;
  let historyBudgetDesc = `累計 1 個月預算額度 (每月 NT$ ${monthlyBudget.toLocaleString()})`;

  if (isDateRangeFiltered && dateRangeFilter?.startDate && dateRangeFilter?.endDate) {
    const days = Math.max(1, Math.round((new Date(dateRangeFilter.endDate).getTime() - new Date(dateRangeFilter.startDate).getTime()) / 86400000) + 1);
    historyBudget = Math.round((monthlyBudget / 30) * days);
    historyBudgetDesc = `篩選區間共 ${days} 天預算額度`;
  } else if (isSubDatesActive) {
    const days = selectedSubDates.length;
    historyBudget = Math.round((monthlyBudget / 30) * days);
    historyBudgetDesc = `已選 ${days} 天預算額度`;
  } else {
    // 統計所有已記錄交易橫跨的不同月份 (例如 2026-07, 2026-08)
    const distinctMonths = Array.from(
      new Set(
        filteredTransactions
          .map((tx) => tx.date.substring(0, 7))
          .filter((m) => Boolean(m) && m.length === 7)
      )
    );
    historyMonthsCount = Math.max(1, distinctMonths.length);
    historyBudget = historyMonthsCount * monthlyBudget;
    historyBudgetDesc = `累計 ${historyMonthsCount} 個月預算額度 (每月 NT$ ${monthlyBudget.toLocaleString()})`;
  }

  const effectiveBudget =
    viewMode === 'list'
      ? historyBudget
      : viewMode === 'week'
      ? weeklyBudget
      : monthlyBudget;

  const savedMoney = effectiveBudget - totalExpense;
  const remainingBudget = effectiveBudget > 0 ? Math.max(0, effectiveBudget - totalExpense) : 0;
  const budgetUsagePercent =
    effectiveBudget > 0
      ? Math.min(100, Math.round((totalExpense / effectiveBudget) * 100))
      : totalExpense > 0
      ? 100
      : 0;

  // 5. 標題與文案依模式、子日期與標籤自適應
  const getFilterPrefix = () => {
    if (activeTags.length === 1) return `#${activeTags[0]} `;
    if (activeTags.length > 1) return `[${activeTags.map((t) => '#' + t).join(' ')}] `;
    return '';
  };

  const getExpenseTitle = () => {
    const prefix = getFilterPrefix();
    if (isSubDatesActive) {
      return `${prefix}已選 ${selectedSubDates.length} 天總支出`;
    }
    if (activeLedger === 'household') {
      if (viewMode === 'list') {
        return isDateRangeFiltered && dateRangeFilter
          ? `${prefix}群組區間總支出`
          : `${prefix}群組歷史總支出`;
      }
      if (viewMode === 'week') return weekOffset === 0 ? `${prefix}群組本週總支出` : `${prefix}群組指定週總支出`;
      return `${prefix}群組${monthCycleTitle}總支出`;
    }
    if (viewMode === 'list') {
      return isDateRangeFiltered && dateRangeFilter
        ? `${prefix}區間總支出`
        : `${prefix}歷史總支出`;
    }
    if (viewMode === 'week') return weekOffset === 0 ? `${prefix}本週總支出` : `${prefix}指定週總支出`;
    return `${prefix}${monthCycleTitle}總支出`;
  };

  const getBudgetTitle = () => {
    const prefix = getFilterPrefix();
    if (viewMode === 'list') {
      if (isDateRangeFiltered && dateRangeFilter) return `${prefix}區間總預算`;
      if (isSubDatesActive) return `${prefix}已選 ${selectedSubDates.length} 天總預算`;
      if (activeLedger === 'household') return `${prefix}群組歷史總預算`;
      return `${prefix}歷史總預算`;
    }
    if (activeLedger === 'household') {
      if (viewMode === 'week') return `${prefix}群組週預算`;
      return `${prefix}群組月預算`;
    }
    if (viewMode === 'week') return `${prefix}週目標預算`;
    return `${prefix}月目標預算`;
  };

  const getSavedMoneyTitle = () => {
    const prefix = getFilterPrefix();
    if (viewMode === 'list') {
      if (isDateRangeFiltered && dateRangeFilter) return `${prefix}區間省下的錢`;
      if (isSubDatesActive) return `${prefix}已選天數省下的錢`;
      if (activeLedger === 'household') return `${prefix}群組歷史省下的錢`;
      return `${prefix}歷史省下的錢`;
    }
    if (activeLedger === 'household') {
      if (viewMode === 'week') return `${prefix}群組週預算剩餘`;
      return `${prefix}群組月預算剩餘`;
    }
    if (viewMode === 'week') return `${prefix}週預算剩餘`;
    return `${prefix}月預算剩餘`;
  };

  const getExpenseMobileLabel = () => {
    if (isSubDatesActive) return `已選${selectedSubDates.length}天支出`;
    if (activeTags.length > 0) return `${activeTags.map((t) => '#' + t).join(' ')} 支出`;
    if (viewMode === 'list') return '歷史支出';
    if (viewMode === 'week') return '本週支出';
    return '本月支出';
  };

  const getMiddleMobileLabel = () => {
    if (viewMode === 'list') return activeTags.length > 0 ? `${activeTags.map((t) => '#' + t).join(' ')} 總預算` : '歷史總預算';
    return activeTags.length > 0 ? `${activeTags.map((t) => '#' + t).join(' ')} 預算` : viewMode === 'week' ? '本週預算' : '本月預算';
  };

  const getRightMobileLabel = () => {
    if (viewMode === 'list') return activeTags.length > 0 ? `${activeTags.map((t) => '#' + t).join(' ')} 省下` : '歷史省下';
    return activeTags.length > 0 ? `${activeTags.map((t) => '#' + t).join(' ')} 剩餘` : '預算剩餘';
  };

  // 尋找異常交易 (重複扣款等)
  const anomalies = filteredTransactions.filter((t) => t.isAnomaly);
  const currentAnomaly = anomalies[0];

  // ⏱️ 7 秒後自動淡出消除，或當異常被調整/刪除後自動消失
  useEffect(() => {
    if (anomalies.length > 0) {
      setIsAlertDismissed(false);
      const timer = setTimeout(() => {
        setIsAlertDismissed(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [anomalies.length]);

  const handleConfirmNormal = (txId: string) => {
    updateTransaction(txId, { isAnomaly: false, anomalyReason: '' });
    setIsAlertDismissed(true);
  };

  const handleDeleteDuplicate = (txId: string) => {
    deleteTransaction(txId);
    setIsAlertDismissed(true);
  };

  return (
    <div className="space-y-3">
      {/* ⚠️ AI 自動重複扣款/異常消費偵測警示 Banner */}
      {!isAlertDismissed && currentAnomaly && (
        <Card
          variant="panel"
          padding="md"
          className="border-amber-500/40 bg-amber-950/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  AI 疑似重複扣款偵測
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
                  NT$ {currentAnomaly.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentAnomaly.title} (
                {currentAnomaly.anomalyReason || '短時間內連續相同金額扣款'}
                )
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 一鍵確認無誤 */}
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleConfirmNormal(currentAnomaly.id)}
              leftIcon={<Check className="w-3 h-3 text-emerald-400" />}
              className="text-[11px]"
              title="確認此筆消費無誤，消除 AI 警示"
            >
              確認無誤
            </Button>

            {/* 一鍵刪除重複 */}
            <Button
              variant="danger"
              size="xs"
              onClick={() => handleDeleteDuplicate(currentAnomaly.id)}
              leftIcon={<Trash2 className="w-3 h-3 text-rose-400" />}
              className="text-[11px]"
              title="刪除這筆重複記帳"
            >
              刪除重複
            </Button>

            {/* 關閉按鈕 */}
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 transition ml-0.5"
              title="關閉此警示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      )}

      {/* 📱 手機版：超簡潔極窄單行 3 格資訊條 (依據 列表/週/月 模式切換) */}
      <Card variant="panel" padding="none" className="sm:hidden p-2.5 shadow-md">
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          {/* 1. 支出 */}
          <div className="px-1.5">
            <p className="text-[10px] font-bold text-slate-400">{getExpenseMobileLabel()}</p>
            <p className="text-xs font-black text-rose-400 font-mono mt-0.5 truncate">
              ${totalExpense.toLocaleString()}
            </p>
          </div>

          {/* 2. 中間欄：週/月模式為「本週/月目標預算」，列表模式為「歷史總預算」 */}
          <div className="px-1.5">
            <p className="text-[10px] font-bold text-slate-400">{getMiddleMobileLabel()}</p>
            <p className="text-xs font-black text-emerald-400 font-mono mt-0.5 truncate">
              ${effectiveBudget.toLocaleString()}
            </p>
          </div>

          {/* 3. 右側欄：週/月模式為「預算剩餘」，列表模式為「歷史省下」 */}
          <div className="px-1.5">
            <p className="text-[10px] font-bold text-slate-400">{getRightMobileLabel()}</p>
            <p
              className={`text-xs font-black font-mono mt-0.5 truncate ${
                savedMoney >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {savedMoney >= 0
                ? `+$${savedMoney.toLocaleString()}`
                : `-$${Math.abs(savedMoney).toLocaleString()}`}
            </p>
          </div>
        </div>
      </Card>

      {/* 💻 平板/桌面版：質感 3 大卡片 (週/月 模式：[總支出, 本週/月預算, 本週/月預算剩下]) */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3">
        {/* 1. 總支出卡片 */}
        <Card variant="panel" padding="md" className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">{getExpenseTitle()}</span>
            <div className="p-2 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-900/50">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-slate-100 font-mono">
              NT$ {totalExpense.toLocaleString()}
            </span>
          </div>

          {/* 進度條 (週/月模式) 或 交易筆數 (列表模式) */}
          <div className="pt-1">
            {viewMode === 'list' ? (
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>累計已記錄 {targetTransactions.length} 筆交易項目</span>
                <span className="text-emerald-400 font-bold">歷史全紀錄</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>
                    {effectiveBudget > 0 ? '預算消耗進度' : '未設定標籤預算'}
                  </span>
                  <span>
                    {effectiveBudget > 0
                      ? `已用 ${budgetUsagePercent}%`
                      : totalExpense > 0
                      ? `已花費 NT$ ${totalExpense.toLocaleString()}`
                      : '無上限限制'}
                  </span>
                </div>
                <ProgressBar
                  percentage={effectiveBudget > 0 ? budgetUsagePercent : 0}
                  height="sm"
                />
              </div>
            )}
          </div>
        </Card>

        {/* 2. 中間欄卡片：目標預算 / 歷史總預算 */}
        <Card variant="panel" padding="md" className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">{getBudgetTitle()}</span>
            <div className="p-2 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span
              className={`text-2xl font-black tracking-tight font-mono ${
                effectiveBudget > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              NT$ {effectiveBudget.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            {viewMode === 'list'
              ? historyBudgetDesc
              : isTagFiltered
              ? hasTagBudgetSet
                ? '🏷️ 已依標籤預算總表配置專屬額度'
                : '此標籤尚未設定預算 (可至設定配置)'
              : `由每月總預算 NT$ ${defaultMonthlyBudget.toLocaleString()} 計算`}
          </p>
        </Card>

        {/* 3. 右側欄卡片：歷史省下的錢 / 本週/月預算剩餘 */}
        <Card variant="panel" padding="md" className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">{getSavedMoneyTitle()}</span>
            <div className={`p-2 rounded-2xl border ${
              savedMoney >= 0
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
                : 'bg-rose-950/60 text-rose-400 border-rose-900/50'
            }`}>
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span
              className={`text-2xl font-black tracking-tight font-mono ${
                effectiveBudget === 0 && viewMode !== 'list'
                  ? 'text-slate-400'
                  : savedMoney >= 0
                  ? 'text-slate-100'
                  : 'text-rose-400'
              }`}
            >
              NT$ {savedMoney.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            {viewMode === 'list'
              ? savedMoney >= 0
                ? `🎉 累計省下 NT$ ${savedMoney.toLocaleString()}，支出控制在預算內`
                : `⚠️ 累計已超支 NT$ ${Math.abs(savedMoney).toLocaleString()}`
              : isTagFiltered && !hasTagBudgetSet
              ? totalExpense > 0
                ? `本月累計支出 NT$ ${totalExpense.toLocaleString()}`
                : '尚未設定獨立預算上限'
              : totalExpense > effectiveBudget
              ? `⚠️ 已超支 NT$ ${(totalExpense - effectiveBudget).toLocaleString()}`
              : budgetUsagePercent >= 80
              ? `⚠️ 接近上限 (剩餘 ${100 - budgetUsagePercent}%)`
              : `財務健康，剩餘 ${100 - budgetUsagePercent}% 額度`}
          </p>
        </Card>
      </div>
    </div>
  );
};

