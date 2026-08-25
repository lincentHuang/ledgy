// ==========================================
// Gemini API Key 相關型別與常數定義 (BYOK Spec)
// ==========================================

export interface ValidateApiKeyRequestDto {
  apiKey: string;
}

export type ValidateApiKeyErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR';

export interface ValidateApiKeyResponseDto {
  valid: boolean;
  maskedKey?: string;
  errorCode?: ValidateApiKeyErrorCode;
  message: string;
}

export interface UserAiSettingsDto {
  hasCustomKey: boolean;
  maskedKey: string | null;
  lastValidatedAt: string | null;
}

/**
 * Google AI Studio 產生的 Gemini API Key 格式規則：
 * 1. 新版 Google Auth Key: 以 AQ. 開頭，長度不固定（含英數大小寫、點號、底線、破折號）
 * 2. 舊版 Standard Key: 以 AIzaSy 開頭的 39 碼字串
 * 3. 彈性容許 20 ~ 128 字元的有效金鑰格式
 */
export const GEMINI_KEY_REGEX = /^(AQ\.[A-Za-z0-9_.-]{20,120}|AIzaSy[A-Za-z0-9_-]{33}|[A-Za-z0-9_.-]{20,128})$/;

/**
 * 將 API Key 轉換為安全遮罩格式，例如 "AQ.Ab8R...y4Wt" 或 "AIzaSy...4xQ9"
 */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length < 10) return '••••••••';
  const prefixLength = trimmed.startsWith('AQ.') ? 7 : 6;
  return `${trimmed.slice(0, prefixLength)}...${trimmed.slice(-4)}`;
}
