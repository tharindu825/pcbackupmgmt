# PC Backup Management System - Automation Guide

This document serves as a comprehensive guide to understanding the architecture, deployment, and automation mechanics of the **PC Backup Management System**, specifically focusing on how backup statuses are automatically fetched and recorded into the dashboard without manual intervention.

---

## 1. System Architecture

The core philosophy of this system relies on a **Centralized Dashboard (Push Model)**. 

Instead of writing complex code that attempts to securely tunnel into every individual computer and server across the network (which easily breaks due to firewalls and routing), the central Ubuntu Node.js server sits passively. The individual backup environments actively "push" their successes *to* the dashboard via lightweight REST APIs.

### Backend Components
1. **Node.js Web Server:** Hosts the modern glassmorphism frontend (HTML/CSS/JS).
2. **REST API (`/api/auto-log`):** Listens 24/7 for JSON payloads from automation scripts.
3. **Flat-File Database (`data.json`):** All records and logs are instantly committed to a local JSON file.
4. **Docker Containerization:** The entire backend runs inside isolated `docker compose` containers, ensuring it never conflicts with other processes on the Ubuntu host.

---

## 2. Docker Deployment & Preservation

To ensure the system is extremely resilient to server reboots or crashes, it is completely containerized.

### Deployment Command
The system is deployed on the Ubuntu Host (e.g., `192.168.1.8`) by navigating to the project directory and running:
```bash
docker compose up -d --build
```

### 🔁 Database Safety (Auto-Backups)
Your centralized `data.json` database is backed up every single hour by a dedicated Docker sidecar container called `pc-backup-cron`.
- **Where are they saved?** Internal backups go directly to your Ubuntu Server's hard drive inside the `./backups/` folder.
- **Why?** If the primary Docker container is ever destroyed or `data.json` is corrupted, you can easily restore previous states by executing `restore.sh`.

### ⚡ Hot Reloading
The `server.js` backend logic is **bind-mounted** directly to the Ubuntu host in the `docker-compose.yml` file. This means if you ever want to tweak the API code in the future, you do *not* have to rebuild the Docker image! Simply edit `server.js` and restart the container (`docker compose restart pcbackupmgmt`).

---

## 3. Automation Integrations

Two completely distinct scripts were developed to handle the two different backup protocols in the organizational environment. Both scripts are designed to run silently via **Windows Task Scheduler** once a day.

### A. Windows Server Backup (WSB)
*Environment: Windows Server 2016/2019/2022 relying on native Microsoft WSB.*

**The Script:** `WSB_Reporter.ps1`
1. **The Challenge:** Windows Server hides its internal PowerShell backup modules aggressively, even breaking when run by Administrators.
2. **The Solution:** The script executes the lower-level executable `wbadmin.exe` under the hood. It parses the plain text console output to identify the exact completion date and time of the last successful WSB run.
3. **Execution:** It formats this date, sizes the payload, uses `$env:COMPUTERNAME` to identify itself correctly to the dashboard API, and fires off a POST Request.

### B. Client PC Backups (Hasleo)
*Environment: Windows 10/11 computers sending image backups to a centralized Windows Server SMB Share.*

**The Script:** `SMB_Backup_Reporter.ps1`
1. **The Challenge:** Trying to run tracking scripts locally on dozens of individual client computers is extremely difficult to maintain and deploy.
2. **The Solution:** The script is placed directly on the central Windows Server (`192.168.1.116`) that receives all the backups.
3. **Execution:** 
   - It reads a configuration map (`$PCBackupPaths`) that links a PC's Dashboard Name to its specific Local Drive path (e.g., `D:\PCBackups\CTP2403...`).
   - Using Local Drive letters (instead of Network UNC Paths like `\\192...`) guarantees the script will never be blocked by Windows' Loopback Security policies.
   - It iterates through every folder, finds the newest `.pbd` modified file, checks if the timestamp is within 48 hours, and instantly pings the API with a success log for each PC sequentially.

---

## 4. Onboarding New Devices

Whenever you add a new PC or Server to your network:
1. Open the Web Dashboard.
2. Click **Add New PC**.
3. **Critical Step:** Ensure the *Name* you give the PC exactly matches its real `COMPUTERNAME` (if using the WSB script) or exactly matches the key you put in `$PCBackupPaths` (if using the SMB script).
4. As soon as the daily script runs, the dashboard will immediately exit the "High Risk" state and begin displaying the live automated timeline.
