import {
  buildNaturalLanguageExpensePrompt,
  fallbackLocalRuleParser,
  parseMultiVoiceExpensesLocal,
  buildReceiptOcrPrompt,
  buildFinancialAssistantPrompt,
  classifyInvoiceItemCategory,
  ParsedExpenseAIResult,
  Transaction,
} from '@app/shared';

// 支援的 Gemini 模型候選清單（優先使用高速穩定的 flash 模型，並具備自動降級容錯機制）
const CANDIDATE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

/**
 * 具備自動容錯與多模型退避的 Gemini 請求函式
 */
async function callGeminiApiWithFallback(
  apiKey: string,
  payload: any
): Promise<{ ok: boolean; data?: any; errorMsg?: string; status?: number }> {
  const cleanKey = apiKey.trim();
  let lastErrorMsg = '';

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data };
      }

      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${response.status}`;
      lastErrorMsg = msg;

      // 若為模型不可用、不存在或棄用 (404 或特定錯誤訊息)，繼續嘗試下一個候選模型
      const isModelUnavailable =
        response.status === 404 ||
        msg.includes('no longer available') ||
        msg.includes('is not found') ||
        msg.includes('not supported');

      if (isModelUnavailable) {
        console.warn(`[GeminiClient] Model ${model} unavailable (${msg}), trying next model...`);
        continue;
      }

      // 若為其他錯誤（例如金鑰無效、Quota 耗盡），直接回傳錯誤
      return { ok: false, errorMsg: msg, status: response.status };
    } catch (err: any) {
      lastErrorMsg = err.message || '網路連線失敗';
      console.warn(`[GeminiClient] Network error with model ${model}:`, err);
    }
  }

  return { ok: false, errorMsg: lastErrorMsg || '所有可用 Gemini 模型皆無法連線' };
}

/**
 * 智慧多筆自然語言記帳解析 (優先使用 0 Token 本地高準度切分與語意引擎；必要時切換至超輕量 Gemini Micro-Prompt)
 */
export async function parseExpensesWithGemini(
  input: string,
  apiKey?: string,
  customFewShotPrompt = '',
  forceCloud = false,
  availableTags?: string[]
): Promise<ParsedExpenseAIResult[]> {
  // 1. 0 毫秒執行在地端語意與多品項切分引擎
  const localResults = parseMultiVoiceExpensesLocal(input, availableTags);

  // 2. 若未設定 API Key，或本地端各筆已具備高度辨識信心 (>= 0.9)，0 Token 瞬間完成！
  const allLocalConfident = localResults.length > 0 && localResults.every((r) => r.confidence >= 0.9);
  if (!apiKey || apiKey.trim() === '' || (!forceCloud && allLocalConfident)) {
    return localResults.map((r) => ({
      ...r,
      engineType: 'local_zero_token',
    }));
  }

  try {
    const systemPrompt = buildNaturalLanguageExpensePrompt(customFewShotPrompt, availableTags);
    const result = await callGeminiApiWithFallback(apiKey, {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n輸入：${input}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    if (!result.ok || !result.data) {
      console.warn('Gemini API request failed, using local 0-token parser:', result.errorMsg);
      return localResults.map((r) => ({
        ...r,
        engineType: 'local_zero_token',
      }));
    }

    const rawJsonText = result.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      return localResults.map((r) => ({
        ...r,
        engineType: 'local_zero_token',
      }));
    }

    const parsedJson = JSON.parse(rawJsonText);
    let rawList: any[] = [];
    if (Array.isArray(parsedJson.expenses)) {
      rawList = parsedJson.expenses;
    } else if (Array.isArray(parsedJson)) {
      rawList = parsedJson;
    } else if (parsedJson && typeof parsedJson === 'object') {
      rawList = [parsedJson];
    }

    if (rawList.length === 0) {
      return localResults.map((r) => ({
        ...r,
        engineType: 'local_zero_token',
      }));
    }

    return rawList.map((item: any) => {
      let resolvedTags = (item.tags || []).filter((t: string) => !availableTags || availableTags.includes(t));
      if (resolvedTags.length === 0) {
        resolvedTags = ['未歸類'];
      } else {
        resolvedTags = [resolvedTags[0]];
      }

      return {
        title: item.title || input,
        amount: Number(item.amount) || 0,
        type: (item.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
        categoryId: item.categoryId || 'other_expense',
        categoryName: item.categoryName || '其他支出',
        subCategory: item.subCategory,
        paymentMethod: item.paymentMethod || '現金',
        tags: resolvedTags,
        ledgerType: item.ledgerType || 'personal',
        merchant: item.merchant,
        confidence: 0.98,
        engineType: 'gemini_cloud',
      };
    });
  } catch (error) {
    console.error('Gemini parse error, using local fallback:', error);
    return localResults.map((r) => ({
      ...r,
      engineType: 'local_zero_token',
    }));
  }
}

/**
 * 智慧單筆自然語言記帳解析 (向下相容)
 */
export async function parseExpenseWithGemini(
  input: string,
  apiKey?: string,
  customFewShotPrompt = '',
  forceCloud = false,
  availableTags?: string[]
): Promise<ParsedExpenseAIResult> {
  const results = await parseExpensesWithGemini(
    input,
    apiKey,
    customFewShotPrompt,
    forceCloud,
    availableTags
  );
  return (
    results[0] || {
      ...fallbackLocalRuleParser(input, availableTags),
      engineType: 'local_zero_token',
    }
  );
}

/**
 * 呼叫 Gemini Vision 進行發票/收據圖片 OCR 解析
 */
export async function parseReceiptImageWithGemini(
  base64Image: string,
  mimeType = 'image/jpeg',
  apiKey?: string
): Promise<any> {
  if (!apiKey || apiKey.trim() === '') {
    // 預設示範 OCR 解析結果 (真實模擬全聯大賣場多品項購物清單)
    return {
      merchant: '全聯福利中心 旗艦店',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 540,
      invoiceNumber: 'TW-88991234',
      paymentMethod: '全支付/PX Pay',
      categoryId: 'housing',
      categoryName: '居家生活',
      items: [
        { name: '冷藏美國牛五花火鍋肉片', quantity: 1, unitPrice: 180, amount: 180, categoryId: 'food', categoryName: '餐飲飲食', subCategory: '生鮮食材' },
        { name: '舒潔抽取式頂級衛生紙 (8包入)', quantity: 1, unitPrice: 270, amount: 270, categoryId: 'housing', categoryName: '居家生活', subCategory: '日用品消耗' },
        { name: '原萃無糖日式綠茶 580ml', quantity: 2, unitPrice: 45, amount: 90, categoryId: 'food', categoryName: '餐飲飲食', subCategory: '飲料飲品' },
      ],
      tags: ['超市採買', '發票辨識', 'AI多品項分類'],
    };
  }

  try {
    const prompt = buildReceiptOcrPrompt();
    const result = await callGeminiApiWithFallback(apiKey, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    if (!result.ok || !result.data) {
      throw new Error(result.errorMsg || 'Gemini Vision OCR 呼叫失敗');
    }

    const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);

    // 確保每筆商品品項皆具備 AI 分類標籤
    if (parsed.items && Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((it: any) => {
        if (!it.categoryId || !it.categoryName) {
          const catInfo = classifyInvoiceItemCategory(it.name, parsed.merchant);
          return {
            ...it,
            categoryId: it.categoryId || catInfo.categoryId,
            categoryName: it.categoryName || catInfo.categoryName,
            subCategory: it.subCategory || catInfo.subCategory,
          };
        }
        return it;
      });
    }

    return parsed;
  } catch (error) {
    console.error('Gemini Vision OCR Error:', error);
    throw error;
  }
}

/**
 * 呼叫 Gemini 進行財務顧問智慧對話
 */
export async function askFinancialAdvisor(
  transactions: Transaction[],
  question: string,
  apiKey?: string,
  householdName?: string,
  budgetInfo?: {
    monthlyBudget?: number;
    tagBudgets?: Record<string, number>;
  },
  dateRange?: {
    startDate?: string;
    endDate?: string;
    label?: string;
  }
): Promise<string> {
  const contextPrompt = buildFinancialAssistantPrompt(transactions, question, householdName, budgetInfo, dateRange);

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('尚未設定 Gemini API Key，請先至「設定 > API 金鑰」填入您的 Google Gemini API 金鑰。');
  }

  try {
    const result = await callGeminiApiWithFallback(apiKey, {
      contents: [
        {
          role: 'user',
          parts: [{ text: contextPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
      },
    });

    if (!result.ok || !result.data) {
      throw new Error(`Gemini API 呼叫失敗：${result.errorMsg}`);
    }

    return result.data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，暫時無法分析您的數據。';
  } catch (error: any) {
    console.error('Financial assistant error:', error);
    throw error;
  }
}

/**
 * 呼叫 Gemini 進行財務顧問智慧對話 (支援 SSE 即時打字串流，大幅降低延遲)
 */
export async function streamFinancialAdvisor(
  transactions: Transaction[],
  question: string,
  apiKey: string,
  options?: {
    householdName?: string;
    budgetInfo?: {
      monthlyBudget?: number;
      tagBudgets?: Record<string, number>;
    };
    dateRange?: {
      startDate?: string;
      endDate?: string;
      label?: string;
    };
    onChunk?: (accumulatedText: string, newChunk: string) => void;
  }
): Promise<string> {
  const contextPrompt = buildFinancialAssistantPrompt(
    transactions,
    question,
    options?.householdName,
    options?.budgetInfo,
    options?.dateRange
  );

  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('尚未設定 Gemini API Key，請先至「設定 > API 金鑰」填入您的 Google Gemini API 金鑰。');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: contextPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
    },
  };

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${cleanKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || `HTTP ${response.status}`;

        const isModelUnavailable =
          response.status === 404 ||
          msg.includes('no longer available') ||
          msg.includes('is not found') ||
          msg.includes('not supported');

        if (isModelUnavailable) {
          console.warn(`[GeminiStream] Model ${model} unavailable (${msg}), trying next...`);
          continue;
        }
        throw new Error(msg);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunk) {
                accumulatedText += chunk;
                options?.onChunk?.(accumulatedText, chunk);
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (chunk) {
              accumulatedText += chunk;
              options?.onChunk?.(accumulatedText, chunk);
            }
          } catch {
            // Ignore
          }
        }
      }

      if (accumulatedText.trim()) {
        return accumulatedText;
      }
    } catch (err: any) {
      console.warn(`[GeminiStream] Stream failed with model ${model}, trying fallback:`, err);
    }
  }

  // 若 SSE 串流因環境或網路限制失敗，退回標準非串流呼叫
  const fallbackResult = await askFinancialAdvisor(
    transactions,
    question,
    apiKey,
    options?.householdName,
    options?.budgetInfo
  );
  options?.onChunk?.(fallbackResult, fallbackResult);
  return fallbackResult;
}

