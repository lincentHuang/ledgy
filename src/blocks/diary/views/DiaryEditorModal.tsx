'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookHeart, Check, Trash2, Plus, Receipt, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Modal } from '@/components';
import { Platform } from '@/lib/platform';
import {
  DIARY_MOODS,
  formatDiaryDate,
  groupMyTransactionsByDate,
  sumByType,
  toDateKey,
} from '@/lib/shared/diary';

interface DiaryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  onOpenQuickInput?: () => void;
}

/** 單日日記：上方列出當天我記的帳，下方寫心情與日記 */
export const DiaryEditorModal: React.FC<DiaryEditorModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  onOpenQuickInput,
}) => {
  const { diaryEntries, saveDiaryEntry, deleteDiaryEntry, transactions, user, households } = useAppStore();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string | undefined>(undefined);

  const existing = diaryEntries[dateStr];

  // 開啟或切換日期時載入既有日記
  useEffect(() => {
    if (isOpen && dateStr) {
      setContent(existing?.content || '');
      setMood(existing?.mood);
    }
    // 只在開啟/切換日期時重置，避免雲端同步覆蓋正在輸入的內容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dateStr]);

  const dayTx = useMemo(
    () => groupMyTransactionsByDate(transactions, user.uid)[dateStr] || [],
    [transactions, user.uid, dateStr]
  );
  const expense = sumByType(dayTx, 'expense');
  const income = sumByType(dayTx, 'income');
  const isToday = dateStr === toDateKey();

  const getLedgerName = (householdId?: string) =>
    householdId ? households.find((h) => h.id === householdId)?.name || '群組帳本' : null;

  const handleSave = () => {
    saveDiaryEntry(dateStr, { content, mood });
    Platform.haptic('success');
    onClose();
  };

  const handleDelete = () => {
    deleteDiaryEntry(dateStr);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(dateStr)}
      onClose={onClose}
      title={isToday ? '今天的日記' : '生活日記'}
      subtitle={formatDiaryDate(dateStr)}
      icon={<BookHeart className="w-5 h-5 text-emerald-400" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {existing && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap text-rose-400 hover:text-white hover:bg-rose-950/80 border border-rose-900/60 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除日記</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>儲存日記</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 當天記帳 */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>這天的記帳</span>
            </h4>
            {dayTx.length > 0 && (
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                支出 <span className="font-bold text-rose-300">${expense.toLocaleString()}</span>
                {income > 0 && (
                  <>
                    {' · '}收入 <span className="font-bold text-emerald-300">${income.toLocaleString()}</span>
                  </>
                )}
              </span>
            )}
          </div>

          {dayTx.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-950/30 border border-amber-700/40 px-3 py-2">
              <span className="text-xs text-amber-200 flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">這天還沒有記帳</span>
              </span>
              {isToday && onOpenQuickInput && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQuickInput();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap bg-amber-500/90 hover:bg-amber-400 text-slate-950 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>去記帳</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {dayTx.map((t) => {
                const ledgerName = getLedgerName(t.householdId);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-slate-200">
                      {t.categoryIcon && <span className="mr-1">{t.categoryIcon}</span>}
                      {t.title}
                      {ledgerName && <span className="ml-1.5 text-[10px] text-purple-300">· {ledgerName}</span>}
                    </span>
                    <span
                      className={`shrink-0 font-mono font-bold ${
                        t.type === 'income' ? 'text-emerald-300' : 'text-slate-100'
                      }`}
                    >
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${Number(t.amount).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 心情 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">今天心情如何？</label>
          <div className="flex flex-wrap gap-1.5">
            {DIARY_MOODS.map((m) => (
              <button
                key={m.emoji}
                type="button"
                onClick={() => setMood((prev) => (prev === m.emoji ? undefined : m.emoji))}
                className={`flex flex-col items-center px-2.5 py-1 rounded-xl border transition active:scale-95 ${
                  mood === m.emoji
                    ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-500'
                }`}
                aria-pressed={mood === m.emoji}
              >
                <span className="text-lg leading-none">{m.emoji}</span>
                <span className="text-[10px] mt-0.5 whitespace-nowrap">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 日記內容 */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">發生了什麼事？</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            placeholder="例如：中午和同事吃了新開的拉麵、下班去健身房、晚上整理房間…"
            className="w-full rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center gap-2 text-[10px] text-slate-400 px-1">
            <span className="min-w-0 truncate">日記只有你自己看得到，不會分享給群組成員</span>
            <span className="shrink-0 whitespace-nowrap">{content.length} 字</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
