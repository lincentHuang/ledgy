'use client';

import React, { useState } from 'react';
import { Household } from '@app/shared';
import { useAppStore } from '@/lib/store';
import {
  BookOpen,
  Users,
  Plus,
  Copy,
  Check,
  Wallet,
  Sparkles,
  TrendingUp,
  Receipt,
  Calendar,
  Clock,
  Edit2,
  X,
  Share2,
  Key,
  ShieldCheck,
  UserPlus,
  ChevronRight,
  CheckCircle2,
  Trash2,
  LogOut,
} from 'lucide-react';
import { Button, ProgressBar, Card } from '@/components';
import { DeleteLedgerModal } from './DeleteLedgerModal';

export const FamilyView: React.FC<{ onOpenQuickInput: () => void }> = ({ onOpenQuickInput }) => {
  const {
    user,
    households,
    activeHouseholdId,
    household,
    switchActiveHousehold,
    activeLedger,
    setActiveLedger,
    createHousehold,
    joinHousehold,
    updateHousehold,
    deleteHousehold,
    leaveHousehold,
    householdBalances,
    transactions,
    inviteMemberByEmail,
  } = useAppStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Modal 狀態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerBudget, setNewLedgerBudget] = useState(40000);
  const [selectedEmoji, setSelectedEmoji] = useState('✈️');

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteTargetHousehold, setDeleteTargetHousehold] = useState<Household | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 計算個人私帳當月支出
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const personalExpenses = transactions.filter(
    (t) => (t.ledgerType === 'personal' || !t.householdId) && t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
  );
  const personalTotal = personalExpenses.reduce((sum, t) => sum + t.amount, 0);

  // 計算各共享帳本當月支出
  const getHouseholdMonthlyExpense = (hId: string) => {
    return transactions
      .filter((t) => (t.householdId === hId || t.ledgerType === 'household') && t.type === 'expense' && t.date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // 當前選中的共享帳本明細
  const currentSharedTransactions = household
    ? transactions.filter(
        (t) => (t.householdId === household.id || t.ledgerType === 'household') && t.type === 'expense'
      )
    : [];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = (hName: string, code: string) => {
    const text = `🎉 邀請你加入《${hName}》共同記帳！\n請在「智帳君 Ledgy」的帳本中心輸入 6 碼邀請碼加入：\n👉 ${code}`;
    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  const handleCreateLedgerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;
    const finalName = `${selectedEmoji} ${newLedgerName.trim()}`;
    const newH = createHousehold(finalName, newLedgerBudget);
    switchActiveHousehold(newH.id);
    setActiveLedger('household');
    setShowCreateModal(false);
    setNewLedgerName('');
  };

  const handleJoinLedgerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setJoinLoading(true);
    setJoinMessage(null);
    try {
      const res = await joinHousehold(joinCodeInput.trim().toUpperCase());
      if (res.success && res.household) {
        setJoinMessage({ type: 'success', text: `成功加入帳本《${res.household.name}》！` });
        switchActiveHousehold(res.household.id);
        setActiveLedger('household');
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinCodeInput('');
          setJoinMessage(null);
        }, 1500);
      } else {
        setJoinMessage({ type: 'error', text: res.message || '邀請碼無效或過期' });
      }
    } catch (err: any) {
      setJoinMessage({ type: 'error', text: err.message || '加入失敗，請確認邀請碼' });
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. 頂部標題與核心動作橫幅 */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>獨立帳本系統</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              帳本管理與共用中心
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              自由建立獨立帳本、邀請好友一同協同記帳，各帳本收支與預算完全獨立！
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Key className="w-4 h-4 text-purple-400" />
              <span>輸入邀請碼加入</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>建立新帳本</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 我的帳本清單 (My Ledgers Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>我的全部帳本 ({1 + households.length})</span>
          </h2>
          <span className="text-xs text-slate-400">點擊卡片即可切換使用</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* A. 預設個人私帳卡片 */}
          <div
            onClick={() => {
              setActiveLedger('personal');
            }}
            className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
              activeLedger === 'personal'
                ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                : 'glass-panel hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 flex items-center justify-center font-black text-lg shadow-inner">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">個人私帳</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      🔒 個人專屬
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">預設獨立帳本 • 個人專屬開銷</p>
                </div>
              </div>

              {activeLedger === 'personal' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Check className="w-3 h-3 stroke-[3]" />
                  使用中
                </span>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">本月支出累計</span>
              <span className="font-mono text-base font-black text-white">
                NT$ {personalTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* B. 各共享/獨立自建帳本卡片 */}
          {households.map((h) => {
            const isCurrent = activeLedger === 'household' && activeHouseholdId === h.id;
            const monthlyExp = getHouseholdMonthlyExpense(h.id);
            const budget = h.monthlyBudget || 40000;
            const pct = Math.min(100, Math.round((monthlyExp / budget) * 100));

            return (
              <div
                key={h.id}
                onClick={() => {
                  switchActiveHousehold(h.id);
                  setActiveLedger('household');
                }}
                className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  isCurrent
                    ? 'bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-purple-500/80 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50'
                    : 'glass-panel hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-purple-950 border border-purple-800/80 text-purple-300 flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-white truncate">{h.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-semibold shrink-0 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {h.members.length} 人共用
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                        <span>邀請碼: {h.inviteCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                        使用中
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          switchActiveHousehold(h.id);
                          setActiveLedger('household');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition shrink-0"
                      >
                        切換
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetHousehold(h);
                        setShowDeleteModal(true);
                      }}
                      title={h.ownerId === user.uid ? '解散並刪除此帳本' : '退出此帳本'}
                      className="p-1.5 rounded-xl hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition shrink-0"
                    >
                      {h.ownerId === user.uid ? (
                        <Trash2 className="w-3.5 h-3.5" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">本月支出 ({pct}%)</span>
                    <span className="font-mono text-base font-black text-white">
                      NT$ {monthlyExp.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 當前選中帳本之共用與邀請管理 (若當前為共享帳本) */}
      {activeLedger === 'household' && household && (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-5">
            {/* 帳本資訊與修改名稱 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        autoFocus
                        className="px-2.5 py-1 text-sm font-bold bg-slate-900 border border-purple-500 rounded-xl text-white outline-none"
                        placeholder="輸入帳本名稱..."
                      />
                      <button
                        onClick={() => {
                          if (nameInput.trim()) {
                            updateHousehold({ name: nameInput.trim() }, household.id);
                            setIsEditingName(false);
                          }
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{household.name}</h2>
                      <button
                        onClick={() => {
                          setIsEditingName(true);
                          setNameInput(household.name);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/60 transition"
                        title="修改帳本名稱"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">當前正在使用的共用帳本</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyShareLink(household.name, household.inviteCode)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedShareText ? '已複製邀請文案！' : '一鍵分享邀請'}</span>
                </button>
              </div>
            </div>

            {/* 邀請碼專區 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">此帳本專屬 6 碼邀請碼</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  好友在智帳君首頁或帳本中心輸入此代碼，即可秒速加入共同記帳！
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="font-mono text-lg font-black tracking-widest text-purple-300 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-purple-600/80 shadow-inner">
                  {household.inviteCode}
                </div>
                <button
                  onClick={() => handleCopyCode(household.inviteCode)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '已複製' : '複製代碼'}</span>
                </button>
              </div>
            </div>

            {/* 帳本成員清單 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>帳本成員 ({household.members.length} 位)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {household.members.map((m) => {
                  const isOwner = m.userId === household.ownerId;
                  const isSelf = m.userId === user.uid;
                  return (
                    <div
                      key={m.userId}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-bold text-xs">
                          {m.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{m.displayName}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                                您
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {isOwner ? '👑 帳本發起人' : '成員'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 近期此帳本明細 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-400" />
                  <span>近期帳本紀錄 ({currentSharedTransactions.length} 筆)</span>
                </h3>
                <button
                  onClick={onOpenQuickInput}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>記一筆</span>
                </button>
              </div>

              {currentSharedTransactions.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
                  此帳本目前尚無記帳紀錄，點擊「記一筆」開始記錄吧！
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentSharedTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{tx.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{tx.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {tx.categoryName} • {tx.paymentMethod}
                        </p>
                      </div>
                      <span className="font-mono font-black text-sm text-white">
                        NT$ {tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 危險操作區：解散或退出帳本 */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-300">
                  {household.ownerId === user.uid ? '帳本管理與解散' : '退出共用帳本'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {household.ownerId === user.uid
                    ? '解散後將徹底刪除此帳本與該帳本的所有交易紀錄，成員將失去存取權'
                    : '退出後您將不再同步與檢視此帳本，其他成員可繼續使用'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteTargetHousehold(household);
                  setShowDeleteModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-400 hover:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              >
                {household.ownerId === user.uid ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>解散此帳本</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>退出此帳本</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 建立新帳本 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl glass-modal border border-slate-800 p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">建立全新獨立帳本</h3>
                  <p className="text-xs text-slate-400">建立後可獨自使用，也可隨時邀請好友共用</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLedgerSubmit} className="space-y-4">
              {/* 圖示選擇 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">選擇帳本圖示</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['✈️', '🏠', '💼', '🛒', '🍽️', '🚗', '🎮', '💡', '💰'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-10 h-10 rounded-2xl text-lg flex items-center justify-center border transition ${
                        selectedEmoji === emoji
                          ? 'bg-emerald-950 border-emerald-500 shadow-md ring-2 ring-emerald-500/40'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 帳本名稱 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">帳本名稱</label>
                <input
                  type="text"
                  required
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="例如：日本東京旅行、租屋共同支出..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              {/* 每月預算上限 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">每月預算 (NT$)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={newLedgerBudget}
                  onChange={(e) => setNewLedgerBudget(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  立即建立帳本
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 輸入邀請碼加入帳本 Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl glass-modal border border-slate-800 p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">加入好友的共享帳本</h3>
                  <p className="text-xs text-slate-400">輸入好友提供的 6 碼邀請碼加入協同記帳</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinMessage(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinLedgerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">6 碼邀請碼</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="例如：LEDG-8X92"
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-center font-mono font-black tracking-widest text-lg outline-none focus:border-purple-500 uppercase"
                />
              </div>

              {joinMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    joinMessage.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {joinMessage.text}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinCodeInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  {joinLoading ? '加入中...' : '確認加入帳本'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 刪除/退出帳本安全確認 Modal */}
      <DeleteLedgerModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTargetHousehold(null);
        }}
        household={deleteTargetHousehold}
        currentUserId={user.uid}
        transactionCount={
          deleteTargetHousehold
            ? transactions.filter((t) => t.householdId === deleteTargetHousehold.id).length
            : 0
        }
        onConfirmDelete={(hId) => {
          deleteHousehold(hId);
        }}
        onConfirmLeave={(hId) => {
          leaveHousehold(hId);
        }}
      />
    </div>
  );
};

