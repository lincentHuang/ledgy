'use client';

import { useState, useCallback } from 'react';
import { askFinancialAdvisor } from '@/lib/geminiClient';
import { Transaction, UserProfile, Household } from '@app/shared';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface UseFinancialAdvisorOptions {
  apiKey?: string;
  transactions: Transaction[];
  user: UserProfile;
  household?: Household | null;
  activeLedger: 'personal' | 'household';
}

export function useFinancialAdvisor({
  apiKey,
  transactions,
  user,
  household,
  activeLedger,
}: UseFinancialAdvisorOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const reply = await askFinancialAdvisor(
          transactions,
          userMsg.text,
          apiKey,
          activeLedger === 'household' ? household?.name : undefined,
          {
            monthlyBudget: activeLedger === 'household' ? household?.monthlyBudget : user?.monthlyBudget,
            tagBudgets: activeLedger === 'household' ? household?.tagBudgets : user?.tagBudgets,
          }
        );

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: `抱歉，理財顧問目前無法回應：${err.message || '連線異常，請稍後再試。'}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, transactions, user, household, activeLedger, apiKey]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
