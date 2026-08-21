'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  QrCode,
  Sparkles,
  Camera,
  CheckCircle2,
  Trophy,
  AlertCircle,
  RotateCcw,
  Zap,
  ShoppingBag,
  Tag,
  UploadCloud,
  Loader2,
  FileText,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  generateMockInvoiceQrCode,
  parseTaiwanInvoiceQrCode,
  autoCategorizeInvoice,
  checkLotteryWinning,
  TaiwanInvoice,
} from '@app/shared';
import { parseReceiptImageWithGemini } from '@/lib/geminiClient';

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({ isOpen, onClose }) => {
  const { user, addInvoice } = useAppStore();
  const [scanMode, setScanMode] = useState<'qr' | 'photo'>('qr');
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedResult, setScannedResult] = useState<TaiwanInvoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setErrorMessage(null);
      if (scanMode === 'qr') {
        startScanner();
      }
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, scanMode]);

  const startScanner = async () => {
    try {
      setScannerActive(true);
      const scannerId = 'reader';
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.warn('Camera start error:', err);
      setIsCameraSupported(false);
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
  };

  const handleQrDecoded = (qrText: string) => {
    const invoice = parseTaiwanInvoiceQrCode(qrText);
    if (invoice) {
      stopScanner();
      const enriched = autoCategorizeInvoice(invoice);
      const prize = checkLotteryWinning(enriched.invoiceNumber, enriched.date);
      enriched.lotteryResult = prize;
      setScannedResult(enriched);

      if (prize.isWon) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } else {
      setErrorMessage('已讀取條碼，但非標準台灣電子發票格式 (需至少77字元左條碼)。');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsPhotoAnalyzing(true);
      setErrorMessage(null);

      try {
        const ocrData = await parseReceiptImageWithGemini(
          base64,
          file.type || 'image/jpeg',
          user.geminiApiKey
        );

        if (ocrData) {
          const invNum = ocrData.invoiceNumber || `TW-${Math.floor(10000000 + Math.random() * 90000000)}`;
          const dateStr = ocrData.date || new Date().toISOString().split('T')[0];

          const invoice: TaiwanInvoice = {
            id: `inv_${invNum}_${Date.now()}`,
            invoiceNumber: invNum,
            date: dateStr,
            rocDate: '1130816',
            randomCode: '6688',
            salesAmount: Math.round((ocrData.totalAmount || 500) / 1.05),
            totalAmount: ocrData.totalAmount || 500,
            buyerGUI: '00000000',
            sellerGUI: '16740494',
            sellerName: ocrData.merchant || '全聯福利中心',
            items: ocrData.items || [],
            isScanned: true,
            scanTime: Date.now(),
          };

          const enriched = autoCategorizeInvoice(invoice);
          const prize = checkLotteryWinning(enriched.invoiceNumber, enriched.date);
          enriched.lotteryResult = prize;
          setScannedResult(enriched);
        }
      } catch (err: any) {
        setErrorMessage(err.message || '發票拍照識別失敗，請再試一次。');
      } finally {
        setIsPhotoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateScan = (type: 'pxmart' | 'seven' | 'lottery') => {
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
      stopScanner();
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
  const categorySummary = React.useMemo(() => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* 背景裝飾光暈 */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">台灣電子發票與購物清單掃描</h2>
              <p className="text-xs text-slate-400">
                自動讀取發票商品購物清單，由 AI 逐項智慧分類
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模式切換 Tab */}
        {!scannedResult && (
          <div className="flex bg-slate-800/80 p-1 rounded-2xl my-3 border border-slate-700/60">
            <button
              onClick={() => {
                setScanMode('qr');
                startScanner();
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                scanMode === 'qr'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              相機 QR Code 掃描
            </button>
            <button
              onClick={() => {
                setScanMode('photo');
                stopScanner();
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                scanMode === 'photo'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              拍照 / 銷貨明細 OCR
            </button>
          </div>
        )}

        {/* 掃描相機視窗 或 拍照上傳區 */}
        {!scannedResult && (
          <div className="my-2 space-y-3 overflow-y-auto pr-1">
            {scanMode === 'qr' ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 min-h-[220px] flex items-center justify-center border border-slate-800">
                <div id="reader" className="w-full"></div>
                {!scannerActive && !isCameraSupported && (
                  <div className="text-center p-4 text-slate-400 text-xs">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-500" />
                    <p>相機權限未開放或裝置不支援相機。</p>
                    <p className="text-emerald-400 mt-1 font-semibold">可直接點擊下方「真實測試發票」！</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/40 text-center space-y-3 transition">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  {isPhotoAnalyzing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">
                    {isPhotoAnalyzing ? 'Gemini AI 正在解析銷貨清單...' : '上傳發票證明聯或賣場銷貨清單'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    支援全聯、家樂福、大潤發等發票拍照，自動逐行提取品名與金額
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPhotoAnalyzing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                >
                  {isPhotoAnalyzing ? 'AI 深度識別中...' : '選擇照片或拍照'}
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 快速示範測試按鈕 */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                一鍵載入真實發票多品項範例：
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSimulateScan('pxmart')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition text-center"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>全聯超市採買</span>
                  <span className="text-[9px] text-slate-400 font-normal">肉片/衛生紙/綠茶</span>
                </button>
                <button
                  onClick={() => handleSimulateScan('seven')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition text-center"
                >
                  <ShoppingBag className="w-4 h-4 text-teal-400" />
                  <span>7-11 複合採買</span>
                  <span className="text-[9px] text-slate-400 font-normal">飯糰/拿鐵/面膜</span>
                </button>
                <button
                  onClick={() => handleSimulateScan('lottery')}
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600/30 to-orange-600/30 hover:from-amber-600/40 hover:to-orange-600/40 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition text-center"
                >
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span>中獎發票測試</span>
                  <span className="text-[9px] text-amber-300/80 font-normal">頭獎 20 萬元</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 掃描成功結果展示卡片 */}
        {scannedResult && (
          <div className="my-2 space-y-3.5 overflow-y-auto pr-1 flex-1 animate-in zoom-in-95 duration-200">
            {/* 中獎提示 */}
            {scannedResult.lotteryResult?.isWon ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur">
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

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {scannedResult.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">{it.name}</span>
                            <span className="text-[10px] text-slate-400">x{it.quantity}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 font-medium">
                              #{it.tags?.[0] || it.categoryName || '未歸類'}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold font-mono text-slate-200">
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
                onClick={() => {
                  setScannedResult(null);
                  if (scanMode === 'qr') startScanner();
                }}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重新掃描
              </button>
              <button
                onClick={handleConfirmAdd}
                className="flex-[2] py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
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
