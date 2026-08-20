import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { QrCode, Trophy, Receipt, Camera, Zap } from 'lucide-react-native';
import { MOCK_INVOICES, MOCK_USER } from '../../../packages/shared/src/mockData';
import { checkLotteryWinning } from '../../../packages/shared/src/lottery';

export default function MobileInvoicesScreen() {
  const [invoices, setInvoices] = useState(MOCK_INVOICES);

  const handleSimulateScan = (won = true) => {
    const invNum = won ? 'AB-32117043' : 'CD-88991234';
    const prize = checkLotteryWinning(invNum, '2024-08-16');
    const newInv = {
      id: `inv_${Date.now()}`,
      invoiceNumber: invNum,
      date: '2024-08-16',
      rocDate: '1130816',
      randomCode: '8888',
      salesAmount: 428,
      totalAmount: 450,
      buyerGUI: '00000000',
      sellerGUI: '22555003',
      sellerName: '統一超商 7-ELEVEN',
      isScanned: true,
      items: [{ name: '特大拿鐵', quantity: 2, unitPrice: 70, amount: 140 }],
      lotteryResult: prize,
    };
    setInvoices([newInv, ...invoices]);
    Alert.alert(
      prize.isWon ? '🎉 恭喜中獎！' : '登錄成功',
      prize.isWon
        ? `發票 ${invNum} 中了【${prize.prizeName}】NT$ ${prize.prizeAmount.toLocaleString()}！`
        : `發票 ${invNum} 已登錄完成並自動記入帳本。`
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 手機條碼載具展示區 */}
      <View style={styles.carrierCard}>
        <Text style={styles.carrierLabel}>手機條碼載具 (出示掃描)</Text>
        <View style={styles.barcodeBox}>
          <Text style={styles.barcodeText}>{MOCK_USER.defaultCarrierCode || '/AB1234+'}</Text>
          <Text style={styles.barcodeSub}>CODE 39 標準條碼</Text>
        </View>
        <Text style={styles.carrierTip}>💡 結帳前請將螢幕調亮方便超商掃描槍感應</Text>
      </View>

      {/* 相機掃描與快速測試按鈕 */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => handleSimulateScan(true)}
        >
          <Trophy color="#ffffff" size={18} />
          <Text style={styles.scanButtonText}>測試中獎發票 (頭獎20萬)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.normalScanButton}
          onPress={() => handleSimulateScan(false)}
        >
          <QrCode color="#0f172a" size={18} />
          <Text style={styles.normalScanButtonText}>測試日常發票</Text>
        </TouchableOpacity>
      </View>

      {/* 發票列表 */}
      <Text style={styles.sectionTitle}>已登錄發票 ({invoices.length} 張)</Text>
      {invoices.map((inv) => (
        <View key={inv.id} style={styles.invCard}>
          <View style={styles.invHeader}>
            <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
            {inv.lotteryResult?.isWon ? (
              <View style={styles.winningBadge}>
                <Text style={styles.winningText}>
                  中 {inv.lotteryResult.prizeName} NT${' '}
                  {inv.lotteryResult.prizeAmount.toLocaleString()}
                </Text>
              </View>
            ) : (
              <Text style={styles.notWonText}>未中獎</Text>
            )}
          </View>
          <View style={styles.invBottom}>
            <Text style={styles.sellerName}>{inv.sellerName}</Text>
            <Text style={styles.invAmount}>NT$ {inv.totalAmount.toLocaleString()}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  carrierCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16 },
  carrierLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  barcodeBox: { backgroundColor: '#f1f5f9', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginVertical: 10, alignItems: 'center' },
  barcodeText: { fontSize: 22, fontWeight: '900', fontFamily: 'monospace', color: '#0f172a', letterSpacing: 3 },
  barcodeSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  carrierTip: { fontSize: 11, color: '#d97706' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scanButton: { flex: 1, backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  scanButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  normalScanButton: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  normalScanButtonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
  invCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invNumber: { fontSize: 15, fontWeight: '900', fontFamily: 'monospace', color: '#0f172a' },
  winningBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  winningText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  notWonText: { color: '#94a3b8', fontSize: 11 },
  invBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sellerName: { fontSize: 12, color: '#64748b' },
  invAmount: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
});
