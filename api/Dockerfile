FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
# one process so the in-memory rate limit is shared; threads for concurrency
CMD ["sh", "-c", "gunicorn app:app --workers 1 --threads 8 --bind 0.0.0.0:${PORT:-8080}"]
