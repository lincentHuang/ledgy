'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Coins,
} from 'lucide-react';
import { askFinancialAdvisor } from '../../lib/geminiClient';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface FinancialChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialChatModal: React.FC<FinancialChatModalProps> = ({ isOpen, onClose }) => {
  const { user, household, transactions } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `嗨 ${user.displayName}！我是您的專屬 **AI 智慧理財顧問** 🤖✨\n我已經載入您與${household ? household.name : '個人'}的最新帳本與發票數據。\n\n您可以隨時問我：\n- 「我上週喝飲料花了多少錢？」\n- 「這個月家庭公用支出誰代墊最多？」\n- 「分析本月開銷最大項目與節約建議」\n- 「有沒有疑似重複扣款？」`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await askFinancialAdvisor(
        transactions,
        query,
        user.geminiApiKey,
        household?.name
      );

      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: '抱歉，暫時無法分析您的帳本數據，請檢查網路連線或稍後再試。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_QUESTIONS = [
    '☕ 我最近喝咖啡與手搖杯花了多少錢？',
    '🏡 家庭公用支出誰代墊最多？',
    '📊 分析這個月最大筆的支出與節約建議',
    '⚠️ 幫我檢查最近有沒有重複扣款或異常大額開銷',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-[640px] max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold">AI 財務顧問助理</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  即時分析
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                可自然語言提問任何關於開銷、預算與帳目的問題
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 聊天訊息區域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  AI
                </div>
              )}
              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>AI 正在檢索您的帳本數據並精算中...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 快速問題推薦 */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-400 font-bold flex-shrink-0 flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-amber-500" /> 推薦：
          </span>
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q.substring(2).trim())}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 flex-shrink-0 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 輸入欄 */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="提問任何財務開銷問題..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-md shadow-emerald-500/25"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
