// ============================================================
// EAGLEVISION CLOUDBOARD — DASHBOARD PAGE
// ============================================================

import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { dashboardService }     from '../../services/dashboardService.js';
import { projectService }       from '../../services/projectService.js';
import { salesService }         from '../../services/salesService.js';
import { systemRequestService } from '../../services/systemRequestService.js';
import { alertsService }        from '../../services/alertsService.js';
import { uploadImage }          from '../../services/uploadService.js';
import { showModal }            from '../../components/modal.js';
import { renderProjectForm }    from '../../components/projectForm.js';
import { renderSaleForm }       from '../../components/saleForm.js';
import { renderReviewUpdateForm } from '../../components/reviewUpdateForm.js';
import { showToast }            from '../../utils/notifications.js';
import { escapeHtml }           from '../../utils/dom.js';
import { format }               from '../../utils/format.js';
import { registerCleanup }      from '../../utils/pageLifecycle.js';
import {
  CHART_COLORS,
  CHART_DEFAULTS,
  PROJECT_STATUS,
} from '../../config/constants.js';


// ============================================================
// MODULE STATE
// ============================================================
let statusChart = null;
let expiringDomains = [];
let lastUpdatedTimer = null;


// ============================================================
// PAGE ENTRY
// ============================================================
export async function dashboardPage() {
  // Reset module state on each mount
  statusChart = null;
  expiringDomains = [];

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content compact-dashboard">

      <!-- HEADER -->
      <div class="dashboard-header-enhanced">
        <div class="dashboard-greeting">
          <h2 id="greeting-text">${getGreeting()} 👋</h2>
          <p class="dashboard-greeting-subtitle" id="greeting-subtitle">
            Loading your dashboard...
          </p>
          <span class="dashboard-last-updated" id="last-updated">
            <i class="fas fa-sync-alt"></i> Updated just now
          </span>
        </div>
        <div class="quick-actions">
          <button id="add-project-btn" class="btn btn-primary" type="button">
            <i class="fas fa-plus"></i> Add Project
          </button>
          <button id="record-sale-btn" class="btn btn-outline" type="button">
            <i class="fas fa-receipt"></i> Record Sale
          </button>
        </div>
      </div>

      <!-- KPI CARDS -->
      <div id="kpi-container" class="kpi-grid">
        ${renderPlaceholderKPIs()}
      </div>

      <!-- Pending revenue -->
      <div id="pending-revenue-container"></div>

      <!-- ROW 1: Chart + Reviews -->
      <div class="dashboard-row chart-review-row">
        <div class="card chart-card compact-chart">
          <h3><i class="fas fa-chart-pie"></i> Status Breakdown</h3>
          <canvas id="statusChartCanvas"></canvas>
        </div>
        <div class="card reviews-card">
          <div class="dashboard-widget-header">
            <h3 class="dashboard-widget-title">
              <i class="fas fa-calendar-check"></i> Reviews
            </h3>
            <span class="dashboard-widget-count" id="reviews-count">0</span>
          </div>
          <div id="overdue-reviews-container"></div>
          <div id="reviews-container"></div>
        </div>
      </div>

      <!-- ROW 2: Requests + Alerts -->
      <div class="dashboard-widgets-grid">
        <div class="dashboard-widget" id="client-requests-widget">
          <div class="dashboard-widget-header">
            <h3 class="dashboard-widget-title">
              <i class="fas fa-inbox"></i> Client Requests
            </h3>
            <span class="dashboard-widget-count" id="requests-count">0 new</span>
          </div>
          <div class="dashboard-widget-body" id="requests-widget-body">
            <div class="dashboard-empty">
              <i class="fas fa-spinner fa-spin dashboard-empty-icon"></i>
              <p class="dashboard-empty-text">Loading requests...</p>
            </div>
          </div>
          <div class="dashboard-widget-footer">
            <a href="#client-requests" class="dashboard-widget-link">
              View All <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>

        <div class="dashboard-widget" id="alerts-widget">
          <div class="dashboard-widget-header">
            <h3 class="dashboard-widget-title">
              <i class="fas fa-bell"></i> Alerts
            </h3>
            <span class="dashboard-widget-count" id="alerts-count">0</span>
          </div>
          <div class="dashboard-widget-body" id="alerts-widget-body">
            <div class="dashboard-empty">
              <i class="fas fa-spinner fa-spin dashboard-empty-icon"></i>
              <p class="dashboard-empty-text">Loading alerts...</p>
            </div>
          </div>
          <div class="dashboard-widget-footer">
            <a href="#alerts" class="dashboard-widget-link">
              View All <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- ROW 3: County + For-Sale -->
      <div class="dashboard-row">
        <div id="county-breakdown-container" class="card compact-card"></div>
        <div id="for-sale-container" class="card compact-card"></div>
      </div>

    </div>
  `;

  initSidebar();
  attachEventListeners();

  // Initial load
  refreshDashboard();
  updateLastUpdatedTimestamp();

  // Refresh timer
  if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
  lastUpdatedTimer = setInterval(() => {
    refreshDashboard();
    updateLastUpdatedTimestamp();
  }, 60000);

  // Cleanup hook for the router
  registerCleanup(() => {
    if (lastUpdatedTimer) {
      clearInterval(lastUpdatedTimer);
      lastUpdatedTimer = null;
    }
    if (statusChart) {
      statusChart.destroy();
      statusChart = null;
    }
  });
}


// ============================================================
// EVENT LISTENERS
// ============================================================
function attachEventListeners() {
  // KPI clicks — ignore placeholder cards
  document.getElementById('kpi-container')?.addEventListener('click', (e) => {
    const card = e.target.closest('.clickable');
    if (!card) return;
    if (card.dataset.loading === 'true') return;  // guard

    const type = card.dataset.kpiType;
    if (!type) return;
    openKpiModal(type, refreshDashboard);
  });

  // Add Project
  document.getElementById('add-project-btn')?.addEventListener('click', onAddProject);

  // Record Sale
  document.getElementById('record-sale-btn')?.addEventListener('click', onRecordSale);
}


// ============================================================
// DATA LOADING
// ============================================================
async function refreshDashboard() {
  // Fire all requests in parallel
  const promises = {
    kpis:            safe(dashboardService.getKPIs(), {}),
    pendingRevenue:  safe(dashboardService.getPendingRevenue(), { total_pending: 0 }),
    upcomingReviews: safe(dashboardService.getUpcomingReviews(), []),
    overdueReviews:  safe(dashboardService.getOverdueReviews(), []),
    statusDist:      safe(dashboardService.getStatusDistribution(), []),
    counties:        safe(dashboardService.getCountyBreakdown(), []),
    forSale:         safe(dashboardService.getForSaleProjects(), []),
    expiringDomains: safe(dashboardService.getExpiringDomains(), []),
    requestsStats:   safe(systemRequestService.getStats(), {}),
    recentRequests:  safe(systemRequestService.getRequests({ status: 'new', sort: 'newest' }), []),
    alerts:          safe(alertsService.getAll(), []),
  };

  // KPIs + greeting
  Promise.all([promises.kpis, promises.expiringDomains])
    .then(([kpis, domains]) => {
      expiringDomains = domains;
      const kpiEl = document.getElementById('kpi-container');
      if (kpiEl) kpiEl.innerHTML = renderClickableKPIs(kpis, domains.length);
      updateGreetingSubtitle(kpis, domains.length);
    })
    .catch(devOnly('KPIs'));

  // Pending revenue card
  promises.pendingRevenue.then((pending) => {
    const container = document.getElementById('pending-revenue-container');
    if (!container) return;
    container.innerHTML = renderPendingRevenueCard(pending);
  });

  // Reviews + chart + county + for-sale
  const [upcoming, overdue, dist, counties, forSale] = await Promise.all([
    promises.upcomingReviews,
    promises.overdueReviews,
    promises.statusDist,
    promises.counties,
    promises.forSale,
  ]);

  renderStatusChart(dist);
  setHTML('overdue-reviews-container', renderOverdueReviewsCompact(overdue));
  setHTML('reviews-container', renderUpcomingReviewsCompact(upcoming));
  setText('reviews-count', String((overdue?.length || 0) + (upcoming?.length || 0)));

  setHTML(
    'county-breakdown-container',
    renderCountyBreakdown(counties) ||
      '<p class="empty-state small"><i class="fas fa-map-marker-alt"></i> No location data</p>'
  );
  setHTML('for-sale-container', renderForSaleProjectsCompact(forSale));

  // Requests widget
  Promise.all([promises.requestsStats, promises.recentRequests])
    .then(([stats, requests]) => renderRequestsWidget(stats, requests))
    .catch(devOnly('requests widget'));

  // Alerts widget
  promises.alerts
    .then(renderAlertsWidget)
    .catch(devOnly('alerts widget'));
}


// ============================================================
// KPI RENDERING
// ============================================================
function renderPlaceholderKPIs() {
  const card = (type, icon, label) => `
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="${type}" data-loading="true">
      <i class="fas ${icon} kpi-icon"></i>
      <h3>${label}</h3>
      <div class="value kpi-placeholder">—</div>
    </div>
  `;
  return (
    card('projects',  'fa-folder-open',       'Total Projects') +
    card('overdue',   'fa-exclamation-circle', 'Overdue Reviews') +
    card('clients',   'fa-users',              'Active Clients') +
    card('domains',   'fa-globe',              'Domains Expiring') +
    card('revenue',   'fa-dollar-sign',        'Total Revenue')
  );
}

function renderClickableKPIs(data = {}, domainsCount = 0) {
  const card = (type, icon, label, value) => `
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="${type}">
      <i class="fas ${icon} kpi-icon"></i>
      <h3>${label}</h3>
      <div class="value">${value}</div>
    </div>
  `;
  return (
    card('projects', 'fa-folder-open',        'Total Projects',    format.number(data.total_projects)) +
    card('overdue',  'fa-exclamation-circle', 'Overdue Reviews',   format.number(data.overdue_reviews)) +
    card('clients',  'fa-users',              'Active Clients',    format.number(data.active_clients)) +
    card('domains',  'fa-globe',              'Domains Expiring',  format.number(domainsCount)) +
    card('revenue',  'fa-dollar-sign',        'Total Revenue',     format.currency(data.total_revenue))
  );
}

function renderPendingRevenueCard(pending) {
  const total = Number(pending?.total_pending) || 0;
  if (total <= 0) return '';
  return `
    <div class="card kpi-card pending-revenue-card compact-kpi">
      <i class="fas fa-hand-holding-usd kpi-icon"></i>
      <h3>Pending Revenue</h3>
      <div class="value">${format.currency(total)}</div>
    </div>
  `;
}


// ============================================================
// GREETING
// ============================================================
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function updateGreetingSubtitle(kpis = {}, domainsCount = 0) {
  const el = document.getElementById('greeting-subtitle');
  if (!el) return;

  const parts = [];

  if (Number(kpis.overdue_reviews) > 0) {
    const n = kpis.overdue_reviews;
    parts.push(
      `<span class="urgent"><i class="fas fa-exclamation-circle"></i> ${n} review${n !== 1 ? 's' : ''} overdue</span>`
    );
  }

  if (domainsCount > 0) {
    parts.push(`<span>${domainsCount} domain${domainsCount !== 1 ? 's' : ''} expiring</span>`);
  }

  el.innerHTML = parts.length === 0
    ? 'Everything looks good — no urgent items today.'
    : parts.join(' <span class="separator">·</span> ');
}

function updateLastUpdatedTimestamp() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  const now = new Date();
  el.innerHTML = `<i class="fas fa-sync-alt"></i> Updated ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}


// ============================================================
// WIDGET RENDERERS
// ============================================================
function renderRequestsWidget(stats = {}, requests = []) {
  setText('requests-count', `${stats?.new_count || 0} new`);

  const bodyEl = document.getElementById('requests-widget-body');
  if (!bodyEl) return;

  if (!requests || requests.length === 0) {
    bodyEl.innerHTML = emptyState('fa-inbox', 'No new requests');
    return;
  }

  bodyEl.innerHTML = `
    <div class="requests-widget-list">
      ${requests.slice(0, 4).map((r) => `
        <a href="#client-requests" class="requests-widget-item">
          <div class="requests-widget-icon"><i class="fas fa-file-code"></i></div>
          <div class="requests-widget-content">
            <p class="requests-widget-title">${escapeHtml(r.title)}</p>
            <div class="requests-widget-meta">
              <span class="priority-dot ${r.priority || 'medium'}"></span>
              <span>${escapeHtml(r.full_name)}</span>
              <span>·</span>
              <span>${format.timeAgo(r.created_at)}</span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

function renderAlertsWidget(alerts = []) {
  const countEl = document.getElementById('alerts-count');
  const bodyEl = document.getElementById('alerts-widget-body');
  if (!countEl || !bodyEl) return;

  if (!alerts || alerts.length === 0) {
    countEl.textContent = '0';
    bodyEl.innerHTML = emptyState('fa-check-circle', 'All systems operational');
    return;
  }

  const order = { critical: 1, warning: 2, info: 3 };
  const sorted = [...alerts].sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3));
  countEl.textContent = String(alerts.length);

  bodyEl.innerHTML = `
    <div class="alerts-widget-list">
      ${sorted.slice(0, 4).map((a) => {
        const sev = a.severity || 'info';
        const icon = sev === 'critical' ? 'fa-exclamation-triangle'
                   : sev === 'warning'  ? 'fa-exclamation-circle'
                   : 'fa-info-circle';
        return `
          <a href="#alerts" class="alerts-widget-item severity-${sev}">
            <div class="alerts-widget-icon"><i class="fas ${icon}"></i></div>
            <div class="alerts-widget-content">
              <p class="alerts-widget-title">${escapeHtml(a.title || a.message || 'Alert')}</p>
              <p class="alerts-widget-meta">${format.timeAgo(a.created_at)}</p>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

function renderOverdueReviewsCompact(overdue = []) {
  if (!overdue || overdue.length === 0) return '';
  const now = new Date();
  return `
    <div class="reviews-widget-section">
      <h4 class="reviews-widget-subtitle overdue">
        <i class="fas fa-exclamation-circle"></i> Overdue
      </h4>
      <ul class="reviews-widget-list">
        ${overdue.slice(0, 4).map((r) => {
          const days = Math.floor((now - new Date(r.next_review_date)) / 86400000);
          return `
            <li class="reviews-widget-item">
              <span class="reviews-widget-name">${escapeHtml(r.name)}</span>
              <span class="reviews-widget-badge overdue">${days}d</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function renderUpcomingReviewsCompact(upcoming = []) {
  if (!upcoming || upcoming.length === 0) {
    return '<p class="dashboard-empty-text" style="text-align:center;padding:1rem 0;">No upcoming reviews</p>';
  }
  return `
    <div class="reviews-widget-section">
      <h4 class="reviews-widget-subtitle">
        <i class="fas fa-calendar-alt"></i> Upcoming
      </h4>
      <ul class="reviews-widget-list">
        ${upcoming.slice(0, 4).map((r) => `
          <li class="reviews-widget-item">
            <span class="reviews-widget-name">${escapeHtml(r.name)}</span>
            <span class="reviews-widget-badge upcoming">
              ${format.date(r.next_review_date, 'short')}
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderCountyBreakdown(counties = []) {
  if (!counties || counties.length === 0) return '';
  return `
    <h3 class="dashboard-widget-title" style="margin-bottom:0.8rem;border-bottom:1px solid var(--border-subtle);padding-bottom:0.6rem;">
      <i class="fas fa-map-marker-alt"></i> Top Counties
    </h3>
    <ul class="compact-widget-list">
      ${counties.map((c) => `
        <li class="compact-widget-item">
          <span class="compact-widget-label">
            <i class="fas fa-location-dot"></i> ${escapeHtml(c.location)}
          </span>
          <span class="compact-widget-value">${format.number(c.project_count)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderForSaleProjectsCompact(forSale = []) {
  const header = `
    <h3 class="dashboard-widget-title" style="margin-bottom:0.8rem;border-bottom:1px solid var(--border-subtle);padding-bottom:0.6rem;">
      <i class="fas fa-tag"></i> For Sale
    </h3>
  `;

  if (!forSale || forSale.length === 0) {
    return header + emptyState('fa-tag', 'No projects for sale');
  }

  return header + `
    <ul class="compact-widget-list">
      ${forSale.map((p) => `
        <li class="compact-widget-item">
          <span class="compact-widget-label">
            <i class="fas fa-folder-open"></i> ${escapeHtml(p.name)}
          </span>
          <span class="compact-widget-value">${format.currency(p.asking_price || 0)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}


// ============================================================
// CHART
// ============================================================
function renderStatusChart(distribution = []) {
  if (!distribution || distribution.length === 0) return;

  const canvas = document.getElementById('statusChartCanvas');
  if (!canvas) return;

  if (statusChart) {
    statusChart.destroy();
    statusChart = null;
  }

  const labels = distribution.map((d) => d.status);
  const counts = distribution.map((d) => parseInt(d.count, 10) || 0);

  const colors = labels.map((l) => {
    const key = (l || '').toLowerCase();
    return PROJECT_STATUS[key]?.color || CHART_COLORS.muted;
  });

  statusChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      ...CHART_DEFAULTS,
      cutout: '60%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          position: 'right',
          labels: {
            padding: 10,
            usePointStyle: true,
            boxWidth: 8,
            color: CHART_COLORS.text,
            font: { family: "'Inter', sans-serif", size: 12 },
          },
        },
      },
    },
  });
}


// ============================================================
// ACTIONS
// ============================================================
function onAddProject() {
  const { close } = showModal(renderProjectForm());
  const form = document.getElementById('project-form');
  if (!form) return;

  document.querySelector('.cancel-form-btn')?.addEventListener('click', close);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('project-thumbnail-file');
    const urlInput  = document.getElementById('project-thumbnail');

    if (fileInput && fileInput.files.length > 0) {
      try {
        showToast('Uploading image...', 'info');
        const { url } = await uploadImage(fileInput.files[0]);
        if (urlInput) urlInput.value = url;
      } catch (err) {
        showToast(err.message, 'error');
        return;
      }
    }

    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await projectService.create(data);
      close();
      showToast('Project created', 'success');
      refreshDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function onRecordSale() {
  let allProjects = [];
  try {
    allProjects = await projectService.getAll();
  } catch (_) { /* fallback to empty */ }

  const { close } = showModal(renderSaleForm(allProjects));
  const form = document.getElementById('sale-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await salesService.create(data);
      close();
      showToast('Sale recorded', 'success');
      refreshDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}


// ============================================================
// KPI MODALS
// ============================================================
async function openKpiModal(type, refreshCallback = null) {
  switch (type) {
    case 'projects': await showProjectsSummaryModal(); break;
    case 'overdue':  await showOverdueSummaryModal(refreshCallback); break;
    case 'clients':  await showClientsSummaryModal(); break;
    case 'revenue':  await showRevenueSummaryModal(); break;
    case 'domains':  await showExpiringDomainsModal(); break;
  }
}

async function showExpiringDomainsModal() {
  const domains = expiringDomains || [];
  const now = new Date();
  showModal(`
    <div class="modal-header-bar">
      <h2><i class="fas fa-globe"></i> Domains Expiring Soon</h2>
      <span class="modal-count">${domains.length} expiring</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead>
          <tr><th>Project</th><th>Domain</th><th>Registrar</th><th>Expiry Date</th><th>Days Left</th></tr>
        </thead>
        <tbody>
          ${domains.map((d) => {
            const daysLeft = Math.ceil((new Date(d.expiry_date) - now) / 86400000);
            return `
              <tr>
                <td><strong>${escapeHtml(d.name)}</strong></td>
                <td>${escapeHtml(d.domain_name) || '—'}</td>
                <td>${escapeHtml(d.registrar) || '—'}</td>
                <td>${format.date(d.expiry_date)}</td>
                <td><span class="badge ${daysLeft <= 7 ? 'badge-overdue' : 'badge-due-soon'}">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span></td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="5">No domains expiring soon 🎉</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function showProjectsSummaryModal() {
  let projects = [];
  try { projects = await dashboardService.getProjectsSummary(); } catch (_) {}

  showModal(`
    <div class="modal-header-bar">
      <h2><i class="fas fa-folder-open"></i> All Projects</h2>
      <span class="modal-count">${projects.length} total</span>
    </div>
    <input type="text" id="modal-project-search" class="modal-search" placeholder="Search by name or client..." />
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Location</th></tr></thead>
        <tbody id="modal-project-tbody">${renderProjectRows(projects)}</tbody>
      </table>
    </div>
    <p class="modal-no-results hidden" id="modal-no-projects">No matching projects.</p>
  `);

  document.getElementById('modal-project-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#modal-project-tbody tr');
    let visible = 0;
    rows.forEach((row) => {
      const show = row.textContent.toLowerCase().includes(term);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    document.getElementById('modal-no-projects')?.classList.toggle('hidden', visible > 0);
  });
}

function renderProjectRows(projects = []) {
  if (projects.length === 0) return '<tr><td colspan="4">No projects found.</td></tr>';
  return projects.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.client) || '—'}</td>
      <td><span class="status ${(p.status || '').toLowerCase()}">${escapeHtml(p.status)}</span></td>
      <td>${escapeHtml(p.location) || '—'}</td>
    </tr>
  `).join('');
}

async function showOverdueSummaryModal(refreshCallback = null) {
  let overdue = [];
  try { overdue = await dashboardService.getOverdueReviews(); } catch (_) {}
  const now = new Date();

  const modal = showModal(`
    <div class="modal-header-bar">
      <h2><i class="fas fa-exclamation-circle" style="color:var(--status-error);"></i> Overdue Reviews</h2>
      <span class="modal-count">${overdue.length} overdue</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead><tr><th>Name</th><th>Client</th><th>Days Overdue</th><th>Action</th></tr></thead>
        <tbody>
          ${overdue.map((r) => {
            const days = Math.floor((now - new Date(r.next_review_date)) / 86400000);
            return `
              <tr>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td>${escapeHtml(r.client) || '—'}</td>
                <td><span class="badge badge-overdue">${days} day${days !== 1 ? 's' : ''}</span></td>
                <td><button type="button" class="btn btn-sm btn-outline review-update-btn" data-id="${r.id}"><i class="fas fa-sync-alt"></i> Review & Update</button></td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="4">No overdue reviews 🎉</td></tr>'}
        </tbody>
      </table>
    </div>
  `);

  modal.element.querySelectorAll('.review-update-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const projectId = btn.dataset.id;
      modal.close();

      const fullProject = await projectService.getOne(projectId).catch(() => null);
      const childModal = showModal(renderReviewUpdateForm(fullProject || { id: projectId }));
      const form = document.getElementById('review-update-form');
      if (!form) return;

      document.querySelector('.cancel-review-update-btn')?.addEventListener('click', () => childModal.close());

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          await projectService.reviewAndUpdate(projectId, data);
          childModal.close();
          showToast('Review & update saved', 'success');
          if (refreshCallback) await refreshCallback();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  });
}

async function showClientsSummaryModal() {
  let clients = [];
  try { clients = await dashboardService.getClientsSummary(); } catch (_) {}
  const active = clients.filter((c) => c.is_active).length;

  showModal(`
    <div class="modal-header-bar">
      <h2><i class="fas fa-users"></i> Clients</h2>
      <span class="modal-count">${clients.length} total · ${active} active</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead><tr><th>Client</th><th>Projects</th><th>Status</th></tr></thead>
        <tbody>
          ${clients.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.client)}</strong></td>
              <td>${format.number(c.project_count)}</td>
              <td>${c.is_active
                ? '<span class="badge badge-upcoming">Active</span>'
                : '<span class="badge status-cancelled">Inactive</span>'}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No clients yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
}

async function showRevenueSummaryModal() {
  let sales = [];
  try { sales = await dashboardService.getRevenueSummary(); } catch (_) {}
  const total = sales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  showModal(`
    <div class="modal-header-bar">
      <h2><i class="fas fa-dollar-sign"></i> Revenue Breakdown</h2>
      <span class="modal-count">${sales.length} sales</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead><tr><th>Project</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          ${sales.map((s) => `
            <tr>
              <td>${escapeHtml(s.project_name)}</td>
              <td>${format.currency(s.amount)}</td>
              <td>${format.date(s.sale_date)}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No sales recorded yet.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="text-align:right;font-weight:700;">Total Revenue</td>
            <td style="font-weight:700;">${format.currency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `);
}


// ============================================================
// INTERNAL HELPERS
// ============================================================
function emptyState(icon, text) {
  return `
    <div class="dashboard-empty">
      <i class="fas ${icon} dashboard-empty-icon"></i>
      <p class="dashboard-empty-text">${escapeHtml(text)}</p>
    </div>
  `;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safe(promise, fallback) {
  return promise.catch(() => fallback);
}

function devOnly(label) {
  return (err) => {
    if (import.meta?.env?.DEV) {
      console.warn(`[dashboard] ${label} failed:`, err);
    }
  };
}
