# Handover Checklist - Smart MES Platform

## Project Overview

- **Project**: Smart MES Platform (full-stack SPA demo + RAG AI document Q&A)
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS + Recharts
- **Backend**: Python FastAPI + ChromaDB + Groq LLM + Jina embeddings + Cohere reranker
- **Auth**: Supabase + Google OAuth (single email whitelist: `itsamliu2025@gmail.com`)
- **Deployment**: Netlify (FE) + Render (BE) + Docker Compose + PowerShell scripts
- **Documents**: 12 markdown files in project root

## Deliverables

### Source Code
- [x] `run/app/` — React frontend (7 pages, 20+ components)
- [x] `python_rag/` — FastAPI backend (RAG engine, auth, vision, security)
- [x] `python_rag/chroma_db/` — 54 pre-built vectors (committed to git)

### Deployment Scripts
- [x] `start.bat` — One-click deploy entry point (English)
- [x] `stop.bat` — Stop services + factory reset (English)
- [x] `scripts/deploy.ps1` — Enterprise deploy engine (857 lines, 10 phases)
- [x] `scripts/verify.ps1` — Pre-flight environment check (30+ items)
- [x] `scripts/test_api_smoke.py` — Standalone API smoke test (5 endpoints)
- [x] `scripts/start-services.ps1` — Start Vite + FastAPI as background jobs
- [x] `scripts/stop-services.ps1` — Kill processes on ports 5173/9766

### Docker
- [x] `Dockerfile` — Multi-stage build (python:3.11-slim)
- [x] `docker-compose.yml` — Backend (FastAPI) + Frontend (nginx)
- [x] `scripts/nginx.conf` — SPA routing + API proxy
- [x] `.dockerignore` — Build exclusions

### Configuration
- [x] `.env.example` — Environment variable template (committed)
- [x] `.env` — Actual config (gitignored, must be created)
- [x] `run/app/.env.production` — Production VITE_RAG_API URL

### Documentation (12 files)
- [x] `README.md` — Project overview, quick start
- [x] `DEVELOPMENT_GUIDE.md` — Full architecture, evolution, 24 pitfalls, 16-phase journey
- [x] `FAQ.md` — All Q&A from development conversations
- [x] `ARCHITECTURE.md` — ASCII architecture diagrams, route table, API endpoints
- [x] `TEST_GUIDE.md` — Test cases, edge cases, regression checklist
- [x] `USER_MANUAL.md` — End-user feature walkthrough
- [x] `CV_HIGHLIGHTS.md` — Interview talking points, STAR examples, business value
- [x] `DEPLOYMENT_CHECKLIST.md` — Pre-flight, deployment steps, post-deploy verification
- [x] `HANDOVER_CHECKLIST.md` — This file
- [x] `SETTINGS.md` — System settings, env vars, timeouts
- [x] `RAG_召回效率優化技巧.md` — RAG recall optimization guide
- [x] `RAG提問清單.md` — 75+ bilingual RAG test questions

## Key Knowledge

### Architecture
- Frontend is static SPA deployed to Netlify; backend is FastAPI on Render
- RAG pipeline: question → Jina embeddings → ChromaDB search → Cohere rerank → Groq LLM → answer
- ChromaDB has 54 vectors committed to git (pre-built for instant functionality)
- Auth uses Google OAuth with single email whitelist (`itsamliu2025@gmail.com`)

### Deployment
- All scripts use **relative paths** — no hardcoded C:\ or D:\ (except E:\test_* for test output)
- `start.bat` calls `verify.ps1` (pre-flight) then `deploy.ps1` (main engine)
- `deploy.ps1` supports `--docker`, `--deploy-netlify`, `--deploy-render` flags
- `stop.bat --clean-all` removes: dist, node_modules, .venv, chroma_db, logs, reports, __pycache__
- Test results saved to `E:\test_<project>` (or Desktop fallback)

### Configuration
- All config in root `.env` (gitignored). See `.env.example` for template
- Required: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Optional: `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `GROQ_API_KEY_1`, `COHERE_API_KEY`, `JINA_API_KEY`
- Ports: `RAG_PORT=9766`, `FRONTEND_PORT=5173` (configurable)

### Known Limitations
- Render free tier: ~512MB RAM, 30s timeout, 15 min sleep
- ChromaDB ingest OOMs on Render → text search fallback in engine.py
- Heavy PDF analysis exceeds 30s → async vision pattern (return immediately, poll)
- GitHub Actions keep-alive pings every 5 min to prevent Render sleep

## Gotchas

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | Vite 8 `manualChunks` deprecated | Use `advancedChunks` with `groups` |
| 2 | Chrome blocks unmuted autoplay | Conditional mount + user gesture (ENTER click) |
| 3 | React 18 StrictMode double-mount | Accept as dev-only; use `useRef` not `useState` |
| 4 | Voice API returns empty voices | Wait for `voiceschanged` event |
| 5 | Logo flashes on lang switch | CSS `background-image` instead of `<img>` |
| 6 | BOM in JSON breaks fetch | Save JSON as UTF-8 without BOM |
| 7 | SPA routing 404 on refresh | nginx `try_files $uri /index.html` |
| 8 | DashboardProvider scope conflict | Only wrap DashboardPage, not entire app |
| 9 | Windows backslash paths | Use raw strings or forward slashes in Python |
| 10 | Docker COPY path mismatch | Build from project root, use relative paths |
| 11 | Render 30s timeout | Async vision pattern (return task_id, poll) |
| 12 | Render OOM on ingest | Text search fallback in engine.py |
| 13 | deploy.ps1 orphaned code | Consolidated into single foreach loop |
| 14 | start.bat hardcoded E:\ | Replaced with relative paths in output |

## Next Steps for Incoming Developer

1. **Read first**: `DEVELOPMENT_GUIDE.md` (full architecture + pitfalls)
2. **Read second**: `FAQ.md` (all Q&A from development)
3. **Run it**: `start.bat` → verify everything works
4. **Check**: `scripts/verify.ps1` → environment health
5. **Test RAG**: Upload a PDF via ChatBotFloating, ask questions
6. **Review**: `python_rag/rag_engine/engine.py` for RAG pipeline logic
7. **Review**: `scripts/deploy.ps1` for deployment logic

## Quick Reference

```bash
# Local development
start.bat                          # Full deploy
start.bat --quick                  # Fast re-deploy
start.bat --docker                 # Docker mode

# Production
start.bat --deploy-netlify         # Deploy frontend
start.bat --deploy-render          # Deploy backend

# Stop
stop.bat                           # Stop services
stop.bat --clean-all               # Factory reset

# Manual
cd run/app && npm run dev          # Frontend only
cd python_rag && python web_api.py # Backend only
docker compose up -d --build       # Docker only
```
