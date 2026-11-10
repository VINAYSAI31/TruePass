# Lightweight Python 3.11 base image
FROM python:3.11-slim

# Keep Python quiet and unbuffered so logs stream to `docker logs` immediately
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first so this layer is cached across code changes.
# psycopg2-binary ships wheels, so no build toolchain is needed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY src/ ./src/

# Writable directories for CSVs and logs (mount volumes here if you want to
# keep them after the container exits)
RUN mkdir -p /app/output /app/logs \
    && useradd --create-home --shell /usr/sbin/nologin etl \
    && chown -R etl:etl /app
USER etl

# No EXPOSE, no web server: this image runs a one-shot job and exits.
# All configuration arrives at runtime via environment variables.
ENTRYPOINT ["python", "-m", "src.main"]
