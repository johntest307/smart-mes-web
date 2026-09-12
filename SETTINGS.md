# 系統設定一覽

所有可調設定集中於 `.env`（根目錄），異動後依環境生效。

---

## Session 過期時間

| 項目 | 值 | 說明 |
|------|-----|------|
| **有效期** | 48 小時（172800 秒） | 超過此時間未活動需重新登入 |
| 設定位置 | `.env` → `SESSION_TIMEOUT=172800` | |
| 程式碼 | `python_rag/auth.py:11` | `os.getenv("SESSION_TIMEOUT", "172800")` |
| 生效方式 | 後端重新啟動後生效（Render 需 redeploy） | |

---

## Render 冷啟動預防（Keep-Alive）

前端每 10 分鐘自動 ping Render `/health`，避免 Render 免費方案進入休眠。

| 項目 | 值 |
|------|-----|
| Ping 間隔 | **10 分鐘**（600000ms） |
| Ping 目標 | `{VITE_RAG_API}/health` |
| 觸發時機 | 瀏覽器開啟網站時自動執行 |
| 設定位置 | `run/app/src/App.tsx:73-78` |
| 編譯後 | `setInterval(e, 6e5)`（6e5 = 600000） |
| 生效環境 | 本機 ✅ 立即生效 / Netlify ✅ 已部署 |

---

## API 請求 Timeout

| 功能 | Timeout | 前端檔案 | 後端檔案 | 備註 |
|------|---------|---------|---------|------|
| **Google 登入** | **60s** | `LoginPage.tsx:16-20` | `web_api.py`（無 timeout） | 防止 Render 睡著時卡住 |
| **Token 驗證** (auth/me) | **8s** | `AuthContext.tsx:35-55` | `auth.py` | 8s 沒回應 → 跳登入頁 |
| **RAG Chat 問答** | **90s** | `ChatBotFloating.tsx:193-232` | `web_api.py:238` `asyncio.wait_for(timeout=90)` | 雙層保護 |
| **成本分析 LLM** | **60s** | `CostEstimationPage.tsx:236-244` | `web_api.py:427` Groq `timeout=60` | |
| **匯率查詢** | **5s** | — | `query.py:195` `urlopen(timeout=5)` | USD/TWD 外部 API |
| **Graph 實體提取** | **15s** | — | `graph_retriever.py:88` Groq `timeout=15` | |
| **Graph 建置** | **30s** | — | `graph_builder.py:123` Groq `timeout=30` | |
| **問題拆解** | **30s** | — | `graphrag_engine.py:304` Groq `timeout=30` | |
| **答案合成** | **60s** | — | `graphrag_engine.py:469` `ChatGroq(timeout=60)` | |
| **主要 RAG LLM** | **60s** | — | `query.py:350` `ChatGroq(timeout=60)` | |
| **相關問題生成** | **30s** | — | `query.py:423` `ChatGroq(timeout=30)` | |

---

## 部署腳本 Timeout

| 腳本 | 用途 | Timeout |
|------|------|---------|
| `smart-mes.ps1` | 等待後端啟動（本機） | **120s**（每次 health check 3s） |
| `start-services.ps1` | 等待後端啟動（本機） | **600s**（每次 health check 2s） |
| `deploy.ps1` | 整體部署 | **3600s**（可透過參數修改） |
| `deploy.ps1` | Render deploy 輪詢 | **600s**（每 30s 檢查一次） |
| `deploy.ps1` | Netlify API 查詢 | **15s** |
| `deploy.ps1` | Netlify 建立站台 | **30s** |
| `deploy.ps1` | Render 觸發 deploy | **60s** |
| `deploy.ps1` | Render deploy hook 備援 | **60s** |

---

## 環境變數對照表

| 變數 | 預設值 | 說明 | 設定位置 |
|------|--------|------|---------|
| `SESSION_TIMEOUT` | `172800` | Session 過期秒數（48h） | `.env` + `python_rag/.env` |
| `VITE_RAG_API` | `https://smart-mes-rag.onrender.com` | 後端 API URL（production） | `run/app/.env.production` |
| `VITE_RAG_API_DEV` | `http://localhost:9766` | 後端 API URL（本機開發） | `run/app/.env` |
| `FRONTEND_PORT` | `5173` | 前端開發伺服器 Port | `.env` |
| `RAG_PORT` | `9766` | 後端 API Port | `.env` |
| `NETLIFY_URL` | `https://smart-mes-dPpONf.netlify.app` | Netlify 站台 URL | `.env` |
| `NETLIFY_SITE_ID` | `c1e329f2-...` | Netlify Site ID | `.env` |
| `NETLIFY_AUTH_TOKEN` | （token） | Netlify 部署用 Token | `.env` |
| `RENDER_API_KEY` | （key） | Render API 金鑰 | `.env` |
| `RENDER_SERVICE_ID` | `srv-d8uinf6...` | Render Service ID | `.env` |
| `GOOGLE_CLIENT_ID` | `226084644706-...` | Google OAuth Client ID | `run/app/.env` |
| `ALLOWED_EMAIL` | `itsamliu2025@gmail.com` | 允許登入的 Email | `.env` + `python_rag/.env` |

---

## 異動記錄

| 日期 | 異動 | Commit |
|------|------|--------|
| 2026-06-30 | Session timeout 24h → 48h | `e658b37` |
| 2026-06-30 | 新增 Render keep-alive ping（10min） | `e658b37` |
| 2026-06-30 | LoginPage 新增 60s AbortController timeout | `e658b37` |
| 2026-06-30 | CostEstimationPage 新增 60s AbortController timeout | `e658b37` |
| 2026-06-30 | 所有 config 集中至 `.env`，腳本改讀環境變數 | `9985c68` |
