/**
 * data.js — Server-side persistence layer for PC Backup Management System.
 * Syncs with data.json via Node.js API.
 */

// Local cache for immediate frontend use
let dataCache = { pcs: [], logs: [] };

/** Initial load from server */
export async function initData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API unreachable');
    dataCache = await res.json();
  } catch (e) {
    console.error('Failed to load data from server, using empty state.', e);
    dataCache = { pcs: [], logs: [] };
  }
}

/** Sync entire cache back to server */
async function syncToServer() {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataCache)
    });
    if (!res.ok) throw new Error('Sync failed');
  } catch (e) {
    console.error('Persistence error:', e);
  }
}

// ─── PCs ─────────────────────────────────────────────────────────────────────

export function getAll() {
  return dataCache.pcs;
}

export async function addPC(pcData) {
  const newPC = {
    id: Date.now().toString(),
    ...pcData,
    lastBackupDate: pcData.lastBackupDate || null
  };
  dataCache.pcs.push(newPC);
  await syncToServer();
  return newPC;
}

export async function updatePC(id, pcData) {
  const idx = dataCache.pcs.findIndex(p => p.id === id);
  if (idx === -1) return null;
  dataCache.pcs[idx] = { ...dataCache.pcs[idx], ...pcData };
  await syncToServer();
  return dataCache.pcs[idx];
}

export async function removePC(id) {
  dataCache.pcs = dataCache.pcs.filter(p => p.id !== id);
  // Also remove associated logs
  dataCache.logs = dataCache.logs.filter(l => l.pcId !== id);
  await syncToServer();
}

// ─── Backup Logs ──────────────────────────────────────────────────────────────

export function getAllLogs() {
  return dataCache.logs;
}

export function getLogsForPC(pcId) {
  return dataCache.logs.filter(l => l.pcId === pcId);
}

export async function addBackupLog(pcId, logData) {
  const newLog = {
    id: 'log_' + Date.now(),
    pcId,
    ...logData,
    date: logData.date || new Date().toISOString().split('T')[0]
  };
  dataCache.logs.push(newLog);
  await syncToServer();
  return newLog;
}

export async function deleteLog(logId) {
  dataCache.logs = dataCache.logs.filter(l => l.id !== logId);
  await syncToServer();
}

/**
 * Record a backup for a PC:
 * - Updates lastBackupDate on the PC record
 * - Saves a log entry with full details
 */
export async function recordBackup(id, logData) {
  const date = logData.date || new Date().toISOString().split('T')[0];
  await updatePC(id, { lastBackupDate: date });
  return await addBackupLog(id, logData);
}

// ─── Logic ────────────────────────────────────────────────────────────────────

/** Returns number of days since last backup (null if no backup recorded) */
export function daysSinceBackup(pc) {
  if (!pc.lastBackupDate) return null;
  // Parse the stored date as a local calendar date (avoid UTC timezone mismatch)
  const [year, month, day] = pc.lastBackupDate.split('-').map(Number);
  const last = new Date(year, month - 1, day);   // local midnight
  const now  = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight today
  const diffTime = todayLocal - last;
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/** Overdue if > OVERDUE_DAYS or never backed up */
export const OVERDUE_DAYS = 14;
export function isOverdue(pc) {
  if (!pc.lastBackupDate) return true;
  return daysSinceBackup(pc) > OVERDUE_DAYS;
}

// No longer needed: seedDemoData from frontend, now handled by data.json
export async function seedDemoData() {}
