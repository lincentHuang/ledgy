'use client';

import { useState, useCallback } from 'react';
import { Platform } from '@/lib/platform';

export function useBarcodeCarrier(initialCarrierCode = '/AB1234+') {
  const [carrierCode, setCarrierCode] = useState(initialCarrierCode);
  const [copied, setCopied] = useState(false);

  const copyCarrierCode = useCallback(async (codeToCopy?: string) => {
    const code = codeToCopy || carrierCode;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      Platform.haptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [carrierCode]);

  return {
    carrierCode,
    setCarrierCode,
    copied,
    copyCarrierCode,
  };
}
