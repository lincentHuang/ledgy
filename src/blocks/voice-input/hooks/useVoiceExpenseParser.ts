'use client';

import { useState, useCallback } from 'react';
import { parseExpenseWithGemini } from '@/lib/geminiClient';
import {
  DEFAULT_CATEGORIES,
  classifyInvoiceItemCategory,
} from '@app/shared';

export interface ParsedVoiceExpense {
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
}

interface UseVoiceExpenseParserOptions {
  geminiApiKey?: string;
  defaultPaymentMethod?: string;
  currentTags: string[];
  activeLedger: 'personal' | 'household';
  learningEngine: any;
}

export function useVoiceExpenseParser({
  geminiApiKey,
  defaultPaymentMethod = '現金',
  currentTags,
  activeLedger,
  learningEngine,
}: UseVoiceExpenseParserOptions) {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceExpense | null>(null);
  const [parseError, setParseError] = useState('');

  const matchBestTag = useCallback(
    (
      title: string,
      rawVoiceText: string,
      candidateTags: string[] = [],
      availableTagsList: string[]
    ): string => {
      if (!availableTagsList || availableTagsList.length === 0) return '未歸類';
      const cleanTitle = (title || '').toLowerCase();
      const cleanRaw = (rawVoiceText || '').toLowerCase();

      for (const pt of candidateTags) {
        if (availableTagsList.includes(pt)) return pt;
        const matched = availableTagsList.find((t) => t === pt || t.includes(pt) || pt.includes(t));
        if (matched) return matched;
      }

      for (const tag of availableTagsList) {
        const cleanTag = tag.toLowerCase().replace(/^[#·]/, '');
        const tokens = cleanTag.split(/[·\-_/]/).filter((tok) => tok.length >= 2);
        for (const token of tokens) {
          if (cleanTitle.includes(token) || cleanRaw.includes(token)) {
            return tag;
          }
        }
      }

      if (/早餐|蛋餅|蘿蔔糕|飯糰|三明治|漢堡|早點|早午餐|吐司|豆漿|厚片|油條/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /早餐/i.test(t));
        if (tag) return tag;
      }
      if (/星巴克|路易莎|cama|咖啡|拿鐵|美式|手搖|飲料|奶茶|珍奶|珍珠奶茶|五十嵐|50嵐|麻古|清心|可不可|茶湯會|迷客夏|一沐日|甜點|蛋糕|下午茶|豆花|冰品/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /咖啡|飲料|下午茶|手搖/i.test(t));
        if (tag) return tag;
      }
      if (/午餐|中午|排骨飯|雞腿飯|便當|水餃|鍋貼|乾麵|牛肉麵|壽司|拉麵|燴飯|小吃/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /午餐/i.test(t));
        if (tag) return tag;
      }
      if (/晚餐|晚上|宵夜|火鍋|熱炒|燒肉|居酒屋|串燒|鹽酥雞|炸雞|鹹酥雞|夜市/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /晚餐|宵夜|聚餐/i.test(t));
        if (tag) return tag;
      }
      if (/全聯|家樂福|好市多|costco|愛買|大潤發|美廉社|買菜|生鮮|超市|食材|蔬菜|水果/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /生鮮|採買|超市|食材/i.test(t));
        if (tag) return tag;
      }
      if (/加油|中油|台塑|95|92|98|汽油|捷運|悠遊卡|高鐵|火車|計程車|uber|停車|過路費|機車|修車|etag/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /交通|加油|通勤|車/i.test(t));
        if (tag) return tag;
      }
      if (/電影|威秀|國賓|秀泰|netflix|disney|spotify|演唱會|唱歌|ktv|遊戲|steam|switch|ps5/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /娛樂|電影|休閒/i.test(t));
        if (tag) return tag;
      }
      if (/水電|瓦斯|網路費|房租|管理費|衛生紙|洗衣精|日常用品|日用品/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /居家|水電|生活|日用/i.test(t));
        if (tag) return tag;
      }
      if (/看醫生|診所|醫院|掛號|感冒|藥局|屈臣氏|康是美|保健食品|看牙/i.test(cleanRaw)) {
        const tag = availableTagsList.find((t) => /醫療|健康|藥/i.test(t));
        if (tag) return tag;
      }

      const cat = classifyInvoiceItemCategory(cleanTitle || cleanRaw);
      for (const catTag of cat.tags) {
        const matched = availableTagsList.find((t) => t.includes(catTag) || catTag.includes(t));
        if (matched) return matched;
      }

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
    },
    []
  );

  const parseVoice = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsParsing(true);
      setParseError('');

      try {
        const matchedRule = learningEngine?.matchRule(text);
        const fewShotPrompt = matchedRule
          ? `若輸入類似「${matchedRule.keywordPattern}」，優先歸類至「${matchedRule.targetCategoryName}」`
          : '';

        const parsed = await parseExpenseWithGemini(
          text,
          geminiApiKey,
          fewShotPrompt,
          false,
          currentTags
        );

        const isExplicitPersonal = /個人|私帳|自己/.test(text);
        const isExplicitHousehold = /家庭|公帳|公用|家裡|大家/.test(text);
        const determinedLedgerType: 'personal' | 'household' = isExplicitHousehold
          ? 'household'
          : isExplicitPersonal
          ? 'personal'
          : (parsed.ledgerType || activeLedger || 'personal');

        const cat = DEFAULT_CATEGORIES.find(
          (c) => c.id === (matchedRule ? matchedRule.targetCategoryId : parsed.categoryId)
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
          resolvedTag = matchBestTag(parsed.title || text, text, parsed.tags || [], currentTags);
        }

        setParsedResult({
          title: parsed.title || text,
          amount: parsed.amount || 0,
          categoryId: matchedRule ? matchedRule.targetCategoryId : parsed.categoryId,
          categoryName: cat ? cat.name : parsed.categoryId,
          subCategory: matchedRule?.targetSubCategory || parsed.subCategory,
          paymentMethod:
            matchedRule?.targetPaymentMethod || parsed.paymentMethod || defaultPaymentMethod || '現金',
          tags: [resolvedTag],
          ledgerType: determinedLedgerType,
          merchant: parsed.merchant,
          confidence: parsed.confidence,
          engineType: parsed.engineType || (matchedRule ? 'local_zero_token' : 'gemini_cloud'),
        });
      } catch (e: any) {
        setParseError(e.message || 'AI 解析失敗，請再試一次。');
      } finally {
        setIsParsing(false);
      }
    },
    [geminiApiKey, defaultPaymentMethod, currentTags, activeLedger, learningEngine, matchBestTag]
  );

  const resetParsedResult = useCallback(() => {
    setParsedResult(null);
    setParseError('');
  }, []);

  return {
    isParsing,
    parsedResult,
    setParsedResult,
    parseError,
    setParseError,
    parseVoice,
    resetParsedResult,
  };
}
