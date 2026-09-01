'use client';

import { useState, useCallback } from 'react';
import { parseExpensesWithGemini } from '@/lib/geminiClient';
import {
  DEFAULT_CATEGORIES,
  matchTagIntelligently,
} from '@app/shared';

export interface ParsedVoiceExpense {
  id?: string;
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
  const [parsedResults, setParsedResults] = useState<ParsedVoiceExpense[]>([]);
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

        const rawParsedList = await parseExpensesWithGemini(
          text,
          geminiApiKey,
          fewShotPrompt,
          false,
          currentTags
        );

        const mappedResults: ParsedVoiceExpense[] = rawParsedList.map((parsed, idx) => {
          const itemRule = learningEngine?.matchRule(parsed.title || text);
          const effectiveRule = itemRule || matchedRule;

          const isExplicitPersonal = /個人|私帳|自己/.test(parsed.title || text);
          const isExplicitHousehold = /家庭|公帳|公用|家裡|大家/.test(parsed.title || text);
          const determinedLedgerType: 'personal' | 'household' = isExplicitHousehold
            ? 'household'
            : isExplicitPersonal
            ? 'personal'
            : (parsed.ledgerType || activeLedger || 'personal');

          const targetCatId = effectiveRule ? effectiveRule.targetCategoryId : parsed.categoryId;
          const cat = DEFAULT_CATEGORIES.find((c) => c.id === targetCatId);

          // 🎯 智慧標籤配對
          let resolvedTag = '未歸類';
          if (
            effectiveRule?.targetTags &&
            effectiveRule.targetTags.length > 0 &&
            currentTags.includes(effectiveRule.targetTags[0])
          ) {
            resolvedTag = effectiveRule.targetTags[0];
          } else {
            resolvedTag = matchTagIntelligently(
              parsed.title || text,
              parsed.title || text,
              parsed.merchant,
              currentTags,
              learningEngine?.getRules()
            );
          }

          return {
            id: `item_${Date.now()}_${idx}`,
            title: parsed.title || text,
            amount: parsed.amount || 0,
            categoryId: targetCatId,
            categoryName: cat ? cat.name : parsed.categoryName || targetCatId,
            subCategory: effectiveRule?.targetSubCategory || parsed.subCategory,
            paymentMethod:
              effectiveRule?.targetPaymentMethod ||
              parsed.paymentMethod ||
              defaultPaymentMethod ||
              '現金',
            tags: [resolvedTag],
            ledgerType: determinedLedgerType,
            merchant: parsed.merchant,
            confidence: parsed.confidence,
            engineType: parsed.engineType || (effectiveRule ? 'local_zero_token' : 'gemini_cloud'),
          };
        });

        setParsedResults(mappedResults);
      } catch (e: any) {
        setParseError(e.message || 'AI 解析失敗，請再試一次。');
      } finally {
        setIsParsing(false);
      }
    },
    [geminiApiKey, defaultPaymentMethod, currentTags, activeLedger, learningEngine]
  );

  const updateItem = useCallback((index: number, changes: Partial<ParsedVoiceExpense>) => {
    setParsedResults((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...changes };
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setParsedResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetParsedResult = useCallback(() => {
    setParsedResults([]);
    setParseError('');
  }, []);

  return {
    isParsing,
    parsedResult: parsedResults[0] || null,
    parsedResults,
    setParsedResults,
    updateItem,
    removeItem,
    parseError,
    setParseError,
    parseVoice,
    resetParsedResult,
  };
}
