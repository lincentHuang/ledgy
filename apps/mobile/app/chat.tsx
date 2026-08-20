import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Bot, Send, User } from 'lucide-react-native';
import { MOCK_TRANSACTIONS, MOCK_USER } from '../../../packages/shared/src/mockData';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function MobileChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `嗨 ${MOCK_USER.displayName}！我是您的手機 AI 智慧理財小幫手 🤖✨\n您可以問我：\n- 「我最近喝咖啡花了多少？」\n- 「家庭公用開銷誰代墊最多？」\n- 「這個月開銷最大的是什麼？」`,
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
    };

    let reply = `收到您的提問「${inputText.trim()}」！\n根據本月數據分析，您的總開銷主要落在餐飲與家庭公用採買，整體預算控制在安全範圍內（已用 55%）。`;

    if (/咖啡|飲料/i.test(inputText)) {
      reply = `☕ 查詢最近 7 天咖啡與飲品紀錄：\n共消費 2 筆，合計 NT$ 325。其中「星巴克 特選馥列白」NT$ 150 為主要支出。`;
    } else if (/家庭|公用|代墊/i.test(inputText)) {
      reply = `🏡 家庭公帳分析：\n本月家庭公用支出共 NT$ 3,730，目前陳威廷代墊 NT$ 1,280，林怡君代墊 NT$ 2,450。結算建議陳威廷轉帳 NT$ 585 給林怡君即可平帳！`;
    }

    const aiMsg: ChatMessage = {
      id: `a_${Date.now() + 1}`,
      sender: 'ai',
      text: reply,
    };

    setMessages([...messages, userMsg, aiMsg]);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.chatArea}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.msgRow,
              m.sender === 'user' ? styles.userMsgRow : styles.aiMsgRow,
            ]}
          >
            {m.sender === 'ai' && (
              <View style={styles.aiAvatar}>
                <Bot color="#ffffff" size={16} />
              </View>
            )}
            <View
              style={[
                styles.msgBubble,
                m.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.msgText,
                  m.sender === 'user' ? styles.userMsgText : styles.aiMsgText,
                ]}
              >
                {m.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 底部輸入列 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="詢問任何開銷或預算問題..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Send color="#ffffff" size={16} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  chatArea: { flex: 1, padding: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start', gap: 8 },
  userMsgRow: { justifyContent: 'flex-end' },
  aiMsgRow: { justifyContent: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#10b981', borderTopRightRadius: 2 },
  aiBubble: { backgroundColor: '#ffffff', borderTopLeftRadius: 2, elevation: 1 },
  msgText: { fontSize: 13, lineHeight: 18 },
  userMsgText: { color: '#ffffff' },
  aiMsgText: { color: '#0f172a' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8, alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
});
