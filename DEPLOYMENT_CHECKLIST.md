# Deployment Checklist - Smart MES Platform

## Pre-Flight Checks

### Automatic (verify.ps1 handles these)

- [ ] Node.js ≥18 installed (auto-install via winget if missing)
- [ ] Python ≥3.9 installed (auto-install via winget if missing)
- [ ] Git installed (auto-install via winget if missing)
- [ ] npm available
- [ ] pip available

### Manual (verify before first deploy)

- [ ] Root `.env` file created from `.env.example`
- [ ] `NETLIFY_AUTH_TOKEN` set in `.env`
- [ ] `NETLIFY_SITE_ID` set in `.env`
- [ ] `SUPABASE_URL` set in `.env`
- [ ] `SUPABASE_ANON_KEY` set in `.env`
- [ ] Optional: `RENDER_API_KEY` + `RENDER_SERVICE_ID` for backend deployment
- [ ] Optional: `GROQ_API_KEY_1` for RAG backend
- [ ] Optional: `COHERE_API_KEY` for reranker
- [ ] Optional: `JINA_API_KEY` for embeddings
- [ ] No other services on ports 5173 or 9766

### Source Files Required

- [ ] `run/app/package.json`
- [ ] `run/app/vite.config.ts`
- [ ] `run/app/src/main.tsx`
- [ ] `python_rag/web_api.py`
- [ ] `python_rag/rag_engine/engine.py`
- [ ] `python_rag/requirements.txt`
- [ ] `scripts/deploy.ps1`
- [ ] `scripts/verify.ps1`
- [ ] `python_rag/chroma_db/` (54 vectors)

## Deployment Methods

### Method 1: Local (default)

```bash
start.bat                    # Full deploy: verify → build → test → start
start.bat --quick            # Fast re-deploy (skip dependency install)
start.bat --skip-tests       # Skip automated tests
```

### Method 2: Docker

```bash
start.bat --docker           # Build + run containerized backend + frontend
docker compose up -d         # Manual Docker deploy
```

### Method 3: Production

```bash
start.bat --deploy-netlify              # Deploy frontend to Netlify
start.bat --deploy-render               # Deploy backend to Render
start.bat --deploy-netlify --deploy-render  # Both
```

## Deployment Pipeline (10 Phases)

```
Phase 0:  Prerequisites & Clean
          - winget install Node.js, Python, Git (if missing)
          - Clean dist/, logs/, reports/, __pycache__/

Phase 2:  Install Dependencies
          - npm ci (fallback: npm install)
          - Python venv + pip install -r requirements.txt

Phase 3:  Build Frontend
          - npm run build (TypeScript + Vite 8)

Phase 4:  Automated Tests
          - Frontend build validation
          - RAG 60-question recall test
          - RAG unit tests
          - API smoke tests (5 endpoints via test_api_smoke.py)

Phase 5:  Docker/Render Deploy (if flagged)
          - Docker: build → up → health check
          - Render: trigger deploy → poll status → health check

Phase 6:  Start Local Backend
          - Launch web_api.py
          - Health check polling (600s timeout)

Phase 7:  Deploy to Netlify (if flagged)
          - Run deploy-netlify.mjs
          - Verify deployment URL

Phase 8:  Start Frontend Dev Server
          - Launch npm run dev as background job

Phase 9:  Report & Copy
          - Generate HTML deployment report
          - Copy all results to E:\test_<project>
```

## Post-Deployment Verification

### Frontend (http://localhost:5173)

- [ ] Splash screen with ENTER button loads
- [ ] Home page: Hero + Smart Factory Panorama
- [ ] Architecture modal: video plays unmuted, STAR content shows
- [ ] Metric bars animate in modal (Result/ROI/Coverage/Simulator/Overall)
- [ ] Process Showcase: 9 chapters, auto-play, spacebar navigation
- [ ] Dashboard: skill heatmap, KPI cards, station grid
- [ ] Monitor: station grid + alerts + event log
- [ ] Yield Analysis: 6 chart types render
- [ ] Guide: pillar cards + module explainers
- [ ] i18n: all 4 languages switch correctly
- [ ] Voice: toggle on/off, cancel on OFF
- [ ] ChatBotFloating: PDF upload button visible
- [ ] Logo renders on all pages
- [ ] Responsive layout (resize browser)

### Backend (http://localhost:9766)

- [ ] `GET /health` returns 200
- [ ] `GET /api/status` returns system info
- [ ] `POST /api/query` returns RAG answer
- [ ] `GET /api/graphrag/status` returns status
- [ ] `GET /api/graphrag/vision/status` returns status

### Docker (if applicable)

- [ ] `docker compose ps` shows both containers running
- [ ] Backend health check passes
- [ ] Frontend accessible at http://localhost:5173
- [ ] API proxy works (frontend → backend)

## Stopping

```bash
stop.bat                     # Stop services only
stop.bat --clean-all         # Full factory reset (removes all artifacts)
```

## Test Environment

Results are saved to `E:\test_<project>` (or Desktop fallback):

```
E:\test_smart-mes-platform\
├── deploy_report.html               # HTML deployment report
├── deploy_YYYYMMDD_HHmmss.log      # Full deployment log
├── test_60_questions_output.txt     # RAG test output
├── test_rag_output.txt              # Unit test output
├── test_api_smoke_output.txt        # API smoke test output
└── rag_reports/                     # RAG test HTML reports
```
