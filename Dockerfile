# --- Stage 1: Build the React Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Runtime Environment ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Copy the frontend build from the builder stage
# (Vite is already configured to build into app/static/react)
COPY --from=frontend-builder /app/app/static/react ./app/static/react

# Expose port for HuggingFace Spaces
EXPOSE 7860

# Set environment variables
ENV FLASK_APP=web.py
ENV FLASK_DEBUG=false
ENV PORT=7860

# Start the application using Gunicorn
CMD gunicorn -w 1 --threads 4 -b 0.0.0.0:$PORT web:app
