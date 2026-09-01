'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: (finalTranscript: string) => void;
  autoStopDelay?: number; // 說話結束後自動結算停頓秒數 (毫秒，預設 2000ms)
}

export function useSpeechRecognition({
  onResult,
  onEnd,
  autoStopDelay = 2000,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // 初始化 SpeechRecognition 實例 (僅在 Client 端掛載時執行一次)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('您的瀏覽器不支援原生 Web Speech 語音辨識，請使用 Chrome、Edge 或 Safari。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-TW';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage('');
    };

    recognition.onresult = (event: any) => {
      let finalResult = '';
      let interimResult = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalResult += item[0].transcript;
        } else {
          interimResult += item[0].transcript;
        }
      }

      const fullCurrent = finalResult + interimResult;
      transcriptRef.current = fullCurrent;
      setTranscript(fullCurrent);
      setInterimText(interimResult);
      onResultRef.current?.(fullCurrent);

      // 清除先前的靜音計時器，重新計算自動停止倒數
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (fullCurrent.trim().length > 0 && autoStopDelay > 0) {
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && transcriptRef.current.trim()) {
            try {
              recognition.stop();
            } catch {}
          }
        }, autoStopDelay);
      }
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isListeningRef.current = false;
      setIsListening(false);
      setInterimText('');
      const finalVal = transcriptRef.current.trim();
      onEndRef.current?.(finalVal);
    };

    recognition.onerror = (err: any) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isListeningRef.current = false;
      setIsListening(false);
      setInterimText('');

      if (err.error === 'not-allowed') {
        setErrorMessage('請允許瀏覽器麥克風權限以進行語音記帳。');
      } else if (err.error === 'no-speech') {
        // 使用者沒說話，不顯示突兀錯誤
      } else if (err.error !== 'aborted') {
        setErrorMessage(`語音辨識提示：${err.error}`);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.abort();
      } catch {}
    };
  }, [autoStopDelay]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (typeof window !== 'undefined') {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setErrorMessage('您的瀏覽器不支援原生 Web Speech 語音辨識，請使用 Chrome 或 Safari。');
          return;
        }
      }
      return;
    }

    try {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setErrorMessage('');
      setInterimText('');
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (e: any) {
      console.warn('Speech recognition start failed or already active:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    setErrorMessage('');
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    setTranscript,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
