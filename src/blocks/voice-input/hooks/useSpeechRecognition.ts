'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as CapSpeechRecognition } from '@capacitor-community/speech-recognition';

// 快取原生麥克風權限檢查結果，避免每次點擊時重複 round-trip IPC 阻塞
let isNativePermissionGranted = false;
let nativePermissionWarmup: Promise<void> | null = null;

// 📱 App 啟動時預先背景檢查權限（只檢查不跳窗），讓第一次按下麥克風就能直接開始收音
const warmupNativePermission = () => {
  if (isNativePermissionGranted || nativePermissionWarmup) return nativePermissionWarmup;
  nativePermissionWarmup = (async () => {
    try {
      const perm = await CapSpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== 'granted') return;
      const avail = await CapSpeechRecognition.available();
      if (avail.available) isNativePermissionGranted = true;
    } catch {
    } finally {
      nativePermissionWarmup = null;
    }
  })();
  return nativePermissionWarmup;
};

// 手機瀏覽器 (Android Chrome / iOS Safari) 的 continuous 模式延遲高且容易重複字詞，改用單句模式可即時出字並在停頓後立即結算
const isMobileBrowser = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: (finalTranscript: string) => void;
  autoStopDelay?: number; // 說話結束後自動結算停頓秒數 (毫秒，預設 1600ms)
}

export function useSpeechRecognition({
  onResult,
  onEnd,
  autoStopDelay = 1600,
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
  const hasEndedRef = useRef<boolean>(false);
  const nativeStoppedRef = useRef<boolean>(false);
  // 同一頁面可能同時掛載多個語音元件，原生監聽器是全域廣播，只有「目前正在收音的實例」才處理事件
  const nativeSessionActiveRef = useRef<boolean>(false);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const autoStopDelayRef = useRef(autoStopDelay);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    autoStopDelayRef.current = autoStopDelay;
  }, [autoStopDelay]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // 🎯 統一定義安全結算並進入下一步的函式 (防重複、防丟失字詞)
  const finishRecognition = useCallback((textToUse?: string) => {
    if (hasEndedRef.current) return;

    clearSilenceTimer();

    const finalText = (textToUse !== undefined ? textToUse : transcriptRef.current).trim();
    if (!finalText) return;

    hasEndedRef.current = true;
    isListeningRef.current = false;
    nativeSessionActiveRef.current = false;
    setIsListening(false);

    if (Capacitor.isNativePlatform()) {
      CapSpeechRecognition.stop().catch(() => {});
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    onEndRef.current?.(finalText);
  }, []);

  // 停止語音聆聽
  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    clearSilenceTimer();

    const wasActive = isListeningRef.current || nativeSessionActiveRef.current;
    isListeningRef.current = false;
    nativeSessionActiveRef.current = false;
    setIsListening(false);

    const finalVal = transcriptRef.current.trim();
    if (finalVal && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onEndRef.current?.(finalVal);
    }

    if (Capacitor.isNativePlatform()) {
      if (wasActive) CapSpeechRecognition.stop().catch(() => {});
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // 重設語音字串
  const resetTranscript = useCallback(() => {
    clearSilenceTimer();
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    setErrorMessage('');
    hasEndedRef.current = false;
    nativeStoppedRef.current = false;
  }, []);

  // 📱 原生端：掛載時一次性註冊監聽器（不再於每次開麥克風前 await 多次 IPC），並預熱權限檢查
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    warmupNativePermission();

    const handles: { remove: () => Promise<void> }[] = [];
    let disposed = false;

    const handlePartial = (data: { matches: string[] }) => {
      if (!nativeSessionActiveRef.current || hasEndedRef.current) return;
      if (!data.matches || data.matches.length === 0) return;

      const text = data.matches[0];
      transcriptRef.current = text;
      setTranscript(text);
      setInterimText(text);
      onResultRef.current?.(text);

      clearSilenceTimer();
      if (!text.trim()) return;

      if (nativeStoppedRef.current) {
        // 原生錄音已停止（系統偵測語音結束），收到最終結果後立即結算
        silenceTimerRef.current = setTimeout(() => finishRecognition(text.trim()), 150);
      } else if (autoStopDelayRef.current > 0) {
        silenceTimerRef.current = setTimeout(
          () => finishRecognition(transcriptRef.current.trim()),
          autoStopDelayRef.current
        );
      }
    };

    const handleState = (data: { status: 'started' | 'stopped' }) => {
      if (!nativeSessionActiveRef.current) return;

      if (data.status === 'started') {
        nativeStoppedRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
        return;
      }

      nativeStoppedRef.current = true;
      isListeningRef.current = false;
      setIsListening(false);
      clearSilenceTimer();

      if (transcriptRef.current.trim()) {
        // 已有辨識文字，短緩衝等待 Android onResults 可能稍晚送達的最終字詞
        silenceTimerRef.current = setTimeout(() => finishRecognition(transcriptRef.current.trim()), 200);
      } else {
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            finishRecognition(transcriptRef.current.trim());
          } else {
            nativeSessionActiveRef.current = false;
          }
        }, 500);
      }
    };

    (async () => {
      try {
        const h1 = await CapSpeechRecognition.addListener('partialResults', handlePartial);
        const h2 = await CapSpeechRecognition.addListener('listeningState', handleState);
        if (disposed) {
          h1.remove();
          h2.remove();
          return;
        }
        handles.push(h1, h2);
      } catch (err) {
        console.warn('Native speech listener registration failed:', err);
      }
    })();

    return () => {
      disposed = true;
      handles.forEach((h) => h.remove().catch(() => {}));
    };
  }, [finishRecognition]);

  // 啟動語音辨識 (每次啟動時皆建立獨立實例，以相容各版本 Chrome/Safari/Edge/Mobile)
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    userStoppedRef.current = false;
    hasEndedRef.current = false;
    nativeStoppedRef.current = false;
    clearSilenceTimer();

    // 📱 1. 若為 Capacitor 原生行動裝置 (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      // 先切換 UI 為聆聽中，讓使用者按下即有回饋
      nativeSessionActiveRef.current = true;
      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage('');

      (async () => {
        try {
          if (nativePermissionWarmup) await nativePermissionWarmup;

          // 若尚未確認過權限，進行一次性權限與可用性檢查
          if (!isNativePermissionGranted) {
            const hasPerm = await CapSpeechRecognition.checkPermissions();
            if (hasPerm.speechRecognition !== 'granted') {
              const req = await CapSpeechRecognition.requestPermissions();
              if (req.speechRecognition !== 'granted') {
                setErrorMessage('請允許麥克風權限以進行語音記帳。');
                nativeSessionActiveRef.current = false;
                setIsListening(false);
                isListeningRef.current = false;
                return;
              }
            }

            const avail = await CapSpeechRecognition.available();
            if (!avail.available) {
              setErrorMessage('此裝置目前無法使用語音辨識服務，請確認系統語音辨識已啟用。');
              nativeSessionActiveRef.current = false;
              setIsListening(false);
              isListeningRef.current = false;
              return;
            }
            isNativePermissionGranted = true;
          }

          // 使用者可能在權限檢查期間已關閉視窗
          if (!nativeSessionActiveRef.current) return;

          const res = await CapSpeechRecognition.start({
            language: 'zh-TW',
            maxResults: 1,
            prompt: '請說出記帳內容...',
            partialResults: true,
            popup: false,
          });

          if (res?.matches && res.matches.length > 0 && nativeSessionActiveRef.current) {
            const text = res.matches[0];
            transcriptRef.current = text;
            setTranscript(text);
            onResultRef.current?.(text);
            finishRecognition(text.trim());
          }
        } catch (err: any) {
          console.error('Native speech recognition error:', err);
          if (nativeSessionActiveRef.current && !transcriptRef.current.trim()) {
            setErrorMessage(`無法啟動語音辨識：${err?.message || '請確認麥克風權限'}`);
            nativeSessionActiveRef.current = false;
            setIsListening(false);
            isListeningRef.current = false;
          }
        }
      })();
      return;
    }

    // 🌐 2. 若為 Web 瀏覽器端 (Chrome / Safari / Edge)
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
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    const mobile = isMobileBrowser();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = !mobile;
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

        clearSilenceTimer();

        // 手機單句模式：瀏覽器給出最終結果即代表使用者已停頓，直接結算不再等計時器
        const lastResult = event.results[event.results.length - 1];
        if (mobile && lastResult?.isFinal && fullCurrent.trim()) {
          finishRecognition(fullCurrent.trim());
          return;
        }

        // 重設計時器：當有辨識出文字時，若停頓超過 autoStopDelay 毫秒則自動停止並送出解析
        if (fullCurrent.trim().length > 0 && autoStopDelayRef.current > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && transcriptRef.current.trim()) {
              finishRecognition(transcriptRef.current.trim());
            }
          }, autoStopDelayRef.current);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('[SpeechRecognition Error]', err.error, err);

        if (err.error === 'not-allowed') {
          setErrorMessage('請允許瀏覽器麥克風權限以進行語音記帳。');
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'audio-capture') {
          setErrorMessage('無法取得麥克風音訊，請確認麥克風已開啟且未被其他程式佔用。');
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'network') {
          setErrorMessage('語音辨識連線不穩定，請檢查網路後重試。');
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
        } else if (err.error === 'no-speech') {
          // 靜音無說話，不噴出中斷性錯誤，維持監聽
        } else if (err.error !== 'aborted') {
          setErrorMessage(`語音辨識提示：${err.error}`);
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();

        const finalVal = transcriptRef.current.trim();
        if (finalVal) {
          finishRecognition(finalVal);
          return;
        }

        // 若使用者尚未主動按停止，但瀏覽器自動斷開 (手機單句模式的靜音逾時或 Safari auto-cutoff)，重啟以保持監聽
        if (isListeningRef.current && !userStoppedRef.current && recognitionRef.current === recognition) {
          try {
            recognition.start();
            return;
          } catch {}
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage('');
      } catch (startErr: any) {
        if (startErr?.message?.includes('already started')) {
          isListeningRef.current = true;
          setIsListening(true);
        } else {
          throw startErr;
        }
      }
    } catch (e: any) {
      console.error('[SpeechRecognition Start Failed]', e);
      setErrorMessage(`無法啟動語音辨識：${e.message || '請確認麥克風權限'}`);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [finishRecognition]);

  // 卸載時清理
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (Capacitor.isNativePlatform() && nativeSessionActiveRef.current) {
        CapSpeechRecognition.stop().catch(() => {});
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
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
