// ============================================================
// EAGLEVISION CLOUDBOARD — MODAL COMPONENT
// ============================================================
// Renders a modal overlay + content with:
//   • Auto-injected close button (×)
//   • Backdrop click to close
//   • ESC key to close (topmost modal only)
//   • Body scroll lock (stack-aware)
//   • Focus trap (Tab cycles within the modal)
//   • Smooth enter/exit animations
//   • Auto custom-select conversion
//   • ARIA attributes for screen readers
//
// Usage:
//   const { close, element } = showModal(htmlString, { size: 'lg' });
//   close();
//
//   const ok = await confirmModal({ title: 'Delete?', ... });
//   const name = await promptModal({ title: 'Rename', ... });
// ============================================================

import { initCustomSelects } from './customSelect.js';
import { escapeHtml } from '../utils/dom.js';
import { MODAL_ANIMATION_MS } from '../config/constants.js';


// ============================================================
// MODAL STACK — for scroll lock + ESC handling
// ============================================================
const openModals = new Set();

function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  if (openModals.size === 0) {
    document.body.classList.remove('modal-open');
  }
}


// ============================================================
// FOCUS TRAP — cycle Tab inside the modal
// ============================================================
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled]):not(.modal-close-btn)',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null  // exclude hidden
  );
}

function createFocusTrap(modal) {
  function onKeydown(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusable(modal);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  modal.addEventListener('keydown', onKeydown);
  return () => modal.removeEventListener('keydown', onKeydown);
}


// ============================================================
// SHOW MODAL
// ============================================================
export function showModal(contentHTML, options = {}) {
  const {
    size = 'md',                // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    closeOnBackdrop = true,
    closeOnEsc = true,
    showCloseButton = true,
    onClose = null,
  } = options;

  // ---------- Overlay ----------
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  // ---------- Content ----------
  const modal = document.createElement('div');
  modal.className = `modal-content modal-${size}`;

  // Close button
  if (showCloseButton) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => close());
    modal.appendChild(closeBtn);
  }

  // Inject content — structured or wrapped
  const temp = document.createElement('div');
  temp.innerHTML = contentHTML;

  const hasStructure =
    temp.querySelector('.modal-header') ||
    temp.querySelector('.modal-header-bar') ||
    temp.querySelector('.modal-body') ||
    temp.querySelector('.modal-footer');

  if (hasStructure) {
    while (temp.firstChild) {
      modal.appendChild(temp.firstChild);
    }
  } else {
    const body = document.createElement('div');
    body.className = 'modal-body';
    while (temp.firstChild) {
      body.appendChild(temp.firstChild);
    }
    modal.appendChild(body);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ---------- Register in stack ----------
  openModals.add(overlay);
  lockBodyScroll();

  // ---------- Custom select conversion ----------
  try {
    initCustomSelects(modal);
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[modal] initCustomSelects failed:', err);
    }
  }

  // ---------- Focus management ----------
  const previouslyFocused = document.activeElement;

  // Delay focus so the DOM is settled — but check we're still mounted
  const focusTimer = setTimeout(() => {
    if (!document.body.contains(overlay)) return;

    // Prefer first form field; fall back to the modal itself
    const firstField = modal.querySelector(
      'input:not([type="hidden"]):not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled])'
    );
    if (firstField) {
      firstField.focus();
    } else {
      modal.setAttribute('tabindex', '-1');
      modal.focus();
    }
  }, 50);

  // ---------- Focus trap ----------
  const releaseFocusTrap = createFocusTrap(modal);

  // ---------- Handlers ----------
  function onBackdropClick(e) {
    if (closeOnBackdrop && e.target === overlay) {
      close();
    }
  }

  function onEscKey(e) {
    if (!closeOnEsc) return;
    if (e.key !== 'Escape') return;

    // Only the topmost modal responds to ESC
    const modalsArray = Array.from(openModals);
    const topmost = modalsArray[modalsArray.length - 1];
    if (topmost !== overlay) return;

    e.stopPropagation();
    close();
  }

  overlay.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onEscKey);

  // ---------- Close ----------
  let isClosed = false;
  function close() {
    if (isClosed) return;
    isClosed = true;

    clearTimeout(focusTimer);

    // Remove listeners
    overlay.removeEventListener('click', onBackdropClick);
    document.removeEventListener('keydown', onEscKey);
    releaseFocusTrap();

    // Animate out
    overlay.style.animation = 'modalOverlayOut 0.2s ease forwards';
    modal.style.animation    = 'modalSlideOut 0.2s ease forwards';

    setTimeout(() => {
      overlay.remove();
      openModals.delete(overlay);
      unlockBodyScroll();

      // Restore focus — but only if we're not navigating away
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus({ preventScroll: true }); } catch (_) {}
      }

      if (typeof onClose === 'function') onClose();
    }, MODAL_ANIMATION_MS - 100); // 200ms matches CSS exit
  }

  // ---------- API ----------
  return { close, element: modal, overlay };
}


// ============================================================
// CONFIRM MODAL
// ============================================================
/**
 * Promise-based confirm dialog.
 * Resolves true if confirmed, false if cancelled or dismissed.
 *
 * @example
 *   const ok = await confirmModal({
 *     title: 'Delete Project?',
 *     message: 'This action cannot be undone.',
 *     confirmText: 'Delete',
 *     confirmClass: 'btn-danger',
 *   });
 */
export function confirmModal({
  title        = 'Are you sure?',
  message      = '',
  confirmText  = 'Confirm',
  cancelText   = 'Cancel',
  confirmClass = 'btn-primary',
  icon         = 'fa-exclamation-triangle',
  iconColor    = 'var(--status-warn)',
  size         = 'sm',
} = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    const settle = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const content = `
      <div class="modal-body">
        <div class="confirm-dialog">
          <div class="confirm-icon" style="color:${iconColor};">
            <i class="fas ${icon}"></i>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          <div class="confirm-actions">
            <button type="button" class="btn btn-outline" id="confirm-cancel">
              ${escapeHtml(cancelText)}
            </button>
            <button type="button" class="btn ${confirmClass}" id="confirm-ok">
              ${escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      </div>
    `;

    const { close, element } = showModal(content, {
      size,
      onClose: () => settle(false),  // backdrop / ESC = cancel
    });

    element.querySelector('#confirm-cancel')?.addEventListener('click', () => {
      close();
      settle(false);
    });

    element.querySelector('#confirm-ok')?.addEventListener('click', () => {
      close();
      settle(true);
    });
  });
}


// ============================================================
// PROMPT MODAL
// ============================================================
/**
 * Promise-based input dialog.
 * Resolves the trimmed value, or null if cancelled/dismissed.
 */
export function promptModal({
  title        = 'Enter value',
  message      = '',
  placeholder  = '',
  defaultValue = '',
  confirmText  = 'Save',
  size         = 'sm',
} = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    const settle = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const content = `
      <div class="modal-body">
        <div class="confirm-dialog" style="text-align:left;">
          <h3 style="text-align:center;">${escapeHtml(title)}</h3>
          ${message ? `<p style="text-align:center;">${escapeHtml(message)}</p>` : ''}
          <input
            type="text"
            id="prompt-input"
            class="modal-search"
            placeholder="${escapeHtml(placeholder)}"
            value="${escapeHtml(defaultValue)}"
            style="margin: 1rem 0;"
          />
          <div class="confirm-actions">
            <button type="button" class="btn btn-outline" id="prompt-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="prompt-ok">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;

    const { close, element } = showModal(content, {
      size,
      onClose: () => settle(null),
    });

    const input = element.querySelector('#prompt-input');

    // Auto-focus + select existing text
    setTimeout(() => {
      if (!input) return;
      input.focus();
      input.select?.();
    }, 100);

    const submit = () => {
      const value = input?.value?.trim() || '';
      close();
      settle(value || null);
    };

    element.querySelector('#prompt-cancel')?.addEventListener('click', () => {
      close();
      settle(null);
    });

    element.querySelector('#prompt-ok')?.addEventListener('click', submit);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  });
}


// ============================================================
// CLEANUP (optional)
// ============================================================
/**
 * Close every open modal. Useful on logout or route change.
 */
export function closeAllModals() {
  Array.from(openModals).forEach((overlay) => {
    const closeBtn = overlay.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.click();
  });
}
