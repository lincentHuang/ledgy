'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Sparkles,
  CheckCircle2,
  Trophy,
  RotateCcw,
  ShoppingBag,
  Store,
  Receipt,
  ChevronRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  generateMockInvoiceQrCode,
  parseTaiwanInvoiceQrCode,
  autoCategorizeInvoice,
  checkLotteryWinning,
  TaiwanInvoice,
} from '@app/shared';

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({ isOpen, onClose }) => {
  const { addInvoice } = useAppStore();
  const [scannedResult, setScannedResult] = useState<TaiwanInvoice | null>(null);

  // 當彈窗開啟或關閉時重置狀態與處理 ESC 關閉
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
    }
  }, [isOpen]);

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

  const handleSelectSample = (type: 'pxmart' | 'seven' | 'lottery') => {
    let mockData;
    if (type === 'pxmart') {
      mockData = generateMockInvoiceQrCode('PX88991234', '1130816', 540, '16740494', [
        { name: '冷藏美國牛五花肉片', qty: 1, price: 180 },
        { name: '舒潔抽取式衛生紙(8包)', qty: 1, price: 270 },
        { name: '原萃無糖日式綠茶', qty: 2, price: 45 },
      ]);
    } else if (type === 'seven') {
      mockData = generateMockInvoiceQrCode('UN55667788', '1130816', 225, '22555003', [
        { name: '7-11 御飯糰 (鮪魚)', qty: 1, price: 35 },
        { name: '特選拿鐵大杯', qty: 1, price: 55 },
        { name: '森田藥粧玻尿酸面膜', qty: 1, price: 135 },
      ]);
    } else {
      mockData = generateMockInvoiceQrCode('AB32117043', '1130816', 320, '23060248', [
        { name: '全家大杯經典美式', qty: 2, price: 45 },
        { name: '極鬆餅 (經典蜂蜜)', qty: 2, price: 35 },
        { name: '鹼性離子水 800ml', qty: 2, price: 25 },
        { name: '黑人抗敏牙膏', qty: 1, price: 110 },
      ]);
    }

    const invoice = parseTaiwanInvoiceQrCode(mockData.qr1, mockData.qr2);
    if (invoice) {
      const enriched = autoCategorizeInvoice(invoice);
      const prize = checkLotteryWinning(enriched.invoiceNumber, enriched.date);
      enriched.lotteryResult = prize;
      setScannedResult(enriched);

      if (prize.isWon) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    }
  };

  const handleConfirmAdd = () => {
    if (scannedResult) {
      addInvoice(scannedResult);
      onClose();
    }
  };

  // 計算各分類小計金額
  const categorySummary = useMemo(() => {
    if (!scannedResult || !scannedResult.items) return [];
    const map: Record<string, { name: string; amount: number; count: number }> = {};
    scannedResult.items.forEach((it) => {
      const cId = it.categoryId || 'food';
      const cName = it.categoryName || '餐飲飲食';
      if (!map[cId]) map[cId] = { name: cName, amount: 0, count: 0 };
      map[cId].amount += it.amount;
      map[cId].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [scannedResult]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* 點擊遮罩關閉 */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* 彈窗主體 (手機端為 Bottom-Sheet，電腦端為置中卡片) */}
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] rounded-t-[32px] sm:rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border-t sm:border border-slate-800 p-5 sm:p-6 overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 pb-8 sm:pb-6">
        {/* 背景光暈效果 */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 手機版頂部拖曳把手指示條 */}
        <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">台灣電子發票明細與智慧分類</h2>
              <p className="text-[11px] text-slate-400">
                點選發票範例 · 體驗 AI 逐項辨識分類與自動對獎
              </p>
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

        {/* 1. 範例選擇列表 (保留發票範例，去除相機/OCR掃描畫面) */}
        {!scannedResult && (
          <div className="my-3 space-y-3 overflow-y-auto pr-0.5 flex-1">
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                點擊下方真實電子發票範例，系統將立即讀取並展示 AI 多品項智慧分類、明細歸檔與統一發票開獎對獎流程。
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* 範例 1：全聯超市採買 */}
              <button
                onClick={() => handleSelectSample('pxmart')}
                className="w-full p-4 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 flex items-center justify-between text-left transition active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                        全聯超市採買
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono">
                        PX88991234
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      冷藏美國牛五花肉片、舒潔衛生紙、原萃綠茶
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 font-medium">
                        3 項品項 · 生鮮雜貨 AI 分類
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 flex items-center gap-1.5">
                  <span className="font-mono text-sm font-extrabold text-white">NT$ 540</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
              </button>

              {/* 範例 2：7-11 複合採買 */}
              <button
                onClick={() => handleSelectSample('seven')}
                className="w-full p-4 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 flex items-center justify-between text-left transition active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-950/90 border border-teal-800/80 text-teal-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-teal-300 transition">
                        7-ELEVEN 複合採買
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono">
                        UN55667788
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      7-11 御飯糰 (鮪魚)、特選拿鐵大杯、森田藥粧面膜
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-800/70 text-teal-300 font-medium">
                        3 項品項 · 餐飲與美妝混合辨識
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 flex items-center gap-1.5">
                  <span className="font-mono text-sm font-extrabold text-white">NT$ 225</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
                </div>
              </button>

              {/* 範例 3：中獎發票測試 (幸運頭獎 20 萬) */}
              <button
                onClick={() => handleSelectSample('lottery')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-800/80 to-slate-800/70 hover:from-amber-950/60 border border-amber-500/50 hover:border-amber-400 flex items-center justify-between text-left transition active:scale-[0.98] group shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-amber-300 group-hover:text-amber-200 transition flex items-center gap-1">
                        <span>全家超商中獎發票</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
                        AB32117043
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 truncate">
                      大杯美式、經典蜂蜜鬆餅、離子水、抗敏牙膏
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-bold">
                        🎉 對中統一發票頭獎 NT$ 200,000！
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 flex items-center gap-1.5">
                  <span className="font-mono text-sm font-extrabold text-amber-400">NT$ 320</span>
                  <ChevronRight className="w-4 h-4 text-amber-400/70 group-hover:text-amber-300 transition" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. 範例載入後的詳細明細與 AI 分類結果卡片 */}
        {scannedResult && (
          <div className="my-2 space-y-3.5 overflow-y-auto pr-0.5 flex-1 animate-in zoom-in-95 duration-200">
            {/* 中獎提示 */}
            {scannedResult.lotteryResult?.isWon ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur shrink-0">
                  <Trophy className="w-6 h-6 text-yellow-200 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-white text-rose-600 px-2 py-0.5 rounded-full">
                      中獎啦！
                    </span>
                    <span className="font-bold text-sm">
                      {scannedResult.lotteryResult.prizeName} NT${' '}
                      {scannedResult.lotteryResult.prizeAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 mt-0.5">
                    {scannedResult.lotteryResult.detail}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>開獎號碼比對完畢：本期未中獎，繼續加油！</span>
              </div>
            )}

            {/* 發票主資訊卡 */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-black text-white">
                  {scannedResult.invoiceNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono">{scannedResult.date}</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  {scannedResult.sellerName || `統一編號 ${scannedResult.sellerGUI}`}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">隨機碼：{scannedResult.randomCode}</span>
              </div>

              {/* 🌟 AI 單品智慧分類與購物清單 */}
              {scannedResult.items && scannedResult.items.length > 0 && (
                <div className="pt-3 border-t border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      真實購物清單 ({scannedResult.items.length} 項品項已完成 AI 分類)
                    </p>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {scannedResult.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 truncate">{it.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">x{it.quantity}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 font-medium">
                              #{it.tags?.[0] || it.categoryName || '未歸類'}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold font-mono text-slate-200 shrink-0">
                          NT$ {it.amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 標籤佔比統計 */}
                  {categorySummary.length > 1 && (
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] space-y-1 text-slate-300">
                      <span className="text-slate-400 font-semibold text-[10px]">📊 標籤金額分佈：</span>
                      <div className="flex flex-wrap gap-2">
                        {categorySummary.map(([catId, info]) => (
                          <span key={catId} className="bg-slate-800 px-2 py-0.5 rounded-md text-[10px]">
                            #{info.name}：<strong className="text-emerald-400 font-mono">NT$ {info.amount}</strong> ({info.count}品項)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 總額 */}
              <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center">
                <span className="font-bold text-xs text-slate-300">發票總額</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  NT$ {scannedResult.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setScannedResult(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重新選擇範例
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-[2] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                登錄發票並自動歸檔記帳
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
