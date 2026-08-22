'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  LayoutDashboard,
  Users,
  Tag,
  CreditCard,
  Sparkles,
  Settings,
  User,
  LogOut,
  ChevronRight,
  Layers,
  Wallet,
  Plus,
  Check,
  DollarSign,
  Key,
  Brain,
  Download,
  Cloud,
} from 'lucide-react';
import { MainTabType } from './BottomNav';
import { PersonalTabType, GroupTabType } from '@/blocks/settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  onOpenPersonalSettings: (tab?: PersonalTabType) => void;
  onOpenGroupSettings: (tab?: GroupTabType) => void;
  onOpenAssistant: () => void;
  onOpenProfile: () => void;
  personalTab?: PersonalTabType;
  groupTab?: GroupTabType;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTab,
  onChangeTab,
  onOpenPersonalSettings,
  onOpenGroupSettings,
  onOpenAssistant,
  onOpenProfile,
  personalTab = 'payments',
  groupTab = 'members',
}) => {
  const {
    user,
    households,
    activeHouseholdId,
    household,
    switchActiveHousehold,
    activeLedger,
    setActiveLedger,
    logout,
  } = useAppStore();

  const handleNav = (tab: MainTabType) => {
    onChangeTab(tab);
    onClose();
  };

  const handleOpenPersonal = (tab: PersonalTabType) => {
    onOpenPersonalSettings(tab);
    onClose();
  };

  const handleOpenGroup = (tab: GroupTabType) => {
    onOpenGroupSettings(tab);
    onClose();
  };

  const pendingRequestsCount = household?.pendingJoinRequests?.length || 0;
  const isLeader = household?.ownerId === user?.uid;

  return (
    <>
      {/* Mobile Backdrop Blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 h-full bg-slate-950/95 lg:bg-slate-950/70 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full flex-shrink-0 overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Navigation Area (獨立滾動區) */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1 overscroll-contain text-xs">
          {/* Logo & Close for Mobile */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="智帳君 Ledgy"
                className="w-8 h-8 rounded-xl object-cover shadow-md shadow-emerald-600/30 border border-emerald-500/30"
              />
              <div>
                <h1 className="font-extrabold text-sm text-white tracking-tight leading-none">
                  智帳君 <span className="text-emerald-400">Ledgy</span>
                </h1>
                <p className="text-[10px] text-slate-400 mt-0.5">AI 智慧發票與記帳管家</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 帳本切換選單 */}
          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              當前帳本模式
            </p>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-bold shadow-sm">
              <button
                onClick={() => {
                  setActiveLedger('personal');
                  onChangeTab('overview');
                  onClose();
                }}
                className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 border ${
                  activeLedger === 'personal'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>個人私帳</span>
              </button>

              <button
                onClick={() => {
                  if (households.length > 0) {
                    setActiveLedger('household');
                    onChangeTab('family');
                    onClose();
                  } else {
                    handleOpenGroup('members');
                  }
                }}
                className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 border ${
                  activeLedger === 'household'
                    ? 'bg-purple-600 border-purple-500 text-white shadow-sm font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>群組公帳</span>
              </button>
            </div>
          </div>

          {/* 複數群組切換清單 (僅在群組公帳模式下顯示) */}
          {activeLedger === 'household' && households.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  切換群組帳本 ({households.length})
                </p>
              </div>

              <div className="space-y-1 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/60">
                {households.map((h) => {
                  const isCurrent = activeLedger === 'household' && activeHouseholdId === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        switchActiveHousehold(h.id);
                        setActiveLedger('household');
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left border ${
                        isCurrent
                          ? 'bg-purple-950/80 text-purple-300 font-bold border-purple-800/60 shadow'
                          : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
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

                <button
                  onClick={() => handleOpenGroup('members')}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition text-[11px] font-medium border border-transparent"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>+ 建立或加入新群組</span>
                </button>
              </div>
            </div>
          )}

          {/* 主要功能區 */}
          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              主要功能
            </p>
            <button
              onClick={() => handleNav('overview')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition font-medium border ${
                currentTab === 'overview'
                  ? activeLedger === 'household'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border-purple-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                  : 'border-transparent hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>收支明細與總覽</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {activeLedger === 'household' && households.length > 0 && household && (
              <button
                onClick={() => handleNav('family')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl transition font-medium border ${
                  currentTab === 'family'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>群組公帳與分帳結算</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-purple-300 px-2 py-0.5 rounded-full border border-slate-700 truncate max-w-[80px]">
                  {household.name}
                </span>
              </button>
            )}
          </div>

          {/* 👤 個人設定專區 (僅在個人私帳模式下顯示) */}
          {activeLedger === 'personal' && (
            <div className="space-y-1">
              <div className="px-2 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" />
                  個人設定
                </p>
              </div>

              <button
                onClick={() => handleOpenPersonal('payments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'payments'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>個人付款方式</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenPersonal('tags')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'tags'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>個人標籤庫</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenPersonal('budget')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'budget'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>預算分配總表</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenPersonal('general')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'general'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>基本設定與載具</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenPersonal('ai')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'ai'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI 偏好規則</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenPersonal('export')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'personal-settings' && personalTab === 'export'
                    ? 'bg-emerald-600/20 text-emerald-400 font-bold border-emerald-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>匯出私帳</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          )}

          {/* 👥 群組設定專區 (僅在群組公帳模式下顯示) */}
          {activeLedger === 'household' && (
            <div className="space-y-1">
              <div className="px-2 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  群組設定 ({households.length})
                </p>
              </div>

              <button
                onClick={() => handleOpenGroup('members')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'group-settings' && groupTab === 'members'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>群組成員與審核</span>
                </div>
                {pendingRequestsCount > 0 && isLeader ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>

              <button
                onClick={() => handleOpenGroup('payments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'group-settings' && groupTab === 'payments'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>群組專用付款方式</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenGroup('tags')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'group-settings' && groupTab === 'tags'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  <span>群組公用標籤庫</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenGroup('budget')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'group-settings' && groupTab === 'budget'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  <span>公帳預算與資訊</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleOpenGroup('export')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition font-medium border ${
                  currentTab === 'group-settings' && groupTab === 'export'
                    ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30'
                    : 'border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>匯出公帳</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          )}

          {/* 🤖 系統與 AI 工具 */}
          <div className="space-y-1">
            <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              系統與 AI 工具
            </p>
            {user?.geminiApiKey && user.geminiApiKey.trim() ? (
              <button
                onClick={() => {
                  onOpenAssistant();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-emerald-950/40 border border-transparent hover:border-emerald-800/50 text-slate-200 hover:text-emerald-300 transition font-medium group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>AI 理財顧問諮詢</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
                  已啟用
                </span>
              </button>
            ) : (
              <div className="p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                <button
                  disabled
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-slate-500 cursor-not-allowed font-medium opacity-75 text-xs"
                  title="尚未設定 Gemini API 金鑰"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                    <span>AI 理財顧問 (未啟用)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    需 API Key
                  </span>
                </button>
                <button
                  onClick={() => handleOpenPersonal('general')}
                  className="w-full text-[11px] text-emerald-400 hover:text-emerald-300 text-left px-2 py-1 rounded-lg hover:bg-emerald-950/30 flex items-center justify-between font-medium transition"
                >
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-emerald-400" /> 前往設定填入 API Key
                  </span>
                  <ChevronRight className="w-3 h-3 opacity-70" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom User Area (常駐底部) */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <button
              onClick={() => {
                onOpenProfile();
                onClose();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{user.displayName || '使用者'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email || '已登入'}</p>
              </div>
            </button>

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
