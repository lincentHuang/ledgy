'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import {
  Users,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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
} from 'lucide-react';
import { Button, ProgressBar, Card } from '../ui';

export const FamilyView: React.FC<{ onOpenQuickInput: () => void }> = ({ onOpenQuickInput }) => {
  const {
    user,
    households,
    activeHouseholdId,
    household,
    switchActiveHousehold,
    updateHousehold,
    householdBalances,
    settleTransfer,
    transactions,
  } = useAppStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!household || !householdBalances) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center space-y-4 shadow-sm animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-base text-white">尚未加入或建立記帳群組</h3>
          <p className="text-xs text-slate-400 mt-1">
            建立或加入群組後，即可與朋友、室友或家人共用公帳並自動結算分帳！
          </p>
        </div>
      </div>
    );
  }

  const { summaries, transfers, totalSharedExpense } = householdBalances;
  const monthlyBudget = household.monthlyBudget || 40000;
  const budgetPercentage = Math.min(100, Math.round((totalSharedExpense / monthlyBudget) * 100));

  // 篩選當前群組的公帳明細
  const groupTransactions = transactions.filter(
    (t) => (t.householdId === household.id || t.ledgerType === 'household') && t.type === 'expense'
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(household.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSettleTransferClick = (transfer: (typeof transfers)[0]) => {
    if (
      confirm(
        `確認「${transfer.fromName}」已轉帳 NT$ ${transfer.amount.toLocaleString()} 給「${transfer.toName}」嗎？\n確認後將記錄一筆結清轉帳，自動更新淨結餘！`
      )
    ) {
      settleTransfer(transfer);
      alert('🎉 結算轉帳紀錄已完成，帳務已沖銷平帳！');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 複數群組橫向切換選單 (若有多個群組) */}
      {households.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {households.map((h) => {
            const isSelected = household.id === h.id;
            return (
              <button
                key={h.id}
                onClick={() => switchActiveHousehold(h.id)}
                className={`px-3.5 py-2 rounded-2xl flex-shrink-0 transition-all font-bold flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-purple-950/90 text-purple-200 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>{h.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({h.members.length}人)</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 1. 群組公帳總覽與預算進度橫幅 */}
      <div className="glass-panel rounded-3xl p-5 relative overflow-hidden shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-purple-950 border border-purple-800 text-purple-400">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (nameInput.trim()) {
                              updateHousehold({ name: nameInput.trim() }, household.id);
                              setIsEditingName(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsEditingName(false);
                          }
                        }}
                        autoFocus
                        className="px-2.5 py-1 text-sm font-bold bg-slate-900 border border-purple-500 rounded-xl text-white outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="輸入新群組名稱..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (nameInput.trim()) {
                            updateHousehold({ name: nameInput.trim() }, household.id);
                            setIsEditingName(false);
                          }
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow"
                      >
                        儲存
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded-xl transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-white">{household.name}</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(true);
                          setNameInput(household.name);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/60 transition"
                        title="點擊修改群組名稱"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800">
                        {household.members.length} 位成員
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <span>邀請碼：</span>
                  <button
                    onClick={handleCopyCode}
                    className="font-mono font-bold text-purple-300 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 transition"
                    title="點擊複製邀請碼"
                  >
                    <span>{household.inviteCode}</span>
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 font-semibold block">本月公帳總累積支出</span>
            <span className="font-mono text-2xl font-black text-white">
              NT$ {totalSharedExpense.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 預算進度條 */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              每月預算進度: <strong className="text-white">{budgetPercentage}%</strong>
            </span>
            <span>
              上限: <strong className="font-mono text-purple-300">NT$ {monthlyBudget.toLocaleString()}</strong>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercentage > 90
                  ? 'bg-rose-500'
                  : budgetPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-purple-500'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        </div>

        {/* 2. 成員代墊與應攤淨結餘卡片列表 */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            成員淨結餘與代墊狀態
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summaries.map((s) => {
              const isPositive = s.netBalance > 0;
              const isNegative = s.netBalance < 0;
              const isSelf = s.userId === user.uid;

              return (
                <div
                  key={s.userId}
                  className={`p-3.5 rounded-2xl border transition text-xs space-y-2 ${
                    isPositive
                      ? 'bg-emerald-950/30 border-emerald-800/60'
                      : isNegative
                      ? 'bg-rose-950/30 border-rose-900/60'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-bold text-xs">
                        {s.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{s.displayName}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                              您
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-xs font-black px-2 py-1 rounded-xl border ${
                          isPositive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : isNegative
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isPositive
                          ? `應收回 NT$ ${s.netBalance.toLocaleString()}`
                          : isNegative
                          ? `應支付 NT$ ${(-s.netBalance).toLocaleString()}`
                          : '已結清 (NT$ 0)'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                    <span>代墊公款：NT$ {s.totalPaid.toLocaleString()}</span>
                    <span className="text-right">應攤金額：NT$ {s.totalOwed.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 智慧最佳化結算轉帳建議 (最少轉帳路徑) */}
      <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>群組智慧結算建議（最少轉帳路徑）</span>
          </h3>
          <span className="text-[11px] text-slate-500">自動簡化多角債務</span>
        </div>

        {transfers.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>🎉 目前所有公帳款項皆已結清平帳，無人欠款！</span>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 font-medium">
                  <span className="font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-lg border border-rose-900">
                    {t.fromName}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-900">
                    {t.toName}
                  </span>
                  <span className="text-slate-400">應轉帳</span>
                  <span className="font-mono font-black text-purple-300 text-sm">
                    NT$ {t.amount.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => handleSettleTransferClick(t)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow self-end sm:self-auto active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>標記為已結清轉帳</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. 近期公帳明細與分帳紀錄清單 */}
      <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-purple-400" />
            <span>近期公帳明細 ({groupTransactions.length} 筆)</span>
          </h3>

          <button
            onClick={onOpenQuickInput}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>記一筆公帳</span>
          </button>
        </div>

        {groupTransactions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
            目前尚無公帳支出紀錄。點擊上方「記一筆公帳」開始記錄！
          </div>
        ) : (
          <div className="space-y-2">
            {groupTransactions.slice(0, 10).map((tx) => {
              const payer = household.members.find((m) => m.userId === (tx.splitInfo?.payerId || tx.userId));
              return (
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
                      由 <strong className="text-purple-300">{payer?.displayName || '成員'}</strong> 先行代墊 • {tx.paymentMethod}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-white">
                      NT$ {tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
