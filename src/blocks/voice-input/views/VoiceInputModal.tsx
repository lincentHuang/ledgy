'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Mic,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  Tag,
  CreditCard,
  Users,
  Wallet,
  Trash2,
  Layers,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from '@/components';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useVoiceExpenseParser } from '../hooks/useVoiceExpenseParser';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { AudioVisualizerBackground } from './AudioVisualizerBackground';

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
    activeHouseholdId || (household ? household.id : households[0]?.id || '')
  );

  const {
    isParsing,
    parsedResults,
    updateItem,
    removeItem,
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
    interimText,
    setTranscript,
    errorMessage: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    autoStopDelay: 2200,
    onEnd: (finalTranscript) => {
      if (finalTranscript.trim() && !isParsing) {
        parseVoice(finalTranscript);
      }
    },
  });

  // 超低延遲 (<100ms) 麥克風音量與即時說話偵測
  const {
    volume,
    isSpeaking,
    frequencyData,
    restart: restartAudioMonitor,
    stop: stopAudioMonitor,
  } = useAudioVisualizer({
    active: isOpen && isListening,
    threshold: 0.03,
  });

  // 當 Modal 開啟時，零延遲自動啟動收音與音訊偵測
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      resetParsedResult();
      setSelectedHouseholdId(
        activeHouseholdId || (household ? household.id : households[0]?.id || '')
      );
      startListening();
    } else {
      stopListening();
      stopAudioMonitor();
    }
  }, [
    isOpen,
    activeLedger,
    activeHouseholdId,
    household,
    households,
    resetTranscript,
    resetParsedResult,
    startListening,
    stopListening,
    stopAudioMonitor,
  ]);

  // 計算所有辨識品項的總金額
  const totalAmount = useMemo(() => {
    return parsedResults.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [parsedResults]);

  // 確認儲存所有記帳項目
  const handleConfirmAllTransactions = () => {
    if (parsedResults.length === 0) return;

    parsedResults.forEach((item) => {
      if (!item.amount && !item.title) return;

      const singleTag = item.tags && item.tags.length > 0 ? [item.tags[0]] : ['未歸類'];

      addTransaction({
        userId: user.uid || 'user_tw_01',
        householdId:
          item.ledgerType === 'household'
            ? selectedHouseholdId || household?.id
            : undefined,
        title: item.title || '消費項目',
        amount: Number(item.amount) || 0,
        type: 'expense',
        ledgerType: item.ledgerType,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        subCategory: item.subCategory,
        paymentMethod: item.paymentMethod,
        date: new Date().toISOString().split('T')[0],
        merchant: item.merchant,
        tags: singleTag,
      });
    });

    onClose();
  };

  if (!isOpen) return null;

  const errorMessage = speechError || parseError;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col justify-between bg-slate-950/95 text-slate-100 backdrop-blur-2xl animate-in fade-in duration-200 overflow-hidden select-none">
      {/* 隨聲音跳動的全畫面動態視覺背景 (Dancing Audio-Reactive Background) */}
      <AudioVisualizerBackground
        isListening={isListening}
        volume={volume}
        isSpeaking={isSpeaking}
        frequencyData={frequencyData}
      />

      {/* 頂部導航列 (Top Navigation Header) */}
      <header className="relative z-10 w-full px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between border-b border-slate-800/40 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                智帳君 AI 語音說話記帳
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                <Zap className="w-3 h-3 text-emerald-400" />
                &lt;100ms 即時感應
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              說出消費內容，AI 智慧辨識金額、分類與標籤（支援多筆自動拆分）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 當前帳本模式標籤 */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition ${
              activeLedger === 'household'
                ? 'bg-purple-950/60 border-purple-600/50 text-purple-300'
                : 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
            }`}
          >
            {activeLedger === 'household' ? (
              <>
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>預設群組公帳</span>
              </>
            ) : (
              <>
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>預設個人私帳</span>
              </>
            )}
          </div>

          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95 shadow-md"
            aria-label="關閉語音記帳"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 中間主要互動與視覺區 (Main Content Area) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full overflow-y-auto overscroll-contain py-4">
        {/* 未解析時的大型動態收音視覺舞台 */}
        {parsedResults.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center my-auto w-full">
            {/* 核心動態麥克風按鈕與多重隨音波擴散光環 */}
            <div className="relative my-4 flex items-center justify-center">
              {/* 外圈音量響應波紋 (<100ms 隨聲音起舞) */}
              {isListening && (
                <>
                  <div
                    className="absolute rounded-full bg-emerald-500/20 pointer-events-none transition-all duration-75 ease-out"
                    style={{
                      width: `${140 + volume * 160}px`,
                      height: `${140 + volume * 160}px`,
                      opacity: isSpeaking ? 0.6 + volume * 0.4 : 0.2,
                    }}
                  />
                  <div
                    className="absolute rounded-full bg-teal-400/25 pointer-events-none transition-all duration-100 ease-out"
                    style={{
                      width: `${110 + volume * 90}px`,
                      height: `${110 + volume * 90}px`,
                      opacity: isSpeaking ? 0.7 + volume * 0.3 : 0.3,
                    }}
                  />
                  {isSpeaking && (
                    <div className="absolute w-28 h-28 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                  )}
                </>
              )}

              {/* 核心麥克風按鈕 */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-150 active:scale-90 ${
                  isListening
                    ? isSpeaking
                      ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-rose-600/50 ring-8 ring-rose-500/30 scale-105'
                      : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-emerald-600/40 ring-8 ring-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 shadow-slate-900/60 ring-8 ring-slate-800/50'
                }`}
                title={isListening ? '點擊結束錄音並開始辨識' : '點擊開始錄音'}
              >
                <Mic
                  className={`w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-100 ${
                    isSpeaking ? 'scale-110' : ''
                  }`}
                />
              </button>
            </div>

            {/* 即時語音狀態指示徽章 (<100ms 即時反饋) */}
            <div className="mt-4 flex flex-col items-center justify-center">
              {isListening ? (
                isSpeaking ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-950/50 animate-pulse">
                    <Activity className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>⚡ 偵測到聲音，即時聆聽辨識中...</span>
                    {/* 即時音量波形動態跳動條 */}
                    <div className="flex items-center gap-0.5 ml-1 h-3.5">
                      <span
                        className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, volume * 14)}px` }}
                      />
                      <span
                        className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, volume * 18)}px` }}
                      />
                      <span
                        className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, volume * 12)}px` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span>正在聆聽中，請直接說話...（說完自動解析）</span>
                  </div>
                )
              ) : isParsing ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/50 text-teal-300 font-bold text-xs sm:text-sm shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400 shrink-0" />
                  <span>AI 正在智慧結構化解析消費明細...</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 text-xs sm:text-sm">
                  <span>點擊麥克風開始說話</span>
                </div>
              )}
            </div>

            {/* 即時辨識字幕氣泡 (Live Transcript Stream) */}
            <div className="mt-5 w-full max-w-lg min-h-[72px] flex items-center justify-center">
              {transcript ? (
                <div className="w-full px-5 py-3 rounded-3xl bg-slate-900/90 border border-emerald-500/50 text-emerald-300 font-extrabold text-sm sm:text-base shadow-2xl shadow-emerald-950/40 backdrop-blur-xl animate-in zoom-in-95 leading-relaxed text-center break-words">
                  <span>「{transcript}」</span>
                  {isListening && (
                    <span className="inline-block w-2 h-4 ml-1.5 bg-emerald-400 animate-pulse align-middle rounded-sm" />
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-400/80 font-medium">
                  {isListening
                    ? '請開口說話，文字將在說出當下即時出現...'
                    : '點擊中央按鈕開始說話記帳'}
                </p>
              )}
            </div>

            {/* 錯誤提示 */}
            {errorMessage && (
              <div className="mt-3 text-xs sm:text-sm text-rose-300 bg-rose-950/70 px-4 py-2 rounded-2xl border border-rose-700/80 max-w-md shadow-lg">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* AI 解析完成的結構化確認預覽 (全畫面流暢列表與快速調整) */}
        {parsedResults.length > 0 && (
          <div className="w-full max-w-2xl my-auto space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            {/* 標頭資訊：多筆提示與合計金額 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-950/70 border border-emerald-600/50 rounded-2xl text-xs sm:text-sm shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-300 font-extrabold">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>
                  {parsedResults.length > 1
                    ? `已自動拆分為 ${parsedResults.length} 筆記帳`
                    : '已完成 1 筆消費解析'}
                </span>
              </div>
              <div className="text-slate-300 font-medium">
                合計：
                <span className="font-black font-mono text-emerald-400 text-base sm:text-lg ml-1">
                  NT$ {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 記帳卡片滾動列表 */}
            <div className="space-y-3 max-h-[52vh] sm:max-h-[56vh] overflow-y-auto pr-1">
              {parsedResults.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="w-full p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-left space-y-3 shadow-2xl backdrop-blur-xl relative transition hover:border-emerald-500/50"
                >
                  {/* 項目序號與刪除按鈕 */}
                  {parsedResults.length > 1 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-emerald-900/70 text-emerald-300 border border-emerald-700/60">
                        品項 #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-slate-800 transition"
                        title="刪除此筆記帳"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* 標題與金額 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        消費項目
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="消費項目"
                        className="w-full font-bold text-sm text-white bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-emerald-400 truncate"
                      />
                    </div>
                    <div className="w-32 sm:w-36 shrink-0">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        金額 (NT$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                          NT$
                        </span>
                        <input
                          type="number"
                          value={item.amount === 0 ? '' : item.amount}
                          placeholder="0"
                          onChange={(e) =>
                            updateItem(idx, { amount: Number(e.target.value) || 0 })
                          }
                          className="w-full font-extrabold text-base text-emerald-400 font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-400 text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 付款方式與歸屬標籤 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>付款方式</span>
                      </label>
                      <select
                        value={item.paymentMethod}
                        onChange={(e) => updateItem(idx, { paymentMethod: e.target.value })}
                        className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium outline-none focus:ring-2 focus:ring-teal-400"
                      >
                        {currentPaymentMethods.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                        <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>歸屬標籤</span>
                      </label>
                      <select
                        value={item.tags?.[0] || '未歸類'}
                        onChange={(e) => updateItem(idx, { tags: [e.target.value] })}
                        className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {currentTags.map((t) => (
                          <option key={t} value={t}>
                            #{t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 帳本歸屬切換 */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[11px] font-bold text-slate-400">帳本歸屬：</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(idx, {
                          ledgerType: item.ledgerType === 'household' ? 'personal' : 'household',
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        item.ledgerType === 'household'
                          ? 'bg-purple-950/80 border-purple-600 text-purple-300 hover:bg-purple-900/80'
                          : 'bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                      }`}
                      title="點擊切換個人私帳 / 群組公帳"
                    >
                      {item.ledgerType === 'household' ? (
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
                </div>
              ))}
            </div>

            {/* 若有項目為公帳且有群組清單，顯示入帳群組下拉選單 */}
            {parsedResults.some((it) => it.ledgerType === 'household') && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-950/50 border border-purple-700/60 text-left">
                <Users className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold text-purple-300 shrink-0">公帳入帳群組：</span>
                {households.length > 0 ? (
                  <select
                    value={selectedHouseholdId}
                    onChange={(e) => setSelectedHouseholdId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-purple-600/60 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-purple-400 font-bold"
                  >
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.members.length} 人)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-400">預設群組公帳</span>
                )}
              </div>
            )}

            {/* 確認與重錄按鈕列 */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetTranscript();
                  resetParsedResult();
                  startListening();
                }}
                className="h-12 w-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 shadow-lg"
                title="重說一次"
                aria-label="重說一次"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                className="h-12 font-black text-sm sm:text-base shadow-xl shadow-emerald-950/50 rounded-2xl"
                onClick={handleConfirmAllTransactions}
                leftIcon={<Check className="w-5 h-5" />}
              >
                {parsedResults.length > 1
                  ? `確認新增全部 ${parsedResults.length} 筆記帳 (NT$ ${totalAmount.toLocaleString()})`
                  : `確認記帳 (NT$ ${totalAmount.toLocaleString()})`}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* 底部常用指令提示區 (Bottom Quick Tips / Suggestions) */}
      {parsedResults.length === 0 && !isParsing && (
        <footer className="relative z-10 w-full px-4 sm:px-8 py-4 border-t border-slate-800/40 bg-slate-950/50 backdrop-blur-md">
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>您可以這樣說（支援單筆或多筆連續記帳）：</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTranscript('排骨便當 120 元 珍奶 60 元');
                  parseVoice('排骨便當 120 元 珍奶 60 元');
                }}
                className="text-[11px] sm:text-xs bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 font-semibold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md"
              >
                ⚡「排骨便當 120 元 珍奶 60 元」
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranscript('吃麥當勞大麥克套餐 160 LINE Pay');
                  parseVoice('吃麥當勞大麥克套餐 160 LINE Pay');
                }}
                className="text-[11px] sm:text-xs bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md"
              >
                「吃麥當勞大麥克 160 LINE Pay」
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranscript('全聯買日用品 520 算家庭公帳 買咖啡 85');
                  parseVoice('全聯買日用品 520 算家庭公帳 買咖啡 85');
                }}
                className="text-[11px] sm:text-xs bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-purple-300 font-semibold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md"
              >
                ⚡「全聯買菜 520 算公帳 買咖啡 85」
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranscript('中油加油 150 信用卡 早餐 65 現金');
                  parseVoice('中油加油 150 信用卡 早餐 65 現金');
                }}
                className="text-[11px] sm:text-xs bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-teal-300 font-semibold px-3 py-1.5 rounded-xl transition active:scale-95 shadow-md"
              >
                ⚡「中油加油 150 信用卡 早餐 65 現金」
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
