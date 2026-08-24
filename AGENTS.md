# 🛠️ 專案開發與自動化協作規範 (Development & Automation Workflow)

本規範定義「智帳君 Ledgy」專案的日常開發、終端機執行、視覺驗證與版本發布標準流程。

---

## 1. 🌿 Git 分支與部署工作流 (Git Branching & Deployment Rules)

- **日常開發**：
  - 一律從 `dev` 分支開設功能分支（例如 `feature/<feature-name>` 或 `fix/<issue-name>`）。
  - 所有開發與功能測試僅在本地環境（`http://localhost:3000`）進行。
  - **嚴格禁止自動/主動執行線上部署**。
- **線上發布流程**（僅在使用者明確要求「幫我發佈」或「幫我部署」時觸發）：
  1. 確保當前功能分支所有變更已提交。
  2. 切換至 `dev` 分支並拉取最新代碼：`git checkout dev && git pull origin dev`
  3. 合併功能分支至 `dev` 並推送：`git merge <feature-branch> && git push origin dev`
  4. 切換至 `main` 分支並拉取最新代碼：`git checkout main && git pull origin main`
  5. 合併 `dev` 至 `main` 並推送：`git merge dev && git push origin main`
  6. 執行線上正式建置與部署：`yarn deploy`
  7. **部署完成後，務必切回 `dev` 分支**，以供後續功能分支開設。

---

## 2. ⚡ 零干擾終端機指令規範 (Zero-Friction Terminal Rules)

為了保障極致流暢的開發體驗，避免頻繁觸發系統安全審批彈窗：
- **🚫 嚴禁使用動態多行字串寫入**：
  - 嚴格禁止在終端機中執行 `cat << 'EOF' > ...`、`echo "..." > ...` 或臨時產生動態隨機腳本。
  - 所有檔案建立與編輯一律使用原生檔案操作工具。
- **✅ 僅執行標準固定指令**：
  - 終端機僅允許執行前綴固定且易於自動授權的標準指令：
    - `yarn build:export`（靜態編譯與型別檢查）
    - `git status`、`git add`、`git commit`、`git push`、`git checkout`、`git merge`
    - `yarn web`（本地開發伺服器）

---

## 3. 📸 視覺驗證與截圖協作模式 (Visual & Screenshot Collaboration)

- **即時熱更新**：AI 修改程式碼後，由 Next.js Fast Refresh 即時同步至瀏覽器，使用者可直接在 `http://localhost:3000` 即時查看。
- **AI 驗證標準**：AI 僅需以 `yarn build:export` 確保 0 型別錯誤與靜態建置成功，**不自行在背景啟動無頭瀏覽器（Puppeteer）跑臨時截圖腳本**。
- **截圖即時回饋**：使用者遇到任何 UI 跑版、重複元件或樣式調整需求時，可直接附上**螢幕截圖**，AI 依據截圖視覺資訊進行精確微調。
