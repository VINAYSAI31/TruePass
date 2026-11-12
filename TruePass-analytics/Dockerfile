FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

RUN mkdir -p output logs \
    && useradd --create-home appuser \
    && chown -R appuser:appuser /app

USER appuser

ENTRYPOINT ["python", "-m", "src.main"]