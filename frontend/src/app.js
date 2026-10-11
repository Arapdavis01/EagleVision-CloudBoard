// ============================================================
// EAGLEVISION CLOUDBOARD — APP ENTRY POINT
// ============================================================
// Bootstraps the SPA:
//   1. Applies the theme class to <body>
//   2. Ensures storage schema version is current
//   3. Warms up the backend (Render cold-start mitigation)
//   4. Listens for global session-expired events
//   5. Starts the hash router
//   6. Catches fatal errors and shows a fallback UI
// ============================================================

import { initRouter }   from './router.js';
import { storage }      from './utils/storage.js';
import {
  API_BASE_URL,
  API_WARMUP_MS,
  DEFAULT_THEME,
  STORAGE_KEYS,
  APP_NAME,
  APP_VERSION,
  AUTH,
  ROUTES,
} from './config/constants.js';


// ============================================================
// 01. THEME BOOTSTRAP
// ============================================================
// Applies `theme-light` or `theme-dark` to <body> before render.
// Reads from storage; falls back to DEFAULT_THEME.
// ============================================================
function applyTheme() {
  let theme = DEFAULT_THEME;

  try {
    const stored = storage.getString(STORAGE_KEYS.THEME, '');
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
  } catch (_) {
    // storage layer already swallows errors — this is just safety
  }

  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0B1220' : '#FFFFFF');
  }
}


// ============================================================
// 02. STORAGE SCHEMA VERSION
// ============================================================
// If the schema version has changed, this wipes stale keys
// (token, user, theme, etc.) so users don't get confused by
// old data. Cheap insurance against breaking updates.
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
// Redirect to login (the router's auth guard will also fire,
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
