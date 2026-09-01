'use client';

import React, { useState } from 'react';
import { Trash2, LogOut, X, Users, Receipt, ShieldAlert } from 'lucide-react';
import { Household } from '@app/shared';

export interface DeleteLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household | null;
  currentUserId: string;
  transactionCount?: number;
  onConfirmDelete: (householdId: string) => void;
  onConfirmLeave: (householdId: string) => void;
}

export const DeleteLedgerModal: React.FC<DeleteLedgerModalProps> = ({
  isOpen,
  onClose,
  household,
  currentUserId,
  transactionCount = 0,
  onConfirmDelete,
  onConfirmLeave,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !household) return null;

  const isOwner = household.ownerId === currentUserId;

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (isOwner) {
        await onConfirmDelete(household.id);
      } else {
        await onConfirmLeave(household.id);
      }
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl glass-modal text-slate-100 shadow-2xl p-5 sm:p-6 my-auto z-10 border border-rose-500/20 animate-in fade-in zoom-in-95 duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center font-bold shrink-0">
              {isOwner ? <Trash2 className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {isOwner ? '解散並刪除帳本' : '退出共用帳本'}
              </h3>
              <p className="text-xs text-rose-300/80 font-medium">
                {isOwner ? '此動作將永久刪除帳本與交易' : '退出後將不再同步此帳本'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/60 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 帳本資訊卡片 */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">目標帳本名稱</span>
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{household.name}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{household.members?.length || 1} 位共用成員</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{transactionCount} 筆記帳明細</span>
            </div>
          </div>
        </div>

        {/* 警告說明區塊 */}
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/50 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{isOwner ? '【高危險操作警告】' : '【注意事項】'}</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {isOwner ? (
              <>
                您是此帳本的<strong className="text-rose-300">發起人 / 組長</strong>。確認解散後，系統將<strong>徹底清空此帳本與該帳本的所有交易紀錄</strong>，所有共用成員將同步失去存取權，且此操作<strong>無法復原</strong>。
              </>
            ) : (
              <>
                您將退出「<strong className="text-rose-300">{household.name}</strong>」帳本。退出後您將無法再檢視或記錄該帳本內容，但其他成員仍可繼續使用。
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition shrink-0"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleAction}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 active:scale-95 shrink-0 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>處理中...</span>
            ) : isOwner ? (
              <>
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>確認解散並刪除帳本</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>確認退出帳本</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
