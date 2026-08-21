'use client';

import React, { useState } from 'react';
import { useAppStore, generateTagKey } from '@/lib/store';
import { AuthService } from '@/lib/authService';
import {
  Sparkles,
  Barcode,
  Mic,
  Users,
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Loader2,
  Tag,
  CreditCard,
  DollarSign,
  Key,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  ExternalLink,
  Bot,
  Zap,
} from 'lucide-react';

import { PrivacyPolicyModal } from '@/blocks/legal/views/PrivacyPolicyModal';
import { ProgressBar } from '@/components';
import { TagItem } from '@app/shared';

export const WelcomeView: React.FC = () => {
  const { loginWithUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTab, setPolicyTab] = useState<'privacy' | 'terms'>('privacy');

  // 登入用表單狀態
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 🌟 註冊多步驟精靈狀態 (1: 基本資料載具 -> 2: 食衣住行標籤 -> 3: 總預算與標籤預算 -> 4: AI 助理)
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: 帳號與基本資料載具
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [carrierCode, setCarrierCode] = useState('/AB1234+');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('現金');

  // Step 2: 標籤庫 (預設為「食、衣、住、行」)
  const [tags, setTags] = useState<TagItem[]>([
    { id: 'tag_food', name: '食' },
    { id: 'tag_clothing', name: '衣' },
    { id: 'tag_housing', name: '住' },
    { id: 'tag_transport', name: '行' },
    { id: 'tag_uncategorized', name: '未歸類' },
  ]);
  const [newTagInput, setNewTagInput] = useState('');

  // Step 3: 預算設定 (總預算與各標籤個別預算)
  const [monthlyBudget, setMonthlyBudget] = useState<number>(30000);
  const [tagBudgets, setTagBudgets] = useState<Record<string, number>>({
    食: 12000,
    衣: 3000,
    住: 10000,
    行: 3000,
  });

  // Step 4: AI 智慧助理
  const [enableAi, setEnableAi] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // 標籤增刪輔助
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

  // 1. Email 會員登入
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg('請輸入電子郵件與密碼');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await AuthService.loginWithEmail(loginEmail, loginPassword);
      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || '登入失敗，請確認帳號密碼。');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Google SSO 登入
  const handleGoogleSSO = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await AuthService.loginWithGoogle();
      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google 登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 註冊第一步校驗
  const handleStep1Next = () => {
    if (!regEmail.trim() || !regPassword.trim() || !displayName.trim()) {
      setErrorMsg('請填寫完整暱稱、Email 與密碼');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('密碼長度至少需要 6 個字元');
      return;
    }
    setErrorMsg('');
    setRegisterStep(2);
  };

  // 4. 完成註冊
  const handleCompleteRegister = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await AuthService.registerWithEmail(
        regEmail,
        regPassword,
        displayName,
        carrierCode || '/AB1234+'
      );

      // 附加註冊設定的所有個人化資料
      const fullUser = {
        ...user,
        defaultPaymentMethod,
        tagItems: tags,
        monthlyBudget,
        tagBudgets,
        geminiApiKey: enableAi ? geminiApiKey.trim() : undefined,
        hasCompletedOnboarding: true,
      };

      loginWithUser(fullUser as any);
    } catch (err: any) {
      setErrorMsg(err.message || '註冊失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-6 sm:py-10 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* 背景柔和氛圍光暈 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* 電腦版左側：品牌視覺與核心特色 */}
        <div className="hidden lg:block lg:col-span-7 space-y-6 text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              台灣在地化 • 智慧發票載具記帳
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              智帳君 <span className="text-emerald-400">AI 記帳</span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              手機條碼載具快速出示、發票雙 QR 掃描自動對獎、家庭公帳智慧平帳，讓每一次記帳都無比輕鬆。
            </p>
          </div>

          {/* 4 大亮點 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 font-bold">
                <Barcode className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-200">條碼載具與對獎</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">結帳一鍵出示，期期自動對獎</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2 font-bold">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-200">自然語言語音記帳</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">說一句話，AI 自動結構化分類</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 font-bold">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-200">家庭公帳與平帳</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">多人共用帳本，自動算出結算</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs text-slate-200">多端即時同步</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">手機與電腦登入即時雙向連線</p>
            </div>
          </div>
        </div>

        {/* 登入 / 註冊卡片 */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          {/* 手機版簡約頂部 Logo */}
          <div className="lg:hidden text-center mb-4 space-y-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">智帳君 AI 記帳</h1>
            <p className="text-xs text-slate-400">台灣在地化 • 智慧發票載具記帳</p>
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* 標籤頁切換 (會員登入 / 免費註冊) */}
            <div className="flex gap-1 p-1 bg-slate-800/80 rounded-2xl mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 rounded-xl transition ${
                  activeTab === 'login'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                會員登入
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 rounded-xl transition ${
                  activeTab === 'register'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                免費註冊
              </button>
            </div>

            {/* 錯誤提示 */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ────────── 1. 會員登入 ────────── */}
            {activeTab === 'login' && (
              <div className="space-y-4 text-left">
                {/* 快速 Google SSO 登入按鈕 */}
                <button
                  type="button"
                  onClick={handleGoogleSSO}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2.5 transition active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>使用 Google 帳號快速登入</span>
                </button>

                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <span className="relative bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold">
                    或使用 Email 登入
                  </span>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      電子郵件 (Email)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      密碼
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="輸入您的密碼"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>登入並開始記帳</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ────────── 2. 🌟 註冊多步驟設定精靈 ────────── */}
            {activeTab === 'register' && (
              <div className="space-y-4 text-left">
                {/* 4 階段進度指示條 */}
                <div className="space-y-2 pb-1">
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      註冊引導 • 步驟 {registerStep} / 4
                    </span>
                    <span className="text-slate-400 font-bold">
                      {registerStep === 1 && '帳號與載具'}
                      {registerStep === 2 && '標籤庫配置'}
                      {registerStep === 3 && '預算設定'}
                      {registerStep === 4 && 'AI 助理 (選填)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          s <= registerStep ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* ── STEP 1: 帳號、基本資料與載具 ── */}
                {registerStep === 1 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        使用者暱稱
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="例如：王小明"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        電子郵件 (Email)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        設定密碼 (至少 6 碼)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="設定登入密碼"
                          className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <span>手機條碼載具</span>
                        <span className="text-[10px] text-slate-400 font-normal">需以「/」開頭</span>
                      </label>
                      <div className="relative">
                        <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={carrierCode}
                          onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                          placeholder="/AB1234+"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono uppercase text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                          maxLength={8}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        常用預設付款方式
                      </label>
                      <select
                        value={defaultPaymentMethod}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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

                    <button
                      type="button"
                      onClick={handleStep1Next}
                      className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-[0.98] mt-2"
                    >
                      <span>下一步：設定標籤庫</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ── STEP 2: 標籤庫設定 (預設 食、衣、住、行) ── */}
                {registerStep === 2 && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <div>
                      <p className="text-xs text-slate-300 font-bold">
                        生活記帳標籤庫 (預設為 <span className="text-emerald-400">食、衣、住、行</span>)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        您可以點擊刪除，或在下方新增自訂標籤：
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <div
                            key={t.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
                          >
                            <Tag className="w-3 h-3 text-emerald-400" />
                            <span>#{t.name}</span>
                            {t.name !== '未歸類' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t.name)}
                                className="ml-1 text-slate-500 hover:text-rose-400"
                                title="刪除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="新增標籤 (例：育、樂、其他)..."
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500"
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
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          新增
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        上一步
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterStep(3)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow"
                      >
                        <span>下一步：設定每月預算</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: 預算設定 (總預算與標籤預算) ── */}
                {registerStep === 3 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div>
                      <p className="text-xs text-slate-300 font-bold">
                        規劃每月總支出與個別類別預算
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        超支時系統將會主動智慧提醒您。
                      </p>
                    </div>

                    {/* 每月總預算 */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-300">每月總支出預算</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">NT$</span>
                        <input
                          type="number"
                          value={monthlyBudget === 0 ? '' : monthlyBudget}
                          onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
                          placeholder="30000"
                          className="w-full pl-10 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-base outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 快捷預算按鈕 */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[20000, 30000, 40000, 50000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setMonthlyBudget(amt)}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition ${
                              monthlyBudget === amt
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            ${amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 標籤預算分配 */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-300">各標籤分配</span>
                        <span className={unallocatedBudget < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          已配 ${allocatedBudgetSum.toLocaleString()} / {unallocatedBudget < 0 ? `超額 $${Math.abs(unallocatedBudget).toLocaleString()}` : `剩餘 $${unallocatedBudget.toLocaleString()}`}
                        </span>
                      </div>

                      <ProgressBar
                        percentage={allocationPercent}
                        variant={unallocatedBudget < 0 ? 'auto' : 'emerald'}
                        height="sm"
                      />

                      <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                        {activeValidTags.map((t) => (
                          <div
                            key={t.id}
                            className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-1"
                          >
                            <span className="text-[11px] font-bold text-slate-300 truncate">#{t.name}</span>
                            <div className="relative w-20">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">$</span>
                              <input
                                type="number"
                                value={tagBudgets[t.name] ?? 0}
                                onChange={(e) =>
                                  setTagBudgets({
                                    ...tagBudgets,
                                    [t.name]: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full pl-4 pr-1 py-0.5 text-[11px] text-right font-mono font-bold bg-slate-950 border border-slate-700 rounded-md text-white outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(2)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        上一步
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterStep(4)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow"
                      >
                        <span>下一步：AI 助理</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: AI 智慧助理 (選填) ── */}
                {registerStep === 4 && (
                  <div className="space-y-3 animate-in fade-in">
                    <div>
                      <p className="text-xs text-slate-300 font-bold flex items-center gap-1">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        啟用 Google Gemini AI (選填)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        填入 Gemini API Key 可免費享有 AI 語音多品項結構化解析與專屬理財顧問。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">啟用 Gemini AI 模型</span>
                          <span className="text-[10px] text-slate-500">免綁卡、官方提供免費額度</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnableAi(!enableAi)}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                            enableAi ? 'bg-emerald-600' : 'bg-slate-800'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              enableAi ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {enableAi && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-in fade-in">
                          <label className="block text-xs font-bold text-slate-300">Gemini API Key</label>
                          <div className="relative">
                            <input
                              type="password"
                              value={geminiApiKey}
                              onChange={(e) => setGeminiApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <Key className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>

                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition underline pt-0.5"
                          >
                            👉 點此免費獲取 Google AI Studio Key (約 30 秒)
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(3)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        上一步
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteRegister}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>完成註冊，開始記帳 🚀</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 隱私權政策與服務條款小字宣告 */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 leading-tight">
                登入或註冊即代表您已同意智帳君的{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPolicyTab('terms');
                    setShowPolicyModal(true);
                  }}
                  className="text-slate-400 hover:text-emerald-400 underline font-medium"
                >
                  服務條款
                </button>
                {' '}與{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPolicyTab('privacy');
                    setShowPolicyModal(true);
                  }}
                  className="text-slate-400 hover:text-emerald-400 underline font-medium"
                >
                  隱私權政策
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 隱私權與服務條款彈窗 */}
      <PrivacyPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        defaultTab={policyTab}
      />
    </main>
  );
};
