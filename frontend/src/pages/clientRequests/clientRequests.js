// ============================================================
// EAGLEVISION CLOUDBOARD — CLIENT REQUESTS PAGE
// ============================================================
// Lists inbound system requests (from qoechtech.com).
// Features:
//   • Stats grid (total, new, approved, converted, high priority)
//   • Status tabs + priority filter + sort + search
//   • Request cards → detail modal
//   • Refresh button
// ============================================================

import { renderSidebar, initSidebar }      from '../../components/sidebar.js';
import { systemRequestService }            from '../../services/systemRequestService.js';
import { openRequestDetailModal }          from '../../components/requestDetailModal.js';
import { showToast }                       from '../../utils/notifications.js';
import { escapeHtml }                      from '../../utils/dom.js';
import { format }                          from '../../utils/format.js';
import { registerCleanup }                 from '../../utils/pageLifecycle.js';


// ============================================================
// CONSTANTS
// ============================================================
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TABS = [
  { key: 'all',       label: 'All',        icon: 'fa-list' },
  { key: 'new',       label: 'New',        icon: 'fa-star' },
  { key: 'reviewing', label: 'Reviewing',  icon: 'fa-eye' },
  { key: 'approved',  label: 'Approved',   icon: 'fa-check' },
  { key: 'rejected',  label: 'Rejected',   icon: 'fa-times' },
  { key: 'converted', label: 'Converted',  icon: 'fa-rocket' },
];


// ============================================================
// PAGE ENTRY
// ============================================================
export async function clientRequestsPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="requests-header">
        <div class="header-left">
          <div class="page-icon"><i class="fas fa-inbox"></i></div>
          <div>
            <h2>Client Requests</h2>
            <p class="page-subtitle">System requests submitted from qoechtech.com</p>
          </div>
        </div>
        <div class="header-actions">
          <button id="refresh-requests-btn" class="btn btn-outline" type="button">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <div id="requests-stats" class="requests-stats-grid">
        ${renderPlaceholderStats()}
      </div>

      <div class="requests-toolbar">
        <div class="filter-tabs" id="status-tabs">
          ${STATUS_TABS.map((t) => `
            <button type="button" class="tab-btn ${t.key === 'all' ? 'active' : ''}" data-status="${t.key}">
              <i class="fas ${t.icon}"></i> ${t.label}
            </button>
          `).join('')}
        </div>

        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="request-search" placeholder="Search by name, email, title, or reference code...">
        </div>

        <select id="priority-filter" class="filter-select" aria-label="Filter by priority">
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select id="sort-filter" class="filter-select" aria-label="Sort requests">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">By Priority</option>
        </select>
      </div>

      <div id="requests-container">
        <div class="empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading requests...</p>
        </div>
      </div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let allRequests = [];
  let currentStatus   = 'all';
  let currentPriority = 'all';
  let currentSearch   = '';
  let currentSort     = 'newest';
  let searchTimer     = null;
  let requestSeq      = 0;   // for stale-response detection


  // ---------- DOM refs ----------
  const statsContainer = document.getElementById('requests-stats');
  const container      = document.getElementById('requests-container');
  const searchInput    = document.getElementById('request-search');
  const prioritySelect = document.getElementById('priority-filter');
  const sortSelect     = document.getElementById('sort-filter');
  const statusTabs     = document.getElementById('status-tabs');
  const refreshBtn     = document.getElementById('refresh-requests-btn');


  // ---------- HELPERS ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[clientRequests] ${label}:`, err);
    };
  }


  // ============================================================
  // LOADING
  // ============================================================
  async function loadRequests() {
    const seq = ++requestSeq;

    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading requests...</p>
      </div>
    `;

    try {
      const filters = {};
      if (currentStatus !== 'all')     filters.status   = currentStatus;
      if (currentPriority !== 'all')   filters.priority = currentPriority;
      if (currentSearch)               filters.search   = currentSearch;
      if (currentSort !== 'newest')    filters.sort     = currentSort;

      const result = await systemRequestService.getRequests(filters);

      // Ignore stale responses (e.g., rapid filter changes)
      if (seq !== requestSeq) return;

      allRequests = Array.isArray(result) ? result : [];
      renderRequests();
    } catch (err) {
      if (seq !== requestSeq) return;

      devOnly('load requests')(err);
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
      statsContainer.innerHTML = renderStats(stats || {});
    } catch (err) {
      devOnly('load stats')(err);
    }
  }


  // ============================================================
  // RENDERING
  // ============================================================
  function renderPlaceholderStats() {
    const card = (label) => `
      <div class="stat-card">
        <div class="stat-info">
          <h3>${label}</h3>
          <p class="kpi-placeholder">—</p>
        </div>
      </div>
    `;
    return card('Total') + card('New') + card('Approved') + card('Converted');
  }

  function renderStats(stats) {
    const cards = [
      {
        label: 'Total',
        value: stats.total || 0,
        icon:  'fa-inbox',
        color: 'var(--primary)',
        tint:  'var(--primary-tint)',
        trend: stats.new_this_week > 0 ? `+${stats.new_this_week} this week` : '',
      },
      {
        label: 'New',
        value: stats.new_count || 0,
        icon:  'fa-star',
        color: 'var(--cyan)',
        tint:  'var(--cyan-soft)',
      },
      {
        label: 'Approved',
        value: stats.approved || 0,
        icon:  'fa-check-circle',
        color: 'var(--status-dev)',
        tint:  'rgba(217, 119, 6, 0.08)',
      },
      {
        label: 'Converted',
        value: stats.converted || 0,
        icon:  'fa-rocket',
        color: 'var(--status-info)',
        tint:  'rgba(124, 58, 237, 0.08)',
      },
    ];

    const html = cards.map((c) => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${c.tint}; color:${c.color};">
          <i class="fas ${c.icon}"></i>
        </div>
        <div class="stat-info">
          <h3>${c.label}</h3>
          <p>${format.number(c.value)}</p>
          ${c.trend ? `<span class="stat-trend">${escapeHtml(c.trend)}</span>` : ''}
        </div>
      </div>
    `).join('');

    const alertCard = (Number(stats.high_priority) > 0) ? `
      <div class="stat-card stat-alert">
        <div class="stat-icon" style="background:rgba(220,38,38,0.08); color:var(--status-error);">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-info">
          <h3>High Priority</h3>
          <p>${format.number(stats.high_priority)}</p>
        </div>
      </div>
    ` : '';

    return html + alertCard;
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
        ${allRequests.map(renderRequestCard).join('')}
      </div>
    `;
  }

  function renderRequestCard(r) {
    const budgetPart = r.budget_range ? `
      <span class="request-meta-item">
        <i class="fas fa-dollar-sign"></i>
        <span>${escapeHtml(r.budget_range)}</span>
      </span>
    ` : '';

    const companyPart = r.company ? `
      <span class="request-meta-item">
        <i class="fas fa-building"></i>
        <span>${escapeHtml(r.company)}</span>
      </span>
    ` : '';

    return `
      <div class="request-card" data-id="${escapeHtml(r.id)}">
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
          ${companyPart}
          <span class="request-meta-item">
            <i class="fas fa-clock"></i>
            <span>${format.timeAgo(r.created_at)}</span>
          </span>
          ${budgetPart}
        </div>

        <div class="request-card-footer">
          <span class="request-card-hint">
            <i class="fas fa-mouse-pointer"></i> Click to view details
          </span>
          <button type="button" class="btn btn-sm btn-primary view-request-btn" tabindex="-1" aria-hidden="true">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
      </div>
    `;
  }


  // ============================================================
  // BADGE BUILDERS
  // ============================================================
  function statusBadge(status) {
    const map = {
      new:       '<span class="badge status-planned">NEW</span>',
      reviewing: '<span class="badge status-in-progress">REVIEWING</span>',
      approved:  '<span class="badge status-completed">APPROVED</span>',
      rejected:  '<span class="badge badge-overdue">REJECTED</span>',
      converted: '<span class="badge status-completed">CONVERTED</span>',
    };
    return map[status] || map.new;
  }

  function priorityBadge(priority) {
    const map = {
      high:   '<span class="badge priority-high">HIGH</span>',
      medium: '<span class="badge priority-medium">MEDIUM</span>',
      low:    '<span class="badge priority-low">LOW</span>',
    };
    return map[priority] || map.medium;
  }


  // ============================================================
  // EVENTS
  // ============================================================
  function bindEvents() {
    // Status tabs
    statusTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      if (btn.classList.contains('active')) return;

      statusTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatus = btn.dataset.status;
      loadRequests();
    });

    // Debounced search
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        loadRequests();
      }, SEARCH_DEBOUNCE_MS);
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

    // Refresh
    refreshBtn.addEventListener('click', () => {
      loadStats();
      loadRequests();
    });
  }

  // Card click → detail modal (delegated)
  const onContainerClick = (e) => {
    const card = e.target.closest('.request-card');
    if (!card) return;

    const id = card.dataset.id;
    const request = allRequests.find((r) => String(r.id) === String(id));
    if (!request) return;

    openRequestDetailModal(request, () => {
      loadStats();
      loadRequests();
    });
  };


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    clearTimeout(searchTimer);
    searchTimer = null;
    container.removeEventListener('click', onContainerClick);
    requestSeq++;   // invalidate any in-flight response
  });


  // ============================================================
  // INIT
  // ============================================================
  bindEvents();
  container.addEventListener('click', onContainerClick);

  await Promise.all([loadStats(), loadRequests()]);
}
