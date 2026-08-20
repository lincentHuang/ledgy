import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PieChart, TrendingUp, Sparkles, Flame } from 'lucide-react-native';
import { MOCK_TRANSACTIONS } from '../../../packages/shared/src/mockData';
import { DEFAULT_CATEGORIES } from '../../../packages/shared/src/defaultCategories';

export default function MobileAnalyticsScreen() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const thisMonthTx = MOCK_TRANSACTIONS.filter((t) => t.type === 'expense');
  const totalExpense = thisMonthTx.reduce((sum, t) => sum + t.amount, 0);

  const categoryTotals: Record<string, number> = {};
  thisMonthTx.forEach((t) => {
    categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
  });

  const ranking = Object.entries(categoryTotals)
    .map(([catId, amount]) => {
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === catId);
      const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        id: catId,
        name: cat?.name || catId,
        amount,
        percent,
        color: cat?.color || '#94a3b8',
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <ScrollView style={styles.container}>
      {/* 類別長條比例圖 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>本月支出類別分佈</Text>
        <Text style={styles.cardSub}>總支出 NT$ {totalExpense.toLocaleString()}</Text>

        <View style={styles.categoryList}>
          {ranking.map((r) => (
            <View key={r.id} style={styles.catItem}>
              <View style={styles.catRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.colorDot, { backgroundColor: r.color }]} />
                  <Text style={styles.catName}>{r.name}</Text>
                </View>
                <Text style={styles.catAmt}>
                  NT$ {r.amount.toLocaleString()} ({r.percent}%)
                </Text>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[styles.barFill, { width: `${r.percent}%`, backgroundColor: r.color }]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* AI 財務分析建議 */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Sparkles color="#10b981" size={18} />
          <Text style={styles.insightTitle}>AI 智慧節流建議</Text>
        </View>
        <Text style={styles.insightText}>
          本月主要支出為【{ranking[0]?.name || '餐飲飲食'}】（佔比 {ranking[0]?.percent || 0}%）。
          建議可適度減少外送次數，每週自煮一餐，預估每月可節省約 NT$ 1,500！
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 14 },
  categoryList: { gap: 12 },
  catItem: { gap: 4 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  catAmt: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  barBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  insightCard: { backgroundColor: '#f0fdf4', borderRadius: 20, padding: 18, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  insightTitle: { fontSize: 14, fontWeight: 'bold', color: '#166534' },
  insightText: { fontSize: 12, color: '#15803d', lineHeight: 18 },
});
