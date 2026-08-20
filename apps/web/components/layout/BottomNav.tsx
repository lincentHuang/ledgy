'use client';

import React from 'react';
import { LayoutDashboard, Plus, Settings, Mic } from 'lucide-react';
import { Button } from '../ui';

export type MainTabType = 'overview' | 'invoices' | 'family' | 'settings' | 'personal-settings' | 'group-settings';

interface BottomNavProps {
  currentTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  onOpenQuickInput: () => void;
  onOpenVoiceInput: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  onOpenQuickInput,
  onOpenVoiceInput,
}) => {
  return (
    <>
      {/* 📱 手機版：底部常駐 Dock 導航列 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-800 pb-safe">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around relative">
          {/* 1. 總覽明細 */}
          <button
            onClick={() => onChangeTab('overview')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'overview'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">明細</span>
          </button>

          {/* 2. 🎙️ AI 語音說話記帳 (中央簡潔按鈕) */}
          <button
            onClick={onOpenVoiceInput}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-all -mt-3 ring-4 ring-slate-950"
            title="AI 語音說話記帳"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* 3. ➕ 手動快速記帳 */}
          <button
            onClick={onOpenQuickInput}
            className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-emerald-400 transition-all active:scale-95"
            title="快速記帳"
          >
            <Plus className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">記帳</span>
          </button>

          {/* 4. ⚙️ 個人設定 */}
          <button
            onClick={() => onChangeTab('personal-settings')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'personal-settings'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">設定</span>
          </button>
        </div>
      </nav>

      {/* 💻 電腦版：底部 Sticky 橫幅操作列 (貼齊底部，不再遮擋明細數據) */}
      <div className="hidden lg:block sticky bottom-0 z-30 w-full bg-slate-950/85 backdrop-blur-xl border-t border-slate-800/80 py-3 mt-auto shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>支援 AI 智慧自然語言、語音與發票辨識</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="glass"
              size="md"
              onClick={onOpenVoiceInput}
              leftIcon={<Mic className="w-4 h-4 text-emerald-400" />}
              className="border-emerald-500/40 hover:border-emerald-500 text-slate-100 shadow-md"
            >
              AI 語音記帳
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={onOpenQuickInput}
              leftIcon={<Plus className="w-4 h-4" />}
              className="px-6 shadow-emerald-600/30"
            >
              快速記帳
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
