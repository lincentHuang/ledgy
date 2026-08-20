'use client';

import React from 'react';
import { X, ShieldCheck, FileText, Lock, UserCheck, Trash2, Mail } from 'lucide-react';
import { Button } from '../ui';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'privacy' | 'terms';
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = React.useState<'privacy' | 'terms'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              {activeTab === 'privacy' ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {activeTab === 'privacy' ? '隱私權政策 (Privacy Policy)' : '服務條款 (Terms of Service)'}
              </h3>
              <p className="text-[11px] text-slate-400">智帳君 AI 記帳 • 最後修訂日期：2026 年 8 月</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 標籤頁切換 */}
        <div className="flex gap-2 px-6 pt-3 bg-slate-900">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'privacy'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            隱私權保護政策
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'terms'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            使用者服務條款
          </button>
        </div>

        {/* 內容滾動區 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300 leading-relaxed font-normal">
          {activeTab === 'privacy' ? (
            <>
              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  1. 我們蒐集的資訊與目的
                </h4>
                <p>
                  當您使用「智帳君 AI 記帳」時，我們僅蒐集為提供個人與家庭記帳服務所必需的資訊：
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>帳號認證資訊</strong>：透過 Email/密碼 或 Google 授權登入時之 Email 與顯示暱稱。</li>
                  <li><strong>記帳與發票資料</strong>：您自行記錄之消費金額、品項標籤、發票載具條碼與家庭分攤明細。</li>
                  <li><strong>語音記帳音訊</strong>：僅在您點擊麥克風時進行即時自然語言結構化辨識，辨識完成即行釋放，不作任何商業監聽用途。</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  2. 雲端資料安全與儲存
                </h4>
                <p>
                  本服務後端採用 <strong>Google Cloud Firestore</strong> 企業級雲端資料庫儲存，傳輸全程使用 TLS 1.3 / SSL 強加密：
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>各使用者與家庭帳本資料均具備獨立權限隔離保護，嚴格防止未授權存取。</li>
                  <li><strong>我們絕不出售、出租或交換您的個人記帳資訊</strong>予任何第三方廣告業者或行銷機構。</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-emerald-400" />
                  3. 您的個人權利（匯出與刪除）
                </h4>
                <p>
                  您對個人資料保有完整自主權：
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>隨時匯出</strong>：可在「個人設定」一鍵下載 CSV / JSON 完整備份。</li>
                  <li><strong>刪除權利</strong>：您可隨時手動刪除任何記帳筆數或清除帳號，系統將自雲端資料庫永久抹除。</li>
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white">1. 認知與接受條款</h4>
                <p>
                  當您註冊或開始使用「智帳君 AI 記帳」應用程式，即表示您已詳細閱讀、瞭解並同意接受本服務條款之所有內容。
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white">2. 服務使用規範</h4>
                <p>
                  使用者應妥善保管個人登入帳號與密碼。使用者於本系統所記錄之財務收支紀錄僅供個人管理與家庭結算參考，非屬任何形式之金融投資建議。
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-white">3. 免責聲明</h4>
                <p>
                  本服務致力維持 99.9% 系統穩定度與資料即時備份。因不可抗力之第三方雲端中斷或天然災害所致之短暫服務暫停，本服務將盡速修復上線。
                </p>
              </section>
            </>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            我已瞭解並同意
          </Button>
        </div>
      </div>
    </div>
  );
};
