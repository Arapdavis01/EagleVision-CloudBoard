// ============================================================
// EAGLEVISION CLOUDBOARD — APPROVE LOGIN PAGE
// ============================================================
// Reached by scanning the QR code shown on the desktop login
// page. User enters a 6-digit PIN to approve the login session.
//
// URL: #approve-login?session=<token>
// ============================================================

import { authService }  from '../../services/authService.js';
import { showToast }    from '../../utils/notifications.js';
import { escapeHtml }   from '../../utils/dom.js';
import { registerCleanup } from '../../utils/pageLifecycle.js';


// ============================================================
// PAGE ENTRY
// ============================================================
export async function approveLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // ---------- Extract session token ----------
  const hashParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const sessionToken = hashParams.get('session') || '';

  if (!sessionToken) {
    renderInvalidLink(app);
    return;
  }

  renderApprovalUI(app, sessionToken);
}


// ============================================================
// INVALID LINK
// ============================================================
function renderInvalidLink(app) {
  app.innerHTML = `
    <div class="approve-login-wrapper">
      <div class="approve-login-card">
        <div class="approve-login-header">
          <i class="fas fa-exclamation-circle"></i>
          <h1>Invalid Link</h1>
          <p>No session token was provided. Please scan the QR code again.</p>
        </div>
        <a href="#login" class="btn btn-primary btn-block">
          <i class="fas fa-arrow-left"></i> Go to Login
        </a>
      </div>
    </div>
  `;
}


// ============================================================
// APPROVAL UI
// ============================================================
function renderApprovalUI(app, sessionToken) {
  app.innerHTML = `
    <div class="approve-login-wrapper">
      <div class="approve-login-card">
        <div class="approve-login-header">
          <i class="fas fa-shield-alt"></i>
          <h1>Approve Login?</h1>
          <p>
            A new browser is trying to sign in using a QR code.
            Enter your secret PIN to approve this session.
          </p>
        </div>

        <div class="pin-input-container">
          <input
            type="password"
            id="approve-pin-input"
            class="pin-input"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="••••••"
            autocomplete="one-time-code"
            aria-label="Six-digit PIN"
            required
          />
          <p class="field-hint" style="text-align:center;margin-top:0.5rem;">
            Enter the 6-digit PIN from your security settings
          </p>
        </div>

        <div class="approve-actions">
          <button id="approve-login-btn" class="btn btn-primary btn-block" type="button">
            <i class="fas fa-check"></i> Approve
          </button>
          <button id="deny-login-btn" class="btn btn-outline btn-block" type="button">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  // ---------- DOM refs ----------
  const pinInput = document.getElementById('approve-pin-input');
  const approveBtn = document.getElementById('approve-login-btn');
  const denyBtn = document.getElementById('deny-login-btn');

  // ---------- Timers to clear on unmount ----------
  let closeTimer = null;
  let redirectTimer = null;

  const clearTimers = () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
  };

  // ---------- Submit PIN ----------
  async function submitPin() {
    const pin = pinInput.value.trim();

    if (!/^\d{6}$/.test(pin)) {
      showToast('Please enter a valid 6-digit PIN', 'error');
      pinInput.classList.add('input-shake');
      setTimeout(() => pinInput.classList.remove('input-shake'), 500);
      pinInput.focus();
      return;
    }

    // Disable + show loading
    approveBtn.disabled = true;
    denyBtn.disabled = true;
    pinInput.disabled = true;
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';

    try {
      await authService.approveLoginSession(sessionToken, pin);
      showToast('Login approved successfully', 'success');
      renderSuccess(app);
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');

      // Re-enable and refocus
      approveBtn.disabled = false;
      denyBtn.disabled = false;
      pinInput.disabled = false;
      approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
      pinInput.value = '';
      pinInput.classList.add('input-shake');
      setTimeout(() => pinInput.classList.remove('input-shake'), 500);
      pinInput.focus();
    }
  }

  // ---------- Cancel ----------
  function cancelApproval() {
    showToast('Login denied', 'info');
    // Try to close, fall back to login
    attemptClose();
  }

  // ---------- Try close, fall back to redirect ----------
  function attemptClose() {
    clearTimers();

    try {
      window.close();
    } catch (_) { /* ignore */ }

    // If close was blocked, redirect after a short delay
    redirectTimer = setTimeout(() => {
      // Guard — only redirect if we're still on this page
      if (location.hash.startsWith('#approve-login')) {
        location.hash = '#login';
      }
    }, 800);
  }

  // ---------- Events ----------
  approveBtn.addEventListener('click', submitPin);
  denyBtn.addEventListener('click', cancelApproval);

  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPin();
    }
  });

  // Auto-focus the PIN field
  setTimeout(() => pinInput.focus(), 100);

  // ---------- Cleanup ----------
  registerCleanup(() => {
    clearTimers();
  });
}


// ============================================================
// SUCCESS SCREEN
// ============================================================
function renderSuccess(app) {
  app.innerHTML = `
    <div class="approve-login-wrapper">
      <div class="approve-login-card">
        <div class="approve-login-header">
          <i class="fas fa-check-circle" style="color:var(--primary);"></i>
          <h1>Login Approved</h1>
          <p>
            The other browser will sign in automatically.
            You can close this tab now.
          </p>
        </div>

        <div class="approve-actions">
          <button id="close-tab-btn" class="btn btn-primary btn-block" type="button">
            <i class="fas fa-times"></i> Close This Tab
          </button>
          <a href="#dashboard" class="btn btn-outline btn-block">
            <i class="fas fa-arrow-right"></i> Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  // Attempt to auto-close after a short delay
  let closeTimer = null;
  closeTimer = setTimeout(() => {
    try { window.close(); } catch (_) { /* ignore */ }
  }, 2500);

  const closeBtn = document.getElementById('close-tab-btn');
  closeBtn?.addEventListener('click', () => {
    if (closeTimer) clearTimeout(closeTimer);
    try { window.close(); } catch (_) { /* ignore */ }
    // If close was blocked, redirect to login
    setTimeout(() => {
      if (location.hash.startsWith('#approve-login')) {
        location.hash = '#login';
      }
    }, 500);
  });

  registerCleanup(() => {
    if (closeTimer) clearTimeout(closeTimer);
  });
}
