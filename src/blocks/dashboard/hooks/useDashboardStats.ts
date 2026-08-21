'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';

export function useDashboardStats() {
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
    selectedTagFilters,
    dateRangeFilter,
    searchQuery,
    getTagByKey,
    getTagByName,
  } = useAppStore();

  const weekStartDay = user.preferences?.weekStartDay ?? 1;
  const monthStartDay = user.preferences?.monthStartDay ?? 1;

  // 1. 週日期範圍計算
  const { startOfWeekStr, endOfWeekStr } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = (currentDay - weekStartDay + 7) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff + weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      startOfWeekStr: startOfWeek.toISOString().split('T')[0],
      endOfWeekStr: endOfWeek.toISOString().split('T')[0],
    };
  }, [weekStartDay, weekOffset]);

  // 2. 月記帳週期計算
  const { startOfMonthStr, endOfMonthStr, monthCycleTitle } = useMemo(() => {
    let startOfMonth: Date;
    let endOfMonth: Date;
    let title = `${calendarYear} 年 ${calendarMonth} 月`;
    if (monthStartDay === 1) {
      startOfMonth = new Date(calendarYear, calendarMonth - 1, 1);
      endOfMonth = new Date(calendarYear, calendarMonth, 0);
    } else {
      startOfMonth = new Date(calendarYear, calendarMonth - 2, monthStartDay);
      endOfMonth = new Date(calendarYear, calendarMonth - 1, monthStartDay - 1);
      title = `${calendarYear}年${calendarMonth}月帳期`;
    }
    startOfMonth.setHours(0, 0, 0, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    return {
      startOfMonthStr: startOfMonth.toISOString().split('T')[0],
      endOfMonthStr: endOfMonth.toISOString().split('T')[0],
      monthCycleTitle: title,
    };
  }, [calendarYear, calendarMonth, monthStartDay]);

  // 3. 依據檢視模式 + 子日期選取 + 標籤複選 + 日期區間 + 搜尋 篩選目標交易
  const activeTags = useMemo(
    () => selectedTagFilters.filter((t) => t && t !== 'all'),
    [selectedTagFilters]
  );
  const isTagFiltered = activeTags.length > 0;
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());
  const isSubDatesActive = selectedSubDates.length > 0;
  const isDateRangeFiltered =
    viewMode === 'list' && Boolean(dateRangeFilter?.startDate && dateRangeFilter?.endDate);

  const targetTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => {
      // 1. 日期過濾
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

      // 2. 標籤複選篩選
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
  }, [
    filteredTransactions,
    isSubDatesActive,
    selectedSubDates,
    viewMode,
    startOfWeekStr,
    endOfWeekStr,
    startOfMonthStr,
    endOfMonthStr,
    isDateRangeFiltered,
    dateRangeFilter,
    isTagFiltered,
    activeTags,
    getTagByKey,
    isSearchFiltered,
    searchQuery,
  ]);

  const totalExpense = useMemo(() => {
    return targetTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [targetTransactions]);

  // 4. 預算分配計算
  const currentTagBudgets =
    activeLedger === 'household' ? household?.tagBudgets : user?.tagBudgets;

  const specificTagBudget = useMemo(() => {
    if (!isTagFiltered || !currentTagBudgets) return undefined;
    return activeTags.reduce((sum, tag) => {
      const item = getTagByName(tag) || getTagByKey(tag);
      const amt =
        currentTagBudgets[tag] ??
        (item ? currentTagBudgets[item.id] ?? currentTagBudgets[item.name] : 0) ??
        0;
      return sum + amt;
    }, 0);
  }, [isTagFiltered, currentTagBudgets, activeTags, getTagByName, getTagByKey]);

  const defaultMonthlyBudget =
    activeLedger === 'household' && household?.monthlyBudget
      ? household.monthlyBudget
      : user?.monthlyBudget || 35000;

  const hasTagBudgetSet = isTagFiltered ? Boolean(specificTagBudget && specificTagBudget > 0) : true;
  const monthlyBudget = isTagFiltered ? (specificTagBudget || 0) : defaultMonthlyBudget;
  const weeklyBudget = Math.round(monthlyBudget / 4);

  // 歷史總預算計算
  const { historyBudget, historyBudgetDesc } = useMemo(() => {
    if (isDateRangeFiltered && dateRangeFilter?.startDate && dateRangeFilter?.endDate) {
      const days = Math.max(
        1,
        Math.round(
          (new Date(dateRangeFilter.endDate).getTime() -
            new Date(dateRangeFilter.startDate).getTime()) /
            86400000
        ) + 1
      );
      return {
        historyBudget: Math.round((monthlyBudget / 30) * days),
        historyBudgetDesc: `篩選區間共 ${days} 天預算額度`,
      };
    } else if (isSubDatesActive) {
      const days = selectedSubDates.length;
      return {
        historyBudget: Math.round((monthlyBudget / 30) * days),
        historyBudgetDesc: `已選 ${days} 天預算額度`,
      };
    } else {
      const distinctMonths = Array.from(
        new Set(
          filteredTransactions
            .map((tx) => tx.date.substring(0, 7))
            .filter((m) => Boolean(m) && m.length === 7)
        )
      );
      const count = Math.max(1, distinctMonths.length);
      return {
        historyBudget: count * monthlyBudget,
        historyBudgetDesc: `累計 ${count} 個月預算額度 (每月 NT$ ${monthlyBudget.toLocaleString()})`,
      };
    }
  }, [isDateRangeFiltered, dateRangeFilter, isSubDatesActive, selectedSubDates, monthlyBudget, filteredTransactions]);

  const effectiveBudget =
    viewMode === 'list' ? historyBudget : viewMode === 'week' ? weeklyBudget : monthlyBudget;

  const savedMoney = effectiveBudget - totalExpense;
  const remainingBudget = effectiveBudget > 0 ? Math.max(0, effectiveBudget - totalExpense) : 0;
  const budgetUsagePercent =
    effectiveBudget > 0
      ? Math.min(100, Math.round((totalExpense / effectiveBudget) * 100))
      : totalExpense > 0
      ? 100
      : 0;

  // 5. 標題與文案自適應
  const filterPrefix = useMemo(() => {
    if (activeTags.length === 1) return `#${activeTags[0]} `;
    if (activeTags.length > 1) return `[${activeTags.map((t) => '#' + t).join(' ')}] `;
    return '';
  }, [activeTags]);

  const expenseTitle = useMemo(() => {
    if (isSubDatesActive) return `${filterPrefix}已選 ${selectedSubDates.length} 天總支出`;
    if (activeLedger === 'household') {
      if (viewMode === 'list') {
        return isDateRangeFiltered && dateRangeFilter
          ? `${filterPrefix}群組區間總支出`
          : `${filterPrefix}群組歷史總支出`;
      }
      if (viewMode === 'week') return weekOffset === 0 ? `${filterPrefix}群組本週總支出` : `${filterPrefix}群組指定週總支出`;
      return `${filterPrefix}群組${monthCycleTitle}總支出`;
    }
    if (viewMode === 'list') {
      return isDateRangeFiltered && dateRangeFilter
        ? `${filterPrefix}區間總支出`
        : `${filterPrefix}歷史總支出`;
    }
    if (viewMode === 'week') return weekOffset === 0 ? `${filterPrefix}本週總支出` : `${filterPrefix}指定週總支出`;
    return `${filterPrefix}${monthCycleTitle}總支出`;
  }, [isSubDatesActive, selectedSubDates.length, filterPrefix, activeLedger, viewMode, isDateRangeFiltered, dateRangeFilter, weekOffset, monthCycleTitle]);

  const budgetTitle = useMemo(() => {
    if (isSubDatesActive) return `${filterPrefix}已選 ${selectedSubDates.length} 天總預算`;
    if (activeLedger === 'household') {
      if (viewMode === 'list') return `${filterPrefix}群組歷史總預算`;
      if (viewMode === 'week') return weekOffset === 0 ? `${filterPrefix}群組本週預算` : `${filterPrefix}群組指定週預算`;
      return `${filterPrefix}群組${monthCycleTitle}預算`;
    }
    if (viewMode === 'list') return `${filterPrefix}歷史總預算`;
    if (viewMode === 'week') return weekOffset === 0 ? `${filterPrefix}本週預算` : `${filterPrefix}指定週預算`;
    return `${filterPrefix}${monthCycleTitle}預算`;
  }, [isSubDatesActive, selectedSubDates.length, filterPrefix, activeLedger, viewMode, weekOffset, monthCycleTitle]);

  const savedMoneyTitle = useMemo(() => {
    const isOver = savedMoney < 0;
    if (isSubDatesActive) return isOver ? `${filterPrefix}已選天數已超支` : `${filterPrefix}已選天數已省下`;
    if (viewMode === 'list') return isOver ? `${filterPrefix}歷史累計已超支` : `${filterPrefix}歷史累計已省下`;
    if (viewMode === 'week') return isOver ? `${filterPrefix}本週已超支` : `${filterPrefix}本週已省下`;
    return isOver ? `${filterPrefix}本期已超支` : `${filterPrefix}本期已省下`;
  }, [savedMoney, isSubDatesActive, filterPrefix, viewMode]);

  return {
    targetTransactions,
    totalExpense,
    effectiveBudget,
    savedMoney,
    remainingBudget,
    budgetUsagePercent,
    historyBudgetDesc,
    hasTagBudgetSet,
    expenseTitle,
    budgetTitle,
    savedMoneyTitle,
    activeTags,
    isTagFiltered,
    isSubDatesActive,
    monthCycleTitle,
  };
}
