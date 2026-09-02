'use client';

import React, { useState } from 'react';
import { useAppStore, DEFAULT_TAG_ITEMS, generateTagKey } from '@/lib/store';
import {
  Sparkles,
  Barcode,
  CreditCard,
  Tag,
  DollarSign,
  Key,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  ExternalLink,
  Bot,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button, TagPill, ProgressBar } from '@/components';
import { TagItem } from '@app/shared';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { user, updateUserProfile } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: 基本資料與載具
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [carrierCode, setCarrierCode] = useState(user?.defaultCarrierCode || '/AB1234+');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(
    user?.defaultPaymentMethod || '現金'
  );

  // Step 2: 標籤庫設定 (預設為「食、衣、住、行」)
  const [tags, setTags] = useState<TagItem[]>(() => {
    if (user?.tagItems && user.tagItems.length > 0) {
      return user.tagItems;
    }
    return [
      { id: 'tag_food', name: '食' },
      { id: 'tag_clothing', name: '衣' },
      { id: 'tag_housing', name: '住' },
      { id: 'tag_transport', name: '行' },
      { id: 'tag_uncategorized', name: '未歸類' },
    ];
  });
  const [newTagInput, setNewTagInput] = useState('');

  // Step 3: 預算設定 (總預算與標籤預算)
  const [monthlyBudget, setMonthlyBudget] = useState<number>(user?.monthlyBudget || 30000);
  const [tagBudgets, setTagBudgets] = useState<Record<string, number>>(() => {
    if (user?.tagBudgets && Object.keys(user.tagBudgets).length > 0) {
      return user.tagBudgets;
    }
    // 預設 50/30/20 或合理分配
    return {
      食: 12000,
      衣: 3000,
      住: 10000,
      行: 3000,
    };
  });

  // Step 4: AI 智慧助理 (選填)
  const [enableAi, setEnableAi] = useState(Boolean(user?.geminiApiKey));
  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || '');

  if (!isOpen) return null;

  // 輔助函式：新增標籤
  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (tags.some((t) => t.name === clean)) {
      setNewTagInput('');
      return;
    }
    const newTag: TagItem = {
      id: generateTagKey(clean),
      name: clean,
      order: tags.length,
    };
    setTags([...tags, newTag]);
    // 預設為新標籤設定 0 預算
    setTagBudgets((prev) => ({ ...prev, [clean]: 0 }));
    setNewTagInput('');
  };

  // 輔助函式：刪除標籤
  const handleRemoveTag = (tagName: string) => {
    if (tags.length <= 1) return;
    setTags(tags.filter((t) => t.name !== tagName));
    setTagBudgets((prev) => {
      const next = { ...prev };
      delete next[tagName];
      return next;
    });
  };

  // 計算標籤預算加總與剩餘可用額度
  const activeValidTags = tags.filter((t) => t.name !== '未歸類');
  const allocatedBudgetSum = activeValidTags.reduce((sum, t) => {
    return sum + (Number(tagBudgets[t.name]) || 0);
  }, 0);
  const unallocatedBudget = monthlyBudget - allocatedBudgetSum;
  const allocationPercent =
    monthlyBudget > 0 ? Math.min(100, Math.round((allocatedBudgetSum / monthlyBudget) * 100)) : 0;

  // 略過設定 (永不再提示)
  const handleSkip = () => {
    updateUserProfile({
      hasCompletedOnboarding: true,
    });
    if (typeof window !== 'undefined') {
      if (user?.uid) {
        localStorage.setItem(`has_completed_onboarding_${user.uid}`, 'true');
      }
      localStorage.setItem('ai_expense_has_completed_onboarding', 'true');
    }
    onComplete();
  };

  // 完成所有步驟並儲存
  const handleFinishOnboarding = () => {
    updateUserProfile({
      displayName: displayName.trim() || user.displayName || '記帳達人',
      defaultCarrierCode: carrierCode.trim().toUpperCase() || '/AB1234+',
      defaultPaymentMethod,
      tagItems: tags,
      monthlyBudget: Number(monthlyBudget) || 30000,
      tagBudgets,
      geminiApiKey: enableAi ? geminiApiKey.trim() : undefined,
      hasCompletedOnboarding: true,
    });
    if (typeof window !== 'undefined') {
      if (user?.uid) {
        localStorage.setItem(`has_completed_onboarding_${user.uid}`, 'true');
      }
      localStorage.setItem('ai_expense_has_completed_onboarding', 'true');
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[var(--app-height,90dvh)] rounded-2xl sm:rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-4 sm:p-7 flex flex-col overflow-y-auto overscroll-contain">
        {/* 背景氛圍光暈 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 右上角關閉 / 略過按鈕 */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition z-10"
          title="略過設定精靈 (已設定過)"
        >
          <span className="text-xs font-bold mr-1 hidden sm:inline text-slate-400 hover:text-white">略過</span>
          ✕
        </button>

        {/* 頂部步驟進度列 */}
        <div className="mb-4 sm:mb-6 space-y-2.5 sm:space-y-3 pr-8 sm:pr-12">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] sm:text-[11px] font-extrabold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              新手引導 • 步驟 {step} / 4
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              {step === 1 && '基本資料與載具'}
              {step === 2 && '標籤庫配置'}
              {step === 3 && '預算目標規劃'}
              {step === 4 && 'AI 智慧助理'}
            </span>
          </div>

          {/* 4 階段進度條 */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ────────── STEP 1: 基本資料與載具 ────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                設定您的基本資料與常用載具
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                填寫您的稱呼與手機條碼載具，結帳時可一鍵快速出示。
              </p>
            </div>

            <div className="space-y-3.5 pt-1 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  個人暱稱 / 稱呼
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：小明、阿豪"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                    手機條碼載具
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">需以「/」開頭共 8 碼</span>
                </label>
                <input
                  type="text"
                  value={carrierCode}
                  onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                  placeholder="/AB1234+"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-emerald-400 font-mono font-bold text-base uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                  最常用的預設付款方式
                </label>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {['現金', '信用卡', 'LINE Pay', '街口支付', '悠遊卡', 'Apple Pay', 'Google Pay'].map(
                    (pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ────────── STEP 2: 標籤庫設定 (預設改為「食衣住行」) ────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                自訂生活記帳標籤庫
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                預設已為您精選最實用的 <span className="text-emerald-400 font-bold">「食、衣、住、行」</span>，您也可以在此新增或刪減自訂標籤。
              </p>
            </div>

            {/* 現有標籤清單膠囊 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-left">
              <div className="text-xs font-bold text-slate-400">目前啟用的標籤 ({tags.length} 個)：</div>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <div
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 shadow-sm group"
                  >
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>#{t.name}</span>
                    {t.name !== '未歸類' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t.name)}
                        className="ml-1 text-slate-500 hover:text-rose-400 transition"
                        title="移除標籤"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 新增自訂標籤輸入框 */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="輸入新標籤名稱 (例：育、樂、咖啡、保險)..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────── STEP 3: 預算設定 (總預算與標籤預算) ────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                規劃每月總預算與個別類別額度
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                設定每月預算上限與「食、衣、住、行」分配額度，智帳君將在超支時智慧提醒您。
              </p>
            </div>

            {/* 每月總預算 */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5">
              <label className="block text-xs font-bold text-slate-300">每月總支出預算目標</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">NT$</span>
                <input
                  type="number"
                  value={monthlyBudget === 0 ? '' : monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                  placeholder="30000"
                  className="w-full pl-12 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 快捷預算按鈕 */}
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-1.5 pt-0.5">
                {[20000, 30000, 40000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMonthlyBudget(amt)}
                    className={`text-[11px] sm:text-xs py-1.5 px-1 sm:px-2.5 rounded-lg border font-medium transition text-center truncate ${
                      monthlyBudget === amt
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    NT$ {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 各標籤個別預算分配 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                <span className="font-bold text-slate-300">各標籤分配額度</span>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold flex-wrap">
                  <span className="text-slate-400">已分配 NT$ {allocatedBudgetSum.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className={unallocatedBudget < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {unallocatedBudget < 0 ? `超額 NT$ ${Math.abs(unallocatedBudget).toLocaleString()}` : `剩餘 NT$ ${unallocatedBudget.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* 進度條 */}
              <ProgressBar
                percentage={allocationPercent}
                variant={unallocatedBudget < 0 ? 'auto' : 'emerald'}
                height="sm"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 max-h-48 sm:max-h-52 overflow-y-auto">
                {activeValidTags.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-bold text-slate-200 shrink-0 truncate">#{t.name}</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">NT$</span>
                      <input
                        type="number"
                        value={tagBudgets[t.name] ?? 0}
                        onChange={(e) =>
                          setTagBudgets({
                            ...tagBudgets,
                            [t.name]: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-7 pr-2 py-1 text-xs text-right font-mono font-bold bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────────── STEP 4: AI 智慧助理 (選填 Gemini API Key) ────────── */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                啟用 Google Gemini AI 智慧助理 (選填)
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                智帳君內建離線快速記帳，若填入 Gemini API Key 可免費享有 AI 語音精準語意解析、發票圖片拍照識別與理財顧問。
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3.5">
              {/* 是否啟用 Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">啟用 Gemini AI 雲端模型</span>
                  <span className="text-[11px] text-slate-500">免綁卡、官方提供免費額度</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableAi(!enableAi)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    enableAi ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      enableAi ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {enableAi && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-300">Google Gemini API Key</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AQ. 或 AIzaSy..."
                      className="w-full pl-3.5 pr-10 py-2 sm:py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition underline underline-offset-2 pt-1 font-medium"
                  >
                    👉 點此免費獲取 Google AI Studio API Key (約 30 秒完成)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-start gap-2 text-left">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>所有金鑰均儲存於您的瀏覽器本地，完全保障您的隱私安全。您也可以日後隨時在「基本設定與載具」中填寫或修改。</span>
            </div>
          </div>
        )}

        {/* 底部上一步 / 下一步 / 完成按鈕 (手機版置底吸附) */}
        <div className="sticky bottom-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0 p-3 sm:p-0 bg-slate-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-800/90 sm:border-t-0 mt-4 sm:mt-6 pt-3 sm:pt-4 flex items-center justify-between gap-3 z-10 rounded-b-2xl sm:rounded-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setStep((s) => (s + 1) as any)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              下一步
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleFinishOnboarding}
              leftIcon={<Check className="w-4 h-4" />}
            >
              完成設定，開始記帳 🚀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
