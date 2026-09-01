'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'md',
  children,
  footer,
  className = '',
}) => {
  // 監聽 ESC 鍵自動關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      {/* 遮罩點擊關閉 */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* 彈窗內容本體 */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} max-h-[var(--app-height,90vh)] overflow-y-auto rounded-3xl glass-modal text-slate-100 shadow-2xl p-5 sm:p-6 my-auto z-10 animate-in fade-in zoom-in-95 duration-200 border border-white/10 ${className}`}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && <h2 className="text-sm sm:text-base font-bold text-white truncate">{title}</h2>}
                {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition flex-shrink-0"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="space-y-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
