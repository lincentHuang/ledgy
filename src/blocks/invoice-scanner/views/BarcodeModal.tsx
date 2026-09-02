'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Copy,
  Check,
  Users,
  Edit3,
  QrCode,
  Sparkles,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ isOpen, onClose, onOpenScanner }) => {
  const { user, household, updateUserProfile } = useAppStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(user.defaultCarrierCode || '/AB1234+');
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(user.defaultCarrierCode || '/AB1234+');

  useEffect(() => {
    if (isOpen && svgRef.current) {
      try {
        JsBarcode(svgRef.current, selectedCarrier.toUpperCase(), {
          format: 'CODE39',
          lineColor: '#000000',
          width: 2.5,
          height: 90,
          displayValue: true,
          font: 'monospace',
          fontSize: 20,
          textMargin: 8,
          background: '#ffffff',
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [isOpen, selectedCarrier]);

  // ESC 鍵關閉
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

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedCarrier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    let clean = editVal.trim().toUpperCase();
    if (!clean.startsWith('/')) clean = '/' + clean;
    setSelectedCarrier(clean);
    updateUserProfile({ defaultCarrierCode: clean });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* 點擊遮罩關閉 */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* 彈窗本體 (手機端為 Bottom-Sheet，電腦端為置中卡片) */}
      <div className="relative w-full sm:max-w-sm max-h-[92dvh] rounded-t-[32px] sm:rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border-t sm:border border-slate-800 p-5 sm:p-6 overflow-y-auto flex flex-col z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 pb-8 sm:pb-6">
        {/* 手機版頂部拖曳把手指示條 */}
        <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              條
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">手機條碼載具</h2>
              <p className="text-[11px] text-slate-400">結帳出示條碼 · 快速刷取載具</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 條碼高亮顯示區域 (高對比純白底色，方便超商 POS 機刷讀) */}
        <div className="bg-white rounded-2xl border-2 border-slate-900/10 p-4 sm:p-5 shadow-inner flex flex-col items-center justify-center my-3">
          <div className="w-full overflow-hidden flex justify-center py-1">
            <svg ref={svgRef} className="max-w-full h-auto"></svg>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-900">
              {selectedCarrier}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition active:scale-95 flex items-center gap-1 text-xs font-semibold"
              title="複製載具條碼"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-slate-500">複製</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 編輯條碼 / 載具號碼顯示 */}
        {isEditing ? (
          <div className="mt-1 flex items-center gap-2 bg-slate-800/90 p-2 rounded-2xl border border-slate-700">
            <input
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              placeholder="/ABC1234"
              className="flex-1 px-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={8}
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition"
            >
              儲存
            </button>
            <button
              onClick={() => {
                setEditVal(selectedCarrier);
                setIsEditing(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 transition"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1 px-1 py-1">
            <span>載具號碼：<strong className="text-slate-200 font-mono">{selectedCarrier}</strong></span>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline text-xs py-1 px-2 rounded-lg hover:bg-slate-800 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              修改我的條碼
            </button>
          </div>
        )}

        {/* 掃描發票範例體驗入口按鈕 */}
        {onOpenScanner && (
          <button
            onClick={() => {
              onClose();
              onOpenScanner();
            }}
            className="w-full mt-4 p-3.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 flex items-center justify-between text-xs text-slate-300 transition group text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-200 group-hover:text-emerald-300 transition flex items-center gap-1.5">
                  <span>掃描發票範例體驗</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </p>
                <p className="text-[11px] text-slate-400">免相機權限 · 立即體驗發票明細與 AI 分類</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/70 px-3 py-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition shrink-0 ml-2">
              查看範例
            </span>
          </button>
        )}

        {/* 家庭成員載具快速切換 */}
        {household && household.members.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              切換家庭成員載具：
            </p>
            <div className="grid grid-cols-2 gap-2">
              {household.members.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => {
                    const code = m.carrierCode || '/AB1234+';
                    setSelectedCarrier(code);
                    setEditVal(code);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs active:scale-95 ${
                    selectedCarrier === (m.carrierCode || '/AB1234+')
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold'
                      : 'border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <p className="truncate font-semibold">{m.displayName}</p>
                  <p className="text-[10px] font-mono text-slate-500">{m.carrierCode || '/AB1234+'}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
