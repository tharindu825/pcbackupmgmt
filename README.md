# 🖥️ PC Backup Management System

A lightweight web application for tracking backup status of all PCs in your organisation. Get instant visual alerts for overdue backups, log detailed backup records, and generate monthly risk reports — all stored in a simple JSON file.

---

## ✨ Features

- **Dashboard** — View all PCs with backup status, days since last backup, and risk alerts
- **Red Alerts** — Rows turn red automatically when a PC hasn't been backed up in over 14 days
- **Backup Logging** — Record each backup with type, method, size, performer, and notes
- **Log History** — View complete backup history for any specific PC
- **Monthly Reports** — Risk assessment (High/Medium/Low), activity bar chart, and monthly log table
- **CSV Export** — Export the PC list or monthly report as a CSV file
- **Search & Filter** — Search by name, department, IP, or owner; filter by status
- **Persistent Storage** — All data saved in `data.json` on the server (survives browser cache clears)
- **Docker Support** — Ready to deploy on Ubuntu/Linux with Docker

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher

### Run Locally

```bash
# Clone or download the project
cd pcbackupmgmt

# Start the server (no npm install needed — uses built-in Node.js modules)
node server.js
```

Open your browser at: **http://localhost:8787**

> The server defaults to port `8787`. Override it with the `PORT` environment variable:
> ```bash
> PORT=3000 node server.js
> ```

---

## 🐳 Docker Deployment (Ubuntu/Linux)

```bash
# Build and start both the app and the backup cron service
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop (data is safe — stored in named volume + ./backups/ on host)
docker compose down
```

The app will be available on port `8787` of your server.

### 🔄 Auto-Backup

A **backup sidecar container** (`pc-backup-cron`) runs automatically alongside the app:

- Backs up `data.json` **every hour** to `./backups/data_YYYYMMDD_HHMMSS.json` on the host
- The `./backups/` folder is **bind-mounted to your server** — survives even `docker compose down -v`
- Deletes backups **older than 30 days** automatically

### ↩️ Restore from Backup

```bash
# Restore from the most recent backup
docker exec pc-backup-manager sh /app/restore.sh

# Restore from a specific backup file
docker exec pc-backup-manager sh /app/restore.sh data_20260321_120000.json

# List all available backups
ls ./backups/
```

---

## 📁 Project Structure

```
pcbackupmgmt/
├── index.html          # Main dashboard UI and modals
├── index.css           # Dark glassmorphism design system
├── app.js              # Frontend controller (async data flow, modals, charts)
├── data.js             # Data layer — syncs with server via /api/data
├── notifications.js    # Toast alerts and browser notifications
├── server.js           # Node.js static file server + /api/data REST endpoints
├── data.json           # 📦 The "database" — all PCs and backup logs stored here
├── backup.sh           # 🔄 Auto-backup script (runs every hour in Docker)
├── restore.sh          # ↩️  Restore data.json from a backup
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose: app + backup cron sidecar
├── backups/            # 📂 Host-mounted backup folder (auto-created)
└── README.md           # This file
```

---

## 📊 Risk Level Thresholds

| Risk Level  | Days Since Last Backup |
|-------------|------------------------|
| 🟢 Low Risk   | 0 – 7 days             |
| 🟡 Medium Risk | 8 – 14 days            |
| 🔴 High Risk  | 15+ days or Never      |

> PCs with **no backup recorded** are always considered **High Risk** and **Overdue**.

---

## 🔌 API Endpoints

The Node.js server exposes two simple REST endpoints:

| Method | Endpoint    | Description                        |
|--------|-------------|------------------------------------|
| `GET`  | `/api/data` | Returns the full contents of `data.json` |
| `POST` | `/api/data` | Saves the request body JSON to `data.json` |

All other routes serve static files from the project directory.

---

## 🛠️ Usage Guide

### Adding a PC
1. Click **➕ Add PC** in the top right of the dashboard.
2. Fill in the PC name, department, IP address, owner, and any notes.
3. Click **Save PC** — the PC appears in the list immediately.

### Recording a Backup
1. Click the **💾 Backup** button on any PC row.
2. Fill in the backup date, type (Full / Incremental / Differential), method, size, and who performed it.
3. Click **Save Backup Log** — the "Last Backup" and "Days Since" columns update instantly.

### Viewing Backup History
1. Click the **📋 Logs** button on any PC row.
2. A modal shows the full history of all recorded backups for that PC.

### Monthly Report
1. Click the **📊 Reports** button in the header.
2. Select the month to view.
3. See the risk summary, activity chart, and detailed log table.
4. Click **Export CSV** to download the report.

---

## ⚙️ Configuration

| Variable    | Default          | Description                                |
|-------------|------------------|--------------------------------------------|
| `PORT`      | `8787`           | Port the server listens on                 |
| `DATA_FILE` | `./data.json`    | Path to the data file (set by Docker)      |

---

## 📝 License

This project is for internal IT use. Feel free to adapt it to your organisation's needs.
