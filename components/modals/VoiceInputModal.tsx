'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../lib/store';
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
import { parseExpenseWithGemini } from '../../lib/geminiClient';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  classifyInvoiceItemCategory,
} from '@app/shared';
import { Button } from '../ui';

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

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    activeHouseholdId || (household ? household.id : (households[0]?.id || ''))
  );
  const [parsedResult, setParsedResult] = useState<{
    title: string;
    amount: number;
    categoryId: string;
    categoryName: string;
    subCategory?: string;
    paymentMethod: string;
    tags: string[];
    ledgerType: 'personal' | 'household';
    merchant?: string;
    confidence?: number;
    engineType?: 'local_zero_token' | 'gemini_cloud';
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'zh-TW';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage('');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          transcriptRef.current = currentTranscript;
          setTranscript(currentTranscript);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (transcriptRef.current.trim() && !isParsing) {
            handleParseVoice(transcriptRef.current);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
          if (err.error === 'not-allowed') {
            setErrorMessage('請允許瀏覽器麥克風權限以進行語音記帳。');
          } else if (err.error !== 'no-speech') {
            setErrorMessage(`語音辨識提示：${err.error}`);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 當 Modal 開啟時，自動同步當前帳本與群組，並啟動麥克風開始聆聽
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      transcriptRef.current = '';
      setParsedResult(null);
      setErrorMessage('');
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
  }, [isOpen, activeLedger, activeHouseholdId, household, households]);

  // 當語音輸入告一段落且有內容時，自動觸發 AI 解析
  useEffect(() => {
    if (!isListening && transcript.trim() && !parsedResult && !isParsing) {
      handleParseVoice(transcript);
    }
  }, [isListening, transcript]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setErrorMessage('您的瀏覽器不支援原生 Web Speech 語音辨識，請使用 Chrome 或 Safari。');
      return;
    }
    try {
      setErrorMessage('');
      recognitionRef.current.start();
    } catch {
      // already started or busy
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  /**
   * 智慧匹配當前標籤庫中的最佳單一標籤 (支援完整關鍵字、在地商家、拼音、詞彙拆解與自訂學習規則)
   */
  const matchBestTag = (
    title: string,
    rawVoiceText: string,
    candidateTags: string[] = [],
    availableTagsList: string[]
  ): string => {
    if (!availableTagsList || availableTagsList.length === 0) return '未歸類';
    const cleanTitle = (title || '').toLowerCase();
    const cleanRaw = (rawVoiceText || '').toLowerCase();

    // 1. 完全或包含比對候選標籤
    for (const pt of candidateTags) {
      if (availableTagsList.includes(pt)) return pt;
      const matched = availableTagsList.find((t) => t === pt || t.includes(pt) || pt.includes(t));
      if (matched) return matched;
    }

    // 2. 標籤名本身與子詞比對（例如標籤叫「餐飲·午餐」，拆成「午餐」、「餐飲」）
    for (const tag of availableTagsList) {
      const cleanTag = tag.toLowerCase().replace(/^[#·]/, '');
      const tokens = cleanTag.split(/[·\-_/]/).filter((tok) => tok.length >= 2);
      for (const token of tokens) {
        if (cleanTitle.includes(token) || cleanRaw.includes(token)) {
          return tag;
        }
      }
    }

    // 3. 台灣在地高頻情境分類快速比對
    // 早餐
    if (/早餐|蛋餅|蘿蔔糕|飯糰|三明治|漢堡|早點|早午餐|吐司|豆漿|厚片|油條/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /早餐/i.test(t));
      if (tag) return tag;
    }
    // 飲料 / 咖啡 / 下午茶 / 手搖飲
    if (/星巴克|路易莎|cama|咖啡|拿鐵|美式|手搖|飲料|奶茶|珍奶|珍珠奶茶|五十嵐|50嵐|麻古|清心|可不可|茶湯會|迷客夏|一沐日|甜點|蛋糕|下午茶|豆花|冰品/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /咖啡|飲料|下午茶|手搖/i.test(t));
      if (tag) return tag;
    }
    // 午餐 / 中午
    if (/午餐|中午|排骨飯|雞腿飯|便當|水餃|鍋貼|乾麵|牛肉麵|壽司|拉麵|燴飯|小吃/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /午餐/i.test(t));
      if (tag) return tag;
    }
    // 晚餐 / 宵夜 / 聚餐
    if (/晚餐|晚上|宵夜|火鍋|熱炒|燒肉|居酒屋|串燒|鹽酥雞|炸雞|鹹酥雞|夜市/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /晚餐|宵夜|聚餐/i.test(t));
      if (tag) return tag;
    }
    // 生鮮 / 超市 / 採買
    if (/全聯|家樂福|好市多|costco|愛買|大潤發|美廉社|買菜|生鮮|超市|食材|蔬菜|水果/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /生鮮|採買|超市|食材/i.test(t));
      if (tag) return tag;
    }
    // 交通 / 加油 / 停車
    if (/加油|中油|台塑|95|92|98|汽油|捷運|悠遊卡|高鐵|火車|計程車|uber|停車|過路費|機車|修車|etag/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /交通|加油|通勤|車/i.test(t));
      if (tag) return tag;
    }
    // 娛樂 / 電影 / 遊戲
    if (/電影|威秀|國賓|秀泰|netflix|disney|spotify|演唱會|唱歌|ktv|遊戲|steam|switch|ps5/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /娛樂|電影|休閒/i.test(t));
      if (tag) return tag;
    }
    // 居家 / 日用品 / 水電
    if (/水電|瓦斯|網路費|房租|管理費|衛生紙|洗衣精|日常用品|日用品/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /居家|水電|生活|日用/i.test(t));
      if (tag) return tag;
    }
    // 醫療 / 藥局
    if (/看醫生|診所|醫院|掛號|感冒|藥局|屈臣氏|康是美|保健食品|看牙/i.test(cleanRaw)) {
      const tag = availableTagsList.find((t) => /醫療|健康|藥/i.test(t));
      if (tag) return tag;
    }

    // 4. 發票分類規則庫比對 (classifyInvoiceItemCategory)
    const cat = classifyInvoiceItemCategory(cleanTitle || cleanRaw);
    for (const catTag of cat.tags) {
      const matched = availableTagsList.find((t) => t.includes(catTag) || catTag.includes(t));
      if (matched) return matched;
    }

    // 5. 大分類兜底
    if (cat.categoryId === 'food') {
      const foodTag = availableTagsList.find((t) => /餐|食|飲|飯|麵|吃|茶|咖啡/.test(t));
      if (foodTag) return foodTag;
    }
    if (cat.categoryId === 'housing') {
      const houseTag = availableTagsList.find((t) => /居|日用|家|水電|生活/.test(t));
      if (houseTag) return houseTag;
    }
    if (cat.categoryId === 'transport') {
      const transTag = availableTagsList.find((t) => /交|車|油|捷運|高鐵|計程車/.test(t));
      if (transTag) return transTag;
    }
    if (cat.categoryId === 'shopping') {
      const shopTag = availableTagsList.find((t) => /購|買|服飾|美妝|生活百貨/.test(t));
      if (shopTag) return shopTag;
    }
    if (cat.categoryId === 'entertainment') {
      const entTag = availableTagsList.find((t) => /娛|休閒|電影|展覽|玩/.test(t));
      if (entTag) return entTag;
    }

    return availableTagsList.includes('未歸類') ? '未歸類' : availableTagsList[0] || '未歸類';
  };

  const handleParseVoice = async (text: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    setErrorMessage('');

    try {
      const matchedRule = learningEngine.matchRule(text);
      const fewShotPrompt = matchedRule
        ? `若輸入類似「${matchedRule.keywordPattern}」，優先歸類至「${matchedRule.targetCategoryName}」`
        : '';

      const parsed = await parseExpenseWithGemini(
        text,
        user.geminiApiKey,
        fewShotPrompt,
        false,
        currentTags
      );

      // 判斷帳本：若語音明確提到家庭/公帳則為 household；若明確提到個人/私帳則為 personal；否則預設依據當前檢視帳本 (activeLedger)
      const isExplicitPersonal = /個人|私帳|自己/.test(text);
      const isExplicitHousehold = /家庭|公帳|公用|家裡|大家/.test(text);
      const determinedLedgerType: 'personal' | 'household' = isExplicitHousehold
        ? 'household'
        : isExplicitPersonal
        ? 'personal'
        : (parsed.ledgerType || activeLedger || 'personal');

      const cat = DEFAULT_CATEGORIES.find((c) => c.id === (matchedRule ? matchedRule.targetCategoryId : parsed.categoryId));

      // 智慧精準匹配現有標籤庫 (currentTags)
      let resolvedTag = '未歸類';
      if (
        matchedRule?.targetTags &&
        matchedRule.targetTags.length > 0 &&
        currentTags.includes(matchedRule.targetTags[0])
      ) {
        resolvedTag = matchedRule.targetTags[0];
      } else if (parsed.tags && parsed.tags.length > 0 && currentTags.includes(parsed.tags[0])) {
        resolvedTag = parsed.tags[0];
      } else {
        resolvedTag = matchBestTag(parsed.title || text, text, parsed.tags || [], currentTags);
      }

      setParsedResult({
        title: parsed.title || text,
        amount: parsed.amount || 0,
        categoryId: matchedRule ? matchedRule.targetCategoryId : parsed.categoryId,
        categoryName: cat ? cat.name : parsed.categoryId,
        subCategory: matchedRule?.targetSubCategory || parsed.subCategory,
        paymentMethod: matchedRule?.targetPaymentMethod || parsed.paymentMethod || user.defaultPaymentMethod || '現金',
        tags: [resolvedTag],
        ledgerType: determinedLedgerType,
        merchant: parsed.merchant,
        confidence: parsed.confidence,
        engineType: parsed.engineType || (matchedRule ? 'local_zero_token' : 'gemini_cloud'),
      });
    } catch (e: any) {
      setErrorMessage(e.message || 'AI 解析失敗，請再試一次。');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmTransaction = () => {
    if (!parsedResult || !parsedResult.amount) return;

    const singleTag = parsedResult.tags && parsedResult.tags.length > 0 ? [parsedResult.tags[0]] : ['未歸類'];

    // 紀錄使用者修正/確認偏好至本地自適應學習引擎
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
      householdId: parsedResult.ledgerType === 'household' ? (selectedHouseholdId || household?.id) : undefined,
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

        {/* 麥克風核心互動按鈕 */}
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
                  setTranscript('');
                  setParsedResult(null);
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
                  handleParseVoice('吃麥當勞大麥克套餐 160 LINE Pay');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「吃麥當勞大麥克 160 LINE Pay」
              </button>
              <button
                onClick={() => {
                  setTranscript('全聯買日用品 520 算家庭公帳');
                  handleParseVoice('全聯買日用品 520 算家庭公帳');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「全聯買日用品 520 算家庭公帳」
              </button>
              <button
                onClick={() => {
                  setTranscript('50嵐珍奶 60 現金');
                  handleParseVoice('50嵐珍奶 60 現金');
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition"
              >
                「50嵐珍奶 60 現金」
              </button>
              <button
                onClick={() => {
                  setTranscript('中油加油 150 信用卡');
                  handleParseVoice('中油加油 150 信用卡');
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
