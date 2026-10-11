// ============================================================
// EAGLEVISION CLOUDBOARD — APP ENTRY POINT
// ============================================================
// Bootstraps the SPA:
//   1. Applies the theme class to <body>
//   2. Warms up the backend (Render cold-start mitigation)
//   3. Starts the hash router
//   4. Catches fatal errors and shows a fallback UI
// ============================================================

import { initRouter }     from './router.js';
import {
  API_BASE_URL,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  APP_NAME,
  APP_VERSION,
  API_TIMEOUT_MS,
} from './config/constants.js';


// ============================================================
// 01. THEME BOOTSTRAP
// ============================================================
// Applies `theme-light` or `theme-dark` to <body> before render,
// so the correct color palette is active before first paint.
// Reads from localStorage; falls back to DEFAULT_THEME.
// ============================================================
function applyTheme() {
  let theme = DEFAULT_THEME;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
  } catch (_) {
    // localStorage may be blocked (private mode / cookies off) — ignore
  }

  // Remove any previous theme class, then apply the current one
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);

  // Keep the browser chrome (mobile status bar) in sync
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0B1220' : '#FFFFFF');
  }
}


// ============================================================
// 02. BACKEND WARM-UP
// ============================================================
// Fire-and-forget ping to wake the backend (Render cold start).
// Uses AbortController so a hung request never blocks the app.
// ============================================================
function warmUpBackend() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    signal: controller.signal,
    cache: 'no-store',
  })
    .then((res) => {
      clearTimeout(timer);
      if (import.meta?.env?.DEV) {
        console.info(`[warmup] backend status: ${res.status}`);
      }
    })
    .catch((err) => {
      clearTimeout(timer);
      // Silent — warm-up failure is not fatal
      if (import.meta?.env?.DEV) {
        console.info('[warmup] backend not ready yet:', err.message);
      }
    });
}


// ============================================================
// 03. FATAL ERROR FALLBACK
// ============================================================
// If the router fails to boot, show a friendly message instead
// of a blank white screen.
// ============================================================
function renderFatalError(err) {
  console.error('[fatal]', err);

  const mount = document.getElementById('app');
  if (!mount) return;

  mount.innerHTML = `
    <div style="
      max-width: 520px;
      margin: 80px auto;
      padding: 32px 28px;
      background: #FFFFFF;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 16px;
      box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.08);
      font-family: 'Inter', system-ui, sans-serif;
      text-align: center;
      color: #0F172A;
    ">
      <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
      <h1 style="font-size: 20px; margin: 0 0 8px; color: #0F172A;">
        Something went wrong
      </h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        EagleVision could not start. Please reload the page — if the
        problem persists, contact support.
      </p>
      <button
        onclick="location.reload()"
        style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #16A34A;
          color: #FFFFFF;
          border: none;
          border-radius: 100px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        "
      >
        Reload Page
      </button>
      <details style="margin-top: 24px; text-align: left;">
        <summary style="cursor: pointer; font-size: 12px; color: #8A94A6;">
          Technical details
        </summary>
        <pre style="
          margin-top: 8px;
          padding: 12px;
          background: #F4F6F8;
          border-radius: 8px;
          font-size: 11px;
          color: #475569;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        ">${String(err?.stack || err?.message || err)}</pre>
      </details>
    </div>
  `;
}


// ============================================================
// 04. BOOT
// ============================================================
function boot() {
  // Theme first — before anything renders
  applyTheme();

  // Fire-and-forget warm-up (does not block)
  warmUpBackend();

  // Start the router
  try {
    initRouter();
  } catch (err) {
    renderFatalError(err);
    return;
  }

  // Friendly build banner in dev
  if (import.meta?.env?.DEV) {
    console.info(
      `%c${APP_NAME} %cv${APP_VERSION}`,
      'color:#16A34A;font-weight:700;',
      'color:#8A94A6;'
    );
  }
}


// ============================================================
// 05. RUN
// ============================================================
// <script type="module"> is deferred, so the DOM is already
// parsed — but we still guard for safety in case this file is
// ever loaded differently.
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
