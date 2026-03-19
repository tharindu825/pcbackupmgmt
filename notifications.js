/**
 * notifications.js — Alert & notification logic for PC Backup Management System
 */

import { getAll, isOverdue, daysSinceBackup } from './data.js';

let toastContainer = null;

/** Initialize the toast container once DOM is ready */
function initToastContainer() {
  toastContainer = document.getElementById('toast-container');
}

/** Show an in-app toast notification */
function showToast(message, type = 'warning', duration = 6000) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'danger' ? '🔴' : type === 'warning' ? '⚠️' : '✅';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  toastContainer.appendChild(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => toast.classList.add('toast-show'));

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }
}

/** Request browser notification permission */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Send a browser system notification for an overdue PC */
function sendBrowserNotification(pc) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const days = daysSinceBackup(pc);
  const body = days === null
    ? `${pc.name} (${pc.department}) has NEVER been backed up!`
    : `${pc.name} (${pc.department}) was last backed up ${days} days ago.`;

  new Notification('⚠️ PC Backup Overdue', {
    body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💾</text></svg>',
    tag: pc.id, // Prevents duplicate notifications per PC
  });
}

/** Check all PCs and notify for overdue ones */
async function checkAndNotifyOverdue() {
  const pcs = getAll();
  const overdueList = pcs.filter(isOverdue);

  if (overdueList.length === 0) return;

  // Request browser notification permission once
  const permitted = await requestNotificationPermission();

  // Show a summary toast
  showToast(
    `<strong>${overdueList.length} PC${overdueList.length > 1 ? 's' : ''} require immediate backup!</strong> Check the red alerts below.`,
    'danger',
    0 // persistent until closed
  );

  // Fire individual browser notifications (staggered to avoid spam)
  if (permitted) {
    overdueList.forEach((pc, i) => {
      setTimeout(() => sendBrowserNotification(pc), i * 700);
    });
  }
}

/** Schedule periodic checks (every hour) */
function schedulePeriodicCheck(intervalMs = 60 * 60 * 1000) {
  setInterval(() => {
    checkAndNotifyOverdue();
  }, intervalMs);
}

export {
  initToastContainer,
  showToast,
  checkAndNotifyOverdue,
  schedulePeriodicCheck,
  requestNotificationPermission,
};
