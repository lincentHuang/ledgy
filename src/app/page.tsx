'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { Header, Sidebar, BottomNav, MainTabType, PullToRefresh, PwaInstallPrompt } from '@/blocks/layout';
import { TransactionList } from '@/blocks/dashboard';
import { FamilyView } from '@/blocks/family-ledger';
import { PersonalSettingsView, PersonalTabType, GroupSettingsView, GroupTabType } from '@/blocks/settings';
import { BarcodeModal } from '@/blocks/invoice-scanner';
import { QuickInputModal } from '@/blocks/transactions';
import { FinancialChatModal, FinancialReportView } from '@/blocks/ai-consultant';
import { UserProfileModal, WelcomeView, OnboardingWizardModal } from '@/blocks/auth';
import { VoiceInputModal } from '@/blocks/voice-input';

// 🚀 延遲載入含重型相機/二維碼解碼庫 (html5-qrcode) 的彈窗，極速瘦身首屏與 APK 啟動耗時
const InvoiceScannerModal = dynamic(
  () => import('@/blocks/invoice-scanner').then((mod) => mod.InvoiceScannerModal),
  { ssr: false }
);

export default function Home() {
  const {
    user,
    isAuthenticated,
    isAuthReady,
    pullFromCloud,
    transactions,
    updateUserProfile,
  } = useAppStore();
  const [currentTab, setCurrentTab] = useState<MainTabType>('overview');

  // Sidebar & Modal States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [personalTab, setPersonalTab] = useState<PersonalTabType>('payments');
  const [groupTab, setGroupTab] = useState<GroupTabType>('members');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOnboardingManualOpen, setIsOnboardingManualOpen] = useState(false);

  // 🌟 智慧判斷是否需要跳出初次設定精靈：
  // 1. 帳號明確標記 hasCompletedOnboarding: true ➔ 否
  // 2. 本機快取標記已完成設定 ➔ 否
  // 3. 使用者已有歷史交易明細（老用戶）➔ 否 (並自動補上 hasCompletedOnboarding: true)
  const isLocalCompleted =
    typeof window !== 'undefined' &&
    Boolean(
      (user?.uid && localStorage.getItem(`has_completed_onboarding_${user.uid}`) === 'true') ||
        localStorage.getItem('ai_expense_has_completed_onboarding') === 'true'
    );

  const isExistingUserWithData = transactions && transactions.length > 0;

  React.useEffect(() => {
    if (
      isAuthenticated &&
      user?.uid &&
      !user.hasCompletedOnboarding &&
      (isLocalCompleted || isExistingUserWithData)
    ) {
      updateUserProfile({ hasCompletedOnboarding: true });
    }
  }, [
    isAuthenticated,
    user?.uid,
    user?.hasCompletedOnboarding,
    isLocalCompleted,
    isExistingUserWithData,
    updateUserProfile,
  ]);

  const shouldShowOnboarding = Boolean(
    isAuthenticated &&
      user &&
      user.uid &&
      !user.hasCompletedOnboarding &&
      !isLocalCompleted &&
      !isExistingUserWithData
  );

  // 🔗 接收 iOS / Android 桌面 Widget Deep Link 事件 (必須在所有條件式 return 之前調用以符合 React Hooks 規則)
  React.useEffect(() => {
    const handleDeepLink = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string }>;
      const action = customEvent.detail?.action;
      if (action === 'voice') {
        setIsVoiceOpen(true);
      } else if (action === 'scanner' || action === 'scan') {
        setIsScannerOpen(true);
      } else if (action === 'quick-input' || action === 'add' || action === 'manual') {
        setIsQuickInputOpen(true);
      } else if (action === 'barcode') {
        setIsBarcodeOpen(true);
      } else if (action === 'overview') {
        setCurrentTab('overview');
      }
    };

    window.addEventListener('app-deep-link', handleDeepLink);
    return () => window.removeEventListener('app-deep-link', handleDeepLink);
  }, []);

  // 1. 避免 SSR 與 Client 本機 LocalStorage 狀態不一致導致的 Hydration Mismatch
  if (!isAuthReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  // 2. 🔒 若尚未登入，固定停留於歡迎與登入頁面
  if (!isAuthenticated) {
    return <WelcomeView />;
  }

  const handleOpenPersonalSettings = (tab: PersonalTabType = 'payments') => {
    setPersonalTab(tab);
    setCurrentTab('personal-settings');
  };

  const handleOpenGroupSettings = (tab: GroupTabType = 'members') => {
    setGroupTab(tab);
    setCurrentTab('group-settings');
  };

  return (
    <div className="h-screen h-[100dvh] h-[var(--app-height,100dvh)] flex overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* 側邊導航欄 Sidebar (獨立滾動區) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenPersonalSettings={handleOpenPersonalSettings}
        onOpenGroupSettings={handleOpenGroupSettings}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenOnboarding={() => setIsOnboardingManualOpen(true)}
        onOpenBarcode={() => setIsBarcodeOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        personalTab={personalTab}
        groupTab={groupTab}
      />

      {/* 右側主區域 */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* 頂部導航欄 (固定於最上方) */}
        <Header
          onOpenPersonalSettings={handleOpenPersonalSettings}
          onOpenGroupSettings={handleOpenGroupSettings}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* 主內容獨立滾動區 (支援手機端 App 向上/下拉滑動重新整理) */}
        <PullToRefresh
          onRefresh={pullFromCloud}
          className="flex-1 min-w-0 pb-24 lg:pb-6"
        >
          {/* 主內容區 */}
          <main className="max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 space-y-5">
            {/* 收支明細列表與總覽 */}
            {currentTab === 'overview' && (
              <TransactionList onOpenQuickInput={() => setIsQuickInputOpen(true)} />
            )}

            {/* 2. 發票專區 */}
            {currentTab === 'invoices' && (
              <div className="p-8 text-center glass-panel rounded-3xl space-y-3">
                <p className="text-sm font-bold text-slate-300">💡 電子發票載具功能目前正進行串接優化中，即將推出！</p>
                <p className="text-xs text-slate-400">現階段請使用簡便的快速記帳、語音記帳或標籤分類。</p>
                <button
                  onClick={() => setCurrentTab('overview')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  返回收支明細
                </button>
              </div>
            )}

            {/* 3. 📊 財務報表與 AI 顧問 (雙模式 + 彈性時間區間 + 預算合理性診斷) */}
            {currentTab === 'reports' && (
              <FinancialReportView
                onBack={() => setCurrentTab('overview')}
              />
            )}

            {/* 4. 群組分帳結算 */}
            {currentTab === 'family' && (
              <FamilyView onOpenQuickInput={() => setIsQuickInputOpen(true)} />
            )}

            {/* 4. 👤 個人設定頁面 (獨立切換完整頁面) */}
            {currentTab === 'personal-settings' && (
              <PersonalSettingsView
                activeTab={personalTab}
                onChangeTab={setPersonalTab}
                onBack={() => setCurrentTab('overview')}
                onSwitchToGroup={() => setCurrentTab('group-settings')}
              />
            )}

            {/* 6. 👥 群組設定頁面 (獨立切換完整頁面) */}
            {currentTab === 'group-settings' && (
              <GroupSettingsView
                activeTab={groupTab}
                onChangeTab={setGroupTab}
                onBack={() => setCurrentTab('overview')}
                onSwitchToPersonal={() => setCurrentTab('personal-settings')}
              />
            )}

            {/* 舊版相容 */}
            {currentTab === 'settings' && (
              <PersonalSettingsView
                activeTab={personalTab}
                onChangeTab={setPersonalTab}
                onBack={() => setCurrentTab('overview')}
                onSwitchToGroup={() => setCurrentTab('group-settings')}
              />
            )}
          </main>
        </PullToRefresh>

        {/* 底部導航欄 Dock (手機版顯示) / 底部 Sticky 操作列 (電腦版顯示) */}
        <BottomNav
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          onOpenQuickInput={() => setIsQuickInputOpen(true)}
          onOpenVoiceInput={() => setIsVoiceOpen(true)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenBarcode={() => setIsBarcodeOpen(true)}
        />
      </div>

      {/* 浮動小工具彈窗 (載具條碼、快速記帳、語音、掃描、個人檔案) */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onOpenScanner={() => {
          setIsBarcodeOpen(false);
          setIsScannerOpen(true);
        }}
      />
      <QuickInputModal isOpen={isQuickInputOpen} onClose={() => setIsQuickInputOpen(false)} />
      <VoiceInputModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSwitchToManualInput={() => setIsQuickInputOpen(true)}
      />
      <InvoiceScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <FinancialChatModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* 🌟 註冊/初次使用 4 步驟設定精靈 (支援手動點擊或新用戶自動彈出) */}
      <OnboardingWizardModal
        isOpen={shouldShowOnboarding || isOnboardingManualOpen}
        onComplete={() => setIsOnboardingManualOpen(false)}
      />

      {/* 📲 PWA 桌面捷徑 / 加入主畫面引導提示 */}
      <PwaInstallPrompt />
    </div>
  );
}
