'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../lib/store';
import {
  X,
  Sparkles,
  Camera,
  Check,
  Tag,
  Users,
  Wallet,
  Loader2,
  Receipt,
  CreditCard,
  Calendar,
  Trash2,
  Plus,
  QrCode,
  Layers,
} from 'lucide-react';
import { parseExpenseWithGemini, parseReceiptImageWithGemini } from '../../lib/geminiClient';
import { classifyInvoiceItemCategory, parseTaiwanInvoiceQrCode } from '@app/shared';
import { TagPill } from '../ui';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type InputMode = 'ai' | 'invoice';

interface ParsedItemEntry {
  id: string;
  title: string;
  amount: number | '';
  categoryId: string;
  categoryName: string;
  subCategory?: string;
  paymentMethod: string;
  tags: string[];
  date: string;
  merchant?: string;
  note?: string;
}

/**
 * 智慧多品項切分引擎：支援單行包含多品項（如「中午吃飯 200 晚餐吃飯 400」）、多行、標點符號等多種輸入格式
 */
function splitMultipleExpenseClauses(input: string): string[] {
  const text = input.trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const allSegments: string[] = [];

  for (const line of lines) {
    // 1. 標點符號分割 (，, ; ； 、)
    const punctParts = line.split(/[，,；;、]+/).map((p) => p.trim()).filter(Boolean);
    const punctHasMultipleWithAmount =
      punctParts.filter((p) => /[0-9零一二兩三四五六七八九十百千萬]/.test(p)).length > 1;

    if (punctParts.length > 1 && punctHasMultipleWithAmount) {
      allSegments.push(...punctParts);
      continue;
    }

    // 2. 單行多品項多金額空白邊界分割（如「中午吃飯 200 晚餐吃飯 400」）
    let tokenCounter = 0;
    const protectedTokens: { token: string; original: string }[] = [];
    const getNextToken = () => `__PROT_${tokenCounter++}__`;
    let working = line;

    // 保護在地品牌與特殊詞彙 (50嵐, 7-11 等)
    working = working.replace(/50嵐|五十嵐|85度c|85度C|85度|7-11|7-eleven|711/gi, (m) => {
      const t = getNextToken();
      protectedTokens.push({ token: t, original: m });
      return t;
    });

    // 保護數量單位與日期月份 (如 3杯, 2個, 11月)
    working = working.replace(
      /(?:[0-9]+|[一二兩三四五六七八九十百千]+)\s*(?:月份|月|號|日|年|杯|個|份|碗|包|盒|罐|瓶|顆|條|張|雙|箱|片)/g,
      (m) => {
        const t = getNextToken();
        protectedTokens.push({ token: t, original: m });
        return t;
      }
    );

    // 金額後方接著空格與新品項文字的邊界
    const splitRegex = /([0-9]+(?:\.[0-9]+)?\s*(?:元整|元|塊錢|塊|TWD)?)\s+(?=[^\s0-9元塊整TWD$])/g;
    let modified = working.replace(splitRegex, '$1\n__SPLIT__\n');

    const chineseNumSplitRegex =
      /([零一壹二兩两貳三參叁四肆五伍六陸陆七柒八捌九玖十拾百佰千仟萬]+(?:元整|元|塊錢|塊)?)\s+(?=[^\s0-9零一二兩三四五六七八九十百千萬元塊整TWD$])/g;
    modified = modified.replace(chineseNumSplitRegex, '$1\n__SPLIT__\n');

    // 還原保護 token
    for (const { token, original } of protectedTokens) {
      modified = modified.replace(new RegExp(token, 'g'), original);
    }

    const segments = modified.split(/\n__SPLIT__\n/).map((s) => s.trim()).filter(Boolean);
    if (segments.length > 1) {
      allSegments.push(...segments);
    } else {
      allSegments.push(line);
    }
  }

  return allSegments;
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    household,
    households,
    activeHouseholdId,
    activeLedger,
    currentPaymentMethods,
    currentTags,
    learningEngine,
    addTransaction,
  } = useAppStore();

  const [mode, setMode] = useState<InputMode>('ai');
  const [inputText, setInputText] = useState('中午吃飯 200');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState('');

  // Selected household
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    activeHouseholdId || (household ? household.id : (households[0]?.id || ''))
  );

  const [ledgerType, setLedgerType] = useState<'personal' | 'household'>(
    activeLedger === 'household' ? 'household' : 'personal'
  );

  // 📝 解析後的多筆或單筆項目清單
  const [parsedItems, setParsedItems] = useState<ParsedItemEntry[]>([
    {
      id: 'default_item_1',
      title: '中午吃飯',
      amount: 200,
      categoryId: 'food',
      categoryName: '飲食',
      paymentMethod: currentPaymentMethods[0] || '現金',
      tags: [currentTags[0] || '未歸類'],
      date: new Date().toISOString().split('T')[0],
    },
  ]);

  // 🍕 公帳分帳與代墊狀態
  const [splitPayerId, setSplitPayerId] = useState(user.uid || '');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'exact' | 'percentage'>('equal');
  const [splitParticipants, setSplitParticipants] = useState<string[]>([]);
  const [exactSplits, setExactSplits] = useState<Record<string, number | ''>>({});
  const [percentSplits, setPercentSplits] = useState<Record<string, number | ''>>({});

  const currentGroup = households.find((h) => h.id === selectedHouseholdId) || household;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLedgerType(activeLedger === 'household' ? 'household' : 'personal');
      const targetHId =
        activeHouseholdId || (household ? household.id : (households[0]?.id || '')) || '';
      setSelectedHouseholdId(targetHId);

      const targetH = households.find((h) => h.id === targetHId) || household;
      if (targetH) {
        setSplitPayerId(user.uid || targetH.members[0]?.userId || '');
        setSplitParticipants(targetH.members.map((m) => m.userId));
      }
    }
  }, [isOpen, activeLedger, activeHouseholdId, household, households, user.uid]);

  if (!isOpen) return null;

  /**
   * 智慧匹配當前標籤庫中的最佳單一標籤
   */
  const matchBestTag = (title: string, availableTagsList: string[]): string => {
    if (!availableTagsList || availableTagsList.length === 0) return '未歸類';
    const cleanTitle = title.toLowerCase();

    // 1. 直覺匹配標籤名稱字串
    for (const tag of availableTagsList) {
      const cleanTag = tag.toLowerCase().replace(/^[#·]/, '');
      const tokens = cleanTag.split(/[·\-_/]/).filter(Boolean);
      for (const token of tokens) {
        if (token.length >= 2 && cleanTitle.includes(token)) {
          return tag;
        }
      }
    }

    // 2. 關鍵字分類庫匹配
    const cat = classifyInvoiceItemCategory(title);
    for (const catTag of cat.tags) {
      const matched = availableTagsList.find(
        (t) => t.includes(catTag) || catTag.includes(t)
      );
      if (matched) return matched;
    }

    // 3. 大類別兜底
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

  /**
   * 批次 AI 文字解析（支援單行、多行、或複合多品項文字）
   */
  const handleAnalyzeText = async (textToParse: string) => {
    const query = textToParse.trim();
    if (!query) return;

    setIsAnalyzing(true);
    try {
      const fewShotPrompt = learningEngine.generateFewShotPrompt();
      const segments = splitMultipleExpenseClauses(query);

      const newItems: ParsedItemEntry[] = [];
      const defaultDate = new Date().toISOString().split('T')[0];
      const defaultPayment = currentPaymentMethods[0] || '現金';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const matchedRule = learningEngine.matchRule(seg);
        const parsed = await parseExpenseWithGemini(
          seg,
          user.geminiApiKey,
          fewShotPrompt,
          false,
          currentTags
        );

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
          resolvedTag = matchBestTag(parsed.title || seg, currentTags);
        }

        newItems.push({
          id: `item_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          title: parsed.title || seg,
          amount: parsed.amount || 100,
          categoryId: matchedRule?.targetCategoryId || parsed.categoryId || 'food',
          categoryName: resolvedTag,
          subCategory: parsed.subCategory,
          paymentMethod: matchedRule?.targetPaymentMethod || parsed.paymentMethod || defaultPayment,
          tags: [resolvedTag],
          date: defaultDate,
          merchant: parsed.merchant || '',
          note: parsed.note || '',
        });
      }

      if (newItems.length > 0) {
        setParsedItems(newItems);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 發票照片拍照 / 上傳 OCR 辨識 (支援全聯、超商等多品項自動分類)
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setIsAnalyzing(true);
      try {
        const ocrResult = await parseReceiptImageWithGemini(
          base64,
          file.type || 'image/jpeg',
          user.geminiApiKey
        );

        if (ocrResult) {
          const defaultDate = ocrResult.date || new Date().toISOString().split('T')[0];
          const defaultPayment = ocrResult.paymentMethod || currentPaymentMethods[0] || '現金';

          // 若發票內含多項商品，全部提取並為每項各自匹配標籤
          if (ocrResult.items && Array.isArray(ocrResult.items) && ocrResult.items.length > 0) {
            const items: ParsedItemEntry[] = ocrResult.items.map((it: any, idx: number) => {
              const bestTag = matchBestTag(it.name, currentTags);
              return {
                id: `inv_item_${Date.now()}_${idx}`,
                title: it.name,
                amount: it.amount || (it.unitPrice * (it.quantity || 1)) || 0,
                categoryId: it.categoryId || 'food',
                categoryName: bestTag,
                subCategory: it.subCategory,
                paymentMethod: defaultPayment,
                tags: [bestTag],
                date: defaultDate,
                merchant: ocrResult.merchant || '',
                note: `發票: ${ocrResult.invoiceNumber || ''} (數量: ${it.quantity || 1})`.trim(),
              };
            });
            setParsedItems(items);
          } else {
            const bestTag = matchBestTag(ocrResult.merchant || '發票採買', currentTags);
            setParsedItems([
              {
                id: `inv_item_${Date.now()}`,
                title: `${ocrResult.merchant || '發票收據'} - 消費合計`,
                amount: ocrResult.totalAmount || 0,
                categoryId: ocrResult.categoryId || 'food',
                categoryName: bestTag,
                paymentMethod: defaultPayment,
                tags: [bestTag],
                date: defaultDate,
                merchant: ocrResult.merchant || '',
                note: ocrResult.invoiceNumber ? `發票號碼: ${ocrResult.invoiceNumber}` : undefined,
              },
            ]);
          }
        }
      } catch (err) {
        console.error('OCR error:', err);
        alert('照片辨識失敗，請手動填寫。');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * 電子發票 QR Code 掃描 / 文字解析
   */
  const handleParseQrCode = (qrStr: string) => {
    if (!qrStr.trim()) return;
    try {
      const parsed = parseTaiwanInvoiceQrCode(qrStr.trim());
      if (parsed) {
        const defaultDate = parsed.date || new Date().toISOString().split('T')[0];
        const defaultPayment = currentPaymentMethods[0] || '現金';

        if (parsed.items && parsed.items.length > 0) {
          const items: ParsedItemEntry[] = parsed.items.map((it, idx) => {
            const bestTag = matchBestTag(it.name, currentTags);
            return {
              id: `qr_item_${Date.now()}_${idx}`,
              title: it.name,
              amount: it.amount || (it.unitPrice * it.quantity),
              categoryId: 'food',
              categoryName: bestTag,
              paymentMethod: defaultPayment,
              tags: [bestTag],
              date: defaultDate,
              merchant: parsed.sellerName || '',
              note: `發票號碼: ${parsed.invoiceNumber}`,
            };
          });
          setParsedItems(items);
        } else {
          const bestTag = matchBestTag(parsed.sellerName || '電子發票', currentTags);
          setParsedItems([
            {
              id: `qr_item_${Date.now()}`,
              title: `${parsed.sellerName || '電子發票'} - 消費合計`,
              amount: parsed.totalAmount || 0,
              categoryId: 'food',
              categoryName: bestTag,
              paymentMethod: defaultPayment,
              tags: [bestTag],
              date: defaultDate,
              merchant: parsed.sellerName || '',
              note: `發票號碼: ${parsed.invoiceNumber}`,
            },
          ]);
        }
        setQrInput('');
      } else {
        alert('無法解析此 QR Code 格式，請確認是否為台灣電子發票二維碼。');
      }
    } catch (err) {
      alert('QR Code 格式錯誤，請重新確認。');
    }
  };

  // 📝 項目操作
  const handleUpdateItem = (id: string, field: keyof ParsedItemEntry, value: any) => {
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (parsedItems.length <= 1) {
      alert('請至少保留一筆記帳項目');
      return;
    }
    setParsedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddNewItem = () => {
    const defaultDate = parsedItems[0]?.date || new Date().toISOString().split('T')[0];
    const defaultPayment = parsedItems[0]?.paymentMethod || currentPaymentMethods[0] || '現金';
    const defaultTag = currentTags[0] || '未歸類';

    setParsedItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: '新項目',
        amount: 100,
        categoryId: 'food',
        categoryName: defaultTag,
        paymentMethod: defaultPayment,
        tags: [defaultTag],
        date: defaultDate,
      },
    ]);
  };

  // 總金額計算
  const totalAmount = parsedItems.reduce((acc, it) => acc + Number(it.amount || 0), 0);

  // 儲存全部記帳項目
  const handleSave = () => {
    if (parsedItems.length === 0) {
      alert('請先輸入文字或上傳發票進行解析！');
      return;
    }

    for (const it of parsedItems) {
      if (!it.title.trim() || it.amount === '' || Number(it.amount) <= 0) {
        alert(`品項「${it.title || '未命名'}」金額無效，請填寫有效金額！`);
        return;
      }
    }

    let splitInfo = undefined;
    if (ledgerType === 'household' && currentGroup) {
      let calculatedSplits: { userId: string; amount: number; settled: boolean }[] = [];

      if (splitMethod === 'equal') {
        const participantCount = Math.max(1, splitParticipants.length);
        const splitAmt = Math.round(totalAmount / participantCount);
        calculatedSplits = currentGroup.members.map((m) => ({
          userId: m.userId,
          amount: splitParticipants.includes(m.userId) ? splitAmt : 0,
          settled: false,
        }));
      } else if (splitMethod === 'exact') {
        calculatedSplits = currentGroup.members.map((m) => ({
          userId: m.userId,
          amount: Number(exactSplits[m.userId] || 0),
          settled: false,
        }));
      } else if (splitMethod === 'percentage') {
        calculatedSplits = currentGroup.members.map((m) => ({
          userId: m.userId,
          amount: Math.round((totalAmount * Number(percentSplits[m.userId] || 0)) / 100),
          settled: false,
        }));
      }

      splitInfo = {
        splitMethod,
        payerId: splitPayerId || user.uid,
        splits: calculatedSplits,
      };
    }

    // 批次寫入所有解析出的帳目
    parsedItems.forEach((it, idx) => {
      addTransaction({
        userId: ledgerType === 'household' && splitPayerId ? splitPayerId : user.uid,
        householdId: ledgerType === 'household' ? (currentGroup?.id || selectedHouseholdId) : undefined,
        title: it.title.trim(),
        amount: Number(it.amount),
        type: 'expense',
        ledgerType,
        categoryId: it.categoryId || 'food',
        categoryName: it.tags[0] || '日常開銷',
        categoryIcon: 'Tag',
        subCategory: it.subCategory,
        paymentMethod: it.paymentMethod,
        date: it.date || new Date().toISOString().split('T')[0],
        merchant: it.merchant?.trim() || undefined,
        tags: it.tags && it.tags.length > 0 ? [it.tags[0]] : ['未歸類'],
        note: it.note?.trim() || undefined,
        splitInfo: idx === 0 ? splitInfo : undefined,
        receiptImageUrl: selectedImage || undefined,
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl glass-modal text-slate-100 shadow-2xl p-5 sm:p-6 my-auto border border-white/10 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">智慧多項目記帳</h2>
              <p className="text-xs text-slate-400">
                AI 語意解析 • 發票收據多品項自動辨識與分類
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 頂部模式切換：精簡標題，非群組公帳不使用紫色 */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 border border-white/10 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${
              mode === 'ai'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span>AI 智慧記帳</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('invoice')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${
              mode === 'invoice'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span>發票辨識</span>
          </button>
        </div>

        {/* 1. ✨ AI 智慧輸入模式 */}
        {mode === 'ai' && (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAnalyzeText(inputText);
                  }
                }}
                rows={3}
                placeholder="輸入一句話、多行或連續消費（例如：&#10;中午吃飯 200 晚餐吃飯 400&#10;或：星巴克 175 全聯 450 加油 1000）"
                className="w-full p-3.5 rounded-2xl border border-slate-700 bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-24 font-medium"
              />
              <button
                type="button"
                onClick={() => handleAnalyzeText(inputText)}
                disabled={isAnalyzing || !inputText.trim()}
                className="absolute right-2.5 bottom-3 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition shadow-md"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                解析
              </button>
            </div>

            {/* 快速示範範例 */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-400">試試看：</span>
              <button
                type="button"
                onClick={() => {
                  const sample = '中午吃飯 200 晚餐吃飯 400';
                  setInputText(sample);
                  handleAnalyzeText(sample);
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-bold hover:bg-emerald-900 transition"
              >
                連續多品項範例
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText('星巴克 175');
                  handleAnalyzeText('星巴克 175');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
              >
                星巴克 175
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText('全聯買菜 450 (家庭)');
                  handleAnalyzeText('全聯買菜 450 (家庭)');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
              >
                全聯買菜 450
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText('加油 1000');
                  handleAnalyzeText('加油 1000');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
              >
                加油 1000
              </button>
            </div>
          </div>
        )}

        {/* 2. 🧾 發票辨識模式 (使用綠色/暗色系，不使用紫色) */}
        {mode === 'invoice' && (
          <div className="space-y-3">
            {/* 拍照 / 上傳發票收據照片 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/40 hover:bg-slate-900/80 transition cursor-pointer flex flex-col items-center justify-center text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow">
                <Camera className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-white">點擊拍照或上傳發票 / 收據照片</p>
              <p className="text-xs text-slate-400 mt-1">
                支援全聯、超商、家樂福等發票，自動解析多個品項並各自分類
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* QR Code 二維碼文字解析 */}
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>或輸入電子發票二維碼 / 條碼文字</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="貼上發票左側/右側 QR Code 77位字串 (如: AB123456781130819...)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleParseQrCode(qrInput);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleParseQrCode(qrInput)}
                  disabled={!qrInput.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  解析
                </button>
              </div>
            </div>

            {/* 照片預覽 */}
            {selectedImage && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-36 bg-black flex items-center justify-center">
                <img src={selectedImage} alt="Receipt Preview" className="max-h-36 object-contain" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white rounded-lg text-xs font-semibold backdrop-blur"
                >
                  重新拍照
                </button>
              </div>
            )}
          </div>
        )}

        {/* 帳本切換 (個人私帳 / 群組公帳) */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>記帳帳本歸屬</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setLedgerType('personal')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg border transition ${
                ledgerType === 'personal'
                  ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3 h-3" />
              個人私帳
            </button>
            <button
              type="button"
              onClick={() => setLedgerType('household')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg border transition ${
                ledgerType === 'household'
                  ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3 h-3" />
              群組公帳
            </button>
          </div>
        </div>

        {/* 若為公帳：顯示入帳群組與分攤設定（此時採用專屬紫色風格） */}
        {ledgerType === 'household' && (
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                群組公帳與代墊設定
              </span>
              {households.length > 0 && (
                <select
                  value={selectedHouseholdId}
                  onChange={(e) => {
                    setSelectedHouseholdId(e.target.value);
                    const targetH = households.find((h) => h.id === e.target.value);
                    if (targetH) {
                      setSplitPayerId(user.uid || targetH.members[0]?.userId || '');
                      setSplitParticipants(targetH.members.map((m) => m.userId));
                    }
                  }}
                  className="bg-slate-900 border border-purple-700/60 rounded-xl px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-purple-400 font-bold"
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {currentGroup && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">先行代墊付款人</label>
                  <select
                    value={splitPayerId}
                    onChange={(e) => setSplitPayerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none"
                  >
                    {currentGroup.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName} {m.userId === user.uid ? '(您)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">分攤模式</label>
                  <select
                    value={splitMethod}
                    onChange={(e) => setSplitMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white outline-none"
                  >
                    <option value="equal">👥 全員均分</option>
                    <option value="exact">🔢 自訂各成員金額</option>
                    <option value="percentage">📊 比例百分比分攤</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 結構化帳目預覽與編輯區 (無內層 Scroll，由外層彈窗捲動) */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {parsedItems.length > 1
                  ? `已解析出 ${parsedItems.length} 筆明細項目 (各自獨立分類)`
                  : '消費明細預覽與確認'}
              </span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-mono text-emerald-400">
                總計 NT$ {totalAmount.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1 transition border border-slate-700"
              >
                <Plus className="w-3 h-3" />
                <span>加一筆</span>
              </button>
            </div>
          </div>

          {/* 項目卡片清單 (無多餘內層 scroll，自然展開) */}
          <div className="space-y-2.5">
            {parsedItems.map((item, index) => {
              const currentItemTag = item.tags[0] || '未歸類';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-2.5 shadow-sm"
                >
                  {/* 頂部：序號、品項名稱、金額、刪除按鈕 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                        placeholder="品項名稱..."
                        className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500">NT$</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'amount',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        placeholder="0"
                        className="w-20 px-2 py-1.5 text-xs font-black font-mono rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 text-right outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {parsedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="刪除此項目"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 中間：付款方式與消費日期 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                      <CreditCard className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <select
                        value={item.paymentMethod}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'paymentMethod', e.target.value)
                        }
                        className="bg-transparent text-slate-200 outline-none w-full text-[11px]"
                      >
                        {currentPaymentMethods.map((pm) => (
                          <option key={pm} value={pm} className="bg-slate-900 text-white">
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                      <Calendar className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => handleUpdateItem(item.id, 'date', e.target.value)}
                        className="bg-transparent text-slate-200 outline-none w-full text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  {/* 底部：標籤單選 (即時切換標籤) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>歸屬標籤 (單一標籤)：</span>
                      <span className="font-bold text-emerald-400">已選 #{currentItemTag}</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                      {currentTags.map((tag) => {
                        const isSelected = currentItemTag === tag;
                        return (
                          <TagPill
                            key={tag}
                            tag={tag}
                            active={isSelected}
                            onClick={() => {
                              handleUpdateItem(item.id, 'tags', [tag]);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部確認按鈕 */}
        <div className="pt-3 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              確認記帳 (
              {parsedItems.length > 1
                ? `共 ${parsedItems.length} 筆 • 總計 NT$ ${totalAmount.toLocaleString()}`
                : `NT$ ${totalAmount.toLocaleString()}`}
              )
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

