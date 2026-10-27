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
