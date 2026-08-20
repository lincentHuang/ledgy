'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import {
  ArrowLeft,
  Key,
  Users,
  Barcode,
  Brain,
  Download,
  Check,
  Sparkles,
  Plus,
  ShieldCheck,
  CreditCard,
  Tag,
  Trash2,
  Edit2,
  Copy,
  LogOut,
  UserPlus,
  Crown,
  Shield,
  UserMinus,
  Settings as SettingsIcon,
  Layers,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  BellRing,
} from 'lucide-react';

export type SettingsTabType = 'general' | 'payments' | 'tags' | 'group' | 'ai' | 'export';

interface SettingsViewProps {
  initialTab?: SettingsTabType;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialTab = 'group',
  onBack,
}) => {
  const {
    user,
    households,
    activeHouseholdId,
    household,
    switchActiveHousehold,
    createHousehold,
    leaveHousehold,
    deleteHousehold,
    removeGroupMember,
    updateHousehold,
    incomingInvitations,
    inviteMemberByEmail,
    respondToIncomingInvitation,
    requestJoinByCode,
    respondToJoinRequest,
    learningRules,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    updatePaymentMethod,
    availableTags,
    addCustomTag,
    removeCustomTag,
    updateUserProfile,
    transactions,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

  // 基本設定
  const [apiKey, setApiKey] = useState(user.geminiApiKey || '');
  const [carrier, setCarrier] = useState(user.defaultCarrierCode || '/AB1234+');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 👥 複數群組管理狀態
  const [selectedGroupSubTab, setSelectedGroupSubTab] = useState<'manage' | 'create' | 'join'>('manage');
  const [houseName, setHouseName] = useState('');
  const [houseBudget, setHouseBudget] = useState(40000);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState(household?.name || '');
  const [editGroupBudgetInput, setEditGroupBudgetInput] = useState(household?.monthlyBudget || 40000);

  // ✉️ 組長以 Email 邀請成員表單
  const [showEmailInviteForm, setShowEmailInviteForm] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteRoleInput, setInviteRoleInput] = useState<'member' | 'admin'>('member');
  const [isInviting, setIsInviting] = useState(false);

  // 付款方式新增 / 編輯
  const [newPaymentInput, setNewPaymentInput] = useState('');
  const [editingPaymentOld, setEditingPaymentOld] = useState<string | null>(null);
  const [editingPaymentNew, setEditingPaymentNew] = useState('');

  // 標籤新增
  const [newTagInput, setNewTagInput] = useState('');

  // 判斷當前選取群組中，使用者是否為組長 / 建立者
  const isLeader =
    household &&
    (household.ownerId === user.uid ||
      household.members.some(
        (m) => m.userId === user.uid && (m.role === 'owner' || m.role === 'admin')
      ));

  const pendingJoinRequests = household?.pendingJoinRequests || [];
  const pendingInvitations = household?.pendingInvitations || [];

  const handleSaveGeneral = () => {
    updateUserProfile({
      geminiApiKey: apiKey.trim(),
      defaultCarrierCode: carrier.trim().toUpperCase(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateHousehold = () => {
    if (!houseName.trim()) {
      alert('請輸入群組名稱');
      return;
    }
    const created = createHousehold(houseName.trim(), Number(houseBudget) || 40000);
    setHouseName('');
    setSelectedGroupSubTab('manage');
    alert(`🎉 記帳群組「${created.name}」建立成功！`);
  };

  // 透過邀請碼申請加入 (需組長審核)
  const handleRequestJoin = async () => {
    if (!joinCode.trim()) {
      alert('請輸入 6 位群組邀請碼');
      return;
    }
    const res = await requestJoinByCode(joinCode.trim());
    alert(res.message);
    if (res.success) {
      setJoinCode('');
      setSelectedGroupSubTab('manage');
    }
  };

  // 組長以 Email 發送邀請
  const handleSendEmailInvite = async () => {
    if (!inviteEmailInput.trim()) {
      alert('請輸入欲邀請對象的 Email');
      return;
    }
    setIsInviting(true);
    const res = await inviteMemberByEmail(inviteEmailInput.trim(), inviteRoleInput);
    setIsInviting(false);
    alert(res.message);
    if (res.success) {
      setInviteEmailInput('');
      setShowEmailInviteForm(false);
    }
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveGroupInfo = () => {
    if (!editGroupNameInput.trim() || !household) return;
    updateHousehold({
      name: editGroupNameInput.trim(),
      monthlyBudget: Number(editGroupBudgetInput),
    });
    setIsEditingGroupName(false);
    alert('群組資訊已更新！');
  };

  const handleLeaderRemoveMember = (memberUserId: string, memberName: string) => {
    if (confirm(`確定要將成員「${memberName}」從群組中移除嗎？`)) {
      removeGroupMember(memberUserId);
    }
  };

  const handleAddPayment = () => {
    if (!newPaymentInput.trim()) return;
    addPaymentMethod(newPaymentInput.trim());
    setNewPaymentInput('');
  };

  const handleSaveEditPayment = () => {
    if (editingPaymentOld && editingPaymentNew.trim()) {
      updatePaymentMethod(editingPaymentOld, editingPaymentNew.trim());
      setEditingPaymentOld(null);
      setEditingPaymentNew('');
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    addCustomTag(newTagInput.trim());
    setNewTagInput('');
  };

  const handleExportCsv = () => {
    const headers = [
      '日期',
      '品項名稱',
      '金額',
      '標籤',
      '付款方式',
      '帳本',
      '商家',
      '發票號碼',
    ];
    const rows = transactions.map((t) => [
      t.date,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      `"${t.tags?.[0] || '未歸類'}"`,
      t.paymentMethod,
      t.ledgerType === 'household' ? '群組公帳' : '個人私帳',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.invoiceNumber || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `記帳明細匯出_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 頁面頂部導航與標題 */}
      <div className="glass-panel p-4 rounded-3xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 shadow-sm"
            title="返回明細總覽"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>系統設定與管理</span>
            </h1>
            <p className="text-xs text-slate-400">
              複數群組管理、審核與邀請、付款方式與標籤庫
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
        >
          返回記帳
        </button>
      </div>

      {/* ✉️ 收到群組邀請通知卡片 (若有收到邀請) */}
      {incomingInvitations.length > 0 && (
        <div className="p-4 rounded-3xl bg-purple-950/70 border border-purple-600/60 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-purple-300">
            <BellRing className="w-4 h-4 text-purple-400 animate-bounce" />
            <h3 className="font-black text-sm">您有 {incomingInvitations.length} 則未回覆的群組邀請！</h3>
          </div>

          <div className="space-y-2">
            {incomingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-purple-800/50 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-100">
                    「{inv.householdName}」組長 <span className="text-purple-300">{inv.inviterName}</span> 邀請您加入群組
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    權限角色：{inv.role === 'admin' ? '副管理者' : '一般成員'} • 邀請發送於 {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={async () => {
                      const res = await respondToIncomingInvitation(inv.id, 'reject');
                      alert(res.message);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-bold transition text-xs"
                  >
                    婉拒
                  </button>
                  <button
                    onClick={async () => {
                      const res = await respondToIncomingInvitation(inv.id, 'accept');
                      alert(res.message);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition text-xs shadow-md"
                  >
                    ✔ 同意加入
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 橫向切換 Tab Bar */}
      <div className="flex gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar shadow-sm">
        <button
          onClick={() => setActiveTab('group')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'group'
              ? 'bg-purple-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>👥 記帳群組 ({households.length})</span>
          {pendingJoinRequests.length > 0 && isLeader && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>💳 付款方式</span>
        </button>

        <button
          onClick={() => setActiveTab('tags')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'tags'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>🏷️ 標籤分類庫</span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>基本設定</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'ai'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>🤖 AI 規則</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`px-3.5 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1.5 ${
            activeTab === 'export'
              ? 'bg-emerald-600 text-white shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>匯出資料</span>
        </button>
      </div>

      {/* 頁面內容 */}
      <div className="space-y-4">
        {/* 1. 👥 複數群組管理專區 (含 Email 邀請與申請審核列表) */}
        {activeTab === 'group' && (
          <div className="space-y-4">
            {/* 群組切換與新增選單 */}
            <div className="glass-panel p-4 rounded-3xl space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-white">我的記帳群組列表</span>
                  <span className="text-xs font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800">
                    {households.length} 個群組
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={() => setSelectedGroupSubTab('create')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                      selectedGroupSubTab === 'create'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-purple-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>建立新群組</span>
                  </button>

                  <button
                    onClick={() => setSelectedGroupSubTab('join')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                      selectedGroupSubTab === 'join'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>輸入邀請碼申請</span>
                  </button>
                </div>
              </div>

              {/* 複數群組橫向按鈕列 */}
              {households.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {households.map((h) => {
                    const isSelected = household?.id === h.id;
                    const reqCount = h.pendingJoinRequests?.length || 0;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          switchActiveHousehold(h.id);
                          setSelectedGroupSubTab('manage');
                        }}
                        className={`px-3.5 py-2 rounded-2xl flex-shrink-0 transition-all font-bold flex items-center gap-2 border ${
                          isSelected && selectedGroupSubTab === 'manage'
                            ? 'bg-purple-950/90 text-purple-200 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>{h.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({h.members.length}人)
                        </span>
                        {reqCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  您目前尚未加入任何群組。您可以「建立新群組」或「輸入邀請碼申請加入」開始多人群組分帳！
                </p>
              )}
            </div>

            {/* 子分頁 A: ➕ 建立新群組 */}
            {selectedGroupSubTab === 'create' && (
              <div className="glass-panel p-5 rounded-3xl space-y-3.5 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-purple-950 border border-purple-800 text-purple-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">建立新的記帳群組</h3>
                    <p className="text-xs text-slate-400">
                      例如：東京7日行、台北租屋室友、我們這一家。建立後您即為組長。
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">群組名稱 *</label>
                    <input
                      type="text"
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="輸入群組名稱 (例如: 7月日本遊記)..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">每月公帳預算 (NT$)</label>
                    <input
                      type="number"
                      value={houseBudget}
                      onChange={(e) => setHouseBudget(Number(e.target.value))}
                      placeholder="40000"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  {households.length > 0 && (
                    <button
                      onClick={() => setSelectedGroupSubTab('manage')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                    >
                      取消
                    </button>
                  )}
                  <button
                    onClick={handleCreateHousehold}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    立即建立群組
                  </button>
                </div>
              </div>
            )}

            {/* 子分頁 B: 📥 輸入邀請碼申請加入群組 */}
            {selectedGroupSubTab === 'join' && (
              <div className="glass-panel p-5 rounded-3xl space-y-3.5 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-purple-950 border border-purple-800 text-purple-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">輸入邀請碼申請加入既有群組</h3>
                    <p className="text-xs text-slate-400">
                      輸入好友或家人分享給您的 6 位邀請碼，送出後需由該群組組長審核同意。
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="輸入 6 位邀請碼 (例如: WARM88)..."
                    className="flex-1 px-3.5 py-2.5 text-xs font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRequestJoin();
                      }
                    }}
                  />
                  <button
                    onClick={handleRequestJoin}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    送出申請
                  </button>
                </div>

                {households.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setSelectedGroupSubTab('manage')}
                      className="text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      返回當前群組管理
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 子分頁 C: ⚙️ 當前選取群組管理 (成員、Email邀請、申請審核列表) */}
            {selectedGroupSubTab === 'manage' && household && (
              <>
                {/* 🔔 組長專屬：待審核的加入申請列表 (Pending Approval List) */}
                {isLeader && pendingJoinRequests.length > 0 && (
                  <div className="p-4 rounded-3xl bg-amber-950/50 border border-amber-500/50 space-y-3 animate-in fade-in shadow-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-sm text-amber-200">
                        🔔 待審核的加入申請 ({pendingJoinRequests.length} 筆)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      以下使用者已透過邀請碼申請加入「{household.name}」，請確認是否同意其進入群組：
                    </p>

                    <div className="space-y-2">
                      {pendingJoinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">
                              {req.applicantName}{' '}
                              {req.applicantEmail && (
                                <span className="text-slate-400 font-normal">({req.applicantEmail})</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              申請時間：{new Date(req.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={async () => {
                                const res = await respondToJoinRequest(req.id, 'reject');
                                alert(res.message);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 font-bold transition text-xs"
                            >
                              ✕ 拒絕
                            </button>
                            <button
                              onClick={async () => {
                                const res = await respondToJoinRequest(req.id, 'approve');
                                alert(res.message);
                              }}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-xs shadow-md"
                            >
                              ✔ 同意加入
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 群組資訊卡片 */}
                <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800">
                          ACTIVE GROUP
                        </span>
                        {isLeader && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            您是此群組組長
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-white mt-1">{household.name}</h2>
                    </div>

                    {isLeader && (
                      <button
                        onClick={() => {
                          setIsEditingGroupName(!isEditingGroupName);
                          setEditGroupNameInput(household.name);
                          setEditGroupBudgetInput(household.monthlyBudget || 40000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 self-start sm:self-auto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{isEditingGroupName ? '收起編輯' : '編輯群組資訊'}</span>
                      </button>
                    )}
                  </div>

                  {/* 組長編輯群組資訊表單 */}
                  {isEditingGroupName && (
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in">
                      <h4 className="text-xs font-bold text-slate-200">修改群組名稱與公帳預算</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">群組名稱</label>
                          <input
                            type="text"
                            value={editGroupNameInput}
                            onChange={(e) => setEditGroupNameInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">每月公帳預算 (NT$)</label>
                          <input
                            type="number"
                            value={editGroupBudgetInput}
                            onChange={(e) => setEditGroupBudgetInput(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 font-mono text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsEditingGroupName(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveGroupInfo}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs"
                        >
                          儲存變更
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 📲 邀請新成員 (邀請碼 + 審核說明) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-800/40 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-purple-200 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-purple-400" />
                          <span>群組專屬 6 位邀請碼</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          朋友在設定頁輸入此代碼後將送出申請，經組長審核同意後即可加入！
                        </p>
                      </div>

                      {/* 邀請碼複製按鈕 */}
                      <button
                        onClick={() => handleCopyInviteCode(household.inviteCode)}
                        className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95 self-start sm:self-auto"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCode ? '已複製！' : household.inviteCode}</span>
                      </button>
                    </div>
                  </div>

                  {/* 👥 成員列表與組長 Email 邀請專區 */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xs text-slate-200">
                        群組正式成員列表 ({household.members.length} 人)
                      </h3>

                      {isLeader && (
                        <button
                          onClick={() => setShowEmailInviteForm(!showEmailInviteForm)}
                          className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{showEmailInviteForm ? '收起邀請' : '✉️ 以 Email 邀請新成員'}</span>
                        </button>
                      )}
                    </div>

                    {/* ✉️ 組長以 Email 發送邀請表單 */}
                    {showEmailInviteForm && isLeader && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-purple-700/60 space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-purple-400" />
                          <h4 className="text-xs font-bold text-slate-200">輸入對方的 Email 發送群組加入邀請</h4>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          對方登入系統後，會在群組設定頁面直接收到「同意加入」通知，點擊即可入組！
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] text-slate-400 mb-1">受邀者 Email *</label>
                            <input
                              type="email"
                              value={inviteEmailInput}
                              onChange={(e) => setInviteEmailInput(e.target.value)}
                              placeholder="例如：friend@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">指派角色</label>
                            <select
                              value={inviteRoleInput}
                              onChange={(e) => setInviteRoleInput(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="member">一般成員</option>
                              <option value="admin">副管理者</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setShowEmailInviteForm(false)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSendEmailInvite}
                            disabled={isInviting || !inviteEmailInput.trim()}
                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>{isInviting ? '發送中...' : '發送 Email 邀請'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 已發送但等待對方接受的 Email 邀請清單 */}
                    {isLeader && pendingInvitations.length > 0 && (
                      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          已發送之 Email 邀請 (等待對方接受中)：
                        </p>
                        <div className="space-y-1">
                          {pendingInvitations.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-[11px] text-slate-300 py-1 border-b border-slate-800/60 last:border-none">
                              <span>✉️ {inv.inviteeEmail} ({inv.role === 'admin' ? '副管理員' : '一般成員'})</span>
                              <span className="text-amber-400 font-mono text-[10px]">待確認</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 成員列表清單 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {household.members.map((m) => {
                        const isMemberOwner = m.role === 'owner' || m.userId === household.ownerId;
                        const isSelf = m.userId === user.uid;

                        return (
                          <div
                            key={m.userId}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {m.displayName?.[0] || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-200 text-xs truncate">
                                    {m.displayName}
                                  </p>
                                  {isSelf && (
                                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-800">
                                      您
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono truncate">
                                  {m.email || (m.carrierCode ? `載具: ${m.carrierCode}` : '未設定 Email')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                                  isMemberOwner
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800 flex items-center gap-1'
                                    : m.role === 'admin'
                                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {isMemberOwner && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                                {isMemberOwner ? '組長' : m.role === 'admin' ? '管理員' : '成員'}
                              </span>

                              {/* 組長移除成員按鈕 (不能移除組長自己) */}
                              {isLeader && !isMemberOwner && (
                                <button
                                  onClick={() => handleLeaderRemoveMember(m.userId, m.displayName)}
                                  className="p-1.5 rounded-xl hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition"
                                  title="組長權限：將此成員自群組移除"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 🚪 退出或刪除群組按鈕 */}
                  <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                    {isLeader && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `【危險操作】您是組長，確定要「解散並刪除」群組「${household.name}」嗎？所有成員將一併退出。`
                            )
                          ) {
                            deleteHousehold(household.id);
                            alert('已解散並刪除此群組。');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>解散群組 (組長)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`確定要退出「${household.name}」群組嗎？`)) {
                          leaveHousehold(household.id);
                          alert('已退出此群組。');
                        }
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>退出此群組</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. 💳 付款方式管理 */}
        {activeTab === 'payments' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">自訂付款方式清單</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                設定記帳時的下拉選單選項，可隨時新增、重新命名或刪除。
              </p>
            </div>

            {/* 新增付款方式 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPaymentInput}
                onChange={(e) => setNewPaymentInput(e.target.value)}
                placeholder="例如：玉山星宇卡, 街口支付, 悠遊付..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPayment();
                  }
                }}
              />
              <button
                onClick={handleAddPayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                新增方式
              </button>
            </div>

            {/* 既有付款方式列表 */}
            <div className="space-y-2 pt-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition text-xs"
                >
                  {editingPaymentOld === pm ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingPaymentNew}
                        onChange={(e) => setEditingPaymentNew(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleSaveEditPayment}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setEditingPaymentOld(null)}
                        className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-slate-200">{pm}</span>
                    </div>
                  )}

                  {editingPaymentOld !== pm && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPaymentOld(pm);
                          setEditingPaymentNew(pm);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="編輯名稱"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removePaymentMethod(pm)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 🏷️ 標籤分類庫 */}
        {activeTab === 'tags' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">智慧標籤庫管理</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                主分類與子分類已全面整合為標籤庫。可用於快速篩選與交叉分析。
              </p>
            </div>

            {/* 新增標籤 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="輸入新標籤名稱 (如: 貓咪飼料, 健身房, 房租)..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                + 新增標籤
              </button>
            </div>

            {/* 標籤雲清單 */}
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-200 transition"
                  >
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>#{tag}</span>
                    <button
                      onClick={() => removeCustomTag(tag)}
                      className="ml-1 text-slate-500 hover:text-rose-400"
                      title="刪除此標籤"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. 🔑 基本設定 (載具與 API Key) */}
        {activeTab === 'general' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">基本參數與 API 設定</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                管理您的手機條碼載具與 Google Gemini AI 模型金鑰
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  預設手機條碼載具
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="/AB1234+"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <Barcode className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Google Gemini API Key (可選)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  系統已內建免設定即時 AI，若填寫個人 API Key 將優先使用您的獨立配額。
                </p>
              </div>

              {savedSuccess && (
                <p className="text-xs text-emerald-400 font-bold">
                  ✅ 設定已成功儲存！
                </p>
              )}

              <button
                onClick={handleSaveGeneral}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                儲存基本設定
              </button>
            </div>
          </div>
        )}

        {/* 5. 🤖 AI 自適應學習規則庫 */}
        {activeTab === 'ai' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">AI 自適應學習規則庫</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                當您在記帳時手動調整分類或品項，AI 會自動學習並生成專屬偏好規則。
              </p>
            </div>

            {learningRules.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">目前尚無自訂 AI 學習規則</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  當您手動修改記帳項目的分類時，AI 將自動為您建立規則！
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {learningRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">
                          「{rule.vendorPattern || rule.keywordPattern}」
                        </span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400 font-bold">
                          {rule.targetCategoryName || rule.targetCategoryId}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        命中次數: {rule.usageCount || 1} 次 • 信心度: {Math.round((rule.confidence || 1) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. 📥 匯出資料 */}
        {activeTab === 'export' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">匯出記帳明細資料</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                匯出 UTF-8 編碼之標準 CSV 試算表檔案，相容於 Excel、Numbers 與 Google 試算表。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>目前累計交易筆數</span>
                <span className="font-bold font-mono text-emerald-400">
                  {transactions.length} 筆
                </span>
              </div>
              <button
                onClick={handleExportCsv}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>立即下載 CSV 備份報表</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
