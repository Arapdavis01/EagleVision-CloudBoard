import { authService } from '../services/authService.js';
import { systemRequestService } from '../services/systemRequestService.js';

export function renderSidebar() {
  return `
    <div class="sidebar">
      <!-- Brand Lockup: Logo Image + EagleVision + 👥 + Qoech Tech -->
      <div class="sidebar-brand">
        <div class="sidebar-brand-logo">
          <img src="assets/images/qoech-q.jpg" alt="EagleVision Logo" />
        </div>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-title">EagleVision</span>
          <i class="fas fa-users sidebar-brand-icon"></i>
          <span class="sidebar-brand-sub">Qoech Tech</span>
        </div>
      </div>

      <a href="#dashboard" class="nav-link" data-page="dashboard">
        <i class="fas fa-tachometer-alt"></i> Dashboard
      </a>

      <a href="#projects" class="nav-link" data-page="projects">
        <i class="fas fa-folder-open"></i> Projects
      </a>

      <a href="#showcase" class="nav-link" data-page="showcase">
        <i class="fas fa-images"></i> Project Showcase
      </a>

      <a href="#service-planner" class="nav-link" data-page="service-planner">
        <i class="fas fa-clipboard-list"></i> Service Planner
      </a>

      <a href="#service-record" class="nav-link" data-page="service-record">
        <i class="fas fa-history"></i> Service Record
      </a>

      <!-- Client Requests — NEW -->
      <a href="#client-requests" class="nav-link" data-page="client-requests">
        <i class="fas fa-inbox"></i>
        <span>Client Requests</span>
        <span class="nav-badge hidden" id="nav-requests-badge">0</span>
      </a>

      <!-- Finance Dropdown -->
      <div class="nav-dropdown">
        <button class="nav-link dropdown-toggle" id="finance-toggle">
          <span><i class="fas fa-dollar-sign"></i> Finance</span>
          <i class="fas fa-chevron-down dropdown-arrow"></i>
        </button>
        <div class="dropdown-menu hidden" id="finance-menu">
          <a href="#finance?section=revenue" class="dropdown-item nav-sublink" data-page="finance" data-section="revenue">
            <i class="fas fa-chart-line"></i> Revenue
          </a>
          <a href="#finance?section=expenses" class="dropdown-item nav-sublink" data-page="finance" data-section="expenses">
            <i class="fas fa-wallet"></i> Expenses
          </a>
        </div>
      </div>

      <a href="#alerts" class="nav-link" data-page="alerts">
        <i class="fas fa-exclamation-triangle"></i> Alerts
      </a>

      <!-- Theme Toggle -->
      <button id="theme-toggle-btn" class="theme-toggle-btn">
        <i class="fas fa-moon"></i> <span>Dark Mode</span>
      </button>

      <!-- Logout -->
      <button id="logout-btn" class="btn logout-btn">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  `;
}

export function initSidebar() {
  // ==================== HIGHLIGHT ACTIVE LINK ====================
  const fullHash = location.hash.replace('#', '');
  const [base, queryString] = fullHash.split('?');
  const currentPage = base || 'dashboard';
  const currentSection = new URLSearchParams(queryString || '').get('section');

  // Highlight main nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const linkPage = link.dataset.page;
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Highlight sublinks (if on finance page)
  document.querySelectorAll('.nav-sublink').forEach(link => {
    const linkPage = link.dataset.page;
    const linkSection = link.dataset.section;
    if (linkPage === currentPage && linkSection === currentSection) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // ==================== FINANCE DROPDOWN ====================
  const financeToggle = document.getElementById('finance-toggle');
  const financeMenu = document.getElementById('finance-menu');
  if (financeToggle && financeMenu) {
    financeToggle.addEventListener('click', () => {
      financeMenu.classList.toggle('hidden');
    });
  }

  // ==================== CLIENT REQUESTS BADGE ====================
  loadClientRequestsBadge();

  // ==================== THEME TOGGLE ====================
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    // Load saved theme (falls back to system preference on first visit)
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

    if (isDark) {
      document.body.classList.add('dark-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> <span>Light Mode</span>';
    } else {
      document.body.classList.remove('dark-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    }

    // Toggle on click
    themeToggleBtn.addEventListener('click', () => {
      const nowDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', nowDark ? 'dark' : 'light');
      themeToggleBtn.innerHTML = nowDark
        ? '<i class="fas fa-sun"></i> <span>Light Mode</span>'
        : '<i class="fas fa-moon"></i> <span>Dark Mode</span>';
    });
  }

  // ==================== LOGOUT ====================
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authService.logout();
    });
  }
}

// ==================== BADGE LOADER ====================
/**
 * Loads the count of new client requests and displays
 * a badge next to the "Client Requests" nav link.
 */
async function loadClientRequestsBadge() {
  const badge = document.getElementById('nav-requests-badge');
  if (!badge) return;

  // Don't attempt to fetch if user isn't authenticated
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const stats = await systemRequestService.getStats();
    const newCount = stats.new_count || 0;

    if (newCount > 0) {
      badge.textContent = newCount > 99 ? '99+' : newCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (err) {
    // Silent fail — badge just won't show
    console.warn('Failed to load client requests badge:', err.message);
  }
}
