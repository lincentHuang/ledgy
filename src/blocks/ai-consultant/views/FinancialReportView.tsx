'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  Key,
  ShieldCheck,
  ExternalLink,
  DollarSign,
  PiggyBank,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RefreshCw,
  FileText,
  Activity,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  Sliders,
  Check,
  HelpCircle,
  ShieldAlert,
  X,
  Target,
  Filter,
} from 'lucide-react';
import { streamFinancialAdvisor } from '@/lib/geminiClient';
import { Button } from '@/components';
import { CustomDateRangePickerModal } from './CustomDateRangePickerModal';

interface VisualCardData {
  type: 'budget_burn' | 'tag_breakdown' | 'anomaly_alert' | 'full_report';
  title: string;
  totalExpense: number;
  monthlyBudget: number;
  usagePercent: number;
  daysPassed: number;
  totalDays: number;
  dailyAvg: number;
  projectedMonthEnd: number;
  safeDailyRemaining: number;
  healthScore: number;
  healthStatus: { label: string; color: string; bg: string };
  topTags: { name: string; amount: number; percent: number; color: string; budget?: number }[];
  anomalyCount: number;
  periodLabel: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  visualCard?: VisualCardData;
}

export type TimeFilterMode = 'month' | 'range';
export type RangePreset = '7D' | '30D' | '90D' | 'this_month' | 'last_month' | 'year' | 'custom';
export type TagFilterTab = 'all' | 'budgeted' | 'alert';

interface FinancialReportViewProps {
  onBack?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

const TAG_PALETTE = [
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
  '#F97316', '#EAB308', '#84CC16', '#059669',
];

export const FinancialReportView: React.FC<FinancialReportViewProps> = ({
  onBack,
  isModal = false,
  onClose,
}) => {
  const { user, household, transactions, updateUserProfile } = useAppStore();
  const hasGeminiApiKey = Boolean(user.geminiApiKey && user.geminiApiKey.trim());

  // 模式切換：'report' (視覺報表) vs 'advisor' (AI 顧問對話)
  const [activeMode, setActiveMode] = useState<'report' | 'advisor'>('report');

  // 時間維度選擇狀態：預設為按月分析 ('month')
  const [timeMode, setTimeMode] = useState<TimeFilterMode>('month');

  // 標籤進度表篩選狀態：'all' | 'budgeted' | 'alert'
  const [tagFilterTab, setTagFilterTab] = useState<TagFilterTab>('all');

  // 按月分析的年月狀態 (預設當前月)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12

  // 自訂/快捷區間狀態
  const [rangePreset, setRangePreset] = useState<RangePreset>('30D');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 自訂專屬日曆彈窗狀態
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);

  // Hover point for SVG chart
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // API Key 設定狀態
  const [inputApiKey, setInputApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // 對話輸入與狀態
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 月份切換邏輯 (向前/向後切換)
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const current = new Date();
    setSelectedYear(current.getFullYear());
    setSelectedMonth(current.getMonth() + 1);
  };

  // 2. 快捷區間選取邏輯
  const handleSelectRangePreset = (preset: RangePreset) => {
    setRangePreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === '7D') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(endStr);
    } else if (preset === '30D') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(endStr);
    } else if (preset === '90D') {
      const start = new Date(today);
      start.setDate(today.getDate() - 89);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(endStr);
    } else if (preset === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(endStr);
    } else if (preset === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const start = new Date(today.getFullYear(), 0, 1);
      setCustomStartDate(start.toISOString().split('T')[0]);
      setCustomEndDate(endStr);
    }
  };

  // 3. 計算指定時間範圍的日期與收支數據
  const periodInfo = useMemo(() => {
    let startDateStr = '';
    let endDateStr = '';
    let label = '';
    let daysPassed = 1;
    let totalDays = 30;
    let isCurrentPeriod = false;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (timeMode === 'month') {
      const monthPadded = String(selectedMonth).padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthPadded}`;
      startDateStr = `${monthPrefix}-01`;
      const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      endDateStr = `${monthPrefix}-${String(lastDayOfMonth).padStart(2, '0')}`;
      totalDays = lastDayOfMonth;
      label = `${selectedYear}年${selectedMonth}月`;

      const isThisMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;
      const isPastMonth =
        selectedYear < today.getFullYear() ||
        (selectedYear === today.getFullYear() && selectedMonth < today.getMonth() + 1);

      if (isThisMonth) {
        daysPassed = today.getDate();
        isCurrentPeriod = true;
      } else if (isPastMonth) {
        daysPassed = totalDays;
      } else {
        daysPassed = 0;
      }
    } else {
      startDateStr = customStartDate;
      endDateStr = customEndDate;
      label = `${customStartDate} ~ ${customEndDate}`;

      const s = new Date(customStartDate);
      const e = new Date(customEndDate);
      const diffMs = Math.max(0, e.getTime() - s.getTime());
      totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      if (todayStr >= customStartDate && todayStr <= customEndDate) {
        const passedMs = Math.max(0, today.getTime() - s.getTime());
        daysPassed = Math.max(1, Math.min(totalDays, Math.round(passedMs / (1000 * 60 * 60 * 24)) + 1));
        isCurrentPeriod = true;
      } else if (todayStr > customEndDate) {
        daysPassed = totalDays;
      } else {
        daysPassed = 0;
      }
    }

    return {
      startDateStr,
      endDateStr,
      label,
      daysPassed: Math.max(1, daysPassed),
      totalDays,
      daysRemaining: Math.max(1, totalDays - daysPassed + 1),
      isCurrentPeriod,
    };
  }, [timeMode, selectedYear, selectedMonth, customStartDate, customEndDate]);

  // 4. 精算選定週期的財務與預算合理性指標
  const financialMetrics = useMemo(() => {
    const { startDateStr, endDateStr, daysPassed, totalDays, daysRemaining, label } = periodInfo;

    const filteredTx = transactions.filter((t) => {
      return t.date >= startDateStr && t.date <= endDateStr;
    });

    let totalExpense = 0;
    let totalIncome = 0;
    let anomalyCount = 0;
    const tagExpenseMap: Record<string, number> = {};
    const dailyExpenseMap: Record<string, { amount: number; count: number }> = {};

    filteredTx.forEach((t) => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        const tag = t.tags?.[0] || t.categoryName || t.categoryId || '未歸類';
        tagExpenseMap[tag] = (tagExpenseMap[tag] || 0) + t.amount;
        if (t.isAnomaly) anomalyCount++;

        if (!dailyExpenseMap[t.date]) {
          dailyExpenseMap[t.date] = { amount: 0, count: 0 };
        }
        dailyExpenseMap[t.date].amount += t.amount;
        dailyExpenseMap[t.date].count += 1;
      } else if (t.type === 'income') {
        totalIncome += t.amount;
      }
    });

    // 基準每月預算 (月預算設定)
    const baseMonthlyBudget = household?.monthlyBudget || user.monthlyBudget || 35000;
    const tagBudgets = (household?.tagBudgets || user.tagBudgets || {}) as Record<string, number>;

    // 依天數等比例換算該週期的總預算額度 (按月為整月預算，區間為等比換算)
    const allocatedBudget =
      timeMode === 'month'
        ? baseMonthlyBudget
        : Math.round(baseMonthlyBudget * (totalDays / 30));

    const remainingBudget = allocatedBudget - totalExpense;
    const usagePercent = Math.round((totalExpense / (allocatedBudget || 1)) * 100);
    const timeElapsedPercent = Math.round((daysPassed / totalDays) * 100);

    const dailyAvg = Math.round(totalExpense / daysPassed);
    const projectedTotal = dailyAvg * totalDays;
    const safeDailyRemaining = Math.max(0, Math.round(remainingBudget / daysRemaining));

    // 預算合理性評估 (Budget Adequacy Status)
    let adequacyStatus: {
      type: 'sufficient' | 'tight' | 'exceeded';
      label: string;
      desc: string;
      color: string;
      bg: string;
      border: string;
    } = {
      type: 'sufficient',
      label: '充足',
      desc: `目前已消耗 ${usagePercent}%，比時間進度緩慢，按此步調期末預計結餘 NT$ ${(allocatedBudget - projectedTotal).toLocaleString()}。`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-800',
    };

    if (usagePercent > 100) {
      adequacyStatus = {
        type: 'exceeded',
        label: '超支',
        desc: `本週期支出已超出總預算 NT$ ${Math.abs(remainingBudget).toLocaleString()}，超出幅度 ${usagePercent - 100}%。`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/80',
        border: 'border-rose-800',
      };
    } else if (usagePercent > timeElapsedPercent + 8 || projectedTotal > allocatedBudget) {
      adequacyStatus = {
        type: 'tight',
        label: '偏高',
        desc: `消耗速率超前時間進度，期末預估總花費 NT$ ${projectedTotal.toLocaleString()}，可能超支 NT$ ${(projectedTotal - allocatedBudget).toLocaleString()}。`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/80',
        border: 'border-amber-800',
      };
    }

    // 財務健康分數計算 (0 ~ 100)
    let score = 100;
    if (usagePercent > timeElapsedPercent) {
      score -= Math.min(40, (usagePercent - timeElapsedPercent) * 1.5);
    }
    if (usagePercent > 100) {
      score -= 30;
    }
    if (anomalyCount > 0) {
      score -= Math.min(15, anomalyCount * 5);
    }
    const healthScore = Math.max(20, Math.min(100, Math.round(score)));

    // 彙整所有有消費或有設定預算的標籤集合 (全方位標籤預算清冊)
    const allTagKeysSet = new Set<string>([
      ...Object.keys(tagExpenseMap),
      ...Object.keys(tagBudgets).filter((k) => (tagBudgets[k] || 0) > 0),
    ]);

    const tagProgressList = Array.from(allTagKeysSet)
      .map((tagName, idx) => {
        const amount = tagExpenseMap[tagName] || 0;
        const baseTagBudget = tagBudgets[tagName];
        // 等比計算該週期的標籤預算額度
        const periodTagBudget =
          baseTagBudget !== undefined
            ? timeMode === 'month'
              ? baseTagBudget
              : Math.round(baseTagBudget * (totalDays / 30))
            : undefined;

        const sharePercent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        const budgetUsagePercent = periodTagBudget ? Math.round((amount / periodTagBudget) * 100) : undefined;
        const remaining = periodTagBudget !== undefined ? periodTagBudget - amount : undefined;
        const isOverBudget = periodTagBudget !== undefined ? amount > periodTagBudget : false;
        const isWarning = periodTagBudget !== undefined && !isOverBudget && (budgetUsagePercent || 0) >= 80;

        return {
          name: tagName,
          amount,
          sharePercent,
          color: TAG_PALETTE[idx % TAG_PALETTE.length],
          budget: periodTagBudget,
          baseMonthlyBudget: baseTagBudget,
          budgetUsagePercent,
          remaining,
          isOverBudget,
          isWarning,
          hasBudget: periodTagBudget !== undefined && periodTagBudget > 0,
        };
      })
      .sort((a, b) => {
        // 優先將有超支或消費高的排在前面
        if (a.isOverBudget !== b.isOverBudget) return a.isOverBudget ? -1 : 1;
        if (a.amount !== b.amount) return b.amount - a.amount;
        return (b.budget || 0) - (a.budget || 0);
      });

    const budgetedTagCount = tagProgressList.filter((t) => t.hasBudget).length;
    const overBudgetTagCount = tagProgressList.filter((t) => t.isOverBudget || t.isWarning).length;

    // 產生走勢圖每日點位資料
    const chartPoints: {
      dateStr: string;
      label: string;
      shortLabel: string;
      amount: number;
      count: number;
    }[] = [];

    const startObj = new Date(startDateStr);
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(startObj);
      cur.setDate(startObj.getDate() + i);
      const dStr = cur.toISOString().split('T')[0];
      const m = cur.getMonth() + 1;
      const day = cur.getDate();

      const dayData = dailyExpenseMap[dStr] || { amount: 0, count: 0 };
      chartPoints.push({
        dateStr: dStr,
        label: `${m}月${day}日`,
        shortLabel: totalDays <= 14 ? `週${['日', '一', '二', '三', '四', '五', '六'][cur.getDay()]}` : `${m}/${day}`,
        amount: dayData.amount,
        count: dayData.count,
      });
    }

    const maxSingleDayExpense = Math.max(...chartPoints.map((p) => p.amount), 1);

    return {
      periodLabel: label,
      startDateStr,
      endDateStr,
      totalExpense,
      totalIncome,
      netCashflow: totalIncome - totalExpense,
      allocatedBudget,
      remainingBudget,
      usagePercent,
      timeElapsedPercent,
      daysPassed,
      totalDays,
      daysRemaining,
      dailyAvg,
      projectedTotal,
      safeDailyRemaining,
      adequacyStatus,
      healthScore,
      tagProgressList,
      budgetedTagCount,
      overBudgetTagCount,
      anomalyCount,
      txCount: filteredTx.length,
      chartPoints,
      maxSingleDayExpense,
    };
  }, [periodInfo, transactions, household, user, timeMode]);

  // 5. 篩選後的標籤進度表列表
  const displayedTags = useMemo(() => {
    if (tagFilterTab === 'budgeted') {
      return financialMetrics.tagProgressList.filter((t) => t.hasBudget);
    }
    if (tagFilterTab === 'alert') {
      return financialMetrics.tagProgressList.filter((t) => t.isOverBudget || t.isWarning);
    }
    return financialMetrics.tagProgressList;
  }, [financialMetrics.tagProgressList, tagFilterTab]);

  // 6. 對話紀錄 (初始歡迎訊息連動當前選定週期)
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `嗨 ${user.displayName || '朋友'}！我是您的專屬 **AI 智慧理財與預算顧問** 🤖✨\n我已載入您當前【${financialMetrics.periodLabel}】的財務與標籤預算數據。\n\n- 總支出：**NT$ ${financialMetrics.totalExpense.toLocaleString()}** / 總預算 **NT$ ${financialMetrics.allocatedBudget.toLocaleString()}** (已用 ${financialMetrics.usagePercent}%)\n- 預算合理性狀態：**${financialMetrics.adequacyStatus.label}**\n- 標籤預算警戒：**${financialMetrics.overBudgetTagCount} 個類別吃緊/超支**\n\n您可以點擊下方推薦問題進行深入諮詢，或點擊上方「報表模式」檢視標籤預算進度與走勢圖！`,
        timestamp: Date.now(),
        visualCard: {
          type: 'full_report',
          title: `📊 ${financialMetrics.periodLabel} 財務與預算診斷報表`,
          totalExpense: financialMetrics.totalExpense,
          monthlyBudget: financialMetrics.allocatedBudget,
          usagePercent: financialMetrics.usagePercent,
          daysPassed: financialMetrics.daysPassed,
          totalDays: financialMetrics.totalDays,
          dailyAvg: financialMetrics.dailyAvg,
          projectedMonthEnd: financialMetrics.projectedTotal,
          safeDailyRemaining: financialMetrics.safeDailyRemaining,
          healthScore: financialMetrics.healthScore,
          healthStatus: {
            label: financialMetrics.adequacyStatus.label,
            color: financialMetrics.adequacyStatus.color,
            bg: `${financialMetrics.adequacyStatus.bg} ${financialMetrics.adequacyStatus.border}`,
          },
          topTags: financialMetrics.tagProgressList.slice(0, 4).map((t) => ({
            name: t.name,
            amount: t.amount,
            percent: t.sharePercent,
            color: t.color,
            budget: t.budget,
          })),
          anomalyCount: financialMetrics.anomalyCount,
          periodLabel: financialMetrics.periodLabel,
        },
      },
    ]);
  }, [financialMetrics.periodLabel, financialMetrics.allocatedBudget]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSaveApiKey = () => {
    if (!inputApiKey.trim()) return;
    setIsSavingKey(true);
    updateUserProfile({ geminiApiKey: inputApiKey.trim() });
    setIsSavingKey(false);
  };

  const createVisualCardForQuery = (query: string): VisualCardData => {
    let type: VisualCardData['type'] = 'full_report';
    let title = `📊 ${financialMetrics.periodLabel} 即時診斷簡報`;

    if (query.includes('預算') || query.includes('超支') || query.includes('夠用') || query.includes('合理')) {
      type = 'budget_burn';
      title = `📈 ${financialMetrics.periodLabel} 預算合理性與超支預測`;
    } else if (query.includes('標籤') || query.includes('分類') || query.includes('省錢') || query.includes('佔比')) {
      type = 'tag_breakdown';
      title = `🍩 ${financialMetrics.periodLabel} 標籤分類支出佔比診斷`;
    } else if (query.includes('異常') || query.includes('重複') || query.includes('大額')) {
      type = 'anomaly_alert';
      title = `⚠️ ${financialMetrics.periodLabel} 異常與大額扣款分析`;
    }

    return {
      type,
      title,
      totalExpense: financialMetrics.totalExpense,
      monthlyBudget: financialMetrics.allocatedBudget,
      usagePercent: financialMetrics.usagePercent,
      daysPassed: financialMetrics.daysPassed,
      totalDays: financialMetrics.totalDays,
      dailyAvg: financialMetrics.dailyAvg,
      projectedMonthEnd: financialMetrics.projectedTotal,
      safeDailyRemaining: financialMetrics.safeDailyRemaining,
      healthScore: financialMetrics.healthScore,
      healthStatus: {
        label: financialMetrics.adequacyStatus.label,
        color: financialMetrics.adequacyStatus.color,
        bg: `${financialMetrics.adequacyStatus.bg} ${financialMetrics.adequacyStatus.border}`,
      },
      topTags: financialMetrics.tagProgressList.slice(0, 4).map((t) => ({
        name: t.name,
        amount: t.amount,
        percent: t.sharePercent,
        color: t.color,
        budget: t.budget,
      })),
      anomalyCount: financialMetrics.anomalyCount,
      periodLabel: financialMetrics.periodLabel,
    };
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

    const aiMsgId = `msg_${Date.now() + 1}`;
    const visualCard = createVisualCardForQuery(query);

    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
      visualCard,
    };

    setMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);
    setInputValue('');
    setIsLoading(true);

    try {
      await streamFinancialAdvisor(
        transactions,
        query,
        user.geminiApiKey!,
        {
          householdName: household?.name,
          budgetInfo: {
            monthlyBudget: financialMetrics.allocatedBudget,
            tagBudgets: (household?.tagBudgets || user.tagBudgets) as Record<string, number>,
          },
          dateRange: {
            startDate: financialMetrics.startDateStr,
            endDate: financialMetrics.endDateStr,
            label: financialMetrics.periodLabel,
          },
          onChunk: (accumulatedText) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? { ...msg, text: accumulatedText, isStreaming: true }
                  : msg
              )
            );
          },
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (err: any) {
      console.error('Advisor Chat Error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
              ...msg,
              text: `⚠️ 分析失敗：${err.message || '連線逾時，請確認網路連線或 API Key 是否正確。'}`,
              isStreaming: false,
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 7. SVG 走勢平滑貝茲曲線座標
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 24;
  const paddingTop = 24;
  const paddingBottom = 32;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const pointsCoordinates = useMemo(() => {
    const points = financialMetrics.chartPoints;
    const maxVal = Math.max(financialMetrics.maxSingleDayExpense * 1.15, 1);

    return points.map((p, i) => {
      const x = paddingX + (i / (points.length - 1 || 1)) * innerWidth;
      const y = paddingTop + innerHeight - (p.amount / maxVal) * innerHeight;
      return { x, y, data: p };
    });
  }, [financialMetrics.chartPoints, financialMetrics.maxSingleDayExpense, innerWidth, innerHeight]);

  const curvePath = useMemo(() => {
    if (pointsCoordinates.length === 0) return '';
    if (pointsCoordinates.length === 1) return `M ${pointsCoordinates[0].x} ${pointsCoordinates[0].y}`;

    let path = `M ${pointsCoordinates[0].x} ${pointsCoordinates[0].y}`;
    for (let i = 0; i < pointsCoordinates.length - 1; i++) {
      const p0 = pointsCoordinates[i];
      const p1 = pointsCoordinates[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [pointsCoordinates]);

  const areaPath = useMemo(() => {
    if (!curvePath || pointsCoordinates.length === 0) return '';
    const first = pointsCoordinates[0];
    const last = pointsCoordinates[pointsCoordinates.length - 1];
    const bottomY = paddingTop + innerHeight;
    return `${curvePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [curvePath, pointsCoordinates, innerHeight]);

  const activeHoverPoint = hoveredPointIndex !== null ? pointsCoordinates[hoveredPointIndex] : null;

  const QUICK_QUESTIONS = [
    {
      label: '💰 評估預算是否合理夠用',
      query: `請深度評估我【${financialMetrics.periodLabel}】的總預算 NT$ ${financialMetrics.allocatedBudget.toLocaleString()} 是否合理夠用？請分析當前消耗速率與月底超支風險，並提供具體調配建議。`,
    },
    {
      label: '🏷️ 診斷標籤分類預算消耗',
      query: `請分析我【${financialMetrics.periodLabel}】各標籤類別的預算消耗進度，哪些標籤超支或吃緊？給予具體的類別預算調配建議。`,
    },
    {
      label: '📊 產出全貌視覺化診斷簡報',
      query: `請為我生成【${financialMetrics.periodLabel}】的財務全貌視覺化診斷簡報，並總結健康指標與亮點。`,
    },
    {
      label: '⚠️ 檢查疑似重複扣款與大額支出',
      query: `幫我檢查【${financialMetrics.periodLabel}】有沒有重複扣款、疑似異常或過高的大額支出？`,
    },
  ];

  return (
    <div className={`space-y-3.5 sm:space-y-4 pb-24 lg:pb-8 animate-in fade-in duration-200 ${isModal ? 'p-1' : ''}`}>
      {/* 1. 頂部標題與雙模式切換卡片 (手機版緊湊優化) */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl space-y-3 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 active:scale-95 shrink-0"
                title="返回上一頁"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  財務報表與 AI 顧問
                </h1>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                  REPORTS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                按月/區間精算 ‧ 各標籤預算進度 ‧ Gemini 極速顧問
              </p>
            </div>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition shrink-0"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 雙模式切換開關 (手機版滿版平分寬度) */}
        <div className="w-full p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setActiveMode('report')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${activeMode === 'report'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>報表模式</span>
          </button>

          <button
            onClick={() => setActiveMode('advisor')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${activeMode === 'advisor'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>顧問模式</span>
          </button>
        </div>
      </div>

      {/* 2. 🗓️ 時間維度選擇列 (手機版優化版面) */}
      <div className="glass-panel p-3.5 rounded-3xl space-y-3 shadow-sm border border-slate-800">
        {/* 切換按月分析 vs 自訂區間 (手機版雙標籤平分) */}
        <div className="w-full p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setTimeMode('month')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${timeMode === 'month'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>按月分析 (預設)</span>
          </button>

          <button
            onClick={() => setTimeMode('range')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${timeMode === 'range'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>自訂/快捷區間</span>
          </button>
        </div>

        {/* 時間導航控制器 */}
        {timeMode === 'month' ? (
          /* 按月切換導航器 (靠左/靠右平均分配，數字居中) */
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition active:scale-95 shrink-0"
              title="上一月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono font-black text-sm text-white px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex-1 text-center tracking-wide">
              {selectedYear} 年 {selectedMonth} 月
            </span>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition active:scale-95 shrink-0"
              title="下一月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToCurrentMonth}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700 shrink-0 active:scale-95"
            >
              本月
            </button>
          </div>
        ) : (
          /* 快捷區間按鈕群 */
          <div className="space-y-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pb-1 -mx-0.5 px-0.5">
              {(['7D', '30D', '90D', 'this_month', 'last_month', 'year'] as RangePreset[]).map((preset) => {
                const labels: Record<RangePreset, string> = {
                  '7D': '近 7 天',
                  '30D': '近 30 天',
                  '90D': '近 90 天',
                  this_month: '本月',
                  last_month: '上個月',
                  year: '今年',
                  custom: '自訂',
                };
                return (
                  <button
                    key={preset}
                    onClick={() => handleSelectRangePreset(preset)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition flex-shrink-0 border text-xs active:scale-95 ${rangePreset === preset
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {/* ✨ 美化自訂區間日期選擇器 (防裁切 + 獨立換行 + 點擊即開專屬質感日曆) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              {/* 第 1 行：起訖日期選擇膠囊 (點擊任意處立即喚起專屬深色日曆彈窗) */}
              <div className="flex items-center gap-2">
                {/* 起始日 */}
                <button
                  type="button"
                  onClick={() => setIsDatePickerModalOpen(true)}
                  className="relative flex-1 flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700/90 hover:border-emerald-500 focus:border-emerald-500 transition-all shadow-inner active:scale-95 group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-xs font-black text-slate-100 tracking-tight truncate">
                      {customStartDate}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/80 ml-1 shrink-0">
                    起
                  </span>
                </button>

                <span className="text-slate-500 text-xs font-bold shrink-0 px-0.5">至</span>

                {/* 結束日 */}
                <button
                  type="button"
                  onClick={() => setIsDatePickerModalOpen(true)}
                  className="relative flex-1 flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-900/95 border border-slate-700/90 hover:border-emerald-500 focus:border-emerald-500 transition-all shadow-inner active:scale-95 group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-xs font-black text-slate-100 tracking-tight truncate">
                      {customEndDate}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/80 ml-1 shrink-0">
                    訖
                  </span>
                </button>
              </div>

              {/* 第 2 行：獨立換行顯示「選擇期間共計 XX 天」 */}
              <button
                type="button"
                onClick={() => setIsDatePickerModalOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/50 transition text-[11px] text-slate-400 active:scale-95 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>自訂統計區間 (點擊開啟日曆)</span>
                </span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800/80">
                  共 {financialMetrics.totalDays} 天
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 模式 A：📊 報表與預算合理性診斷模式 (Report & Analytics) */}
      {/* ======================================================== */}
      {activeMode === 'report' && (
        <div className="space-y-3.5 sm:space-y-4">
          {/* 1. 💰 總預算合理性與夠用度深度診斷卡 (手機版版面強化) */}
          <div className="glass-panel p-4 sm:p-5 rounded-3xl space-y-3.5 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <div className="space-y-3 relative z-10">
              {/* 頂部標籤與狀態 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    BUDGET AUDIT
                  </span>
                  <span className="text-xs text-slate-400 font-bold">預算合理性與夠用度診斷</span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-xl text-xs font-bold border ${financialMetrics.adequacyStatus.bg} ${financialMetrics.adequacyStatus.border} ${financialMetrics.adequacyStatus.color} shadow-sm shrink-0`}
                >
                  {financialMetrics.adequacyStatus.label}
                </span>
              </div>

              {/* 主要金額與總預算展示 */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                    NT$ {financialMetrics.totalExpense.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-mono">
                    / 總預算 NT$ {financialMetrics.allocatedBudget.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 診斷描述 */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                {financialMetrics.adequacyStatus.desc}
              </p>

              {/* 讓 AI 深入評估預算按鈕 */}
              <button
                onClick={() => {
                  setActiveMode('advisor');
                  handleSend(
                    `請深度評估我【${financialMetrics.periodLabel}】的總預算 NT$ ${financialMetrics.allocatedBudget.toLocaleString()} 是否合理夠用？請分析當前消耗速率與月底超支風險，並提供具體調配建議。`
                  );
                }}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI 預算合理性評估</span>
              </button>
            </div>

            {/* 核心 4 大指標矩陣 (手機版 2x2 排列) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400">剩餘總預算</p>
                <p
                  className={`text-sm sm:text-base font-black font-mono mt-0.5 ${financialMetrics.remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  NT$ {financialMetrics.remainingBudget.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {financialMetrics.remainingBudget >= 0 ? '未超支' : '⚠️ 已透支'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400">每日安全可用額度</p>
                <p className="text-sm sm:text-base font-black font-mono text-amber-400 mt-0.5">
                  NT$ {financialMetrics.safeDailyRemaining.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  剩餘 {financialMetrics.daysRemaining} 天平均
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400">目前日均消耗</p>
                <p className="text-sm sm:text-base font-black font-mono text-slate-200 mt-0.5">
                  NT$ {financialMetrics.dailyAvg.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  已過 {financialMetrics.daysPassed} 天
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400">期末預估總花費</p>
                <p
                  className={`text-sm sm:text-base font-black font-mono mt-0.5 ${financialMetrics.projectedTotal > financialMetrics.allocatedBudget
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                    }`}
                >
                  NT$ {financialMetrics.projectedTotal.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {financialMetrics.projectedTotal > financialMetrics.allocatedBudget
                    ? `預估超支 NT$ ${(financialMetrics.projectedTotal - financialMetrics.allocatedBudget).toLocaleString()}`
                    : `預估結餘 NT$ ${(financialMetrics.allocatedBudget - financialMetrics.projectedTotal).toLocaleString()}`}
                </p>
              </div>
            </div>

            {/* 雙進度條對比：預算消耗 vs 時間天數進度 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">總預算已消耗比例：</span>
                  <span
                    className={`font-mono font-black ${financialMetrics.usagePercent > 100
                      ? 'text-rose-400'
                      : financialMetrics.usagePercent > 80
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                      }`}
                  >
                    {financialMetrics.usagePercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${financialMetrics.usagePercent > 100
                      ? 'bg-rose-500'
                      : financialMetrics.usagePercent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      }`}
                    style={{ width: `${Math.min(100, financialMetrics.usagePercent)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">週期時間已過比例：</span>
                  <span className="font-mono font-bold text-blue-400">
                    {financialMetrics.timeElapsedPercent}% ({financialMetrics.daysPassed} / {financialMetrics.totalDays} 天)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${financialMetrics.timeElapsedPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. 🏷️ 各標籤預算進度表 (手機版排版微調) */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-teal-950/80 border border-teal-800 text-teal-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">各標籤預算進度表</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      共 {financialMetrics.tagProgressList.length} 個標籤
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    實際花費 vs 標籤預算分配 ‧ 掌握各類別超支風險
                  </p>
                </div>
              </div>

              {/* 標籤進度表切換 Tabs (手機版滾動條) */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setTagFilterTab('all')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition flex-shrink-0 ${tagFilterTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  全部 ({financialMetrics.tagProgressList.length})
                </button>
                <button
                  onClick={() => setTagFilterTab('budgeted')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition flex-shrink-0 ${tagFilterTab === 'budgeted'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  已設預算 ({financialMetrics.budgetedTagCount})
                </button>
                <button
                  onClick={() => setTagFilterTab('alert')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 flex-shrink-0 ${tagFilterTab === 'alert'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                    }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>超支/警戒 ({financialMetrics.overBudgetTagCount})</span>
                </button>
              </div>
            </div>

            {/* 標籤進度列表 */}
            {displayedTags.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <p>此篩選條件下無標籤紀錄</p>
                <p className="text-[11px] text-slate-600">可至「設定 → 標籤分類與預算」為各標籤設定預算額度</p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-0.5">
                {displayedTags.map((tag) => {
                  const hasBudget = tag.hasBudget;
                  const usagePct = tag.budgetUsagePercent || 0;
                  const isOver = tag.isOverBudget;
                  const isWarn = tag.isWarning;

                  return (
                    <div
                      key={tag.name}
                      className={`p-3 rounded-2xl border transition-all space-y-2 ${isOver
                        ? 'bg-rose-950/20 border-rose-900/60 shadow-sm'
                        : isWarn
                          ? 'bg-amber-950/20 border-amber-900/50'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                    >
                      {/* 標籤名稱、金額與預算狀態 Badge */}
                      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-bold text-slate-100 text-xs sm:text-sm">#{tag.name}</span>

                          {/* 狀態標籤 */}
                          {hasBudget ? (
                            isOver ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> 超支 {usagePct - 100}%
                              </span>
                            ) : isWarn ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
                                消耗達 {usagePct}%
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                                進度 {usagePct}%
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                              未設預算
                            </span>
                          )}
                        </div>

                        {/* 實際花費 vs 標籤預算 */}
                        <div className="font-mono text-xs flex items-center gap-1.5 ml-auto">
                          <span className="font-black text-white">
                            NT$ {tag.amount.toLocaleString()}
                          </span>

                          {hasBudget && tag.budget ? (
                            <span className="text-slate-400 text-[10px]">
                              / ${tag.budget.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              ({tag.sharePercent}%)
                            </span>
                          )}

                          {hasBudget && tag.remaining !== undefined && (
                            <span
                              className={`text-[10px] font-bold ${tag.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                              {tag.remaining >= 0
                                ? `餘 $${tag.remaining.toLocaleString()}`
                                : `透支 $${Math.abs(tag.remaining).toLocaleString()}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 標籤預算進度條 */}
                      <div className="space-y-1">
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          {hasBudget ? (
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isOver
                                ? 'bg-rose-500'
                                : isWarn
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                }`}
                              style={{ width: `${Math.min(100, usagePct)}%` }}
                            />
                          ) : (
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${tag.sharePercent}%`, backgroundColor: tag.color }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. 📈 平滑支出走勢曲線 (SVG Expense Trend Curve) */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">支出每日走勢曲線</h3>
                  <p className="text-[11px] text-slate-400">
                    最高單日：NT$ {financialMetrics.maxSingleDayExpense.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>共 {financialMetrics.txCount} 筆交易</span>
              </div>
            </div>

            {/* SVG 曲線圖主體 */}
            <div className="relative w-full overflow-hidden pt-1">
              {activeHoverPoint && (
                <div
                  style={{
                    left: `${(activeHoverPoint.x / svgWidth) * 100}%`,
                    top: '0px',
                  }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-2 pointer-events-none bg-slate-900/95 border border-emerald-500/60 shadow-xl rounded-xl p-2 text-center text-xs animate-in fade-in zoom-in-95 backdrop-blur-md"
                >
                  <p className="text-[10px] text-slate-400 font-medium">{activeHoverPoint.data.label}</p>
                  <p className="text-xs font-black font-mono text-emerald-400">
                    NT$ {activeHoverPoint.data.amount.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-500">共 {activeHoverPoint.data.count} 筆支出</p>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-40 sm:h-48 overflow-visible cursor-crosshair"
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                <defs>
                  <linearGradient id="reportGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.38" />
                    <stop offset="60%" stopColor="#059669" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                  </linearGradient>

                  <filter id="reportGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 參考格線 */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const y = paddingTop + innerHeight * (1 - ratio);
                  const gridAmount = Math.round(financialMetrics.maxSingleDayExpense * ratio);
                  return (
                    <g key={ratio} opacity={0.35}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={svgWidth - paddingX - 4}
                        y={y - 4}
                        textAnchor="end"
                        fill="#64748B"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        ${gridAmount >= 1000 ? `${(gridAmount / 1000).toFixed(1)}k` : gridAmount}
                      </text>
                    </g>
                  );
                })}

                {areaPath && <path d={areaPath} fill="url(#reportGradient)" />}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#reportGlow)"
                  />
                )}

                {/* 各點與十字游標 */}
                {pointsCoordinates.map((pt, idx) => {
                  const isHovered = hoveredPointIndex === idx;
                  const isPeak = pt.data.amount === financialMetrics.maxSingleDayExpense && pt.data.amount > 0;

                  return (
                    <g key={idx}>
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={paddingTop}
                          x2={pt.x}
                          y2={paddingTop + innerHeight}
                          stroke="#10B981"
                          strokeDasharray="3 3"
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                      )}

                      {(isHovered || isPeak || financialMetrics.totalDays <= 14) && pt.data.amount > 0 && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : isPeak ? 4.5 : 3}
                          fill={isPeak ? '#F59E0B' : '#10B981'}
                          stroke="#020617"
                          strokeWidth={isHovered ? 2.5 : 1.5}
                        />
                      )}

                      <rect
                        x={pt.x - innerWidth / (pointsCoordinates.length * 2 || 1)}
                        y={0}
                        width={innerWidth / (pointsCoordinates.length || 1)}
                        height={svgHeight}
                        fill="transparent"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onTouchStart={() => setHoveredPointIndex(idx)}
                      />
                    </g>
                  );
                })}

                {/* X 軸日期文字 */}
                {pointsCoordinates
                  .filter((_, i) => {
                    if (financialMetrics.totalDays <= 14) return true;
                    if (financialMetrics.totalDays <= 31) return i % 5 === 0 || i === pointsCoordinates.length - 1;
                    return i % 15 === 0 || i === pointsCoordinates.length - 1;
                  })
                  .map((pt, i) => (
                    <text
                      key={i}
                      x={pt.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {pt.data.shortLabel}
                    </text>
                  ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 模式 B：💬 AI 顧問對話模式 (AI Advisor Chat Mode) */}
      {/* ======================================================== */}
      {activeMode === 'advisor' && (
        <div className="glass-panel rounded-3xl border border-slate-800 flex flex-col h-[600px] max-h-[75vh] overflow-hidden shadow-xl">
          {!hasGeminiApiKey ? (
            /* 尚未填入 API Key 提示 */
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-slate-100">啟用 Google Gemini 極速 AI 理財顧問</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  支援打字串流與深度標籤預算診斷，為您提供專屬的節約分析與財務監控。
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
                  {isSavingKey ? '儲存中...' : '立刻啟用極速 AI 顧問'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 顧問對話區域 */}
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

                    <div className="max-w-[88%] space-y-2.5">
                      {/* 內嵌視覺化圖表簡報卡 */}
                      {m.visualCard && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-lg space-y-2.5 text-xs text-slate-200 animate-in fade-in zoom-in-95">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                              {m.visualCard.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${m.visualCard.healthStatus.bg} ${m.visualCard.healthStatus.color}`}
                            >
                              {m.visualCard.healthStatus.label}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">總預算消耗進度</span>
                              <span className="font-mono font-bold text-emerald-400">
                                NT$ {m.visualCard.totalExpense.toLocaleString()} / NT${' '}
                                {m.visualCard.monthlyBudget.toLocaleString()} ({m.visualCard.usagePercent}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${m.visualCard.usagePercent > 100
                                  ? 'bg-rose-500'
                                  : m.visualCard.usagePercent > 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                  }`}
                                style={{ width: `${Math.min(100, m.visualCard.usagePercent)}%` }}
                              />
                            </div>
                          </div>

                          {m.visualCard.topTags.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {m.visualCard.topTags.map((tag) => (
                                <div
                                  key={tag.name}
                                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]"
                                >
                                  <div className="flex justify-between font-medium">
                                    <span className="text-slate-300 truncate">#{tag.name}</span>
                                    <span className="font-mono text-emerald-400 font-bold">{tag.percent}%</span>
                                  </div>
                                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                                    NT$ {tag.amount.toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI 文字對話內容 */}
                      {m.text ? (
                        <div
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${m.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60 shadow-sm'
                            }`}
                        >
                          {m.text}
                          {m.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
                          )}
                        </div>
                      ) : m.isStreaming ? (
                        <div className="bg-slate-800/90 border border-slate-700/60 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-300">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>AI 顧問正在精算【{financialMetrics.periodLabel}】財務模型並即時撰寫中...</span>
                        </div>
                      ) : null}
                    </div>

                    {m.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 快速問題推薦 */}
              <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-slate-400 font-bold flex-shrink-0 flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> 推薦：
                </span>
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSend(q.query)}
                    className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 flex-shrink-0 transition active:scale-95 disabled:opacity-40"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* 輸入欄 */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/90">
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
                    placeholder={`提問關於【${financialMetrics.periodLabel}】的預算、收支或節約問題...`}
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
      )}

      {/* ✨ 專屬高質感自訂日期區間選擇彈窗 (符合 Ledgy 暗色毛玻璃主題) */}
      <CustomDateRangePickerModal
        isOpen={isDatePickerModalOpen}
        onClose={() => setIsDatePickerModalOpen(false)}
        startDate={customStartDate}
        endDate={customEndDate}
        onConfirm={(newStart, newEnd) => {
          setCustomStartDate(newStart);
          setCustomEndDate(newEnd);
          setRangePreset('custom');
        }}
      />
    </div>
  );
};
