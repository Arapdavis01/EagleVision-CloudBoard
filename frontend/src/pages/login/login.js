// ============================================================
// EAGLEVISION CLOUDBOARD — LOGIN PAGE
// ============================================================
// Two-panel layout:
//   • Left: brand showcase (hidden on mobile)
//   • Right: email/password form + QR login option
//
// Features:
//   • Password visibility toggle
//   • Caps Lock detection
//   • Remember me (email only — token always lives in storage)
//   • QR login flow (desktop) → approve on phone
// ============================================================

import { authService }        from '../../services/authService.js';
import { showModal }          from '../../components/modal.js';
import { escapeHtml, escapeAttr } from '../../utils/dom.js';
import { storage }            from '../../utils/storage.js';
import { registerCleanup }    from '../../utils/pageLifecycle.js';
import {
  ROUTES,
  STORAGE_KEYS,
  APP_COMPANY,
  APP_NAME,
  APP_TAGLINE,
} from '../../config/constants.js';


// ============================================================
// CONSTANTS
// ============================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QR_TIMEOUT_SECONDS = 120;
const QR_POLL_INTERVAL_MS = 2000;


// ============================================================
// PAGE ENTRY
// ============================================================
export async function loginPage() {
  // Defensive: if already logged in, jump to dashboard
  if (authService.isAuthenticated()) {
    location.hash = ROUTES.DASHBOARD;
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = '';

  // ---------- Device detection ----------
  // QR login is only useful on devices with a "camera + another device nearby".
  // Prefer pointer detection over UA sniffing.
  const isMobile = window.matchMedia('(pointer: coarse)').matches;

  // ---------- Remembered email ----------
  let rememberedEmail = '';
  let rememberChecked = false;
  try {
    rememberedEmail = storage.getString(STORAGE_KEYS.REMEMBER_EMAIL, '');
    rememberChecked = storage.getBool(STORAGE_KEYS.REMEMBER_FLAG, false);
  } catch (_) { /* storage blocked — proceed */ }

  const currentYear = new Date().getFullYear();

  // ---------- Render ----------
  app.innerHTML = `
    <div class="login-page">
      <aside class="login-brand-panel">
        <div class="login-brand-glow"></div>
        <div class="login-brand-content">

          <div class="login-brand-logo">
            <img src="assets/images/qoech-q.jpg" alt="${escapeAttr(APP_COMPANY)}" />
            <div class="login-brand-text">
              <span class="login-brand-company">${escapeHtml(APP_COMPANY)}</span>
              <span class="login-brand-product">${escapeHtml(APP_NAME)}</span>
            </div>
          </div>

          <h1 class="login-brand-headline">
            ${escapeHtml(APP_TAGLINE.split('.')[0])}.<br/>
            <span class="login-brand-headline-accent">${escapeHtml(APP_TAGLINE.split('.')[1] || 'Excel')}.</span>
          </h1>

          <p class="login-brand-description">
            Real-time monitoring, maintenance tracking, and operational
            visibility for every system you run.
          </p>

          <ul class="login-brand-features">
            <li><i class="fas fa-check-circle"></i> Live uptime &amp; health monitoring</li>
            <li><i class="fas fa-check-circle"></i> Service records &amp; maintenance logs</li>
            <li><i class="fas fa-check-circle"></i> Instant alerts when systems go silent</li>
            <li><i class="fas fa-check-circle"></i> Complete infrastructure visibility</li>
          </ul>

          <div class="login-brand-footer">
            <span class="login-brand-footer-line"></span>
            <span class="login-brand-footer-text">
              © ${currentYear} <strong>${escapeHtml(APP_COMPANY)}</strong>
            </span>
          </div>

        </div>
      </aside>

      <main class="login-form-panel">
        <div class="login-form-wrapper">

          <div class="login-form-mobile-brand">
            <img src="assets/images/qoech-q.jpg" alt="${escapeAttr(APP_COMPANY)}" />
            <span>${escapeHtml(APP_COMPANY)}</span>
          </div>

          <div class="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form id="login-form" class="login-form" autocomplete="on" novalidate>

            <div class="form-group">
              <label for="email">
                <i class="fas fa-envelope"></i> Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                value="${escapeAttr(rememberedEmail)}"
                autocomplete="username"
                required
                autofocus
              />
            </div>

            <div class="form-group password-group">
              <label for="password">
                <i class="fas fa-lock"></i> Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                id="toggle-password"
                class="toggle-password"
                aria-label="Show password"
                tabindex="-1"
              >
                <i class="fas fa-eye" id="eye-icon"></i>
              </button>
              <span id="caps-warning" class="caps-warning hidden">
                <i class="fas fa-exclamation-triangle"></i> Caps Lock is on
              </span>
            </div>

            <div class="login-form-options">
              <label class="form-check">
                <input
                  type="checkbox"
                  id="rememberMe"
                  class="form-check-input"
                  ${rememberChecked ? 'checked' : ''}
                />
                <span class="form-check-label">Remember me</span>
              </label>
              <a href="#" class="login-link forgot-link" id="forgot-link">Forgot password?</a>
            </div>

            <p id="error" class="error-message" role="alert" aria-live="polite"></p>

            <button type="submit" class="btn btn-primary btn-block login-submit-btn" id="submit-btn">
              <span id="login-spinner" class="spinner hidden"></span>
              <span id="login-text">Sign In</span>
              <i class="fas fa-arrow-right login-submit-arrow"></i>
            </button>

          </form>

          ${!isMobile ? `
            <div class="login-divider">
              <span>or continue with</span>
            </div>

            <button id="qr-login-btn" type="button" class="login-qr-btn">
              <i class="fas fa-qrcode"></i>
              <span>Login with QR Code</span>
            </button>
          ` : ''}

          <div class="login-form-footer">
            <p>Need access? <a href="#" class="login-link" id="contact-link">Contact ${escapeHtml(APP_COMPANY)}</a></p>
          </div>

        </div>
      </main>
    </div>
  `;


  // ============================================================
  // DOM REFS
  // ============================================================
  const form           = document.getElementById('login-form');
  const emailInput     = document.getElementById('email');
  const passwordInput  = document.getElementById('password');
  const toggleBtn      = document.getElementById('toggle-password');
  const eyeIcon        = document.getElementById('eye-icon');
  const capsWarning    = document.getElementById('caps-warning');
  const errorEl        = document.getElementById('error');
  const loginSpinner   = document.getElementById('login-spinner');
  const loginText      = document.getElementById('login-text');
  const submitBtn      = document.getElementById('submit-btn');
  const rememberCheckbox = document.getElementById('rememberMe');


  // ============================================================
  // HELPERS
  // ============================================================
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[login] ${label}:`, err);
    };
  }

  function setLoading(isLoading) {
    loginSpinner.classList.toggle('hidden', !isLoading);
    loginText.textContent = isLoading ? 'Signing in...' : 'Sign In';
    submitBtn.disabled    = isLoading;
    emailInput.disabled   = isLoading;
    passwordInput.disabled = isLoading;
  }

  function shakeInput(input) {
    input.classList.add('input-shake');
    setTimeout(() => input.classList.remove('input-shake'), 500);
  }

  function persistRememberMe(email) {
    if (rememberCheckbox.checked) {
      storage.setString(STORAGE_KEYS.REMEMBER_EMAIL, email);
      storage.setBool(STORAGE_KEYS.REMEMBER_FLAG, true);
    } else {
      storage.remove(STORAGE_KEYS.REMEMBER_EMAIL);
      storage.remove(STORAGE_KEYS.REMEMBER_FLAG);
    }
  }


  // ============================================================
  // PASSWORD VISIBILITY TOGGLE
  // ============================================================
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.className  = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });


  // ============================================================
  // CAPS LOCK DETECTION
  // ============================================================
  passwordInput.addEventListener('keyup', (e) => {
    if (typeof e.getModifierState === 'function') {
      const capsOn = e.getModifierState('CapsLock');
      capsWarning.classList.toggle('hidden', !capsOn);
    }
  });

  passwordInput.addEventListener('blur', () => {
    capsWarning.classList.add('hidden');
  });


  // ============================================================
  // FORM SUBMISSION
  // ============================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please fill in both fields.';
      shakeInput(email ? passwordInput : emailInput);
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      shakeInput(emailInput);
      return;
    }

    setLoading(true);

    try {
      await authService.login(email, password);
      persistRememberMe(email);

      // Redirect to dashboard
      location.hash = ROUTES.DASHBOARD;
    } catch (err) {
      // Special-case rate limiting
      if (err.status === 429) {
        errorEl.textContent = 'Too many attempts. Please wait a moment and try again.';
      } else {
        errorEl.textContent = err.message || 'Login failed. Check your credentials.';
      }

      setLoading(false);
      shakeInput(passwordInput);
      passwordInput.focus();
    }
  });

  // Enter from email moves focus to password
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInput.focus();
    }
  });


  // ============================================================
  // QR LOGIN
  // ============================================================
  let qrModal        = null;
  let pollInterval   = null;
  let timerInterval  = null;

  const clearQrTimers = () => {
    if (pollInterval)  { clearInterval(pollInterval);  pollInterval  = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  };

  const closeQrModal = () => {
    if (qrModal && typeof qrModal.close === 'function') {
      try { qrModal.close(); } catch (_) { /* ignore */ }
    }
    qrModal = null;
  };

  const cleanupQrLogin = () => {
    clearQrTimers();
    closeQrModal();
  };

  async function startQrLogin() {
    try {
      const session = await authService.generateLoginSession();
      const sessionToken = session.session_token;

      const qrData = `${window.location.origin}/#approve-login?session=${encodeURIComponent(sessionToken)}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

      const modalContent = `
        <div class="qr-login-modal">
          <h3><i class="fas fa-qrcode"></i> Scan QR Code</h3>
          <p>Open your phone camera and scan the code to log in automatically.</p>
          <div class="qr-code-wrapper">
            <img src="${escapeAttr(qrImageUrl)}" alt="QR Code Login" />
          </div>
          <p class="qr-timer" id="qr-timer">Expires in 02:00</p>
          <button type="button" id="cancel-qr-btn" class="btn btn-outline btn-sm">
            Cancel
          </button>
        </div>
      `;

      qrModal = showModal(modalContent, {
        onClose: () => {
          // Ensure timers stop even if the user closes via ESC/backdrop
          clearQrTimers();
        },
      });

      qrModal.element.querySelector('#cancel-qr-btn')?.addEventListener('click', cleanupQrLogin);

      // ---------- Countdown timer ----------
      let secondsLeft = QR_TIMEOUT_SECONDS;
      const timerEl = document.getElementById('qr-timer');

      timerInterval = setInterval(() => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
          clearQrTimers();
          if (timerEl) timerEl.textContent = 'Expired';
          closeQrModal();
          errorEl.textContent = 'QR code expired. Please try again.';
          return;
        }

        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        if (timerEl) {
          timerEl.textContent = `Expires in ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }, 1000);

      // ---------- Poll for approval ----------
      pollInterval = setInterval(async () => {
        try {
          const statusData = await authService.checkLoginSessionStatus(sessionToken);

          if (statusData.status === 'approved' && statusData.token) {
            clearQrTimers();

            // Use the storage layer — NOT raw localStorage
            storage.auth.setToken(statusData.token);
            if (statusData.user) storage.auth.setUser(statusData.user);

            closeQrModal();
            location.hash = ROUTES.DASHBOARD;
          } else if (statusData.status === 'expired') {
            clearQrTimers();
            closeQrModal();
            errorEl.textContent = 'QR code expired. Please try again.';
          }
        } catch (err) {
          devOnly('QR status check')(err);
        }
      }, QR_POLL_INTERVAL_MS);

    } catch (err) {
      devOnly('QR login start')(err);
      errorEl.textContent = err.message || 'Failed to start QR login.';
    }
  }

  // Only render QR button on non-mobile devices
  if (!isMobile) {
    document.getElementById('qr-login-btn')?.addEventListener('click', startQrLogin);
  }


  // ============================================================
  // PLACEHOLDER LINKS
  // ============================================================
  document.getElementById('forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorEl.textContent = 'Contact your administrator to reset your password.';
  });

  document.getElementById('contact-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorEl.textContent = `Reach out to ${APP_COMPANY} to request access.`;
  });


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    clearQrTimers();
    closeQrModal();
  });
}
