import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Plus, Mic, Sparkles, Receipt, Users, Wallet, Check, Calendar, Lock } from 'lucide-react-native';
import { MOCK_TRANSACTIONS, MOCK_USER, MOCK_HOUSEHOLD } from '../../../packages/shared/src/mockData';
import { fallbackLocalRuleParser } from '../../../packages/shared/src/geminiPrompts';
import { Transaction } from '../../../packages/shared/src/types/expense';

export default function MobileHomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [activeLedger, setActiveLedger] = useState<'all' | 'personal' | 'household'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [inputText, setInputText] = useState('');

  const totalExpense = transactions
    .filter((t) => (activeLedger === 'all' ? true : t.ledgerType === activeLedger))
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleQuickAdd = () => {
    if (!inputText.trim()) return;
    const parsed = fallbackLocalRuleParser(inputText);
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: MOCK_USER.uid,
      householdId: parsed.ledgerType === 'household' ? MOCK_HOUSEHOLD.id : undefined,
      title: parsed.title,
      amount: parsed.amount,
      type: parsed.type,
      ledgerType: parsed.ledgerType || 'personal',
      categoryId: parsed.categoryId,
      categoryName: parsed.categoryName,
      paymentMethod: parsed.paymentMethod,
      date: new Date().toISOString().split('T')[0],
      tags: parsed.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTransactions([newTx, ...transactions]);
    setInputText('');
    setModalVisible(false);
    Alert.alert('記帳成功', `已自動解析並記錄：${parsed.title} (NT$ ${parsed.amount})`);
  };

  const handleSaveEdit = () => {
    if (!editingTx) return;
    setTransactions(transactions.map((t) => (t.id === editingTx.id ? editingTx : t)));
    setEditingTx(null);
    Alert.alert('儲存成功', '帳目資訊已更新！');
  };

  return (
    <View style={styles.container}>
      {/* 頂部快速切換帳本 */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          onPress={() => setActiveLedger('all')}
          style={[styles.tabButton, activeLedger === 'all' && styles.activeTabButton]}
        >
          <Text style={[styles.tabText, activeLedger === 'all' && styles.activeTabText]}>全部</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveLedger('personal')}
          style={[styles.tabButton, activeLedger === 'personal' && styles.activeTabButton]}
        >
          <Text style={[styles.tabText, activeLedger === 'personal' && styles.activeTabText]}>
            個人私帳
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveLedger('household')}
          style={[styles.tabButton, activeLedger === 'household' && styles.activeTabButton]}
        >
          <Text style={[styles.tabText, activeLedger === 'household' && styles.activeTabText]}>
            家庭公帳
          </Text>
        </TouchableOpacity>
      </View>

      {/* 總覽卡片 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>本月支出總額</Text>
        <Text style={styles.summaryAmount}>NT$ {totalExpense.toLocaleString()}</Text>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetSub}>預算 NT$ 35,000</Text>
          <Text style={styles.budgetPercent}>
            已用 {Math.round((totalExpense / 35000) * 100)}%
          </Text>
        </View>
      </View>

      {/* 帳目明細列表 */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>近期帳目記錄 (點擊可編輯)</Text>
        {transactions
          .filter((t) => (activeLedger === 'all' ? true : t.ledgerType === activeLedger))
          .map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txCard}
              onPress={() => setEditingTx({ ...tx })}
            >
              <View style={styles.txLeft}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txSubtitle}>
                  {tx.date} • {tx.paymentMethod} {tx.ledgerType === 'household' ? '• 家庭公用' : ''}
                  {tx.invoiceNumber ? ` • 發票 ${tx.invoiceNumber}` : ''}
                </Text>
              </View>
              <Text style={styles.txAmount}>
                {tx.type === 'income' ? '+' : '-'} NT$ {tx.amount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* 浮動快速新增按鈕 */}
      <TouchableOpacity style={styles.fabButton} onPress={() => setModalVisible(true)}>
        <Plus color="#ffffff" size={28} />
      </TouchableOpacity>

      {/* 編輯帳目 Modal (含日期調整與發票鎖定) */}
      {editingTx && (
        <Modal visible={Boolean(editingTx)} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>編輯帳目</Text>
                <TouchableOpacity onPress={() => setEditingTx(null)}>
                  <Text style={styles.closeText}>關閉</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.editLabel}>消費日期</Text>
                  {editingTx.invoiceNumber && (
                    <Text style={styles.lockBadge}>🔒 發票日期不可修改</Text>
                  )}
                </View>
                <TextInput
                  style={[styles.editInput, editingTx.invoiceNumber && styles.disabledInput]}
                  value={editingTx.date}
                  editable={!editingTx.invoiceNumber}
                  onChangeText={(val) => setEditingTx({ ...editingTx, date: val })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.editGroup}>
                <Text style={styles.editLabel}>品項名稱</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingTx.title}
                  onChangeText={(val) => setEditingTx({ ...editingTx, title: val })}
                />
              </View>

              <View style={styles.editGroup}>
                <Text style={styles.editLabel}>金額 (NT$)</Text>
                <TextInput
                  style={styles.editInput}
                  value={String(editingTx.amount)}
                  keyboardType="numeric"
                  onChangeText={(val) => setEditingTx({ ...editingTx, amount: Number(val) || 0 })}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveEdit}>
                <Text style={styles.submitButtonText}>儲存變更</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* 快速自然語言記帳 Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI 自然語言記帳</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>關閉</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="例如：中午跟同事吃拉麵 280 街口支付..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleQuickAdd}>
              <Sparkles color="#ffffff" size={18} />
              <Text style={styles.submitButtonText}>AI 解析並儲存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  tabHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  activeTabText: { color: '#10b981', fontWeight: 'bold' },
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2 },
  summaryLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  summaryAmount: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginVertical: 6 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetSub: { fontSize: 11, color: '#94a3b8' },
  budgetPercent: { fontSize: 11, color: '#10b981', fontWeight: 'bold' },
  listContainer: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
  txCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txLeft: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  txSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  txAmount: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  fabButton: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  closeText: { color: '#64748b', fontSize: 14 },
  editGroup: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  lockBadge: { fontSize: 10, color: '#d97706', fontWeight: 'bold' },
  editInput: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  disabledInput: { backgroundColor: '#e2e8f0', color: '#94a3b8' },
  modalInput: { backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, minHeight: 80, fontSize: 14, marginBottom: 14 },
  submitButton: { backgroundColor: '#10b981', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
