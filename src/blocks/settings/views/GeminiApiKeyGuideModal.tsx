'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Lock,
  ArrowRight,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  GEMINI_KEY_REGEX,
  maskApiKey,
  validateGeminiKeyDirectly,
  ValidateApiKeyResponseDto,
} from '@/lib/shared/types/geminiKey';

export interface GeminiApiKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey?: string;
  onSaveKey: (newApiKey: string) => Promise<void> | void;
}

export const GeminiApiKeyGuideModal: React.FC<GeminiApiKeyGuideModalProps> = ({
  isOpen,
  onClose,
  currentApiKey = '',
  onSaveKey,
}) => {
  const [mounted, setMounted] = useState(false);
  const [inputKey, setInputKey] = useState(currentApiKey);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateApiKeyResponseDto | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const titleId = useId();
  const descriptionId = useId();

  // 同步外部傳入的 currentApiKey
  useEffect(() => {
    if (isOpen) {
      setInputKey(currentApiKey);
      setValidationResult(
        currentApiKey && GEMINI_KEY_REGEX.test(currentApiKey)
          ? { valid: true, maskedKey: maskApiKey(currentApiKey), message: '已設定個人 API Key' }
          : null
      );
    }
  }, [isOpen, currentApiKey]);

  // 鍵盤 Esc 關閉支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isValidating && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isValidating, isSaving, onClose]);

  // 前端即時 Regex 格式檢查
  const isFormatValid = GEMINI_KEY_REGEX.test(inputKey.trim());
  const isInputEmpty = !inputKey.trim();

  // 呼叫 API 進行輕量 Ping Test 驗證
  const handleValidateAndSave = useCallback(async () => {
    const trimmedKey = inputKey.trim();
    if (!trimmedKey) {
      setValidationResult({
        valid: false,
        errorCode: 'INVALID_FORMAT',
        message: '請輸入 Google Gemini API Key',
      });
      return;
    }

    if (!GEMINI_KEY_REGEX.test(trimmedKey)) {
      setValidationResult({
        valid: false,
        errorCode: 'INVALID_FORMAT',
        message: '格式不符：請輸入有效的 Google Gemini API Key（支援 AQ. 或 AIzaSy 格式）',
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // 1. 直連 Google 官方端點探針測試（相容 Localhost、Firebase Hosting 靜態匯出與離線 App）
      const data = await validateGeminiKeyDirectly(trimmedKey);
      setValidationResult(data);

      if (data.valid) {
        setIsSaving(true);
        await onSaveKey(trimmedKey);
        setIsSaving(false);
        // 延遲 1.2 秒讓用戶看見成功反饋後自動關閉
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errorCode: 'NETWORK_ERROR',
        message: '無法完成連線測試，請確認您的網路環境',
      });
    } finally {
      setIsValidating(false);
    }
  }, [inputKey, onSaveKey, onClose]);

  // 一鍵貼上
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputKey(text.trim());
        setValidationResult(null);
      }
    } catch {
      // 瀏覽器可能未授權剪貼簿讀取，略過
    }
  };

  // 一鍵複製已填寫的金鑰
  const handleCopy = () => {
    if (!inputKey) return;
    navigator.clipboard.writeText(inputKey.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 清除金鑰
  const handleClear = async () => {
    setInputKey('');
    setValidationResult(null);
    await onSaveKey('');
  };

  if (!isOpen || !mounted) return null;

  const FAQ_ITEMS = [
    {
      q: '取得與使用 Google Gemini API 需要收費嗎？',
      a: '完全免費！Google AI Studio 提供充足的免費層級（Free Tier），每日可享高達數百次的語音多品項辨識與財務問答配額，且申辦過程「完全不需填寫信用卡」。',
    },
    {
      q: '為什麼建議使用個人 @gmail.com 帳號？',
      a: '部分公司或學校的 Google Workspace 企業帳號，管理員可能會預設關閉「Google Cloud / AI Studio」存取權限。使用一般個人 Gmail 可秒通申請。',
    },
    {
      q: '我的 API Key 存在這裡安全嗎？',
      a: '絕對安全！智帳君採用 BYOK（Bring Your Own Key）原則，金鑰僅加密保存在您的本地裝置中，直接向 Google 官方伺服器發送請求，絕不挪作他用。',
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isValidating && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部光暈裝飾 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 pb-4 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white flex-shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-extrabold text-emerald-400 mb-1">
                <Sparkles className="w-3 h-3" />
                BYOK 專屬免費獨立配額
              </div>
              <h2 id={titleId} className="text-base sm:text-lg font-black text-white tracking-tight">
                Google Gemini API Key 取得與驗證
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isValidating || isSaving}
            aria-label="關閉視窗"
            className="p-1.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain text-xs relative z-10">
          {/* 帳號權限重要提醒 (Edge Case 1 Alert) */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-amber-300 text-xs">推薦使用個人 Gmail 帳號</h4>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                學校（.edu）或企業公司帳號可能被管理者關閉 AI 存取權限。建議切換至個人 <span className="font-mono font-bold text-amber-100">@gmail.com</span> 帳號即可順暢申請。
              </p>
            </div>
          </div>

          {/* 4 步驟圖文導引 */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs text-slate-300 flex items-center justify-between">
              <span>📌 3 分鐘快速取得步驟</span>
              <span className="text-[11px] font-normal text-slate-400">免填信用卡 • 即開即用</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Step 1 */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                    前往 AI Studio
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    開啟 Google AI Studio 官方金鑰專區並登入個人 Google 帳號。
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/30 transition active:scale-95 text-[11px]"
                >
                  前往 Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-400">
                  <span className="w-4 h-4 rounded-full bg-teal-500/20 flex items-center justify-center text-[10px]">2</span>
                  建立 API 金鑰
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  點擊藍色 <span className="font-bold text-slate-200">「Create API key」</span> 按鈕，並選擇 <span className="font-bold text-slate-200">「Create in new project」</span>。
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-400">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">3</span>
                  複製金鑰字串
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  點擊複製以 <span className="font-mono font-bold text-slate-200">AQ.</span> 或 <span className="font-mono font-bold text-slate-200">AIzaSy...</span> 開頭的金鑰字串。
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-400">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">4</span>
                  貼回並驗證
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  貼入下方輸入框，點擊「驗證並儲存」，系統將自動探測連線狀態。
                </p>
              </div>
            </div>
          </div>

          {/* API Key 填寫與驗證區 */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="gemini-api-key-input" className="font-bold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                填寫您的 Google Gemini API Key
              </label>

              {/* 格式狀態指示器 */}
              {!isInputEmpty && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isFormatValid
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border-rose-800'
                  }`}
                >
                  {isFormatValid ? '✓ 格式正確' : '⚠️ 格式未符'}
                </span>
              )}
            </div>

            {/* Input Wrapper */}
            <div className="relative flex items-center">
              <input
                id="gemini-api-key-input"
                type={showPassword ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setValidationResult(null);
                }}
                placeholder="貼上 AQ. 或 AIzaSy 開頭的金鑰..."
                disabled={isValidating || isSaving}
                className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-white font-mono text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500 outline-none transition disabled:opacity-50"
              />

              {/* 內部操作按鈕群 */}
              <div className="absolute right-2 flex items-center gap-1 text-slate-400">
                {isInputEmpty ? (
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition active:scale-95"
                    title="從剪貼簿貼上"
                  >
                    貼上
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800 transition"
                      title={showPassword ? '隱藏金鑰' : '顯示金鑰'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800 transition"
                      title="複製金鑰"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 驗證反饋提示卡 (State Matrix: Success / Error) */}
            {validationResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 text-xs ${
                  validationResult.valid
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{validationResult.message}</span>
                    {validationResult.maskedKey && (
                      <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                        {validationResult.maskedKey}
                      </span>
                    )}
                  </div>
                  {!validationResult.valid && (
                    <p className="text-[11px] text-rose-300/80">
                      請檢查是否完整複製金鑰字串，或確認該 Google 專案已開通 Gemini API。
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 常見問題 FAQ 折疊區 */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <h4 className="font-bold text-xs text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              常見問題 FAQ
            </h4>

            <div className="space-y-1.5">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="rounded-xl bg-slate-950/40 border border-slate-800/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between gap-2 font-bold text-slate-300 hover:text-white transition"
                    >
                      <span className="text-[11px]">{item.q}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-2.5 pt-0.5 text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/40 animate-in fade-in">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>本地加密保存，安全無虞</span>
          </div>

          <div className="flex items-center gap-2">
            {currentApiKey && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isValidating || isSaving}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition text-xs font-bold active:scale-95 disabled:opacity-40"
              >
                清除金鑰
              </button>
            )}

            <button
              type="button"
              onClick={handleValidateAndSave}
              disabled={isValidating || isSaving || isInputEmpty}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  連線探測驗證中...
                </>
              ) : isSaving ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  儲存成功！
                </>
              ) : (
                <>
                  <span>驗證並儲存</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
