import { LearningRule } from './types/user';
import { extractLearningKeywords } from './tagMatcher';

export class AdaptiveLearningEngine {
  private rules: LearningRule[] = [];

  constructor(initialRules: LearningRule[] = []) {
    this.rules = [...initialRules];
  }

  public setRules(rules: LearningRule[]) {
    this.rules = [...rules];
  }

  public getRules(): LearningRule[] {
    return this.rules;
  }

  /**
   * 根據輸入的文字或商家名稱匹配最佳偏好規則
   */
  public matchRule(text: string, merchant?: string): LearningRule | null {
    if (!text && !merchant) return null;
    const cleanText = (text || '').toLowerCase();
    const cleanMerchant = (merchant || '').toLowerCase();

    // 1. 優先比對商家名稱
    if (cleanMerchant) {
      const vendorMatch = this.rules.find(
        (r) =>
          r.vendorPattern &&
          (cleanMerchant.includes(r.vendorPattern.toLowerCase()) ||
            r.vendorPattern.toLowerCase().includes(cleanMerchant))
      );
      if (vendorMatch) return vendorMatch;
    }

    // 2. 次之比對關鍵字 (雙向包含比對)
    const keywordMatch = this.rules.find(
      (r) =>
        r.keywordPattern &&
        (cleanText.includes(r.keywordPattern.toLowerCase()) ||
          r.keywordPattern.toLowerCase().includes(cleanText))
    );
    if (keywordMatch) return keywordMatch;

    return null;
  }

  /**
   * 當使用者手動修改分類、子分類或標籤時，自動記錄學習規則並生成關聯關鍵字庫
   */
  public recordUserCorrection(
    title: string,
    merchant: string | undefined,
    newCategoryId: string,
    newCategoryName: string,
    newSubCategory: string | undefined,
    newTags: string[],
    userId: string,
    householdId?: string
  ): LearningRule {
    const keyVendor = merchant ? merchant.trim() : '';
    const rawKeyword = title.trim();

    // 提取精煉關鍵字（如「大麥克」、「牛肉麵」）
    const extracted = extractLearningKeywords(rawKeyword, keyVendor);
    const primaryKeyword = extracted.length > 0 ? extracted[0] : rawKeyword;

    // 搜尋是否已有存在的規則
    const existingIndex = this.rules.findIndex(
      (r) =>
        (keyVendor && r.vendorPattern.toLowerCase() === keyVendor.toLowerCase()) ||
        (primaryKeyword && r.keywordPattern?.toLowerCase() === primaryKeyword.toLowerCase()) ||
        (rawKeyword && r.keywordPattern?.toLowerCase() === rawKeyword.toLowerCase())
    );

    const now = Date.now();

    if (existingIndex >= 0) {
      const existing = this.rules[existingIndex];
      const updated: LearningRule = {
        ...existing,
        targetCategoryId: newCategoryId,
        targetCategoryName: newCategoryName,
        targetSubCategory: newSubCategory,
        targetTags: Array.from(new Set([...newTags, ...(existing.targetTags || [])])),
        usageCount: (existing.usageCount || 1) + 1,
        confidence: Math.min(1.0, (existing.confidence || 0.8) + 0.1),
        updatedAt: now,
      };
      this.rules[existingIndex] = updated;
      return updated;
    } else {
      const newRule: LearningRule = {
        id: `rule_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId: userId || 'user_tw_01',
        householdId,
        vendorPattern: keyVendor || primaryKeyword,
        keywordPattern: primaryKeyword || rawKeyword || keyVendor,
        targetCategoryId: newCategoryId,
        targetCategoryName: newCategoryName,
        targetSubCategory: newSubCategory,
        targetTags: newTags,
        confidence: 0.95,
        usageCount: 1,
        createdAt: now,
        updatedAt: now,
      };
      this.rules.push(newRule);
      return newRule;
    }
  }

  /**
   * 將自適應規則轉換為 Few-Shot 範例字串，供 Gemini 提示詞注入
   */
  public generateFewShotPrompt(): string {
    if (this.rules.length === 0) return '';
    const topRules = this.rules.slice(0, 10);
    const examples = topRules.map((r) => {
      const tagsStr = r.targetTags?.length ? ` #${r.targetTags.join(' #')}` : '';
      return `- 若遇到包含「${r.vendorPattern || r.keywordPattern}」的項目，標籤應為「${r.targetTags?.[0] || '未歸類'}」${tagsStr}，主分類為「${r.targetCategoryName || r.targetCategoryId}」`;
    });

    return `\n【使用者的個人化偏好學習記憶（必須優先遵循）】：\n${examples.join('\n')}\n`;
  }
}
