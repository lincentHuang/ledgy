'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookHeart, ChevronLeft, ChevronRight, Flame, PenLine, Receipt } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { countStreak, groupMyTransactionsByDate, sumByType, toDateKey } from '@/lib/shared/diary';
import { DiaryEditorModal } from './DiaryEditorModal';

interface DiaryViewProps {
  onBack: () => void;
  onOpenQuickInput?: () => void;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 生活日記：每天一張卡片，把當天的記帳與日記放在一起看 */
export const DiaryView: React.FC<DiaryViewProps> = ({ onBack, onOpenQuickInput }) => {
  const { diaryEntries, transactions, user } = useAppStore();
  const today = new Date();
  const todayKey = toDateKey(today);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const txByDate = useMemo(() => groupMyTransactionsByDate(transactions, user.uid), [transactions, user.uid]);

  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();
  const isFutureMonth =
    cursor.year > today.getFullYear() || (cursor.year === today.getFullYear() && cursor.month > today.getMonth());

  // 本月顯示到今天為止，過去的月份顯示整月 (新到舊)
  const days = useMemo(() => {
    if (isFutureMonth) return [];
    const lastDay = isCurrentMonth ? today.getDate() : new Date(cursor.year, cursor.month + 1, 0).getDate();
    const list: string[] = [];
    for (let d = lastDay; d >= 1; d--) list.push(toDateKey(new Date(cursor.year, cursor.month, d)));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, isCurrentMonth, isFutureMonth]);

  const trackedDays = days.filter((d) => (txByDate[d] || []).length > 0).length;
  const diaryDays = days.filter((d) => diaryEntries[d]).length;
  const trackingStreak = countStreak((d) => (txByDate[d] || []).length > 0);
  const diaryStreak = countStreak((d) => Boolean(diaryEntries[d]));

  const shiftMonth = (delta: number) =>
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <BookHeart className="w-5 h-5 text-emerald-400 shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-white truncate">生活日記</h1>
        </div>
        <button
          type="button"
          onClick={() => setEditingDate(todayKey)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          <PenLine className="w-3.5 h-3.5" />
          <span>寫今天</span>
        </button>
      </div>

      {/* 月份切換 + 統計 */}
      <section className="glass-panel rounded-3xl p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="上個月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-100">
            {cursor.year} 年 {cursor.month + 1} 月
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:hover:bg-transparent"
            title="下個月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-2xl bg-slate-950/50 border border-slate-800 py-2">
            <div className="text-lg font-bold text-emerald-300">
              {trackedDays}
              <span className="text-xs text-slate-500"> / {days.length}</span>
            </div>
            <div className="text-[10px] text-slate-400">本月有記帳</div>
          </div>
          <div className="rounded-2xl bg-slate-950/50 border border-slate-800 py-2">
            <div className="text-lg font-bold text-sky-300">
              {diaryDays}
              <span className="text-xs text-slate-500"> / {days.length}</span>
            </div>
            <div className="text-[10px] text-slate-400">本月寫日記</div>
          </div>
          <div className="rounded-2xl bg-slate-950/50 border border-slate-800 py-2">
            <div className="text-lg font-bold text-amber-300 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" />
              {trackingStreak}
            </div>
            <div className="text-[10px] text-slate-400">連續記帳天數</div>
          </div>
          <div className="rounded-2xl bg-slate-950/50 border border-slate-800 py-2">
            <div className="text-lg font-bold text-amber-300 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" />
              {diaryStreak}
            </div>
            <div className="text-[10px] text-slate-400">連續日記天數</div>
          </div>
        </div>
      </section>

      {/* 每日卡片 */}
      <div className="space-y-2">
        {days.map((dateKey) => {
          const dayTx = txByDate[dateKey] || [];
          const entry = diaryEntries[dateKey];
          const expense = sumByType(dayTx, 'expense');
          const [, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
          const weekDay = WEEK_DAYS[new Date(cursor.year, m - 1, d).getDay()];
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setEditingDate(dateKey)}
              className={`w-full text-left flex items-stretch gap-3 rounded-2xl border p-3 transition hover:border-emerald-600/50 active:scale-[0.99] ${
                isToday ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              {/* 日期 */}
              <div className="w-11 shrink-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-100 leading-none">{d}</span>
                <span className={`text-[10px] mt-1 ${isToday ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                  {isToday ? '今天' : `週${weekDay}`}
                </span>
              </div>

              {/* 日記摘要 */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                {entry ? (
                  <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 break-words">
                    {entry.mood && <span className="mr-1">{entry.mood}</span>}
                    {entry.content || <span className="text-slate-500">(只記了心情)</span>}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    <span>還沒寫日記</span>
                  </p>
                )}
              </div>

              {/* 記帳狀態 */}
              <div className="shrink-0 flex flex-col items-end justify-center gap-0.5">
                {dayTx.length > 0 ? (
                  <>
                    <span className="text-xs font-mono font-bold text-slate-100">${expense.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                      <Receipt className="w-3 h-3" />
                      {dayTx.length} 筆
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-950/60 text-amber-300 border border-amber-700/50">
                    未記帳
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {editingDate && (
        <DiaryEditorModal
          isOpen={Boolean(editingDate)}
          onClose={() => setEditingDate(null)}
          dateStr={editingDate}
          onOpenQuickInput={onOpenQuickInput}
        />
      )}
    </div>
  );
};
