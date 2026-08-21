'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  QrCode,
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  Coins,
  Receipt,
  RotateCw,
  Gift,
  Barcode,
  CloudDownload,
  Loader2,
  CheckCircle2,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { RECENT_LOTTERY_PERIODS, TaiwanInvoice } from '@app/shared';
import confetti from 'canvas-confetti';

export const InvoiceListView: React.FC<{ onOpenScanner: () => void; onOpenBarcode: () => void }> = ({
  onOpenScanner,
  onOpenBarcode,
}) => {
  const { filteredInvoices, user, syncMofInvoices } = useAppStore();
  const [selectedInvoice, setSelectedInvoice] = useState<TaiwanInvoice | null>(null);
  const [showPrizeTable, setShowPrizeTable] = useState(false);
  const [isSyncingMof, setIsSyncingMof] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const winningInvoices = filteredInvoices.filter((inv) => inv.lotteryResult?.isWon);
  const totalWonAmount = winningInvoices.reduce(
    (sum, inv) => sum + (inv.lotteryResult?.prizeAmount || 0),
    0
  );

  const handleMofSync = async () => {
    setIsSyncingMof(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncMofInvoices();
      if (res.success) {
        setSyncStatusMsg(res.message);
        if (res.count > 0) {
          confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
      } else {
        setSyncStatusMsg(res.message);
      }
    } catch (e: any) {
      setSyncStatusMsg(e.message || '財政部同步失敗');
    } finally {
      setIsSyncingMof(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 頂部中獎與操作橫幅 */}
      <div className="glass-panel rounded-3xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                統一發票自動對獎與財政部同步專區
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              載具 <span className="font-mono text-emerald-400 font-bold">{user.defaultCarrierCode || '/AB1234+'}</span> • 已登錄 {filteredInvoices.length} 張發票 • 累計中獎金額：
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm ml-1">
                NT$ {totalWonAmount.toLocaleString()}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ☁️ 財政部雲端發票一鍵自動同步按鈕 */}
            <button
              onClick={handleMofSync}
              disabled={isSyncingMof}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5"
              title="自動自財政部雲端抓取發票與全品項購物清單"
            >
              {isSyncingMof ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>財政部同步中...</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-4 h-4" />
                  <span>財政部雲端同步</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPrizeTable(!showPrizeTable)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              開獎號碼清單
            </button>

            <button
              onClick={onOpenScanner}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              掃描發票
            </button>
          </div>
        </div>

        {/* 財政部同步狀態通知 Banner */}
        {syncStatusMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
            <button
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-400 hover:text-slate-200 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 統一發票開獎號碼折疊展示 */}
        {showPrizeTable && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in text-xs">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-rose-500" />
              最新統一發票中獎號碼 (113年 07-08 月)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                  特別獎 (1,000 萬元)
                </span>
                <p className="font-mono text-base font-black text-amber-900 dark:text-amber-100 tracking-wider mt-0.5">
                  {RECENT_LOTTERY_PERIODS[0].superPrize}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold">
                  特獎 (200 萬元)
                </span>
                <p className="font-mono text-base font-black text-rose-900 dark:text-rose-100 tracking-wider mt-0.5">
                  {RECENT_LOTTERY_PERIODS[0].specialPrize}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                  頭獎 (20 萬元)
                </span>
                <p className="font-mono text-xs font-bold text-blue-900 dark:text-blue-100 tracking-wider mt-0.5">
                  {RECENT_LOTTERY_PERIODS[0].firstPrizes.join(' / ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 發票列表清單 */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CloudDownload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-white">目前尚無此載具的電子發票紀錄</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              點擊上方「財政部雲端同步」一鍵自動抓取發票與全品項購物清單，或點擊「掃描發票」匯入！
            </p>
            <button
              onClick={handleMofSync}
              disabled={isSyncingMof}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20 inline-flex items-center gap-1.5"
            >
              {isSyncingMof ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
              立即從財政部雲端同步發票
            </button>
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className="glass-panel p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    inv.lotteryResult?.isWon
                      ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/30 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {inv.lotteryResult?.isWon ? <Trophy className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 tracking-wider">
                      {inv.invoiceNumber}
                    </span>
                    {inv.lotteryResult?.isWon ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase shadow-sm">
                        中 {inv.lotteryResult.prizeName} NT${' '}
                        {inv.lotteryResult.prizeAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                        未中獎
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                    {inv.sellerName || `統一編號 ${inv.sellerGUI}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {inv.date} • {inv.items?.length || 0} 個品項購物清單 (已 AI 分類)
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                  NT$ {inv.totalAmount.toLocaleString()}
                </span>
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  已自動記入帳本
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 發票明細彈窗 */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-base font-black">
                  {selectedInvoice.invoiceNumber}
                </span>
                <p className="text-xs text-slate-500">{selectedInvoice.date}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {selectedInvoice.sellerName}
              </p>
              <p className="text-slate-500">賣方統編：{selectedInvoice.sellerGUI}</p>
              <p className="text-slate-500">隨機碼：{selectedInvoice.randomCode}</p>
              <p className="text-slate-500">歸屬載具：{selectedInvoice.carrierCode || '/AB1234+'}</p>
            </div>

            {/* 品項清單 */}
            <div className="space-y-2 text-xs max-h-56 overflow-y-auto pr-1">
              <p className="font-bold text-emerald-400 text-[11px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                真實購物清單明細 ({selectedInvoice.items?.length || 0} 項品項 AI 自動分類)
              </p>
              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                selectedInvoice.items.map((it, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100">{it.name}</span>
                        <span className="text-slate-400 text-[10px]">x{it.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-medium">
                          #{it.categoryName || '未歸類'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-100">NT$ {it.amount}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-2">無明細品項</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-xs">發票總金額</span>
              <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                NT$ {selectedInvoice.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
