# 🧠 AI 讀心聊天機器人 — 部署教學

一個任何人都能用的網站：AI 一邊跟你聊天，一邊偷偷預判你下一句要說什麼，
等你開口後用 **cosine 相似度** 算出「猜得多準」。

---

## 📁 檔案結構

```
mind-reader-site/
├── index.html        ← 前端網頁（大家看到的畫面）
├── api/
│   └── chat.js        ← 後端（藏金鑰、呼叫 Gemini、算相似度）
├── package.json
└── README.md          ← 你正在看的這份
```

> 🔐 重點：金鑰**只**放在伺服器的環境變數，永遠不會出現在前端網頁裡，
> 所以別人按 F12 也偷不到你的金鑰。

---

## 第一步：申請免費的 Gemini API 金鑰

1. 前往 <https://aistudio.google.com/>，登入 Google 帳號。
2. 點左上角 **Get API key → Create API key**。
3. 複製那一長串金鑰（`AIza...`），先貼在記事本備用。

Gemini 有免費額度，做課堂 Demo 通常很夠用。

---

## 第二步：部署到 Vercel（免費、最簡單）

### 做法 A：用 GitHub（推薦）

1. 把這個資料夾整包上傳到一個新的 GitHub repo。
2. 到 <https://vercel.com> 用 GitHub 登入 → **Add New → Project** → 選你的 repo → **Import**。
3. 在 **Environment Variables** 新增一筆：
   - Name：`GEMINI_API_KEY`
   - Value：你剛剛複製的金鑰
4. 按 **Deploy**，等一兩分鐘。
5. 完成後會給你一個公開網址，例如 `https://你的專案.vercel.app`，
   把這個網址傳給任何人就能用了 🎉

### 做法 B：用指令（不想開 GitHub 的話）

```bash
npm i -g vercel          # 安裝一次就好
cd mind-reader-site
vercel                   # 第一次會問幾個問題，一路 Enter
vercel env add GEMINI_API_KEY   # 貼上你的金鑰
vercel --prod            # 正式發佈，拿到公開網址
```

---

## 本機測試（可選）

```bash
npm i -g vercel
cd mind-reader-site
vercel dev               # 會在 http://localhost:3000 啟動（前端 + 後端一起跑）
```
> 注意：本機測試也要先 `vercel env add GEMINI_API_KEY`，否則後端會說沒設定金鑰。

---

## ⚙️ 運作原理（可寫進報告）

1. 使用者送出訊息 → 前端 `index.html` 把訊息 POST 到 `/api/chat`。
2. 後端 `chat.js` 用金鑰呼叫 **Gemini**：
   - 產生這回合的**聊天回覆**
   - 產生對使用者**下一句的預判**
3. 下一回合，後端用 **text-embedding-004** 把「上一回合的預判」和「你這次實際說的話」
   各自轉成語意向量，再算 **cosine 相似度**（0~100%）回傳前端顯示。
4. 金鑰全程只在後端，前端拿不到。

公式：cosine 相似度 = (A·B) / (‖A‖‖B‖)，數值越接近 1（100%）代表語意越接近。

---

## 💡 小提醒

- **費用 / 額度**：網站公開後，每個人聊天都會算在你的金鑰額度上。
  做課堂展示通常沒問題；若怕被人灌爆，之後可再加上簡單的次數限制。
- 想換模型：把 `chat.js` 裡的 `gemini-1.5-flash` 換成其他 Gemini 模型即可。
- Netlify、Cloudflare Pages 也能部署，原理一樣（靜態頁 + 一個函式 + 環境變數金鑰）。
