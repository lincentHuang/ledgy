import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Users, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { MOCK_HOUSEHOLD, MOCK_TRANSACTIONS, MOCK_USER } from '../../../packages/shared/src/mockData';
import { calculateHouseholdBalances } from '../../../packages/shared/src/settlement';

export default function MobileFamilyScreen() {
  const [household] = useState(MOCK_HOUSEHOLD);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);

  const { summaries, transfers, totalSharedExpense } = calculateHouseholdBalances(
    household,
    transactions
  );

  const handleSettle = (transfer: any) => {
    Alert.alert(
      '確認結算',
      `確定已完成 ${transfer.fromName} 轉給 ${transfer.toName} NT$ ${transfer.amount.toLocaleString()} 嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定已平帳',
          onPress: () => {
            Alert.alert('結算完成', '已自動生成平帳記錄！');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 家庭空間卡片 */}
      <View style={styles.householdCard}>
        <View style={styles.houseHeader}>
          <Text style={styles.houseName}>{household.name}</Text>
          <Text style={styles.inviteCode}>邀請碼：{household.inviteCode}</Text>
        </View>
        <Text style={styles.sharedExpenseLabel}>本月家庭公用總累積支出</Text>
        <Text style={styles.sharedExpenseAmount}>NT$ {totalSharedExpense.toLocaleString()}</Text>
      </View>

      {/* 成員分攤狀況 */}
      <Text style={styles.sectionTitle}>家庭成員收支與代墊狀況</Text>
      {summaries.map((s) => (
        <View key={s.userId} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <Text style={styles.memberName}>{s.displayName}</Text>
            <Text
              style={[
                styles.memberBalance,
                s.netBalance > 0
                  ? styles.positiveBalance
                  : s.netBalance < 0
                  ? styles.negativeBalance
                  : styles.neutralBalance,
              ]}
            >
              {s.netBalance > 0
                ? `應收回 NT$ ${s.netBalance.toLocaleString()}`
                : s.netBalance < 0
                ? `應支付 NT$ ${(-s.netBalance).toLocaleString()}`
                : '已平帳'}
            </Text>
          </View>
          <View style={styles.memberDetailRow}>
            <Text style={styles.detailText}>代墊公款：NT$ {s.totalPaid.toLocaleString()}</Text>
            <Text style={styles.detailText}>應攤額：NT$ {s.totalOwed.toLocaleString()}</Text>
          </View>
        </View>
      ))}

      {/* 智慧結算建議 */}
      <Text style={styles.sectionTitle}>家庭智慧結算建議（最少次數轉帳）</Text>
      {transfers.length === 0 ? (
        <View style={styles.settleCard}>
          <Text style={styles.settleDoneText}>🎉 目前款項皆已平帳，無人欠款！</Text>
        </View>
      ) : (
        transfers.map((t, idx) => (
          <View key={idx} style={styles.transferCard}>
            <View style={styles.transferInfo}>
              <Text style={styles.fromText}>{t.fromName}</Text>
              <Text style={styles.transferArrow}>➔</Text>
              <Text style={styles.toText}>{t.toName}</Text>
              <Text style={styles.transferAmt}>NT$ {t.amount.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.settleBtn} onPress={() => handleSettle(t)}>
              <Text style={styles.settleBtnText}>已轉帳</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  householdCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 16 },
  houseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  houseName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  inviteCode: { fontSize: 12, color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace' },
  sharedExpenseLabel: { fontSize: 11, color: '#64748b' },
  sharedExpenseAmount: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8, marginTop: 4 },
  memberCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  memberName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  memberBalance: { fontSize: 12, fontWeight: 'bold' },
  positiveBalance: { color: '#10b981' },
  negativeBalance: { color: '#ef4444' },
  neutralBalance: { color: '#64748b' },
  memberDetailRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6 },
  detailText: { fontSize: 11, color: '#94a3b8' },
  settleCard: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 16 },
  settleDoneText: { color: '#166534', fontSize: 13, fontWeight: 'bold' },
  transferCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transferInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fromText: { fontSize: 13, fontWeight: 'bold', color: '#ef4444' },
  transferArrow: { fontSize: 13, color: '#94a3b8' },
  toText: { fontSize: 13, fontWeight: 'bold', color: '#10b981' },
  transferAmt: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginLeft: 4 },
  settleBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  settleBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
});
