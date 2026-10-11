// ============================================================
// EAGLEVISION CLOUDBOARD — APP ENTRY POINT
// ============================================================
// Bootstraps the SPA:
//   1. Applies the theme (light/dark) via utils/theme.js
//   2. Ensures storage schema version is current
//   3. Warms up the backend (Render cold-start mitigation)
//   4. Listens for global session-expired events
//   5. Starts the hash router
//   6. Catches fatal errors and shows a fallback UI
// ============================================================

import { initRouter } from './router.js';
import { storage }    from './utils/storage.js';
import { theme }      from './utils/theme.js';
import {
  API_BASE_URL,
  API_WARMUP_MS,
  APP_NAME,
  APP_VERSION,
  ROUTES,
} from './config/constants.js';


// ============================================================
// 01. THEME BOOTSTRAP
// ============================================================
// Delegated to utils/theme.js — the single source of truth
// for light/dark mode. This applies the class to <body> before
// the first paint and syncs the browser chrome meta tag.
// ============================================================
function applyTheme() {
  theme.init();
}


// ============================================================
// 02. STORAGE SCHEMA VERSION
// ============================================================
// If the schema version has changed, wipes stale keys so users
// don't get confused by old data. Cheap insurance against
// breaking updates.
// ============================================================
function ensureStorageVersion() {
  try {
    storage.ensureVersion();
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[app] storage version check failed', err);
    }
  }
}


// ============================================================
// 03. BACKEND WARM-UP
// ============================================================
// Fire-and-forget ping to wake the backend (Render cold start).
// Uses AbortController so a hung request never blocks the app.
// ============================================================
function warmUpBackend() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_WARMUP_MS);

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
      if (import.meta?.env?.DEV) {
        console.info('[warmup] backend not ready yet:', err.message);
      }
    });
}


// ============================================================
// 04. SESSION-EXPIRED LISTENER
// ============================================================
// api.js emits 'ev:session-expired' when a 401 comes back.
// Redirect to login (the router's auth guard would also fire,
// but this makes the redirect instant).
// ============================================================
function listenForSessionExpired() {
  window.addEventListener('ev:session-expired', () => {
    if (import.meta?.env?.DEV) {
      console.info('[session] expired — redirecting to login');
    }
    if (location.hash !== ROUTES.LOGIN) {
      location.hash = ROUTES.LOGIN;
    }
  });
}


// ============================================================
// 05. FATAL ERROR FALLBACK
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
      <h1 style="font-size: 20px; margin: 0 0 8px; color: #0F172A; font-family: 'Space Grotesk', sans-serif;">
        Something went wrong
      </h1>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
        ${APP_NAME} could not start. Please reload the page — if the
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
// 06. BOOT
// ============================================================
function boot() {
  // Theme first — before anything renders
  applyTheme();

  // Storage schema check (may clear stale auth data)
  ensureStorageVersion();

  // Non-blocking warm-up
  warmUpBackend();

  // Global listeners
  listenForSessionExpired();

  // Start the router
  try {
    initRouter();
  } catch (err) {
    renderFatalError(err);
    return;
  }

  // Dev banner
  if (import.meta?.env?.DEV) {
    console.info(
      `%c${APP_NAME} %cv${APP_VERSION}`,
      'color:#16A34A;font-weight:700;',
      'color:#8A94A6;'
    );
  }
}


// ============================================================
// 07. RUN
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
