'use client';

import React, { useEffect, useRef } from 'react';
import { AudioVisualizerSharedState } from '../hooks/useAudioVisualizer';

interface AudioVisualizerBackgroundProps {
  isListening: boolean;
  sharedStateRef?: React.RefObject<AudioVisualizerSharedState>;
}

export const AudioVisualizerBackground: React.FC<AudioVisualizerBackgroundProps> = ({
  isListening,
  sharedStateRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);
  const smoothedVolRef = useRef<number>(0);
  const animIdRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const numWaves = 4;
    const waveColors = [
      'rgba(16, 185, 129, 0.75)', // Emerald
      'rgba(6, 182, 212, 0.65)',  // Cyan
      'rgba(139, 92, 246, 0.6)',  // Purple
      'rgba(244, 63, 94, 0.45)',  // Rose
    ];

    const render = () => {
      const liveState = sharedStateRef?.current;
      const vol = liveState ? liveState.volume : 0;
      const isSpeaking = liveState ? liveState.isSpeaking : false;
      const bass = liveState ? liveState.bass : 0;
      const mid = liveState ? liveState.mid : 0;
      const treble = liveState ? liveState.treble : 0;
      const listening = isListeningRef.current;

      // 平滑音量過渡
      const targetVol = listening
        ? isSpeaking
          ? Math.max(vol, 0.25)
          : vol * 0.4 + 0.04
        : 0.02;
      smoothedVolRef.current += (targetVol - smoothedVolRef.current) * 0.15;
      const curVol = smoothedVolRef.current;

      // 推進波動相位
      phaseRef.current += isSpeaking ? 0.035 + curVol * 0.06 : 0.012;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, width, height);

      const centerY = height * 0.52;

      for (let w = 0; w < numWaves; w++) {
        const color = waveColors[w];
        const waveFreqMultiplier = 0.8 + w * 0.35;
        const wavePhaseOffset = w * (Math.PI / 3);
        const waveAmp =
          (30 + w * 20) *
          (0.35 + curVol * 2.5) *
          (1 + (w === 0 ? bass : w === 1 ? mid : treble) * 1.2);

        ctx.beginPath();

        const step = 8;
        for (let x = 0; x <= width; x += step) {
          const progress = x / width;
          // 兩端柔和漸隱包絡線 (Hann window)
          const envelope = Math.sin(progress * Math.PI);

          const y1 = Math.sin(
            progress * Math.PI * 3.5 * waveFreqMultiplier + phase + wavePhaseOffset
          );
          const y2 = Math.cos(
            progress * Math.PI * 1.8 * waveFreqMultiplier - phase * 0.6
          );
          const combinedY = (y1 * 0.65 + y2 * 0.35) * waveAmp * envelope;

          const finalY = centerY + combinedY;
          if (x === 0) {
            ctx.moveTo(x, finalY);
          } else {
            ctx.lineTo(x, finalY);
          }
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8 + curVol * 1.5;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = isSpeaking ? 10 + curVol * 14 : 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, [sharedStateRef]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 隨聲音跳動的柔和光暈 (Dancing Ambient Glow Spheres) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] rounded-full bg-gradient-to-tr from-emerald-600/20 via-teal-500/10 to-cyan-500/20 blur-[100px] pointer-events-none"
      />

      <div
        className="absolute top-2/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-pink-500/15 blur-[100px] pointer-events-none"
      />

      {/* 動態波形畫布 (獨立 60fps Native Loop) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-90 transition-opacity duration-200 pointer-events-none"
      />

      {/* 柔和漸層暗化 */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/80 pointer-events-none" />
    </div>
  );
};
