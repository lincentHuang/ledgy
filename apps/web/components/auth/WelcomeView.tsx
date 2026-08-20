'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { AuthService, AuthUser } from '../../lib/authService';
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
  Zap,
  CheckCircle2,
} from 'lucide-react';

import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';

export const WelcomeView: React.FC = () => {
  const { loginWithUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'demo'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [carrierCode, setCarrierCode] = useState('/AB1234+');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTab, setPolicyTab] = useState<'privacy' | 'terms'>('privacy');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('請輸入電子郵件與密碼');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await AuthService.loginWithEmail(email, password);
      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || '登入失敗，請確認帳號密碼。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setErrorMsg('請完整填寫註冊資料');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await AuthService.registerWithEmail(
        email,
        password,
        displayName,
        carrierCode
      );
      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || '註冊失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = async (provider: 'google' | 'apple' | 'line' | 'guest') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let user: AuthUser;
      if (provider === 'google') user = await AuthService.loginWithGoogle();
      else if (provider === 'apple') user = await AuthService.loginWithApple();
      else if (provider === 'line') user = await AuthService.loginWithLine();
      else user = await AuthService.loginAsGuest();

      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || '第三方登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: 'chen' | 'lin') => {
    setIsLoading(true);
    const targetEmail = role === 'chen' ? 'chen.wei@example.com' : 'yichun.lin@example.com';
    AuthService.loginWithEmail(targetEmail, 'password123')
      .then((u) => loginWithUser(u))
      .catch((err) => setErrorMsg(err.message || '登入失敗'))
      .finally(() => setIsLoading(false));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-6 sm:py-10 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* 背景柔和氛圍光暈 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* 電腦版左側：品牌視覺與核心特色（手機版自動隱藏，維持純粹簡潔） */}
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

        {/* 登入主卡片（手機版置中、超簡潔俐落） */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          {/* 手機版簡約頂部 Logo 標題（極簡精巧） */}
          <div className="lg:hidden text-center mb-5 space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight pt-1">智帳君 AI 記帳</h1>
            <p className="text-xs text-slate-400">台灣在地化 • 智慧發票載具記帳</p>
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
            {/* 標籤頁切換 (會員登入 / 免費註冊 / 示範帳號) */}
            <div className="flex gap-1 p-1 bg-slate-800/80 rounded-2xl mb-5 text-xs font-semibold">
              <button
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
              <button
                onClick={() => {
                  setActiveTab('demo');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 rounded-xl transition ${
                  activeTab === 'demo'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                示範帳號
              </button>
            </div>

            {/* 錯誤提示 */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. 會員登入 */}
            {activeTab === 'login' && (
              <div className="space-y-4 text-left">
                {/* 快速第三方登入按鈕 */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSSO('google')}
                    disabled={isLoading}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 text-slate-200"
                  >
                    Google
                  </button>
                  <button
                    onClick={() => handleSSO('line')}
                    disabled={isLoading}
                    className="py-2.5 rounded-xl bg-[#06C755]/15 hover:bg-[#06C755]/25 border border-[#06C755]/30 text-[#06C755] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    LINE
                  </button>
                  <button
                    onClick={() => handleSSO('apple')}
                    disabled={isLoading}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 text-slate-200"
                  >
                    Apple
                  </button>
                </div>

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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="chen.wei@example.com"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="輸入您的密碼 (示範: password123)"
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

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleSSO('guest')}
                    className="text-xs text-slate-400 hover:text-emerald-400 underline transition"
                  >
                    ⚡ 免註冊，以訪客身分快速試用
                  </button>
                </div>
              </div>
            )}

            {/* 2. 免費註冊 */}
            {activeTab === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-3 text-left">
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    電子郵件
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="設定登入密碼"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    手機條碼載具 (選填)
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={carrierCode}
                      onChange={(e) => setCarrierCode(e.target.value)}
                      placeholder="/AB1234+"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono uppercase text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      maxLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '立即註冊並登入'}
                </button>
              </form>
            )}

            {/* 3. 示範帳號一鍵體驗 */}
            {activeTab === 'demo' && (
              <div className="space-y-3 text-left">
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-900/60">
                  <p className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    免註冊，點擊任一示範帳號立即體驗：
                  </p>
                </div>

                <button
                  onClick={() => handleDemoLogin('chen')}
                  disabled={isLoading}
                  className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                      陳
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition">
                        陳威廷 (科技工程師)
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        載具：/AB1234+ • 常用 LINE Pay
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                </button>

                <button
                  onClick={() => handleDemoLogin('lin')}
                  disabled={isLoading}
                  className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-teal-500/50 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-500/30">
                      林
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-100 group-hover:text-teal-400 transition">
                        林怡君 (UI/UX 設計師)
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        載具：/XY9876- • 常用 全支付
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition" />
                </button>
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
                  隱私權保護政策
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 隱私權政策 Modal */}
      <PrivacyPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        defaultTab={policyTab}
      />
    </main>
  );
};
