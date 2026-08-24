'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Wallet,
  Users,
  Barcode,
  Menu,
  ChevronDown,
  Plus,
  Check,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Platform } from '@/lib/platform';
import { SettingsTabType } from '@/blocks/settings';

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenBarcode: () => void;
  onOpenQuickInput: () => void;
  onOpenAssistant: () => void;
  onOpenPersonalSettings: (tab?: any) => void;
  onOpenGroupSettings: (tab?: any) => void;
  onOpenScanner: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenBarcode,
  onOpenPersonalSettings,
  onOpenGroupSettings,
  onOpenProfile,
}) => {
  const {
    user,
    isAuthenticated,
    households,
    activeHouseholdId,
    household,
    switchActiveHousehold,
    activeLedger,
    setActiveLedger,
    incomingInvitations,
    pullFromCloud,
  } = useAppStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    Platform.haptic('light');
    try {
      await pullFromCloud();
      setShowRefreshTooltip(true);
      Platform.haptic('success');
      setTimeout(() => setShowRefreshTooltip(false), 2000);
    } catch (e) {
      console.error('Manual refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 點擊外部自動關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLedgerName = () => {
    if (activeLedger === 'household') return household?.name || '群組公帳';
    return '個人私帳';
  };

  const getLedgerIcon = () => {
    if (activeLedger === 'household') return <Users className="w-3.5 h-3.5 text-purple-400" />;
    return <Wallet className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <header className="flex-shrink-0 z-30 w-full glass-panel shadow-sm pt-safe transition-all duration-200">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Left: Sidebar Hamburger + Brand Logo & Name (僅在手機/平板顯示；電腦版由左側常駐側邊欄顯示以避免 Logo 重複) */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 shadow-sm"
            title="開啟選單"
          >
            <Menu className="w-4 h-4 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="智帳君 Ledgy"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover shadow-sm border border-emerald-500/30"
            />
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1">
              智帳君 <span className="text-emerald-400 font-black">Ledgy</span>
            </span>
          </div>
        </div>

        {/* Center: Multi-Group & Ledger Switcher (只有在有加入/建立群組時才顯示切換選單) */}
        {households.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition shadow-sm active:scale-95"
              title="切換個人私帳或不同群組公帳"
            >
              {getLedgerIcon()}
              <span className="text-[11px] sm:text-xs truncate max-w-[120px]">
                {getLedgerName()}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 opacity-70" />
            </button>

            {/* 下拉選單：個人私帳與複數群組 */}
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95">
                {/* 1. 個人私帳選項 */}
                <button
                  onClick={() => {
                    setActiveLedger('personal');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition border ${
                    activeLedger === 'personal'
                      ? 'bg-emerald-950/80 text-emerald-300 font-bold border-emerald-800/60'
                      : 'border-transparent hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>個人私帳</span>
                  </div>
                  {activeLedger === 'personal' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <div className="border-t border-slate-800 my-1 pt-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    我的記帳群組 ({households.length})
                  </p>
                </div>

                {/* 2. 各個群組公帳選項 */}
                {households.map((h) => {
                  const isCurrent = activeLedger === 'household' && activeHouseholdId === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        switchActiveHousehold(h.id);
                        setActiveLedger('household');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition border ${
                        isCurrent
                          ? 'bg-purple-950/80 text-purple-300 font-bold border-purple-800/60'
                          : 'border-transparent hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Users className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">{h.name}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* 3. 管理 / 建立新群組捷徑 */}
                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      onOpenGroupSettings('members');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>建立或加入新群組...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Right: Invitations alert, Barcode & User Profile */}
        <div className="flex items-center gap-1.5">
          {/* ✉️ 收到群組邀請通知按鈕 */}
          {incomingInvitations.length > 0 && (
            <button
              onClick={() => onOpenGroupSettings('members')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-950/90 text-purple-300 border border-purple-600/80 text-xs font-bold transition hover:bg-purple-900 active:scale-95 shadow-md shadow-purple-950/50"
              title="您有待回覆的群組邀請！"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>{incomingInvitations.length} 則群組邀請</span>
            </button>
          )}

          {/* 手機條碼載具快捷鈕 */}
          <button
            onClick={onOpenBarcode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition text-xs font-mono font-bold active:scale-95"
            title="出示手機條碼載具"
          >
            <Barcode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-[11px]">
              {user.defaultCarrierCode || '/AB1234+'}
            </span>
          </button>

          {/* 🔄 重新整理 / 同步雲端按鈕 (Web 版與 App 版通用) */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition active:scale-95 shadow-sm"
            title="重新整理並同步雲端最新資料"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            {showRefreshTooltip && (
              <span className="absolute -bottom-8 right-0 whitespace-nowrap px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold shadow-lg animate-in fade-in zoom-in-95 z-50">
                已同步最新資料 ✨
              </span>
            )}
          </button>

          {/* 個人大頭貼 */}
          {isAuthenticated && (
            <button
              onClick={onOpenProfile}
              className="p-0.5 rounded-full hover:ring-2 hover:ring-emerald-400 transition active:scale-95 relative"
              title="個人檔案"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
