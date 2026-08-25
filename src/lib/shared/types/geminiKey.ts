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

/**
 * 前端直連 Google 官方端點進行金鑰探針驗證 (支援 SPA、Firebase Hosting 與 Native App 離線環境)
 */
export async function validateGeminiKeyDirectly(
  apiKey: string
): Promise<ValidateApiKeyResponseDto> {
  const cleanKey = (apiKey || '').trim();

  if (!cleanKey) {
    return {
      valid: false,
      errorCode: 'INVALID_FORMAT',
      message: '請輸入 Google Gemini API Key',
    };
  }

  // 1. 快速 Regex 格式檢查
  if (!GEMINI_KEY_REGEX.test(cleanKey)) {
    return {
      valid: false,
      errorCode: 'INVALID_FORMAT',
      message: '格式不正確：請輸入有效的 Google Gemini API Key（支援 AQ. 或 AIzaSy 格式）',
    };
  }

  // 2. 輕量探針測試 (Ping Test): 呼叫 Google 官方 models 清單端點
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    ).catch((err) => {
      if (err.name === 'AbortError') throw new Error('TIMEOUT');
      throw err;
    });

    clearTimeout(timeoutId);

    if (googleRes.ok) {
      return {
        valid: true,
        maskedKey: maskApiKey(cleanKey),
        message: 'API Key 驗證成功，個人免費配額正常！',
      };
    }

    const errorData = await googleRes.json().catch(() => ({}));
    const status = googleRes.status;

    if (status === 400 || status === 403) {
      return {
        valid: false,
        errorCode: 'INVALID_API_KEY',
        message: 'Google 拒絕連線：金鑰無效、專案未啟用 Gemini API 或權限受限',
      };
    }

    if (status === 429) {
      return {
        valid: false,
        errorCode: 'QUOTA_EXCEEDED',
        message: '此金鑰目前已達 Google 免費配額上限，請稍候重試',
      };
    }

    return {
      valid: false,
      errorCode: 'INVALID_API_KEY',
      message: errorData?.error?.message || 'Google 驗證失敗，請確認金鑰正確性',
    };
  } catch (err: any) {
    return {
      valid: false,
      errorCode: 'NETWORK_ERROR',
      message: err.message === 'TIMEOUT' ? '連線超時：無法連線至 Google 伺服器' : '網路連線異常，請檢查網路連線後重試',
    };
  }
}
