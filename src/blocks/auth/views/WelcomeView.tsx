'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AuthService, AuthUser } from '@/lib/authService';
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
} from 'lucide-react';

import { PrivacyPolicyModal } from '@/blocks/legal/views/PrivacyPolicyModal';

export const WelcomeView: React.FC = () => {
  const { loginWithUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
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
        carrierCode || '/AB1234+'
      );
      loginWithUser(user);
    } catch (err: any) {
      setErrorMsg(err.message || '註冊失敗');
    } finally {
      setIsLoading(false);
    }
  };

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
            {/* 標籤頁切換 (會員登入 / 免費註冊) */}
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
