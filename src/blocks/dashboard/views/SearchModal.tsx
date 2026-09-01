'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Transaction } from '@app/shared';
import {
  Search,
  X,
  Edit2,
  Calendar,
  Tag,
  CreditCard,
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
  DollarSign,
} from 'lucide-react';

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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onEditTransaction,
}) => {
  const { filteredTransactions, currentTagItems } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setKeyword('');
      setSelectedTag(null);
    }
  }, [isOpen]);

  // 即時搜尋與篩選邏輯
  const searchResults = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q && !selectedTag) return [];

    return filteredTransactions.filter((tx) => {
      // 標籤篩選
      if (selectedTag) {
        const tags = Array.isArray(tx.tags) ? tx.tags : [];
        const hasTag =
          tags.includes(selectedTag) || (tx.tagIds || []).includes(selectedTag);
        if (!hasTag) return false;
      }

      // 關鍵字搜尋
      if (q) {
        const title = (tx.title || '').toLowerCase();
        const merchant = (tx.merchant || '').toLowerCase();
        const payment = (tx.paymentMethod || '').toLowerCase();
        const date = (tx.date || '').toLowerCase();
        const amountStr = String(tx.amount || '');
        const tags = Array.isArray(tx.tags) ? tx.tags.map((t) => t.toLowerCase()) : [];

        const matches =
          title.includes(q) ||
          merchant.includes(q) ||
          payment.includes(q) ||
          date.includes(q) ||
          amountStr.includes(q) ||
          tags.some((t) => t.includes(q));

        if (!matches) return false;
      }

      return true;
    });
  }, [filteredTransactions, keyword, selectedTag]);

  // 計算搜尋結果金額小計
  const totalAmount = useMemo(() => {
    return searchResults.reduce((acc, tx) => acc + (tx.amount || 0), 0);
  }, [searchResults]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[88vh] rounded-3xl glass-modal border border-emerald-500/30 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部搜尋列 */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>搜尋記帳項目</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 搜尋輸入框 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋品項、商家、金額、付款方式或 #標籤..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 快速標籤過濾列 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-xl font-medium transition border ${
                selectedTag === null
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              全部標籤
            </button>
            {currentTagItems.map((tagItem) => {
              const isSelected = selectedTag === tagItem.name;
              return (
                <button
                  key={tagItem.id}
                  type="button"
                  onClick={() =>
                    setSelectedTag(isSelected ? null : tagItem.name)
                  }
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>#{tagItem.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜尋結果統計列 */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            搜尋結果：<strong className="text-white font-bold">{searchResults.length}</strong> 筆
          </span>
          {searchResults.length > 0 && (
            <span className="flex items-center gap-1">
              總金額：
              <strong className="text-emerald-400 font-mono font-bold text-sm">
                NT$ {totalAmount.toLocaleString()}
              </strong>
            </span>
          )}
        </div>

        {/* 結果清單滾動區 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {!keyword.trim() && !selectedTag ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
              <p>請輸入關鍵字或選擇上方標籤進行即時搜尋</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <p className="text-sm text-slate-400 font-medium">找不到符合條件的記帳記錄</p>
              <p>請嘗試更換關鍵字或清除標籤篩選</p>
            </div>
          ) : (
            searchResults.map((tx) => {
              const mainTag = tx.tags?.[0] || '未歸類';
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800 transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-600/50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <Tag className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-emerald-300 transition">
                          {tx.title || '無品項名稱'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-emerald-400 font-medium truncate max-w-[90px]">
                          #{mainTag}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {tx.date}
                        </span>
                        {tx.paymentMethod && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-slate-500" />
                            {tx.paymentMethod}
                          </span>
                        )}
                        {tx.merchant && (
                          <span className="truncate max-w-[120px] text-slate-500">
                            @{tx.merchant}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <div>
                      <p
                        className={`font-mono font-black text-sm sm:text-base ${
                          isIncome ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : ''}${tx.amount?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-end gap-1 group-hover:text-emerald-400 transition">
                        <Edit2 className="w-3 h-3" />
                        <span>點擊編輯</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部關閉按鈕 */}
        <div className="p-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition"
          >
            關閉搜尋
          </button>
        </div>
      </div>
    </div>
  );
};
