'use client';

import React, { useState } from 'react';
import { PenLine } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DiaryEditorModal } from './DiaryEditorModal';

interface DiaryDayBadgeProps {
  dateStr: string;
  /** compact：明細日期標頭的小膠囊；row：月曆/週曆選取單日時的整列預覽 */
  variant?: 'compact' | 'row';
  onOpenQuickInput?: () => void;
}

/** 某天的日記狀態 (心情 + 有沒有寫)，點擊開啟日記編輯 */
export const DiaryDayBadge: React.FC<DiaryDayBadgeProps> = ({ dateStr, variant = 'compact', onOpenQuickInput }) => {
  const { diaryEntries } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const entry = diaryEntries[dateStr];

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition flex items-center gap-1 active:scale-95 whitespace-nowrap shrink-0 ${
            entry
              ? 'text-sky-200 bg-sky-950/60 border border-sky-800/50 hover:bg-sky-900/60'
              : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800/80'
          }`}
          title={entry?.content || '寫這天的日記'}
        >
          {entry ? (
            <>
              <span className="text-xs leading-none">{entry.mood || '📔'}</span>
              <span>日記</span>
            </>
          ) : (
            <>
              <PenLine className="w-3 h-3 text-sky-400/80" />
              <span>+ 日記</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm leading-none shrink-0">{entry?.mood || '📔'}</span>
            <span className="text-[11px] text-slate-300 truncate">
              {entry ? entry.content || '只記了心情' : '這天還沒寫日記'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-[10px] font-bold text-sky-300 hover:text-sky-200 px-2.5 py-1 rounded-xl bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60 transition shrink-0 whitespace-nowrap active:scale-95"
          >
            {entry ? '看日記' : '+ 寫日記'}
          </button>
        </div>
      )}

      {isOpen && (
        <DiaryEditorModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          dateStr={dateStr}
          onOpenQuickInput={onOpenQuickInput}
        />
      )}
    </>
  );
};
