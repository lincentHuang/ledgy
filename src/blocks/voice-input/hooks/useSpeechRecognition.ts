'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as CapSpeechRecognition } from '@capacitor-community/speech-recognition';

// 快取原生麥克風權限檢查結果，避免每次點擊時重複 round-trip IPC 阻塞
let isNativePermissionGranted = false;

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

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // 🎯 統一定義安全結算並進入下一步的函式 (防重複、防丟失字詞)
  const finishRecognition = useCallback((textToUse?: string) => {
    if (hasEndedRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const finalText = (textToUse !== undefined ? textToUse : transcriptRef.current).trim();
    if (!finalText) return;

    hasEndedRef.current = true;
    isListeningRef.current = false;
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
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    isListeningRef.current = false;
    setIsListening(false);

    const finalVal = transcriptRef.current.trim();
    if (finalVal && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onEndRef.current?.(finalVal);
    }

    if (Capacitor.isNativePlatform()) {
      CapSpeechRecognition.stop().catch(() => {});
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
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    setErrorMessage('');
    hasEndedRef.current = false;
    nativeStoppedRef.current = false;
  }, []);

  // 啟動語音辨識 (每次啟動時皆建立獨立實例，以相容各版本 Chrome/Safari/Edge/Mobile)
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    userStoppedRef.current = false;
    hasEndedRef.current = false;
    nativeStoppedRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 📱 1. 若為 Capacitor 原生行動裝置 (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          // 若尚未確認過權限，進行一次性權限與可用性檢查
          if (!isNativePermissionGranted) {
            const hasPerm = await CapSpeechRecognition.checkPermissions();
            if (hasPerm.speechRecognition !== 'granted') {
              const req = await CapSpeechRecognition.requestPermissions();
              if (req.speechRecognition !== 'granted') {
                setErrorMessage('請允許麥克風權限以進行語音記帳。');
                setIsListening(false);
                isListeningRef.current = false;
                return;
              }
            }

            const avail = await CapSpeechRecognition.available();
            if (!avail.available) {
              setErrorMessage('此裝置目前無法使用語音辨識服務，請確認系統語音辨識已啟用。');
              setIsListening(false);
              isListeningRef.current = false;
              return;
            }
            isNativePermissionGranted = true;
          }

          await CapSpeechRecognition.removeAllListeners();

          await CapSpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
            if (data.matches && data.matches.length > 0) {
              const text = data.matches[0];
              transcriptRef.current = text;
              setTranscript(text);
              setInterimText(text);
              onResultRef.current?.(text);

              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }

              if (text.trim().length > 0) {
                // 若原生錄音已停止（例如系統偵測語音結束 onEndOfSpeech），收到此最終結果後延遲 250ms 即結算
                if (nativeStoppedRef.current) {
                  silenceTimerRef.current = setTimeout(() => {
                    finishRecognition(text.trim());
                  }, 250);
                } else if (autoStopDelay > 0) {
                  // 原生端仍在收音，保持靜音停頓計時
                  silenceTimerRef.current = setTimeout(() => {
                    finishRecognition(transcriptRef.current.trim());
                  }, autoStopDelay);
                }
              }
            }
          });

          await CapSpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
            if (data.status === 'started') {
              nativeStoppedRef.current = false;
              isListeningRef.current = true;
              setIsListening(true);
            } else if (data.status === 'stopped') {
              nativeStoppedRef.current = true;
              isListeningRef.current = false;
              setIsListening(false);

              // 延遲給予緩衝，避免 Android onResults 比 listeningState 稍晚送達
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }

              if (transcriptRef.current.trim()) {
                // 已有辨識文字，給予 300ms 緩衝結算
                silenceTimerRef.current = setTimeout(() => {
                  finishRecognition(transcriptRef.current.trim());
                }, 300);
              } else {
                // 若目前為空，給予 650ms 緩衝等待延遲送達的 partialResults/onResults
                silenceTimerRef.current = setTimeout(() => {
                  if (transcriptRef.current.trim()) {
                    finishRecognition(transcriptRef.current.trim());
                  }
                }, 650);
              }
            }
          });

          isListeningRef.current = true;
          setIsListening(true);
          setErrorMessage('');

          // 立即啟動 Android 原生收音 (毫秒級響應，< 15ms)
          CapSpeechRecognition.start({
            language: 'zh-TW',
            maxResults: 1,
            prompt: '請說出記帳內容...',
            partialResults: true,
            popup: false,
          })
            .then((res) => {
              if (res?.matches && res.matches.length > 0) {
                const text = res.matches[0];
                transcriptRef.current = text;
                setTranscript(text);
                onResultRef.current?.(text);
                finishRecognition(text.trim());
              }
            })
            .catch((err) => {
              console.warn('Native speech recognition start error:', err);
            });
        } catch (err: any) {
          console.error('Native speech recognition error:', err);
          setErrorMessage(`無法啟動語音辨識：${err.message || '請確認麥克風權限'}`);
          setIsListening(false);
          isListeningRef.current = false;
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
          if (transcriptRef.current.trim()) {
            finishRecognition(transcriptRef.current.trim());
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
          const finalVal = transcriptRef.current.trim();
          if (finalVal) {
            finishRecognition(finalVal);
          } else {
            isListeningRef.current = false;
            setIsListening(false);
          }
        }
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
  }, [autoStopDelay, stopListening, finishRecognition]);

  // 卸載時清理
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (Capacitor.isNativePlatform()) {
        CapSpeechRecognition.stop().catch(() => {});
        CapSpeechRecognition.removeAllListeners().catch(() => {});
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
