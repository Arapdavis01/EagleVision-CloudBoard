import { showModal } from '../components/modal.js';

/**
 * Show a modern confirmation dialog.
 * @param {string} message - The message to display
 * @param {string} title - Dialog title
 * @param {object} options - Optional config
 * @param {string} options.confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} options.cancelText - Text for cancel button (default: 'Cancel')
 * @param {string} options.confirmClass - CSS class for confirm button (default: 'btn-primary')
 * @param {string} options.icon - FontAwesome icon class for the dialog (default: 'fa-exclamation-triangle')
 * @param {string} options.iconColor - Icon color (default: warning)
 * @returns {Promise<boolean>} resolves true if confirmed
 */
export function confirmDialog(message, title = 'Are you sure?', options = {}) {
  const {
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmClass = 'btn-primary',
    icon = 'fa-exclamation-triangle',
    iconColor = ''
  } = options;

  return new Promise((resolve) => {
    const content = `
      <div class="confirm-dialog">
        <div class="confirm-icon" style="${iconColor ? `color: ${iconColor};` : ''}">
          <i class="fas ${icon}"></i>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline confirm-cancel-btn">${escapeHtml(cancelText)}</button>
          <button class="btn ${confirmClass} confirm-ok-btn">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const { close, element } = showModal(content);

    const handleCancel = () => {
      close();
      resolve(false);
    };

    const handleOk = () => {
      close();
      resolve(true);
    };

    element.querySelector('.confirm-cancel-btn').addEventListener('click', handleCancel);
    element.querySelector('.confirm-ok-btn').addEventListener('click', handleOk);

    // Close on overlay click = cancel
    element.addEventListener('click', (e) => {
      if (e.target === element) handleCancel();
    });
  });
}

function escapeHtml(text) {
  return text ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
