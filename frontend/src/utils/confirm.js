// ============================================================
// EAGLEVISION CLOUDBOARD — CONFIRM DIALOG WRAPPER
// ============================================================
// Thin adapter around modal.js confirmModal(), kept for the
// convenient `confirmDialog(message, title, options)` signature.
//
// Delegates everything to confirmModal — no logic duplicated.
//
// Usage:
//   import { confirmDialog } from '../utils/confirm.js';
//
//   const ok = await confirmDialog('Delete this project?', 'Confirm Deletion');
//   if (!ok) return;
//
//   // With custom button text + style:
//   const ok = await confirmDialog(
//     'Archive this project?',
//     'Archive',
//     { confirmText: 'Archive', confirmClass: 'btn-primary' }
//   );
// ============================================================

import { confirmModal } from '../components/modal.js';


/**
 * Show a confirmation dialog.
 *
 * @param {string} message              Body text (escaped by confirmModal)
 * @param {string} [title]              Dialog title (default: 'Are you sure?')
 * @param {object} [options]
 * @param {string} [options.confirmText]  Confirm button label
 * @param {string} [options.cancelText]   Cancel button label
 * @param {string} [options.confirmClass] Button style class (btn-primary, btn-danger, ...)
 * @param {string} [options.icon]         Font Awesome icon class
 * @param {string} [options.iconColor]    Inline color for the icon
 * @param {'sm'|'md'|'lg'} [options.size] Modal size (default: 'sm')
 * @returns {Promise<boolean>}            true if confirmed, false if cancelled/dismissed
 */
export function confirmDialog(message, title = 'Are you sure?', options = {}) {
  return confirmModal({
    title,
    message,
    confirmText:  options.confirmText  || 'Confirm',
    cancelText:   options.cancelText   || 'Cancel',
    confirmClass: options.confirmClass || 'btn-primary',
    icon:         options.icon         || 'fa-exclamation-triangle',
    iconColor:    options.iconColor    || 'var(--status-warn)',
    size:         options.size         || 'sm',
  });
}
