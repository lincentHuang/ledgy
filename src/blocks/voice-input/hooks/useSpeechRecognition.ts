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
  autoStopDelay = 2200,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);
  const userStoppedRef = useRef<boolean>(false);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // 停止語音聆聽
  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    isListeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // 重設語音字串
  const resetTranscript = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    setErrorMessage('');
  }, []);

  // 啟動語音辨識 (每次啟動時皆建立獨立實例，以相容各版本 Chrome/Safari/Edge/Mobile)
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    userStoppedRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('您的瀏覽器不支援原生 Web Speech 語音辨識，請使用 Chrome、Edge 或 Safari。');
      setIsListening(false);
      isListeningRef.current = false;
      return;
    }

    // 關閉舊實例避免資源衝突
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
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
        let currentInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalResult += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const fullCurrent = finalResult + currentInterim;
        transcriptRef.current = fullCurrent;
        setTranscript(fullCurrent);
        setInterimText(currentInterim);
        onResultRef.current?.(fullCurrent);

        // 重設計時器：當有辨識出文字時，若停頓超過 autoStopDelay 毫秒則自動停止並送出解析
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (fullCurrent.trim().length > 0 && autoStopDelay > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && transcriptRef.current.trim()) {
              stopListening();
            }
          }, autoStopDelay);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('[SpeechRecognition Error]', err.error, err);

        if (err.error === 'not-allowed') {
          setErrorMessage('請允許瀏覽器麥克風權限以進行語音記帳。');
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'audio-capture') {
          setErrorMessage('無法取得麥克風音訊，請確認麥克風已開啟且未被其他程式佔用。');
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'network') {
          setErrorMessage('語音辨識連線不穩定，請檢查網路後重試。');
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'no-speech') {
          // 靜音無說話，不噴出中斷性錯誤，維持監聽
        } else if (err.error !== 'aborted') {
          setErrorMessage(`語音辨識提示：${err.error}`);
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // 若使用者尚未主動按停止，但瀏覽器自動斷開 (例如 Safari 偶發 auto-cutoff)
        if (isListeningRef.current && !userStoppedRef.current) {
          // 若已有足夠內容，直接結算
          if (transcriptRef.current.trim()) {
            isListeningRef.current = false;
            setIsListening(false);
            const finalVal = transcriptRef.current.trim();
            onEndRef.current?.(finalVal);
          } else {
            // 若尚未取得任何字詞，嘗試重啟以保持監聽
            try {
              recognition.start();
            } catch {
              isListeningRef.current = false;
              setIsListening(false);
            }
          }
        } else {
          isListeningRef.current = false;
          setIsListening(false);
          const finalVal = transcriptRef.current.trim();
          if (finalVal) {
            onEndRef.current?.(finalVal);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage('');
    } catch (e: any) {
      console.error('[SpeechRecognition Start Failed]', e);
      setErrorMessage(`無法啟動語音辨識：${e.message || '請重新整理頁面重試'}`);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [autoStopDelay, stopListening]);

  // 卸載時清理
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const getLatestTranscript = useCallback(() => {
    return transcriptRef.current;
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
    getLatestTranscript,
  };
}
