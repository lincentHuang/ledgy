'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import {
  X,
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
  Info,
  Copy,
  LogOut,
  UserPlus,
} from 'lucide-react';

export type SettingsTabType = 'general' | 'payments' | 'tags' | 'group' | 'ai' | 'export';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
}) => {
  const {
    user,
    household,
    learningRules,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    updatePaymentMethod,
    availableTags,
    addCustomTag,
    removeCustomTag,
    updateUserProfile,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    transactions,
  } = useAppStore();

  const [apiKey, setApiKey] = useState(user.geminiApiKey || '');
  const [carrier, setCarrier] = useState(user.defaultCarrierCode || '/AB1234+');
  const [houseName, setHouseName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

  // 付款方式新增 / 編輯狀態
  const [newPaymentInput, setNewPaymentInput] = useState('');
  const [editingPaymentOld, setEditingPaymentOld] = useState<string | null>(null);
  const [editingPaymentNew, setEditingPaymentNew] = useState('');

  // 標籤新增狀態
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveGeneral = () => {
    updateUserProfile({
      geminiApiKey: apiKey.trim(),
      defaultCarrierCode: carrier.trim().toUpperCase(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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

  const handleCreateHousehold = () => {
    if (!houseName.trim()) return;
    createHousehold(houseName.trim());
    setHouseName('');
    alert('群組建立成功！已自動加入群組。');
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim()) return;
    const res = await joinHousehold(joinCode.trim());
    if (res.success) {
      setJoinCode('');
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-5 sm:p-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-white">設定與偏好管理</h2>
            <p className="text-xs text-slate-400">
              群組分帳設定、付款方式、標籤庫與 AI 模型金鑰
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 選單 */}
        <div className="flex gap-1 p-1 bg-slate-800/80 rounded-2xl my-3 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'general'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            基本設定
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'group'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 群組設定
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'payments'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💳 付款方式
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'tags'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏷️ 標籤分類庫
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'ai'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🤖 AI 規則
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
              activeTab === 'export'
                ? 'bg-slate-900 text-emerald-400 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            匯出資料
          </button>
        </div>

        {/* 內容區 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* 1. 基本設定 */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-200">Gemini AI API 金鑰</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  系統可使用內建 AI 辨識。若您希望擁有更高額度與更快速的語音與影像解析，可填入您向 Google AI Studio 申請的個人 API Key。
                </p>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-200">預設手機條碼載具</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  結帳時可隨時於頂部快速出示此條碼供店員掃描。
                </p>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="/ABC1234"
                  maxLength={8}
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleSaveGeneral}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>設定已成功儲存！</span>
                  </>
                ) : (
                  <span>儲存基本設定</span>
                )}
              </button>
            </div>
          )}

          {/* 2. 👥 群組設定與管理 (建立 / 加入 / 邀請碼 / 退出) */}
          {activeTab === 'group' && (
            <div className="space-y-4">
              {household ? (
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">目前記帳群組</p>
                      <h3 className="font-bold text-base text-slate-100 mt-0.5">{household.name}</h3>
                    </div>
                    <button
                      onClick={() => handleCopyInviteCode(household.inviteCode)}
                      className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 font-mono text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                      title="複製邀請碼"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? '已複製！' : `邀請碼: ${household.inviteCode}`}</span>
                    </button>
                  </div>

                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    分享上方 6 位邀請碼給家人或朋友，對方即可加入群組共同記帳與自動結算分帳。
                  </p>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <p className="text-slate-300 font-bold text-xs">
                      群組成員 ({household.members.length} 人)：
                    </p>
                    <div className="space-y-1.5">
                      {household.members.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold text-xs">
                              {m.displayName?.[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{m.displayName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                載具: {m.carrierCode || '未設定'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                            {m.role === 'owner' || m.role === 'admin' ? '建立者' : '成員'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 退出群組按鈕 */}
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm(`確定要退出「${household.name}」記帳群組嗎？退出後將切換為個人私帳。`)) {
                          leaveHousehold();
                          alert('已退出群組，切換為個人模式。');
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 text-rose-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>退出此群組</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 尚未加入任何群組 */}
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <h3 className="font-bold text-sm text-slate-200">建立新的記帳群組</h3>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      適合家庭開銷、情侶公帳、合租室友或旅遊分帳，成員可共用公帳並自動算清分攤餘額。
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={houseName}
                        onChange={(e) => setHouseName(e.target.value)}
                        placeholder="輸入群組名稱 (例如：我們這一家, 7月日本行)..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateHousehold();
                          }
                        }}
                      />
                      <button
                        onClick={handleCreateHousehold}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        建立群組
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-sky-400" />
                      <h3 className="font-bold text-sm text-slate-200">加入既有記帳群組</h3>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      輸入群組建立者分享給您的 6 位大寫英數邀請碼。
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="輸入 6 位邀請碼 (例如: WARM88)"
                        className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleJoinHousehold();
                          }
                        }}
                      />
                      <button
                        onClick={handleJoinHousehold}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
                      >
                        加入群組
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. 💳 付款方式管理 */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-sm text-slate-200">付款方式管理</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    共 {paymentMethods.length} 種方式
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  自訂您的常用支付管道（如信用卡、LINE Pay、街口、全支付等），記帳時將以 Select 下拉選單直覺選擇。
                </p>

                {/* 新增付款方式 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPaymentInput}
                    onChange={(e) => setNewPaymentInput(e.target.value)}
                    placeholder="新增付款方式 (例如：台新黑狗卡, 全盈+PAY)..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPayment();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增
                  </button>
                </div>

                {/* 付款方式列表 */}
                <div className="space-y-1.5 pt-2 max-h-64 overflow-y-auto">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
                    >
                      {editingPaymentOld === pm ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingPaymentNew}
                            onChange={(e) => setEditingPaymentNew(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditPayment}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            儲存
                          </button>
                          <button
                            onClick={() => setEditingPaymentOld(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          {pm}
                        </span>
                      )}

                      {editingPaymentOld !== pm && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPaymentOld(pm);
                              setEditingPaymentNew(pm);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="重新命名"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`確定要刪除「${pm}」付款方式嗎？`)) {
                                removePaymentMethod(pm);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="刪除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. 🏷️ 標籤分類庫管理 */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-200">標籤與分類庫管理</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">共 {availableTags.length} 個標籤</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  系統已將主分類與子分類整合為靈活直覺的標籤體系。您可以在此自訂屬於您的生活標籤。
                </p>

                {/* 新增標籤 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="新增標籤 (例如：毛小孩·寵物, 投資理財)..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增標籤
                  </button>
                </div>

                {/* 標籤雲列表 */}
                <div className="flex flex-wrap gap-2 pt-2 max-h-64 overflow-y-auto p-2 bg-slate-900/60 rounded-2xl border border-slate-800">
                  {availableTags.map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs group"
                    >
                      <span className="text-emerald-400 font-bold">#</span>
                      <span>{tag}</span>
                      <button
                        onClick={() => removeCustomTag(tag)}
                        className="opacity-60 hover:opacity-100 hover:text-rose-400 ml-1 text-slate-400 transition"
                        title="刪除標籤"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. AI 學習規則 */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-sm text-slate-200">AI 個性化記帳規則庫</h3>
                </div>
                <p className="text-slate-400">
                  當您手動修改記帳明細或發票分類時，AI 會自動提煉規則並在此累積記憶。
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {learningRules.length === 0 ? (
                  <p className="text-center py-6 text-slate-500">尚無學習規則</p>
                ) : (
                  learningRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-200">
                          關鍵字: <span className="text-emerald-400">「{rule.vendorPattern || rule.keywordPattern || '生活消費'}」</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          分類至: {rule.targetCategoryName || rule.targetCategoryId} ({rule.targetSubCategory || '預設'}) · 次數:{' '}
                          {rule.usageCount || 1}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        自動生效
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. 匯出資料 */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-200">匯出記帳明細 (CSV)</h3>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  將您所有的記帳記錄、發票明細、付款方式與標籤完整匯出為標準 CSV
                  檔案，相容於 Excel、Numbers 與 Google Sheets。
                </p>
                <button
                  onClick={handleExportCsv}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>下載完整 CSV 報表</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
