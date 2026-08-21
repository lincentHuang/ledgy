'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: (finalTranscript: string) => void;
}

export function useSpeechRecognition({ onResult, onEnd }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'zh-TW';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage('');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          transcriptRef.current = currentTranscript;
          setTranscript(currentTranscript);
          onResult?.(currentTranscript);
        };

        recognition.onend = () => {
          setIsListening(false);
          onEnd?.(transcriptRef.current);
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsListening(false);
          if (err.error === 'not-allowed') {
            setErrorMessage('請允許瀏覽器麥克風權限以進行語音記帳。');
          } else if (err.error !== 'no-speech') {
            setErrorMessage(`語音辨識提示：${err.error}`);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onResult, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setErrorMessage('您的瀏覽器不支援原生 Web Speech 語音辨識，請使用 Chrome 或 Safari。');
      return;
    }
    try {
      setErrorMessage('');
      recognitionRef.current.start();
    } catch {}
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    transcriptRef.current = '';
    setErrorMessage('');
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
