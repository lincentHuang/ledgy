'use client';

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerBackgroundProps {
  isListening: boolean;
  volume: number; // 0 ~ 1
  isSpeaking: boolean;
  frequencyData?: number[]; // 32 frequency points
}

export const AudioVisualizerBackground: React.FC<AudioVisualizerBackgroundProps> = ({
  isListening,
  volume,
  isSpeaking,
  frequencyData = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);
  const smoothedVolRef = useRef<number>(0);
  const animIdRef = useRef<number | null>(null);

  // 計算高、中、低頻平均值
  const bass = frequencyData.slice(0, 8).reduce((a, b) => a + b, 0) / (8 * 255) || 0;
  const mid = frequencyData.slice(8, 20).reduce((a, b) => a + b, 0) / (12 * 255) || 0;
  const treble = frequencyData.slice(20, 32).reduce((a, b) => a + b, 0) / (12 * 255) || 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      // 平滑音量過渡
      const targetVol = isListening ? (isSpeaking ? Math.max(volume, 0.25) : volume * 0.4 + 0.04) : 0.02;
      smoothedVolRef.current += (targetVol - smoothedVolRef.current) * 0.15;
      const curVol = smoothedVolRef.current;

      // 推進波動相位
      phaseRef.current += isSpeaking ? 0.035 + curVol * 0.06 : 0.012;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, width, height);

      // 繪製細緻純淨的流體波動發光線條 (隨聲音頻率起舞，不使用實心方塊填滿)
      const numWaves = 4;
      const waveColors = [
        'rgba(16, 185, 129, 0.75)', // Emerald
        'rgba(6, 182, 212, 0.65)',  // Cyan
        'rgba(139, 92, 246, 0.6)',  // Purple
        'rgba(244, 63, 94, 0.45)',  // Rose
      ];

      const centerY = height * 0.52;

      for (let w = 0; w < numWaves; w++) {
        const color = waveColors[w];
        const waveFreqMultiplier = 0.8 + w * 0.35;
        const wavePhaseOffset = w * (Math.PI / 3);
        const waveAmp = (30 + w * 20) * (0.35 + curVol * 2.5) * (1 + (w === 0 ? bass : w === 1 ? mid : treble) * 1.2);

        ctx.beginPath();

        const step = 6;
        for (let x = 0; x <= width; x += step) {
          const progress = x / width;
          // 兩端柔和漸隱包絡線 (Hann window)
          const envelope = Math.sin(progress * Math.PI);

          const y1 = Math.sin(progress * Math.PI * 3.5 * waveFreqMultiplier + phase + wavePhaseOffset);
          const y2 = Math.cos(progress * Math.PI * 1.8 * waveFreqMultiplier - phase * 0.6);
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
        ctx.shadowBlur = isSpeaking ? 12 + curVol * 16 : 4;
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
  }, [isListening, isSpeaking, volume, bass, mid, treble]);

  // 動態光暈尺寸與透明度計算
  const auraScale = isSpeaking ? 1 + volume * 1.2 + bass * 0.5 : 1 + volume * 0.3;
  const auraOpacity = isSpeaking ? 0.35 + volume * 0.4 : 0.15;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 隨聲音跳動的柔和光暈 (Dancing Ambient Glow Spheres) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] rounded-full bg-gradient-to-tr from-emerald-600/25 via-teal-500/15 to-cyan-500/25 blur-[120px] transition-transform duration-75 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) scale(${auraScale})`,
          opacity: auraOpacity,
        }}
      />

      <div
        className="absolute top-2/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-br from-purple-600/25 via-indigo-600/15 to-pink-500/20 blur-[120px] transition-transform duration-100 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) scale(${1 + mid * 1.3 + (isSpeaking ? volume * 0.7 : 0)})`,
          opacity: isSpeaking ? 0.25 + mid * 0.3 : 0.1,
        }}
      />

      <div
        className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-bl from-cyan-500/25 via-sky-600/15 to-emerald-500/20 blur-[100px] transition-transform duration-100 will-change-transform"
        style={{
          transform: `translate(50%, -50%) scale(${1 + treble * 1.2 + (isSpeaking ? volume * 0.6 : 0)})`,
          opacity: isSpeaking ? 0.25 + treble * 0.3 : 0.08,
        }}
      />

      {/* 動態波形畫布 (無破版色塊，純粹發光波線) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-90 transition-opacity duration-300"
      />

      {/* 柔和漸層暗化 */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/80 pointer-events-none" />
    </div>
  );
};
