'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { Platform } from '../../lib/platform';

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 65,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    // 只有在滾動到最頂部時才觸發下拉手勢
    if (container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    // 只有向下拉（diff > 0）才處理
    if (diff > 0) {
      // 阻尼效果：拉得越長阻力越大
      const dampedDistance = Math.min(100, Math.pow(diff, 0.82));
      setPullDistance(dampedDistance);

      // 當拉過臨界點時給予一次輕微觸覺回饋
      if (dampedDistance >= threshold && pullDistance < threshold) {
        Platform.haptic('light');
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(52); // 維持在載入高度
      Platform.haptic('medium');

      try {
        await onRefresh();
        setIsSuccess(true);
        Platform.haptic('success');
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setIsSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative overflow-y-auto overscroll-contain ${className}`}
    >
      {/* 下拉更新動態指示器 (Pull-to-refresh Indicator) */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          opacity: Math.min(1, pullDistance / (threshold * 0.7)),
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs backdrop-blur-md">
          {isSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
              <span className="font-bold text-emerald-400 text-[11px]">雲端資料已最新 ✨</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="font-medium text-slate-300 text-[11px]">正在同步雲端資料...</span>
            </>
          ) : pullDistance >= threshold ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-300 text-[11px]">放開立即更新</span>
            </>
          ) : (
            <>
              <RefreshCw
                className="w-3.5 h-3.5 text-slate-400 transition-transform"
                style={{ transform: `rotate(${(pullDistance / threshold) * 270}deg)` }}
              />
              <span className="font-medium text-slate-400 text-[11px]">下拉重新整理</span>
            </>
          )}
        </div>
      </div>

      {/* 頁面主要內容 */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isRefreshing ? 'translateY(0px)' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
