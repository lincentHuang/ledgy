# Progress

- 2026-10-23：手機語音辨識提速（原生監聽器改為掛載時註冊、權限預熱、手機瀏覽器改單句模式）、修正切換帳本後記帳歸屬錯誤、新增每月固定成本模組（提醒＋確認入帳）、18 個頁面手機版換行修正（useSpeechRecognition.ts、useVoiceExpenseParser.ts、VoiceInputModal.tsx、store.tsx、src/blocks/fixed-costs/、src/lib/shared/fixedCosts.ts）
- 2026-10-23：發佈 8df97fa 至正式環境 https://ledgy-be1e6.web.app
- 2026-10-23：語音按鈕即時音量反應與收音階段狀態、偵測裝置不支援即時逐字並提示切換 Google 語音服務（useMicLevel.ts、useSpeechRecognition.ts、VoiceInputModal.tsx）
- 2026-10-23：Android Chrome 語音改回連續模式以恢復即時逐字、合併重複片段，修正錯誤的語音服務設定提示（useSpeechRecognition.ts、VoiceInputModal.tsx）
- 2026-10-23：移除語音視窗誤判的「不支援即時逐字」提示（VoiceInputModal.tsx）
- 2026-10-27：全站手機版排版再優化（320–414px）：彈窗高度扣除外邊距、主捲動區防橫向溢出、flex 列補 min-w-0/truncate/flex-wrap、7 欄月曆週曆縮小間距、走勢圖手機字級放大、側邊欄寬度改 85vw、語音視窗移除重複的瀏海安全區（共 46 檔，src/blocks/*/views、src/components、Modal.tsx、PullToRefresh.tsx）
- 2026-10-27：重新設計 App logo（參考 3D 柔光擬人圖示風格：翡翠綠漸層＋笑臉帳本＋金幣＋AI 星光），替換全部圖示尺寸並將 SW 快取升至 v4（public/logo.png、icon*.png、apple-touch-icon.png、favicon.*、sw.js）
- 2026-10-27：新增智帳君吉祥物動畫元件，語音記帳收音時戴耳機聆聽＋音波隨音量跳動、AI 解析與手動打字時拿鉛筆做筆記（src/components/LedgyMascot.tsx、globals.css、VoiceInputModal.tsx）
- 2026-10-27：發佈 6308018（手機版排版優化＋新 logo＋吉祥物動畫）至正式環境 https://ledgy-be1e6.web.app
- 2026-10-28：移除 Next.js /api 路由與本機 JSON 資料層，資料一律走 Firestore；群組邀請／加入審核／刪除改寫進 FirestoreService（交易保護），新增 memberIds、pendingInviteeEmails 查詢欄位並自動補傳舊群組；修正即時監聽覆蓋群組明細（firestoreService.ts、store.tsx、types/family.ts；刪除 src/app/api、serverDb.ts、cloudApiClient.ts）
- 2026-10-28：收緊 Firestore 安全規則（本人限定 users、群組限 memberIds 成員、邀請碼改由 inviteCodes 對照、加入申請改存 joinRequests 子集合），並修正送出加入申請時誤顯示錯誤樣式（firestore.rules、firestoreService.ts、store.tsx、FamilyView.tsx）
- 2026-10-28：以 Firestore 模擬器跑 14 組規則情境（建立群組、Email 邀請與接受、邀請碼申請與審核、非成員讀寫被拒、舊群組相容、刪除群組），全數通過
- 2026-10-28：Firestore 規則測試收進專案，新增 yarn test:rules（模擬器跑 14 組情境，全數通過）（tests/firestore.rules.test.mjs、package.json、firebase.json）
- 2026-10-28：資料層改寫合併進 dev／main；修正 CI 部署（同步 yarn.lock、Node 升 22），但 repo 缺 FIREBASE_SERVICE_ACCOUNT secret，自動部署仍失敗，網站尚未更新（.github/workflows/deploy.yml、yarn.lock）
