'use client';

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
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
        <textarea
          ref={ref}
          disabled={disabled}
          className={`w-full p-3 rounded-xl text-xs sm:text-sm glass-input placeholder-slate-500 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-rose-500/80 focus:ring-rose-500/30' : ''
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-[10px] text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[10px] text-slate-400 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
