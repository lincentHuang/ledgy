'use client';

import React from 'react';
import { FinancialReportView } from './FinancialReportView';

interface FinancialChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialChatModal: React.FC<FinancialChatModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 flex flex-col overflow-y-auto p-4 sm:p-5">
        <FinancialReportView isModal={true} onClose={onClose} />
      </div>
    </div>
  );
};
