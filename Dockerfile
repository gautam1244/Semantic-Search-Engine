# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy root configurations and frontend package definitions
COPY package.json ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy frontend source files
COPY frontend/ ./

# Build the production bundle
RUN npm run build

# Stage 2: Set up the production runner
FROM node:18-alpine AS runner
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=8000

# Copy backend configurations and dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --only=production

# Copy backend source code and initial data
COPY backend/ ./

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Pre-download and cache the Xenova Transformers model during image build
# This avoids latency and network calls at container startup / first search query
RUN node -e "import('@xenova/transformers').then(({ pipeline }) => pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'))"

EXPOSE 8000

# Start Express server
CMD ["node", "server.js"]
