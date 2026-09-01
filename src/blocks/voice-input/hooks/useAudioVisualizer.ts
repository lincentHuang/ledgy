'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioVisualizerData {
  volume: number; // 0.0 ~ 1.0 (正規化音量)
  rawVolume: number; // 原始音量
  isSpeaking: boolean; // 是否正在說話 (<100ms 即時偵測)
  frequencyData: number[]; // 頻率波段數據 (32 點)
  timeDomainData: number[]; // 時域波形數據 (32 點)
  audioStreamActive: boolean;
}

interface UseAudioVisualizerOptions {
  active?: boolean;
  threshold?: number; // 判定為說話的音量門檻值 (預設 0.035)
}

export function useAudioVisualizer({
  active = false,
  threshold = 0.035,
}: UseAudioVisualizerOptions = {}) {
  const [data, setData] = useState<AudioVisualizerData>({
    volume: 0,
    rawVolume: 0,
    isSpeaking: false,
    frequencyData: new Array(32).fill(0),
    timeDomainData: new Array(32).fill(128),
    audioStreamActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothVolumeRef = useRef<number>(0);
  const consecutiveVoiceFramesRef = useRef<number>(0);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    smoothVolumeRef.current = 0;
    consecutiveVoiceFramesRef.current = 0;
    setData({
      volume: 0,
      rawVolume: 0,
      isSpeaking: false,
      frequencyData: new Array(32).fill(0),
      timeDomainData: new Array(32).fill(128),
      audioStreamActive: false,
    });
  }, []);

  const startAudioMonitoring = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      cleanupAudio();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // 32 frequency bins
      analyser.smoothingTimeConstant = 0.65; // 即時靈敏反映

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      mediaStreamRef.current = stream;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const freqBuffer = new Uint8Array(analyser.frequencyBinCount);
      const timeBuffer = new Uint8Array(analyser.fftSize);

      let lastUpdateTime = 0;

      const updateLoop = (time: number) => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(freqBuffer);
        analyserRef.current.getByteTimeDomainData(timeBuffer);

        // 計算 RMS 能量 / 音量
        let sumSquares = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          const normalized = (timeBuffer[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / timeBuffer.length);

        // 平滑音量計算，兼顧瞬間起跳與柔和衰減
        if (rms > smoothVolumeRef.current) {
          smoothVolumeRef.current = rms * 0.85 + smoothVolumeRef.current * 0.15; // 快速反應 (<16ms)
        } else {
          smoothVolumeRef.current = smoothVolumeRef.current * 0.88; // 柔和漸弱
        }

        const normalizedVol = Math.min(Math.max(smoothVolumeRef.current * 3.2, 0), 1);
        const rawVol = Math.min(Math.max(rms * 3.0, 0), 1);

        // 即時偵測說話 (<100ms): 連續 2 幀 (>30ms) 超過門檻即標記為 isSpeaking
        if (rawVol > threshold) {
          consecutiveVoiceFramesRef.current = Math.min(consecutiveVoiceFramesRef.current + 1, 10);
        } else {
          consecutiveVoiceFramesRef.current = Math.max(consecutiveVoiceFramesRef.current - 1, 0);
        }

        const isSpeaking = consecutiveVoiceFramesRef.current >= 2;

        // 節流 React 狀態更新至 ~60fps
        if (time - lastUpdateTime >= 16) {
          lastUpdateTime = time;
          setData({
            volume: normalizedVol,
            rawVolume: rawVol,
            isSpeaking,
            frequencyData: Array.from(freqBuffer),
            timeDomainData: Array.from(timeBuffer).slice(0, 32),
            audioStreamActive: true,
          });
        }

        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);
    } catch (err) {
      console.warn('Audio monitor init failed (may lack microphone permission):', err);
    }
  }, [cleanupAudio, threshold]);

  useEffect(() => {
    if (active) {
      startAudioMonitoring();
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [active, startAudioMonitoring, cleanupAudio]);

  return {
    ...data,
    restart: startAudioMonitoring,
    stop: cleanupAudio,
  };
}
