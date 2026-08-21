'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Search,
  Tag,
  Users,
  Wallet,
  Trash2,
  Edit2,
  Sparkles,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  Briefcase,
  Calendar,
  List,
  CalendarDays,
  CreditCard,
  Plus,
  X,
  Check,
  CheckSquare,
} from 'lucide-react';
import { Transaction } from '@app/shared';
import { WeekView } from './WeekView';
import { MonthCalendarView } from './MonthCalendarView';
import { OverviewCards } from './OverviewCards';
import { Button, TagPill, SegmentedControl, Input, Card } from '@/components';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Users,
  MoreHorizontal,
  Briefcase,
};

export const TransactionList: React.FC<{ onOpenQuickInput: () => void }> = ({
  onOpenQuickInput,
}) => {
  const {
    filteredTransactions,
    currentPaymentMethods,
    currentTagItems,
    currentTags,
    getTagByKey,
    getTagByName,
    deleteTransaction,
    deleteTransactions,
    updateTransaction,
    viewMode,
    setViewMode,
    selectedTagFilter,
    selectedTagFilters,
    setSelectedTagFilters,
    toggleTagFilter,
    dateRangeFilter,
    setDateRangeFilter,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  // ✏️ 快速勾選與批次管理狀態
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [batchSelectedTags, setBatchSelectedTags] = useState<string[]>([]);
  const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
  const [batchTargetDate, setBatchTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // 📅 日期區間篩選彈窗狀態
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(
    dateRangeFilter?.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [tempEndDate, setTempEndDate] = useState(
    dateRangeFilter?.endDate || new Date().toISOString().split('T')[0]
  );

  // 標籤與區間有效狀態
  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const isDateFiltered = Boolean(dateRangeFilter?.startDate && dateRangeFilter?.endDate);
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());
  const isAnyFilterActive = isTagFiltered || isDateFiltered || isSearchFiltered;

  // 篩選列表
  const displayList = filteredTransactions.filter((tx) => {
    const title = tx.title || '';
    const merchant = tx.merchant || '';
    const tags = Array.isArray(tx.tags) ? tx.tags : [];
    const q = (searchQuery || '').toLowerCase();

    // 1. 搜尋篩選
    if (isSearchFiltered) {
      const matchesSearch =
        title.toLowerCase().includes(q) ||
        merchant.toLowerCase().includes(q) ||
        tags.some((t) => (t || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // 2. 標籤複選篩選 (符合任意一個已勾選標籤名稱或 key)
    if (isTagFiltered) {
      const matchesTag =
        tags.some((t) => activeTags.includes(t)) ||
        (tx.tagIds || []).some((tid) => {
          const item = getTagByKey(tid);
          return activeTags.includes(tid) || (item && activeTags.includes(item.name));
        });
      if (!matchesTag) return false;
    }

    // 3. 日期區間篩選
    if (isDateFiltered && dateRangeFilter) {
      if (tx.date < dateRangeFilter.startDate || tx.date > dateRangeFilter.endDate) {
        return false;
      }
    }

    return true;
  });

  // 計算已篩選列表的總支出與各標籤小計統計
  const totalFilteredExpense = displayList
    .filter((t) => t.type !== 'income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // 標籤佔比小計計算
  const tagBreakdown = activeTags.map((tag) => {
    const tagTxs = displayList.filter((tx) => (tx.tags || []).includes(tag));
    const tagSum = tagTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const percent = totalFilteredExpense > 0 ? Math.round((tagSum / totalFilteredExpense) * 100) : 0;
    return { tag, count: tagTxs.length, sum: tagSum, percent };
  });

  const groupedByDate: Record<string, Transaction[]> = {};
  displayList.forEach((tx) => {
    if (!groupedByDate[tx.date]) {
      groupedByDate[tx.date] = [];
    }
    groupedByDate[tx.date].push(tx);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const getCategoryIcon = (iconName?: string) => {
    const IconComp = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : Utensils;
    return <IconComp className="w-4 h-4" />;
  };

  const toggleSelectTx = (id: string) => {
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((x) => x !== id));
    } else {
      setSelectedTxIds([...selectedTxIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTxIds.length === displayList.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(displayList.map((t) => t.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedTxIds.length === 0) return;
    if (confirm(`確定要刪除選取的 ${selectedTxIds.length} 筆記帳記錄嗎？`)) {
      deleteTransactions(selectedTxIds);
      setSelectedTxIds([]);
      setIsBatchMode(false);
    }
  };

  const handleApplyBatchTags = () => {
    if (selectedTxIds.length === 0 || batchSelectedTags.length === 0) return;
    const targetTag = batchSelectedTags[0] || '未歸類';
    selectedTxIds.forEach((id) => {
      updateTransaction(id, { tags: [targetTag] });
    });
    setIsBatchTagModalOpen(false);
    setBatchSelectedTags([]);
    setSelectedTxIds([]);
    setIsBatchMode(false);
    alert(`已成功將選取的 ${selectedTxIds.length} 筆記帳標籤設為「#${targetTag}」！`);
  };

  const handleApplyBatchDate = () => {
    if (selectedTxIds.length === 0 || !batchTargetDate) return;
    selectedTxIds.forEach((id) => {
      updateTransaction(id, { date: batchTargetDate });
    });
    setIsBatchDateModalOpen(false);
    setSelectedTxIds([]);
    setIsBatchMode(false);
    alert(`已成功將選取的 ${selectedTxIds.length} 筆記帳日期修改為「${batchTargetDate}」！`);
  };

  const handleSelectEditTag = (tag: string) => {
    if (!editingTx) return;
    setEditingTx({ ...editingTx, tags: [tag] });
  };

  // 日期快速預設切換
  const handleSetDatePreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'all') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setDateRangeFilter(null);
      setIsDateRangeModalOpen(false);
      return;
    }

    if (preset === 'today') {
      setDateRangeFilter({ startDate: todayStr, endDate: todayStr });
      setIsDateRangeModalOpen(false);
      return;
    }

    if (preset === 'this_week') {
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setDateRangeFilter({
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
      });
      setIsDateRangeModalOpen(false);
      return;
    }

    if (preset === 'this_month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setDateRangeFilter({ startDate: firstDay, endDate: lastDay });
      setIsDateRangeModalOpen(false);
      return;
    }

    if (preset === 'last_30_days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setDateRangeFilter({
        startDate: past.toISOString().split('T')[0],
        endDate: todayStr,
      });
      setIsDateRangeModalOpen(false);
      return;
    }
  };

  const handleApplyCustomDateRange = () => {
    if (!tempStartDate || !tempEndDate) return;
    if (tempStartDate > tempEndDate) {
      alert('開始日期不得晚於結束日期！');
      return;
    }
    setDateRangeFilter({ startDate: tempStartDate, endDate: tempEndDate });
    setIsDateRangeModalOpen(false);
  };

  return (
    <div className="space-y-3.5">
      {/* 頂部：檢視模式切換器 (列表 / 週檢視 / 月檢視)、日期區間篩選 & 搜尋欄 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* 檢視模式切換 */}
          <SegmentedControl
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              { value: 'list', label: '列表', icon: <List className="w-3.5 h-3.5" /> },
              { value: 'week', label: '週', icon: <Calendar className="w-3.5 h-3.5" /> },
              { value: 'month', label: '月', icon: <CalendarDays className="w-3.5 h-3.5" /> },
            ]}
          />

          {/* ✏️ 快速勾選與批次管理筆按鈕 (支援 列表 / 週 / 月 檢視) */}
          <Button
            variant={isBatchMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              if (isBatchMode) {
                setIsBatchMode(false);
                setSelectedTxIds([]);
              } else {
                setIsBatchMode(true);
              }
            }}
            leftIcon={<Edit2 className="w-3.5 h-3.5 text-emerald-400" />}
            className="rounded-2xl"
            title={isBatchMode ? '完成批次編輯' : '快速勾選、批次刪除或編輯標籤/日期'}
          >
            {isBatchMode ? '完成' : '編輯'}
          </Button>
        </div>

        {/* 搜尋欄與日期區間指定按鈕 */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          {/* 📅 指定日期範圍篩選按鈕 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempStartDate(
                  dateRangeFilter?.startDate ||
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
                );
                setTempEndDate(dateRangeFilter?.endDate || new Date().toISOString().split('T')[0]);
                setIsDateRangeModalOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                isDateFiltered
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title="指定日期區間篩選"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {isDateFiltered
                  ? `${dateRangeFilter!.startDate.substring(5)} ~ ${dateRangeFilter!.endDate.substring(5)}`
                  : '全部區間'}
              </span>
            </button>
          </div>

          {/* 搜尋欄 */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋品項或 #標籤..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* 📅 日期區間選擇下拉卡片 */}
      {isDateRangeModalOpen && (
        <div className="p-3.5 rounded-3xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>指定消費日期範圍清單</span>
            </div>
            <button
              onClick={() => setIsDateRangeModalOpen(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 快速預設按鈕 */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => handleSetDatePreset('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition border ${
                !dateRangeFilter
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              全部時間
            </button>
            <button
              onClick={() => handleSetDatePreset('today')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 font-bold transition"
            >
              今天
            </button>
            <button
              onClick={() => handleSetDatePreset('this_week')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 font-bold transition"
            >
              本週
            </button>
            <button
              onClick={() => handleSetDatePreset('this_month')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 font-bold transition"
            >
              本月
            </button>
            <button
              onClick={() => handleSetDatePreset('last_30_days')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 font-bold transition"
            >
              近 30 天
            </button>
          </div>

          {/* 自訂日期起訖 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">開始日期 (From)</label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">結束日期 (To)</label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            {dateRangeFilter && (
              <button
                onClick={() => {
                  setDateRangeFilter(null);
                  setIsDateRangeModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 transition"
              >
                清除區間
              </button>
            )}
            <button
              onClick={handleApplyCustomDateRange}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md transition"
            >
              套用區間
            </button>
          </div>
        </div>
      )}

      {/* ⚡ 批次操作固定工具列 (當 isBatchMode 啟用時浮現，支援 列表 / 週 / 月) */}
      {isBatchMode && (
        <div className="sticky top-14 z-20 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-xl backdrop-blur-md flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">已勾選 {selectedTxIds.length} 筆</span>
            <button
              onClick={handleSelectAll}
              className="text-emerald-400 hover:text-emerald-300 underline font-semibold text-[11px]"
            >
              {selectedTxIds.length === displayList.length ? '取消全選' : '全選'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setIsBatchTagModalOpen(true)}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Tag className="w-3.5 h-3.5 text-emerald-400" />}
            >
              批次標籤
            </Button>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setBatchTargetDate(new Date().toISOString().split('T')[0]);
                setIsBatchDateModalOpen(true);
              }}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-sky-400" />}
            >
              修改日期
            </Button>

            <Button
              variant="danger"
              size="xs"
              onClick={handleBatchDelete}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            >
              刪除
            </Button>

            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                setIsBatchMode(false);
                setSelectedTxIds([]);
              }}
            >
              完成
            </Button>
          </div>
        </div>
      )}

      {/* 🏷️ 標籤篩選列 (支援複選標籤，於 列表 / 週 / 月 檢視皆常駐提供篩選) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300">標籤篩選</span>
            <span className="text-[10px] text-slate-500">(可點擊多個標籤進行複選)</span>
          </div>
          {(isTagFiltered || isDateFiltered || isSearchFiltered) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTagFilters([]);
                setDateRangeFilter(null);
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-rose-400 underline text-[10px] transition"
            >
              清除所有篩選
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <TagPill
            tag="全部"
            active={!isTagFiltered}
            onClick={() => setSelectedTagFilters([])}
          />
          {currentTagItems.map((tagItem) => {
            const isSelected = activeTags.includes(tagItem.name) || activeTags.includes(tagItem.id);
            return (
              <TagPill
                key={tagItem.id}
                tag={tagItem.name}
                active={isSelected}
                onClick={() => toggleTagFilter(tagItem.name)}
              />
            );
          })}
        </div>
      </div>

      <OverviewCards />

      {viewMode === 'week' && (
        <WeekView
          onEditTransaction={(tx) => setEditingTx(tx)}
          onOpenQuickInput={onOpenQuickInput}
          isBatchMode={isBatchMode}
          selectedTxIds={selectedTxIds}
          onToggleSelectTx={toggleSelectTx}
        />
      )}

      {viewMode === 'month' && (
        <MonthCalendarView
          onEditTransaction={(tx) => setEditingTx(tx)}
          onOpenQuickInput={onOpenQuickInput}
          isBatchMode={isBatchMode}
          selectedTxIds={selectedTxIds}
          onToggleSelectTx={toggleSelectTx}
        />
      )}

      {viewMode === 'list' && (
        <>
          {sortedDates.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">尚無符合條件的記帳記錄</h3>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((dateStr) => {
                const dayTransactions = groupedByDate[dateStr];
                const dayTotal = dayTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

                return (
                  <div
                    key={dateStr}
                    className="glass-panel rounded-3xl p-3.5 sm:p-4 space-y-2 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          {dateStr}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                          {dayTransactions.length} 筆
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black text-slate-200">
                        小計 NT$ {dayTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {dayTransactions.map((tx) => {
                        const isSelected = selectedTxIds.includes(tx.id);

                        return (
                          <div
                            key={tx.id}
                            onClick={() => {
                              if (isBatchMode) {
                                toggleSelectTx(tx.id);
                              } else {
                                setEditingTx(tx);
                              }
                            }}
                            className={`flex items-center justify-between p-2 sm:p-2.5 rounded-2xl transition duration-150 cursor-pointer border ${
                              isBatchMode
                                ? isSelected
                                  ? 'bg-emerald-950/40 border-emerald-500/50'
                                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 active:scale-[0.99]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isBatchMode && (
                                <div
                                  className={`w-4 h-4 rounded-lg flex items-center justify-center transition border ${
                                    isSelected
                                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                                      : 'border-slate-700 bg-slate-800'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              )}
                              <h4 className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                                {tx.title}
                              </h4>
                            </div>
                            <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                              -NT$ {tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 🏷️ 批次修改標籤彈窗 */}
      {isBatchTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>批次修改標籤 ({selectedTxIds.length} 筆)</span>
              </h3>
              <button
                onClick={() => setIsBatchTagModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              請選擇欲套用至已選取 <strong className="text-white font-bold">{selectedTxIds.length} 筆</strong> 記帳的標籤 (單一標籤)：
            </p>

            {/* 標籤點選區 (單選) */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              {currentTagItems.map((tagItem) => {
                const isTagSelected = batchSelectedTags.includes(tagItem.name) || batchSelectedTags.includes(tagItem.id);
                return (
                  <button
                    key={tagItem.id}
                    type="button"
                    onClick={() => {
                      setBatchSelectedTags([tagItem.name]);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                      isTagSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>#{tagItem.name}</span>
                    {isTagSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBatchTagModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleApplyBatchTags}
                disabled={batchSelectedTags.length === 0}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 shadow-md"
              >
                套用標籤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 批次修改日期彈窗 */}
      {isBatchDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>批次修改日期 ({selectedTxIds.length} 筆)</span>
              </h3>
              <button
                onClick={() => setIsBatchDateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              請選擇欲套用至已選取 <strong className="text-white font-bold">{selectedTxIds.length} 筆</strong> 記帳項目的新日期：
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400">指定消費日期</label>
              <input
                type="date"
                value={batchTargetDate}
                onChange={(e) => setBatchTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBatchDateModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleApplyBatchDate}
                disabled={!batchTargetDate}
                className="px-4 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 disabled:opacity-40 shadow-md"
              >
                套用新日期
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 單筆明細快速編輯彈窗 */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>編輯記帳項目</span>
              </h3>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">品項名稱</label>
                <input
                  type="text"
                  value={editingTx.title}
                  onChange={(e) => setEditingTx({ ...editingTx, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">金額 (NT$)</label>
                  <input
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-mono text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">消費日期</label>
                  <input
                    type="date"
                    value={editingTx.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-mono text-white outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">付款方式</label>
                <select
                  value={editingTx.paymentMethod}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {currentPaymentMethods.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* 標籤管理 (單選) */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">歸屬標籤 (單一標籤)</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-900/60 rounded-xl border border-slate-800 mb-1">
                  {currentTagItems.map((tagItem) => {
                    const isSelected =
                      (editingTx.tags?.[0] || '未歸類') === tagItem.name ||
                      (editingTx.tagIds?.[0] || '') === tagItem.id;
                    return (
                      <button
                        key={tagItem.id}
                        type="button"
                        onClick={() => handleSelectEditTag(tagItem.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                        }`}
                      >
                        <span>#{tagItem.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (confirm(`確定要刪除「${editingTx.title}」嗎？`)) {
                    deleteTransaction(editingTx.id);
                    setEditingTx(null);
                  }
                }}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 transition"
                title="刪除此筆記錄"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    updateTransaction(editingTx.id, editingTx);
                    setEditingTx(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                >
                  儲存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
