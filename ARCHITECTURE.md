# System Architecture - Smart MES Platform

## ASCII Component Tree

```
public/
  logo.png                    [CSS background-image, lang-independent]
  videos/0.mp4-8.mp4          [V0-V8 chapter demos]
  arch/1.mp4-6.mp4            [Architecture auto-play demos]

App.tsx
  +-- ThemeProvider (dark theme)
  +-- I18nProvider (4 languages)
  +-- DashboardProvider (global MES state: stations, skills, events)
  +-- SplashScreen (Zero.mp4 full-screen, ENTER button)
  +-- Navbar (logo, 6 primary links, lang selector, voice toggle)
  |     +-- VoiceToggle (Volume2 / VolumeX icons, cancel on OFF)
  +-- <Routes>
        +-- / -> Home
        |     +-- HeroSection (title + desc + KPI counters)
        |     +-- ArchDiagram (6 auto-play MP4, click-to-enlarge modal)
        |           +-- Modal: video left (48vw, unmuted) + STAR right (36vw)
        |           +-- STAR: Situation / Task / Action / Result
        |           +-- MetricBars: Result / ROI / Coverage / Simulator / Overall
        |           +-- Module icon + title from modulesData
        +-- /video -> VideoPage (V0-V8, hasPlayed auto-play, spacebar)
        +-- /dashboard -> DashboardPage (skill heatmap, KPI cards)
        +-- /monitor -> MonitorPage
        |     +-- StationGrid (20 cards)
        |     +-- AlertPanel (critical/warning/info)
        |     +-- EventLog
        +-- /yield -> YieldAnalysisPage
        |     +-- KpiCards (4 metrics)
        |     +-- ProductionProgress + DefectPareto + DefectPie
        |     +-- YieldTrend + TorqueTrend + StationDefectRate
        +-- /guide -> GuidePage (pillar cards, module explainers)
```

## Route Table

| Path | Page | Key Features |
|------|------|-------------|
| `/` | Home | Splash redirect, Hero, Smart Factory Panorama with STAR |
| `/video` | VideoPage | 9 chapters, hasPlayed auto-play, spacebar, dark theater |
| `/dashboard` | DashboardPage | Skill heatmap, 20 stations, KPI cards |
| `/monitor` | MonitorPage | Station grid, alerts, event log |
| `/yield` | YieldAnalysisPage | 4 KPI cards, 6 chart types |
| `/guide` | GuidePage | Pillar cards, module explainers |

## Full System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite 8 + TypeScript + Tailwind)             │   │
│  │                                                          │   │
│  │  7 pages: Splash → Home → Video → Dashboard → Monitor   │   │
│  │           → Yield → Guide                               │   │
│  │                                                          │   │
│  │  Key components:                                         │   │
│  │    ArchDiagram (6 videos + STAR modal + MetricBars)     │   │
│  │    ChatBotFloating (PDF upload → async RAG query)       │   │
│  │    SkillHeatMap, KPI cards, charts, station grid        │   │
│  │                                                          │   │
│  │  Code-split into 8 chunks via advancedChunks           │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│       ┌───────────────┼───────────────┐                         │
│       │               │               │                         │
│  Local Dev       Netlify CDN     Docker nginx                    │
│  :5173           (production)    :80 → proxy                    │
│       │               │               │                         │
└───────┼───────────────┼───────────────┼─────────────────────────┘
        │               │               │
        │               │          ┌────┴────┐
        │               │          │ nginx   │
        │               │          │ /api/*  │
        │               │          └────┬────┘
        │               │               │
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + RAG)                         │
│                                                                  │
│  web_api.py (FastAPI, port 9766)                                │
│    POST /api/query          → RAG pipeline                      │
│    GET  /api/status         → System status                     │
│    POST /api/upload-pdf     → Async vision analysis             │
│    GET  /health             → Health check                      │
│                                                                  │
│  rag_engine/engine.py                                           │
│    Query: question → Jina embeddings → ChromaDB search          │
│           → Cohere rerank → Groq LLM → answer                  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ ChromaDB     │ │ Groq API     │ │ Cohere       │            │
│  │ 54 vectors   │ │ 4-key rotate │ │ reranker     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  vision_processor.py (PDF async)                                │
│  auth.py (Google OAuth, single email)                           │
│  security.py (audit logging)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/query` | POST | RAG pipeline (ask a question) |
| `/api/status` | GET | System status (vector count, model info) |
| `/api/ingest` | POST | Re-ingest documents |
| `/api/history` | GET | Query history |
| `/api/upload-pdf` | POST | Upload PDF + async vision analysis |
| `/api/vision-result/{task_id}` | GET | Poll async vision results |
| `/api/graphrag/status` | GET | GraphRAG status |
| `/api/graphrag/vision/status` | GET | Vision processor status |

## Data Flow

```
User Question
     │
     ▼
Jina embeddings-v3 (vectorize)
     │
     ▼
ChromaDB cosine search (54 vectors)
     │
     ▼
Cohere reranker (top-K refinement)
     │
     ▼
Groq llama-3.3-70b-versatile (generate answer)
     │
     ▼
Answer with Source Citations
```

## Real-Time Data Flow (Supabase)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                                │
│                                                                  │
│  useSupabaseData.ts (6 x setInterval)                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  t0 (3s)  → UPSERT stations (status/output/temp/torque) │    │
│  │  t1 (4s)  → INSERT alerts (7 templates, random)         │    │
│  │  t2 (5s)  → INSERT monitor_events (10 templates)        │    │
│  │  t3 (2.5s)→ INSERT torque_data (4.5 ± 1.5 Nm)          │    │
│  │  t4 (10s) → INSERT kpi_snapshots (FPY/workers/alerts)   │    │
│  │  t5 (5s)  → INSERT defects (weighted causes)            │    │
│  │  + station error → INSERT/UPDATE cost_events            │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ HTTPS (INSERT/UPSERT)                │
└───────────────────────────┼─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SUPABASE (PostgreSQL + Realtime)                  │
│                                                                  │
│  Tables: stations, alerts, monitor_events, defects,              │
│          hourly_yield, kpi_snapshots, torque_data,               │
│          skill_matrix, cost_events, production_progress          │
│                                                                  │
│  Realtime: postgres_changes on all tables                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (postgres_changes)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER (callback)                     │
│                                                                  │
│  useSupabaseData.ts lines 192-281                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  channel.on('postgres_changes', ...)                     │    │
│  │    → setData(prev => ...)  (React state update)          │    │
│  │    → DashboardContext propagates to all pages            │    │
│  │    → MonitorPage / YieldPage / CostPage re-render       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Pages consuming real-time data:                                 │
│    /monitor  → StationGrid, AlertPanel, EventLog                │
│    /yield    → KpiCards, DefectPareto, YieldTrend, TorqueTrend │
│    /cost     → CostEvents, CostSummary, OEETrend               │
│    /dashboard → SkillHeatMap (client-side generated)            │
└─────────────────────────────────────────────────────────────────┘
```

### Important Notes

1. **Data is simulated**: All data originates from `Math.random()` in the browser, NOT from real factory equipment (PLC/SCADA/MQTT).
2. **Browser-dependent**: Data generation stops when the tab is closed or the user navigates away.
3. **No history persistence**: Each session starts with fresh random values; no historical continuity.
4. **Supabase is the persistence layer**: Data survives page refreshes (stored in PostgreSQL), but the generator only runs in the active browser tab.

## Deployment Pipeline (10 phases)

```
Phase 0:  Prerequisites & Clean (winget auto-install, clean artifacts)
Phase 2:  Install Dependencies (npm ci, pip install)
Phase 3:  Build Frontend (npm run build)
Phase 4:  Automated Tests (60-question, unit, API smoke)
Phase 5:  Docker Deploy OR Render Deploy
Phase 6:  Start Local Backend (health check, 600s timeout)
Phase 7:  Deploy to Netlify
Phase 8:  Start Frontend Dev Server
Phase 9:  Generate Report + Copy to test dir
```

## Docker Architecture

```
docker-compose.yml
  ├── backend (smart-mes-backend)
  │   ├── Image: Built from Dockerfile (python:3.11-slim)
  │   ├── Port: 9766
  │   ├── Volume: chroma_data (persist vectors)
  │   └── Healthcheck: curl -f http://localhost:9766/health
  │
  └── frontend (smart-mes-frontend)
      ├── Image: nginx:alpine
      ├── Port: 5173 → 80
      ├── Volume: ./run/app/dist (built SPA)
      └── Config: scripts/nginx.conf (SPA + API proxy)
```
