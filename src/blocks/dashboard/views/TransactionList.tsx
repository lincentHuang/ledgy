'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, DEFAULT_TAG_ITEMS, generateTagKey } from '@/lib/store';
import { Platform } from '@/lib/platform';
import {
  Search,
  Tag,
  Users,
  Wallet,
  Trash2,
  Edit2,
  Sparkles,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  Briefcase,
  Calendar,
  List,
  CalendarDays,
  CreditCard,
  Plus,
  X,
  Check,
  CheckSquare,
} from 'lucide-react';
import { Transaction, TagItem } from '@app/shared';
import { WeekView } from './WeekView';
import { MonthCalendarView } from './MonthCalendarView';
import { TransactionGroupedList } from './TransactionGroupedList';
import { OverviewCards } from './OverviewCards';
import { SearchModal } from './SearchModal';
import { Button, TagPill, SegmentedControl, Input, Card } from '@/components';


const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Users,
  MoreHorizontal,
  Briefcase,
};

export const TransactionList: React.FC<{ onOpenQuickInput: () => void }> = ({
  onOpenQuickInput,
}) => {
  const {
    filteredTransactions,
    currentPaymentMethods,
    currentTagItems,
    currentTags,
    getTagByKey,
    getTagByName,
    deleteTransaction,
    deleteTransactions,
    updateTransaction,
    viewMode,
    setViewMode,
    selectedTagFilter,
    selectedTagFilters,
    setSelectedTagFilters,
    toggleTagFilter,
    dateRangeFilter,
    setDateRangeFilter,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  // ✏️ 快速勾選與批次管理狀態
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [batchSelectedTags, setBatchSelectedTags] = useState<string[]>([]);
  const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
  const [batchTargetDate, setBatchTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // 標籤與搜尋有效狀態
  const activeTags = selectedTagFilters.filter((t) => t && t !== 'all');
  const isTagFiltered = activeTags.length > 0;
  const showTagBadge = !isTagFiltered || activeTags.length > 1;
  const isDateFiltered = Boolean(dateRangeFilter?.startDate && dateRangeFilter?.endDate);
  const isSearchFiltered = Boolean(searchQuery && searchQuery.trim());
  const isAnyFilterActive = isTagFiltered || isDateFiltered || isSearchFiltered;

  // 篩選列表
  const displayList = filteredTransactions.filter((tx) => {
    const title = tx.title || '';
    const merchant = tx.merchant || '';
    const tags = Array.isArray(tx.tags) ? tx.tags : [];
    const q = (searchQuery || '').toLowerCase();

    // 1. 搜尋篩選
    if (isSearchFiltered) {
      const matchesSearch =
        title.toLowerCase().includes(q) ||
        merchant.toLowerCase().includes(q) ||
        tags.some((t) => (t || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // 2. 標籤複選篩選 (符合任意一個已勾選標籤名稱或 key)
    if (isTagFiltered) {
      const matchesTag =
        tags.some((t) => activeTags.includes(t)) ||
        (tx.tagIds || []).some((tid) => {
          const item = getTagByKey(tid);
          return activeTags.includes(tid) || (item && activeTags.includes(item.name));
        });
      if (!matchesTag) return false;
    }

    // 3. 日期區間篩選 (若全域仍有設定時相容)
    if (isDateFiltered && dateRangeFilter) {
      if (tx.date < dateRangeFilter.startDate || tx.date > dateRangeFilter.endDate) {
        return false;
      }
    }

    return true;
  });

  // 計算已篩選列表的總支出與各標籤小計統計
  const totalFilteredExpense = displayList
    .filter((t) => t.type !== 'income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // 標籤佔比小計計算
  const tagBreakdown = activeTags.map((tag) => {
    const tagTxs = displayList.filter((tx) => (tx.tags || []).includes(tag));
    const tagSum = tagTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const percent = totalFilteredExpense > 0 ? Math.round((tagSum / totalFilteredExpense) * 100) : 0;
    return { tag, count: tagTxs.length, sum: tagSum, percent };
  });

  const toggleSelectTx = (id: string) => {
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((x) => x !== id));
    } else {
      setSelectedTxIds([...selectedTxIds, id]);
    }
  };

  const handleEnterBatchMode = (id: string) => {
    setIsBatchMode(true);
    setSelectedTxIds([id]);
  };

  const handleSelectAll = () => {
    if (selectedTxIds.length === displayList.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(displayList.map((t) => t.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedTxIds.length === 0) return;
    if (confirm(`確定要刪除選取的 ${selectedTxIds.length} 筆記帳記錄嗎？`)) {
      deleteTransactions(selectedTxIds);
      setSelectedTxIds([]);
      setIsBatchMode(false);
    }
  };

  const handleApplyBatchTags = () => {
    if (selectedTxIds.length === 0 || batchSelectedTags.length === 0) return;
    const targetTag = batchSelectedTags[0] || '未歸類';
    const matchedTag = currentTagItems.find((item) => item.name === targetTag || item.id === targetTag);
    const targetTagId = matchedTag ? matchedTag.id : generateTagKey(targetTag);
    selectedTxIds.forEach((id) => {
      updateTransaction(id, {
        tags: [targetTag],
        tagIds: [targetTagId],
      });
    });
    setIsBatchTagModalOpen(false);
    setBatchSelectedTags([]);
    setSelectedTxIds([]);
    setIsBatchMode(false);
    alert(`已成功將選取的 ${selectedTxIds.length} 筆記帳標籤設為「#${targetTag}」！`);
  };

  const handleApplyBatchDate = () => {
    if (selectedTxIds.length === 0 || !batchTargetDate) return;
    selectedTxIds.forEach((id) => {
      updateTransaction(id, { date: batchTargetDate });
    });
    setIsBatchDateModalOpen(false);
    setSelectedTxIds([]);
    setIsBatchMode(false);
    alert(`已成功將選取的 ${selectedTxIds.length} 筆記帳日期修改為「${batchTargetDate}」！`);
  };

  const openEditTransaction = (tx: Transaction) => {
    const rawTag = tx.tags?.[0] || '未歸類';
    const rawTagId = tx.tagIds?.[0];

    // 優先比對 tagIds，次之比對標籤名稱
    const matchedTag =
      currentTagItems.find((t) => (rawTagId && t.id === rawTagId) || t.name === rawTag || t.id === rawTag) ||
      DEFAULT_TAG_ITEMS.find((t) => (rawTagId && t.id === rawTagId) || t.name === rawTag || t.id === rawTag);

    const resolvedTagName = matchedTag ? matchedTag.name : rawTag;
    const resolvedTagId = matchedTag ? matchedTag.id : (rawTagId || generateTagKey(resolvedTagName));

    setEditingTx({
      ...tx,
      tags: [resolvedTagName],
      tagIds: [resolvedTagId],
    });
  };

  const handleSelectEditTag = (tagItem: TagItem) => {
    if (!editingTx) return;
    setEditingTx({
      ...editingTx,
      tags: [tagItem.name],
      tagIds: [tagItem.id],
    });
  };

  // 🏷️ 標籤頁籤單選與滑動切換邏輯
  const tagsNavRef = useRef<HTMLDivElement>(null);

  // 所有可用標籤列表（包含「全部」）
  const tagTabs = useMemo(() => {
    return [
      { id: 'all', name: '全部' },
      ...currentTagItems.map((t) => ({ id: t.id, name: t.name })),
    ];
  }, [currentTagItems]);

  // 當前選中的標籤索引 (0 代表「全部」)
  const currentTabIndex = useMemo(() => {
    if (activeTags.length === 0) return 0;
    const idx = tagTabs.findIndex(
      (t) => t.name === activeTags[0] || t.id === activeTags[0]
    );
    return idx >= 0 ? idx : 0;
  }, [tagTabs, activeTags]);

  const handleSelectTagTab = useCallback(
    (tagName: string) => {
      if (tagName === '全部' || tagName === 'all') {
        setSelectedTagFilters([]);
      } else {
        setSelectedTagFilters([tagName]);
      }
    },
    [setSelectedTagFilters]
  );

  // 切換至上一標籤 / 下一標籤 (支援邊界保護與震動回饋)
  const handlePrevTag = useCallback(() => {
    if (currentTabIndex > 0) {
      const prevTab = tagTabs[currentTabIndex - 1];
      handleSelectTagTab(prevTab.name);
      Platform.haptic('light');
    }
  }, [currentTabIndex, tagTabs, handleSelectTagTab]);

  const handleNextTag = useCallback(() => {
    if (currentTabIndex < tagTabs.length - 1) {
      const nextTab = tagTabs[currentTabIndex + 1];
      handleSelectTagTab(nextTab.name);
      Platform.haptic('light');
    }
  }, [currentTabIndex, tagTabs, handleSelectTagTab]);

  // 當標籤切換時，自動將該標籤膠囊滑動置中
  useEffect(() => {
    if (tagsNavRef.current) {
      const activeEl = tagsNavRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedTagFilters]);

  // 📱 手機版左右滑動切換標籤手勢偵測
  const touchStartRef = useRef<{ x: number; y: number; time: number; valid: boolean }>({
    x: 0,
    y: 0,
    time: 0,
    valid: false,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (
      e.touches.length !== 1 ||
      isBatchMode ||
      isSearchModalOpen ||
      isBatchTagModalOpen ||
      isBatchDateModalOpen
    ) {
      touchStartRef.current.valid = false;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      valid: true,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current.valid || e.changedTouches.length !== 1) {
      touchStartRef.current.valid = false;
      return;
    }
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current.valid = false;

    const minDistance = 40;
    const maxDuration = 600;
    // 判定為水平滑動 (水平距離達標且水平位移大於垂直位移，避免干擾正常頁面垂直滾動)
    if (
      Math.abs(deltaX) >= minDistance &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.25 &&
      deltaTime <= maxDuration
    ) {
      if (deltaX < 0) {
        // 向左滑動 -> 切換至下一個標籤
        handleNextTag();
      } else {
        // 向右滑動 -> 切換至上一個標籤
        handlePrevTag();
      }
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 頂部：檢視模式切換器 (月檢視 / 週檢視) & 搜尋 Modal 按鈕 */}
      <div className="flex items-center justify-between gap-2">
        {/* 檢視模式切換 (月 / 週) */}
        <SegmentedControl
          value={viewMode === 'week' ? 'week' : 'month'}
          onChange={(val) => setViewMode(val as any)}
          options={[
            { value: 'month', label: '月', icon: <CalendarDays className="w-3.5 h-3.5" /> },
            { value: 'week', label: '週', icon: <Calendar className="w-3.5 h-3.5" /> },
          ]}
        />

        {/* 🔍 搜尋 Modal 觸發按鈕 */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-700 text-xs transition shadow-sm max-w-[220px] sm:max-w-xs flex-1 justify-start"
          title="開啟搜尋彈窗"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate text-slate-400">搜尋品項或 #標籤...</span>
        </button>
      </div>

      {/* ⚡ 批次操作固定工具列 (當長按項目進入 isBatchMode 時，浮現在 dock 正上方，手機版優先設計) */}
      {isBatchMode && (
        <div className="fixed bottom-[calc(62px+env(safe-area-inset-bottom,0px))] lg:bottom-4 left-3 right-3 sm:left-6 sm:right-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-full max-w-lg z-40 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200 ring-1 ring-emerald-500/30">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700/80 font-bold text-xs whitespace-nowrap transition active:scale-95 shadow-sm flex-shrink-0"
          >
            {selectedTxIds.length === displayList.length && displayList.length > 0 ? '取消全選' : '全選'}
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setIsBatchTagModalOpen(true)}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Tag className="w-3.5 h-3.5 text-emerald-400" />}
              className="px-2 sm:px-2.5"
            >
              標籤
            </Button>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setBatchTargetDate(new Date().toISOString().split('T')[0]);
                setIsBatchDateModalOpen(true);
              }}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-sky-400" />}
              className="px-2 sm:px-2.5"
            >
              日期
            </Button>

            <Button
              variant="danger"
              size="xs"
              onClick={handleBatchDelete}
              disabled={selectedTxIds.length === 0}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              className="px-2 sm:px-2.5"
            >
              刪除
            </Button>

            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                setIsBatchMode(false);
                setSelectedTxIds([]);
              }}
              className="px-2.5 sm:px-3"
            >
              完成
            </Button>
          </div>
        </div>
      )}

      {/* 🏷️ 標籤篩選列 (單選標籤，於 列表 / 週 / 月 檢視常駐提供篩選，自身保留流暢橫向滾動) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300">標籤篩選</span>
            <span className="text-[10px] text-slate-500">(單選 ‧ 下方區域可左右滑動切換)</span>
          </div>
          {(isTagFiltered || isDateFiltered || isSearchFiltered) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTagFilters([]);
                setDateRangeFilter(null);
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-rose-400 underline text-[10px] transition"
            >
              清除所有篩選
            </button>
          )}
        </div>

        <div
          ref={tagsNavRef}
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs scroll-smooth"
        >
          <TagPill
            tag="全部"
            active={!isTagFiltered}
            onClick={() => handleSelectTagTab('全部')}
          />
          {currentTagItems.map((tagItem) => {
            const isSelected = activeTags.includes(tagItem.name) || activeTags.includes(tagItem.id);
            return (
              <TagPill
                key={tagItem.id}
                tag={tagItem.name}
                active={isSelected}
                onClick={() => handleSelectTagTab(tagItem.name)}
              />
            );
          })}
        </div>
      </div>

      {/* 📱 標籤以下到 Dock 以上之主要內容手勢感應滑動區 */}
      <div
        className="space-y-3.5 min-h-[calc(100dvh-240px)] touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <OverviewCards />

        {viewMode === 'week' ? (
          <WeekView
            onEditTransaction={(tx) => openEditTransaction(tx)}
            onOpenQuickInput={onOpenQuickInput}
            isBatchMode={isBatchMode}
            selectedTxIds={selectedTxIds}
            onToggleSelectTx={toggleSelectTx}
            onEnterBatchModeWithTx={handleEnterBatchMode}
          />
        ) : (
          <MonthCalendarView
            onEditTransaction={(tx) => openEditTransaction(tx)}
            onOpenQuickInput={onOpenQuickInput}
            isBatchMode={isBatchMode}
            selectedTxIds={selectedTxIds}
            onToggleSelectTx={toggleSelectTx}
            onEnterBatchModeWithTx={handleEnterBatchMode}
          />
        )}
      </div>

      {/* 🏷️ 批次修改標籤彈窗 */}
      {isBatchTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>批次修改標籤 ({selectedTxIds.length} 筆)</span>
              </h3>
              <button
                onClick={() => setIsBatchTagModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              請選擇欲套用至已選取 <strong className="text-white font-bold">{selectedTxIds.length} 筆</strong> 記帳的標籤 (單一標籤)：
            </p>

            {/* 標籤點選區 (單選) */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              {currentTagItems.map((tagItem) => {
                const isTagSelected = batchSelectedTags.includes(tagItem.name) || batchSelectedTags.includes(tagItem.id);
                return (
                  <button
                    key={tagItem.id}
                    type="button"
                    onClick={() => {
                      setBatchSelectedTags([tagItem.name]);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                      isTagSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>#{tagItem.name}</span>
                    {isTagSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBatchTagModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleApplyBatchTags}
                disabled={batchSelectedTags.length === 0}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 shadow-md"
              >
                套用標籤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 批次修改日期彈窗 */}
      {isBatchDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>批次修改日期 ({selectedTxIds.length} 筆)</span>
              </h3>
              <button
                onClick={() => setIsBatchDateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              請選擇欲套用至已選取 <strong className="text-white font-bold">{selectedTxIds.length} 筆</strong> 記帳項目的新日期：
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400">指定消費日期</label>
              <input
                type="date"
                value={batchTargetDate}
                onChange={(e) => setBatchTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBatchDateModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleApplyBatchDate}
                disabled={!batchTargetDate}
                className="px-4 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 disabled:opacity-40 shadow-md"
              >
                套用新日期
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 單筆明細快速編輯彈窗 */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm max-h-[var(--app-height,90vh)] overflow-y-auto rounded-3xl glass-modal p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>編輯記帳項目</span>
              </h3>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">品項名稱</label>
                <input
                  type="text"
                  value={editingTx.title}
                  onChange={(e) => setEditingTx({ ...editingTx, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">金額 (NT$)</label>
                  <input
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-mono text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">消費日期</label>
                  <input
                    type="date"
                    value={editingTx.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-mono text-white outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">付款方式</label>
                <select
                  value={editingTx.paymentMethod}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {currentPaymentMethods.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* 標籤管理 (單選) */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">歸屬標籤 (單一標籤)</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-900/60 rounded-xl border border-slate-800 mb-1">
                  {currentTagItems.map((tagItem) => {
                    const currentId = editingTx.tagIds?.[0];
                    const currentName = editingTx.tags?.[0];
                    const isSelected = currentId
                      ? tagItem.id === currentId
                      : tagItem.name === currentName || (currentName === '未歸類' && tagItem.name === '未歸類');
                    return (
                      <button
                        key={tagItem.id}
                        type="button"
                        onClick={() => handleSelectEditTag(tagItem)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-slate-200'
                        }`}
                      >
                        <span>#{tagItem.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (confirm(`確定要刪除「${editingTx.title}」嗎？`)) {
                    deleteTransaction(editingTx.id);
                    setEditingTx(null);
                  }
                }}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 transition"
                title="刪除此筆記錄"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    updateTransaction(editingTx.id, editingTx);
                    setEditingTx(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                >
                  儲存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 搜尋彈窗 */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onEditTransaction={openEditTransaction}
      />
    </div>
  );
};
