import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { LayoutDashboard, Receipt, Users, PieChart, Bot } from 'lucide-react-native';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#0f172a' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '明細',
          headerTitle: 'AI 智慧記帳',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: '發票載具',
          headerTitle: '發票載具與自動對獎',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: '家庭分帳',
          headerTitle: '家庭共享與智慧分帳',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: '預算統計',
          headerTitle: '消費統計與預算',
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI 顧問',
          headerTitle: 'AI 財務顧問助理',
          tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
