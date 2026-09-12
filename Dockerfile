FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] \
    openpyxl pandas numpy scikit-learn \
    flask requests python-multipart aiofiles

COPY backend/msforms/server/package.json /tmp/msforms-pkg.json
RUN mkdir -p /app/backend/msforms/server && \
    cp /tmp/msforms-pkg.json /app/backend/msforms/server/package.json && \
    cd /app/backend/msforms/server && npm install --omit=dev

COPY backend/ /app/backend/
COPY unified_backend.py /app/unified_backend.py
COPY dist/ /app/dist/

ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python", "unified_backend.py"]
