// ============================================================
// EAGLEVISION CLOUDBOARD — HASH ROUTER
// ============================================================
// Features:
//   • Hash-based navigation with auth guard
//   • Uses authService (not raw localStorage)
//   • Redirects authed users away from #login
//   • Per-route page titles
//   • Scroll-to-top on navigation
//   • Loading state during page boot
//   • Friendly 404 + error screens
//   • Runs page cleanups before route change
//   • Manages page-level body classes
//   • Enforces idle timeout
// ============================================================

import { loginPage }          from './pages/login/login.js';
import { dashboardPage }      from './pages/dashboard/dashboard.js';
import { projectsPage }       from './pages/projects/projects.js';
import { financePage }        from './pages/finance/finance.js';
import { alertsPage }         from './pages/alerts/alerts.js';
import { showcasePage }       from './pages/showcase/showcase.js';
import { serviceRecordPage }  from './pages/serviceRecord/serviceRecord.js';
import { servicePlannerPage } from './pages/servicePlanner/servicePlanner.js';
import { clientRequestsPage } from './pages/clientRequests/clientRequests.js';
import { approveLoginPage }   from './pages/approveLogin/approveLogin.js';
import { initCustomSelects }  from './components/customSelect.js';

import { authService }        from './services/authService.js';
import { storage }            from './utils/storage.js';
import { runCleanups }        from './utils/pageLifecycle.js';
import {
  APP_NAME,
  ROUTES,
  PUBLIC_ROUTES,
  AUTH,
} from './config/constants.js';


// ============================================================
// ROUTE TABLE
// ============================================================
const routes = {
  [ROUTES.LOGIN]:           { loader: loginPage,          title: 'Sign In' },
  [ROUTES.APPROVE_LOGIN]:   { loader: approveLoginPage,   title: 'Approve Login' },
  [ROUTES.DASHBOARD]:       { loader: dashboardPage,      title: 'Dashboard' },
  [ROUTES.PROJECTS]:        { loader: projectsPage,       title: 'Projects' },
  [ROUTES.FINANCE]:         { loader: financePage,        title: 'Finance' },
  [ROUTES.ALERTS]:          { loader: alertsPage,         title: 'Alerts' },
  [ROUTES.SHOWCASE]:        { loader: showcasePage,       title: 'Showcase' },
  [ROUTES.SERVICE_PLANNER]: { loader: servicePlannerPage, title: 'Service Planner' },
  [ROUTES.SERVICE_RECORD]:  { loader: serviceRecordPage,  title: 'Service Record' },
  [ROUTES.CLIENT_REQUESTS]: { loader: clientRequestsPage, title: 'Client Requests' },
};

const DEFAULT_ROUTE = ROUTES.DASHBOARD;

// Page-specific body classes (added while that route is active)
const PAGE_BODY_CLASSES = {
  [ROUTES.DASHBOARD]: 'page-dashboard',
  [ROUTES.PROJECTS]:  'page-projects',
  [ROUTES.FINANCE]:   'page-finance',
  // add more as needed
};


// ============================================================
// HELPERS
// ============================================================
function isPublic(routeBase) {
  return PUBLIC_ROUTES.includes(routeBase);
}

function setPageTitle(title) {
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
}

function setActiveNavLink(baseHash) {
  document
    .querySelectorAll('.sidebar a[href^="#"], .nav-link[href^="#"]')
    .forEach((link) => {
      const linkHash = link.getAttribute('href').split('?')[0];
      link.classList.toggle('active', linkHash === baseHash);
    });
}

function setPageBodyClass(baseHash) {
  // Remove all known page classes first
  Object.values(PAGE_BODY_CLASSES).forEach((cls) => {
    document.body.classList.remove(cls);
  });
  // Add the one for the current route
  const cls = PAGE_BODY_CLASSES[baseHash];
  if (cls) document.body.classList.add(cls);
}

function getHash() {
  const fullHash = location.hash || DEFAULT_ROUTE;
  return {
    full:  fullHash,
    base:  fullHash.split('?')[0],
    query: fullHash.includes('?') ? fullHash.slice(fullHash.indexOf('?')) : '',
  };
}


// ============================================================
// LOADING / ERROR / 404 SCREENS
// ============================================================
function renderLoading(force = false) {
  const app = document.getElementById('app');
  if (!app) return;
  if (!force && app.children.length > 0) return;
  app.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      min-height:60vh;color:#8A94A6;
      font-family:'Inter',system-ui,sans-serif;font-size:14px;gap:10px;
    ">
      <span style="
        width:16px;height:16px;border:2px solid #E2E8F0;border-top-color:#16A34A;
        border-radius:50%;display:inline-block;animation:spin 0.8s linear infinite;
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
        <a href="${ROUTES.DASHBOARD}" style="
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
      <a href="${ROUTES.DASHBOARD}" style="
        display:inline-block;padding:10px 20px;background:#16A34A;color:#FFFFFF;
        border-radius:100px;font-family:'Space Grotesk',sans-serif;font-weight:600;
        font-size:14px;text-decoration:none;
      ">Back to Dashboard</a>
    </div>
  `;
}


// ============================================================
// IDLE CHECK
// ============================================================
function enforceIdleTimeout() {
  if (!AUTH.IDLE_TIMEOUT_MS) return;
  if (!authService.isAuthenticated()) return;
  if (storage.auth.isIdle()) {
    storage.auth.clearAll();
    // Navigate directly instead of relying on an external listener
    if (location.hash !== ROUTES.LOGIN) {
      location.hash = ROUTES.LOGIN;
    }
  }
}


// ============================================================
// ROUTER
// ============================================================
export async function initRouter() {
  const hash  = getHash();
  const route = routes[hash.base];

  // ---------- 1. Auth guard ----------
  if (route && !isPublic(hash.base) && !authService.isAuthenticated()) {
    location.hash = AUTH.LOGIN_ROUTE;
    return;
  }

  // Already logged in and heading to login → send to dashboard
  if (hash.base === ROUTES.LOGIN && authService.isAuthenticated()) {
    location.hash = DEFAULT_ROUTE;
    return;
  }

  // ---------- 2. Idle check ----------
  enforceIdleTimeout();
  // If idle just triggered a redirect, stop here
  if (!authService.isAuthenticated() && !isPublic(hash.base)) return;

  // ---------- 3. Unknown route → 404 ----------
  if (!route) {
    setPageTitle('Not Found');
    setPageBodyClass('');
    renderNotFound();
    return;
  }

  // ---------- 4. Clean up previous page ----------
  // Runs before loading the new page: kills charts, timers,
  // intervals, global listeners registered by the old page.
  runCleanups();

  // ---------- 5. Load page ----------
  setPageTitle(route.title);
  setPageBodyClass(hash.base);

  // If the hash has a query, we're likely doing a same-page nav
  // (e.g. #finance?section=revenue). Skip the loading screen in that
  // case — it would flash needlessly. Otherwise show it.
  const samePageNav = false; // future: track previous base
  renderLoading(!samePageNav);

  try {
    await route.loader();
    initCustomSelects();
    setActiveNavLink(hash.base);
    window.scrollTo({ top: 0, behavior: 'auto' });
  } catch (err) {
    setPageTitle('Error');
    renderError(err);
  }
}


// ============================================================
// SESSION-EXPIRED LISTENER
// ============================================================
// app.js already handles the redirect — this is a safety net
// in case the router boots standalone (e.g., tests).
// ============================================================
window.addEventListener('ev:session-expired', () => {
  if (location.hash !== ROUTES.LOGIN) {
    location.hash = ROUTES.LOGIN;
  }
});


// ============================================================
// HASH CHANGE LISTENER
// ============================================================
window.addEventListener('hashchange', initRouter);
