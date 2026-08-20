'use client';

import React from 'react';

export type BadgeVariant = 'emerald' | 'purple' | 'amber' | 'rose' | 'sky' | 'slate';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 shadow-sm shadow-emerald-950/30',
  purple: 'bg-purple-950/80 text-purple-300 border-purple-800/80 shadow-sm shadow-purple-950/30',
  amber: 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-sm shadow-amber-950/30',
  rose: 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-sm shadow-rose-950/30',
  sky: 'bg-sky-950/80 text-sky-300 border-sky-800/80 shadow-sm shadow-sky-950/30',
  slate: 'bg-slate-800 text-slate-300 border-slate-700',
};

const dotStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-emerald-400',
  purple: 'bg-purple-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  sky: 'bg-sky-400',
  slate: 'bg-slate-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] rounded-md gap-1',
  sm: 'px-2 py-0.5 text-xs rounded-lg gap-1.5',
  md: 'px-2.5 py-1 text-xs rounded-xl gap-1.5 font-bold',
};

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'emerald',
  size = 'xs',
  dot = false,
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center border font-bold select-none tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};
