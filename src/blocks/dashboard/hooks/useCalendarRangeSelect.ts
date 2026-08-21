'use client';

import { useState, useRef, useCallback } from 'react';
import { Platform } from '@/lib/platform';

interface UseCalendarRangeSelectOptions {
  selectedDates: string[];
  onSelectDates: (dates: string[]) => void;
}

export function useCalendarRangeSelect({
  selectedDates,
  onSelectDates,
}: UseCalendarRangeSelectOptions) {
  const [isRangeAdjustMode, setIsRangeAdjustMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 切換「調整範圍 (滑動框選)」模式：開啟時自動平滑滾動到視窗頂部
  const toggleRangeMode = useCallback(() => {
    const nextMode = !isRangeAdjustMode;
    setIsRangeAdjustMode(nextMode);
    Platform.haptic(nextMode ? 'medium' : 'light');

    if (nextMode && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isRangeAdjustMode]);

  // 手勢滑動框選：PointerDown
  const handlePointerDown = useCallback((dateStr: string, e: React.PointerEvent) => {
    if (!isRangeAdjustMode) return;
    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}
    setIsDragging(true);
    setDragStartDate(dateStr);
    onSelectDates([dateStr]);
    Platform.haptic('light');
  }, [isRangeAdjustMode, onSelectDates]);

  // 手勢滑動框選：PointerMove
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRangeAdjustMode || !isDragging || !dragStartDate) return;

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const dateCell = targetEl?.closest('[data-date]') as HTMLElement | null;
    if (dateCell && dateCell.dataset.date) {
      const currentDateStr = dateCell.dataset.date;
      const start = new Date(dragStartDate).getTime();
      const current = new Date(currentDateStr).getTime();

      const minDate = new Date(Math.min(start, current));
      const maxDate = new Date(Math.max(start, current));

      const range: string[] = [];
      const cur = new Date(minDate);
      while (cur <= maxDate) {
        range.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }

      if (range.length !== selectedDates.length || range[0] !== selectedDates[0]) {
        onSelectDates(range);
        Platform.haptic('light');
      }
    }
  }, [isRangeAdjustMode, isDragging, dragStartDate, selectedDates, onSelectDates]);

  // 手勢滑動框選：PointerUp
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isRangeAdjustMode || !isDragging) return;
    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {}
    setIsDragging(false);
    setDragStartDate(null);
    Platform.haptic('success');
  }, [isRangeAdjustMode, isDragging]);

  // 單點切換特定日期（適用於非滑動時或週檢視）
  const handleToggleDay = useCallback((dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) {
        onSelectDates(selectedDates.filter((d) => d !== dateStr));
      }
    } else {
      onSelectDates([...selectedDates, dateStr]);
    }
    Platform.haptic('light');
  }, [selectedDates, onSelectDates]);

  return {
    isRangeAdjustMode,
    isDragging,
    containerRef,
    toggleRangeMode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleToggleDay,
  };
}
