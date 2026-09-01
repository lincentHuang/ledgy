'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Check,
} from 'lucide-react';

interface CustomDateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  onConfirm: (startDate: string, endDate: string) => void;
}

export const CustomDateRangePickerModal: React.FC<CustomDateRangePickerModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onConfirm,
}) => {
  // 內部暫存選取狀態
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

  // 當前日曆顯示的年月 (預設以 tempEnd 為主)
  const initialDate = useMemo(() => {
    return tempEnd ? new Date(tempEnd) : new Date();
  }, [tempEnd]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth() + 1); // 1-12

  // 選取階段：0 = 準備選 start, 1 = 已選 start 準備選 end
  const [step, setStep] = useState<0 | 1>(0);

  // 計算選定總天數 (無條件呼叫 Hook)
  const totalDays = useMemo(() => {
    if (!tempStart || !tempEnd) return 1;
    const s = new Date(tempStart);
    const e = new Date(tempEnd);
    const diff = Math.max(0, e.getTime() - s.getTime());
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [tempStart, tempEnd]);

  // 生成日曆網格矩陣 (無條件呼叫 Hook)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth, 0);
    const startWeekDay = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];

    // 前一個月的填充日
    const prevMonthLastDay = new Date(viewYear, viewMonth - 1, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
      const mStr = String(prevMonth).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${prevYear}-${mStr}-${dStr}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // 當月日期
    const mStr = String(viewMonth).padStart(2, '0');
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${viewYear}-${mStr}-${dStr}`,
        day: i,
        isCurrentMonth: true,
      });
    }

    // 下一個月填充日 (補齊至 35 或 42 格)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
      const nmStr = String(nextMonth).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dateStr: `${nextYear}-${nmStr}-${dStr}`,
        day: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // 當 modal 開啟時重置同步
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      const d = endDate ? new Date(endDate) : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
      setStep(0);
    }
  }, [isOpen, startDate, endDate]);

  // 確保所有 Hooks 皆已被無條件調用後，再判定是否渲染
  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleResetToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    const todayStr = today.toISOString().split('T')[0];
    setTempStart(todayStr);
    setTempEnd(todayStr);
    setStep(0);
  };

  // 快捷選擇
  const handleQuickPreset = (preset: 'today' | 'yesterday' | '7D' | '30D' | 'this_month' | 'last_month') => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setTempStart(endStr);
      setTempEnd(endStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setTempStart(yStr);
      setTempEnd(yStr);
    } else if (preset === '7D') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(endStr);
    } else if (preset === '30D') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(endStr);
    } else if (preset === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(endStr);
    } else if (preset === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setTempStart(start.toISOString().split('T')[0]);
      setTempEnd(end.toISOString().split('T')[0]);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setStep(0);
  };

  // 點擊特定日曆單元格
  const handleDayClick = (dateStr: string) => {
    if (step === 0) {
      // 步驟 1：設定起始日
      setTempStart(dateStr);
      setTempEnd(dateStr);
      setStep(1);
    } else {
      // 步驟 2：設定結束日 (自動排序前後)
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd(tempStart);
      } else {
        setTempEnd(dateStr);
      }
      setStep(0);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm glass-panel p-4 sm:p-5 rounded-3xl bg-slate-950/95 border border-slate-700/90 shadow-2xl space-y-4 text-slate-100 animate-in zoom-in-95 duration-150">
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">選擇日期區間</h3>
              <p className="text-[11px] text-slate-400">自訂財務分析與報表週期</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 快捷選擇標籤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs -mx-1 px-1">
          <button
            onClick={() => handleQuickPreset('today')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-400 font-bold transition flex-shrink-0"
          >
            今天
          </button>
          <button
            onClick={() => handleQuickPreset('7D')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-400 font-bold transition flex-shrink-0"
          >
            近 7 天
          </button>
          <button
            onClick={() => handleQuickPreset('30D')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-400 font-bold transition flex-shrink-0"
          >
            近 30 天
          </button>
          <button
            onClick={() => handleQuickPreset('this_month')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-400 font-bold transition flex-shrink-0"
          >
            本月
          </button>
          <button
            onClick={() => handleQuickPreset('last_month')}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-300 text-slate-400 font-bold transition flex-shrink-0"
          >
            上個月
          </button>
        </div>

        {/* 區間預覽與狀態提示 */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${step === 0 ? 'bg-emerald-600 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                起 {tempStart}
              </span>
              <span className="text-slate-500 font-sans">至</span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${step === 1 ? 'bg-emerald-600 text-white animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                訖 {tempEnd}
              </span>
            </div>
            <span className="font-bold text-emerald-400 font-mono">
              共 {totalDays} 天
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {step === 0
              ? '💡 點選第 1 個日期設為起始日'
              : '👉 請點選第 2 個日期以完成區間設定'}
          </p>
        </div>

        {/* 年月切換控制器 */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition active:scale-95"
            title="上個月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="font-mono font-black text-sm text-white flex items-center gap-2">
            <span>{viewYear} 年 {viewMonth} 月</span>
            <button
              onClick={handleResetToToday}
              className="text-[10px] font-sans font-bold text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800"
            >
              本月
            </button>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition active:scale-95"
            title="下個月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 日曆網格 */}
        <div className="space-y-1">
          {/* 星期標頭 */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 pb-1">
            <span className="text-rose-400">日</span>
            <span>一</span>
            <span>二</span>
            <span>三</span>
            <span>四</span>
            <span>五</span>
            <span className="text-emerald-400">六</span>
          </div>

          {/* 日期單元格 */}
          <div className="grid grid-cols-7 gap-y-1 text-xs">
            {calendarDays.map((d, idx) => {
              const isStart = d.dateStr === tempStart;
              const isEnd = d.dateStr === tempEnd;
              const isInRange = d.dateStr > tempStart && d.dateStr < tempEnd;
              const isToday = d.dateStr === todayStr;

              let cellStyle = 'hover:bg-slate-800 text-slate-200';
              if (!d.isCurrentMonth) {
                cellStyle = 'text-slate-600 hover:text-slate-400 hover:bg-slate-900';
              }

              if (isStart && isEnd) {
                cellStyle = 'bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 scale-105';
              } else if (isStart) {
                cellStyle = 'bg-emerald-600 text-white font-black rounded-l-2xl shadow-md';
              } else if (isEnd) {
                cellStyle = 'bg-emerald-600 text-white font-black rounded-r-2xl shadow-md';
              } else if (isInRange) {
                cellStyle = 'bg-emerald-950/70 text-emerald-200 font-bold border-y border-emerald-800/40 rounded-none';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(d.dateStr)}
                  className={`h-9 flex flex-col items-center justify-center relative transition-all active:scale-90 ${cellStyle}`}
                >
                  <span className="font-mono">{d.day}</span>
                  {isToday && !isStart && !isEnd && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 底部操作按鈕 */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition border border-slate-800"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm(tempStart, tempEnd);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>套用區間 ({totalDays} 天)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
