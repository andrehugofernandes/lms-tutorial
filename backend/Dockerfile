FROM python:3.12-slim

WORKDIR /app

# Install basic compiler tools if any python package requires compiling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn for production deployment
RUN pip install --no-cache-dir gunicorn

# Copy all backend source code
COPY . .

EXPOSE 5328

ENV FLASK_APP=app.py
ENV FLASK_DEBUG=0
ENV BACKEND_PORT=5328

# Default execution using gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5328", "--workers", "4", "app:app"]
