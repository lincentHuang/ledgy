# 📱 Ledgy - 台灣在地化 AI 記帳與智慧家庭分帳 App

一款專為台灣用戶量身打造的跨平台智慧記帳 App，支援個人私帳、多人家庭公帳、台灣電子發票載具、AI 自然語言快速記帳與語音記帳，並具備毫秒級 Cloud Firestore 即時雙向同步。

---

## 🌟 核心特色
- **⚡ 毫秒級雲端雙向同步**：支援跨裝置（Web、iOS、Android）資料庫即時監聽與自動同步。
- **🎙️ 0 Token / Gemini AI 語音記帳**：精準辨識台灣在地日常語音情境與商家，自動匹配單一標籤。
- **👥 家庭公帳 & 多群組分帳**：AA 制、自訂比例與代墊分攤，自動計算最小還款路徑。
- **📱 原生跨平台支援**：使用 Capacitor 支援 iOS（含桌面 Widget 小工具）與 Android 原生應用程式。
- **🔒 安全無虞**：採用 Firebase Authentication 與 Cloud Firestore 安全防護。

---

## 🛠️ 技術架構
- **Frontend**：Next.js 14 (App Router) + React 18 + Tailwind CSS + Lucide Icons
- **Backend / Cloud**：Google Firebase (Auth, Firestore, Hosting)
- **Mobile Native**：Capacitor 7 + Swift (iOS Widgets)
- **CI / CD**：GitHub Actions + Firebase Hosting Auto-Deploy

---

## 🚀 本地開發指南

```bash
# 1. 安裝所有相依套件
yarn install

# 2. 啟動 Web 開發伺服器
yarn dev # 或 yarn web (運行於 http://localhost:3000)

# 3. 靜態產物匯出 (供 Hosting 部署或原生打包使用)
yarn build:export

# 4. 同步至 iOS / Android
yarn cap:sync

# 5. 一鍵發布部署至 Firebase Hosting
yarn deploy
```

---

## 🤖 CI/CD 自動化部屬說明
本專案已配置 GitHub Actions：
- 當有 Code Push 至 `main` 分支時，將自動執行建置並直接發布至 **[https://ledgy-be1e6.web.app](https://ledgy-be1e6.web.app)**。
- 需在 GitHub Repository Settings ➔ Secrets 中配置 `FIREBASE_SERVICE_ACCOUNT_LEDGY_BE1E6`。
