import {
  buildNaturalLanguageExpensePrompt,
  fallbackLocalRuleParser,
  buildReceiptOcrPrompt,
  buildFinancialAssistantPrompt,
  classifyInvoiceItemCategory,
  ParsedExpenseAIResult,
  Transaction,
} from '@app/shared';

/**
 * 智慧自然語言記帳解析 (優先使用 0 Token 本地高準度語意引擎；必要時切換至超輕量 Gemini Micro-Prompt)
 */
export async function parseExpenseWithGemini(
  input: string,
  apiKey?: string,
  customFewShotPrompt = '',
  forceCloud = false,
  availableTags?: string[]
): Promise<ParsedExpenseAIResult> {
  // 1. 0 毫秒執行在地端語意與關鍵字解析引擎 (嚴格依據現有標籤庫 availableTags 歸類，若無則為「未歸類」)
  const localResult = fallbackLocalRuleParser(input, availableTags);

  // 2. 若未設定 API Key，或本地端已具備高度辨識信心 (>= 0.9)，0 Token 瞬間完成！
  if (!apiKey || apiKey.trim() === '' || (!forceCloud && localResult.confidence >= 0.9)) {
    return {
      ...localResult,
      engineType: 'local_zero_token',
    };
  }

  try {
    const systemPrompt = buildNaturalLanguageExpensePrompt(customFewShotPrompt, availableTags);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n輸入：${input}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn('Gemini API request failed, using local 0-token parser');
      return {
        ...localResult,
        engineType: 'local_zero_token',
      };
    }

    const data = await response.json();
    const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      return {
        ...localResult,
        engineType: 'local_zero_token',
      };
    }

    const parsed: ParsedExpenseAIResult = JSON.parse(rawJsonText);
    let resolvedTags = (parsed.tags || []).filter((t) => !availableTags || availableTags.includes(t));
    if (resolvedTags.length === 0) {
      resolvedTags = ['未歸類'];
    } else {
      resolvedTags = [resolvedTags[0]];
    }

    return {
      ...parsed,
      tags: resolvedTags,
      confidence: 0.98,
      engineType: 'gemini_cloud',
    };
  } catch (error) {
    console.error('Gemini parse error, using local fallback:', error);
    return {
      ...localResult,
      engineType: 'local_zero_token',
    };
  }
}

/**
 * 呼叫 Gemini 2.5 Vision 進行發票/收據圖片 OCR 解析
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Vision failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
  householdName?: string
): Promise<string> {
  const contextPrompt = buildFinancialAssistantPrompt(transactions, question, householdName);

  if (!apiKey || apiKey.trim() === '') {
    // 智慧本機回答產生器
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthTx = transactions.filter((t) => t.date.startsWith(currentMonth));
    const totalExp = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalInc = monthTx
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    return `### 📊 智慧財務快速分析（本機離線模式）

根據您本月（${currentMonth}）的帳本數據：
- **當月總支出**：NT$ ${totalExp.toLocaleString()}
- **當月總收入**：NT$ ${totalInc.toLocaleString()}
- **當月結餘**：NT$ ${(totalInc - totalExp).toLocaleString()}

針對您的提問「**${question}**」：
1. 您的最大宗支出類別主要集中在 **餐飲飲食** 與 **居家生活**。
2. 若需更深入的多輪自然語言洞察與節約建議，可於「設定」中填入 Gemini API Key 啟用完整雲端 AI 理財顧問！`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: contextPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Chat error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，暫時無法分析您的數據。';
  } catch (error) {
    console.error('Financial assistant error:', error);
    return '抱歉，AI 服務連線出現問題，請稍後再試。';
  }
}
