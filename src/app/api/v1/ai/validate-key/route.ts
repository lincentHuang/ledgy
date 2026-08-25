import { NextRequest, NextResponse } from 'next/server';
import {
  GEMINI_KEY_REGEX,
  maskApiKey,
  ValidateApiKeyRequestDto,
  ValidateApiKeyResponseDto,
} from '@/lib/shared/types/geminiKey';

export async function POST(req: NextRequest) {
  try {
    const body: ValidateApiKeyRequestDto = await req.json().catch(() => ({ apiKey: '' }));
    const apiKey = (body.apiKey || '').trim();

    if (!apiKey) {
      return NextResponse.json<ValidateApiKeyResponseDto>(
        {
          valid: false,
          errorCode: 'INVALID_FORMAT',
          message: '請輸入 Google Gemini API Key',
        },
        { status: 400 }
      );
    }

    // 1. 快速 Regex 格式檢查
    if (!GEMINI_KEY_REGEX.test(apiKey)) {
      return NextResponse.json<ValidateApiKeyResponseDto>(
        {
          valid: false,
          errorCode: 'INVALID_FORMAT',
          message: '格式不正確：請輸入有效的 Google Gemini API Key（支援 AQ. 或 AIzaSy 格式）',
        },
        { status: 400 }
      );
    }

    // 2. 輕量探針測試 (Ping Test): 呼叫 Google models endpoint 測試連線與金鑰存活度
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const googleRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    ).catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw err;
    });

    clearTimeout(timeoutId);

    if (googleRes.ok) {
      return NextResponse.json<ValidateApiKeyResponseDto>(
        {
          valid: true,
          maskedKey: maskApiKey(apiKey),
          message: 'API Key 驗證成功，個人免費配額正常！',
        },
        { status: 200 }
      );
    }

    const errorData = await googleRes.json().catch(() => ({}));
    const status = googleRes.status;

    if (status === 400 || status === 403) {
      return NextResponse.json<ValidateApiKeyResponseDto>(
        {
          valid: false,
          errorCode: 'INVALID_API_KEY',
          message: 'Google 拒絕連線：金鑰無效、專案未啟用 Gemini API 或權限受限',
        },
        { status: 400 }
      );
    }

    if (status === 429) {
      return NextResponse.json<ValidateApiKeyResponseDto>(
        {
          valid: false,
          errorCode: 'QUOTA_EXCEEDED',
          message: '此金鑰目前已達 Google 免費配額上限，請稍候重試',
        },
        { status: 429 }
      );
    }

    return NextResponse.json<ValidateApiKeyResponseDto>(
      {
        valid: false,
        errorCode: 'INVALID_API_KEY',
        message: errorData?.error?.message || 'Google 驗證失敗，請確認金鑰正確性',
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Gemini Key validation error:', err);
    return NextResponse.json<ValidateApiKeyResponseDto>(
      {
        valid: false,
        errorCode: 'NETWORK_ERROR',
        message: err.message === 'TIMEOUT' ? '連線超時：無法連線至 Google 伺服器' : '網路連線異常，請檢查網路連線後重試',
      },
      { status: 500 }
    );
  }
}
