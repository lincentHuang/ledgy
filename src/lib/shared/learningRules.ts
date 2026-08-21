import { LearningRule } from './types/user';
import { Transaction } from './types/expense';

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

    // 優先比對商家名稱
    if (cleanMerchant) {
      const vendorMatch = this.rules.find(
        r => r.vendorPattern && cleanMerchant.includes(r.vendorPattern.toLowerCase())
      );
      if (vendorMatch) return vendorMatch;
    }

    // 次之比對關鍵字
    const keywordMatch = this.rules.find(
      r => r.keywordPattern && cleanText.includes(r.keywordPattern.toLowerCase())
    );
    if (keywordMatch) return keywordMatch;

    return null;
  }

  /**
   * 當使用者手動修改分類、子分類或標籤時，自動記錄學習規則
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
    const keyword = title.trim();

    // 搜尋是否已有存在的規則
    const existingIndex = this.rules.findIndex(
      r => (keyVendor && r.vendorPattern.toLowerCase() === keyVendor.toLowerCase()) ||
           (keyword && r.keywordPattern?.toLowerCase() === keyword.toLowerCase())
    );

    const now = Date.now();

    if (existingIndex >= 0) {
      const existing = this.rules[existingIndex];
      const updated: LearningRule = {
        ...existing,
        targetCategoryId: newCategoryId,
        targetCategoryName: newCategoryName,
        targetSubCategory: newSubCategory,
        targetTags: Array.from(new Set([...(existing.targetTags || []), ...newTags])),
        usageCount: existing.usageCount + 1,
        confidence: Math.min(1.0, existing.confidence + 0.1),
        updatedAt: now,
      };
      this.rules[existingIndex] = updated;
      return updated;
    } else {
      const newRule: LearningRule = {
        id: `rule_${now}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        householdId,
        vendorPattern: keyVendor || keyword,
        keywordPattern: keyword || keyVendor,
        targetCategoryId: newCategoryId,
        targetCategoryName: newCategoryName,
        targetSubCategory: newSubCategory,
        targetTags: newTags,
        confidence: 0.8,
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
    const topRules = this.rules.slice(0, 8);
    const examples = topRules.map(r => {
      const tagsStr = r.targetTags?.length ? ` #${r.targetTags.join(' #')}` : '';
      return `- 若遇到包含「${r.vendorPattern || r.keywordPattern}」的項目，分類應為「${r.targetCategoryName || r.targetCategoryId}」${r.targetSubCategory ? ` / ${r.targetSubCategory}` : ''}${tagsStr}`;
    });

    return `\n【使用者的個人化偏好學習記憶（必須優先遵循）】：\n${examples.join('\n')}\n`;
  }
}
