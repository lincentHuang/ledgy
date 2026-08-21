'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Mic,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  Volume2,
  Tag,
  CreditCard,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useVoiceExpenseParser } from '../hooks/useVoiceExpenseParser';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    household,
    households,
    activeHouseholdId,
    activeLedger,
    currentTags,
    currentPaymentMethods,
    learningEngine,
    addTransaction,
  } = useAppStore();

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    activeHouseholdId || (household ? household.id : (households[0]?.id || ''))
  );

  const {
    isParsing,
    parsedResult,
    setParsedResult,
    parseError,
    parseVoice,
    resetParsedResult,
  } = useVoiceExpenseParser({
    geminiApiKey: user.geminiApiKey,
    defaultPaymentMethod: user.defaultPaymentMethod,
    currentTags,
    activeLedger,
    learningEngine,
  });

  const {
    isListening,
    transcript,
    setTranscript,
    errorMessage: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    onEnd: (finalTranscript) => {
      if (finalTranscript.trim() && !isParsing) {
        parseVoice(finalTranscript);
      }
    },
  });

  // 當 Modal 開啟時，自動同步當前帳本並啟動麥克風
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      resetParsedResult();
      setSelectedHouseholdId(
        activeHouseholdId || (household ? household.id : (households[0]?.id || ''))
      );
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [isOpen, activeLedger, activeHouseholdId, household, households, resetTranscript, resetParsedResult, startListening, stopListening]);

  const handleConfirmTransaction = () => {
    if (!parsedResult || !parsedResult.amount) return;

    const singleTag =
      parsedResult.tags && parsedResult.tags.length > 0 ? [parsedResult.tags[0]] : ['未歸類'];

    if (parsedResult.title) {
      learningEngine.recordUserCorrection(
        parsedResult.title,
        parsedResult.merchant,
        parsedResult.categoryId,
        parsedResult.categoryName,
        parsedResult.subCategory,
        singleTag,
        user.uid || 'user_tw_01',
        parsedResult.ledgerType === 'household' ? (selectedHouseholdId || household?.id) : undefined
      );
    }

    addTransaction({
      userId: user.uid || 'user_tw_01',
      householdId:
        parsedResult.ledgerType === 'household' ? (selectedHouseholdId || household?.id) : undefined,
      title: parsedResult.title,
      amount: Number(parsedResult.amount),
      type: 'expense',
      ledgerType: parsedResult.ledgerType,
      categoryId: parsedResult.categoryId,
      categoryName: parsedResult.categoryName,
      subCategory: parsedResult.subCategory,
      paymentMethod: parsedResult.paymentMethod,
      date: new Date().toISOString().split('T')[0],
      merchant: parsedResult.merchant,
      tags: singleTag,
    });

    onClose();
  };

  if (!isOpen) return null;

  const errorMessage = speechError || parseError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-5 sm:p-6 flex flex-col items-center text-center overflow-y-auto overscroll-contain">
        {/* 背景裝飾光暈 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標題 */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-white">AI 語音說話記帳</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          直接說出消費內容，AI 自動識別金額、分類與付款方式
        </p>

        {/* 麥克風核心互動按鈕 (w-16 h-16 sm:w-20 sm:h-20) */}
        <div className="relative my-2 flex items-center justify-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shadow-xl transition-all active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-600/30 ring-4 ring-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-4 ring-slate-800'
            }`}
            title={isListening ? '點擊結束錄音' : '點擊開始錄音'}
          >
            <Mic className="w-8 h-8" />
          </button>
        </div>

        {/* 語音狀態文字提示 */}
        <div className="mt-2 min-h-[40px] flex flex-col items-center justify-center w-full">
          {isListening ? (
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>正在聆聽中... 請直接說話（例：「拉麵 280 街口」）</span>
            </p>
          ) : isParsing ? (
            <p className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              AI 正在智慧結構化解析您的消費...
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              {transcript ? '已完成辨識，點擊下方確認記帳' : '點擊麥克風開始說話'}
            </p>
          )}

          {/* 即時語音文字氣泡 */}
          {transcript && (
            <div className="mt-2 px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 max-w-xs text-xs text-slate-200 font-medium">
              「{transcript}」
            </div>
          )}
        </div>

        {/* 錯誤提示 */}
        {errorMessage && (
          <p className="mt-2 text-xs text-rose-400 bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-800">
            {errorMessage}
          </p>
        )}

        {/* AI 解析完成的結構化確認預覽卡片 */}
        {parsedResult && (
          <div className="w-full mt-3 p-3.5 sm:p-4 rounded-2xl bg-slate-800/95 border border-emerald-500/30 text-left space-y-3 animate-in fade-in zoom-in-95 shadow-xl">
            {/* 標題與金額 */}
            <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2.5">
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">消費項目</label>
                <input
                  type="text"
                  value={parsedResult.title}
                  onChange={(e) => setParsedResult({ ...parsedResult, title: e.target.value })}
                  placeholder="消費項目"
                  className="w-full font-bold text-sm text-white bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400 truncate"
                />
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">金額 (NT$)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">NT$</span>
                  <input
                    type="number"
                    value={parsedResult.amount === 0 ? '' : parsedResult.amount}
                    placeholder="0"
                    onChange={(e) => setParsedResult({ ...parsedResult, amount: Number(e.target.value) || 0 })}
                    className="w-full font-extrabold text-base text-emerald-400 font-mono bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-2.5 py-1 outline-none focus:ring-1 focus:ring-emerald-400 text-right"
                  />
                </div>
              </div>
            </div>

            {/* 付款方式與歸屬標籤 (雙欄 Select 下拉選單) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>付款方式</span>
                </label>
                <select
                  value={parsedResult.paymentMethod}
                  onChange={(e) => setParsedResult({ ...parsedResult, paymentMethod: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none focus:ring-1 focus:ring-teal-400"
                >
                  {currentPaymentMethods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>歸屬標籤</span>
                </label>
                <select
                  value={parsedResult.tags?.[0] || '未歸類'}
                  onChange={(e) => setParsedResult({ ...parsedResult, tags: [e.target.value] })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {currentTags.map((t) => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 帳本歸屬 */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] font-bold text-slate-400">帳本歸屬：</span>
              <button
                type="button"
                onClick={() =>
                  setParsedResult({
                    ...parsedResult,
                    ledgerType:
                      parsedResult.ledgerType === 'household' ? 'personal' : 'household',
                  })
                }
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${
                  parsedResult.ledgerType === 'household'
                    ? 'bg-purple-950/80 border-purple-600 text-purple-300'
                    : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                }`}
                title="點擊切換個人 / 群組公帳"
              >
                {parsedResult.ledgerType === 'household' ? (
                  <>
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>群組公帳</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>個人私帳</span>
                  </>
                )}
              </button>
            </div>

            {/* 若為群組公帳且有群組清單，顯示選擇群組的 Select 下拉選單 */}
            {parsedResult.ledgerType === 'household' && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-950/40 border border-purple-800/60 animate-in fade-in">
                <Users className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-purple-300 flex-shrink-0">入帳群組：</span>
                {households.length > 0 ? (
                  <select
                    value={selectedHouseholdId}
                    onChange={(e) => setSelectedHouseholdId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-purple-700/60 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-purple-400 font-bold"
                  >
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.members.length} 人)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] text-slate-400">尚未加入群組 (將以預設公帳儲存)</span>
                )}
              </div>
            )}

            {/* 確認與重錄按鈕 */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetTranscript();
                  resetParsedResult();
                  startListening();
                }}
                className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0"
                title="重說一次"
                aria-label="重說一次"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                className="h-10"
                onClick={handleConfirmTransaction}
                leftIcon={<Check className="w-4 h-4" />}
              >
                確認
              </Button>
            </div>
          </div>
        )}

        {/* 示範常用指令例句 */}
        {!parsedResult && !isParsing && (
          <div className="mt-3 pt-3 border-t border-slate-800 w-full text-left space-y-2">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>您可以這樣說：</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setTranscript('吃麥當勞大麥克套餐 160 LINE Pay');
                  parseVoice('吃麥當勞大麥克套餐 160 LINE Pay');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「吃麥當勞大麥克 160 LINE Pay」
              </button>
              <button
                onClick={() => {
                  setTranscript('全聯買日用品 520 算家庭公帳');
                  parseVoice('全聯買日用品 520 算家庭公帳');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「全聯買日用品 520 算家庭公帳」
              </button>
              <button
                onClick={() => {
                  setTranscript('50嵐珍奶 60 現金');
                  parseVoice('50嵐珍奶 60 現金');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「50嵐珍奶 60 現金」
              </button>
              <button
                onClick={() => {
                  setTranscript('中油加油 150 信用卡');
                  parseVoice('中油加油 150 信用卡');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「中油加油 150 信用卡」
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
