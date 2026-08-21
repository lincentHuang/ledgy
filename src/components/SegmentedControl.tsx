'use client';

import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'emerald' | 'purple';
  className?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  variant = 'emerald',
  className = '',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const sizeClasses =
    size === 'xs'
      ? 'p-0.5 text-[11px]'
      : size === 'md'
      ? 'p-1.5 text-sm'
      : 'p-1 text-xs';

  const itemPadding =
    size === 'xs'
      ? 'px-2.5 py-1'
      : size === 'md'
      ? 'px-4 py-2'
      : 'px-3 py-1.5';

  const activeStyles =
    variant === 'purple'
      ? 'bg-purple-600 border-purple-500 text-white font-black shadow-md shadow-purple-600/25'
      : 'bg-emerald-600 border-emerald-500 text-white font-black shadow-md shadow-emerald-600/25';

  const inactiveStyles =
    'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50';

  return (
    <div
      className={`inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl font-bold shadow-sm select-none ${
        fullWidth ? 'w-full grid' : ''
      } ${sizeClasses} ${className}`}
      style={fullWidth ? { gridTemplateColumns: `repeat(${options.length}, 1fr)` } : undefined}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border transition-all duration-200 active:scale-95 ${itemPadding} ${
              isSelected ? activeStyles : inactiveStyles
            }`}
          >
            {opt.icon && <span className="inline-flex shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
