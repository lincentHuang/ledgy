'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Transaction } from '@app/shared';
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  X,
} from 'lucide-react';
import { TransactionGroupedList } from './TransactionGroupedList';

interface WeekViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onOpenQuickInput: () => void;
  isBatchMode?: boolean;
  selectedTxIds?: string[];
  onToggleSelectTx?: (id: string) => void;
  onEnterBatchModeWithTx?: (id: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
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
    weekOffset,
    setWeekOffset,
    selectedSubDates,
    setSelectedSubDates,
  } = useAppStore();

  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const selectedDates = selectedSubDates; // 空陣列代表預設檢視整週全部
  const weekStartDay = user.preferences?.weekStartDay ?? 1; // 0 = 週日, 1 = 週一 (預設), 6 = 週六

  // 拖曳框選狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // 計算週起始日到結束日的 7 天日期範圍
  const getWeekDates = (offset: number, startDayOfWeek: number) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = (currentDay - startDayOfWeek + 7) % 7;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff + offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const days: { dateStr: string; dayName: string; shortDate: string; fullDate: Date }[] = [];
    const ALL_DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const dayOfWeekIdx = d.getDay();
      days.push({
        dateStr,
        dayName: ALL_DAY_NAMES[dayOfWeekIdx],
        shortDate: `${m}/${day}`,
        fullDate: d,
      });
    }

    return {
      days,
      startDateStr: days[0].dateStr,
      endDateStr: days[6].dateStr,
      displayRange: `${days[0].shortDate} ~ ${days[6].shortDate}`,
    };
  };

  const { days, displayRange } = getWeekDates(weekOffset, weekStartDay);
  const weekDateSet = useMemo(() => new Set(days.map((d) => d.dateStr)), [days]);

  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());

  // 本週的所有交易 (依標籤與搜尋過濾)
  const weekTransactions = filteredTransactions.filter((tx) => {
    if (!weekDateSet.has(tx.date)) return false;

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

  // 計算每天的花費
  const dailyAmounts = days.map((d) => {
    const dayTxs = weekTransactions.filter((tx) => tx.date === d.dateStr);
    const sum = dayTxs.reduce((acc, cur) => acc + (cur.amount || 0), 0);
    return { ...d, sum, txCount: dayTxs.length, transactions: dayTxs };
  });

  const totalWeekAmount = dailyAmounts.reduce((acc, cur) => acc + cur.sum, 0);
  const maxDayAmount = Math.max(...dailyAmounts.map((d) => d.sum), 1);
  const avgDayAmount = Math.round(totalWeekAmount / 7);

  // 篩選展示的交易清單 (預設全部週，或複選指定幾天)
  const displayTransactions =
    selectedDates.length > 0
      ? weekTransactions.filter((tx) => selectedDates.includes(tx.date))
      : weekTransactions;

  // 點擊切換處理 (如果不選取是全部，全部選取也會自動變成空陣列全部)
  const handleToggleDay = (dateStr: string) => {
    let next: string[];
    if (selectedDates.length === 0) {
      next = [dateStr];
    } else if (selectedDates.includes(dateStr)) {
      next = selectedDates.filter((d) => d !== dateStr);
    } else {
      next = [...selectedDates, dateStr];
    }

    if (next.length === 7 || next.length === 0) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(next);
    }
  };

  const handleSelectAllDays = () => {
    // 全選即是全部 (空陣列)
    setSelectedSubDates([]);
  };

  const handleSelectActiveDaysOnly = () => {
    const activeDates = dailyAmounts.filter((d) => d.sum > 0).map((d) => d.dateStr);
    if (activeDates.length === 7 || activeDates.length === 0) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(activeDates);
    }
  };

  // 拖曳即時預覽範圍
  const draggingRangeDates = useMemo(() => {
    if (!isDragging || dragStartIndex === null || dragHoverIndex === null || !hasMovedDuringDrag) {
      return null;
    }
    const start = Math.min(dragStartIndex, dragHoverIndex);
    const end = Math.max(dragStartIndex, dragHoverIndex);
    return new Set(days.slice(start, end + 1).map((d) => d.dateStr));
  }, [isDragging, dragStartIndex, dragHoverIndex, hasMovedDuringDrag, days]);

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
    const dayEl = el.closest('[data-week-day-idx]');
    if (dayEl) {
      const idxStr = dayEl.getAttribute('data-week-day-idx');
      if (idxStr !== null) {
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx) && idx >= 0 && idx < days.length) {
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
            const range = days.slice(start, end + 1).map((d) => d.dateStr);
            if (range.length === 7 || range.length === 0) {
              setSelectedSubDates([]);
            } else {
              setSelectedSubDates(range);
            }
          } else {
            handleToggleDay(days[dragStartIndex].dateStr);
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
  }, [isDragging, dragStartIndex, dragHoverIndex, hasMovedDuringDrag, days, selectedDates]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* 週導航控制列 (點擊本週直接展開週曆趨勢) */}
      <div className="flex items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="上一週"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsWeekModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 transition active:scale-95 flex items-center gap-1.5 border border-slate-700/60 shadow-sm"
            title="點擊展開週曆趨勢"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{weekOffset === 0 ? '本週' : displayRange}</span>
            {selectedDates.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {selectedDates.length}日
              </span>
            )}
          </button>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="下一週"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs font-black text-slate-200">
            {weekTransactions.length} 筆
          </p>
          <p className="text-[10px] text-slate-400">
            總計 NT$ {totalWeekAmount.toLocaleString()}
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
            看全部 (看整週)
          </button>
        </div>
      )}

      {/* 📊 週趨勢分析 Modal (支援點擊與拖曳框選，極簡無厚重長方形外框) */}
      {isWeekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div
            className="relative w-full max-w-lg rounded-3xl glass-modal border border-emerald-500/30 bg-slate-900/95 shadow-2xl p-4 sm:p-5 space-y-4 text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  本週支出趨勢分析 ({displayRange})
                </h3>
              </div>
              <button
                onClick={() => setIsWeekModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 週快速篩選按鈕列 */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-slate-400">
                點擊或拖曳框選 (不選即為全部)：
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                    selectedDates.length === 0
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  {selectedDates.length === 0 ? '✓ 全選 (看整週)' : '看整週'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectActiveDaysOnly}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition"
                >
                  只選有支出
                </button>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubDates([])}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 underline transition"
                  >
                    重設全部
                  </button>
                )}
              </div>
            </div>

            {/* 🎯 極簡 7 天柱狀分佈 (支援滑鼠/觸控拖曳連續框選與點擊) */}
            <div
              className="grid grid-cols-7 gap-1 sm:gap-2 pt-2 pb-1 touch-none"
              onTouchMove={handleTouchMove}
            >
              {dailyAmounts.map((d, index) => {
                const heightPercent = Math.max(Math.round((d.sum / maxDayAmount) * 100), 6);
                const isSelected = draggingRangeDates
                  ? draggingRangeDates.has(d.dateStr)
                  : selectedDates.length === 0 || selectedDates.includes(d.dateStr);
                const isExplicitlySingleOrMulti = selectedDates.includes(d.dateStr);
                const isToday = d.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={d.dateStr}
                    data-week-day-idx={index}
                    onMouseDown={() => handleDayMouseDown(index)}
                    onMouseEnter={() => handleDayMouseEnter(index)}
                    onTouchStart={() => handleDayMouseDown(index)}
                    className={`flex flex-col items-center justify-end py-2 px-1 rounded-2xl transition group relative cursor-pointer border ${
                      isDragging && isSelected
                        ? 'bg-emerald-950/90 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                        : isExplicitlySingleOrMulti
                        ? 'bg-emerald-950/80 border-emerald-500 shadow-md ring-1 ring-emerald-400/40'
                        : isToday
                        ? 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    {/* 金額數字 */}
                    <span className="text-[9px] font-mono font-bold text-slate-300 group-hover:text-emerald-300 transition truncate max-w-full mb-2 pointer-events-none">
                      {d.sum > 0 ? `$${d.sum >= 1000 ? `${(d.sum / 1000).toFixed(1)}k` : d.sum}` : '-'}
                    </span>

                    {/* 極簡細直條 */}
                    <div className="w-2.5 sm:w-3 h-20 bg-slate-800/60 rounded-full overflow-hidden flex flex-col justify-end pointer-events-none">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-full transition-all duration-300 ${
                          d.sum > 0
                            ? isSelected
                              ? 'bg-emerald-400'
                              : 'bg-emerald-600 group-hover:bg-emerald-500'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* 星期與日期 */}
                    <span
                      className={`text-[10px] font-bold mt-2 pointer-events-none ${
                        isToday
                          ? 'text-emerald-400 underline decoration-2'
                          : isExplicitlySingleOrMulti
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {d.dayName}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono pointer-events-none">{d.shortDate}</span>

                    {/* 選取標記 */}
                    {isExplicitlySingleOrMulti && (
                      <span className="w-3 h-3 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[7px] absolute top-1 left-1 shadow pointer-events-none">
                        ✓
                      </span>
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
                  : '檢視全部 (整週)'}
                ：
                <strong className="text-emerald-400 font-mono font-bold text-sm ml-1">
                  NT${' '}
                  {(selectedDates.length > 0
                    ? dailyAmounts
                        .filter((d) => selectedDates.includes(d.dateStr))
                        .reduce((acc, cur) => acc + cur.sum, 0)
                    : totalWeekAmount
                  ).toLocaleString()}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setIsWeekModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md transition"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交易明細清單 */}
      <div className="space-y-2 pt-1">
        <TransactionGroupedList
          transactions={displayTransactions}
          onEditTransaction={onEditTransaction}
          onOpenQuickInput={onOpenQuickInput}
          isBatchMode={isBatchMode}
          selectedTxIds={selectedTxIds}
          onToggleSelectTx={onToggleSelectTx}
          onEnterBatchModeWithTx={onEnterBatchModeWithTx}
          emptyMessage="本週尚無任何支出記錄"
        />
      </div>
    </div>
  );
};
