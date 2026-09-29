'use client';

import React, { useState, useEffect, useId } from 'react';
import { useAppStore } from '@/lib/store';
import { Calendar, X, Sparkles, Trash2, Check, StickyNote } from 'lucide-react';

interface DateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
}

const PRESET_EVENT_TAGS = [
  { label: '🏖️ 出遊旅行', text: '出遊旅行' },
  { label: '🎂 聚餐慶生', text: '聚餐慶生' },
  { label: '💍 參加婚禮', text: '參加婚禮' },
  { label: '💼 出差開會', text: '出差開會' },
  { label: '💰 發薪日', text: '發薪日' },
  { label: '🛒 採購購物', text: '採購購物' },
  { label: '🩺 看診健檢', text: '看診健檢' },
  { label: '🏃 運動健身', text: '運動健身' },
  { label: '🏠 居家休假', text: '居家休假' },
];

export const DateNoteModal: React.FC<DateNoteModalProps> = ({
  isOpen,
  onClose,
  dateStr,
}) => {
  const { currentDateNotes, setDateNote, deleteDateNote } = useAppStore();
  const [note, setNote] = useState('');
  const titleId = useId();

  // 當彈窗開啟或切換日期時，載入既有備忘
  useEffect(() => {
    if (isOpen && dateStr) {
      setNote(currentDateNotes[dateStr] || '');
    }
  }, [isOpen, dateStr, currentDateNotes]);

  if (!isOpen || !dateStr) return null;

  // 格式化日期：2026 年 9 月 30 日 星期三
  const formatDateTitle = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m - 1, d);
        const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dayName = weekDays[dateObj.getDay()] || '';
        return `${y} 年 ${m} 月 ${d} 日 (${dayName})`;
      }
    } catch {}
    return dStr;
  };

  const handleSave = () => {
    setDateNote(dateStr, note);
    onClose();
  };

  const handleDelete = () => {
    deleteDateNote(dateStr);
    onClose();
  };

  const handleAddPreset = (text: string) => {
    if (!note.trim()) {
      setNote(text);
    } else if (!note.includes(text)) {
      setNote((prev) => `${prev.trim()} · ${text}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const hasExistingNote = Boolean(currentDateNotes[dateStr]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl glass-modal border border-emerald-500/30 bg-slate-900/95 shadow-2xl p-4 sm:p-5 space-y-4 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 id={titleId} className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>當日活動備註</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {formatDateTitle(dateStr)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 說明與快速情境推薦 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>那天是做什麼的？</span>
            </label>
            <span className="text-[10px] text-slate-400">點選快速套用</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_EVENT_TAGS.map((preset) => (
              <button
                key={preset.text}
                type="button"
                onClick={() => handleAddPreset(preset.text)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700/60 hover:border-emerald-600/50 text-slate-300 hover:text-emerald-300 transition active:scale-95 shadow-sm"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 備忘輸入框 */}
        <div className="space-y-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            autoFocus
            placeholder="例如：全家去宜蘭礁溪泡溫泉、跟朋友慶生聚餐、發薪日存錢..."
            className="w-full rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
            <span>支援 Enter 換行，Cmd + Enter 快速儲存</span>
            <span>{note.length} 字</span>
          </div>
        </div>

        {/* 操作按鈕列 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
          <div>
            {hasExistingNote && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-950/80 border border-rose-900/60 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清除備註</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>儲存備註</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
