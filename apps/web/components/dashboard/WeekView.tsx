'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { Transaction } from '@app/shared';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  CreditCard,
  Trash2,
  Edit2,
  TrendingUp,
  Wallet,
  Users,
  Check,
} from 'lucide-react';

interface WeekViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onOpenQuickInput: () => void;
  isBatchMode?: boolean;
  selectedTxIds?: string[];
  onToggleSelectTx?: (id: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
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
    weekOffset,
    setWeekOffset,
    selectedSubDates,
    setSelectedSubDates,
  } = useAppStore();

  const selectedDates = selectedSubDates; // 空陣列代表預設檢視整週全部
  const weekStartDay = user.preferences?.weekStartDay ?? 1; // 0 = 週日, 1 = 週一 (預設), 6 = 週六

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
  const weekDateSet = new Set(days.map((d) => d.dateStr));

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

  // 拖曳框選狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // 複選切換處理
  const handleToggleDay = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedSubDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedSubDates([...selectedDates, dateStr]);
    }
  };

  const handleSelectAllDays = () => {
    if (selectedDates.length === 7) {
      setSelectedSubDates([]);
    } else {
      setSelectedSubDates(days.map((d) => d.dateStr));
    }
  };

  const handleSelectActiveDaysOnly = () => {
    const activeDates = dailyAmounts.filter((d) => d.sum > 0).map((d) => d.dateStr);
    setSelectedSubDates(activeDates);
  };

  // 拖曳即時預覽範圍
  const draggingRangeDates = React.useMemo(() => {
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

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (dragStartIndex !== null && dragHoverIndex !== null) {
          if (hasMovedDuringDrag) {
            const start = Math.min(dragStartIndex, dragHoverIndex);
            const end = Math.max(dragStartIndex, dragHoverIndex);
            const range = days.slice(start, end + 1).map((d) => d.dateStr);
            setSelectedSubDates(range);
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
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 週導航控制列 */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setWeekOffset((prev) => prev - 1);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="上一週"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setWeekOffset(0);
            }}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
              weekOffset === 0
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            本週
          </button>
          <button
            onClick={() => {
              setWeekOffset((prev) => prev + 1);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="下一週"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-black text-slate-200">{displayRange}</p>
            <p className="text-[10px] text-slate-400">
              日均 NT$ {avgDayAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 📊 7 天柱狀分析與拖曳框選功能 */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">本週 7 天支出趨勢</span>
            <span className="text-[11px] text-slate-500">
              {isDragging && hasMovedDuringDrag
                ? `🔄 正在拖曳選取：已選取 ${draggingRangeDates?.size || 0} 天`
                : '(點選或按住滑鼠拖曳連續框選)'}
            </span>
          </div>

          {/* 快速全選 / 複選按鈕組 */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAllDays}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition border ${
                selectedDates.length === 7
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400'
              }`}
            >
              {selectedDates.length === 7 ? '✓ 已全選7天' : '全選 7 天'}
            </button>
            <button
              type="button"
              onClick={handleSelectActiveDaysOnly}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition"
            >
              只選有支出日
            </button>
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSubDates([])}
                className="px-2 py-0.5 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 underline transition"
              >
                清除選取 (看整週)
              </button>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-7 gap-1 sm:gap-2 pt-4 pb-1 touch-none"
          onTouchMove={handleTouchMove}
        >
          {dailyAmounts.map((d, index) => {
            const heightPercent = Math.max(Math.round((d.sum / maxDayAmount) * 100), 8);
            const isSelected = draggingRangeDates
              ? draggingRangeDates.has(d.dateStr)
              : selectedDates.includes(d.dateStr);
            const isToday = d.dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={d.dateStr}
                data-week-day-idx={index}
                onMouseDown={() => handleDayMouseDown(index)}
                onMouseEnter={() => handleDayMouseEnter(index)}
                onTouchStart={() => handleDayMouseDown(index)}
                className={`flex flex-col items-center justify-end p-1 sm:p-2 rounded-2xl border-2 transition-colors group relative cursor-pointer select-none ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-950/40'
                    : isDragging && !isSelected
                    ? 'opacity-60 border-slate-800/40 bg-slate-900/30'
                    : isToday
                    ? 'border-slate-600 bg-slate-800/80 hover:border-slate-500'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                {/* 金額標籤 */}
                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-emerald-300 transition truncate max-w-full mb-1 pointer-events-none">
                  {d.sum > 0 ? `$${d.sum}` : '-'}
                </span>

                {/* 柱狀進度條 */}
                <div className="w-full h-20 bg-slate-800/80 rounded-xl overflow-hidden flex flex-col justify-end p-0.5 pointer-events-none">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-lg transition-all duration-300 ${
                      d.sum > 0
                        ? isSelected
                          ? 'bg-gradient-to-t from-emerald-400 to-teal-300'
                          : 'bg-emerald-600 group-hover:bg-emerald-500'
                        : 'bg-transparent'
                    }`}
                  />
                </div>

                {/* 星期與日期 */}
                <span
                  className={`text-[10px] font-bold mt-2 pointer-events-none ${
                    isToday
                      ? 'text-emerald-400 font-black underline decoration-2'
                      : isSelected
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {d.dayName}
                </span>
                <span className="text-[9px] text-slate-500 font-mono pointer-events-none">{d.shortDate}</span>

                {/* 勾選徽章 */}
                {isSelected && (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[8px] absolute top-1 left-1 shadow animate-in zoom-in-75 duration-100 pointer-events-none">
                    ✓
                  </span>
                )}

                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 明細清單 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {selectedDates.length > 0 && selectedDates.length < 7
              ? `已選取日期明細清單（${selectedDates.length} 天）`
              : '本週全部明細清單'}
            （{displayTransactions.length} 筆）
          </h3>
        </div>

        {displayTransactions.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 border border-slate-800/80 rounded-3xl text-slate-500 text-xs">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>這段期間尚無任何支出記錄</p>
            <button
              onClick={onOpenQuickInput}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              + 新增第一筆支出
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
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
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition duration-150 cursor-pointer border ${
                    isBatchMode
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
                        className={`w-4 h-4 rounded-lg flex items-center justify-center transition border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    )}

                    <div className="w-8 h-8 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-black text-xs flex-shrink-0">
                      #{tx.tags?.[0]?.[0] || '記'}
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">{tx.title}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                      -NT$ {tx.amount.toLocaleString()}
                    </span>
                    {!isBatchMode && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
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
