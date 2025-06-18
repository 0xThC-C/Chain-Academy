# Dockerfile for Chain Academy Payment Bot
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S botuser && \
    adduser -S botuser -u 1001

# Create log directory
RUN mkdir -p /app/logs && chown -R botuser:botuser /app

# Switch to non-root user
USER botuser

# Health check
HEALTHCHEK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "payment-automation.js"]