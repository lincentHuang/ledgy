'use client';

import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  dot?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'emerald' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'emerald',
  size = 'sm',
  className = '',
}: TabsProps<T>) {
  const itemPadding =
    size === 'md' ? 'px-4 py-2.5 text-xs sm:text-sm' : 'px-3.5 py-2 text-xs';

  const activeStyles =
    variant === 'purple'
      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-md shadow-purple-600/25'
      : 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/25';

  const inactiveStyles =
    'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40';

  return (
    <div
      className={`flex gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl font-semibold overflow-x-auto no-scrollbar shadow-sm select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl border flex-shrink-0 transition-all duration-200 active:scale-95 ${itemPadding} ${
              isActive ? activeStyles : inactiveStyles
            }`}
          >
            {tab.icon && <span className="inline-flex shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.dot && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />}
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
