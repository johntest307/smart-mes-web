# CV Highlights - Smart MES Platform

## Business Value Summary

This project is a **full-stack SPA demo platform** with **real RAG-powered AI document Q&A** for a **server production line MES** (Manufacturing Execution System). It demonstrates end-to-end production workflow visualization, real-time monitoring, quality analytics, AI-powered document intelligence, and enterprise-grade one-click deployment for global factory operations.

## Key Technical Achievements

### 1. RAG-Powered Document Intelligence

Built a complete Retrieval-Augmented Generation system that answers questions about uploaded factory documents using real LLM inference:

- **ChromaDB** vector store with 54 pre-built document vectors
- **Jina embeddings-v3** for high-quality multilingual vectorization
- **Groq llama-3.3-70b-versatile** for fast inference with 4 API key rotation
- **Cohere reranker** for precision improvement on retrieval results
- **Async vision analysis** for PDF processing (avoids 30s cloud timeout)
- **Text search fallback** when vector database OOMs on free tier

**Impact**: Users can upload factory documents and get instant AI-powered answers with source citations. Demonstrates real enterprise AI capability, not mock data.

### 2. Enterprise-Grade One-Click Deployment

Created a complete deployment automation system (857 lines of PowerShell) that works on any brand-new Windows machine:

- **Pre-flight verification** (`verify.ps1`): 30+ environment checks across 5 categories
- **Auto-install**: Node.js, Python, Git via winget (zero manual setup)
- **Docker support**: `start.bat --docker` builds and runs containerized backend + frontend
- **Multi-target deployment**: Local, Netlify, Render, Docker — all from one script
- **Test automation**: RAG 60-question recall, unit tests, API smoke tests
- **Report generation**: HTML deployment report with pass/fail status
- **Factory reset**: `stop.bat --clean-all` removes all artifacts

**Impact**: New developers can deploy the full stack with a single command on any Windows machine. No configuration, no manual steps.

### 3. Smart Factory Panorama with STAR Integration

Built a scroll-triggered architecture showcase with 6 auto-playing demo videos:

- Each video opens a modal with two-column layout: enlarged video (48vw, unmuted) + STAR principle content
- **Animated metric bars** across 5 sections (Result, ROI, Coverage, Simulator, Overall) per module
- Maps each video to its corresponding MES module via `videoToModule` lookup
- Conditional mount (IntersectionObserver) prevents Chrome autoplay blocking

**Impact**: Enterprise clients can understand each MES module's value proposition in under 30 seconds through video + data visualization.

### 4. Intelligent Video Playback Engine

Designed a 9-chapter demo video system (V0-V8) with smart auto-play logic:

- `hasPlayed` ref tracks first manual interaction, then auto-plays subsequent videos
- Spacebar toggle for play/pause (with modal exclusion guard)
- Voice synthesis reads video titles on play (Web Speech API, 4 languages)
- Cancel-on-OFF: `speechSynthesis.cancel()` immediately stops speech

### 5. Multi-Language i18n Architecture

Implemented 4-language support (English, Traditional Chinese, Japanese, Vietnamese):

- Language-dependent voice synthesis (lang attribute + voice selection)
- Language-independent logo (CSS background-image eliminates re-render flash)
- Vietnamese `pickLang()` helper for English fallback
- All user-facing text in i18n JSON

### 6. Interactive Dashboard with Custom Visualizations

Built a mock MES dashboard with:

- **Skill heatmap**: 23-hour × 60-day technician skill matrix (d3-scale color)
- **KPI cards**: Animated counters with delta indicators
- **Station grid**: 20 production stations with status badges
- **Alert panel**: Grouped by severity (Critical/Warning/Info)
- **6 chart types**: Pareto, pie, yield trend, torque, production progress, station defect rate

### 7. Code Splitting & Performance Optimization

- Vite 8 `advancedChunks` (not deprecated `manualChunks`) — 8 vendor chunks
- Removed `xlsx` (1.3MB) → native CSV export with BOM for Excel compatibility
- Removed unused `pg` and `@react-oauth/google` packages
- Lazy-loaded components via `React.lazy()` for faster initial load

### 8. Containerized Architecture

- **Dockerfile**: Multi-stage build (deps stage + runtime stage) for minimal image size
- **docker-compose.yml**: Backend (FastAPI) + Frontend (nginx) with persistent volumes
- **nginx.conf**: SPA routing + API proxy + gzip compression
- **Health checks**: Automated container health monitoring

## STAR Examples for Interviews

### Example 1: RAG System on Free Tier

**S**: Enterprise clients needed AI-powered document Q&A, but cloud hosting had strict memory limits (512MB) and timeouts (30s).

**T**: Build a RAG system that works within Render free tier constraints while maintaining answer quality.

**A**: Implemented async vision analysis (return immediately, poll for results) to avoid 30s timeout. Added text search fallback when ChromaDB ingest OOMs. Used 4-key rotation on Groq to avoid rate limits. Committed pre-built vectors to git for instant functionality.

**R**: Working RAG system on free tier. Users upload PDFs and get AI answers with source citations. 54 vectors pre-loaded, instant on first deploy.

### Example 2: Enterprise One-Click Deployment

**S**: Previous deployment required manual Docker setup, environment configuration, and was error-prone.

**T**: Create zero-prerequisite deployment that works on any Windows machine.

**A**: Built 857-line PowerShell deployment engine with auto-install (winget), pre-flight checks (30+ items), Docker containerization, and multi-target deployment (local/Netlify/Render). Added factory reset capability.

**R**: `start.bat` deploys entire stack on brand-new machine. 71/71 enterprise requirements PASS. Includes HTML deployment report.

### Example 3: Video Auto-Play Architecture

**S**: Chrome blocks autoplay for unmuted videos. The architecture section needed 6 videos to play on scroll.

**T**: Find a way to auto-play muted videos on scroll without Chrome blocking, while allowing click-to-enlarge with sound.

**A**: Implemented conditional mount via IntersectionObserver — videos only mounted when scrolled into view. Click handler opens modal with unmuted playback and STAR content.

**R**: All 6 videos reliably auto-play on scroll. Modal provides both enlarged video (with sound) and educational STAR content.

### Example 4: Multi-Language Voice System

**S**: Platform needed voice intro support in 4 languages for international factory demos.

**T**: Build a voice system that speaks the correct language, uses natural voices, and can be cancelled instantly.

**A**: Used Web Speech API with language-aware speech synthesis. Added `cancel()` on voice OFF. Voice reads video titles during playback.

**R**: Seamless multi-language voice across 4 languages. Cancel is instant — no lingering speech.

## Project Impact

- **Full-stack RAG platform**: React frontend + FastAPI backend + ChromaDB + Groq LLM + Cohere reranker
- **Enterprise deployment**: One-click scripts with auto-install, test, report (71/71 checks PASS)
- **Docker containerization**: 2-container architecture with health checks and persistent volumes
- **11 documentation files**: Architecture, testing, deployment, user manual, CV highlights, FAQ, development guide
- **100% cloud-local verification**: All files MD5-verified identical between local and deployed

## Technologies Used

**Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS, Recharts, framer-motion, i18next, react-router-dom, lucide-react, twMerge

**Backend**: Python FastAPI, ChromaDB, Groq (llama-3.3-70b-versatile), Jina embeddings-v3, Cohere reranker, PyMuPDF

**Auth**: Supabase, Google OAuth (single email whitelist)

**Deployment**: Netlify, Render, Docker Compose, nginx, PowerShell (857-line deploy engine)

**DevOps**: Git, GitHub Actions (keep-alive), winget (auto-install), HTML report generation

**Tools**: VS Code, PowerShell 5.1, Python 3.11, Node.js 24
