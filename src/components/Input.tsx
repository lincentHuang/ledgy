'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      leftIcon,
      rightElement,
      mono = false,
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
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full py-2 rounded-xl text-xs sm:text-sm glass-input placeholder-slate-500 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'px-3'
            } ${rightElement ? 'pr-10' : 'pr-3'} ${mono ? 'font-mono' : ''} ${
              error ? 'border-rose-500/80 focus:ring-rose-500/30' : ''
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[10px] text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
