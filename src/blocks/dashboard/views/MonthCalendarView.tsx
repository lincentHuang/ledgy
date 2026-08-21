'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Transaction } from '@app/shared';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CreditCard,
  Trash2,
  Edit2,
  X,
  Plus,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

interface MonthCalendarViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onOpenQuickInput: () => void;
  isBatchMode?: boolean;
  selectedTxIds?: string[];
  onToggleSelectTx?: (id: string) => void;
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  onEditTransaction,
  onOpenQuickInput,
  isBatchMode = false,
  selectedTxIds = [],
  onToggleSelectTx,
}) => {
  const {
    user,
    filteredTransactions,
    selectedTagFilters,
    searchQuery,
    deleteTransaction,
    calendarYear,
    setCalendarYear,
    calendarMonth,
    setCalendarMonth,
    selectedSubDates,
    setSelectedSubDates,
  } = useAppStore();

  const today = new Date();
  const selectedDates = selectedSubDates; // 空陣列代表預設檢視全月全部

  const weekStartDay = user.preferences?.weekStartDay ?? 1; // 0 = 週日, 1 = 週一 (預設), 6 = 週六
  const monthStartDay = user.preferences?.monthStartDay ?? 1; // 1 ~ 28

  const calendarCardRef = React.useRef<HTMLDivElement>(null);
  const [isRangeAdjustMode, setIsRangeAdjustMode] = useState(false);

  const handleToggleRangeAdjustMode = () => {
    const next = !isRangeAdjustMode;
    setIsRangeAdjustMode(next);
    if (next) {
      calendarCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  // 拖曳框選狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // 星期抬頭定義 (依據 weekStartDay 排列)
  const BASE_WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const WEEK_DAYS = Array.from({ length: 7 }).map((_, i) => BASE_WEEK_DAYS[(weekStartDay + i) % 7]);

  // 複選操作
  const handleToggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedSubDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedSubDates([...selectedDates, dateStr]);
    }
  };

  const handleSelectAllPeriodDays = () => {
    if (selectedDates.length === periodDays.length) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(periodDays.map((d) => d.dateStr));
    }
  };

  const handleSelectActiveDaysOnly = () => {
    const activeDates = periodDays
      .filter((d) => (dailyTransactionsMap[d.dateStr]?.length || 0) > 0)
      .map((d) => d.dateStr);
    setSelectedSubDates(activeDates);
  };

  // 拖曳框選中即時預覽範圍
  const draggingRangeDates = React.useMemo(() => {
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

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (dragStartIndex !== null && dragHoverIndex !== null) {
          if (hasMovedDuringDrag) {
            const start = Math.min(dragStartIndex, dragHoverIndex);
            const end = Math.max(dragStartIndex, dragHoverIndex);
            const range = periodDays.slice(start, end + 1).map((d) => d.dateStr);
            setSelectedSubDates(range);
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
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 月份導航控制列 */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="上一週期"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetThisMonth}
            className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {periodTitle}
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="下一週期"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-400">當期筆數</p>
          <p className="text-sm font-black text-slate-200 font-mono">
            {monthTransactions.length} 筆
          </p>
        </div>
      </div>

      {/* 🗓️ 月曆網格與拖曳框選控制 */}
      <div
        ref={calendarCardRef}
        className="bg-slate-900/80 border border-slate-800 p-3 sm:p-4 rounded-2xl sm:rounded-3xl space-y-3 w-full scroll-mt-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">月曆記帳分佈</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {isDragging && hasMovedDuringDrag
                ? `🔄 正在拖曳框選：已選取 ${draggingRangeDates?.size || 0} 天`
                : '(點選或按住滑鼠拖曳連續框選)'}
            </span>
          </div>

          {/* 操作按鈕組：調整範圍、全選、只選有支出、清除 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleRangeAdjustMode}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm ${
                isRangeAdjustMode
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 font-black animate-pulse'
                  : 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isRangeAdjustMode ? '✓ 完成範圍調整' : '調整範圍 (滑動框選)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSelectAllPeriodDays}
              className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition border ${
                selectedDates.length === periodDays.length
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400'
              }`}
            >
              {selectedDates.length === periodDays.length ? '✓ 已全選' : `全選 (${periodDays.length}天)`}
            </button>
            <button
              type="button"
              onClick={handleSelectActiveDaysOnly}
              className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition"
            >
              只選有支出
            </button>
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSubDates([])}
                className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] text-slate-400 hover:text-rose-400 underline transition"
              >
                看全月
              </button>
            )}
          </div>
        </div>

        {/* 🎯 調整範圍模式鎖定提示橫幅 */}
        {isRangeAdjustMode && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs animate-in fade-in">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                <strong>滑動框選模式中</strong>：畫面已鎖定滾動，請在格子上滑動連選多日。
              </span>
            </span>
            <button
              type="button"
              onClick={handleToggleRangeAdjustMode}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition ml-2 flex-shrink-0 shadow-sm"
            >
              完成
            </button>
          </div>
        )}

        {/* 星期抬頭 */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[10px] sm:text-xs font-bold text-slate-400 pb-0.5 sm:pb-1">
          {WEEK_DAYS.map((wd) => (
            <span key={wd} className={wd === '日' || wd === '六' ? 'text-amber-400/80' : ''}>
              {wd}
            </span>
          ))}
        </div>

        {/* 日期網格：若在調整範圍模式則鎖定 touch-none，平時為 touch-pan-y */}
        <div
          className={`grid grid-cols-7 gap-1 sm:gap-1.5 ${
            isRangeAdjustMode ? 'touch-none select-none' : 'touch-pan-y'
          }`}
          onTouchMove={isRangeAdjustMode ? handleTouchMove : undefined}
        >
          {/* 前置空白格 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-950/20" />
          ))}

          {/* 各日期格子 */}
          {periodDays.map((d, index) => {
            const dateStr = d.dateStr;
            const isToday = dateStr === today.toISOString().split('T')[0];
            const isSelected = draggingRangeDates
              ? draggingRangeDates.has(dateStr)
              : selectedDates.includes(dateStr);
            const dayTxs = dailyTransactionsMap[dateStr] || [];
            const daySum = dayTxs.reduce((acc, cur) => acc + (cur.amount || 0), 0);

            return (
              <div
                key={dateStr}
                data-month-day-idx={index}
                onClick={() => {
                  if (!isRangeAdjustMode) {
                    handleToggleDate(dateStr);
                  }
                }}
                onMouseDown={() => handleDayMouseDown(index)}
                onMouseEnter={() => handleDayMouseEnter(index)}
                onTouchStart={() => {
                  if (isRangeAdjustMode) {
                    handleDayMouseDown(index);
                  }
                }}
                className={`h-12 sm:h-20 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border sm:border-2 flex flex-col justify-between text-left transition-colors relative cursor-pointer select-none group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/70 shadow-md shadow-emerald-950/40'
                    : isDragging && !isSelected
                    ? 'opacity-60 border-slate-800/40 bg-slate-900/30'
                    : isToday
                    ? 'border-slate-600 bg-slate-800/80 hover:border-slate-500'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                {/* 頂部：日期數字與今天標記 */}
                <div className="flex items-center justify-between w-full pointer-events-none">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-black ${
                        isSelected
                          ? 'text-emerald-300'
                          : isToday
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                    {monthStartDay > 1 && d.dayNum === 1 && (
                      <span className="text-[8px] sm:text-[9px] text-slate-500 font-bold">
                        {d.monthNum}月
                      </span>
                    )}
                  </div>

                  {/* 勾選徽章或今天圓點 */}
                  {isSelected ? (
                    <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[7px] sm:text-[8px] shadow animate-in zoom-in-75 duration-100">
                      ✓
                    </span>
                  ) : isToday ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                  ) : dayTxs.length > 0 ? (
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-500">{dayTxs.length}筆</span>
                  ) : null}
                </div>

                {/* 底部：花費金額標籤 */}
                {daySum > 0 ? (
                  <div className="w-full pointer-events-none">
                    <span className="text-[8px] sm:text-[10px] font-mono font-bold text-emerald-400 block truncate">
                      ${daySum >= 1000 ? `${(daySum / 1000).toFixed(1)}k` : daySum}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-2 sm:h-3 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 📌 交易明細清單 (直接自然展開排版，無多餘外層卡片包裹) */}
      <div className="space-y-2.5 pt-1 animate-in fade-in">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-300">
              {selectedDates.length > 0
                ? `已選取 ${selectedDates.length} 天明細`
                : '當期全部支出明細'}
              <span className="text-slate-500 font-normal ml-1">（{displayTransactions.length} 筆）</span>
            </h3>
          </div>

          {selectedDates.length > 0 && (
            <button
              onClick={() => setSelectedSubDates([])}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 transition"
            >
              查看全月
            </button>
          )}
        </div>

        {displayTransactions.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-slate-900/40 border border-slate-800/60 rounded-2xl">
            <p>選取的期間尚無任何記帳記錄</p>
            <button
              onClick={onOpenQuickInput}
              className="mt-2 text-emerald-400 hover:underline font-bold text-xs"
            >
              + 新增第一筆支出
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            {displayTransactions.map((tx) => {
              const isSelected = selectedTxIds?.includes(tx.id);
              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (isBatchMode && onToggleSelectTx) {
                      onToggleSelectTx(tx.id);
                    } else {
                      onEditTransaction(tx);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition cursor-pointer border ${isBatchMode
                      ? isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 active:scale-[0.99]'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* 批次模式勾選框 */}
                    {isBatchMode && (
                      <div
                        className={`w-4 h-4 rounded-lg flex items-center justify-center transition border ${isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                            : 'border-slate-700 bg-slate-800'
                          }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    )}

                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                      #{tx.tags?.[0]?.[0] || '記'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate">{tx.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{tx.date}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-slate-300">
                          <CreditCard className="w-3 h-3 text-sky-400" />
                          {tx.paymentMethod}
                        </span>
                        {tx.tags && tx.tags.length > 0 && (
                          <span>#{tx.tags[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-black font-mono text-emerald-400">
                      -NT$ {tx.amount.toLocaleString()}
                    </span>
                    {!isBatchMode && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                          title="編輯"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`確定要刪除「${tx.title}」嗎？`)) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
