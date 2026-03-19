# ─── Build Stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS base

LABEL maintainer="PC Backup Management System"
LABEL description="Tracks PC backup dates and alerts on overdue backups"

# Set working directory
WORKDIR /app

# Copy application files
COPY package.json server.js ./
COPY index.html index.css app.js data.js notifications.js ./

# ─── Runtime ──────────────────────────────────────────────────────────
EXPOSE 8787

ENV PORT=8787
ENV NODE_ENV=production

# Start the Node.js static server
CMD ["node", "server.js"]
