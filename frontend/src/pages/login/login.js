import { authService } from '../../services/authService.js';
import { showModal } from '../../components/modal.js';

export async function loginPage() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Detect mobile to hide QR button
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  // Pre-fill email from last successful login
  const rememberedEmail = localStorage.getItem('rememberedEmail') || '';
  const rememberChecked = localStorage.getItem('rememberMe') === 'true';

  // ---------- BUILD PAGE ----------
  const loginHTML = `
    <div class="login-page">

      <!-- ═══════════════ LEFT PANEL — BRAND ═══════════════ -->
      <aside class="login-brand-panel">

        <div class="login-brand-glow"></div>

        <div class="login-brand-content">

          <!-- Logo + Brand name -->
          <div class="login-brand-logo">
            <img src="assets/images/qoech-q.jpg" alt="Qoech Technologies" />
            <div class="login-brand-text">
              <span class="login-brand-company">Qoech Technologies</span>
              <span class="login-brand-product">EagleVision CloudBoard</span>
            </div>
          </div>

          <!-- Tagline -->
          <h1 class="login-brand-headline">
            Monitor. Manage.<br/>
            <span class="login-brand-headline-accent">Excel.</span>
          </h1>

          <p class="login-brand-description">
            A next-generation project management system for monitoring client portfolios,
            tracking service records, and driving data-driven decisions.
          </p>

          <!-- Feature bullets -->
          <ul class="login-brand-features">
            <li><i class="fas fa-check-circle"></i> Real-time system monitoring</li>
            <li><i class="fas fa-check-circle"></i> Client portfolio tracking</li>
            <li><i class="fas fa-check-circle"></i> Service planning &amp; records</li>
            <li><i class="fas fa-check-circle"></i> Financial insights &amp; analytics</li>
          </ul>

          <!-- Footer on brand side -->
          <div class="login-brand-footer">
            <span class="login-brand-footer-line"></span>
            <span class="login-brand-footer-text">
              © 2026 <strong>Qoech Technologies</strong>
            </span>
          </div>

        </div>
      </aside>

      <!-- ═══════════════ RIGHT PANEL — FORM ═══════════════ -->
      <main class="login-form-panel">

        <div class="login-form-wrapper">

          <!-- Mobile-only brand -->
          <div class="login-form-mobile-brand">
            <img src="assets/images/qoech-q.jpg" alt="Qoech Technologies" />
            <span>Qoech Technologies</span>
          </div>

          <!-- Form header -->
          <div class="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <!-- Login form -->
          <form id="login-form" class="login-form" autocomplete="on" novalidate>

            <!-- Email -->
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

            <!-- Password -->
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

            <!-- Options row -->
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

            <!-- Error -->
            <p id="error" class="error-message" role="alert" aria-live="polite"></p>

            <!-- Submit -->
            <button type="submit" class="btn btn-primary btn-block login-submit-btn" id="submit-btn">
              <span id="login-spinner" class="spinner hidden"></span>
              <span id="login-text">Sign In</span>
              <i class="fas fa-arrow-right login-submit-arrow"></i>
            </button>

          </form>

          ${!isMobile ? `
          <!-- QR alternative -->
          <div class="login-divider">
            <span>or continue with</span>
          </div>

          <button id="qr-login-btn" type="button" class="login-qr-btn">
            <i class="fas fa-qrcode"></i>
            <span>Login with QR Code</span>
          </button>
          ` : ''}

          <!-- Form footer -->
          <div class="login-form-footer">
            <p>Need access? <a href="#" class="login-link" id="contact-link">Contact Qoech</a></p>
          </div>

        </div>
      </main>

    </div>
  `;

  app.innerHTML = loginHTML;

  // ═══════════════════════════════════════════════════════════
  //  REFERENCES
  // ═══════════════════════════════════════════════════════════
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const capsWarning = document.getElementById('caps-warning');
  const errorEl = document.getElementById('error');
  const loginSpinner = document.getElementById('login-spinner');
  const loginText = document.getElementById('login-text');
  const submitBtn = document.getElementById('submit-btn');
  const rememberCheckbox = document.getElementById('rememberMe');

  // ═══════════════════════════════════════════════════════════
  //  PASSWORD VISIBILITY TOGGLE
  // ═══════════════════════════════════════════════════════════
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  // ═══════════════════════════════════════════════════════════
  //  CAPS LOCK DETECTION
  // ═══════════════════════════════════════════════════════════
  passwordInput.addEventListener('keyup', (e) => {
    if (typeof e.getModifierState === 'function') {
      const capsOn = e.getModifierState('CapsLock');
      capsWarning.classList.toggle('hidden', !capsOn);
    }
  });

  passwordInput.addEventListener('blur', () => {
    capsWarning.classList.add('hidden');
  });

  // ═══════════════════════════════════════════════════════════
  //  FORM SUBMISSION
  // ═══════════════════════════════════════════════════════════
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Reset error
    errorEl.textContent = '';

    // Basic validation
    if (!email || !password) {
      errorEl.textContent = 'Please fill in both fields.';
      shakeInput(email ? passwordInput : emailInput);
      return;
    }

    // Email format validation (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      shakeInput(emailInput);
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      await authService.login(email, password);

      // Persist "remember me" preference
      if (rememberCheckbox.checked) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }

      // Redirect
      location.hash = '#dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Check your credentials.';
      setLoading(false);
      shakeInput(passwordInput);
      passwordInput.focus();
    }
  });

  // Enter key submits the form
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════
  function setLoading(isLoading) {
    loginSpinner.classList.toggle('hidden', !isLoading);
    loginText.textContent = isLoading ? 'Signing in...' : 'Sign In';
    submitBtn.disabled = isLoading;
    emailInput.disabled = isLoading;
    passwordInput.disabled = isLoading;
  }

  function shakeInput(input) {
    input.classList.add('input-shake');
    setTimeout(() => input.classList.remove('input-shake'), 500);
  }

  function escapeAttr(str) {
    return str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  }

  // ═══════════════════════════════════════════════════════════
  //  QR LOGIN
  // ═══════════════════════════════════════════════════════════
  let qrModal = null;
  let pollInterval = null;
  let timerInterval = null;

  if (!isMobile) {
    const qrBtn = document.getElementById('qr-login-btn');
    qrBtn?.addEventListener('click', startQrLogin);
  }

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
            <img src="${qrImageUrl}" alt="QR Code Login" />
          </div>
          <p class="qr-timer" id="qr-timer">Expires in 02:00</p>
          <button id="cancel-qr-btn" class="btn btn-outline btn-sm">Cancel</button>
        </div>
      `;

      qrModal = showModal(modalContent);

      document.getElementById('cancel-qr-btn').addEventListener('click', () => {
        cleanupQrLogin();
      });

      let secondsLeft = 120;
      const timerEl = document.getElementById('qr-timer');
      timerInterval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          timerEl.textContent = 'Expired';
          cleanupQrLogin();
          errorEl.textContent = 'QR code expired. Please try again.';
          return;
        }
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        timerEl.textContent = `Expires in ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }, 1000);

      pollInterval = setInterval(async () => {
        try {
          const statusData = await authService.checkLoginSessionStatus(sessionToken);
          if (statusData.status === 'approved') {
            clearInterval(pollInterval);
            clearInterval(timerInterval);
            if (statusData.token) {
              localStorage.setItem('token', statusData.token);
              closeQrModal();
              location.hash = '#dashboard';
            }
          } else if (statusData.status === 'expired') {
            clearInterval(pollInterval);
            clearInterval(timerInterval);
            closeQrModal();
            errorEl.textContent = 'QR code expired. Please try again.';
          }
        } catch (err) {
          console.error('QR status check failed', err);
        }
      }, 2000);
    } catch (err) {
      console.error('QR login error', err);
      errorEl.textContent = err.message || 'Failed to start QR login.';
    }
  }

  function cleanupQrLogin() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    closeQrModal();
  }

  function closeQrModal() {
    if (qrModal && typeof qrModal.close === 'function') {
      qrModal.close();
    }
    qrModal = null;
  }

  // ═══════════════════════════════════════════════════════════
  //  FORGOT PASSWORD & CONTACT (placeholder handlers)
  // ═══════════════════════════════════════════════════════════
  document.getElementById('forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorEl.textContent = 'Contact your administrator to reset your password.';
  });

  document.getElementById('contact-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    errorEl.textContent = 'Reach out to Qoech Technologies to request access.';
  });
}
