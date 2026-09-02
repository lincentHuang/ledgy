'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Sparkles,
  CheckCircle2,
  Trophy,
  RotateCcw,
  ShoppingBag,
  Receipt,
  ChevronRight,
  Zap,
  Camera,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  generateMockInvoiceQrCode,
  parseTaiwanInvoiceQrCode,
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
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // 關閉相機掃描器
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  // 啟動相機掃描器
  const startScanner = async () => {
    const container = document.getElementById('qr-reader');
    if (!container) return;

    // 若原本已有執行中的實例，先停止
    if (html5QrCodeRef.current?.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
    }

    try {
      setCameraError(null);
      setIsScanning(true);
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {
          // 忽略單幀未偵測到條碼的微小錯誤
        }
      );
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setCameraError('未偵測到可用相機或相機權限未開放。您也可以直接點擊下方範例進行體驗。');
      setIsScanning(false);
    }
  };

  // 監聽彈窗開關與結果狀態，自動啟動/停止相機
  useEffect(() => {
    let isMounted = true;
    if (isOpen && !scannedResult) {
      const timer = setTimeout(() => {
        if (isMounted) {
          startScanner();
        }
      }, 150);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, scannedResult]);

  // ESC 鍵監聽
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopScanner();
        onClose();
      }
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

  // QR Code 解碼與台灣電子發票解析
  const handleQrDecoded = (decodedText: string) => {
    const invoice = parseTaiwanInvoiceQrCode(decodedText);
    if (invoice) {
      stopScanner();
      const prize = checkLotteryWinning(invoice.invoiceNumber, invoice.date);
      invoice.lotteryResult = prize;
      setScannedResult(invoice);

      if (prize.isWon) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    } else {
      setScanHint('已偵測到 QR Code，請對準電子發票「左側」主要條碼（包含金額與品項）');
      setTimeout(() => {
        setScanHint(null);
      }, 3500);
    }
  };

  // 單一範例發票載入（全聯超市採買）
  const handleLoadSample = () => {
    stopScanner();
    const mockData = generateMockInvoiceQrCode('PX88991234', '1130816', 540, '16740494', [
      { name: '冷藏美國牛五花肉片', qty: 1, price: 180 },
      { name: '舒潔抽取式衛生紙(8包)', qty: 1, price: 270 },
      { name: '原萃無糖日式綠茶', qty: 2, price: 45 },
    ]);

    const invoice = parseTaiwanInvoiceQrCode(mockData.qr1, mockData.qr2);
    if (invoice) {
      const prize = checkLotteryWinning(invoice.invoiceNumber, invoice.date);
      invoice.lotteryResult = prize;
      setScannedResult(invoice);

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
      stopScanner();
      onClose();
    }
  };

  const handleModalClose = () => {
    stopScanner();
    onClose();
  };

  // 計算分類小計金額
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
      <div className="fixed inset-0" onClick={handleModalClose} />

      {/* 彈窗主體 (手機端為 Bottom-Sheet，電腦端為置中卡片) */}
      <div className="relative w-full sm:max-w-md max-h-[92dvh] rounded-t-[32px] sm:rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border-t sm:border border-slate-800 p-5 sm:p-6 overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 pb-8 sm:pb-6">
        {/* 背景光暈效果 */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 手機版頂部拖曳把手指示條 */}
        <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">台灣電子發票掃描</h2>
              <p className="text-[11px] text-slate-400">
                對準發票左側 QR Code · AI 自動逐項分類與對獎
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 相機掃描視窗 + 快速測試範例（未掃描時顯示） */}
        {!scannedResult && (
          <div className="my-3 space-y-3 overflow-y-auto pr-0.5 flex-1">
            {/* 📷 相機掃描視窗 (手機版優先尺寸) */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[250px] max-h-[300px] shadow-inner [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl [&>div]:!border-none [&>div]:!shadow-none [&_img]:hidden">
              <div id="qr-reader" className="w-full h-full" />

              {/* 掃描對焦框裝飾 (當相機運作中顯示) */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 sm:w-52 sm:h-52">
                    {/* 四個綠色轉角引導線 */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                    {/* 掃描動態雷射線 */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse top-1/2" />
                  </div>
                  <p className="mt-3 text-[11px] font-medium text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700/60 backdrop-blur-sm shadow-md">
                    請將發票左側 QR Code 置於方框內
                  </p>
                </div>
              )}

              {/* 相機未開啟/錯誤狀態提示 */}
              {cameraError && (
                <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center bg-slate-950/95 text-slate-400 space-y-2">
                  <Camera className="w-10 h-10 text-slate-600 mb-1" />
                  <p className="text-xs text-slate-300 font-medium max-w-xs leading-relaxed">{cameraError}</p>
                  <button
                    onClick={startScanner}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                  >
                    重新啟動相機
                  </button>
                </div>
              )}
            </div>

            {/* 提示訊息 */}
            {scanHint && (
              <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{scanHint}</span>
              </div>
            )}

            {/* ⚡ 快速測試範例（只保留一個範例） */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                沒有紙本發票？點擊一鍵載入範例：
              </p>
              <button
                onClick={handleLoadSample}
                className="w-full p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 flex items-center justify-between text-left transition active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-100 group-hover:text-emerald-300 transition">
                        全聯超市採買發票
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono">
                        PX88991234
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      牛五花肉片、舒潔衛生紙、原萃綠茶 · 3項品項 AI 分類
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 flex items-center gap-1">
                  <span className="font-mono text-xs font-bold text-emerald-400">NT$ 540</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. 掃描或範例載入後的詳細明細與 AI 分類結果卡片 */}
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
                      發票購物清單 ({scannedResult.items.length} 項品項 AI 自動分類)
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
                重新掃描
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
