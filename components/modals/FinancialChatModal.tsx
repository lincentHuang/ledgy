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
  AlertCircle,
  Key,
  ShieldCheck,
  ExternalLink,
  DollarSign,
  PiggyBank,
} from 'lucide-react';
import { askFinancialAdvisor } from '../../lib/geminiClient';
import { Button } from '../ui';

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
  const { user, household, transactions, updateUserProfile } = useAppStore();
  const hasGeminiApiKey = Boolean(user.geminiApiKey && user.geminiApiKey.trim());

  const [inputApiKey, setInputApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `嗨 ${user.displayName || '朋友'}！我是您的專屬 **AI 智慧理財與預算顧問** 🤖✨\n我已連接 Google Gemini 2.5 Flash 模型，並載入您當前${
        household ? `家庭公帳「${household.name}」` : '個人私帳'
      }的最新預算分配、標籤支出與發票明細。\n\n您可以隨時問我：\n- 「評估我本月的預算消耗速度與超支風險」\n- 「針對我支出最高的三大標籤給予節流建議」\n- 「我最近喝咖啡與外食花了多少錢？」\n- 「幫我檢查最近有沒有重複扣款或異常大額支出」`,
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

  const handleSaveApiKey = () => {
    if (!inputApiKey.trim()) return;
    setIsSavingKey(true);
    updateUserProfile({ geminiApiKey: inputApiKey.trim() });
    setIsSavingKey(false);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading || !hasGeminiApiKey) return;

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
        household?.name,
        {
          monthlyBudget: household?.monthlyBudget || user.monthlyBudget || 35000,
          tagBudgets: (household?.tagBudgets || user.tagBudgets) as Record<string, number>,
        }
      );

      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: `⚠️ 分析失敗：${err.message || '連線逾時，請確認網路連線或 API Key 是否正確。'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_QUESTIONS = [
    '📈 評估我本月的預算消耗與超支風險',
    '💡 分析支出最高項目並給予省錢建議',
    '☕ 我最近外食與喝手搖飲花了多少錢？',
    '⚠️ 檢查最近是否有疑似重複扣款',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-[640px] max-h-[90vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold">AI 理財顧問諮詢</h2>
                {hasGeminiApiKey ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Gemini 2.5 Flash 已連線
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                    尚未設定 API Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                基於預算分配模型與帳本數據的即時智慧洞察
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

        {!hasGeminiApiKey ? (
          /* 🔒 尚未填入 API Key 提示畫面 */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-lg font-bold text-slate-100">啟用 Google Gemini AI 智慧理財顧問</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI 顧問能即時檢索您的所有消費標籤、月預算進度與發票明細，為您提供客製化節約分析與財務諮詢。
              </p>
            </div>

            <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" /> 輸入 Gemini API Key
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  免費取得 Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                placeholder="貼上 AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <Button
                variant="primary"
                size="sm"
                fullWidth
                disabled={!inputApiKey.trim() || isSavingKey}
                onClick={handleSaveApiKey}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {isSavingKey ? '儲存中...' : '立刻啟用 AI 理財顧問'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 聊天訊息區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 shadow-sm">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60'
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
                  <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>AI 正在檢索預算與帳本數據精算中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 快速問題推薦 */}
            <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <span className="text-slate-400 font-bold flex-shrink-0 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-emerald-400" /> 推薦：
              </span>
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.substring(2).trim())}
                  className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 flex-shrink-0 transition active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 輸入欄 */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80">
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
                  placeholder="提問任何財務、開銷或節約問題..."
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
