# Smart MES Platform - Backend Dockerfile
# Multi-stage build for FastAPI + RAG engine
# All paths relative to project root (docker build context = project root)

# ============ Stage 1: Python dependencies ============
FROM python:3.11-slim AS deps

WORKDIR /app/python_rag

# Install system dependencies for chromadb, PyMuPDF, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (layer cache)
COPY python_rag/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ============ Stage 2: Final image ============
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy backend source
COPY python_rag/ ./python_rag/

# Copy chroma_db if committed (vector store data)
# COPY python_rag/chroma_db/ ./python_rag/chroma_db/  # Optional: include pre-built vectors

# Copy scripts for smoke testing
COPY scripts/test_api_smoke.py ./scripts/

WORKDIR /app/python_rag

# Environment variables (overridable via docker-compose or -e flags)
ENV RAG_PORT=9766
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8

EXPOSE 9766

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:9766/health || exit 1

CMD ["python", "web_api.py"]
