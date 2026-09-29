'use client';

import React, { useState } from 'react';
import { Transaction } from '@app/shared';
import { useAppStore } from '@/lib/store';
import { Calendar, Sparkles, StickyNote, Edit2 } from 'lucide-react';
import { DateNoteModal } from './DateNoteModal';

export interface TransactionGroupedListProps {
  transactions: Transaction[];
  onEditTransaction: (tx: Transaction) => void;
  onOpenQuickInput?: () => void;
  isBatchMode?: boolean;
  selectedTxIds?: string[];
  onToggleSelectTx?: (id: string) => void;
  onEnterBatchModeWithTx?: (id: string) => void;
  emptyMessage?: string;
}

interface TransactionItemRowProps {
  tx: Transaction;
  isSelected: boolean;
  isBatchMode: boolean;
  showTagBadge: boolean;
  onClick: () => void;
  onLongPress: () => void;
}

const TransactionItemRow: React.FC<TransactionItemRowProps> = ({
  tx,
  isSelected,
  isBatchMode,
  showTagBadge,
  onClick,
  onLongPress,
}) => {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = React.useRef(false);
  const [isPressing, setIsPressing] = React.useState(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  const triggerLongPress = () => {
    didLongPressRef.current = true;
    setIsPressing(false);
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(50);
      } catch (_) {}
    }
    onLongPress();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    didLongPressRef.current = false;
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsPressing(true);

    timerRef.current = setTimeout(() => {
      triggerLongPress();
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimer();
    }
  };

  const handleTouchEnd = () => {
    clearTimer();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    didLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsPressing(true);

    timerRef.current = setTimeout(() => {
      triggerLongPress();
    }, 450);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPosRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimer();
    }
  };

  const handleMouseUp = () => {
    clearTimer();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (didLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didLongPressRef.current = false;
      return;
    }
    onClick();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (didLongPressRef.current || isBatchMode) {
      e.preventDefault();
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`select-none flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer border ${
        isBatchMode
          ? isSelected
            ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
          : isPressing
          ? 'scale-[0.98] bg-emerald-950/30 border-emerald-500/50'
          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 active:scale-[0.99]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <h4 className="font-bold text-xs sm:text-sm text-slate-100 truncate">
          {tx.title}
        </h4>
        {showTagBadge && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 flex-shrink-0">
            {tx.tags?.[0]?.startsWith('#') ? tx.tags[0] : `#${tx.tags?.[0] || '未歸類'}`}
          </span>
        )}
      </div>
      <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
        -NT$ {tx.amount.toLocaleString()}
      </span>
    </div>
  );
};

export const TransactionGroupedList: React.FC<TransactionGroupedListProps> = ({
  transactions,
  onEditTransaction,
  onOpenQuickInput,
  isBatchMode = false,
  selectedTxIds = [],
  onToggleSelectTx,
  onEnterBatchModeWithTx,
  emptyMessage = '尚無符合條件的記帳記錄',
}) => {
  const { selectedTagFilters, currentDateNotes, selectedSubDates } = useAppStore();
  const [editingDateNoteStr, setEditingDateNoteStr] = useState<string | null>(null);

  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const showTagBadge = !isTagFiltered || activeTags.length > 1;

  // 依日期分組
  const groupedByDate: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    if (!groupedByDate[tx.date]) {
      groupedByDate[tx.date] = [];
    }
    groupedByDate[tx.date].push(tx);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    // 若僅選取單一特定日期但當日無任何交易，依然展示當日備忘資訊與新增支出按鈕
    if (selectedSubDates && selectedSubDates.length === 1) {
      const singleDate = selectedSubDates[0];
      const singleDateNote = currentDateNotes[singleDate];

      return (
        <div className="space-y-3">
          <div className="glass-panel rounded-3xl p-3.5 sm:p-4 space-y-3 transition shadow-sm">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {singleDate}
                </span>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                  0 筆
                </span>
                {!singleDateNote && (
                  <button
                    type="button"
                    onClick={() => setEditingDateNoteStr(singleDate)}
                    className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md transition flex items-center gap-1 shadow-sm active:scale-95"
                    title="記錄那天是做什麼的"
                  >
                    <StickyNote className="w-3 h-3 text-emerald-400" />
                    <span>+ 備忘</span>
                  </button>
                )}
              </div>
              <span className="font-mono text-xs font-black text-slate-400">
                小計 NT$ 0
              </span>
            </div>

            {/* 當日備忘資訊卡 */}
            {singleDateNote ? (
              <div
                onClick={() => setEditingDateNoteStr(singleDate)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 text-xs transition cursor-pointer group"
                title="點擊編輯當日活動備註"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StickyNote className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-bold text-[11px] text-emerald-200 flex-shrink-0">那天做什麼：</span>
                  <span className="truncate text-slate-200 font-medium">{singleDateNote}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 opacity-70 group-hover:opacity-100 transition flex-shrink-0">
                  <Edit2 className="w-3 h-3" />
                  <span>編輯</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDateNoteStr(singleDate)}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-800 hover:border-emerald-500/40 bg-slate-900/30 hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-300 text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <StickyNote className="w-3.5 h-3.5 text-emerald-400" />
                <span>點此記錄這天是做什麼的 (行程/活動備忘)</span>
              </button>
            )}

            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-slate-400 font-medium">當日尚無記帳記錄</p>
              {onOpenQuickInput && (
                <button
                  type="button"
                  onClick={onOpenQuickInput}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  + 新增支出
                </button>
              )}
            </div>
          </div>

          {editingDateNoteStr && (
            <DateNoteModal
              isOpen={Boolean(editingDateNoteStr)}
              onClose={() => setEditingDateNoteStr(null)}
              dateStr={editingDateNoteStr}
            />
          )}
        </div>
      );
    }

    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-200 text-sm">{emptyMessage}</h3>
        </div>
        {onOpenQuickInput && (
          <button
            type="button"
            onClick={onOpenQuickInput}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            + 新增第一筆支出
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedDates.map((dateStr) => {
        const dayTransactions = groupedByDate[dateStr];
        const dayTotal = dayTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const dateNote = currentDateNotes[dateStr];

        return (
          <div
            key={dateStr}
            className="glass-panel rounded-3xl p-3.5 sm:p-4 space-y-2.5 transition shadow-sm"
          >
            {/* 日期標題與當日小計 */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {dateStr}
                </span>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                  {dayTransactions.length} 筆
                </span>
                {!dateNote && (
                  <button
                    type="button"
                    onClick={() => setEditingDateNoteStr(dateStr)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80 px-1.5 py-0.5 rounded-md transition flex items-center gap-1 active:scale-95"
                    title="記錄那天是做什麼的"
                  >
                    <StickyNote className="w-3 h-3 text-emerald-500/80" />
                    <span>+ 備忘</span>
                  </button>
                )}
              </div>
              <span className="font-mono text-xs font-black text-slate-200">
                小計 NT$ {dayTotal.toLocaleString()}
              </span>
            </div>

            {/* 📝 當日活動備忘說明卡片 (若有備註) */}
            {dateNote && (
              <div
                onClick={() => setEditingDateNoteStr(dateStr)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 text-xs transition cursor-pointer group"
                title="點擊編輯當日活動備註"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StickyNote className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-bold text-[11px] text-emerald-200 flex-shrink-0">那天做什麼：</span>
                  <span className="truncate text-slate-200 font-medium">{dateNote}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 opacity-60 group-hover:opacity-100 transition flex-shrink-0">
                  <Edit2 className="w-3 h-3" />
                  <span>編輯</span>
                </div>
              </div>
            )}

            {/* 當日交易清單 */}
            <div className="space-y-1.5">
              {dayTransactions.map((tx) => {
                const isSelected = selectedTxIds.includes(tx.id);

                return (
                  <TransactionItemRow
                    key={tx.id}
                    tx={tx}
                    isSelected={isSelected}
                    isBatchMode={isBatchMode}
                    showTagBadge={showTagBadge}
                    onClick={() => {
                      if (isBatchMode && onToggleSelectTx) {
                        onToggleSelectTx(tx.id);
                      } else {
                        onEditTransaction(tx);
                      }
                    }}
                    onLongPress={() => {
                      if (isBatchMode && onToggleSelectTx) {
                        onToggleSelectTx(tx.id);
                      } else if (onEnterBatchModeWithTx) {
                        onEnterBatchModeWithTx(tx.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 📝 日期活動備忘編輯彈窗 */}
      {editingDateNoteStr && (
        <DateNoteModal
          isOpen={Boolean(editingDateNoteStr)}
          onClose={() => setEditingDateNoteStr(null)}
          dateStr={editingDateNoteStr}
        />
      )}
    </div>
  );
};
