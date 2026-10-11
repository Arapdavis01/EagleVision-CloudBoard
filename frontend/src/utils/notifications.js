// ============================================================
// EAGLEVISION CLOUDBOARD — NOTIFICATIONS (TOASTS)
// ============================================================
// Stacking toast system.
//
// Usage:
//   import { showToast } from '../utils/notifications.js';
//
//   showToast('Saved!', 'success');
//   showToast('Something failed', 'error');
//   showToast('Heads up', 'info');
//   showToast('Careful', 'warning');
//
//   // Convenience methods:
//   showToast.success('Saved!');
//   showToast.error('Failed');
//   showToast.info('FYI');
//   showToast.warning('Watch out');
//
//   // Custom duration (ms):
//   showToast('Slow message', 'info', { duration: 6000 });
// ============================================================

import { escapeHtml } from './dom.js';
import { TOAST_DURATION_MS } from '../config/constants.js';


// ============================================================
// CONSTANTS
// ============================================================
const ALLOWED_TYPES = new Set(['success', 'error', 'info', 'warning']);
const MAX_TOASTS    = 5;
const CONTAINER_ID  = 'ev-toast-container';

const ICONS = {
  success: 'fa-check-circle',
  error:   'fa-times-circle',
  info:    'fa-info-circle',
  warning: 'fa-exclamation-triangle',
};


// ============================================================
// CONTAINER (lazy, singleton)
// ============================================================
function getContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (container) return container;

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'toast-container';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(container);
  return container;
}


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Show a toast.
 *
 * @param {string} message           Text to display
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {object} [options]
 * @param {number} [options.duration]  Auto-dismiss time (ms). 0 = no auto-dismiss.
 */
export function showToast(message, type = 'info', options = {}) {
  const { duration = TOAST_DURATION_MS } = options;

  // ---- Validate ----
  const safeType = ALLOWED_TYPES.has(type) ? type : 'info';
  const text = message == null ? '' : String(message);

  // ---- Container ----
  const container = getContainer();

  // ---- Enforce max ----
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) {
    existing[0].remove();
  }

  // ---- Build toast ----
  const toast = document.createElement('div');
  toast.className = `toast toast-${safeType}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', safeType === 'error' ? 'assertive' : 'polite');

  const iconClass = ICONS[safeType] || ICONS.info;

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <span class="toast-message">${escapeHtml(text)}</span>
    <button type="button" class="toast-close" aria-label="Dismiss">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  // ---- Timers ----
  let dismissTimer = null;
  let removeTimer  = null;

  const scheduleDismiss = () => {
    if (duration <= 0) return;
    dismissTimer = setTimeout(dismiss, duration);
  };

  const cancelDismiss = () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  };

  // ---- Dismiss ----
  function dismiss() {
    cancelDismiss();
    toast.classList.add('toast-hidden');
    removeTimer = setTimeout(() => {
      toast.remove();
      // Clean up container if it's now empty
      if (container.children.length === 0) container.remove();
    }, 300);
  }

  // ---- Interactions ----
  toast.querySelector('.toast-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  // Pause on hover
  toast.addEventListener('mouseenter', cancelDismiss);
  toast.addEventListener('mouseleave', scheduleDismiss);

  // Click anywhere to dismiss
  toast.addEventListener('click', () => dismiss());

  // ---- Kick off auto-dismiss ----
  scheduleDismiss();

  // ---- Return control ----
  return { dismiss };
}


// ============================================================
// CONVENIENCE SHORTCUTS
// ============================================================
showToast.success = (message, options) => showToast(message, 'success', options);
showToast.error   = (message, options) => showToast(message, 'error',   options);
showToast.info    = (message, options) => showToast(message, 'info',    options);
showToast.warning = (message, options) => showToast(message, 'warning', options);


// ============================================================
// CLEAR ALL (useful on logout / route change)
// ============================================================
export function clearToasts() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;
  container.querySelectorAll('.toast').forEach((t) => t.remove());
  container.remove();
}
