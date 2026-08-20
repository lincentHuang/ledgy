'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'panel' | 'card' | 'modal' | 'plain';
  glow?: 'emerald' | 'purple' | 'teal' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  panel: 'glass-panel rounded-3xl',
  card: 'glass-card rounded-2xl',
  modal: 'glass-modal rounded-3xl',
  plain: 'bg-slate-900/90 border border-slate-800 rounded-2xl',
};

const glowStyles: Record<NonNullable<CardProps['glow']>, string> = {
  emerald: 'border-emerald-500/30 shadow-lg shadow-emerald-500/10',
  purple: 'border-purple-500/30 shadow-lg shadow-purple-500/10',
  teal: 'border-teal-500/30 shadow-lg shadow-teal-500/10',
  none: '',
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = '',
      variant = 'panel',
      glow = 'none',
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`relative overflow-hidden transition-all duration-200 ${variantStyles[variant]} ${glowStyles[glow]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 pb-3 border-b border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <h3 className={`font-black text-sm sm:text-base text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <p className={`text-xs text-slate-400 mt-0.5 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return <div className={`pt-3 ${className}`} {...props}>{children}</div>;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`flex items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs text-slate-400 ${className}`} {...props}>
      {children}
    </div>
  );
};
