'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Activity,
  Keyboard,
  Plus,
} from 'lucide-react';
import { Button } from '@/components';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useVoiceExpenseParser } from '../hooks/useVoiceExpenseParser';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { AudioVisualizerBackground } from './AudioVisualizerBackground';

export interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'voice' | 'manual';
  onSwitchToManualInput?: () => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'voice',
}) => {
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

  const [mode, setMode] = useState<'voice' | 'manual'>(initialMode);
  const [manualInputText, setManualInputText] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    activeHouseholdId || (household ? household.id : households[0]?.id || '')
  );

  const {
    isParsing,
    parsedResults,
    setParsedResults,
    updateItem,
    removeItem,
    parseError,
    parseVoice,
    parseAudio,
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
    getLatestTranscript,
  } = useSpeechRecognition({
    autoStopDelay: 2200,
    onEnd: (finalTranscript) => {
      if (!isParsing) {
        handleProcessVoiceOrAudio(finalTranscript);
      }
    },
  });

  // 超低延遲 (<100ms) 麥克風音量與即時說話偵測 + 僅在真正聆聽時開啟硬體麥克風
  const {
    volume,
    isSpeaking,
    sharedStateRef,
    stop: stopAudioMonitor,
    getRecordedAudioBase64,
  } = useAudioVisualizer({
    active: isOpen && mode === 'voice' && isListening,
    threshold: 0.03,
  });

  const handleProcessVoiceOrAudio = useCallback(
    async (text?: string) => {
      const latestText = getLatestTranscript();
      const speechText = (text !== undefined ? text : latestText || transcript).trim();
      if (speechText) {
        parseVoice(speechText);
        return;
      }

      // 若完全無文字，檢查是否有有效長度的錄音資料
      try {
        const audioData = await getRecordedAudioBase64();
        if (audioData && audioData.base64 && audioData.base64.length > 2500) {
          const recognizedText = await parseAudio(audioData.base64, audioData.mimeType);
          if (recognizedText) {
            setTranscript(recognizedText);
          }
        } else {
          // 未偵測到有效聲音，乾淨重設，不空轉進入漫長 AI 等待
          resetTranscript();
        }
      } catch (e) {
        console.warn('Audio fallback error:', e);
        resetTranscript();
      }
    },
    [getLatestTranscript, transcript, parseVoice, parseAudio, getRecordedAudioBase64, resetTranscript, setTranscript]
  );

  // 當 Modal 開啟時，初始化狀態 (零阻塞非同步啟動)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setManualInputText('');
      resetTranscript();
      resetParsedResult();
      setSelectedHouseholdId(
        activeHouseholdId || (household ? household.id : households[0]?.id || '')
      );

      if (initialMode === 'voice') {
        startListening();
      }
    } else {
      stopListening();
      stopAudioMonitor();
    }
  }, [
    isOpen,
    initialMode,
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

  // 手動點擊麥克風開關切換 (即時結算，0ms 卡頓)
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      const currentText = getLatestTranscript();
      stopListening();
      stopAudioMonitor();
      if (currentText && currentText.trim()) {
        parseVoice(currentText.trim());
      } else {
        handleProcessVoiceOrAudio();
      }
    } else {
      resetTranscript();
      resetParsedResult();
      startListening();
    }
  }, [
    isListening,
    getLatestTranscript,
    stopListening,
    stopAudioMonitor,
    parseVoice,
    handleProcessVoiceOrAudio,
    resetTranscript,
    resetParsedResult,
    startListening,
  ]);

  // 切換至手動輸入模式 (即時關閉麥克風硬體)
  const handleSwitchToManual = useCallback(() => {
    setMode('manual');
    stopListening();
    stopAudioMonitor();
  }, [stopListening, stopAudioMonitor]);

  // 切換至語音模式 (即時響應)
  const handleSwitchToVoice = useCallback(() => {
    setMode('voice');
    resetTranscript();
    resetParsedResult();
    startListening();
  }, [resetTranscript, resetParsedResult, startListening]);

  // 手動送出文字解析
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInputText.trim() || isParsing) return;
    parseVoice(manualInputText.trim());
  };

  // 直接新增一筆空白明細卡片
  const handleAddNewItem = useCallback(() => {
    setParsedResults((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        amount: 0,
        categoryId: 'food_dining',
        categoryName: '餐飲美食',
        paymentMethod: user.defaultPaymentMethod || '現金',
        tags: currentTags.length > 0 ? [currentTags[0]] : ['未歸類'],
        ledgerType: activeLedger || 'personal',
        confidence: 1,
      },
    ]);
  }, [setParsedResults, user.defaultPaymentMethod, currentTags, activeLedger]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      {/* 電腦版置中卡片 + 手機版全螢幕自適應容器 */}
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg rounded-none sm:rounded-3xl bg-slate-950/95 text-slate-100 shadow-2xl border-0 sm:border sm:border-slate-800/80 flex flex-col justify-between overflow-hidden backdrop-blur-2xl">
        {/* 隨聲音跳動的動態視覺背景 (Dancing Audio-Reactive Background - 60fps Native Loop) */}
        <AudioVisualizerBackground
          isListening={isListening && mode === 'voice'}
          sharedStateRef={sharedStateRef}
        />

        {/* 1. 頂部簡潔標題列 (Fixed Header) */}
        <header className="shrink-0 z-20 w-full px-5 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
              {mode === 'voice' ? '語音記帳' : '快速記帳'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 模式切換小按鈕 */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={handleSwitchToVoice}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${mode === 'voice'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>語音</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToManual}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${mode === 'manual'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>手動</span>
              </button>
            </div>

            {/* 關閉按鈕 */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95 shadow-md"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 2. 中間滾動內容區 (Scrollable Main Content Area) */}
        <main className="relative z-10 flex-1 overflow-y-auto min-h-0 w-full px-4 py-4 flex flex-col items-center justify-between">
          {/* 未解析完成時的動態輸入舞台 (依模式顯示語音收音或手動打字) */}
          {parsedResults.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-auto">
              {mode === 'voice' ? (
                /* 🎙️ 語音模式 (Voice Mode) */
                <>
                  {/* 核心動態麥克風按鈕與音波光環 */}
                  <div className="relative my-6 flex items-center justify-center">
                    {isListening && (
                      <>
                        <div
                          className="absolute rounded-full bg-emerald-500/20 pointer-events-none transition-all duration-75 ease-out"
                          style={{
                            width: `${130 + volume * 140}px`,
                            height: `${130 + volume * 140}px`,
                            opacity: isSpeaking ? 0.6 + volume * 0.4 : 0.18,
                          }}
                        />
                        <div
                          className="absolute rounded-full bg-teal-400/25 pointer-events-none transition-all duration-100 ease-out"
                          style={{
                            width: `${105 + volume * 80}px`,
                            height: `${105 + volume * 80}px`,
                            opacity: isSpeaking ? 0.7 + volume * 0.3 : 0.25,
                          }}
                        />
                        {isSpeaking && (
                          <div className="absolute w-24 h-24 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                        )}
                      </>
                    )}

                    {/* 麥克風核心按鈕 */}
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-150 active:scale-90 ${isListening
                          ? isSpeaking
                            ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-rose-600/50 ring-6 ring-rose-500/30 scale-105'
                            : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-emerald-600/40 ring-6 ring-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 shadow-slate-900/60 ring-6 ring-slate-800/50'
                        }`}
                      title={isListening ? '點擊結束錄音並開始辨識' : '點擊開始錄音'}
                    >
                      <Mic
                        className={`w-9 h-9 sm:w-10 sm:h-10 transition-transform duration-100 ${isSpeaking ? 'scale-110' : ''
                          }`}
                      />
                    </button>
                  </div>

                  {/* 即時語音狀態指示 */}
                  <div className="flex flex-col items-center justify-center">
                    {isListening ? (
                      isSpeaking ? (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 font-bold text-xs shadow-lg shadow-rose-950/50 animate-pulse">
                          <Activity className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>⚡ 偵測到聲音，辨識中...</span>
                          <div className="flex items-center gap-0.5 ml-1 h-3">
                            <span
                              className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(4, volume * 12)}px` }}
                            />
                            <span
                              className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(4, volume * 15)}px` }}
                            />
                            <span
                              className="w-1 bg-rose-400 rounded-full transition-all duration-75"
                              style={{ height: `${Math.max(4, volume * 10)}px` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-medium text-xs shadow-lg shadow-emerald-950/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          <span>聆聽中，請說出消費內容...</span>
                        </div>
                      )
                    ) : isParsing ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/50 text-teal-300 font-bold text-xs shadow-lg">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400 shrink-0" />
                        <span>AI 正在智慧解析消費明細...</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 text-xs">
                        <span>點擊麥克風開始說話</span>
                      </div>
                    )}
                  </div>

                  {/* 即時辨識文字氣泡 */}
                  <div className="mt-4 w-full max-w-md min-h-[64px] flex items-center justify-center">
                    {transcript ? (
                      <div className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 font-bold text-sm shadow-xl backdrop-blur-xl animate-in zoom-in-95 text-center break-words">
                        <span>「{transcript}」</span>
                        {isListening && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400/80 font-medium">
                        {isListening ? '請開口說話，文字將即時逐字出現' : ''}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* ⌨️ 手動輸入模式 (Manual Mode) */
                <div className="w-full max-w-md space-y-4 my-auto">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>自然語言 AI 智慧打字記帳</span>
                  </div>

                  <form onSubmit={handleManualSubmit} className="relative w-full">
                    <input
                      type="text"
                      value={manualInputText}
                      onChange={(e) => setManualInputText(e.target.value)}
                      placeholder="輸入如「排骨便當 120 珍奶 60 LINE Pay」..."
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3.5 pr-24 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner font-medium"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualInputText.trim() || isParsing}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      {isParsing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>AI 解析</span>
                    </button>
                  </form>
                </div>
              )}

              {/* 錯誤提示 */}
              {errorMessage && (
                <div className="mt-3 text-xs text-rose-300 bg-rose-950/70 px-3.5 py-1.5 rounded-xl border border-rose-700/80 max-w-md shadow-lg">
                  {errorMessage}
                </div>
              )}

              {/* 下方單一範例引導與模式切換按鈕 */}
              {!isParsing && (
                <div className="mt-8 flex flex-col items-center gap-3 w-full">
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>您可以這樣記（單筆或多筆自動拆分）：</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (mode === 'manual') {
                          setManualInputText('排骨便當 120 元 珍奶 60 元');
                        } else {
                          setTranscript('排骨便當 120 元 珍奶 60 元');
                        }
                        parseVoice('排骨便當 120 元 珍奶 60 元');
                      }}
                      className="text-xs bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 text-emerald-300 font-medium px-4 py-2 rounded-2xl transition active:scale-95 shadow-md flex items-center gap-1.5"
                    >
                      <span>⚡「排骨便當 120 元 珍奶 60 元」</span>
                    </button>
                  </div>

                  {/* 切換手動/直接手填按鈕 */}
                  <div className="flex items-center gap-2 mt-1">
                    {mode === 'voice' ? (
                      <button
                        type="button"
                        onClick={handleSwitchToManual}
                        className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                        title="切換至手動打字記帳"
                      >
                        <Keyboard className="w-4 h-4 text-teal-400" />
                        <span>手動輸入</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSwitchToVoice}
                        className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                        title="切換至語音記帳"
                      >
                        <Mic className="w-4 h-4 text-emerald-400" />
                        <span>語音說話</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 border border-slate-700/80 shadow-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      title="直接建立空白明細表"
                    >
                      <Plus className="w-4 h-4" />
                      <span>直接手填</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 🌟 共用結構化確認列表 (手機版價格自動換至下一行，流暢滾動、不破版) */
            <div className="w-full space-y-3 pb-2 animate-in fade-in zoom-in-95 duration-200">
              {/* 標頭資訊：拆分數量與合計金額 + 加一筆按鈕 */}
              <div className="flex items-center justify-between px-4 py-2 bg-emerald-950/70 border border-emerald-600/50 rounded-2xl text-xs sm:text-sm shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>
                    {parsedResults.length > 1
                      ? `已自動拆分為 ${parsedResults.length} 筆記帳`
                      : '已完成 1 筆消費解析'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="text-slate-300 font-medium">
                    合計：
                    <span className="font-bold font-mono text-emerald-400 text-base ml-1">
                      NT$ {totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="p-1 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800 transition"
                    title="再新增一筆"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 記帳卡片清單 (手機版價格移動到下一行) */}
              <div className="space-y-3">
                {parsedResults.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="w-full p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/30 text-left space-y-2.5 shadow-xl backdrop-blur-xl relative"
                  >
                    {/* 項目序號與刪除按鈕 */}
                    {parsedResults.length > 1 && (
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                          品項 #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                          title="刪除此筆記帳"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* 標題與金額 (手機版價格移動到下一行，電腦版並排) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          消費項目
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(idx, { title: e.target.value })}
                          placeholder="消費項目"
                          className="w-full font-bold text-xs sm:text-sm text-white bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400 truncate"
                        />
                      </div>
                      <div className="w-full sm:w-32 shrink-0">
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          金額 (NT$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                            NT$
                          </span>
                          <input
                            type="number"
                            value={item.amount === 0 ? '' : item.amount}
                            placeholder="0"
                            onChange={(e) =>
                              updateItem(idx, { amount: Number(e.target.value) || 0 })
                            }
                            className="w-full font-extrabold text-sm sm:text-base text-emerald-400 font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-400 text-right"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 付款方式與歸屬標籤 */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                          <CreditCard className="w-3 h-3 text-teal-400 shrink-0" />
                          <span>付款方式</span>
                        </label>
                        <select
                          value={item.paymentMethod}
                          onChange={(e) => updateItem(idx, { paymentMethod: e.target.value })}
                          className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none focus:ring-1 focus:ring-teal-400"
                        >
                          {currentPaymentMethods.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                          <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>歸屬標籤</span>
                        </label>
                        <select
                          value={item.tags?.[0] || '未歸類'}
                          onChange={(e) => updateItem(idx, { tags: [e.target.value] })}
                          className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium outline-none focus:ring-1 focus:ring-emerald-400"
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
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">帳本歸屬：</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(idx, {
                            ledgerType: item.ledgerType === 'household' ? 'personal' : 'household',
                          })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition ${item.ledgerType === 'household'
                            ? 'bg-purple-950/80 border-purple-600 text-purple-300'
                            : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                          }`}
                      >
                        {item.ledgerType === 'household' ? (
                          <>
                            <Users className="w-3 h-3 text-purple-400" />
                            <span>群組公帳</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="w-3 h-3 text-emerald-400" />
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
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-left">
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-purple-300 shrink-0">公帳入帳群組：</span>
                  {households.length > 0 ? (
                    <select
                      value={selectedHouseholdId}
                      onChange={(e) => setSelectedHouseholdId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-purple-600/60 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-purple-400 font-bold"
                    >
                      {households.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.members.length} 人)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-400">群組公帳</span>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* 3. 底部固定操作按鈕列 (Fixed Bottom Action Bar - 永遠保持在視窗內，含手機安全邊距) */}
        {parsedResults.length > 0 && (
          <footer className="shrink-0 z-20 w-full px-4 py-3 pb-6 sm:pb-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/70 flex items-center justify-center">
            <div className="w-full flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  resetTranscript();
                  resetParsedResult();
                  setManualInputText('');
                  if (mode === 'voice') startListening();
                }}
                className="h-11 w-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 shadow-md"
                title="重填一次"
                aria-label="重填一次"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                className="h-11 flex-1 font-bold text-sm shadow-xl shadow-emerald-950/50 rounded-xl"
                onClick={handleConfirmAllTransactions}
                leftIcon={<Check className="w-4 h-4" />}
              >
                確認
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
