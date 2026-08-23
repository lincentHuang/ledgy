'use client';

import { useState, useCallback } from 'react';
import { parseExpenseWithGemini } from '@/lib/geminiClient';
import {
  DEFAULT_CATEGORIES,
  matchTagIntelligently,
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

        // 🎯 智慧標籤配對（優先依據個人自適應學習規則，次之依據食衣住行與自訂標籤關鍵字庫）
        let resolvedTag = '未歸類';
        if (
          matchedRule?.targetTags &&
          matchedRule.targetTags.length > 0 &&
          currentTags.includes(matchedRule.targetTags[0])
        ) {
          resolvedTag = matchedRule.targetTags[0];
        } else {
          resolvedTag = matchTagIntelligently(
            text,
            parsed.title || text,
            parsed.merchant,
            currentTags,
            learningEngine?.getRules()
          );
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
    [geminiApiKey, defaultPaymentMethod, currentTags, activeLedger, learningEngine]
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
