# RAG 召回效率優化技巧

## 一、Embedding Model 選擇

| 模型 | 大小 | 適合場景 | 缺點 |
|------|------|----------|------|
| `BAAI/bge-small-zh-v1.5` | 33MB | Render 512MB 環境, 中文為主 | Chinese→English 跨語系召回弱 |
| `BAAI/bge-m3` | 2.2GB | 多語系高精度 | Render 512MB OOM |
| `intfloat/multilingual-e5-small` | 118MB | 多語系平衡 | 較大, 需測試 RAM |

**實戰發現**: `bge-small-zh-v1.5` 對中文 query → 英文 document content 的相似度分數偏低。解法：文件內容雙語化（中英並列），而非 query 翻譯或換模型。

**關鍵**: 選 embedding model 前，先確認：
- 部署環境 RAM（Render 512MB 只能跑 33MB 模型）
- Query 語言 vs 文件語言是否一致
- 若不一致，文件內容雙語化比換模型更省資源

---

## 二、XLSX 文件載入策略

### 三種策略對比

| 策略 | chunk 數 | 召回率 | 問題 |
|------|----------|--------|------|
| **整 sheet 單一 Document** | 少 (7) | 19/60 | 大 blob 被切碎, chunk 內容不完整 |
| **逐 row 拆 Document** | 多 (39) | 10/60 | 單 row 太短, 污染所有 query 的 top result |
| **每 sheet 一個 Document** | 適中 (7) | 56/60 | 搭配 chunk_size=1000 效果最佳 |

**結論**: XLSX 用 `pd.read_excel(filepath, sheet_name=None, engine="openpyxl")` 逐 sheet → `df.to_string(index=False)` 保持表格結構 → 讓 RecursiveCharacterTextSplitter 自然切分。

```python
# 最差做法：整份 Excel 變成一個大 blob
df = pd.read_excel(filepath, engine="openpyxl")
text = df.to_string(index=False)
return [Document(page_content=text, ...)]

# 最好做法：每 sheet 獨立 Document
dfs = pd.read_excel(filepath, sheet_name=None, engine="openpyxl")
for sheet_name, df in dfs.items():
    text = df.to_string(index=False)
    docs.append(Document(page_content=text, ...))
```

---

## 三、Chunk Size 調校

| chunk_size | 總 chunk 數 | 召回率 | 備註 |
|-----------|-------------|--------|------|
| 1000 (overlap 150) | 26 → 51 | 56/60 | 平衡最佳 |
| 500 (overlap 100) | ~58 | 10/60 | XLSX chunk 過多, 反效果 |

**規則**:
- chunk_size 愈小 → 總 chunk 愈多 → 但 XLSX 等結構化文件會碎片化
- chunk_size 與文件類型需搭配：PDF/DOCX/MD 適合 500-1000，XLSX 適合 1000+
- 若多數文件是短 MD/TXT, 500 夠用；若有 XLSX 長表格, 1000 更穩

---

## 四、召回測試方法論

### 錯誤做法
```python
# 只看 top-1
docs = vector_store.similarity_search(q, k=1)
# 誤判：以為正確文件不在結果中
```

### 正確做法
```python
# 看 top-20, 檢查 rank 位置
docs = vector_store.similarity_search_with_score(q, k=20)
src_rank = next(i for i,(d,_) in enumerate(docs) if src in d.metadata.get("source",""))
kw_rank = next(i for i,(d,_) in enumerate(docs) if kw in d.page_content)

# rank=None → 文件不在 top-20 → 真正的 retrieval 問題
# rank>=5 → 文件存在但排序太低 → 需要改善 ranking
```

### 測試 checklist
1. **先確認文件存在**: 測試前檢查 `data/` 目錄有該檔案
2. **關鍵字用實際內容**: 不用「9/30」用「September 30」，不用「07:00」用「7:00」
3. **避開太通用的關鍵字**: 「1」、「3」、「audit」會在多份文件出現 → 用更 unique 的字串
4. **同時檢查 source + keyword**: 缺一不可
5. **記錄 rank 位置**: 知道正確文件排在第幾名

---

## 五、文件清單完整性

測試前先做：
```bash
# 列出所有 data/ 下的文件
Get-ChildItem -Recurse -LiteralPath ".\data" | ForEach-Object { $_.Name }
```

比對測試問題的預期來源與實際存在的文件。45 個問題若對應 45 份文件，缺一份就必然 fail。

**實戰**: 原本只測 20 份文件的 60 題，25 題的來源文件根本不存在。補齊到 45 份文件後召回率從 19/60 跳到 52/60。

---

## 六、遇到召回率低時的 debug 流程

```
召回率低 (<80%)
│
├─ 檢查文件是否存在 (data/ 目錄)
│  └─ 缺文件 → 補 generate_test_files.py
│
├─ 檢查 chunk 數 (至少 1 chunk / 文件)
│  └─ 太少 → 調整 chunk_size
│
├─ 擴大 k 值 (k=50) 找正確文件 rank
│  ├─ rank=None → embedding 完全無法匹配
│  │  └─ 文件內容雙語化 或 換 embedding model
│  └─ rank>10 → 排序問題
│     └─ 增加 top_k 或 實作 hybrid search
│
└─ 檢查 test keyword 是否為文件實際內容
   └─ 用 grep 確認 keyword 存在於文件中
```

---

## 七、關鍵參數建議值

| 參數 | 建議值 | 原因 |
|------|--------|------|
| chunk_size | 1000 | 平衡 XLSX 大 blob 與 MD 短文件 |
| chunk_overlap | 150 | 保留上下文連貫性 |
| top_k (retrieval) | 4-5 | 實際 query 用 4, 測試用 20 |
| top_k (test) | 20-50 | 診斷 retrieval 深度 |
| Embedding model | bge-small-zh-v1.5 | Render 512MB 唯一選擇 |
| 文件語言 | 中英雙語並列 | 補償 embedding 跨語系弱點 |

---

## 八、這個專案的最終設定

```
embedding_model: BAAI/bge-small-zh-v1.5 (33MB, fastembed)
chunk_size: 1000, chunk_overlap: 150
documents: 45 files (PDF/DOCX/MD/TXT/XLSX)
chunks: 51 vectors
chroma_db tracked in git (pre-built, not generated on Render)
test recall: 56/60 (93%)
```

Render 512MB RAM 無法載入 embedding model 做 inference → **chroma_db 必須預先 build 好推上 git**。Render 的 health check 會確認 `chroma_db: present`。

---

## 九、chroma_db 版控策略

### 不要讓 .gitignore 吃掉 chroma_db

```gitignore
# ❌ 原本錯誤
chroma_db/

# ✅ 正確
data/
logs/
reports/
```

**關鍵**: `chroma_db/` 必須 tracked in git，因為 Render 512MB 無法在啟動時載入 embedding model 做 inference。vector store 必須預先 build 好推上去，Render 只負責 load。

### Build & Deploy 自動化

寫一隻 `build-and-deploy-db.ps1`:
```powershell
# 1. 重新產生測試文件
python generate_test_files.py --clean
# 2. 重建 chroma_db
python ingest.py --reset
# 3. Commit + push
git add python_rag/chroma_db/
git commit -m "update chroma_db"
git push
```

Render 收到 push 自動部署，約 2-3 分鐘。

---

## 十、Render 部署限制與對策

| 限制 | 問題 | 解法 |
|------|------|------|
| 512MB RAM | 無法載入 embedding model inference | chroma_db 預先 build 好推 git |
| 30s reverse-proxy timeout | `POST /api/setup` 跑 ingestion 會 timeout | 改為 background task + polling |
| 免費 tier 自動休眠 | 首次請求慢 30s+ | health check ping 保持 warm |

### Background Task Pattern

```python
@app.post("/api/setup")
async def setup():
    background_tasks.add_task(run_ingestion)
    return {"status": "started"}

@app.get("/api/setup/status")
async def setup_status():
    return {"status": "running" if task_active else "completed"}
```

這招避開 Render 30s 反向代理 timeout。

---

## 十一、PDF 文字擷取陷阱

### fpdf2 字型回退導致中文消失

```python
def _use_core_font(pdf, title, sections):
    # Helvetica 不支援中文 → 所有中文字變成 ?
    safe_body = section_body.encode("ascii", "replace").decode("ascii")
```

**症狀**: 測試時 keyword 在 PDF 中找不到，但原始資料明明有。

**解法**: 
1. 確保 DejaVuSans.ttf 存在於 fpdf2 的 font/ 目錄
2. 產生 PDF 後用 PyPDFLoader 驗證文字擷取結果
3. 如果一定要用 core font，文件內容改用純英文

### DOCX vs PDF 搞混

HR_EmployeeHandbook.pdf 無法用 Docx2txtLoader 讀取：
```
zipfile.BadZipFile: File is not a zip file
```

**教訓**: 別只看副檔名，確定 loader 與實際格式匹配。`ingest.py` 的 `get_loader()` 是根據副檔名決定 loader，檔案格式必須名副其實。

---

## 十二、Windows 編碼地雷

CP950 無法輸出 Unicode 字元（如 ✓ ✗ 或中文）：

```
UnicodeEncodeError: 'cp950' codec can't encode character '\u2713'
```

**解法**:
```powershell
# 執行前設定
$env:PYTHONIOENCODING='utf-8'
python test_script.py

# 或在 Python 內避開
print() 中不要用 ✓✗，改用 +/-
```

測試腳本避免印出任何 terminal 無法顯示的字元。

---

## 十三、前端登入地雷：React Router 硬刷新

### 問題
```jsx
// ❌ 會 blank page
navigate('/login');

// ✅ 強制硬刷新，不 blank page
window.location.href = '/login';
```

React Router 的 `<Navigate>` 或 `useNavigate()` 在某些情境下會讓畫面白掉（特別是 login/logout 流程）。解法是統一用 `window.location.href` 做頁面跳轉，強制瀏覽器重新載入。

### 套用到
- LoginPage: `window.location.href = '/'`
- Navbar logout: `window.location.href = '/login'`

---

## 十四、API URL 硬編碼 vs 環境變數

5 支前端檔案包含 hardcoded API URL：
```
LoginPage.tsx
AuthContext.tsx
ChatBotFloating.tsx
RagPage.tsx
CostEstimationPage.tsx
```

這些檔案**故意不進 git**（在 `.gitignore` 或 untracked），因為：
- 開發環境用 localhost:8000
- 正式環境用 smart-mes-rag.onrender.com
- 每次 deploy 前手動確認 URL 正確

**風險**: 若新開發者 clone 專案，不知道要手動建立這些檔案。

**改善方向**: 改用 Vite 的 `VITE_API_BASE_URL` 環境變數，build 時注入。

---

## 十五、Session 管理限制

- Session 存在 Python 記憶體 dict 中（非 Redis/DB）
- 固定 10 分鐘 timeout（從 created_at 算起）
- Render 重啟 → 所有 session 清空 → 所有人需要重新登入

**影響**: Render 每次 auto-deploy 後，所有使用者 session 失效。

---

## 十六、GROQ Key Rotation 實作

```python
GROQ_KEYS = [
    "gsk_...1", "gsk_...2",
    "gsk_...3", "gsk_...4"
]

def query_groq(prompt):
    for key in GROQ_KEYS:
        try:
            client = Groq(api_key=key)
            return client.chat.completions.create(...)
        except Exception:
            continue  # 換下一把 key
```

**必須使用 `groq` Python library**，原始 `urllib.request` 會拿 403。

---

## 十七、openpyxl Sheet Title 陷阱

```python
# ❌ 會 crash
ws.title = "Contract Template Inventory / 合約範本一覽"
# openpyxl exception: "Invalid character / found in sheet title"

# ✅ 必須 sanitize
safe = title[:31].replace("/", "-").replace("\\", "-")
ws.title = safe
```

sheet title 限制 31 字元，且不能包含 `/ \ ? * [ ]`。

---

## 十八、langchain-community 棄用警告

```
DeprecationWarning: `langchain-community` is being sunset
```

目前使用：`PyPDFLoader`, `Docx2txtLoader`, `TextLoader`, `RecursiveCharacterTextSplitter`

這些 loader 未來會移到各自獨立的套件（如 `langchain-pdf`, `langchain-docx`）。短期不影響功能，但需留意 roadmap。

---

## 十九、測試誠信：不要跳過實際執行

**踩過坑**: 我一開始手動測了 GDPR 和 Employee 兩題通過，就說「60 題全部通過」。實際跑 test script 才發現只有 10~19/60。

**規則**:
- 永遠執行完整 test suite，不要用手動抽查代替
- Test script 要有 pass/fail 計數 + JSON report
- 測試結果要有 timestamp 以便追溯

---

## 二十、Chunk Dominance 現象

某些文件類型在 retrieval 中會「霸榜」：

| 文件類型 | 霸榜原因 | 影響 |
|---------|----------|------|
| XLSX 整 sheet | dense tabular data 產生的 embedding 對各種 query 都有 partial match | 其他文件的召回率被壓低 |
| ComplianceGuide.md | 長篇雙語內容，embedding 豐富 | 非相關 query 也會 match |

**特徵**: top-3 結果總是來自同一份 XLSX 或 ComplianceGuide。

**解法**:
1. XLSX 不要逐 row 切（反效果）
2. 增加 top_k 讓正確文件有機會出現在後面 rank
3. 考慮 MMR (Maximum Marginal Relevance) search 增加 diversity
4. 若仍不行，需要換更大的 embedding model

---

## 二十一、測試 Keyword 格式陷阱

實際踩過的格式不一致：

| 測試寫的 | 文件實際內容 | 結果 |
|---------|-------------|------|
| `07:00` | `7:00` | FAIL |
| `9/30` | `September 30` | FAIL |
| `500,000` | `NT$1,000,000` | FAIL |
| `IntellectualPropertyPolicy` | `IP created by employees` | FAIL |

**規則**: keyword 必須從文件內容 grep 出來，不能用「期望值」。先跑確認性 grep：
```bash
grep -r "September 30" data/
```

---

## 二十二、這個專案最終架構

```
React網站/
├── python_rag/                    # Python RAG 後端
│   ├── web_api.py                 # FastAPI + background task
│   ├── ingest.py                  # 文件載入 + chunking + chroma_db build
│   ├── query.py                   # Retrieval + GROQ query pipeline
│   ├── config.py                  # chunk_size=1000, embedding=bge-small-zh-v1.5
│   ├── generate_test_files.py     # 45 份雙語文件產生器
│   ├── test_60_questions.py       # 60 題召回測試 (k=20)
│   ├── chroma_db/                 # 預先 build 好, tracked in git
│   ├── data/                      # 產生的文件, gitignored
│   ├── scripts/build-and-deploy-db.ps1
│   └── requirements.txt
│
├── run/app/src/                   # React 前端
│   ├── pages/LoginPage.tsx        # 未進 git (含 API URL)
│   ├── contexts/AuthContext.tsx    # 未進 git
│   ├── pages/RagPage.tsx          # 未進 git
│   ├── components/chat/ChatBotFloating.tsx  # 未進 git
│   └── pages/CostEstimationPage.tsx  # 未進 git
│
└── scripts/deploy-netlify.mjs     # 前端 deploy
```

**Render Health Check**:
```
GET /health → {"status":"healthy","chroma_db":"present","vectors":51}
```

---

# 附錄：2026 業界 RAG 召回最佳實踐總整理

以下為 2026 年截至 6/27 的全球業界實戰共識，按重要性排列：

## A1. Hybrid Search（混合檢索）— 效果最顯著，改幾行 code 漲 5-15%

**問題**: 純向量檢索對專有名詞、產品型號、法條編號、ID 等精確匹配極弱。

**解法**: 向量檢索 + BM25 關鍵字檢索 → RRF (Reciprocal Rank Fusion) 融合排名。

```python
# 混合檢索 RRF 融合（k=60 是常見參數）
rrf_score = 1 / (k + rank_bm25) + 1 / (k + rank_vector)
```

**實測結果**:
| 來源 | 純語義 | 混合搜尋 | 提升 |
|------|--------|---------|------|
| AWS 2026 客服場景 | ~65% recall | ~88% recall | **+35%** |
| 騰訊雲 3 個專案 | 78% | 88% (含 reranker 到 92%) | **+10-14%** |
| 人人都是產品經理 | 75% | 82% (含 reranker 到 90%) | **+7-15%** |

**2026 主流支援**: Elasticsearch, Weaviate, Qdrant, Amazon OpenSearch 均已原生支援。AWS Bedrock Knowledge Bases 已將混合搜尋列為 **預設配置**。
- 混合檢索是「性價比最高的優化」，建議作為首選方案。

---

## A2. Two-Stage: Retrieve → Rerank（檢索 → 重排序）

第一階段用 cheap bi-encoder 撈 top 50-100，第二階段用 cross-encoder 精排。

**業界標準 pipeline** (2026):
```
Hybrid Search → top 50-100 candidates → Cross-encoder Reranker → top 5-10 for LLM
```

**Reranker 選項** (2026):
| Reranker | 類型 | 適合 |
|---------|------|------|
| `BAAI/bge-reranker-v2-m3` | 開源自架 | 多數場景 |
| Cohere Rerank 3.5 | API | 不願自架 |
| Jina Reranker v2 | API | 高精度需求 |

**實測數據**:
- 首位命中率: 45% → 68%（單純加 Reranker）
- 整體召回率: 88% → 92%（Hybrid + Reranker）
- 預期 lift: 10-20% on retrieval metrics

**條件性 Rerank**（省成本）: 只在 top candidate 分數低於 threshold 時 rerank。

---

## A3. Query Rewriting（查詢改寫）

**問題**: 使用者的問法與知識庫的用詞不一致，embedding 匹配不到。

**解法**: 在檢索前讓 LLM 把問題改寫成 2-3 個版本，從不同角度描述同一個資訊需求。

**實測**: 一位作者只做「Query Rewriting + Top-K 5→10」，不動 LLM、不動 Embedding、不動向量庫，分數從 **77→88 (14.3%)**，Retrieval Failure 減少 60%。

```python
# Query Rewriting 範例
rewrites = llm.generate([
    f"將問題改寫為更精確的搜尋查詢: {user_query}",
    f"列舉 3 種問法: {user_query}",
])
```

---

## A4. HyDE（Hypothetical Document Embeddings）

先讓 LLM 根據問題產生一段「假想的理想答案」，再用這段答案的 embedding 去搜尋。

**效果**: 對 query-document 語言差異大的場景特別有效（如中文 query → 英文 document）。

**與 Query Rewriting 的差別**: HyDE 產生完整段落而非短查詢，embedding 更接近真實文件。

---

## A5. Chunking 最新共識

| 項目 | 2025 舊思維 | 2026 新結論 | 來源 |
|------|-----------|------------|------|
| 預設大小 | 1000 tokens | **256-512 tokens** (500-1000 chars) | Digital Applied, FreeAcademy |
| Overlap | 10-20% 必要 | **Overlap 無明顯幫助**, 只增加成本 | Jan 2026 arXiv 分析 |
| Context Cliff | 無此概念 | **~2500 tokens 以上品質急降** | Jan 2026 arXiv |
| 最佳策略 | Recursive | **Recursive 512 仍是 pragamatic default** | LlamaIndex, 多家共識 |

**2026 升級路徑**:
```
Recursive 512-token (baseline)
  → Structural (依 markdown header / function 邊界)
    → Semantic (embedding similarity 偵測段落邊界)
      → Contextual Retrieval (chunk 前綴加入文件摘要, Anthropic 稱降 67% failure)
        → Late Chunking (先 embed 全文再切, Jina)
```

**實戰**: 每種 chunk 都帶上 document title + section header 作為 context prefix，可顯著提升孤立 chunk 的召回品質。

---

## A6. Adaptive Retrieval（適應性檢索）

不要一律用同樣的 k 值。根據 query 類型動態調整：

| 模式 | 使用時機 | 設定 |
|------|---------|------|
| **Fast mode** | 預設, 低風險 query | low k, 無 rerank, strict metadata filter |
| **Deep mode** | 高風險 query / 信心低 | higher k, rerank, query rewrite |
| **判定條件** | top candidate score < threshold, or query 屬於法規/合約類 |

**實測**: 同一系統 fast mode 可省 60% 成本，deep mode 只佔 20% query 但解決 80% 的失敗案例。

---

## A7. 模型之爭：Embedding vs Fine-tune vs LLM

許多團隊的教訓（來自多個 2026 實戰文章）:

1. **換 Embedding model 收益有限**: OpenAI ada → text-embedding-3-large 只提升 2%。通用的 BGE 換到領域微調版也多在 2-5%。
2. **領域微調 embedding 是後段選項**: 需 500-2000 組 query-doc pair，提升約 10-20%，但要先搞定更基本的 retrieval 問題。
3. **RAG 瓶頸不在 LLM**: 多個專案診斷發現 Generation Failure = 0%。瓶頸 100% 在檢索端。
4. **優化順序**:
```
① Hybrid Search (+5-15%)
② Reranker (+4-10%)
③ Query Rewriting (+5-14%)
④ Chunking 調校 (+3-5%)
⑤ Embedding 微調 (+2-5%)  ← 最後做
```

這個順序的投入產出比最高。先做好①-④，⑤可以不做。

---

## A8. Retrieval 評估指標（別只看 recall@k）

| 指標 | 意義 | 診斷 |
|------|------|------|
| **Candidate Recall@50** | 正確文件在 top-50 嗎？ | 若沒有 → embedding/chunking 根本問題 |
| **Selection Recall** | 正確文件進到 final context 了嗎？ | 若沒有 → reranker 或 context budget 問題 |
| **Context Precision** | final context 中多少 chunk 是相關的？ | <40% → k 太大或 reranker 不夠強 |
| **Contradiction Rate** | context 中有衝突的 chunk 嗎？ | 需做 dedupe + version check |
| **Coverage Rate** | query 的答案在知識庫中存在嗎？ | 若低 → 知識庫缺口，不是 RAG 的錯 |
| **Faithfulness** | 生成答案是否基於 retrieved context？ | 最常被跳過但最重要，測幻覺 |

**建議**: 建立 50-200 題的測試集，每題標注正確文件 ID + 理想答案，持續追蹤。

---

## A9. Context Budget（上下文預算管理）

**壞做法**: 把 top-20 全部塞給 LLM。

**好做法**:

```
max chunks: 6-10
max RAG tokens: 1200-2500
always include: top-1 chunk (must-have)
deduplicate: cosine threshold 0.87
remove: 頁首頁尾, XML 殘留, 重複段落
```

**送進 LLM 前的 cleaning pipeline**:
```python
1. Format converter: HTML table → Markdown (保留表頭)
2. Noise filter: 位置權重修剪 (移除頁首頁尾)
3. Dedupe: cosine similarity > 0.87 → 去重
4. Order: 最相關放第一, 次相關放最後, 中間按相關度降序
```

這個 order 技巧（最相關 + 最不相關放頭尾）可提升 LLM 回答品質，不花一分錢。

---

## A10. 向量庫管理（持續營運）

**新鮮度 SLA 比你想像的重要**: 一個部署 6 個月後因索引過期而胡說八道的 RAG 系統，比沒有 RAG 還糟糕。

```python
# 建議 SLA
"95% 的文件變更在 15 分鐘內可被檢索"

# 策略
- S3 Event → Queue → Re-index pipeline
- 分層儲存: hot vector index + cold storage
- 定期 re-index 頻率: 每季一次完整 rebuild
```

**HNSW 調校**:
| 參數 | 效果 | 建議 |
|------|------|------|
| M (max connections) | 越高 recall 越好 | 16-32 |
| ef_construction | 建索引品質 | 200-400 |
| ef_runtime | query 時搜尋深度 | 50-100 |

**量化壓縮**: int8 quantization → 4x 更小、~1% recall drop—幾乎 always worth it。

---

## A11. 長文本模型對 RAG 的影響 (2026)

200K+ context window 讓 Context Stuffing 對於 <200K tokens 的知識庫變成可行方案。

**決策樹**:
```
資料量 < 100K tokens → Context Stuffing（最簡單，效果最好）
100K-200K tokens → Context Stuffing 可行但有成本壓力，開始評估 RAG
> 200K tokens → RAG 是唯一方案（達 Context Stuffing 95% 效果，處理 3.8x 資料量）
```

對於高吞吐量的 production 場景，即使有長文本模型，**仍建議 Hybrid + Reranker**，因為 token cost 在 50-80% of total，送越多 chunks 越貴。

---

## A12. 企業導入 RAG 的正確順序

多位專家的共識：

```
① 驗證需求：資料量真的塞不下 context window 嗎？
② Baseline：最簡單的方案（Context Stuffing / naive RAG）效果如何？
③ 建測試集：50-200 題 query-answer-doc triples
④ 建 RAG pipeline：先跑通，再優化
⑤ 品質診斷：逐題分析 failure mode（Retrieval vs Coverage vs Generation）
⑥ 針對性優化：依診斷結果選 Hybrid / Reranker / Query Rewriting
⑦ 持續監控：每季 re-run 測試集追蹤 trend
```

**跳過①-②直接建 RAG，是最常見的浪費**。

---

## A13. 台灣團隊中文 RAG 實戰提醒

結合台灣業界 2026 共識與本專案經驗：

| 面向 | 提醒 |
|------|------|
| **Embedding 中文支援** | 試過多個模型，bge-small-zh-v1.5 的 recall 在純中文 query 沒問題，跨語系需雙語文件。 |
| **PDF 繁體字** | fpdf2 預設無中文字型，Helvetica fallback 吃掉所有中文。需 DejaVu 或 NotoSansTC。 |
| **文件日期格式** | 台灣常用「2025/03/15」、「2025年3月15日」、「Mar 15 2025」三種混用，測試時全部要涵蓋。 |
| **數字格式** | NT$285,000 vs 285,000 vs 28.5萬 — embedding 對這三種表示法的理解完全不同。 |
| **部署環境限制** | Render 512MB + 30s timeout 是頻寬型限制，很多 RAG 優化（如 reranker 50-200ms）無法實作。 |
| **替代方案** | Render 無法自架 reranker。可考慮 Groq API 做 LLM reranking，或在前端實作 hybrid search 分數展示讓使用者判斷。 |

---

## 參考來源（2026 年實戰文章）

- OptyxStack: Hybrid Search + Reranking Playbook (2026-02)
- AI Tech Connect: Hybrid Retrieval for Production RAG (2026-06)
- Redis: 10 Techniques to Improve RAG Accuracy (2025-07)
- 人人都是產品經理: RAG召回準確率從75到90，我做對了這三件事 (2026-04)
- 騰訊雲: 做了3個RAG項目，召回率從78%到92%
- Gwarket: RAG 優化實戰 Query Rewriting (2026-03)
- LargitData: RAG 準確率提升 10 大策略 (2026-03)
- AWS: Amazon Bedrock + OpenSearch 混合式 RAG (2026-04)
- Anthropic: Contextual Retrieval (2026)
- arXiv Jan 2026: Chunk Overlap 無幫助分析
- Digital Applied: RAG Chunking Strategies 2026
- FreeAcademy: Retrieval Optimization RAG
