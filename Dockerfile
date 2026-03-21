# ─── Runtime Image ────────────────────────────────────────────────────
FROM node:20-alpine

LABEL maintainer="PC Backup Management System"
LABEL description="Tracks PC backup dates and alerts on overdue backups"

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy all application files
COPY package.json server.js backup.sh restore.sh ./
COPY index.html index.css app.js data.js notifications.js ./

# Copy the default data file — used to seed /data/data.json on first run
COPY data.json ./data.json.default

# Create the persistent data directory and set permissions
RUN mkdir -p /data && chown appuser:appgroup /data

# Switch to non-root user
USER appuser

# Environment
ENV PORT=8787
ENV NODE_ENV=production
# server.js will read this env var to find data.json
ENV DATA_FILE=/data/data.json

EXPOSE 8787

# On startup: copy default data if /data/data.json doesn't exist yet, then start the server
CMD sh -c 'if [ ! -f /data/data.json ]; then cp /app/data.json.default /data/data.json; fi && node server.js'
