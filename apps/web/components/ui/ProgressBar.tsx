'use client';

import React from 'react';

export interface ProgressBarProps {
  percentage: number;
  variant?: 'emerald' | 'purple' | 'auto';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  maxLabel?: string;
  currentLabel?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  variant = 'auto',
  height = 'md',
  showLabel = false,
  maxLabel,
  currentLabel,
  className = '',
}) => {
  const safePercent = Math.max(0, Math.min(100, percentage));

  // 自動依據百分比變色
  const getAutoColor = (p: number) => {
    if (p > 90) return 'bg-rose-500 shadow-sm shadow-rose-500/50';
    if (p > 75) return 'bg-amber-500 shadow-sm shadow-amber-500/50';
    return 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
  };

  const getBarColor = () => {
    if (variant === 'auto') return getAutoColor(safePercent);
    if (variant === 'purple') return 'bg-purple-500 shadow-sm shadow-purple-500/50';
    return 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
  };

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{currentLabel || `進度: ${safePercent}%`}</span>
          {maxLabel && <span className="font-mono text-slate-300">{maxLabel}</span>}
        </div>
      )}
      <div className={`w-full ${heightClasses[height]} rounded-full bg-slate-800/80 overflow-hidden`}>
        <div
          className={`${heightClasses[height]} rounded-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
};
