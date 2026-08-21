'use client';

import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  glow?: 'emerald' | 'purple' | 'teal' | 'none';
  variant?: 'panel' | 'card' | 'plain';
  valueColor?: string;
  progress?: number;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  glow = 'none',
  variant = 'card',
  valueColor = 'text-white',
  progress,
  className = '',
}) => {
  return (
    <Card variant={variant} glow={glow} padding="md" className={`space-y-2.5 ${className}`}>
      {/* Top Title & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 font-bold tracking-tight truncate">{title}</span>
        {icon && (
          <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${valueColor}`}>
          {typeof value === 'number' ? `NT$ ${value.toLocaleString()}` : value}
        </span>

        {trend && (
          <Badge
            variant={trend.direction === 'down' ? 'emerald' : trend.direction === 'up' ? 'rose' : 'slate'}
            size="xs"
          >
            {trend.value}
            {trend.label && <span className="opacity-70 font-normal ml-0.5">{trend.label}</span>}
          </Badge>
        )}
      </div>

      {/* Subtitle / Micro Progress */}
      {subtitle && <p className="text-[11px] text-slate-400 leading-tight truncate">{subtitle}</p>}

      {progress !== undefined && (
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress > 90 ? 'bg-rose-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </Card>
  );
};
