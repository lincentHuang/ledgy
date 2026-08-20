'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      options = [],
      leftIcon,
      error,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-[11px] font-bold text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            disabled={disabled}
            className={`w-full py-2 rounded-xl text-xs sm:text-sm font-medium glass-input appearance-none focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'px-3'
            } pr-8 ${error ? 'border-rose-500/80' : ''} ${className}`}
            {...props}
          >
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-2.5 text-slate-400 pointer-events-none">
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </div>
        </div>
        {error && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
