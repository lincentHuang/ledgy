'use client';

import React, { useState } from 'react';
import { useAppStore, generateTagKey } from '@/lib/store';
import { AuthService } from '@/lib/authService';
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
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { ProgressBar } from '@/components';
import { TagItem } from '@app/shared';

interface OnboardingWizardViewProps {
  onBackToLogin?: () => void;
  onComplete?: () => void;
  isRegisteredUser?: boolean;
}

export const OnboardingWizardView: React.FC<OnboardingWizardViewProps> = ({
  onBackToLogin,
  onComplete,
  isRegisteredUser = false,
}) => {
  const { user, updateUserProfile, loginWithUser } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: 帳號、暱稱、載具與付款方式
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [carrierCode, setCarrierCode] = useState(user?.defaultCarrierCode || '/AB1234+');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(
    user?.defaultPaymentMethod || '現金'
  );

  // Step 2: 標籤庫 (預設為「食、衣、住、行」)
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

  // Step 3: 每月總預算與標籤預算分配
  const [monthlyBudget, setMonthlyBudget] = useState<number>(user?.monthlyBudget || 30000);
  const [tagBudgets, setTagBudgets] = useState<Record<string, number>>(() => {
    if (user?.tagBudgets && Object.keys(user.tagBudgets).length > 0) {
      return user.tagBudgets;
    }
    return {
      食: 12000,
      衣: 3000,
      住: 10000,
      行: 3000,
    };
  });

  // Step 4: AI 智慧助理 (選填 Gemini API Key)
  const [enableAi, setEnableAi] = useState(Boolean(user?.geminiApiKey));
  const [geminiApiKey, setGeminiApiKey] = useState(user?.geminiApiKey || '');

  // 標籤增刪
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
    setTagBudgets((prev) => ({ ...prev, [clean]: 0 }));
    setNewTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    if (tags.length <= 1) return;
    setTags(tags.filter((t) => t.name !== tagName));
    setTagBudgets((prev) => {
      const next = { ...prev };
      delete next[tagName];
      return next;
    });
  };

  // 預算運算
  const activeValidTags = tags.filter((t) => t.name !== '未歸類');
  const allocatedBudgetSum = activeValidTags.reduce((sum, t) => {
    return sum + (Number(tagBudgets[t.name]) || 0);
  }, 0);
  const unallocatedBudget = monthlyBudget - allocatedBudgetSum;
  const allocationPercent =
    monthlyBudget > 0 ? Math.min(100, Math.round((allocatedBudgetSum / monthlyBudget) * 100)) : 0;

  // Step 1 驗證與前進
  const handleStep1Next = () => {
    setErrorMessage('');
    if (!isRegisteredUser) {
      if (!email.trim() || !password.trim() || !displayName.trim()) {
        setErrorMessage('請填寫完整個人暱稱、Email 與密碼');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('密碼長度至少需要 6 個字元');
        return;
      }
    } else {
      if (!displayName.trim()) {
        setErrorMessage('請填寫您的暱稱或稱呼');
        return;
      }
    }
    setStep(2);
  };

  // 完成所有配置並送出
  const handleFinishOnboarding = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!isRegisteredUser && !user?.uid) {
        // 新註冊流程
        const authUser = await AuthService.registerWithEmail(
          email,
          password,
          displayName,
          carrierCode || '/AB1234+'
        );

        const fullUser = {
          ...authUser,
          defaultPaymentMethod,
          tagItems: tags,
          monthlyBudget: Number(monthlyBudget) || 30000,
          tagBudgets,
          geminiApiKey: enableAi ? geminiApiKey.trim() : undefined,
          hasCompletedOnboarding: true,
        };

        loginWithUser(fullUser as any);
      } else {
        // 既有已登入用戶（如 Google SSO 首次登入）
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
      }

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      setErrorMessage(err.message || '設定完成時發生錯誤，請重試。');
    } finally {
      setIsLoading(false);
    }
  };

  const stepsInfo = [
    { num: 1, title: '基本資料與載具', desc: '稱呼、條碼與付款' },
    { num: 2, title: '標籤庫配置', desc: '預設食衣住行' },
    { num: 3, title: '預算目標規劃', desc: '總額與類別分配' },
    { num: 4, title: 'AI 智慧助理', desc: '選填 Gemini Key' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* 背景柔和氛圍光暈 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 頂部 Header */}
      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-2 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="返回登入"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 font-black text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">智帳君 AI 記帳</h1>
              <p className="text-[10px] text-emerald-400 font-bold">新手專屬設定精靈</p>
            </div>
          </div>
        </div>

        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition"
          >
            已有帳號？直接登入
          </button>
        )}
      </header>

      {/* 主要精靈主卡片區 */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col justify-center z-10">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* 4 步驟進度列導航 */}
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {stepsInfo.map((s) => {
                const isActive = s.num === step;
                const isPassed = s.num < step;
                return (
                  <div key={s.num} className="space-y-1.5 text-center">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'bg-emerald-400 shadow-md shadow-emerald-500/50'
                          : isPassed
                          ? 'bg-emerald-600'
                          : 'bg-slate-800'
                      }`}
                    />
                    <div className="hidden sm:block text-[11px] font-bold text-slate-400 truncate">
                      {s.num}. {s.title}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sm:hidden flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-400 font-bold">
                步驟 {step} / 4：{stepsInfo[step - 1].title}
              </span>
              <span className="text-slate-500 text-[11px]">{stepsInfo[step - 1].desc}</span>
            </div>
          </div>

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ────────── STEP 1: 基本資料、載具與常用付款方式 ────────── */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200 text-left">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  設定您的基本資料與常用載具
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  建立個人稱呼與手機條碼載具，結帳時一鍵快速出示。
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    個人暱稱 / 稱呼 <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="例如：王小明、Chen"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {!isRegisteredUser && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        電子郵件 (Email 登入帳號) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        設定登入密碼 (至少 6 碼) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="請設定密碼"
                          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-emerald-400" />
                      手機條碼載具
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">需以「/」開頭</span>
                  </label>
                  <input
                    type="text"
                    value={carrierCode}
                    onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                    placeholder="/AB1234+"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-emerald-400 font-mono font-bold text-base uppercase outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                    maxLength={8}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-teal-400" />
                    常用預設付款方式
                  </label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500"
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

          {/* ────────── STEP 2: 標籤庫配置 (預設改為「食衣住行」) ────────── */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200 text-left">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  自訂生活記帳標籤庫
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  系統預設已為您配置最實用的 <span className="text-emerald-400 font-bold">「食、衣、住、行」</span>，您可隨時刪除或新增其他自訂標籤。
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-slate-400">目前啟用的標籤 ({tags.length} 個)：</div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200 shadow-sm group hover:border-slate-600 transition"
                    >
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>#{t.name}</span>
                      {t.name !== '未歸類' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t.name)}
                          className="ml-1 text-slate-400 hover:text-rose-400 transition"
                          title="移除標籤"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="輸入新標籤名稱 (例：育、樂、咖啡、保險)..."
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm shadow-emerald-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    新增
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────────── STEP 3: 預算設定 (總預算與個別標籤預算) ────────── */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200 text-left">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  規劃每月總支出與個別類別預算
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  設定每月預算上限與「食、衣、住、行」分配額度，超支時智帳君將智慧提醒您。
                </p>
              </div>

              {/* 每月總預算 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300">每月總支出預算目標</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">NT$</span>
                  <input
                    type="number"
                    value={monthlyBudget === 0 ? '' : monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                    placeholder="30000"
                    className="w-full pl-14 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-black text-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[20000, 30000, 40000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMonthlyBudget(amt)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                        monthlyBudget === amt
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      NT$ {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 標籤預算分配 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">各標籤分配額度</span>
                  <span className={unallocatedBudget < 0 ? 'text-rose-400' : 'text-slate-400'}>
                    已分配 NT$ {allocatedBudgetSum.toLocaleString()} / {unallocatedBudget < 0 ? `超額 NT$ ${Math.abs(unallocatedBudget).toLocaleString()}` : `剩餘 NT$ ${unallocatedBudget.toLocaleString()}`}
                  </span>
                </div>

                <ProgressBar
                  percentage={allocationPercent}
                  variant={unallocatedBudget < 0 ? 'auto' : 'emerald'}
                  height="sm"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-h-48 overflow-y-auto">
                  {activeValidTags.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-slate-200 truncate">#{t.name}</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">NT$</span>
                        <input
                          type="number"
                          value={tagBudgets[t.name] ?? 0}
                          onChange={(e) =>
                            setTagBudgets({
                              ...tagBudgets,
                              [t.name]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full pl-8 pr-2.5 py-1 text-xs text-right font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:ring-1 focus:ring-emerald-400"
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
            <div className="space-y-5 animate-in fade-in duration-200 text-left">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  啟用 Google Gemini AI 智慧助理 (選填)
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  智帳君內建離線快速記帳，若填入 Gemini API Key 可免費享有語音多品項結構化解析、發票圖片拍照識別與理財顧問。
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
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
                  <div className="space-y-2.5 pt-3 border-t border-slate-800/80 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-300">Google Gemini API Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-700 bg-slate-900 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Key className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>

                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition underline underline-offset-2 pt-1 font-medium"
                    >
                      👉 點此免費獲取 Google AI Studio API Key (約 30 秒完成)
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>所有金鑰均儲存於您的瀏覽器本地，完全保障隱私安全。您也可以日後隨時在「基本設定與載具」中填寫或修改。</span>
              </div>
            </div>
          )}

          {/* 底部導航操作列 */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            ) : onBackToLogin ? (
              <button
                type="button"
                onClick={onBackToLogin}
                className="px-4 py-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登入
              </button>
            ) : (
              <div />
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleStep1Next}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 active:scale-[0.98]"
              >
                <span>下一步：設定標籤庫</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 active:scale-[0.98]"
              >
                <span>下一步</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={isLoading}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>完成設定，開始記帳 🚀</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 底部 Footer */}
      <footer className="w-full max-w-3xl mx-auto px-4 py-4 text-center text-[11px] text-slate-500 z-10">
        智帳君 AI 記帳 • 台灣在地化發票載具與家庭記帳
      </footer>
    </div>
  );
};
