# Smart MES Platform

A full-stack demo platform for **server production line MES** (Manufacturing Execution System) with **real RAG-powered AI document Q&A**. Built with React + TypeScript + Vite frontend and FastAPI + ChromaDB + Groq LLM backend.

## Quick Start

```bash
start.bat                    # One-click: verify + build + test + start (local)
start.bat --docker           # One-click: Docker containerized deployment
start.bat --deploy-netlify   # Deploy frontend to Netlify
start.bat --deploy-render    # Deploy backend to Render
stop.bat                     # Stop services
stop.bat --clean-all         # Full factory reset
```

Or manually:
```bash
cd run/app && npm install && npm run dev    # Frontend only at :5173
cd python_rag && python web_api.py          # Backend only at :9766
```

## Architecture

```
Browser :5173          Netlify (production)       Docker nginx :80
    │                       │                          │
    ▼                       ▼                          ▼
React SPA (Vite 8 + TypeScript + Tailwind)
    │
    ├── Local Dev: FastAPI :9766
    ├── Production: Render (smart-mes-rag.onrender.com)
    └── Docker: FastAPI container
            │
            ├── ChromaDB (54 vectors)
            ├── Groq llama-3.3-70b-versatile (4-key rotation)
            ├── Jina embeddings-v3
            └── Cohere reranker
```

## Project Structure

```
start.bat / stop.bat               # One-click deployment (English)
scripts/
  deploy.ps1                       # Enterprise deploy engine (857 lines, 10 phases)
  verify.ps1                       # Pre-flight environment check (30+ items)
  test_api_smoke.py                # Standalone API smoke test (5 endpoints)
  start-services.ps1               # Start Vite + FastAPI as background jobs
  stop-services.ps1                # Kill processes on ports 5173/9766
  nginx.conf                       # Nginx config for Docker frontend
Dockerfile                         # Multi-stage: python:3.11-slim
docker-compose.yml                 # Backend (FastAPI) + Frontend (nginx)

run/app/                           # React frontend
  src/
    pages/                         # 7 pages (Splash, Home, Video, Dashboard, Monitor, Yield, Guide)
    components/sections/           # ArchDiagram (6 videos + STAR modal)
    components/chat/               # ChatBotFloating (PDF upload + async RAG query)
    components/common/             # MetricBars, ChartContainer (reusable)
    data/starContent.ts            # 6 STAR entries + SimMetric interface
    utils/csvExport.ts             # Native CSV export (replaced xlsx)
    i18n/                          # 4 languages (en, zh-TW, ja, vi)

python_rag/                        # FastAPI backend
  web_api.py                       # FastAPI server (1016 lines)
  rag_engine/engine.py             # RAG pipeline (query, ingest, search)
  vision_processor.py              # PDF async analysis
  auth.py                          # Google OAuth (single email whitelist)
  chroma_db/                       # Vector store (54 vectors, committed)
  test_60_questions.py             # 60-question RAG recall test
  test_rag.py                      # RAG unit tests
```

## Features

- **Smart Factory Panorama**: 6 auto-playing architecture demo videos with STAR principle modals (Situation/Task/Action/Result) + animated metric bars
- **RAG Document Q&A**: Upload PDFs → async vision analysis → Groq LLM answers with source citations
- **Process Showcase**: 9 chapter demo videos (V0-V8) with auto-play, spacebar navigation, voice intro
- **Dashboard**: Skill heatmap (23h × 60d), KPI cards, station grid, alerts
- **Yield Analysis**: 4 KPIs + 6 chart types (Pareto, pie, trend, torque, progress, station defect)
- **i18n**: English, Traditional Chinese, Japanese, Vietnamese with voice synthesis
- **Enterprise Deployment**: One-click scripts with pre-flight checks, auto-install, test, report generation
- **Docker Support**: `start.bat --docker` builds and runs backend + frontend containers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, Recharts, framer-motion |
| Backend | Python FastAPI, ChromaDB, Groq LLM, Jina embeddings, Cohere reranker |
| Auth | Supabase + Google OAuth (single email whitelist) |
| Deployment | Netlify (FE), Render (BE), Docker Compose, PowerShell scripts |
| Code Splitting | Vite 8 `advancedChunks` (8 vendor chunks) |

## Documents

| File | Purpose |
|------|---------|
| `README.md` | This file — project overview, quick start |
| `DEVELOPMENT_GUIDE.md` | Full architecture, evolution (4 phases), 24 pitfalls, 16-phase journey, handover checklist |
| `FAQ.md` | All Q&A from development conversations (9 categories) |
| `ARCHITECTURE.md` | ASCII architecture diagrams, route table, data flow |
| `TEST_GUIDE.md` | Test cases, edge cases, regression checklist |
| `USER_MANUAL.md` | End-user feature walkthrough |
| `CV_HIGHLIGHTS.md` | Interview talking points, STAR examples, business value |
| `DEPLOYMENT_CHECKLIST.md` | Pre-flight checks, deployment steps, post-deploy verification |
| `HANDOVER_CHECKLIST.md` | Transfer checklist for next admin/developer |
| `SETTINGS.md` | System settings, env vars, timeouts, change log |
| `RAG_召回效率優化技巧.md` | RAG recall optimization guide (embedding, chunking, testing) |
| `RAG提問清單.md` | 75+ bilingual RAG test questions |

## Environment Variables

All config in root `.env` (gitignored). See `.env.example` for template.

**Required**: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
**Optional**: `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `GROQ_API_KEY_1`, `COHERE_API_KEY`, `JINA_API_KEY`

## License

Internal demo project. Not for production use.
