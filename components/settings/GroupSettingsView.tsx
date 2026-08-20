'use client';

import React, { useState } from 'react';
import { TagItem } from '@app/shared';
import {
  useAppStore,
  DEFAULT_GROUP_PAYMENT_METHODS,
  DEFAULT_GROUP_TAGS,
  DEFAULT_GROUP_TAG_ITEMS,
  normalizeTagItems,
} from '../../lib/store';
import {
  ArrowLeft,
  Users,
  Plus,
  CreditCard,
  Tag,
  Trash2,
  Edit2,
  Copy,
  LogOut,
  UserPlus,
  Crown,
  UserMinus,
  Mail,
  Clock,
  Check,
  BellRing,
  Download,
  DollarSign,
  X,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Card } from '../ui';
import { BudgetAllocationView } from './BudgetAllocationView';

export type GroupTabType = 'members' | 'payments' | 'tags' | 'budget' | 'export';

interface GroupSettingsViewProps {
  activeTab?: GroupTabType;
  initialTab?: GroupTabType;
  onChangeTab?: (tab: GroupTabType) => void;
  onBack: () => void;
}

export const GroupSettingsView: React.FC<GroupSettingsViewProps> = ({
  activeTab: controlledActiveTab,
  initialTab = 'members',
  onChangeTab,
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
    addGroupPaymentMethod,
    removeGroupPaymentMethod,
    updateGroupPaymentMethod,
    addGroupTag,
    removeGroupTag,
    updateGroupTag,
    reorderGroupTags,
    incomingInvitations,
    inviteMemberByEmail,
    respondToIncomingInvitation,
    requestJoinByCode,
    respondToJoinRequest,
    transactions,
  } = useAppStore();

  const [internalActiveTab, setInternalActiveTab] = useState<GroupTabType>(initialTab);
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabChange = (tab: GroupTabType) => {
    setInternalActiveTab(tab);
    if (onChangeTab) {
      onChangeTab(tab);
    }
  };

  // 👥 複數群組頂部狀態
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

  // 群組付款方式新增 / 編輯
  const [newGroupPaymentInput, setNewGroupPaymentInput] = useState('');
  const [editingPaymentOld, setEditingPaymentOld] = useState<string | null>(null);
  const [editingPaymentNew, setEditingPaymentNew] = useState('');

  // 群組標籤新增 / 編輯 / 拖曳排序
  // 👥 群組標籤管理 (支援永久 Key / ID 綁定)
  const [newGroupTagInput, setNewGroupTagInput] = useState('');
  const [editingGroupTagKey, setEditingGroupTagKey] = useState<string | null>(null);
  const [editingGroupTagNew, setEditingGroupTagNew] = useState('');
  const [draggedTagIndex, setDraggedTagIndex] = useState<number | null>(null);
  const [dragOverTagIndex, setDragOverTagIndex] = useState<number | null>(null);

  const groupTagItems: TagItem[] = React.useMemo(() => {
    if (household) {
      if (household.tagItems && household.tagItems.length > 0) {
        return household.tagItems;
      }
      if (household.tags && household.tags.length > 0) {
        return normalizeTagItems(household.tags, DEFAULT_GROUP_TAG_ITEMS);
      }
    }
    return DEFAULT_GROUP_TAG_ITEMS;
  }, [household]);

  const handleReorderGroupTag = (fromIndex: number, toIndex: number) => {
    if (!household || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= groupTagItems.length || toIndex >= groupTagItems.length) return;
    const newItems = [...groupTagItems];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    reorderGroupTags(household.id, newItems);
  };

  const handleSaveEditingGroupTag = () => {
    if (editingGroupTagKey && editingGroupTagNew.trim() && household) {
      updateGroupTag(household.id, editingGroupTagKey, editingGroupTagNew.trim());
      setEditingGroupTagKey(null);
      setEditingGroupTagNew('');
    }
  };

  // 判斷當前選取群組中，使用者是否為組長 / 建立者
  const isLeader =
    household &&
    (household.ownerId === user.uid ||
      household.members.some(
        (m) => m.userId === user.uid && (m.role === 'owner' || m.role === 'admin')
      ));

  const pendingJoinRequests = household?.pendingJoinRequests || [];
  const pendingInvitations = household?.pendingInvitations || [];
  const groupPaymentMethods = household?.paymentMethods || DEFAULT_GROUP_PAYMENT_METHODS;

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

  const handleAddGroupPayment = () => {
    if (!newGroupPaymentInput.trim() || !household) return;
    addGroupPaymentMethod(household.id, newGroupPaymentInput.trim());
    setNewGroupPaymentInput('');
  };

  const handleSaveEditGroupPayment = () => {
    if (editingPaymentOld && editingPaymentNew.trim() && household) {
      updateGroupPaymentMethod(household.id, editingPaymentOld, editingPaymentNew.trim());
      setEditingPaymentOld(null);
      setEditingPaymentNew('');
    }
  };

  const handleAddGroupTag = () => {
    if (!newGroupTagInput.trim() || !household) return;
    addGroupTag(household.id, newGroupTagInput.trim());
    setNewGroupTagInput('');
  };

  const handleExportGroupCsv = () => {
    if (!household) return;
    const groupTxs = transactions.filter(
      (t) => t.ledgerType === 'household' && (t.householdId === household.id || !t.householdId)
    );
    const headers = [
      '日期',
      '群組名稱',
      '記帳人',
      '品項名稱',
      '金額',
      '標籤',
      '付款方式',
    ];
    const rows = groupTxs.map((t) => {
      const member = household?.members?.find((m) => m.userId === t.userId);
      return [
        t.date,
        `"${(household?.name || '群組公帳').replace(/"/g, '""')}"`,
        `"${member?.displayName || t.userId || '成員'}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${t.tags?.[0] || '未歸類'}"`,
        t.paymentMethod || '',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `群組公帳明細_${household.name}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <ArrowLeft className="w-5 h-5 text-purple-400" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>群組設定</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800">
                GROUPS
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              群組成員與審核、公帳專用付款方式、公用標籤庫與預算
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

      {/* ✉️ 收到群組邀請通知卡片 */}
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

      {/* 群組清單切換與建立/加入選單 */}
      <div className="glass-panel p-4 rounded-3xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-sm text-white">切換或管理群組</span>
            <span className="text-xs font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800">
              {households.length} 個群組
            </span>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setSelectedGroupSubTab('create')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 border ${
                selectedGroupSubTab === 'create'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-slate-800 text-purple-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>建立新群組</span>
            </button>

            <button
              onClick={() => setSelectedGroupSubTab('join')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 border ${
                selectedGroupSubTab === 'join'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
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
                  {reqCount > 0 && isLeader && (
                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {reqCount} 審核
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            目前尚未建立或加入任何群組。您可以點選上方「建立新群組」或「輸入邀請碼申請」。
          </div>
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
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs border border-transparent"
              >
                取消
              </button>
            )}
            <button
              onClick={handleCreateHousehold}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md border border-purple-500"
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

          <div className="pt-1">
            <label className="block text-[11px] text-slate-400 mb-1">6 位邀請碼 *</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="例如: ABC123"
              className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-xs"
              maxLength={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            {households.length > 0 && (
              <button
                onClick={() => setSelectedGroupSubTab('manage')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs border border-transparent"
              >
                取消
              </button>
            )}
            <button
              onClick={handleRequestJoin}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md border border-purple-500"
            >
              送出申請
            </button>
          </div>
        </div>
      )}

      {/* 當前選定群組管理各子功能 (成員/公帳付款方式/公用標籤/預算/匯出) */}
      {selectedGroupSubTab === 'manage' && household && (
        <>
          {/* 群組標題橫幅與即時改名列 */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isEditingGroupName ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={editGroupNameInput}
                        onChange={(e) => setEditGroupNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveGroupInfo();
                          } else if (e.key === 'Escape') {
                            setIsEditingGroupName(false);
                          }
                        }}
                        autoFocus
                        className="px-2.5 py-1 text-sm font-bold bg-slate-950 border border-purple-500 rounded-xl text-white outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="輸入新群組名稱..."
                      />
                      <button
                        type="button"
                        onClick={handleSaveGroupInfo}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow"
                      >
                        儲存
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingGroupName(false)}
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
                          setIsEditingGroupName(true);
                          setEditGroupNameInput(household.name);
                          setEditGroupBudgetInput(household.monthlyBudget || 40000);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/60 transition"
                        title="點擊修改群組名稱"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  成員 {household.members.length} 人 · 邀請碼 {household.inviteCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => handleCopyInviteCode(household.inviteCode)}
                className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '已複製！' : '複製邀請碼'}</span>
              </button>
            </div>
          </div>

          {/* 1. 成員名單、Email 邀請與申請審核列表 */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* 組長待審核的加入申請列表 */}
              {isLeader && pendingJoinRequests.length > 0 && (
                <div className="p-4 rounded-3xl bg-amber-950/50 border border-amber-500/50 space-y-3 animate-in fade-in shadow-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-amber-200">
                      待審核的加入申請 ({pendingJoinRequests.length} 筆)
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

              {/* 專屬 6 位邀請碼卡片 */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-800/40 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-purple-200 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span>「{household.name}」專屬 6 位邀請碼</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      朋友輸入代碼送出申請後，經組長審核同意即可入組！
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyInviteCode(household.inviteCode)}
                    className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-black text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95 self-start sm:self-auto"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? '已複製！' : household.inviteCode}</span>
                  </button>
                </div>
              </div>

              {/* 成員列表與 Email 邀請專區 */}
              <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">
                      正式成員名單 ({household.members.length} 人)
                    </h3>
                    <p className="text-xs text-slate-400">目前享有此群組公帳與分帳結算權限之成員</p>
                  </div>

                  {isLeader && (
                    <button
                      onClick={() => setShowEmailInviteForm(!showEmailInviteForm)}
                      className="px-3.5 py-2 rounded-xl bg-purple-950 text-purple-300 hover:bg-purple-900 border border-purple-800 text-xs font-bold transition flex items-center gap-1.5 shadow"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{showEmailInviteForm ? '收起邀請' : '以 Email 邀請新成員'}</span>
                    </button>
                  )}
                </div>

                {/* 組長以 Email 發送邀請表單 */}
                {showEmailInviteForm && isLeader && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-purple-700/60 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold text-slate-200">輸入對方的 Email 發送加入邀請</h4>
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

                {/* 已發送之 Email 邀請待確認清單 */}
                {isLeader && pendingInvitations.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      已發送之 Email 邀請 (等待對方接受中)：
                    </p>
                    <div className="space-y-1">
                      {pendingInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between text-[11px] text-slate-300 py-1 border-b border-slate-800/60 last:border-none">
                          <span>{inv.inviteeEmail} ({inv.role === 'admin' ? '副管理員' : '一般成員'})</span>
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

                          {/* 組長移除成員按鈕 */}
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

              {/* 退出與解散群組 */}
              <div className="pt-2 flex justify-between items-center">
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
          )}

          {/* 2. 💳 群組專屬付款方式 */}
          {activeTab === 'payments' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>「{household.name}」公帳專屬付款方式</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  自訂此群組在公帳記帳時的付款方式選項（例如：公用公積金、公帳專用信用卡、組長代墊等）。
                </p>
              </div>

              {/* 新增群組付款方式 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupPaymentInput}
                  onChange={(e) => setNewGroupPaymentInput(e.target.value)}
                  placeholder="例如：公用零用金, 富邦公帳信用卡, 街口公用帳號..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroupPayment();
                    }
                  }}
                />
                <button
                  onClick={handleAddGroupPayment}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
                >
                  新增方式
                </button>
              </div>

              {/* 既有群組付款方式列表 */}
              <div className="space-y-2 pt-2">
                {groupPaymentMethods.map((pm) => (
                  <div
                    key={pm}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-700/50 transition text-xs"
                  >
                    {editingPaymentOld === pm ? (
                      <div className="flex-1 flex gap-2 mr-2">
                        <input
                          type="text"
                          value={editingPaymentNew}
                          onChange={(e) => setEditingPaymentNew(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                          onClick={handleSaveEditGroupPayment}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold"
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
                        <CreditCard className="w-4 h-4 text-purple-400" />
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
                          onClick={() => removeGroupPaymentMethod(household.id, pm)}
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

          {/* 3. 🏷️ 群組專屬標籤分類庫 */}
          {activeTab === 'tags' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span>「{household.name}」群組專屬標籤庫</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  自訂此群組常用的公帳標籤，按住 ⠿ 可拖曳排序，明細頁與記帳選單將自動同步此排序。
                </p>
              </div>

              {/* 新增群組標籤 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupTagInput}
                  onChange={(e) => setNewGroupTagInput(e.target.value)}
                  placeholder="輸入新群組標籤 (如: 共同採買, 住宿分攤, 慶祝聚餐)..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGroupTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddGroupTag}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
                >
                  + 新增標籤
                </button>
              </div>

              {/* 標籤清單與拖曳排序 */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-4 h-4 text-purple-400" />
                    <span>拖曳標籤 ⠿ 即可調整排列順序，明細檢視與記帳選單將即時同步！</span>
                  </span>
                  <span className="text-[11px] font-mono text-purple-300">共 {groupTagItems.length} 個群組標籤</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {groupTagItems.map((tagItem, index) => {
                    const isBeingDragged = draggedTagIndex === index;
                    const isDragOver = dragOverTagIndex === index;
                    const isEditing = editingGroupTagKey === tagItem.id;

                    return (
                      <div
                        key={tagItem.id}
                        draggable={editingGroupTagKey === null}
                        onDragStart={(e) => {
                          setDraggedTagIndex(index);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverTagIndex !== index) {
                            setDragOverTagIndex(index);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverTagIndex === index) {
                            setDragOverTagIndex(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedTagIndex !== null && draggedTagIndex !== index) {
                            handleReorderGroupTag(draggedTagIndex, index);
                          }
                          setDraggedTagIndex(null);
                          setDragOverTagIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedTagIndex(null);
                          setDragOverTagIndex(null);
                        }}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150 select-none ${
                          isBeingDragged
                            ? 'opacity-40 scale-95 border-dashed border-purple-500 bg-purple-950/20'
                            : isDragOver
                            ? 'border-purple-400 ring-2 ring-purple-400/40 bg-purple-950/50 scale-105'
                            : isEditing
                            ? 'bg-slate-900 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                            : 'bg-slate-900/90 border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 text-slate-200 shadow-sm'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs text-slate-400 font-bold">#</span>
                            <input
                              type="text"
                              value={editingGroupTagNew}
                              onChange={(e) => setEditingGroupTagNew(e.target.value)}
                              className="w-28 px-2 py-0.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditingGroupTag();
                                if (e.key === 'Escape') setEditingGroupTagKey(null);
                              }}
                            />
                            <button
                              onClick={handleSaveEditingGroupTag}
                              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => setEditingGroupTagKey(null)}
                              className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* 拖曳手柄 */}
                            <div
                              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-purple-400 p-0.5 -ml-1 transition"
                              title="按住拖曳調整順序"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <Tag className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs font-medium">#{tagItem.name}</span>

                            <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-800">
                              {/* 順序微調按鈕 */}
                              <button
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderGroupTag(index, index - 1);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                                title="往前移動"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                disabled={index === groupTagItems.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderGroupTag(index, index + 1);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                                title="往後移動"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingGroupTagKey(tagItem.id);
                                  setEditingGroupTagNew(tagItem.name);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition ml-0.5"
                                title="編輯群組標籤名稱"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeGroupTag(household.id, tagItem.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="刪除標籤"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. 📊 公帳預算與資訊 */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-white">群組資訊與每月公帳預算</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      設定群組名稱與每月公帳總花費預算上限
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingGroupName(!isEditingGroupName);
                      setEditGroupNameInput(household.name);
                      setEditGroupBudgetInput(household.monthlyBudget || 40000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingGroupName ? '收起編輯' : '修改資訊'}</span>
                  </button>
                </div>

                {isEditingGroupName ? (
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md"
                      >
                        儲存變更
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <p className="text-[11px] text-slate-400">當前群組名稱</p>
                      <p className="text-sm font-bold text-white">{household.name}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <p className="text-[11px] text-slate-400">每月公帳預算上限</p>
                      <p className="text-sm font-bold font-mono text-purple-400">
                        NT$ {(household.monthlyBudget || 40000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 公帳各標籤預算分配總表 */}
              <BudgetAllocationView type="household" householdId={household.id} />
            </div>
          )}

          {/* 5. 📥 匯出公帳 */}
          {activeTab === 'export' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
              <div>
                <h3 className="font-bold text-sm text-white">匯出「{household.name}」公帳明細</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  匯出該群組之所有公帳消費、記帳成員與分攤紀錄。
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>此群組累計公帳交易筆數</span>
                  <span className="font-bold font-mono text-purple-400">
                    {transactions.filter((t) => t.ledgerType === 'household' && (t.householdId === household.id || !t.householdId)).length} 筆
                  </span>
                </div>
                <button
                  onClick={handleExportGroupCsv}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>立即下載群組公帳 CSV 報表</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
