# Progress

- 2026-10-23：手機語音辨識提速（原生監聽器改為掛載時註冊、權限預熱、手機瀏覽器改單句模式）、修正切換帳本後記帳歸屬錯誤、新增每月固定成本模組（提醒＋確認入帳）、18 個頁面手機版換行修正（useSpeechRecognition.ts、useVoiceExpenseParser.ts、VoiceInputModal.tsx、store.tsx、src/blocks/fixed-costs/、src/lib/shared/fixedCosts.ts）
- 2026-10-23：發佈 8df97fa 至正式環境 https://ledgy-be1e6.web.app
- 2026-10-23：語音按鈕即時音量反應與收音階段狀態、偵測裝置不支援即時逐字並提示切換 Google 語音服務（useMicLevel.ts、useSpeechRecognition.ts、VoiceInputModal.tsx）
- 2026-10-23：Android Chrome 語音改回連續模式以恢復即時逐字、合併重複片段，修正錯誤的語音服務設定提示（useSpeechRecognition.ts、VoiceInputModal.tsx）
- 2026-10-23：移除語音視窗誤判的「不支援即時逐字」提示（VoiceInputModal.tsx）
