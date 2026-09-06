import { authService } from '../services/authService.js';

export function renderSidebar() {
  return `
    <div class="sidebar">
      <h1><i class="fas fa-eye"></i> EagleVision</h1>
      <a href="#dashboard" class="nav-link" data-page="dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
      <a href="#projects" class="nav-link" data-page="projects"><i class="fas fa-folder-open"></i> Projects</a>
      <a href="#showcase" class="nav-link" data-page="showcase"><i class="fas fa-images"></i> Project Showcase</a>
      <a href="#service-planner" class="nav-link" data-page="service-planner"><i class="fas fa-clipboard-list"></i> Service Planner</a>
      <a href="#service-record" class="nav-link" data-page="service-record"><i class="fas fa-history"></i> Service Record</a>

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

      <a href="#alerts" class="nav-link" data-page="alerts"><i class="fas fa-exclamation-triangle"></i> Alerts</a>
      <button id="logout-btn" class="btn logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
    </div>
  `;
}

export function initSidebar() {
  // Extract base page and section from hash
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

  // Toggle finance dropdown menu
  const financeToggle = document.getElementById('finance-toggle');
  const financeMenu = document.getElementById('finance-menu');
  if (financeToggle && financeMenu) {
    financeToggle.addEventListener('click', () => {
      financeMenu.classList.toggle('hidden');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authService.logout();
    });
  }
}
