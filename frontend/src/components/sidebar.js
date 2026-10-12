// ============================================================
// EAGLEVISION CLOUDBOARD — SIDEBAR
// ============================================================
// Global navigation, rendered on every authed page.
//
//   import { renderSidebar, initSidebar } from '../components/sidebar.js';
//   app.innerHTML = `${renderSidebar()}<div class="main-content">...</div>`;
//   initSidebar();
// ============================================================

import { authService }          from '../services/authService.js';
import { systemRequestService } from '../services/systemRequestService.js';
import { theme }                from '../utils/theme.js';
import {
  ROUTES,
  APP_COMPANY,
  FEATURES,
} from '../config/constants.js';


// ============================================================
// RENDER
// ============================================================

export function renderSidebar() {
  const showThemeToggle = FEATURES.themeToggle;
  const showMonitoring  = FEATURES.monitoring;

  return `
    <div class="sidebar">
      <!-- Brand Lockup -->
      <div class="sidebar-brand">
        <div class="sidebar-brand-logo">
          <img src="assets/images/qoech-q.jpg" alt="EagleVision Logo" />
        </div>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-title">EagleVision</span>
          <i class="fas fa-users sidebar-brand-icon"></i>
          <span class="sidebar-brand-sub">${APP_COMPANY}</span>
        </div>
      </div>

      <a href="${ROUTES.DASHBOARD}" class="nav-link" data-page="dashboard">
        <i class="fas fa-tachometer-alt"></i> Dashboard
      </a>

      <a href="${ROUTES.PROJECTS}" class="nav-link" data-page="projects">
        <i class="fas fa-folder-open"></i> Projects
      </a>

      <a href="${ROUTES.SHOWCASE}" class="nav-link" data-page="showcase">
        <i class="fas fa-images"></i> Project Showcase
      </a>

      <a href="${ROUTES.SERVICE_PLANNER}" class="nav-link" data-page="service-planner">
        <i class="fas fa-clipboard-list"></i> Service Planner
      </a>

      <a href="${ROUTES.SERVICE_RECORD}" class="nav-link" data-page="service-record">
        <i class="fas fa-history"></i> Service Record
      </a>

      <a href="${ROUTES.CLIENT_REQUESTS}" class="nav-link" data-page="client-requests">
        <i class="fas fa-inbox"></i>
        <span>Client Requests</span>
        <span class="nav-badge hidden" id="nav-requests-badge">0</span>
      </a>

      <!-- Finance Dropdown -->
      <div class="nav-dropdown">
        <button class="nav-link dropdown-toggle" id="finance-toggle" type="button">
          <span><i class="fas fa-dollar-sign"></i> Finance</span>
          <i class="fas fa-chevron-down dropdown-arrow"></i>
        </button>
        <div class="dropdown-menu hidden" id="finance-menu">
          <a href="${ROUTES.FINANCE}?section=revenue"
             class="dropdown-item nav-sublink"
             data-page="finance" data-section="revenue">
            <i class="fas fa-chart-line"></i> Revenue
          </a>
          <a href="${ROUTES.FINANCE}?section=expenses"
             class="dropdown-item nav-sublink"
             data-page="finance" data-section="expenses">
            <i class="fas fa-wallet"></i> Expenses
          </a>
        </div>
      </div>

      <a href="${ROUTES.ALERTS}" class="nav-link" data-page="alerts">
        <i class="fas fa-exclamation-triangle"></i> Alerts
      </a>

      ${showMonitoring ? `
        <a href="${ROUTES.MONITORING}" class="nav-link" data-page="monitoring">
          <i class="fas fa-heartbeat"></i> Monitoring
        </a>
      ` : ''}

      ${showThemeToggle ? `
        <button id="theme-toggle-btn" class="theme-toggle-btn" type="button">
          <i class="fas fa-moon"></i> <span>Dark Mode</span>
        </button>
      ` : ''}

      <button id="logout-btn" class="btn logout-btn" type="button">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  `;
}


// ============================================================
// INIT — called after renderSidebar() is inserted into the DOM
// ============================================================

export function initSidebar() {
  highlightActiveLinks();
  initFinanceDropdown();
  loadClientRequestsBadge();
  initThemeToggle();
  initLogout();
}


// ============================================================
// INTERNAL HELPERS
// ============================================================

function highlightActiveLinks() {
  const fullHash = location.hash.replace('#', '');
  const [base, queryString] = fullHash.split('?');
  const currentPage = base || 'dashboard';
  const currentSection = new URLSearchParams(queryString || '').get('section');

  // Main nav links
  document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === currentPage);
  });

  // Finance sublinks (revenue/expenses)
  document.querySelectorAll('.nav-sublink').forEach((link) => {
    const matches =
      link.dataset.page === currentPage &&
      link.dataset.section === currentSection;
    link.classList.toggle('active', matches);
  });

  // If we're on finance, make the parent toggle look active too
  const financeToggle = document.getElementById('finance-toggle');
  if (financeToggle) {
    financeToggle.classList.toggle('active', currentPage === 'finance');
  }
}


function initFinanceDropdown() {
  const toggle = document.getElementById('finance-toggle');
  const menu   = document.getElementById('finance-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', isOpen);
    toggle.classList.toggle('open', !isOpen);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add('hidden');
      toggle.classList.remove('open');
    }
  });
}


async function loadClientRequestsBadge() {
  const badge = document.getElementById('nav-requests-badge');
  if (!badge) return;

  // Guard — don't fetch if user isn't authed
  if (!authService.isAuthenticated()) return;

  try {
    const stats = await systemRequestService.getStats();
    const newCount = stats?.new_count || 0;

    if (newCount > 0) {
      badge.textContent = newCount > 99 ? '99+' : String(newCount);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[sidebar] badge load failed:', err.message);
    }
  }
}


function initThemeToggle() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  // Sync button UI to the current theme
  const syncUI = (current) => {
    if (current === 'dark') {
      btn.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    } else {
      btn.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    }
  };

  syncUI(theme.get());

  // Toggle on click
  btn.addEventListener('click', () => {
    const next = theme.toggle();
    syncUI(next);
  });

  // If theme changes elsewhere (e.g., another component), keep UI in sync
  theme.onChange((next) => syncUI(next));
}


function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out…';

    try {
      await authService.logout();       // server + local cleanup
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.warn('[sidebar] logout error:', err);
      }
    }

    // Router will redirect via auth guard once we navigate
    location.hash = ROUTES.LOGIN;

    // (no need to restore button — we're leaving the page)
    void original;
  });
}
