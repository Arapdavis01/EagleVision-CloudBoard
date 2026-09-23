import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { systemRequestService } from '../../services/systemRequestService.js';
import { openRequestDetailModal } from '../../components/requestDetailModal.js';
import { showToast } from '../../utils/notifications.js';

export async function clientRequestsPage() {
  document.body.classList.add('app-dashboard');

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="requests-header">
        <div class="header-left">
          <div class="page-icon">
            <i class="fas fa-inbox"></i>
          </div>
          <div>
            <h2>Client Requests</h2>
            <p class="page-subtitle">System requests submitted from qoechtech.com</p>
          </div>
        </div>
        <div class="header-actions">
          <button id="refresh-requests-btn" class="btn btn-outline">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div id="requests-stats" class="requests-stats-grid">
        ${renderPlaceholderStats()}
      </div>

      <!-- Filters -->
      <div class="requests-toolbar">
        <div class="filter-tabs" id="status-tabs">
          <button class="tab-btn active" data-status="all">
            <i class="fas fa-list"></i> All
          </button>
          <button class="tab-btn" data-status="new">
            <i class="fas fa-star"></i> New
          </button>
          <button class="tab-btn" data-status="reviewing">
            <i class="fas fa-eye"></i> Reviewing
          </button>
          <button class="tab-btn" data-status="approved">
            <i class="fas fa-check"></i> Approved
          </button>
          <button class="tab-btn" data-status="rejected">
            <i class="fas fa-times"></i> Rejected
          </button>
          <button class="tab-btn" data-status="converted">
            <i class="fas fa-rocket"></i> Converted
          </button>
        </div>

        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="request-search" placeholder="Search by name, email, title, or reference code...">
        </div>

        <select id="priority-filter" class="filter-select">
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select id="sort-filter" class="filter-select">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">By Priority</option>
        </select>
      </div>

      <!-- Requests Container -->
      <div id="requests-container">
        <div class="empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading requests...</p>
        </div>
      </div>
    </div>
  `;

  initSidebar();

  // ==================== STATE ====================
  let allRequests = [];
  let currentStatus = 'all';
  let currentPriority = 'all';
  let currentSearch = '';
  let currentSort = 'newest';
  let searchDebounce = null;

  // ==================== DOM ====================
  const statsContainer = document.getElementById('requests-stats');
  const container = document.getElementById('requests-container');
  const searchInput = document.getElementById('request-search');
  const prioritySelect = document.getElementById('priority-filter');
  const sortSelect = document.getElementById('sort-filter');
  const statusTabs = document.getElementById('status-tabs');

  // ==================== HELPERS ====================
  const escapeHtml = (text) =>
    text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const formatRelativeDate = (iso) => {
    if (!iso) return '—';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const priorityBadge = (p) => {
    const map = {
      high: '<span class="badge priority-high">HIGH</span>',
      medium: '<span class="badge priority-medium">MEDIUM</span>',
      low: '<span class="badge priority-low">LOW</span>',
    };
    return map[p] || map.medium;
  };

  const statusBadge = (s) => {
    const map = {
      new: '<span class="badge status-planned">NEW</span>',
      reviewing: '<span class="badge status-in-progress">REVIEWING</span>',
      approved: '<span class="badge status-completed">APPROVED</span>',
      rejected: '<span class="badge badge-overdue">REJECTED</span>',
      converted: '<span class="badge status-completed">CONVERTED</span>',
    };
    return map[s] || map.new;
  };

  // ==================== LOADING ====================
  async function loadRequests() {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading requests...</p>
      </div>
    `;

    try {
      const filters = {};
      if (currentStatus !== 'all') filters.status = currentStatus;
      if (currentPriority !== 'all') filters.priority = currentPriority;
      if (currentSearch) filters.search = currentSearch;
      if (currentSort !== 'newest') filters.sort = currentSort;

      allRequests = await systemRequestService.getRequests(filters);
      renderRequests();
    } catch (err) {
      console.error('Failed to load requests:', err);
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to load requests. Please try again.</p>
        </div>
      `;
      showToast('Failed to load requests', 'error');
    }
  }

  async function loadStats() {
    try {
      const stats = await systemRequestService.getStats();
      statsContainer.innerHTML = renderStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // ==================== RENDERING ====================
  function renderPlaceholderStats() {
    return `
      <div class="stat-card glass-card"><div class="stat-info"><h3>Total</h3><p>--</p></div></div>
      <div class="stat-card glass-card"><div class="stat-info"><h3>New</h3><p>--</p></div></div>
      <div class="stat-card glass-card"><div class="stat-info"><h3>Approved</h3><p>--</p></div></div>
      <div class="stat-card glass-card"><div class="stat-info"><h3>Converted</h3><p>--</p></div></div>
    `;
  }

  function renderStats(stats) {
    return `
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(62,224,127,0.1); color: var(--primary);">
          <i class="fas fa-inbox"></i>
        </div>
        <div class="stat-info">
          <h3>Total</h3>
          <p>${stats.total || 0}</p>
          ${stats.new_this_week > 0 ? `<span class="stat-trend">+${stats.new_this_week} this week</span>` : ''}
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(90,200,250,0.1); color: var(--cyan);">
          <i class="fas fa-star"></i>
        </div>
        <div class="stat-info">
          <h3>New</h3>
          <p>${stats.new_count || 0}</p>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(255,184,0,0.1); color: var(--status-dev);">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-info">
          <h3>Approved</h3>
          <p>${stats.approved || 0}</p>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: rgba(167,139,250,0.1); color: var(--status-info);">
          <i class="fas fa-rocket"></i>
        </div>
        <div class="stat-info">
          <h3>Converted</h3>
          <p>${stats.converted || 0}</p>
        </div>
      </div>
      ${stats.high_priority > 0 ? `
      <div class="stat-card glass-card stat-alert">
        <div class="stat-icon" style="background: rgba(255,92,92,0.15); color: var(--status-error);">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-info">
          <h3>High Priority</h3>
          <p>${stats.high_priority}</p>
        </div>
      </div>
      ` : ''}
    `;
  }

  function renderRequests() {
    if (allRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No requests found. Try changing filters or refreshing.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="requests-list">
        ${allRequests.map((r) => renderRequestCard(r)).join('')}
      </div>
    `;
  }

  function renderRequestCard(r) {
    return `
      <div class="request-card glass-card" data-id="${r.id}">
        <div class="request-card-header">
          <div class="request-card-ref">
            <i class="fas fa-hashtag"></i> ${escapeHtml(r.reference_code)}
          </div>
          <div class="request-card-badges">
            ${statusBadge(r.status)}
            ${priorityBadge(r.priority)}
          </div>
        </div>

        <div class="request-card-body">
          <h3 class="request-card-title">${escapeHtml(r.title)}</h3>
          <p class="request-card-system-type">
            <i class="fas fa-cube"></i> ${escapeHtml(r.system_type)}
          </p>
          <p class="request-card-description">${escapeHtml(r.description)}</p>
        </div>

        <div class="request-card-meta">
          <span class="request-meta-item">
            <i class="fas fa-user"></i>
            <span>${escapeHtml(r.full_name)}</span>
          </span>
          ${r.company ? `
          <span class="request-meta-item">
            <i class="fas fa-building"></i>
            <span>${escapeHtml(r.company)}</span>
          </span>
          ` : ''}
          <span class="request-meta-item">
            <i class="fas fa-clock"></i>
            <span>${formatRelativeDate(r.created_at)}</span>
          </span>
          ${r.budget_range ? `
          <span class="request-meta-item">
            <i class="fas fa-dollar-sign"></i>
            <span>${escapeHtml(r.budget_range)}</span>
          </span>
          ` : ''}
        </div>

        <div class="request-card-footer">
          <span class="request-card-hint">
            <i class="fas fa-mouse-pointer"></i> Click to view details
          </span>
          <button class="btn btn-sm btn-primary view-request-btn" data-id="${r.id}">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
      </div>
    `;
  }

  // ==================== EVENTS ====================
  function bindEvents() {
    // Status tabs
    statusTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      statusTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      loadRequests();
    });

    // Search with debounce
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        loadRequests();
      }, 300);
    });

    // Priority filter
    prioritySelect.addEventListener('change', () => {
      currentPriority = prioritySelect.value;
      loadRequests();
    });

    // Sort
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      loadRequests();
    });

    // Refresh button
    document.getElementById('refresh-requests-btn').addEventListener('click', () => {
      loadStats();
      loadRequests();
    });

    // Card click → open detail modal
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.request-card');
      if (!card) return;
      const id = card.dataset.id;
      const request = allRequests.find((r) => String(r.id) === String(id));
      if (!request) return;

      openRequestDetailModal(request, () => {
        loadStats();
        loadRequests();
      });
    });
  }

  // ==================== INIT ====================
  bindEvents();
  await Promise.all([loadStats(), loadRequests()]);
}
