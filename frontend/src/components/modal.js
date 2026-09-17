/**
 * Modern Modal Component
 * ─────────────────────
 * Renders a modal overlay + content with:
 *   • Auto-injected close button (×)
 *   • Backdrop click to close
 *   • ESC key to close
 *   • Body scroll lock
 *   • Smooth enter/exit animations
 *   • Automatic custom-select conversion (all <select> → styled dropdowns)
 *   • Cleanup on close
 *
 * Usage:
 *   const { close, element } = showModal(htmlString, options);
 *   // or
 *   const modal = showModal(htmlString, { size: 'lg' });
 *   modal.close();
 */

import { initCustomSelects } from './customSelect.js';

export function showModal(contentHTML, options = {}) {
  // ---------- Options ----------
  const {
    size = 'md',                 // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    closeOnBackdrop = true,      // click outside to close
    closeOnEsc = true,           // ESC key to close
    showCloseButton = true,      // inject the × button
    onClose = null               // callback after close
  } = options;

  // ---------- Create overlay ----------
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // ---------- Create content container ----------
  const modal = document.createElement('div');
  modal.className = `modal-content modal-${size}`;

  // ---------- Inject close button ----------
  if (showCloseButton) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => close());
    modal.appendChild(closeBtn);
  }

  // ---------- Inject content ----------
  // Wrap the content in a scrollable .modal-body if it's not already structured
  const temp = document.createElement('div');
  temp.innerHTML = contentHTML;

  const hasStructure =
    temp.querySelector('.modal-header') ||
    temp.querySelector('.modal-header-bar') ||
    temp.querySelector('.modal-body') ||
    temp.querySelector('.modal-footer');

  if (hasStructure) {
    // Content already has structure — append as-is
    while (temp.firstChild) {
      modal.appendChild(temp.firstChild);
    }
  } else {
    // Wrap raw content in a scrollable body
    const body = document.createElement('div');
    body.className = 'modal-body';
    while (temp.firstChild) {
      body.appendChild(temp.firstChild);
    }
    modal.appendChild(body);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ---------- Auto-convert all <select> inside the modal to custom dropdowns ----------
  try {
    initCustomSelects(modal);
  } catch (err) {
    console.warn('initCustomSelects failed inside modal:', err);
  }

  // ---------- Lock body scroll ----------
  document.body.classList.add('modal-open');

  // ---------- Focus trap ----------
  const previouslyFocused = document.activeElement;
  setTimeout(() => {
    const firstInput = modal.querySelector(
      'input:not([type="hidden"]), select, textarea, button:not(.modal-close-btn)'
    );
    if (firstInput) firstInput.focus();
  }, 50);

  // ---------- Handlers ----------
  function onBackdropClick(e) {
    if (closeOnBackdrop && e.target === overlay) {
      close();
    }
  }

  function onEscKey(e) {
    if (closeOnEsc && e.key === 'Escape') {
      close();
    }
  }

  // ---------- Attach listeners ----------
  overlay.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onEscKey);

  // ---------- Close function ----------
  let isClosed = false;
  function close() {
    if (isClosed) return;
    isClosed = true;

    // Remove listeners
    overlay.removeEventListener('click', onBackdropClick);
    document.removeEventListener('keydown', onEscKey);

    // Animate out
    overlay.style.animation = 'modalOverlayOut 0.2s ease forwards';
    modal.style.animation = 'modalSlideOut 0.2s ease forwards';

    setTimeout(() => {
      overlay.remove();
      document.body.classList.remove('modal-open');

      // Restore focus
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }

      if (typeof onClose === 'function') onClose();
    }, 200);
  }

  // ---------- Return API ----------
  return { close, element: modal, overlay };
}


/**
 * Modern Confirm Dialog
 * ─────────────────────
 * Returns a Promise<boolean> — true if confirmed, false if cancelled.
 *
 * Usage:
 *   const ok = await confirmModal({
 *     title: 'Delete Project?',
 *     message: 'This action cannot be undone.',
 *     confirmText: 'Delete',
 *     confirmClass: 'btn-danger'
 *   });
 */

export function confirmModal({
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClass = 'btn-primary',
  icon = 'fa-exclamation-triangle',
  iconColor = 'var(--status-warn)',
  size = 'sm'
} = {}) {
  return new Promise((resolve) => {
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

    const { close, element } = showModal(content, { size });

    element.querySelector('#confirm-cancel').addEventListener('click', () => {
      close();
      resolve(false);
    });

    element.querySelector('#confirm-ok').addEventListener('click', () => {
      close();
      resolve(true);
    });
  });
}


/**
 * Prompt Modal (input dialog)
 * ───────────────────────────
 * Returns Promise<string|null> — the entered value or null if cancelled.
 */

export function promptModal({
  title = 'Enter value',
  message = '',
  placeholder = '',
  defaultValue = '',
  confirmText = 'Save',
  size = 'sm'
} = {}) {
  return new Promise((resolve) => {
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

    const { close, element } = showModal(content, { size });

    const input = element.querySelector('#prompt-input');
    setTimeout(() => input?.focus(), 100);

    const submit = () => {
      const value = input?.value?.trim() || '';
      close();
      resolve(value || null);
    };

    element.querySelector('#prompt-cancel').addEventListener('click', () => {
      close();
      resolve(null);
    });

    element.querySelector('#prompt-ok').addEventListener('click', submit);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  });
}


// ==================== HELPERS ====================
function escapeHtml(str) {
  return str
    ? String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';
}
