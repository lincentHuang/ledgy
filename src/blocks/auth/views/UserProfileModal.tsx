'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  User,
  Mail,
  Barcode,
  LogOut,
  ShieldCheck,
  Check,
  Edit2,
  Users,
  CreditCard,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AuthUser } from '@/lib/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, logout, updateUserProfile } = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [carrierCode, setCarrierCode] = useState(user.defaultCarrierCode || '/AB1234+');
  const [monthlyBudget, setMonthlyBudget] = useState(user.monthlyBudget || 35000);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    updateUserProfile({
      displayName: displayName.trim(),
      defaultCarrierCode: carrierCode.trim().toUpperCase(),
      monthlyBudget: Number(monthlyBudget),
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const authUser = user as unknown as AuthUser;
  const provider = authUser.provider || 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-6 overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">個人帳號與檔案</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 使用者名片 */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
              {user.displayName.substring(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-base text-slate-100 truncate">
              {user.displayName}
            </h3>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 uppercase border border-emerald-800">
                {provider} SSO
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> 已驗證
              </span>
            </div>
          </div>
        </div>

        {/* 編輯個人資料區 */}
        {isEditing ? (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                顯示暱稱
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                預設手機條碼載具
              </label>
              <input
                type="text"
                value={carrierCode}
                onChange={(e) => setCarrierCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono uppercase text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={8}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                每月個人預算 (NT$)
              </label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-mono text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md"
              >
                儲存變更
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                預設載具條碼
              </span>
              <span className="font-mono font-bold text-slate-100 tracking-wider">
                {user.defaultCarrierCode || '未設定'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                每月預算上限
              </span>
              <span className="font-bold text-slate-100">
                NT$ {user.monthlyBudget?.toLocaleString() || '35,000'}
              </span>
            </div>

            {saveSuccess && (
              <p className="text-center text-xs text-emerald-400 font-bold py-1">
                ✅ 個人資料已成功儲存！
              </p>
            )}

            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
              編輯名片與預算
            </button>
          </div>
        )}

        {/* 登出按鈕 */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/60 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            登出帳號並返回歡迎頁
          </button>
        </div>
      </div>
    </div>
  );
};
