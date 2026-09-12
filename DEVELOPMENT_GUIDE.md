# Development Guide - Smart MES Platform

> **Last updated**: 2026-07-05
> **For**: Next developer taking over this project
> **Scope**: Full-stack React + FastAPI/RAG demo platform for server MES

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Evolution: How This Was Built](#3-evolution-how-this-was-built)
4. [Tech Stack & Why](#4-tech-stack-why)
5. [Project Structure](#5-project-structure)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Backend - RAG Engine](#7-backend---rag-engine)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Internationalization (i18n)](#9-internationalization-i18n)
10. [Deployment Scripts](#10-deployment-scripts)
11. [Docker Deployment](#11-docker-deployment)
12. [Development Journey (All Phases)](#12-development-journey-all-phases)
13. [Pitfalls & Lessons Learned](#13-pitfalls--lessons-learned)
14. [Handover Checklist](#14-handover-checklist)
15. [Common Tasks](#15-common-tasks)

---

## 1. Project Overview

This is a **single-page application (SPA) demo platform** for a server production line MES (Manufacturing Execution System). It visualizes the complete production workflow from kitting to shipping through 9 chapter demo videos (V0-V8), plus an interactive architecture panorama with STAR principle content for 6 MES modules.

**Key differentiator**: The platform includes a real RAG (Retrieval-Augmented Generation) backend that can answer questions about uploaded PDF documents using LLM + vector search. This is NOT a mock — it queries actual documents via Groq LLM + ChromaDB.

**Who uses this**: Enterprise clients evaluating MES solutions. The platform demonstrates smart factory concepts through video walkthroughs, interactive dashboards, and an AI-powered document Q&A chatbot.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React SPA (Vite 8 + TypeScript + Tailwind)                │    │
│  │                                                             │    │
│  │  Pages: Splash → Home → Video → Dashboard → Monitor →      │    │
│  │         Yield → Guide                                      │    │
│  │                                                             │    │
│  │  Components:                                                │    │
│  │    ArchDiagram (6 auto-play videos + STAR modal)           │    │
│  │    SkillHeatMap (23h × 60d color grid)                     │    │
│  │    ChatBotFloating (PDF upload → async RAG query)          │    │
│  │    KPI cards, charts, station grid, alert panel            │    │
│  │                                                             │    │
│  │  Code-split into 8 chunks via advancedChunks              │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                         │                                           │
│         ┌───────────────┼───────────────┐                          │
│         │               │               │                          │
│    Local Dev       Netlify CDN     Docker nginx                     │
│    :5173           (production)    :80 → proxy                     │
│         │               │               │                          │
└─────────┼───────────────┼───────────────┼──────────────────────────┘
          │               │               │
          │               │          ┌────┴────┐
          │               │          │ nginx   │
          │               │          │ /api/*  │
          │               │          └────┬────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + RAG)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  web_api.py  (FastAPI, port 9766)                           │   │
│  │                                                              │   │
│  │  Endpoints:                                                  │   │
│  │    POST /api/query          → RAG pipeline (query docs)     │   │
│  │    GET  /api/status         → System status                 │   │
│  │    POST /api/ingest         → Re-ingest documents           │   │
│  │    GET  /api/history        → Query history                  │   │
│  │    POST /api/upload-pdf     → Upload + async vision analyze │   │
│  │    GET  /health             → Health check                   │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                       │
│  ┌──────────▼───────────────────────────────────────────────────┐   │
│  │  rag_engine/engine.py                                        │   │
│  │                                                              │   │
│  │  Query Pipeline:                                             │   │
│  │    1. User question                                          │   │
│  │    2. Jina embeddings-v3 (vectorize question)                │   │
│  │    3. ChromaDB similarity search (54 vectors)                │   │
│  │    4. Cohere reranker (top-K refinement)                     │   │
│  │    5. Groq llama-3.3-70b-versatile (4 API key rotation)     │   │
│  │    6. Answer with source citations                           │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                       │
│  ┌──────────▼──────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ ChromaDB        │  │ Groq API     │  │ Cohere Reranker    │   │
│  │ 54 vectors      │  │ 4-key rotate │  │                    │   │
│  │ (committed to   │  │ llama-3.3-   │  │                    │   │
│  │  git via        │  │ 70b-versatile│  │                    │   │
│  │  git add -f)    │  │              │  │                    │   │
│  └─────────────────┘  └──────────────┘  └────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  vision_processor.py (PDF → async analysis)                  │   │
│  │  auth.py (Google OAuth, single email whitelist)              │   │
│  │  security.py (audit logging)                                 │   │
│  │  config.py (env-based configuration)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT TARGETS                                │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ LOCAL            │  │ NETLIFY          │  │ RENDER           │   │
│  │                  │  │                  │  │                  │   │
│  │ Vite :5173       │  │ Frontend SPA     │  │ FastAPI backend  │   │
│  │ FastAPI :9766    │  │ (static files)   │  │ (free tier)      │   │
│  │ start.bat        │  │ auto-deploy      │  │ auto-deploy      │   │
│  │ stop.bat         │  │ from git push    │  │ via API hook     │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ DOCKER (optional)                                            │   │
│  │   docker compose up -d --build                               │   │
│  │   Backend: Python 3.11-slim container                        │   │
│  │   Frontend: nginx:alpine container                           │   │
│  │   Volume: chroma_data (persist vector store)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Evolution: How This Was Built

The project went through **4 major architecture shifts**. Understanding this history prevents repeating mistakes.

### Phase 1: Static SPA (Initial)

```
React + Vite + Tailwind → Static mock data → 7 pages → Deploy to Netlify
```

- Pure frontend, no backend
- All data was mock/hardcoded
- Videos served from `public/videos/`
- Deployed as static SPA to Netlify

### Phase 2: Flask Backend (Added)

```
React SPA ←→ Flask :5000 (data API)
              Flask :5001 (notify API)
              Docker (3 containers: nginx + 2 Flask)
```

- Added Flask for yield data, defects, downtime, events
- Docker Compose with nginx reverse proxy
- **Problem**: Flask was too lightweight for RAG; no vector search capability

### Phase 3: FastAPI + RAG (Major Rewrite)

```
React SPA ←→ FastAPI :9766 (web_api.py)
              ChromaDB (vector store)
              Groq LLM (inference)
              Jina embeddings (vectorization)
              Deploy to Render (free tier)
```

- Replaced Flask entirely with FastAPI
- Added real RAG pipeline: documents → chunks → embeddings → vector store → query → LLM answer
- Frontend stays on Netlify, backend on Render
- **Problem**: Render free tier has 512MB RAM and 30s timeout

### Phase 4: Enterprise Deployment (Current)

```
React SPA ←→ FastAPI + RAG (same)
              + Docker support (Dockerfile + compose)
              + Enterprise deploy scripts (start.bat/stop.bat/deploy.ps1)
              + Pre-flight verification (verify.ps1)
              + API smoke tests (test_api_smoke.py)
              + Async vision analysis (avoid 30s timeout)
              + Text search fallback (avoid OOM on Render)
```

- Added complete deployment automation
- Docker containerization option
- Async PDF analysis to work around Render timeout
- Text search fallback when ChromaDB ingest OOMs

---

## 4. Tech Stack & Why

| Layer | Technology | Why This Choice | Why NOT Alternatives |
|-------|-----------|-----------------|---------------------|
| Framework | React 19 + Vite 8 | Fast HMR, modern bundler, TypeScript | CRA (deprecated), Next.js (SSR not needed) |
| Styling | Tailwind CSS v3 | Utility-first, dark mode built-in | CSS modules (too verbose), styled-components (runtime cost) |
| Charts | Recharts | Declarative API, responsive containers | D3 (too low-level), Chart.js (imperative) |
| Animations | framer-motion | Declarative animations, layout | CSS animations (limited), GSAP (heavy) |
| i18n | i18next + react-i18next | Industry standard, lazy loading | Custom Context (we tried, too much work) |
| Router | react-router-dom v7 | Standard SPA routing | TanStack Router (overkill for this) |
| Backend | FastAPI (Python) | Async support, OpenAPI docs, type hints | Flask (no async), Django (too heavy) |
| Vector Store | ChromaDB | Lightweight, local, easy API | Pinecone (paid), FAISS (no API) |
| Embeddings | Jina embeddings-v3 | Good quality, free tier available | OpenAI embeddings (paid), sentence-transformers (slow) |
| LLM | Groq llama-3.3-70b-versatile | Fast inference, free API keys | OpenAI (paid), local LLM (too slow) |
| Reranker | Cohere | Good reranking quality | No reranker (lower quality) |
| Auth | Supabase + Google OAuth | Managed auth, easy setup | Custom auth (security risk) |
| Deploy (FE) | Netlify | Free, auto-deploy from git | Vercel (similar), GitHub Pages (no server) |
| Deploy (BE) | Render | Free tier, Python support | Railway (paid), Fly.io (complex) |
| Container | Docker Compose | Multi-service orchestration | Kubernetes (overkill) |

---

## 5. Project Structure

```
smart-mes-platform/                     # Project root
├── .env                                # Central config (GITIGNORED)
├── .env.example                        # Template (committed)
├── .gitignore                          # Excludes .env, node_modules, .venv, etc.
├── .dockerignore                       # Docker build exclusions
├── Dockerfile                          # Multi-stage: python:3.11-slim
├── docker-compose.yml                  # Backend (FastAPI) + Frontend (nginx)
├── start.bat                           # One-click deploy entry point (English)
├── stop.bat                            # Stop services + factory reset (English)
├── FAQ.md                              # All Q&A from development conversations
├── DEVELOPMENT_GUIDE.md                # This file
├── README.md                           # Project readme
│
├── scripts/                            # Deployment & testing scripts
│   ├── deploy.ps1                      # Enterprise deploy engine (~857 lines)
│   ├── verify.ps1                      # Pre-flight environment check (~300 lines)
│   ├── test_api_smoke.py              # Standalone API smoke test (5 endpoints)
│   ├── start-services.ps1             # Start Vite + FastAPI as background jobs
│   ├── stop-services.ps1              # Kill processes on ports 5173/9766
│   ├── nginx.conf                      # Nginx config for Docker frontend
│   └── reports/                        # Generated deploy reports
│
├── run/                                # Frontend
│   ├── app/                            # React application
│   │   ├── package.json                # Dependencies (NO xlsx, NO pg, NO @react-oauth/google)
│   │   ├── vite.config.ts             # Vite 8 with advancedChunks (NOT manualChunks)
│   │   ├── tsconfig.json              # TypeScript config
│   │   ├── tailwind.config.js          # Tailwind with darkMode: 'class'
│   │   ├── .env                        # VITE_RAG_API (frontend-only env)
│   │   ├── .env.production             # VITE_RAG_API=https://smart-mes-rag.onrender.com
│   │   ├── public/
│   │   │   ├── videos/                 # 0.mp4 (splash), 1.mp4-8.mp4 (V1-V8)
│   │   │   ├── arch/                   # 1.mp4-6.mp4 (architecture demos)
│   │   │   └── logo.png               # Site logo
│   │   └── src/
│   │       ├── main.tsx               # Entry: StrictMode + providers
│   │       ├── App.tsx                 # Routes: Splash + 6 pages
│   │       ├── index.css              # Tailwind directives
│   │       ├── data/
│   │       │   ├── starContent.ts      # 6 STAR entries + SimMetric interface
│   │       │   ├── modulesData.ts      # 6 MES module definitions
│   │       │   ├── mockData.ts         # Dashboard mock data
│   │       │   └── yieldMockData.ts    # Yield charts mock data
│   │       ├── i18n/
│   │       │   ├── index.tsx           # I18nProvider, useT hook
│   │       │   ├── en.json            # English (canonical)
│   │       │   ├── zh-TW.json         # Traditional Chinese
│   │       │   ├── ja.json            # Japanese
│   │       │   └── vi.json            # Vietnamese
│   │       ├── pages/
│   │       │   ├── SplashScreen.tsx    # Full-screen intro + ENTER
│   │       │   ├── HomePage.tsx        # Hero + Smart Factory Panorama
│   │       │   ├── VideoPage.tsx       # V0-V8 chapter demos
│   │       │   ├── DashboardPage.tsx   # Skill heatmap + KPI + stations
│   │       │   ├── MonitorPage.tsx     # Station grid + alerts + event log
│   │       │   ├── YieldAnalysisPage.tsx  # 4 KPIs + 6 charts
│   │       │   └── GuidePage.tsx       # Pillar cards + module explainers
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   └── Navbar.tsx      # 6 links, lang selector, voice toggle
│   │       │   ├── sections/
│   │       │   │   ├── HeroSection.tsx # Animated KPI counters
│   │       │   │   └── ArchDiagram.tsx # 6 videos + STAR modal + MetricBars
│   │       │   ├── dashboard/
│   │       │   │   ├── SkillHeatMap.tsx # 23h × 60d grid (CSV export)
│   │       │   │   ├── StationGrid.tsx
│   │       │   │   ├── AlertPanel.tsx
│   │       │   │   ├── EventLog.tsx
│   │       │   │   └── KpiCards.tsx
│   │       │   ├── yield/
│   │       │   │   ├── ProductionProgress.tsx
│   │       │   │   ├── DefectPareto.tsx
│   │       │   │   ├── DefectPie.tsx
│   │       │   │   ├── YieldTrend.tsx
│   │       │   │   ├── TorqueTrend.tsx
│   │       │   │   └── StationDefectRate.tsx
│   │       │   ├── chat/
│   │       │   │   └── ChatBotFloating.tsx  # PDF upload + async RAG query
│   │       │   └── common/
│   │       │       ├── MetricBars.tsx       # Reusable animated bars
│   │       │       └── ChartContainer.tsx   # Chart wrapper with CSV export
│   │       └── utils/
│   │           ├── csvExport.ts        # Native CSV (replaced xlsx)
│   │           └── helpers.ts
│   └── dist/                           # Built output (gitignored)
│
└── python_rag/                         # Backend
    ├── .env                            # Backend config (GITIGNORED)
    ├── .env.example                    # Template
    ├── web_api.py                      # FastAPI server (~1016 lines)
    ├── rag_engine/
    │   ├── __init__.py
    │   └── engine.py                   # RAG pipeline (query, ingest, search)
    ├── vision_processor.py             # PDF async analysis
    ├── auth.py                         # Google OAuth (single email whitelist)
    ├── security.py                     # Audit logging
    ├── config.py                       # Env-based configuration
    ├── requirements.txt                # Python dependencies
    ├── test_60_questions.py           # 60 bilingual RAG recall test
    ├── test_rag.py                    # RAG unit tests
    ├── generate_report.py             # HTML test report generator
    ├── chroma_db/                      # Vector store (54 vectors, committed)
    ├── data/                           # Uploaded documents
    ├── logs/                           # Audit logs
    └── reports/                        # Test reports
```

---

## 6. Deployment Architecture

### 6.1 Local Development

```
┌──────────────┐     ┌──────────────────┐
│ Browser       │────▶│ Vite Dev Server   │  :5173
│               │◀────│ (HMR, React 19)  │
│               │     └──────────────────┘
│               │
│               │     ┌──────────────────┐
│               │────▶│ FastAPI Server    │  :9766
│               │◀────│ (web_api.py)     │
│               │     └──────────────────┘
└──────────────┘

How to start:
  start.bat              # One-click: verify → install → build → test → start
  start.bat --quick      # Skip dependency install (faster)

How to stop:
  stop.bat               # Stop services only
  stop.bat --clean-all   # Full factory reset
```

### 6.2 Production (Netlify + Render)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ User Browser  │────▶│ Netlify CDN      │────▶│ Render Backend   │
│               │◀────│ (static SPA)     │◀────│ (FastAPI + RAG)  │
│               │     │ smart-mes-dpponf │     │ smart-mes-rag    │
│               │     │ .netlify.app     │     │ .onrender.com    │
└──────────────┘     └──────────────────┘     └──────────────────┘

Deploy triggers:
  - Git push to main → Netlify auto-deploys frontend
  - deploy.ps1 -DeployRender → triggers Render API → redeploys backend
  - deploy.ps1 -DeployNetlify → triggers Netlify CLI deploy
```

### 6.3 Docker Mode

```
┌──────────────┐     ┌──────────────────┐
│ Browser       │────▶│ nginx:alpine      │  :5173 → :80
│               │◀────│ (SPA + proxy)    │
│               │     └────────┬─────────┘
│               │              │ /api/*
│               │     ┌────────▼─────────┐
│               │────▶│ FastAPI container │  :9766
│               │◀────│ (Python 3.11)    │
│               │     └──────────────────┘
└──────────────┘

How to start:
  start.bat --docker           # Build + run containers
  docker compose up -d         # Manual

How to stop:
  stop.bat                     # Same as local
  docker compose down          # Manual
```

### 6.4 Environment Variables

All configuration lives in root `.env` (gitignored). Scripts read from it.

```
# Required (must set before deploy)
NETLIFY_AUTH_TOKEN=...         # Netlify personal access token
NETLIFY_SITE_ID=...           # Netlify site ID
SUPABASE_URL=...              # Supabase project URL
SUPABASE_ANON_KEY=...         # Supabase anonymous key

# Optional (for Render deployment)
RENDER_API_KEY=...            # Render API key
RENDER_SERVICE_ID=...         # Render service ID (srv-d8uinf6...)
RENDER_DEPLOY_HOOK_URL=...    # Render deploy hook (fallback)

# Optional (for RAG backend)
GROQ_API_KEY_1=...            # Groq API key (up to 4 keys for rotation)
COHERE_API_KEY=...            # Cohere reranker key
JINA_API_KEY=...              # Jina embeddings key

# Ports (configurable)
RAG_PORT=9766                 # Backend port
FRONTEND_PORT=5173            # Frontend port
```

**⚠️ CRITICAL**: `.env` is GITIGNORED. Never commit it. `.env.example` is the template.

---

## 7. Backend - RAG Engine

### 7.1 How the RAG Pipeline Works

```
User Question
     │
     ▼
┌─────────────────┐
│ Jina embeddings  │  Vectorize the question
│ v3               │  (1024-dimensional vector)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ChromaDB         │  Similarity search against 54 vectors
│ cosine search    │  (pre-ingested document chunks)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cohere           │  Rerank top results for relevance
│ reranker         │  (removes noise, improves precision)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Groq llama-3.3   │  Generate answer using retrieved context
│ -70b-versatile   │  (4 API keys rotated to avoid rate limits)
└────────┬────────┘
         │
         ▼
Answer with Source Citations
```

### 7.2 Known Limitations (Render Free Tier)

| Limitation | Impact | Mitigation |
|---|---|---|
| ~512MB RAM | ChromaDB ingest OOMs | Text search fallback in `engine.py` |
| 30s proxy timeout | Heavy analysis blocked | Async vision (return immediately, poll) |
| 15 min sleep | Cold start delay | GitHub Actions keep-alive ping every 5 min |
| No persistent disk | Data lost on restart | ChromaDB committed to git (54 vectors) |

### 7.3 Async Vision Analysis Flow

```
User uploads PDF
     │
     ▼
POST /api/upload-pdf
     │
     ├─▶ Returns immediately: {"task_id": "abc123"}
     │
     └─▶ Background thread starts analysis
              │
              ▼
         VisionProcessor.process_pdf()
              │
              ▼
         Results stored in _vision_results_cache
              │
     Frontend polls GET /api/vision-result/{task_id}
              │
              ▼
         Returns when ready: {"status": "completed", "results": [...]}
```

This avoids the Render 30s proxy timeout for large PDFs.

### 7.4 Critical Backend Files

| File | Purpose | Lines |
|---|---|---|
| `web_api.py` | FastAPI server, all endpoints | ~1016 |
| `rag_engine/engine.py` | RAG pipeline (query, ingest, search) | ~500 |
| `vision_processor.py` | PDF async analysis | ~200 |
| `auth.py` | Google OAuth, email whitelist | ~100 |
| `config.py` | Env-based configuration | ~50 |
| `requirements.txt` | Python dependencies | 41 lines |

### 7.5 Embedding & LLM Configuration

```python
# Embedding model (Jina)
EMBEDDING_MODEL = "jina-embeddings-v3"
EMBEDDING_DIM = 1024

# LLM (Groq) - 4 key rotation
GROQ_KEYS = [
    os.getenv("GROQ_API_KEY_1"),
    os.getenv("GROQ_API_KEY_2"),  # optional
    os.getenv("GROQ_API_KEY_3"),  # optional
    os.getenv("GROQ_API_KEY_4"),  # optional
]
LLM_MODEL = "llama-3.3-70b-versatile"

# Reranker (Cohere)
RERANKER_MODEL = "rerank-multilingual-v3.0"

# Vector Store
CHROMA_PERSIST_DIR = "./chroma_db"
CHROMA_COLLECTION = "mes_documents"
```

---

## 8. Frontend Architecture

### 8.1 Routing

```tsx
// App.tsx
<Routes>
  <Route path="/" element={<SplashScreen />} />
  <Route path="/home" element={<HomePage />} />
  <Route path="/video" element={<VideoPage />} />
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/monitor" element={<MonitorPage />} />
  <Route path="/yield" element={<YieldAnalysisPage />} />
  <Route path="/guide" element={<GuidePage />} />
</Routes>
```

- Splash (`/`) → ENTER click → navigates to `/home`
- All pages are lazy-loaded via `React.lazy()` for code splitting
- Navbar highlights active route via `useLocation()`

### 8.2 Splash Flow

```
User lands on /
     │
     ▼
SplashScreen shows full-screen Zero.mp4 (unmuted)
     │
     ▼
User clicks ENTER button
     │
     ▼
navigate('/home') → voice intro plays (if voice ON)
```

**Why ENTER button**: Chrome blocks autoplay of unmuted video. User gesture (click) is required.

### 8.3 Code Splitting (Vite 8)

```typescript
// vite.config.ts - CORRECT for Vite 8 (Rolldown)
build: {
  advancedChunks: {        // NOT manualChunks (deprecated in Vite 8)
    groups: [
      { name: 'vendor-react', test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/ },
      { name: 'vendor-charts', test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/ },
      { name: 'vendor-framer', test: /[\\/]node_modules[\\/](framer-motion)[\\/]/ },
      { name: 'vendor-i18n', test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/ },
      { name: 'vendor-router', test: /[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/ },
      { name: 'vendor-supabase', test: /[\\/]node_modules[\\/](@supabase)[\\/]/ },
      { name: 'vendor-icons', test: /[\\/]node_modules[\\/](lucide-react)[\\/]/ },
    ]
  }
}
```

### 8.4 Theme

- Dark theme ONLY (factory environment)
- `ThemeProvider` wraps entire app, adds `dark` class to `<html>`
- Tailwind `darkMode: 'class'` enables dark utilities
- No light mode toggle

### 8.5 STAR Modal Layout

When user clicks an architecture video, a modal opens with STAR principle content:

```
┌──────────────────────────────────────────────────┐
│ [Module Icon] [Module Title]                  [X] │
├──────────────────────────┬───────────────────────┤
│                          │ SITUATION              │
│                          │ (blue background)      │
│    Video (48vw)          │ Task                   │
│    unmuted on click      │ (green background)     │
│                          │ Action                 │
│                          │ (gold background)      │
│                          │ Result                 │
│                          │ (orange background)    │
│                          ├───────────────────────┤
│                          │ RESULT METRICS         │
│                          │ [=====] 85%            │
│                          │ [===   ] 60%           │
│                          ├───────────────────────┤
│                          │ ROI METRICS            │
│                          │ [======] 92%           │
│                          │ [====  ] 70%           │
├──────────────────────────┴───────────────────────┤
│ SIMULATOR METRICS    │    COVERAGE    │  OVERALL  │
│ [bar chart]          │ [bar chart]   │ [bar]     │
└──────────────────────────────────────────────────┘
```

### 8.6 Reusable Components

| Component | File | Purpose |
|---|---|---|
| `MetricBars` | `components/common/MetricBars.tsx` | Animated progress bars for STAR sections |
| `ChartContainer` | `components/common/ChartContainer.tsx` | Chart wrapper with CSV export |
| `KpiCard` | `components/shared/KpiCard.tsx` | Reusable KPI display card |

---

## 9. Internationalization (i18n)

### 9.1 Supported Languages

| Language | File | Status |
|---|---|---|
| English | `en.json` | ✅ Complete (canonical) |
| Traditional Chinese | `zh-TW.json` | ✅ Complete |
| Japanese | `ja.json` | ✅ Complete |
| Vietnamese | `vi.json` | ✅ Complete (uses `pickLang()` helper) |

### 9.2 Usage Pattern

```tsx
import { useT } from '../i18n';

function MyComponent() {
  const { t } = useT();
  return <h1>{t('nav.video')}</h1>;  // "Process Showcase" or translated
}
```

### 9.3 Vietnamese `pickLang` Pattern

Vietnamese translations sometimes fall back to English when not available:

```tsx
import { Trans } from 'react-i18next';
import { pickLang } from '../i18n';

<Trans i18nKey="some.key">
  {{ text: pickLang(i18n.language, { en: 'English text', vi: 'Vietnamese text' }) }}
</Trans>
```

### 9.4 Adding a New Language

1. Create `src/i18n/{lang}.json` (copy `en.json` as template)
2. Translate all keys
3. Add language option to `Navbar.tsx` language selector
4. Register in `i18n/index.tsx` i18next configuration
5. Test all pages for missing keys (falls back to English)

---

## 10. Deployment Scripts

### 10.1 Script Overview

```
start.bat                          # Entry point (English, ~160 lines)
  │
  ├─ Step 1/2: scripts/verify.ps1 # Pre-flight check (~300 lines)
  │    ├─ System Tools (Node.js, Python, Git, npm, pip)
  │    ├─ Environment Files (.env vars)
  │    ├─ Port Availability (5173, 9766)
  │    ├─ Internet Connectivity (npm, PyPI, Netlify, Render)
  │    └─ Project Structure (9 required files + chroma_db)
  │
  └─ Step 2/2: scripts/deploy.ps1 # Deploy engine (~857 lines)
       ├─ Phase 0: Prerequisites & Clean
       ├─ Phase 2: Install Dependencies
       ├─ Phase 3: Build Frontend
       ├─ Phase 4: Automated Tests
       ├─ Phase 5: Docker Deploy OR Render Deploy
       ├─ Phase 6: Start Local Backend
       ├─ Phase 7: Deploy to Netlify
       ├─ Phase 8: Start Frontend Dev Server
       └─ Phase 9: Generate Report + Copy to Test Dir

stop.bat                           # Stop + factory reset (~165 lines)
  ├─ Stop background services (stop-services.ps1)
  ├─ Deactivate Python venv
  └─ --clean-all: Full factory reset (7 artifact types)
```

### 10.2 `start.bat` Flags

| Flag | Effect | Maps To |
|---|---|---|
| `--docker` | Deploy via Docker containers | `-UseDocker` |
| `--deploy-netlify` | Deploy frontend to Netlify | `-DeployNetlify` |
| `--deploy-render` | Deploy backend to Render | `-DeployRender` |
| `--skip-tests` | Skip automated testing | `-SkipTests` |
| `--skip-services` | Don't start Vite/FastAPI | `-SkipServices` |
| `--clean-only` | Remove all artifacts only | `-CleanOnly` |
| `--quick` | Skip dependency install | `-NoToolCheck` |
| `--help` | Show help message | N/A |

### 10.3 `verify.ps1` Checks

**5 sections, 30+ items:**

| Section | What It Checks | Fail Impact |
|---|---|---|
| System Tools | Node.js ≥18, npm, Python ≥3.9, pip, Git | Blocking |
| Environment Files | Required vars (4), optional vars (6) | Required = blocking |
| Port Availability | 5173, 9766 in use? | Warning only |
| Internet Connectivity | npm, PyPI, Netlify, Render, Supabase | Warning only |
| Project Structure | 9 required files + chroma_db | Blocking |

**Exit codes**: 0 = pass, 1 = blocking failure, 2 = warnings only

### 10.4 `deploy.ps1` Phases

| Phase | Name | What It Does |
|---|---|---|
| 0 | Prerequisites & Clean | winget install Node/Python/Git, clean dist/logs/reports/\_\_pycache\_\_ |
| 1 | (merged into 0) | — |
| 2 | Install Dependencies | `npm ci` (fallback: `npm install`), Python venv + `pip install -r requirements.txt` |
| 3 | Build Frontend | `npm run build` (TypeScript + Vite) |
| 4 | Automated Tests | 60-question RAG test, unit tests, API smoke tests (standalone script) |
| 5 | Docker/Render | `Deploy-Docker` OR `Deploy-ToRender` based on flags |
| 6 | Start Backend | Launch `web_api.py`, health check polling (600s timeout) |
| 7 | Deploy Netlify | Run `deploy-netlify.mjs`, verify deployment |
| 8 | Start Frontend | Launch `npm run dev` as background job |
| 9 | Report + Copy | Generate HTML report, copy all to `E:\test_<project>` |

### 10.5 `deploy.ps1` Docker Mode (`-UseDocker`)

```powershell
# When --docker flag is passed:
1. Check Docker installed (auto-install via winget if missing)
2. Verify docker-compose.yml + Dockerfile exist
3. Create python_rag/.env from .env.example if missing
4. Ensure frontend is built (npm run build)
5. docker compose down (stop existing)
6. docker compose build (5-10 min first time)
7. docker compose up -d
8. Health check: poll http://localhost:9766/health for 120s
9. On failure: dump docker compose logs backend
```

### 10.6 `stop.bat` Factory Reset (`--clean-all`)

Removes:
- `run/app/dist/` (frontend build)
- `run/app/node_modules/` (npm packages)
- `python_rag/.venv/` (Python virtual environment)
- `python_rag/chroma_db/` (vector store)
- `python_rag/logs/` (audit logs)
- `python_rag/reports/` (test reports)
- `scripts/reports/` (deployment reports)
- All `__pycache__/` directories recursively

Does NOT remove: `.env`, `data/`, source code, committed `chroma_db/` files.

### 10.7 Test Output Directory

```
E:\test_smart-mes-platform\          # or Desktop fallback
├── deploy_YYYYMMDD_HHmmss.log      # Full deployment log
├── deploy_report.html               # Styled HTML report
├── deploy_report_YYYYMMDD_HHmmss.html
├── test_60_questions_output.txt     # RAG 60-question test output
├── test_rag_output.txt              # RAG unit test output
├── test_api_smoke_output.txt        # API smoke test output
├── netlify_deploy_output.txt        # Netlify deploy output
├── render_api_output.txt            # Render API output
├── dist_info.txt                    # Frontend build info
├── environment.txt                  # Environment snapshot
└── rag_reports/                     # RAG test HTML reports
```

---

## 11. Docker Deployment

### 11.1 Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Dependencies
FROM python:3.11-slim AS deps
WORKDIR /app/python_rag
RUN apt-get install build-essential libffi-dev curl
COPY python_rag/requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=deps /usr/local/lib/python3.11/site-packages ...
COPY python_rag/ ./python_rag/
EXPOSE 9766
HEALTHCHECK curl -f http://localhost:9766/health
CMD ["python", "web_api.py"]
```

**Why multi-stage**: Keeps final image small (no build tools). Only runtime dependencies in final image.

### 11.2 docker-compose.yml

```yaml
services:
  backend:
    build: .                          # From Dockerfile
    ports: ["9766:9766"]
    env_file: python_rag/.env
    volumes:
      - chroma_data:/app/python_rag/chroma_db   # Persist vectors
      - ./python_rag/data:/app/python_rag/data:ro  # Mount documents
    healthcheck: curl -f http://localhost:9766/health

  frontend:
    image: nginx:alpine
    ports: ["5173:80"]
    volumes:
      - ./run/app/dist:/usr/share/nginx/html:ro
      - ./scripts/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: backend (healthy)

volumes:
  chroma_data:
```

### 11.3 nginx.conf

- SPA routing: `try_files $uri $uri/ /index.html`
- API proxy: `/api/*` → `http://backend:9766`
- Gzip compression enabled
- Static asset caching (30 days)

### 11.4 .dockerignore

Excludes: `node_modules/`, `run/app/node_modules/`, `run/app/dist/`, `python_rag/.venv/`, `__pycache__/`, `.git/`, `.env`, `*.log`, `*.pyc`

---

## 12. Development Journey (All Phases)

### Phase 1: Static SPA Scaffold

```
npm create vite → tailwind init → react-router setup → 7 basic pages
```

- Created project with Vite + React + TypeScript
- Installed Tailwind CSS, set up dark mode
- Created basic page components (Splash, Home, Video, Dashboard, Monitor, Yield, Guide)
- Set up react-router-dom for SPA routing

### Phase 2: Splash Screen + Video System

```
Zero.mp4 full-screen → ENTER button → voice intro → video chapters
```

- Built full-screen splash with auto-playing video
- Added ENTER button (required for Chrome autoplay policy)
- Created VideoPage with 9 chapter navigation (V0-V8)
- Implemented spacebar navigation between chapters

### Phase 3: Navigation + i18n

```
Navbar (6 links) → language selector (4 langs) → voice toggle
```

- Built Navbar with 6 page links, language dropdown, voice toggle
- Created i18n system with React Context + JSON files
- Added 4 language files (en, zh-TW, ja, vi)
- Implemented voice intro system (Web Speech API)

### Phase 4: Dashboard + Data Visualization

```
SkillHeatMap (23h × 60d) → StationGrid → AlertPanel → EventLog → KPI cards
```

- Built SkillHeatMap with color-coded grid (d3-scale for colors)
- Created StationGrid with 20 station cards
- Added AlertPanel with critical/warning/info grouping
- Implemented EventLog with scrolling feed
- Built KPI cards with animated counters

### Phase 5: Yield Analysis + Charts

```
4 KPIs → 6 chart types → Recharts integration
```

- Created YieldAnalysisPage with 4 KPI cards
- Built 6 chart components using Recharts
- Added mock data for yield trends, defect distributions, torque readings

### Phase 6: Guide + Module Explainers

```
Pillar cards → module explainers (problem/solution/benefits)
```

- Built GuidePage with pillar cards
- Added ModuleExplainer components with STAR-like content

### Phase 7: Architecture Diagram + Videos

```
6 auto-play videos → click-to-enlarge modal → STAR principle content
```

- Created ArchDiagram with 6 auto-playing architecture demo videos
- Built modal with video playback and module information
- Added STAR principle content (Situation, Task, Action, Result)

### Phase 8: Voice System

```
Web Speech API → language-aware → cancel on OFF toggle
```

- Implemented voice intro system using Web Speech API
- Made voice language-aware (matches selected language)
- Added cancel on voice OFF toggle

### Phase 9: Docker + Backend (Flask)

```
docker-compose → nginx reverse proxy → Flask APIs (data + notify)
```

- Created Docker setup with 3 containers (nginx, Flask data API, Flask notify API)
- Set up nginx reverse proxy for API routes
- Built Flask APIs for yield data, defects, downtime, events

### Phase 10: Deployment Scripts

```
deploy.py → start.bat → stop.bat → one-click deployment
```

- Created Python deployment orchestrator
- Built Windows batch files for one-click deployment
- Added error handling and health checks

### Phase 11: STAR Integration + Module Cleanup

```
starContent.ts → videoToModule mapping → removed /modules route
```

- Created STAR content data structure
- Added videoToModule mapping for modal content
- Removed redundant /modules page (content overlapped with ArchDiagram)

### Phase 12: RAG Backend (Major Rewrite)

```
Flask → FastAPI → ChromaDB → Groq LLM → Jina embeddings → Cohere reranker
```

- Replaced Flask entirely with FastAPI
- Built RAG pipeline: documents → chunks → embeddings → vector store → query → LLM
- Added ChromaDB for vector storage (54 vectors committed to git)
- Integrated Groq llama-3.3-70b-versatile for inference
- Added Jina embeddings-v3 for vectorization
- Integrated Cohere reranker for result refinement

### Phase 13: Chatbot + PDF Upload

```
ChatBotFloating → PDF upload → async vision analysis → RAG query
```

- Built floating chatbot component
- Added PDF upload functionality
- Implemented async vision analysis (avoids 30s Render timeout)
- Connected to RAG pipeline for document Q&A

### Phase 14: Auth + Security

```
Supabase → Google OAuth → single email whitelist → audit logging
```

- Integrated Supabase for authentication
- Added Google OAuth with single email whitelist (`itsamliu2025@gmail.com`)
- Implemented audit logging for security events

### Phase 15: Performance Optimization

```
advancedChunks → remove xlsx → remove pg → remove @react-oauth/google → CSV export
```

- Switched from `manualChunks` to `advancedChunks` (Vite 8 compatibility)
- Removed `xlsx` package (1.3MB) → native CSV export
- Removed unused `pg` and `@react-oauth/google` packages
- Created `csvExport.ts` utility with BOM for Excel compatibility

### Phase 16: Enterprise Deployment Scripts

```
verify.ps1 → deploy.ps1 (857 lines) → Docker support → test_api_smoke.py
```

- Created pre-flight environment checker (verify.ps1)
- Built enterprise deployment engine (deploy.ps1) with 10 phases
- Added Docker containerization support
- Created standalone API smoke test script
- Fixed hardcoded paths, added test output persistence
- Final audit: 71/71 checks PASS across requirements (4)-(7)

---

## 13. Pitfalls & Lessons Learned

These are real problems encountered during development. Read before making changes.

### 13.1 Vite 8 Breaking Change: `manualChunks` → `advancedChunks`

**Problem**: Vite 8 uses Rolldown (Rust bundler) which deprecated `manualChunks`. Using it causes build errors or silent failures.

**Solution**: Use `advancedChunks` with `groups` configuration:
```typescript
// WRONG (Vite 5-7)
build: { rollupOptions: { output: { manualChunks: { ... } } } }

// CORRECT (Vite 8+)
build: { advancedChunks: { groups: [ ... ] } }
```

### 13.2 Chrome Autoplay Policy Blocks Unmuted Video

**Problem**: Chrome blocks `autoPlay` on unmuted video without user gesture. Video appears black.

**Solution**: Use conditional mount + user gesture:
```tsx
// WRONG
<video autoPlay muted={false} />

// CORRECT
{show && <video autoPlay muted={false} />}
// "show" set to true after user clicks ENTER button
```

The ENTER button click counts as a user gesture, allowing unmuted playback.

### 13.3 React 18 StrictMode Double-Mount

**Problem**: In development, React 18 StrictMode mounts components twice (cleanup → remount). This causes duplicate API calls, double animations, etc.

**Impact**: Only in `npm run dev`. Production build is fine.

**Solution**: Accept it as dev-only behavior. Don't fight it. Use `useRef` for tracking if needed:
```tsx
const hasPlayed = useRef(false);  // NOT useState (avoids re-render)
useEffect(() => {
  if (hasPlayed.current) return;
  hasPlayed.current = true;
  // ... play video
}, []);
```

### 13.4 Voice API Returns Empty Voices on First Call

**Problem**: `speechSynthesis.getVoices()` returns `[]` on first call. Voices load asynchronously.

**Solution**: Wait for `voiceschanged` event:
```tsx
useEffect(() => {
  const loadVoices = () => setVoices(speechSynthesis.getVoices());
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();  // Also try immediate load
}, []);
```

### 13.5 Logo Flash on Language Switch

**Problem**: When language changes, the `<img>` tag re-renders and flashes.

**Solution**: Use CSS `background-image` instead of `<img>`:
```tsx
// WRONG - flashes on re-render
<img src="/logo.png" />

// CORRECT - CSS background not affected by React re-render
<div style={{ backgroundImage: 'url(/logo.png)' }} />
```

### 13.6 BOM in JSON Breaks Fetch

**Problem**: UTF-8 BOM (Byte Order Mark) at start of JSON file causes `fetch()` to fail silently.

**Solution**: Save all JSON files as UTF-8 without BOM. In VS Code: "Save with Encoding" → "UTF-8".

### 13.7 CJK Text Wraps Mid-Word in JSON

**Problem**: Chinese/Japanese text wraps at wrong positions in JSON strings.

**Solution**: Use `\n` literal inside JSON string:
```json
{
  "title": "第一行\n第二行"
}
```

### 13.8 SPA Routing with nginx

**Problem**: nginx returns 404 for direct URL access (e.g., `/dashboard`) because no file exists at that path.

**Solution**: nginx config must have SPA fallback:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 13.9 DashboardProvider Scope

**Problem**: If `DashboardProvider` wraps the entire app, it conflicts with other pages (unnecessary re-renders, stale state).

**Solution**: Only wrap `DashboardPage`:
```tsx
// WRONG
<DashboardProvider><App /></DashboardProvider>

// CORRECT
<Route path="/dashboard" element={<DashboardProvider><DashboardPage /></DashboardProvider>} />
```

### 13.10 XLSX Dynamic Import

**Problem**: `import * as XLSX from 'xlsx'` loads 1.3MB synchronously, blocking initial render.

**Solution**: Use dynamic import:
```typescript
const XLSX = await import('xlsx');
XLSX.writeFile(data, 'file.csv');
```

Even better: we replaced xlsx entirely with native CSV export (`csvExport.ts`).

### 13.11 Windows Path Backslashes

**Problem**: Python on Windows uses backslashes in paths, which break in strings.

**Solution**: Use raw strings or forward slashes:
```python
# WRONG
path = "python_rag\data\chroma_db"

# CORRECT
path = r"python_rag\data\chroma_db"  # raw string
path = "python_rag/data/chroma_db"   # forward slashes
```

### 13.12 Docker COPY Path Mismatch

**Problem**: `COPY run/app/ /app` fails if Docker build context is different from expected directory.

**Solution**: Always build from project root:
```bash
docker build .  # NOT docker build run/app/
```

And use relative paths in Dockerfile:
```dockerfile
COPY python_rag/ ./python_rag/  # NOT COPY /absolute/path/
```

### 13.13 Render Free Tier OOM on ChromaDB Ingest

**Problem**: `add_documents()` + Jina embeddings simultaneously exceeds 512MB RAM on Render free tier.

**Solution**: Use text search fallback in `engine.py`:
```python
# Instead of ChromaDB ingest (OOMs on Render)
def _search_uploaded_texts(query, top_k=5):
    # Simple text matching as fallback
    results = []
    for doc in uploaded_documents:
        if query.lower() in doc['content'].lower():
            results.append(doc)
    return results[:top_k]
```

### 13.14 Render 30s Proxy Timeout

**Problem**: Render free tier kills requests after 30 seconds. Heavy PDF analysis exceeds this.

**Solution**: Async analysis pattern:
```python
# Return immediately with task ID
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile):
    task_id = str(uuid4())
    _vision_results_cache[task_id] = {"status": "processing"}
    threading.Thread(target=process_pdf, args=(task_id, file)).start()
    return {"task_id": task_id}

# Frontend polls for results
@app.get("/api/vision-result/{task_id}")
async def get_result(task_id: str):
    return _vision_results_cache.get(task_id, {"status": "not_found"})
```

### 13.15 `twMerge` for Dynamic Classes

**Problem**: Tailwind class conflicts when combining conditional styles:
```tsx
className={`base ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}
// Results in: "base bg-blue-500 bg-gray-500" (conflict!)
```

**Solution**: Use `twMerge`:
```tsx
import { twMerge } from 'tailwind-merge';
className={twMerge('base', isActive ? 'bg-blue-500' : 'bg-gray-500')}
// Results in: "base bg-gray-500" (last wins)
```

### 13.16 `hasPlayed` Ref vs State

**Problem**: Using `useState` for auto-play tracking causes unnecessary re-renders.

**Solution**: Use `useRef`:
```tsx
const hasPlayed = useRef(false);

useEffect(() => {
  if (hasPlayed.current) return;
  hasPlayed.current = true;
  videoRef.current?.play();
}, []);
```

### 13.17 Spacebar Exclusion

**Problem**: Spacebar handler interferes with modal content (scrolling, input fields).

**Solution**: Guard with active element check:
```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      // Don't interfere if modal is open or input is focused
      if (modalOpen || e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      // ... navigate
    }
  };
}, [modalOpen]);
```

### 13.18 `object-fit: contain` vs `cover`

**Problem**: Videos with 1.67:1 aspect ratio crop in 1.43:1 container with `object-fit: cover`.

**Solution**: Use `contain`:
```css
video { object-fit: contain; }  /* Shows full video, may have black bars */
```

### 13.19 JSON Files Must Be UTF-8 Without BOM

**Problem**: Some editors save JSON with BOM, which breaks `fetch()` and `JSON.parse()`.

**Solution**: In VS Code, use "Save with Encoding" → "UTF-8" (not "UTF-8 with BOM").

### 13.20 Flask Routes Returning HTML Instead of JSON

**Problem**: Flask `render_template()` returns HTML, but frontend expects JSON from API endpoints.

**Solution**: All API endpoints must return `jsonify()`:
```python
# WRONG
@app.route('/api/data')
def get_data():
    return render_template('data.html')

# CORRECT
@app.route('/api/data')
def get_data():
    return jsonify({"data": [...]})
```

### 13.21 `nested map` Key Warnings

**Problem**: React warns about missing `key` prop in nested `.map()` calls.

**Solution**: Every `.map()` needs a unique `key`:
```tsx
{items.map(item => (
  <div key={item.id}>  {/* NOT key={index} */}
    {item.subItems.map(sub => (
      <span key={sub.id}>{sub.name}</span>  {/* Unique per level */}
    ))}
  </div>
))}
```

### 13.22 SpeechSynthesis.lang Must Match BCP 47

**Problem**: `speechSynthesis.lang = 'zh'` doesn't work for Traditional Chinese.

**Solution**: Use correct BCP 47 tags:
```typescript
'speaking' → 'zh-TW'  (NOT 'zh')
'japanese' → 'ja'
'vietnamese' → 'vi'
'english' → 'en-US'
```

### 13.23 DashboardProvider Scope Conflict

**Problem**: Wrapping entire app with `DashboardProvider` causes unnecessary re-renders on every page.

**Solution**: Only wrap the dashboard page:
```tsx
// In App.tsx
<Route path="/dashboard" element={
  <DashboardProvider>
    <DashboardPage />
  </DashboardProvider>
} />
```

### 13.24 deploy.ps1 Orphaned Code Block

**Problem**: Lines 42-62 had code referencing undefined `$beEnv` variable with mismatched braces. Root `.env` loading was duplicated.

**Solution**: Consolidated into single `foreach` loop:
```powershell
foreach ($envFile in @($rootEnv, $beEnv)) {
    if (-not (Test-Path $envFile)) { continue }
    if (-not $Script:RenderDeployHook) { ... }
    if (-not $Script:RenderApiKey) { ... }
    if (-not $Script:RenderServiceId) { ... }
}
```

---

## 14. Handover Checklist

Everything the next developer needs to know, in order of importance.

### 14.1 Before You Touch Any Code

1. **Read this file** (DEVELOPMENT_GUIDE.md) — you're doing it now
2. **Read FAQ.md** — all Q&A from development conversations
3. **Check `.env.example`** — all config keys and their purpose
4. **Run `start.bat`** — see if the project works as-is
5. **Run `stop.bat --clean-all`** — understand what cleanup does

### 14.2 Critical Files to Understand

| Priority | File | Why |
|---|---|---|
| 🔴 | `python_rag/web_api.py` | Backend entry point, all API endpoints |
| 🔴 | `python_rag/rag_engine/engine.py` | RAG pipeline (query, ingest, search) |
| 🔴 | `run/app/src/components/sections/ArchDiagram.tsx` | Core UI component (6 videos + STAR modal) |
| 🔴 | `scripts/deploy.ps1` | Deployment engine (857 lines) |
| 🟡 | `run/app/src/data/starContent.ts` | STAR data structure for all 6 modules |
| 🟡 | `run/app/src/components/chat/ChatBotFloating.tsx` | PDF upload + async RAG query |
| 🟡 | `python_rag/vision_processor.py` | PDF async analysis |
| 🟡 | `python_rag/auth.py` | Google OAuth, email whitelist |
| 🟢 | `run/app/src/utils/csvExport.ts` | Native CSV export utility |
| 🟢 | `scripts/verify.ps1` | Pre-flight environment check |

### 14.3 Things That Must NOT Change

| Item | Reason |
|---|---|
| `.env` is gitignored | Contains secrets (API keys, tokens) |
| `chroma_db/` committed to git | Pre-built vectors for immediate functionality |
| Single email whitelist in `auth.py` | Security: only `itsamliu2025@gmail.com` can log in |
| `advancedChunks` in vite.config.ts | Vite 8 uses Rolldown, `manualChunks` is deprecated |
| `start.bat` and `stop.bat` in English | Requirement (7): all scripts in English |
| All paths relative (no hardcoded C:\D:\) | Requirement (6): only E:\test_* for test output |

### 14.4 Deployment Commands Quick Reference

```bash
# Local development
start.bat                          # Full deploy (verify + build + test + start)
start.bat --quick                  # Fast re-deploy (skip install)
start.bat --skip-tests             # Skip tests
start.bat --docker                 # Docker mode

# Production deployment
start.bat --deploy-netlify         # Deploy frontend to Netlify
start.bat --deploy-render          # Deploy backend to Render
start.bat --deploy-netlify --deploy-render  # Both

# Stop
stop.bat                           # Stop services
stop.bat --clean-all               # Full factory reset

# Manual Docker
docker compose up -d --build       # Build + start containers
docker compose down                # Stop containers
docker compose logs -f backend     # View backend logs
```

### 14.5 Test Commands

```bash
# RAG tests (requires backend running)
cd python_rag
.venv\Scripts\python.exe test_60_questions.py    # 60-question recall test
.venv\Scripts\python.exe test_rag.py             # Unit tests

# API smoke test (standalone, requires backend running)
python scripts/test_api_smoke.py --base-url http://localhost:9766

# Frontend lint
cd run/app
npm run lint
```

---

## 15. Common Tasks

### 15.1 Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add lazy import in `App.tsx`: `const NewPage = lazy(() => import('./pages/NewPage'))`
3. Add route in `App.tsx`: `<Route path="/new" element={<NewPage />} />`
4. Add link in `Navbar.tsx` `PRIMARY_LINKS` array
5. Add translation keys to all 4 i18n JSON files
6. Test all 4 languages

### 15.2 Adding a New i18n Key

1. Add key to `en.json` (canonical source)
2. Translate to `zh-TW.json`, `ja.json`, `vi.json`
3. Use `t('your.key')` in components
4. For Vietnamese fallback: use `pickLang()` helper

### 15.3 Adding a New Chart

1. Create component in `src/components/yield/`
2. Use Recharts components (LineChart, BarChart, etc.)
3. Wrap in responsive container: `<ResponsiveContainer width="100%" height={300}>`
4. Import mock data from `yieldMockData.ts`
5. Add to `YieldAnalysisPage.tsx`

### 15.4 Adding a New Video Chapter

1. Place MP4 in `public/videos/`
2. Add entry to i18n JSON `video.chapters` array (all 4 languages)
3. For architecture videos: also add to `starContent.ts` `videoToModule` mapping

### 15.5 Adding a New STAR Module

1. Add entry to `starContent.ts` `starEntries` array
2. Add metrics: `resultMetrics`, `roiMetrics`, `coverageMetrics`, `simMetrics`, `overallMetrics`
3. Add mapping in `videoToModule` (video filename → module index)
4. Test modal displays correctly with all 5 metric sections

### 15.6 Modifying the RAG Pipeline

1. **Query logic**: Edit `python_rag/rag_engine/engine.py` `query()` method
2. **Embedding model**: Change `EMBEDDING_MODEL` in `engine.py`
3. **LLM model**: Change `LLM_MODEL` in `engine.py`
4. **Reranker**: Change `RERANKER_MODEL` in `engine.py`
5. **Test changes**: Run `test_60_questions.py` to verify recall quality

### 15.7 Debugging Deployment Issues

1. **Check logs**: `scripts/reports/latest_deploy_report.html`
2. **Check test output**: `E:\test_smart-mes-platform\test_*.txt`
3. **Verify environment**: Run `scripts/verify.ps1` standalone
4. **Check backend health**: `curl http://localhost:9766/health`
5. **Check Docker logs**: `docker compose logs backend`

### 15.8 Updating Dependencies

**Frontend:**
```bash
cd run/app
npm update                           # Update within semver range
npm outdated                         # Check for updates
npm install package@latest           # Update specific package
npm run build                        # Verify build still works
```

**Backend:**
```bash
cd python_rag
.venv\Scripts\pip.exe list --outdated   # Check for updates
.venv\Scripts\pip.exe install --upgrade package  # Update
# Update requirements.txt:
.venv\Scripts\pip.exe freeze > requirements.txt
```

### 15.9 Committing Changes

```bash
git status                           # Check what changed
git diff                             # Review changes
git add file1 file2 file3            # Stage specific files
git commit -m "type: description"    # Commit
git push origin main                 # Push to GitHub
```

**Commit message types**: `feat`, `fix`, `perf`, `docs`, `refactor`, `test`, `chore`

---

*End of DEVELOPMENT_GUIDE.md — Last updated: 2026-07-05*
