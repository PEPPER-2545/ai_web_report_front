# ============================================
# STAGE 1: Builder - Compile TypeScript
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
# NOTE: Path adjusted for self-contained build context
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
# NOTE: Path adjusted for self-contained build context
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# STAGE 2: Runtime - Run compiled app
# ============================================
FROM node:20-alpine

LABEL maintainer="Report Robot Team"
LABEL description="Report Robot Backend API Service"

WORKDIR /app

# Install runtime dependencies
# - ffmpeg: Video processing library (includes ffprobe)
# - curl: For health checks
RUN apk add --no-cache ffmpeg curl

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose API port
EXPOSE 3001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/mroi/iv-cameras/health || exit 1

# Start application
CMD ["node", "dist/main.js"]