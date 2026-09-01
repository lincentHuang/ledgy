'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Transaction } from '@app/shared';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from 'lucide-react';
import { TransactionGroupedList } from './TransactionGroupedList';

interface MonthCalendarViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onOpenQuickInput: () => void;
  isBatchMode?: boolean;
  selectedTxIds?: string[];
  onToggleSelectTx?: (id: string) => void;
  onEnterBatchModeWithTx?: (id: string) => void;
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  onEditTransaction,
  onOpenQuickInput,
  isBatchMode = false,
  selectedTxIds = [],
  onToggleSelectTx,
  onEnterBatchModeWithTx,
}) => {
  const {
    user,
    filteredTransactions,
    selectedTagFilters,
    searchQuery,
    calendarYear,
    setCalendarYear,
    calendarMonth,
    setCalendarMonth,
    selectedSubDates,
    setSelectedSubDates,
  } = useAppStore();

  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const today = new Date();
  const selectedDates = selectedSubDates; // 空陣列代表預設檢視全月全部

  // 拖曳框選狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  const weekStartDay = user.preferences?.weekStartDay ?? 1; // 0 = 週日, 1 = 週一 (預設), 6 = 週六
  const monthStartDay = user.preferences?.monthStartDay ?? 1; // 1 ~ 28

  const handlePrevMonth = () => {
    setSelectedSubDates([]);
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedSubDates([]);
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleResetThisMonth = () => {
    const n = new Date();
    setCalendarYear(n.getFullYear());
    setCalendarMonth(n.getMonth() + 1);
    setSelectedSubDates([]);
  };

  // 計算月記帳週期的起始日與結束日
  const getMonthPeriod = (year: number, month: number, startDay: number) => {
    let startDate: Date;
    let endDate: Date;
    let periodTitle: string;

    if (startDay === 1) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // 當月最後一天
      periodTitle = `${year} 年 ${month} 月`;
    } else {
      startDate = new Date(year, month - 2, startDay);
      endDate = new Date(year, month - 1, startDay - 1);
      const startM = startDate.getMonth() + 1;
      const startD = startDate.getDate();
      const endM = endDate.getMonth() + 1;
      const endD = endDate.getDate();
      periodTitle = `${year} 年 ${month} 月帳期 (${startM}/${startD} ~ ${endM}/${endD})`;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const periodDays: { dateStr: string; dayNum: number; monthNum: number; fullDate: Date }[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().split('T')[0];
      periodDays.push({
        dateStr,
        dayNum: cur.getDate(),
        monthNum: cur.getMonth() + 1,
        fullDate: new Date(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }

    const startDateStr = periodDays[0]?.dateStr || '';
    const endDateStr = periodDays[periodDays.length - 1]?.dateStr || '';

    return {
      startDate,
      endDate,
      startDateStr,
      endDateStr,
      periodTitle,
      periodDays,
      firstDayOfWeek: periodDays[0] ? (periodDays[0].fullDate.getDay() - weekStartDay + 7) % 7 : 0,
    };
  };

  const { startDateStr, endDateStr, periodTitle, periodDays, firstDayOfWeek } = getMonthPeriod(
    calendarYear,
    calendarMonth,
    monthStartDay
  );

  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());

  // 當月週期內的所有交易 (依標籤與搜尋過濾)
  const monthTransactions = filteredTransactions.filter((tx) => {
    if (!tx.date || tx.date < startDateStr || tx.date > endDateStr) return false;

    const tags = Array.isArray(tx.tags) ? tx.tags : [];
    const title = tx.title || '';
    const merchant = tx.merchant || '';

    if (isTagFiltered) {
      const matchesTag = tags.some((t) => activeTags.includes(t));
      if (!matchesTag) return false;
    }

    if (isSearchFiltered) {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        title.toLowerCase().includes(q) ||
        merchant.toLowerCase().includes(q) ||
        tags.some((t) => (t || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    return true;
  });

  const totalMonthAmount = monthTransactions.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  // 每日交易群組
  const dailyTransactionsMap: Record<string, Transaction[]> = {};
  monthTransactions.forEach((tx) => {
    if (!dailyTransactionsMap[tx.date]) {
      dailyTransactionsMap[tx.date] = [];
    }
    dailyTransactionsMap[tx.date].push(tx);
  });

  // 篩選展示的交易清單 (全部月份或複選指定幾天)
  const displayTransactions =
    selectedDates.length > 0
      ? monthTransactions.filter((tx) => selectedDates.includes(tx.date))
      : monthTransactions;

  // 星期抬頭定義 (依據 weekStartDay 排列)
  const BASE_WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const WEEK_DAYS = Array.from({ length: 7 }).map((_, i) => BASE_WEEK_DAYS[(weekStartDay + i) % 7]);

  // 點擊切換處理 (如果不選取是全部，全部選取也會自動變成空陣列全部)
  const handleToggleDate = (dateStr: string) => {
    let next: string[];
    if (selectedDates.length === 0) {
      next = [dateStr];
    } else if (selectedDates.includes(dateStr)) {
      next = selectedDates.filter((d) => d !== dateStr);
    } else {
      next = [...selectedDates, dateStr];
    }

    if (next.length === periodDays.length || next.length === 0) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(next);
    }
  };

  const handleSelectAllPeriodDays = () => {
    // 全選即是全部 (空陣列)
    setSelectedSubDates([]);
  };

  const handleSelectActiveDaysOnly = () => {
    const activeDates = periodDays
      .filter((d) => (dailyTransactionsMap[d.dateStr]?.length || 0) > 0)
      .map((d) => d.dateStr);
    if (activeDates.length === periodDays.length || activeDates.length === 0) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(activeDates);
    }
  };

  // 拖曳框選中即時預覽範圍
  const draggingRangeDates = useMemo(() => {
    if (!isDragging || dragStartIndex === null || dragHoverIndex === null || !hasMovedDuringDrag) {
      return null;
    }
    const start = Math.min(dragStartIndex, dragHoverIndex);
    const end = Math.max(dragStartIndex, dragHoverIndex);
    return new Set(periodDays.slice(start, end + 1).map((d) => d.dateStr));
  }, [isDragging, dragStartIndex, dragHoverIndex, hasMovedDuringDrag, periodDays]);

  const handleDayMouseDown = (index: number) => {
    setIsDragging(true);
    setDragStartIndex(index);
    setDragHoverIndex(index);
    setHasMovedDuringDrag(false);
  };

  const handleDayMouseEnter = (index: number) => {
    if (isDragging && dragStartIndex !== null) {
      if (index !== dragStartIndex) {
        setHasMovedDuringDrag(true);
      }
      setDragHoverIndex(index);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || dragStartIndex === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const dayEl = el.closest('[data-month-day-idx]');
    if (dayEl) {
      const idxStr = dayEl.getAttribute('data-month-day-idx');
      if (idxStr !== null) {
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx) && idx >= 0 && idx < periodDays.length) {
          if (idx !== dragHoverIndex) {
            setHasMovedDuringDrag(true);
            setDragHoverIndex(idx);
          }
        }
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (dragStartIndex !== null && dragHoverIndex !== null) {
          if (hasMovedDuringDrag) {
            const start = Math.min(dragStartIndex, dragHoverIndex);
            const end = Math.max(dragStartIndex, dragHoverIndex);
            const range = periodDays.slice(start, end + 1).map((d) => d.dateStr);
            if (range.length === periodDays.length || range.length === 0) {
              setSelectedSubDates([]);
            } else {
              setSelectedSubDates(range);
            }
          } else {
            handleToggleDate(periodDays[dragStartIndex].dateStr);
          }
        }
        setIsDragging(false);
        setDragStartIndex(null);
        setDragHoverIndex(null);
        setHasMovedDuringDrag(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartIndex, dragHoverIndex, hasMovedDuringDrag, periodDays, selectedDates]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 月份導航控制列 (點擊月份直接展開月曆) */}
      <div className="flex items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="上一月份"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMonthModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 transition active:scale-95 flex items-center gap-1.5 border border-slate-700/60 shadow-sm"
            title="點擊展開月曆"
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span>{periodTitle}</span>
            {selectedDates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {selectedDates.length}日
              </span>
            )}
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="下一月份"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs font-black text-slate-200">
            {monthTransactions.length} 筆
          </p>
          <p className="text-[10px] text-slate-400">
            總計 NT$ {totalMonthAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 篩選標籤提示 (若有選取特定幾天) */}
      {selectedDates.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs">
          <span>已選取 {selectedDates.length} 天的明細清單</span>
          <button
            onClick={() => setSelectedSubDates([])}
            className="underline text-[11px] hover:text-white transition"
          >
            看全部 (看全月)
          </button>
        </div>
      )}

      {/* 🗓️ 月曆檢視 Modal (支援滑鼠/觸控拖曳框選與點選，精簡適中不佔滿畫面) */}
      {isMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div
            className="relative w-full max-w-md rounded-3xl glass-modal border border-emerald-500/30 bg-slate-900/95 shadow-2xl p-4 sm:p-5 space-y-4 text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {periodTitle} 月曆分佈
                </h3>
              </div>
              <button
                onClick={() => setIsMonthModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 月曆快速篩選按鈕列 */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-slate-400">點選或拖曳框選 (不選即為全部)：</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllPeriodDays}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border ${
                    selectedDates.length === 0
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  {selectedDates.length === 0 ? '✓ 全選 (看全月)' : '看全月'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectActiveDaysOnly}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition"
                >
                  只選有支出
                </button>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubDates([])}
                    className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-rose-400 underline transition"
                  >
                    重設全部
                  </button>
                )}
              </div>
            </div>

            {/* 星期抬頭 */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
              {WEEK_DAYS.map((wd) => (
                <span key={wd} className={wd === '日' || wd === '六' ? 'text-amber-400/80' : ''}>
                  {wd}
                </span>
              ))}
            </div>

            {/* 精簡月曆網格 (支援滑鼠/觸控拖曳框選與點選) */}
            <div
              className="grid grid-cols-7 gap-1 sm:gap-1.5 touch-none"
              onTouchMove={handleTouchMove}
            >
              {/* 前置空白格 */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10 sm:h-11 rounded-xl bg-slate-950/20" />
              ))}

              {/* 各日期格子 */}
              {periodDays.map((d, index) => {
                const dateStr = d.dateStr;
                const isToday = dateStr === today.toISOString().split('T')[0];
                const isSelected = draggingRangeDates
                  ? draggingRangeDates.has(dateStr)
                  : selectedDates.length === 0 || selectedDates.includes(dateStr);
                const isExplicitlySingleOrMulti = selectedDates.includes(dateStr);
                const dayTxs = dailyTransactionsMap[dateStr] || [];
                const daySum = dayTxs.reduce((acc, cur) => acc + (cur.amount || 0), 0);

                return (
                  <div
                    key={dateStr}
                    data-month-day-idx={index}
                    onMouseDown={() => handleDayMouseDown(index)}
                    onMouseEnter={() => handleDayMouseEnter(index)}
                    onTouchStart={() => handleDayMouseDown(index)}
                    className={`h-10 sm:h-11 p-1 rounded-xl border flex flex-col justify-between items-center transition relative cursor-pointer group select-none ${
                      isDragging && isSelected
                        ? 'border-emerald-400 bg-emerald-950/90 shadow ring-1 ring-emerald-400/50'
                        : isExplicitlySingleOrMulti
                        ? 'border-emerald-500 bg-emerald-950/80 shadow ring-1 ring-emerald-400/40'
                        : isToday
                        ? 'border-slate-600 bg-slate-800/80 hover:border-slate-500'
                        : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* 日期數字 */}
                    <span
                      className={`text-[11px] font-mono font-bold leading-tight pointer-events-none ${
                        isExplicitlySingleOrMulti
                          ? 'text-emerald-300'
                          : isToday
                          ? 'text-emerald-400 underline'
                          : 'text-slate-300'
                      }`}
                    >
                      {d.dayNum}
                    </span>

                    {/* 金額標籤或小圓點 */}
                    {daySum > 0 ? (
                      <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-400 truncate max-w-full leading-none pointer-events-none">
                        ${daySum >= 1000 ? `${(daySum / 1000).toFixed(1)}k` : daySum}
                      </span>
                    ) : (
                      <span className="h-1.5 pointer-events-none" />
                    )}

                    {/* 選取勾選點 */}
                    {isExplicitlySingleOrMulti && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-0.5 right-0.5 shadow pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal 底部 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <div className="text-slate-400">
                {selectedDates.length > 0
                  ? `已選取 ${selectedDates.length} 天`
                  : '檢視全部 (當月)'}
                ：
                <strong className="text-emerald-400 font-mono font-bold text-sm ml-1">
                  NT${' '}
                  {(selectedDates.length > 0
                    ? periodDays
                        .filter((d) => selectedDates.includes(d.dateStr))
                        .reduce((acc, cur) => acc + ((dailyTransactionsMap[cur.dateStr] || []).reduce((s, t) => s + (t.amount || 0), 0)), 0)
                    : totalMonthAmount
                  ).toLocaleString()}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md transition"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📌 交易明細清單 */}
      <div className="space-y-2 pt-1">
        <TransactionGroupedList
          transactions={displayTransactions}
          onEditTransaction={onEditTransaction}
          onOpenQuickInput={onOpenQuickInput}
          isBatchMode={isBatchMode}
          selectedTxIds={selectedTxIds}
          onToggleSelectTx={onToggleSelectTx}
          onEnterBatchModeWithTx={onEnterBatchModeWithTx}
          emptyMessage="當月尚無任何記帳記錄"
        />
      </div>
    </div>
  );
};
