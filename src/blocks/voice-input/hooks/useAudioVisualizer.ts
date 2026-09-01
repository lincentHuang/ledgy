'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioVisualizerSharedState {
  volume: number; // 0.0 ~ 1.0
  rawVolume: number;
  isSpeaking: boolean;
  bass: number;
  mid: number;
  treble: number;
  frequencyData: Uint8Array;
}

interface UseAudioVisualizerOptions {
  active?: boolean;
  threshold?: number; // 判定為說話的音量門檻值 (預設 0.03)
}

export function useAudioVisualizer({
  active = false,
  threshold = 0.03,
}: UseAudioVisualizerOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [throttledVolume, setThrottledVolume] = useState(0);

  const sharedStateRef = useRef<AudioVisualizerSharedState>({
    volume: 0,
    rawVolume: 0,
    isSpeaking: false,
    bass: 0,
    mid: 0,
    treble: 0,
    frequencyData: new Uint8Array(32),
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothVolumeRef = useRef<number>(0);
  const consecutiveVoiceFramesRef = useRef<number>(0);
  const isSpeakingStateRef = useRef<boolean>(false);
  const lastStateUpdateTimeRef = useRef<number>(0);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

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
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
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
    isSpeakingStateRef.current = false;
    sharedStateRef.current = {
      volume: 0,
      rawVolume: 0,
      isSpeaking: false,
      bass: 0,
      mid: 0,
      treble: 0,
      frequencyData: new Uint8Array(32),
    };
    setIsSpeaking(false);
    setThrottledVolume(0);
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
        audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // 備份錄音記錄器
      audioChunksRef.current = [];
      try {
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            mimeType = 'audio/aac';
          }
        }
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('MediaRecorder backup init skipped:', recErr);
      }

      audioContextRef.current = audioContext;
      mediaStreamRef.current = stream;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const freqBuffer = new Uint8Array(analyser.frequencyBinCount);
      const timeBuffer = new Uint8Array(analyser.fftSize);

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

        // 平滑音量計算
        if (rms > smoothVolumeRef.current) {
          smoothVolumeRef.current = rms * 0.85 + smoothVolumeRef.current * 0.15;
        } else {
          smoothVolumeRef.current = smoothVolumeRef.current * 0.88;
        }

        const normalizedVol = Math.min(Math.max(smoothVolumeRef.current * 3.2, 0), 1);
        const rawVol = Math.min(Math.max(rms * 3.0, 0), 1);

        // 即時偵測說話 (<100ms)
        if (rawVol > threshold) {
          consecutiveVoiceFramesRef.current = Math.min(consecutiveVoiceFramesRef.current + 1, 10);
        } else {
          consecutiveVoiceFramesRef.current = Math.max(consecutiveVoiceFramesRef.current - 1, 0);
        }

        const speakingNow = consecutiveVoiceFramesRef.current >= 2;

        // 計算高、中、低頻平均值
        let sumBass = 0;
        for (let i = 0; i < 8; i++) sumBass += freqBuffer[i] || 0;
        const bass = sumBass / (8 * 255);

        let sumMid = 0;
        for (let i = 8; i < 20; i++) sumMid += freqBuffer[i] || 0;
        const mid = sumMid / (12 * 255);

        let sumTreble = 0;
        for (let i = 20; i < 32; i++) sumTreble += freqBuffer[i] || 0;
        const treble = sumTreble / (12 * 255);

        // 🚀 零 React 重繪負擔：直接更新 Shared Ref
        sharedStateRef.current.volume = normalizedVol;
        sharedStateRef.current.rawVolume = rawVol;
        sharedStateRef.current.isSpeaking = speakingNow;
        sharedStateRef.current.bass = bass;
        sharedStateRef.current.mid = mid;
        sharedStateRef.current.treble = treble;
        sharedStateRef.current.frequencyData.set(freqBuffer.subarray(0, 32));

        // 僅在說話狀態切換或節流時間 (每 100ms) 更新 React State，避免 60fps 重新渲染整個樹
        if (speakingNow !== isSpeakingStateRef.current) {
          isSpeakingStateRef.current = speakingNow;
          setIsSpeaking(speakingNow);
        }

        if (time - lastStateUpdateTimeRef.current >= 80) {
          lastStateUpdateTimeRef.current = time;
          setThrottledVolume(normalizedVol);
        }

        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);
    } catch (err) {
      console.warn('Audio monitor init failed (may lack microphone permission):', err);
    }
  }, [cleanupAudio, threshold]);

  const getRecordedAudioBlob = useCallback((): Blob | null => {
    if (audioChunksRef.current.length === 0) return null;
    const type = audioChunksRef.current[0]?.type || 'audio/webm';
    return new Blob(audioChunksRef.current, { type });
  }, []);

  const getRecordedAudioBase64 = useCallback(async (): Promise<{ base64: string; mimeType: string } | null> => {
    const blob = getRecordedAudioBlob();
    if (!blob || blob.size < 100) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve({ base64, mimeType: blob.type || 'audio/webm' });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }, [getRecordedAudioBlob]);

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
    volume: throttledVolume,
    isSpeaking,
    sharedStateRef,
    restart: startAudioMonitoring,
    stop: cleanupAudio,
    getRecordedAudioBlob,
    getRecordedAudioBase64,
  };
}
