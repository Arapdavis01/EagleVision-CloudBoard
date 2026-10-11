// ============================================================
// EAGLEVISION CLOUDBOARD — HASH ROUTER
// ============================================================
// Handles:
//   • Hash-based navigation (#dashboard, #projects, etc.)
//   • Auth guard (redirect to #login if no token)
//   • Redirect authed users away from #login
//   • Per-route page titles
//   • Scroll-to-top on navigation
//   • Loading state during page boot
//   • Friendly 404 for unknown routes
// ============================================================

import { loginPage }             from './pages/login/login.js';
import { dashboardPage }         from './pages/dashboard/dashboard.js';
import { projectsPage }          from './pages/projects/projects.js';
import { financePage }           from './pages/finance/finance.js';
import { alertsPage }            from './pages/alerts/alerts.js';
import { showcasePage }          from './pages/showcase/showcase.js';
import { serviceRecordPage }     from './pages/serviceRecord/serviceRecord.js';
import { servicePlannerPage }    from './pages/servicePlanner/servicePlanner.js';
import { clientRequestsPage }    from './pages/clientRequests/clientRequests.js';
import { approveLoginPage }      from './pages/approveLogin/approveLogin.js';
import { initCustomSelects }     from './components/customSelect.js';

import {
  APP_NAME,
  AUTH_TOKEN_KEY,
  ROUTES,
  FEATURES,
} from './config/constants.js';


// ============================================================
// ROUTE TABLE
// ============================================================
// Each entry:
//   loader:  async function that renders the page
//   title:   string shown in the browser tab
//   public:  true = no auth required
// ============================================================
const routes = {
  '#login':            { loader: loginPage,            title: 'Sign In',              public: true },
  '#dashboard':        { loader: dashboardPage,        title: 'Dashboard',            public: false },
  '#projects':         { loader: projectsPage,         title: 'Projects',             public: false },
  '#finance':          { loader: financePage,          title: 'Finance',              public: false },
  '#alerts':           { loader: alertsPage,           title: 'Alerts',               public: false },
  '#showcase':         { loader: showcasePage,         title: 'Showcase',             public: false },
  '#service-planner':  { loader: servicePlannerPage,   title: 'Service Planner',      public: false },
  '#service-record':   { loader: serviceRecordPage,    title: 'Service Record',       public: false },
  '#client-requests':  { loader: clientRequestsPage,   title: 'Client Requests',      public: false },
  '#approve-login':    { loader: approveLoginPage,     title: 'Approve Login',        public: false },
};

const DEFAULT_ROUTE        = '#dashboard';
const FALLBACK_PUBLIC_ROUTE = '#login';


// ============================================================
// HELPERS
// ============================================================
function isAuthed() {
  try {
    return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
  } catch (_) {
    return false;
  }
}

function setPageTitle(title) {
  document.title = title
    ? `${title} · ${APP_NAME}`
    : APP_NAME;
}

function setActiveNavLink(baseHash) {
  // Sidebar links use href="#dashboard" etc — match against them
  document.querySelectorAll('.sidebar a[href^="#"], .nav-link[href^="#"]').forEach((link) => {
    const linkHash = link.getAttribute('href').split('?')[0];
    link.classList.toggle('active', linkHash === baseHash);
  });
}

function getHash() {
  const fullHash = location.hash || DEFAULT_ROUTE;
  return {
    full: fullHash,
    base: fullHash.split('?')[0],
    query: fullHash.includes('?') ? fullHash.slice(fullHash.indexOf('?')) : '',
  };
}


// ============================================================
// ERROR / 404 SCREENS
// ============================================================
function renderLoading() {
  const app = document.getElementById('app');
  if (!app) return;
  // Only show loading if there's nothing rendered yet (avoid flicker)
  if (app.children.length > 0) return;
  app.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      min-height:60vh;color:#8A94A6;
      font-family:'Inter',system-ui,sans-serif;font-size:14px;
      gap:10px;
    ">
      <span style="
        width:16px;height:16px;border:2px solid #E2E8F0;border-top-color:#16A34A;
        border-radius:50%;display:inline-block;
        animation:spin 0.8s linear infinite;
      "></span>
      Loading…
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
}

function renderError(err) {
  if (import.meta?.env?.DEV) {
    console.error('[router] page load error:', err);
  }

  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div style="
      max-width:520px;margin:80px auto;padding:32px 28px;
      background:#FFFFFF;border:1px solid rgba(15,23,42,0.08);
      border-radius:16px;box-shadow:0 12px 24px -6px rgba(15,23,42,0.08);
      font-family:'Inter',system-ui,sans-serif;text-align:center;color:#0F172A;
    ">
      <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
      <h1 style="font-size:20px;margin:0 0 8px;font-family:'Space Grotesk',sans-serif;">
        Couldn't load this page
      </h1>
      <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 20px;">
        Something went wrong while loading the page. Try again or head back to the dashboard.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button onclick="location.reload()" style="
          padding:10px 20px;background:#FFFFFF;color:#0F172A;
          border:1px solid rgba(15,23,42,0.12);border-radius:100px;
          font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;cursor:pointer;
        ">Reload</button>
        <a href="#dashboard" style="
          padding:10px 20px;background:#16A34A;color:#FFFFFF;
          border:1px solid #16A34A;border-radius:100px;
          font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;
          text-decoration:none;
        ">Go to Dashboard</a>
      </div>
    </div>
  `;
}

function renderNotFound() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div style="
      max-width:520px;margin:80px auto;padding:32px 28px;
      background:#FFFFFF;border:1px solid rgba(15,23,42,0.08);
      border-radius:16px;box-shadow:0 12px 24px -6px rgba(15,23,42,0.08);
      font-family:'Inter',system-ui,sans-serif;text-align:center;color:#0F172A;
    ">
      <div style="font-size:40px;margin-bottom:12px;">🧭</div>
      <h1 style="font-size:20px;margin:0 0 8px;font-family:'Space Grotesk',sans-serif;">
        Page not found
      </h1>
      <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 20px;">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="#dashboard" style="
        display:inline-block;padding:10px 20px;background:#16A34A;color:#FFFFFF;
        border-radius:100px;font-family:'Space Grotesk',sans-serif;font-weight:600;
        font-size:14px;text-decoration:none;
      ">Back to Dashboard</a>
    </div>
  `;
}


// ============================================================
// ROUTER
// ============================================================
export async function initRouter() {
  const hash = getHash();
  const route = routes[hash.base];

  // ---------- 1. Auth guard ----------
  if (route && !route.public && !isAuthed()) {
    // Not logged in → send to login
    if (hash.base !== '#login') {
      location.hash = ROUTES.LOGIN;
      return;
    }
  }

  // Already logged in and heading to login → send to dashboard
  if (hash.base === ROUTES.LOGIN && isAuthed()) {
    location.hash = DEFAULT_ROUTE;
    return;
  }

  // ---------- 2. Unknown route → 404 ----------
  if (!route) {
    setPageTitle('Not Found');
    renderNotFound();
    return;
  }

  // ---------- 3. Load page ----------
  setPageTitle(route.title);
  renderLoading();

  try {
    await route.loader();

    // Convert native <select> → custom dropdowns after render.
    // Safe to call multiple times (should be idempotent).
    initCustomSelects();

    // Sidebar active state
    setActiveNavLink(hash.base);

    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'auto' });

  } catch (err) {
    setPageTitle('Error');
    renderError(err);
  }
}


// ============================================================
// HASH CHANGE LISTENER
// ============================================================
window.addEventListener('hashchange', initRouter);
