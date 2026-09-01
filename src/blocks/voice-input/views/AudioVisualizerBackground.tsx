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
      const targetVol = isListening ? (isSpeaking ? Math.max(volume, 0.25) : volume * 0.5 + 0.05) : 0;
      smoothedVolRef.current += (targetVol - smoothedVolRef.current) * 0.15;
      const curVol = smoothedVolRef.current;

      // 推進波動相位
      phaseRef.current += isSpeaking ? 0.04 + curVol * 0.08 : 0.015;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, width, height);

      // 繪製多層流體波動線條 (隨聲音頻率起舞)
      const numWaves = 4;
      const waveColors = [
        { stroke: 'rgba(16, 185, 129, 0.45)', fill: 'rgba(16, 185, 129, 0.08)' }, // Emerald
        { stroke: 'rgba(6, 182, 212, 0.4)', fill: 'rgba(6, 182, 212, 0.06)' }, // Cyan
        { stroke: 'rgba(139, 92, 246, 0.35)', fill: 'rgba(139, 92, 246, 0.05)' }, // Purple
        { stroke: 'rgba(244, 63, 94, 0.25)', fill: 'rgba(244, 63, 94, 0.03)' }, // Rose
      ];

      const centerY = height * 0.52;

      for (let w = 0; w < numWaves; w++) {
        const color = waveColors[w];
        const waveFreqMultiplier = 1 + w * 0.4;
        const wavePhaseOffset = w * (Math.PI / 3);
        const waveAmp = (40 + w * 25) * (0.3 + curVol * 2.8) * (1 + (w === 0 ? bass : w === 1 ? mid : treble) * 1.5);

        ctx.beginPath();
        ctx.moveTo(0, centerY);

        const step = 8;
        for (let x = 0; x <= width; x += step) {
          const progress = x / width;
          // 兩端收攏的包絡線 (漢寧窗曲線)
          const envelope = Math.sin(progress * Math.PI);

          const y1 = Math.sin(progress * Math.PI * 4 * waveFreqMultiplier + phase + wavePhaseOffset);
          const y2 = Math.cos(progress * Math.PI * 2 * waveFreqMultiplier - phase * 0.7);
          const combinedY = (y1 * 0.7 + y2 * 0.3) * waveAmp * envelope;

          const finalY = centerY + combinedY;
          if (x === 0) {
            ctx.moveTo(x, finalY);
          } else {
            ctx.lineTo(x, finalY);
          }
        }

        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2.5 + curVol * 2;
        ctx.lineCap = 'round';
        ctx.shadowColor = color.stroke;
        ctx.shadowBlur = isSpeaking ? 15 + curVol * 20 : 6;
        ctx.stroke();

        // 填充半透明流體區域
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = color.fill;
        ctx.fill();
        ctx.shadowBlur = 0; // 重設以避免影響後續運算
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
  const auraOpacity = isSpeaking ? 0.35 + volume * 0.45 : 0.15;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 隨聲音跳動的背景色彩光暈 (Dancing Ambient Glow Spheres) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] sm:w-[580px] sm:h-[580px] rounded-full bg-gradient-to-tr from-emerald-600/30 via-teal-500/20 to-cyan-500/30 blur-[100px] transition-transform duration-75 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) scale(${auraScale})`,
          opacity: auraOpacity,
        }}
      />

      <div
        className="absolute top-2/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-600/20 to-pink-500/25 blur-[110px] transition-transform duration-100 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) scale(${1 + mid * 1.5 + (isSpeaking ? volume * 0.8 : 0)})`,
          opacity: isSpeaking ? 0.3 + mid * 0.4 : 0.12,
        }}
      />

      <div
        className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-bl from-cyan-500/30 via-sky-600/20 to-emerald-500/25 blur-[90px] transition-transform duration-100 will-change-transform"
        style={{
          transform: `translate(50%, -50%) scale(${1 + treble * 1.3 + (isSpeaking ? volume * 0.7 : 0)})`,
          opacity: isSpeaking ? 0.3 + treble * 0.4 : 0.1,
        }}
      />

      {/* 動態波形繪製畫布 (Dancing Wave Canvas) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-90 transition-opacity duration-300"
      />

      {/* 頂部與底部漸層遮罩，營造深邃空間感 */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />
    </div>
  );
};
