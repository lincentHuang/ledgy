'use client';

import React from 'react';

export interface TagPillProps {
  tag: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  count?: number;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'emerald' | 'purple';
  className?: string;
}

export const TagPill: React.FC<TagPillProps> = ({
  tag,
  active = false,
  onClick,
  onRemove,
  count,
  size = 'sm',
  variant = 'emerald',
  className = '',
}) => {
  const displayTag = tag.startsWith('#') ? tag : `#${tag}`;

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'md'
      ? 'px-3 py-1.5 text-xs'
      : 'px-2.5 py-1 text-[11px]';

  const activeClasses =
    variant === 'purple'
      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-md shadow-purple-600/20'
      : 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20';

  const inactiveClasses =
    'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? 'true' : 'false'}
      className={`inline-flex items-center gap-1 rounded-xl border flex-shrink-0 font-medium select-none transition-all duration-200 active:scale-95 ${
        active ? activeClasses : inactiveClasses
      } ${sizeClasses} ${className}`}
    >
      <span>{displayTag}</span>
      {count !== undefined && (
        <span
          className={`text-[9px] font-mono px-1 rounded-md ${
            active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-rose-400 opacity-70 hover:opacity-100 transition p-0.5 rounded"
          title="移除此標籤"
        >
          ✕
        </span>
      )}
    </button>
  );
};
