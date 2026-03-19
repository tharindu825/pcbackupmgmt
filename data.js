/**
 * data.js — Data layer for PC Backup Management System
 * Persists PC records and backup logs in localStorage.
 */

const STORAGE_KEY = 'pcbackup_pcs';
const LOGS_KEY    = 'pcbackup_logs';
const OVERDUE_DAYS = 14;

/** Generate a unique ID */
function generateId() {
  return 'pc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/** Load all PC records from localStorage */
function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist all records to localStorage */
function saveAll(pcs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pcs));
}

/** Add a new PC record */
function addPC(data) {
  const pcs = getAll();
  const pc = {
    id: generateId(),
    name: data.name || 'Unknown PC',
    department: data.department || '',
    ipAddress: data.ipAddress || '',
    owner: data.owner || '',
    lastBackupDate: data.lastBackupDate || null,
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
  };
  pcs.push(pc);
  saveAll(pcs);
  return pc;
}

/** Update an existing PC record by id */
function updatePC(id, data) {
  const pcs = getAll();
  const idx = pcs.findIndex(p => p.id === id);
  if (idx === -1) return null;
  pcs[idx] = { ...pcs[idx], ...data };
  saveAll(pcs);
  return pcs[idx];
}

/** Remove a PC record by id (also removes its logs) */
function removePC(id) {
  const pcs = getAll().filter(p => p.id !== id);
  saveAll(pcs);
  // Remove all logs belonging to this PC
  const logs = getAllLogs().filter(l => l.pcId !== id);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// ─── Backup Log Functions ───────────────────────────────────────────

/** Generate a unique log ID */
function generateLogId() {
  return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/** Get all backup log entries */
function getAllLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Get backup logs for a specific PC, newest first */
function getLogsForPC(pcId) {
  return getAllLogs()
    .filter(l => l.pcId === pcId)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
}

/** Add a backup log entry */
function addBackupLog(pcId, logData) {
  const logs = getAllLogs();
  const entry = {
    id:           generateLogId(),
    pcId,
    date:         logData.date         || new Date().toISOString().split('T')[0],
    backupType:   logData.backupType   || 'Full',
    method:       logData.method       || 'Manual',
    size:         logData.size         || '',
    performedBy:  logData.performedBy  || '',
    notes:        logData.notes        || '',
    recordedAt:   new Date().toISOString(),
  };
  logs.push(entry);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return entry;
}

/** Delete a single log entry by id */
function deleteLog(logId) {
  const logs = getAllLogs().filter(l => l.id !== logId);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

/**
 * Record a backup for a PC:
 * - Updates lastBackupDate on the PC record
 * - Saves a log entry with full details
 */
function recordBackup(id, logData) {
  const date = logData.date || new Date().toISOString().split('T')[0];
  updatePC(id, { lastBackupDate: date });
  return addBackupLog(id, logData);
}

/** Returns number of days since last backup (null if no backup recorded) */
function daysSinceBackup(pc) {
  if (!pc.lastBackupDate) return null;
  const last = new Date(pc.lastBackupDate);
  const now = new Date();
  const diffMs = now - last;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Returns true if PC backup is overdue (> OVERDUE_DAYS days or never backed up) */
function isOverdue(pc) {
  const days = daysSinceBackup(pc);
  if (days === null) return true; // Never backed up = overdue
  return days > OVERDUE_DAYS;
}

/** Seed some demo data if storage is empty */
function seedDemoData() {
  if (getAll().length > 0) return;

  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const demos = [
    { name: 'DESKTOP-ACCOUNTS01', department: 'Accounts', ipAddress: '192.168.1.10', owner: 'Nimal Perera', lastBackupDate: daysAgo(3) },
    { name: 'LAPTOP-HR-MANAGER', department: 'HR', ipAddress: '192.168.1.22', owner: 'Sanduni Fernando', lastBackupDate: daysAgo(10) },
    { name: 'DESKTOP-IT-SUPPORT', department: 'IT', ipAddress: '192.168.1.5', owner: 'Kamal Silva', lastBackupDate: daysAgo(1) },
    { name: 'WORKSTATION-DESIGN', department: 'Marketing', ipAddress: '192.168.1.35', owner: 'Dilani Jayawardena', lastBackupDate: daysAgo(18) },
    { name: 'LAPTOP-CEO', department: 'Management', ipAddress: '192.168.1.2', owner: 'Ruwan Herath', lastBackupDate: daysAgo(25) },
    { name: 'DESKTOP-FINANCE01', department: 'Finance', ipAddress: '192.168.1.15', owner: 'Amali Wickrama', lastBackupDate: null },
    { name: 'SERVER-BACKUP-01', department: 'IT', ipAddress: '192.168.1.100', owner: 'Kamal Silva', lastBackupDate: daysAgo(7) },
    { name: 'LAPTOP-SALES-MGR', department: 'Sales', ipAddress: '192.168.1.45', owner: 'Tharaka Gunawardena', lastBackupDate: daysAgo(20) },
  ];

  const pcs = demos.map(d => addPC(d));

  // Seed demo backup log entries
  const types    = ['Full', 'Full', 'Incremental', 'Differential', 'Full'];
  const methods  = ['Manual', 'Automated', 'Manual', 'Automated'];
  const sizes    = ['12 GB', '45 GB', '8 GB', '120 GB', '3 GB', '22 GB'];
  const people   = ['Kamal Silva', 'Admin', 'IT Team', 'Nimal Perera'];

  pcs.forEach((pc, i) => {
    if (!pc.lastBackupDate) return; // skip never-backed-up PCs
    // 1–3 past entries per PC
    const count = (i % 3) + 1;
    for (let j = 0; j < count; j++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (daysSinceBackup(pc) || 3) - j * 7);
      addBackupLog(pc.id, {
        date:        d.toISOString().split('T')[0],
        backupType:  types[(i + j) % types.length],
        method:      methods[(i + j) % methods.length],
        size:        sizes[(i + j) % sizes.length],
        performedBy: people[(i + j) % people.length],
        notes:       j === 0 ? 'Completed successfully.' : 'Routine backup.',
      });
    }
  });
}

export {
  getAll,
  addPC,
  updatePC,
  removePC,
  recordBackup,
  addBackupLog,
  getLogsForPC,
  getAllLogs,
  deleteLog,
  daysSinceBackup,
  isOverdue,
  seedDemoData,
  OVERDUE_DAYS,
};
