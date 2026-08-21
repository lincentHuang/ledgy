'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  PieChart as PieChartIcon,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import { SegmentedControl, Card } from '@/components';

type TimeRange = '7D' | '30D' | '90D' | '1Y';

export const AnalyticsView: React.FC = () => {
  const { filteredTransactions } = useAppStore();
  const [range, setRange] = useState<TimeRange>('30D');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // 依時間範圍計算天數
  const rangeDays = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365;

  // 計算選定範圍內每日的支出走勢資料
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const points: { dateStr: string; label: string; shortLabel: string; amount: number; count: number }[] = [];

    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const m = d.getMonth() + 1;
      const day = d.getDate();

      const dayTxs = filteredTransactions.filter(
        (t) => t.date === dateStr && t.type === 'expense'
      );
      const amount = dayTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

      points.push({
        dateStr,
        label: `${m}月${day}日`,
        shortLabel: range === '7D' ? `週${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}` : `${m}/${day}`,
        amount,
        count: dayTxs.length,
      });
    }

    return points;
  }, [filteredTransactions, rangeDays, range]);

  const totalExpense = chartData.reduce((acc, cur) => acc + cur.amount, 0);
  const avgExpense = Math.round(totalExpense / chartData.length);
  const maxExpense = Math.max(...chartData.map((p) => p.amount), 1);
  const minExpense = Math.min(...chartData.map((p) => p.amount));

  // 計算前期比較 (漲跌幅趨勢)
  const prevPeriodTxs = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - rangeDays * 2);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - rangeDays);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    return filteredTransactions.filter(
      (t) => t.date >= startStr && t.date < endStr && t.type === 'expense'
    );
  }, [filteredTransactions, rangeDays]);

  const prevTotalExpense = prevPeriodTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const percentChange =
    prevTotalExpense > 0
      ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100)
      : 0;

  // 標籤支出佔比排名 (Tag Stats Ranking)
  const tagStats = useMemo(() => {
    const totals: Record<string, number> = {};
    const relevantDateSet = new Set(chartData.map((p) => p.dateStr));

    filteredTransactions
      .filter((t) => t.type === 'expense' && relevantDateSet.has(t.date))
      .forEach((t) => {
        const tagKey = t.tags?.[0] || '未歸類';
        totals[tagKey] = (totals[tagKey] || 0) + t.amount;
      });

    const TAG_COLORS = [
      '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
      '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
      '#F43F5E', '#F97316', '#EAB308', '#84CC16'
    ];

    return Object.entries(totals)
      .map(([tagName, amount], idx) => {
        const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        return {
          id: tagName,
          name: tagName,
          color: TAG_COLORS[idx % TAG_COLORS.length],
          amount,
          percent,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [chartData, filteredTransactions, totalExpense]);

  // 產生 SVG 股票曲線座標
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingX = 20;
  const paddingTop = 30;
  const paddingBottom = 40;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const pointsCoordinates = useMemo(() => {
    return chartData.map((p, i) => {
      const x = paddingX + (i / (chartData.length - 1 || 1)) * innerWidth;
      const y = paddingTop + innerHeight - (p.amount / (maxExpense * 1.15 || 1)) * innerHeight;
      return { x, y, data: p };
    });
  }, [chartData, maxExpense, innerWidth, innerHeight]);

  // 建立平滑貝茲曲線路徑
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

  // 建立漸層面積封閉路徑
  const areaPath = useMemo(() => {
    if (!curvePath || pointsCoordinates.length === 0) return '';
    const first = pointsCoordinates[0];
    const last = pointsCoordinates[pointsCoordinates.length - 1];
    const bottomY = paddingTop + innerHeight;
    return `${curvePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [curvePath, pointsCoordinates, innerHeight]);

  const activePoint = hoveredPointIndex !== null ? pointsCoordinates[hoveredPointIndex] : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 📈 股票式走勢看板 (Stock Candle/Trend Panel) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4 relative overflow-hidden">
        {/* 背景光暈效果 */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* 頂部：股票代號式抬頭與週期切換 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                EXPENSE TREND
              </span>
              <span className="text-xs text-slate-400 font-bold">總支出走勢曲線</span>
            </div>

            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                NT$ {totalExpense.toLocaleString()}
              </span>

              {/* 漲跌幅 Badge */}
              <div
                className={`flex items-center gap-0.5 text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                  percentChange <= 0
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-900'
                }`}
              >
                {percentChange <= 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`}</span>
                <span className="text-[10px] opacity-70 font-normal ml-0.5">vs 前期</span>
              </div>
            </div>
          </div>

          {/* 週期選擇器 (7D / 30D / 90D / 1Y) */}
          <SegmentedControl
            value={range}
            onChange={(r) => {
              setRange(r as TimeRange);
              setHoveredPointIndex(null);
            }}
            options={[
              { value: '7D', label: '7D' },
              { value: '30D', label: '30D' },
              { value: '90D', label: '90D' },
              { value: '1Y', label: '1Y' },
            ]}
          />
        </div>

        {/* 📊 股票曲線圖 (SVG Curve Chart) */}
        <div className="relative w-full overflow-hidden pt-2">
          {/* 當前 Hover 數據浮動卡 */}
          {activePoint && (
            <div
              style={{
                left: `${(activePoint.x / svgWidth) * 100}%`,
                top: '0px',
              }}
              className="absolute z-20 -translate-x-1/2 -translate-y-2 pointer-events-none bg-slate-900/95 border border-emerald-500/60 shadow-xl rounded-xl p-2 text-center text-xs animate-in fade-in zoom-in-95 backdrop-blur-md"
            >
              <p className="text-[10px] text-slate-400 font-medium">{activePoint.data.label}</p>
              <p className="text-xs font-black font-mono text-emerald-400">
                NT$ {activePoint.data.amount.toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-500">共 {activePoint.data.count} 筆支出</p>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-56 overflow-visible cursor-crosshair"
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            <defs>
              {/* 曲線下方漸層填充 */}
              <linearGradient id="stockGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
              </linearGradient>

              {/* 曲線發光霓虹效果 */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 橫向參考格線 (Grid Lines) */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = paddingTop + innerHeight * (1 - ratio);
              const gridAmount = Math.round(maxExpense * ratio);
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

            {/* 漸層面積 */}
            {areaPath && <path d={areaPath} fill="url(#stockGradient)" />}

            {/* 綠色走勢曲線 */}
            {curvePath && (
              <path
                d={curvePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#neonGlow)"
              />
            )}

            {/* 各點與互動熱區 */}
            {pointsCoordinates.map((pt, idx) => {
              const isHovered = hoveredPointIndex === idx;
              const isPeak = pt.data.amount === maxExpense && maxExpense > 0;

              return (
                <g key={idx}>
                  {/* Hover 垂直十字線 (Crosshair) */}
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

                  {/* 點標記 */}
                  {(isHovered || isPeak || range === '7D') && pt.data.amount > 0 && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isPeak ? 4.5 : 3}
                      fill={isPeak ? '#F59E0B' : '#10B981'}
                      stroke="#020617"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="transition-all"
                    />
                  )}

                  {/* 透明觸發區 */}
                  <rect
                    x={pt.x - innerWidth / (chartData.length * 2)}
                    y={0}
                    width={innerWidth / chartData.length}
                    height={svgHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onTouchStart={() => setHoveredPointIndex(idx)}
                  />
                </g>
              );
            })}

            {/* X 軸日期標籤 */}
            {pointsCoordinates
              .filter((_, i) => {
                if (range === '7D') return true;
                if (range === '30D') return i % 5 === 0 || i === pointsCoordinates.length - 1;
                if (range === '90D') return i % 15 === 0 || i === pointsCoordinates.length - 1;
                return i % 60 === 0 || i === pointsCoordinates.length - 1;
              })
              .map((pt, i) => (
                <text
                  key={i}
                  x={pt.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {pt.data.shortLabel}
                </text>
              ))}
          </svg>
        </div>

        {/* 底部摘要指標 (最高日 / 日均 / 最低日) */}
        <div className="grid grid-cols-3 divide-x divide-slate-800 pt-3 border-t border-slate-800/80 text-center text-xs">
          <div>
            <p className="text-[10px] text-slate-400">週期日均</p>
            <p className="font-mono font-bold text-slate-200 mt-0.5">
              NT$ {avgExpense.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">最高單日</p>
            <p className="font-mono font-bold text-amber-400 mt-0.5">
              NT$ {maxExpense.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">記錄筆數</p>
            <p className="font-mono font-bold text-slate-200 mt-0.5">
              {chartData.reduce((s, p) => s + p.count, 0)} 筆
            </p>
          </div>
        </div>
      </div>

      {/* 💼 標籤支出持股佔比 (Portfolio Tag Breakdown) */}
      <div className="glass-panel rounded-3xl p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">標籤支出持股佔比</h3>
              <p className="text-[11px] text-slate-400">依各標籤金額佔總支出百分比排序</p>
            </div>
          </div>
        </div>

        {/* 標籤長條圖列表 */}
        {tagStats.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-500">此週期無任何支出數據</p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {tagStats.map((tag) => (
              <div key={tag.id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-bold text-slate-200">#{tag.name}</span>
                  </div>
                  <div className="font-mono text-slate-300">
                    <span className="font-bold">NT$ {tag.amount.toLocaleString()}</span>
                    <span className="text-slate-400 ml-1.5 text-[11px]">({tag.percent}%)</span>
                  </div>
                </div>
                {/* 進度條 */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${tag.percent}%`, backgroundColor: tag.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🤖 AI 走勢洞察 (AI Insight) */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-3 shadow-sm">
        <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-100 flex items-center gap-1.5">
            <span>AI 走勢診斷報告</span>
            <span className="text-[10px] text-emerald-400 font-mono">● 即時運算</span>
          </p>
          <p className="text-slate-400 leading-relaxed">
            {percentChange <= 0
              ? `本週期花費控制良好，相較前期下降了 ${Math.abs(percentChange)}%，主要節省在日常生活與餐飲。`
              : `本週期總支出增長了 ${percentChange}%，單日最高達到 NT$ ${maxExpense.toLocaleString()}，建議檢視非必要固定開支。`}
          </p>
        </div>
      </div>
    </div>
  );
};
