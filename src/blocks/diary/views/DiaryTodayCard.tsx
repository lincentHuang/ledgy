'use client';

import React, { useMemo, useState } from 'react';
import { BookHeart, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { groupMyTransactionsByDate, sumByType, toDateKey } from '@/lib/shared/diary';
import { DiaryEditorModal } from './DiaryEditorModal';

interface DiaryTodayCardProps {
  onOpenDiary: () => void;
  onOpenQuickInput?: () => void;
}

/** 首頁的今日小卡：今天記了幾筆帳、日記寫了沒 */
export const DiaryTodayCard: React.FC<DiaryTodayCardProps> = ({ onOpenDiary, onOpenQuickInput }) => {
  const { diaryEntries, transactions, user } = useAppStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const todayKey = toDateKey();

  const todayTx = useMemo(
    () => groupMyTransactionsByDate(transactions, user.uid)[todayKey] || [],
    [transactions, user.uid, todayKey]
  );
  const entry = diaryEntries[todayKey];
  const expense = sumByType(todayTx, 'expense');

  return (
    <>
      <section className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-3 py-2">
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <BookHeart className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="min-w-0 truncate text-xs text-slate-300">
            <span className="font-bold text-slate-100">今天</span>
            {' · '}
            {todayTx.length > 0 ? (
              <span>已記 {todayTx.length} 筆，支出 ${expense.toLocaleString()}</span>
            ) : (
              <span className="text-amber-300">還沒記帳</span>
            )}
            {' · '}
            {entry ? (
              <span>
                {entry.mood ? `${entry.mood} ` : ''}日記已寫
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">寫今天的日記</span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenDiary}
          className="shrink-0 inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-emerald-300 transition whitespace-nowrap"
        >
          <span>全部</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </section>

      <DiaryEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        dateStr={todayKey}
        onOpenQuickInput={onOpenQuickInput}
      />
    </>
  );
};
