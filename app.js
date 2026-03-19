/**
 * app.js — Main application controller for PC Backup Management System
 */

import {
  getAll, addPC, updatePC, removePC, recordBackup,
  getLogsForPC, deleteLog,
  daysSinceBackup, isOverdue, seedDemoData, OVERDUE_DAYS
} from './data.js';

import {
  initToastContainer, showToast,
  checkAndNotifyOverdue, schedulePeriodicCheck
} from './notifications.js';

// ─── State ─────────────────────────────────────────────────────────────────
let editingId = null;
let searchQuery = '';
let filterStatus = 'all'; // 'all' | 'ok' | 'overdue'

// ─── DOM References ─────────────────────────────────────────────────────────
const pcTableBody    = document.getElementById('pc-table-body');
const modal          = document.getElementById('pc-modal');
const modalTitle     = document.getElementById('modal-title');
const pcForm         = document.getElementById('pc-form');
const searchInput    = document.getElementById('search-input');
const filterSelect   = document.getElementById('filter-status');
const statTotal      = document.getElementById('stat-total');
const statOk         = document.getElementById('stat-ok');
const statOverdue    = document.getElementById('stat-overdue');
const statNever      = document.getElementById('stat-never');
const emptyState     = document.getElementById('empty-state');
const backupModalEl  = document.getElementById('backup-modal');
const logsModalEl    = document.getElementById('logs-modal');
const logsModalTitle = document.getElementById('logs-modal-title');
const logsTableBody  = document.getElementById('logs-table-body');
const logsEmpty      = document.getElementById('logs-empty');
let   backupTargetId = null;
let   logsTargetId   = null;

// ─── Render ─────────────────────────────────────────────────────────────────
function render() {
  let pcs = getAll();

  // Apply search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    pcs = pcs.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.ipAddress.toLowerCase().includes(q) ||
      p.owner.toLowerCase().includes(q)
    );
  }

  // Apply filter
  if (filterStatus === 'ok')      pcs = pcs.filter(p => !isOverdue(p));
  if (filterStatus === 'overdue') pcs = pcs.filter(p =>  isOverdue(p));

  // Update stats (from full list)
  const all = getAll();
  const overdueCount = all.filter(isOverdue).length;
  const neverCount   = all.filter(p => !p.lastBackupDate).length;
  statTotal.textContent   = all.length;
  statOk.textContent      = all.length - overdueCount;
  statOverdue.textContent = overdueCount;
  statNever.textContent   = neverCount;

  // Render rows
  pcTableBody.innerHTML = '';
  emptyState.style.display = pcs.length === 0 ? 'flex' : 'none';

  pcs.forEach((pc, idx) => {
    const overdue = isOverdue(pc);
    const days    = daysSinceBackup(pc);
    const row     = document.createElement('tr');

    row.className = overdue ? 'row-overdue' : 'row-ok';
    row.style.animationDelay = `${idx * 40}ms`;

    const daysLabel   = days === null ? '<span class="never-badge">Never</span>' : `${days}d ago`;
    const statusBadge = overdue
      ? '<span class="badge badge-overdue">⚠ Overdue</span>'
      : '<span class="badge badge-ok">✓ OK</span>';
    const lastBackup  = pc.lastBackupDate
      ? formatDate(pc.lastBackupDate)
      : '<em class="text-muted">Not recorded</em>';

    row.innerHTML = `
      <td class="td-name">
        <div class="pc-icon">${pcIcon(pc.name)}</div>
        <div class="pc-info">
          <span class="pc-name">${escHtml(pc.name)}</span>
          <span class="pc-owner">${escHtml(pc.owner)}</span>
        </div>
      </td>
      <td>${escHtml(pc.department)}</td>
      <td><code class="ip-code">${escHtml(pc.ipAddress)}</code></td>
      <td>${lastBackup}</td>
      <td class="${overdue ? 'days-overdue' : 'days-ok'}">${daysLabel}</td>
      <td>${statusBadge}</td>
      <td class="td-actions">
        <button class="btn btn-backup" onclick="openBackupModal('${pc.id}')" title="Record Backup">
          <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Backup
        </button>
        <button class="btn btn-logs" onclick="openLogsModal('${pc.id}')" title="View Backup Log">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Logs
        </button>
        <button class="btn btn-edit" onclick="openEditModal('${pc.id}')" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-delete" onclick="deletePC('${pc.id}')" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    `;
    pcTableBody.appendChild(row);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pcIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('server'))  return '🖥';
  if (n.includes('laptop'))  return '💻';
  if (n.includes('macbook')) return '💻';
  return '🖥';
}

// ─── Modal: Add / Edit ───────────────────────────────────────────────────────
window.openAddModal = function () {
  editingId = null;
  modalTitle.textContent = 'Add New PC';
  pcForm.reset();
  modal.classList.add('modal-open');
};

window.openEditModal = function (id) {
  const pc = getAll().find(p => p.id === id);
  if (!pc) return;
  editingId = id;
  modalTitle.textContent = 'Edit PC';
  document.getElementById('f-name').value       = pc.name;
  document.getElementById('f-department').value = pc.department;
  document.getElementById('f-ip').value          = pc.ipAddress;
  document.getElementById('f-owner').value       = pc.owner;
  document.getElementById('f-notes').value       = pc.notes;
  modal.classList.add('modal-open');
};

window.closeModal = function () {
  modal.classList.remove('modal-open');
  editingId = null;
};

pcForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    name:       document.getElementById('f-name').value.trim(),
    department: document.getElementById('f-department').value.trim(),
    ipAddress:  document.getElementById('f-ip').value.trim(),
    owner:      document.getElementById('f-owner').value.trim(),
    notes:      document.getElementById('f-notes').value.trim(),
  };
  if (!data.name) return;

  if (editingId) {
    updatePC(editingId, data);
    showToast(`✏️ <strong>${data.name}</strong> updated successfully.`, 'info', 3000);
  } else {
    addPC(data);
    showToast(`✅ <strong>${data.name}</strong> added to the system.`, 'success', 3000);
  }

  closeModal();
  render();
});

// Close modal on backdrop click (but NOT when interacting with form elements inside)
modal.addEventListener('click', (e) => {
  if (!e.target.closest('.modal-box')) closeModal();
});

// ─── Modal: Record Backup ────────────────────────────────────────────────────
window.openBackupModal = function (id) {
  backupTargetId = id;
  const pc = getAll().find(p => p.id === id);
  document.getElementById('backup-pc-name').textContent = pc?.name || '';
  document.getElementById('backup-date-picker').value    = new Date().toISOString().split('T')[0];
  document.getElementById('backup-type').value           = 'Full';
  document.getElementById('backup-method').value         = 'Manual';
  document.getElementById('backup-size').value           = '';
  document.getElementById('backup-performed-by').value   = pc?.owner || '';
  document.getElementById('backup-notes').value          = '';
  backupModalEl.classList.add('modal-open');
};

window.closeBackupModal = function () {
  backupModalEl.classList.remove('modal-open');
  backupTargetId = null;
};

window.confirmBackup = function () {
  if (!backupTargetId) return;
  const pc = getAll().find(p => p.id === backupTargetId);
  const logData = {
    date:        document.getElementById('backup-date-picker').value,
    backupType:  document.getElementById('backup-type').value,
    method:      document.getElementById('backup-method').value,
    size:        document.getElementById('backup-size').value.trim(),
    performedBy: document.getElementById('backup-performed-by').value.trim(),
    notes:       document.getElementById('backup-notes').value.trim(),
  };
  recordBackup(backupTargetId, logData);
  showToast(`💾 Backup logged for <strong>${pc?.name}</strong>`, 'success', 4000);
  closeBackupModal();
  render();
};

backupModalEl.addEventListener('click', (e) => {
  if (!e.target.closest('.modal-box')) closeBackupModal();
});

// ─── Modal: View Backup Logs ─────────────────────────────────────────────────
window.openLogsModal = function (id) {
  logsTargetId = id;
  const pc = getAll().find(p => p.id === id);
  logsModalTitle.textContent = `📋 Backup Log — ${pc?.name || ''}`;
  renderLogs();
  logsModalEl.classList.add('modal-open');
};

window.closeLogsModal = function () {
  logsModalEl.classList.remove('modal-open');
  logsTargetId = null;
};

function renderLogs() {
  const logs = getLogsForPC(logsTargetId);
  logsTableBody.innerHTML = '';
  logsEmpty.style.display = logs.length === 0 ? 'flex' : 'none';

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const typeBadge = {
      'Full':          '<span class="log-badge log-badge-full">Full</span>',
      'Incremental':   '<span class="log-badge log-badge-inc">Incremental</span>',
      'Differential':  '<span class="log-badge log-badge-diff">Differential</span>',
    }[log.backupType] || `<span class="log-badge">${escHtml(log.backupType)}</span>`;

    tr.innerHTML = `
      <td>${formatDate(log.date)}</td>
      <td>${typeBadge}</td>
      <td>${escHtml(log.method)}</td>
      <td>${escHtml(log.size) || '<em class="text-muted">—</em>'}</td>
      <td>${escHtml(log.performedBy) || '<em class="text-muted">—</em>'}</td>
      <td class="log-notes">${escHtml(log.notes) || '<em class="text-muted">—</em>'}</td>
      <td>
        <button class="btn btn-delete" onclick="deleteLogEntry('${log.id}')" title="Delete this log entry" style="padding:4px 8px;">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    `;
    logsTableBody.appendChild(tr);
  });
}

window.deleteLogEntry = function (logId) {
  if (!confirm('Delete this log entry?')) return;
  deleteLog(logId);
  renderLogs();
  render(); // refresh last-backup date if needed
  showToast('🗑 Log entry deleted.', 'warning', 2500);
};

logsModalEl.addEventListener('click', (e) => {
  if (!e.target.closest('.modal-box')) closeLogsModal();
});

// ─── Delete ──────────────────────────────────────────────────────────────────
window.deletePC = function (id) {
  const pc = getAll().find(p => p.id === id);
  if (!confirm(`Delete "${pc?.name}"? This cannot be undone.`)) return;
  removePC(id);
  showToast(`🗑 <strong>${pc?.name}</strong> removed.`, 'warning', 3000);
  render();
};

// ─── Search & Filter ─────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  render();
});

filterSelect.addEventListener('change', () => {
  filterStatus = filterSelect.value;
  render();
});

// ─── Export CSV ──────────────────────────────────────────────────────────────
window.exportCSV = function () {
  const pcs = getAll();
  const headers = ['Name', 'Department', 'IP Address', 'Owner', 'Last Backup Date', 'Days Since Backup', 'Status'];
  const rows = pcs.map(pc => {
    const days = daysSinceBackup(pc);
    return [
      pc.name, pc.department, pc.ipAddress, pc.owner,
      pc.lastBackupDate || 'Never',
      days === null ? 'Never' : days,
      isOverdue(pc) ? 'Overdue' : 'OK'
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'pc-backup-report.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📥 CSV report exported!', 'success', 3000);
};

// ─── Refresh button ───────────────────────────────────────────────────────────
window.refreshDashboard = function () {
  render();
  showToast('🔄 Dashboard refreshed.', 'info', 2000);
};

// ─── Boot ────────────────────────────────────────────────────────────────────
function boot() {
  initToastContainer();
  seedDemoData();
  render();
  // Check for overdue PCs and notify
  checkAndNotifyOverdue();
  // Re-check every hour
  schedulePeriodicCheck();

  // Update "last refreshed" time
  const el = document.getElementById('last-refreshed');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

document.addEventListener('DOMContentLoaded', boot);
