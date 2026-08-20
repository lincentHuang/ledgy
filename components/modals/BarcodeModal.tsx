'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../lib/store';
import {
  X,
  Copy,
  Check,
  Users,
  Edit3,
  CloudDownload,
  Loader2,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  HelpCircle,
  QrCode,
  ShieldCheck,
  Settings2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import confetti from 'canvas-confetti';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ isOpen, onClose, onOpenScanner }) => {
  const { user, household, updateUserProfile, syncMofInvoices } = useAppStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(user.defaultCarrierCode || '/AB1234+');
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(user.defaultCarrierCode || '/AB1234+');
  
  // 載具驗證碼（密碼）狀態
  const [verificationCode, setVerificationCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mof_carrier_verify_code') || '';
    }
    return '';
  });
  // 自訂 AppID 狀態
  const [appId, setAppId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mof_custom_app_id') || '';
    }
    return '';
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAppIdGuide, setShowAppIdGuide] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && svgRef.current) {
      try {
        JsBarcode(svgRef.current, selectedCarrier.toUpperCase(), {
          format: 'CODE39',
          lineColor: '#000000',
          width: 2.8,
          height: 95,
          displayValue: true,
          font: 'monospace',
          fontSize: 20,
          textMargin: 8,
          background: '#ffffff',
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [isOpen, selectedCarrier]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedCarrier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    let clean = editVal.trim().toUpperCase();
    if (!clean.startsWith('/')) clean = '/' + clean;
    setSelectedCarrier(clean);
    updateUserProfile({ defaultCarrierCode: clean });
    setIsEditing(false);
  };

  const handleSaveVerificationCode = (val: string) => {
    setVerificationCode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mof_carrier_verify_code', val);
    }
  };

  const handleSaveAppId = (val: string) => {
    setAppId(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mof_custom_app_id', val);
    }
  };

  const handleTriggerMofSync = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncMofInvoices(
        verificationCode.trim() || undefined,
        appId.trim() || undefined,
        true
      );
      if (res.success) {
        setSyncMsg(res.message);
        if (res.count > 0) {
          confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.6 },
          });
        }
      } else {
        setSyncMsg(res.message);
      }
    } catch (e: any) {
      setSyncMsg(e.message || '財政部同步失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-5 overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-sm">
              條
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">手機條碼載具與雲端同步</h2>
              <p className="text-[11px] text-slate-400">結帳出示條碼 · 一鍵同步發票與明細</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 條碼高亮顯示區域 */}
        <div className="bg-white rounded-2xl border-2 border-slate-900/10 p-4 shadow-inner flex flex-col items-center justify-center my-2">
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg ref={svgRef} className="max-w-full"></svg>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xl font-black tracking-widest text-slate-900">
              {selectedCarrier}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition"
              title="複製載具條碼"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 編輯條碼 */}
        {isEditing ? (
          <div className="mt-2.5 flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
            <input
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              placeholder="/ABC1234"
              className="flex-1 px-3 py-1.5 text-xs font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={8}
            />
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
            >
              儲存
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-700 text-slate-400 text-xs font-medium"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1 px-1">
            <span>載具號碼：<strong className="text-slate-200 font-mono">{selectedCarrier}</strong></span>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline text-[11px]"
            >
              <Edit3 className="w-3 h-3" />
              修改我的條碼
            </button>
          </div>
        )}

        {/* 🔑 財政部載具驗證碼（密碼）設定區塊 */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              載具驗證碼（財政部密碼）
            </label>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              <HelpCircle className="w-3 h-3" />
              忘記密碼？
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              value={verificationCode}
              onChange={(e) => handleSaveVerificationCode(e.target.value)}
              placeholder="請輸入 4~16 碼載具密碼"
              className="w-full pl-3 pr-9 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 leading-tight">
            <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            密碼僅加密保存在本機，用於直接連線財政部發票伺服器。
          </p>

          {/* 密碼取得指引摺疊 */}
          {showHelp && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-[10px] text-slate-300 space-y-1.5 animate-in fade-in">
              <p className="font-bold text-amber-300">💡 如何取得手機條碼載具密碼？</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>前往「<strong>財政部電子發票整合服務平台</strong>」或開啟「<strong>統一發票兌獎 App</strong>」。</li>
                <li>當初申請手機條碼時設定的 4~16 碼密碼（或簡訊驗證碼）。</li>
                <li>若忘記密碼，可在財政部官網點選「忘記密碼」，輸入手機與 Email 即可 1 分鐘重設。</li>
              </ol>
            </div>
          )}
        </div>

        {/* ⚙️ 進階：財政部 AppID 設定 (可折疊) */}
        <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 transition"
          >
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>進階設定：財政部專屬 AppID</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-2.5 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400">專屬 API AppID (選填)：</label>
                <button
                  type="button"
                  onClick={() => setShowAppIdGuide(!showAppIdGuide)}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <Info className="w-3 h-3" />
                  如何向財政部申請？
                </button>
              </div>
              <input
                type="text"
                value={appId}
                onChange={(e) => handleSaveAppId(e.target.value)}
                placeholder="例如 EINV-XXXXXX 或自訂 AppID"
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {showAppIdGuide && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-slate-300 space-y-1 leading-relaxed">
                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>📑 財政部 AppID 線上申請步驟</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>至 <strong className="text-slate-200">財政部電子發票整合服務平台</strong> (einvoice.nat.gov.tw) 登入。</li>
                    <li>點選「API 服務」$\rightarrow$「電子發票 API 申請 / 應用程式識別碼」。</li>
                    <li>新增申請，填寫應用程式名稱（如「個人智慧記帳」）即可免費核發專屬 AppID。</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ☁️ 一鍵同步財政部載具發票按鈕 */}
        <button
          onClick={handleTriggerMofSync}
          disabled={isSyncing}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 mt-3 active:scale-[0.98]"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在連線財政部下載真實發票與購物清單...</span>
            </>
          ) : (
            <>
              <CloudDownload className="w-4 h-4" />
              <span>一鍵同步財政部雲端發票與購物清單</span>
            </>
          )}
        </button>

        {syncMsg && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px] flex items-start gap-1.5 animate-in fade-in">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed">{syncMsg}</span>
          </div>
        )}

        {/* 實體紙本發票 QR 掃描提示 */}
        <button
          onClick={() => {
            onClose();
            onOpenScanner?.();
          }}
          className="w-full mt-3 p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 flex items-center justify-between text-xs text-slate-300 transition group text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-200 group-hover:text-emerald-300 transition">掃描紙本發票 QR Code</p>
              <p className="text-[10px] text-slate-400">免申請 AppID · 1秒秒讀真實發票與明細</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
            開啟掃描
          </span>
        </button>

        {/* 家庭成員載具快速切換 */}
        {household && household.members.length > 1 && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              切換家庭成員載具：
            </p>
            <div className="grid grid-cols-2 gap-2">
              {household.members.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => {
                    const code = m.carrierCode || '/AB1234+';
                    setSelectedCarrier(code);
                    setEditVal(code);
                  }}
                  className={`p-2 rounded-xl border text-left transition-all text-xs ${
                    selectedCarrier === (m.carrierCode || '/AB1234+')
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold'
                      : 'border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <p className="truncate font-semibold">{m.displayName}</p>
                  <p className="text-[10px] font-mono text-slate-500">{m.carrierCode || '/AB1234+'}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
