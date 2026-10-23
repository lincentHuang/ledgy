'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const DISABLED_KEY = 'ledgy_mic_meter_disabled_v1';

const readDisabled = () => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(DISABLED_KEY) === '1';
  } catch {
    return false;
  }
};

interface UseMicLevelOptions {
  enabled: boolean;
  /** 音量會即時寫入此元素的 CSS 變數 --mic-level (0 ~ 1)，不觸發 React 重繪 */
  targetRef: React.RefObject<HTMLElement>;
}

/**
 * 即時麥克風音量 (給錄音按鈕跟著聲音跳動用)
 * 部分 Android 裝置的語音辨識服務與網頁麥克風會互搶音源，呼叫 disablePermanently() 後此裝置不再啟用
 */
export function useMicLevel({ enabled, targetRef }: UseMicLevelOptions) {
  const [isDisabled, setIsDisabled] = useState(readDisabled);
  const [isActive, setIsActive] = useState(false);
  const levelRef = useRef(0);

  useEffect(() => {
    if (!enabled || isDisabled || typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        let smooth = 0;
        setIsActive(true);

        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          const level = Math.min(1, rms * 6);
          // 上升快、下降慢，讓動畫跟手又不抖
          smooth = level > smooth ? level * 0.7 + smooth * 0.3 : smooth * 0.85;
          levelRef.current = smooth;
          targetRef.current?.style.setProperty('--mic-level', smooth.toFixed(3));
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.warn('Mic level meter unavailable:', err);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      levelRef.current = 0;
      targetRef.current?.style.setProperty('--mic-level', '0');
      setIsActive(false);
    };
  }, [enabled, isDisabled, targetRef]);

  const disablePermanently = useCallback(() => {
    try {
      localStorage.setItem(DISABLED_KEY, '1');
    } catch {}
    setIsDisabled(true);
  }, []);

  return { levelRef, isActive, disablePermanently };
}
