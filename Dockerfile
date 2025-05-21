# Use a slim multi-arch Python image (works on Apple Silicon & x86)
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY code/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE $PORT


# add this just before CMD
ENV PYTHONPATH="${PYTHONPATH}:/app/code"

CMD ["python", "code/webserver/WebServer.py"]
