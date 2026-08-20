'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import {
  ArrowLeft,
  Key,
  Barcode,
  Brain,
  Download,
  Check,
  Plus,
  CreditCard,
  Tag,
  Trash2,
  Edit2,
  User,
  Sparkles,
  DollarSign,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Button, Card } from '../ui';
import { BudgetAllocationView } from './BudgetAllocationView';

export type PersonalTabType = 'general' | 'payments' | 'tags' | 'budget' | 'ai' | 'export';

interface PersonalSettingsViewProps {
  activeTab?: PersonalTabType;
  initialTab?: PersonalTabType;
  onChangeTab?: (tab: PersonalTabType) => void;
  onBack: () => void;
}

export const PersonalSettingsView: React.FC<PersonalSettingsViewProps> = ({
  activeTab: controlledActiveTab,
  initialTab = 'payments',
  onChangeTab,
  onBack,
}) => {
  const {
    user,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    updatePaymentMethod,
    availableTagItems,
    availableTags,
    addCustomTag,
    removeCustomTag,
    updateCustomTag,
    reorderCustomTags,
    learningRules,
    updateUserProfile,
    transactions,
  } = useAppStore();

  const [internalActiveTab, setInternalActiveTab] = useState<PersonalTabType>(initialTab);
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const handleTabChange = (tab: PersonalTabType) => {
    setInternalActiveTab(tab);
    if (onChangeTab) {
      onChangeTab(tab);
    }
  };

  // 基本設定
  const [apiKey, setApiKey] = useState(user.geminiApiKey || '');
  const [carrier, setCarrier] = useState(user.defaultCarrierCode || '/AB1234+');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [weekStartDay, setWeekStartDay] = useState<number>(user.preferences?.weekStartDay ?? 1);
  const [monthStartDay, setMonthStartDay] = useState<number>(user.preferences?.monthStartDay ?? 1);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 付款方式新增 / 編輯
  const [newPaymentInput, setNewPaymentInput] = useState('');
  const [editingPaymentOld, setEditingPaymentOld] = useState<string | null>(null);
  const [editingPaymentNew, setEditingPaymentNew] = useState('');

  // 標籤新增 / 編輯 / 拖曳排序 (以永久 Key / ID 進行精準綁定)
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagKey, setEditingTagKey] = useState<string | null>(null);
  const [editingTagNew, setEditingTagNew] = useState('');
  const [draggedTagIndex, setDraggedTagIndex] = useState<number | null>(null);
  const [dragOverTagIndex, setDragOverTagIndex] = useState<number | null>(null);

  const handleReorderTag = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= availableTagItems.length ||
      toIndex >= availableTagItems.length
    )
      return;
    const newItems = [...availableTagItems];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    reorderCustomTags(newItems);
  };

  const handleSaveEditingTag = () => {
    if (editingTagKey && editingTagNew.trim()) {
      updateCustomTag(editingTagKey, editingTagNew.trim());
      setEditingTagKey(null);
      setEditingTagNew('');
    }
  };

  const handleSaveGeneral = () => {
    updateUserProfile({
      displayName: displayName.trim() || user.displayName,
      geminiApiKey: apiKey.trim(),
      defaultCarrierCode: carrier.trim().toUpperCase(),
      preferences: {
        ...(user.preferences || {}),
        weekStartDay,
        monthStartDay,
      },
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
    const clean = newTagInput.trim().replace(/^#/, '');
    addCustomTag(clean);
    setNewTagInput('');
  };

  const handleExportCsv = () => {
    const personalTxs = transactions.filter((t) => t.ledgerType === 'personal' || !t.ledgerType);
    const headers = ['日期', '品項名稱', '金額', '標籤', '付款方式', '商家/備註', '發票號碼'];
    const rows = personalTxs.map((t) => [
      t.date,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${t.tags?.[0] || '未歸類'}"`,
      t.paymentMethod || '',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.invoiceNumber || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `個人私帳明細匯出_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 頂部標題列與返回按鈕 */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 active:scale-95"
            title="返回上一頁"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-white">個人設定</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                PERSONAL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              個人專屬付款方式、私帳標籤庫、載具與 AI 模型金鑰
            </p>
          </div>
        </div>
      </div>

      {/* 頁面內容 */}
      <div className="space-y-4">
        {/* 預算分配總表 */}
        {activeTab === 'budget' && <BudgetAllocationView type="personal" />}

        {/* 1. 💳 個人付款方式 */}
        {activeTab === 'payments' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">個人專屬付款方式</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                設定您個人私帳記帳時的下拉選單選項，可隨時新增、重新命名或刪除。
              </p>
            </div>

            {/* 新增付款方式 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPaymentInput}
                onChange={(e) => setNewPaymentInput(e.target.value)}
                placeholder="例如：國泰CUBE卡, 個人現金, 街口支付..."
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

        {/* 2. 🏷️ 個人標籤庫 */}
        {activeTab === 'tags' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">個人私帳專屬標籤庫</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                自訂個人私帳常用標籤，按住 ⠿ 可拖曳排序，明細頁與記帳選單將自動同步此排序。
              </p>
            </div>

            {/* 新增標籤 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="輸入新個人標籤 (如: 貓咪零食, 健身房, 投資理財)..."
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

            {/* 標籤雲清單與拖曳排序 */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <GripVertical className="w-4 h-4 text-emerald-400" />
                  <span>拖曳標籤 ⠿ 即可調整排列順序，明細檢視與記帳選單將即時同步！</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">共 {availableTagItems.length} 個標籤</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableTagItems.map((tagItem, index) => {
                  const isBeingDragged = draggedTagIndex === index;
                  const isDragOver = dragOverTagIndex === index;
                  const isEditing = editingTagKey === tagItem.id;

                  return (
                    <div
                      key={tagItem.id}
                      draggable={editingTagKey === null}
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
                          handleReorderTag(draggedTagIndex, index);
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
                          ? 'opacity-40 scale-95 border-dashed border-emerald-500 bg-emerald-950/20'
                          : isDragOver
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-950/50 scale-105'
                          : isEditing
                          ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-200 shadow-sm'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-slate-400 font-bold">#</span>
                          <input
                            type="text"
                            value={editingTagNew}
                            onChange={(e) => setEditingTagNew(e.target.value)}
                            className="w-28 px-2 py-0.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditingTag();
                              if (e.key === 'Escape') setEditingTagKey(null);
                            }}
                          />
                          <button
                            onClick={handleSaveEditingTag}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                          >
                            儲存
                          </button>
                          <button
                            onClick={() => setEditingTagKey(null)}
                            className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-xs hover:text-white"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* 拖曳手柄 */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-emerald-400 p-0.5 -ml-1 transition"
                            title="按住拖曳調整順序"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-medium">#{tagItem.name}</span>

                          <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-800">
                            {/* 順序微調按鈕 */}
                            <button
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReorderTag(index, index - 1);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                              title="往前移動"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                              disabled={index === availableTagItems.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReorderTag(index, index + 1);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition"
                              title="往後移動"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingTagKey(tagItem.id);
                                setEditingTagNew(tagItem.name);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition ml-0.5"
                              title="編輯標籤名稱"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeCustomTag(tagItem.id)}
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

        {/* 3. 🔑 基本設定與載具 */}
        {activeTab === 'general' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">基本參數與個人載具設定</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                管理您的個人暱稱、手機條碼載具與 Google Gemini AI 模型金鑰
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  個人暱稱
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="您的暱稱"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  個人預設手機條碼載具
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

              {/* 週期與起始日設定 */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>記帳週期與視圖起始日設定</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 每週起始日 */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      每週初始日 (週檢視第一天)
                    </label>
                    <select
                      value={weekStartDay}
                      onChange={(e) => setWeekStartDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value={1}>週一 (星期一，預設)</option>
                      <option value={0}>週日 (星期日)</option>
                      <option value={6}>週六 (星期六)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      影響週檢視與月曆網格的第一列星期排列。
                    </p>
                  </div>

                  {/* 每月起始日 */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      每月初始日 (月結算帳期起始日)
                    </label>
                    <select
                      value={monthStartDay}
                      onChange={(e) => setMonthStartDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value={1}>1 號 (自然月 1 號 ~ 月底，預設)</option>
                      <option value={5}>5 號 (5 號 ~ 次月 4 號)</option>
                      <option value={10}>10 號 (10 號 ~ 次月 9 號)</option>
                      <option value={15}>15 號 (15 號 ~ 次月 14 號)</option>
                      <option value={20}>20 號 (20 號 ~ 次月 19 號)</option>
                      <option value={25}>25 號 (25 號 ~ 次月 24 號，發薪日)</option>
                      <option value={28}>28 號 (28 號 ~ 次月 27 號)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      可依據薪資發放日設定每月記帳結算週期。
                    </p>
                  </div>
                </div>
              </div>

              {savedSuccess && (
                <p className="text-xs text-emerald-400 font-bold">
                  ✅ 個人設定已成功儲存！
                </p>
              )}

              <button
                onClick={handleSaveGeneral}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                儲存個人設定
              </button>
            </div>
          </div>
        )}

        {/* 4. 🤖 AI 偏好規則 */}
        {activeTab === 'ai' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">個人 AI 自適應學習規則庫</h3>
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

        {/* 5. 📥 匯出私帳 */}
        {activeTab === 'export' && (
          <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-white">匯出個人私帳明細</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                僅匯出您的個人私帳紀錄，相容於 Excel 與 Google 試算表。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>個人私帳累計筆數</span>
                <span className="font-bold font-mono text-emerald-400">
                  {transactions.filter((t) => t.ledgerType === 'personal').length} 筆
                </span>
              </div>
              <button
                onClick={handleExportCsv}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>立即下載個人私帳 CSV 報表</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
