import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { dashboardService } from '../../services/dashboardService.js';
import { projectService } from '../../services/projectService.js';
import { salesService } from '../../services/salesService.js';
import { systemRequestService } from '../../services/systemRequestService.js';
import { alertsService } from '../../services/alertsService.js';
import { uploadImage } from '../../services/uploadService.js';
import { showModal } from '../../components/modal.js';
import { renderProjectForm } from '../../components/projectForm.js';
import { renderSaleForm } from '../../components/saleForm.js';
import { renderReviewUpdateForm } from '../../components/reviewUpdateForm.js';
import { showToast } from '../../utils/notifications.js';

let statusChart = null;
let expiringDomains = [];
let lastUpdatedTimer = null;

export async function dashboardPage() {
  document.body.classList.add('app-dashboard');

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content compact-dashboard">

      <!-- ============ HEADER ============ -->
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
          <button id="add-project-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> Add Project
          </button>
          <button id="record-sale-btn" class="btn btn-outline">
            <i class="fas fa-receipt"></i> Record Sale
          </button>
        </div>
      </div>

      <!-- ============ KPI CARDS ============ -->
      <div id="kpi-container" class="kpi-grid">
        ${renderPlaceholderKPIs()}
      </div>

      <!-- Pending revenue card (conditional) -->
      <div id="pending-revenue-container"></div>

      <!-- ============ ROW 1: Chart + Reviews ============ -->
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

      <!-- ============ ROW 2: Client Requests + Alerts ============ -->
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

      <!-- ============ ROW 3: County + For-Sale ============ -->
      <div class="dashboard-row">
        <div id="county-breakdown-container" class="card compact-card"></div>
        <div id="for-sale-container" class="card compact-card"></div>
      </div>

    </div>
  `;

  initSidebar();

  const escapeHtml = (text) =>
    text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  // ============================================================
  // DATA LOADING
  // ============================================================

  async function refreshDashboard() {
    const kpiPromise = dashboardService.getKPIs();
    const pendingRevenuePromise = dashboardService.getPendingRevenue().catch(() => ({ total_pending: 0 }));
    const upcomingReviewsPromise = dashboardService.getUpcomingReviews().catch(() => []);
    const overdueReviewsPromise = dashboardService.getOverdueReviews().catch(() => []);
    const statusDistPromise = dashboardService.getStatusDistribution().catch(() => []);
    const countiesPromise = dashboardService.getCountyBreakdown().catch(() => []);
    const forSalePromise = dashboardService.getForSaleProjects().catch(() => []);
    const expiringDomainsPromise = dashboardService.getExpiringDomains().catch(() => []);
    const requestsStatsPromise = systemRequestService.getStats().catch(() => ({}));
    const recentRequestsPromise = systemRequestService.getRequests({ status: 'new', sort: 'newest' }).catch(() => []);
    const alertsPromise = alertsService.getAll().catch(() => []);

    // KPI cards
    Promise.all([kpiPromise, expiringDomainsPromise])
      .then(([kpis, domains]) => {
        expiringDomains = domains;
        document.getElementById('kpi-container').innerHTML =
          renderClickableKPIs(kpis, domains.length);
        updateGreetingSubtitle(kpis, domains.length);
      })
      .catch(err => {
        console.warn('Failed to load KPI or expiring domains', err);
      });

    // Pending revenue
    pendingRevenuePromise.then(pendingRevenue => {
      const html = pendingRevenue.total_pending > 0 ? `
        <div class="card kpi-card pending-revenue-card compact-kpi">
          <i class="fas fa-hand-holding-usd kpi-icon"></i>
          <h3>Pending Revenue</h3>
          <div class="value">$${pendingRevenue.total_pending.toLocaleString()}</div>
        </div>
      ` : '';
      document.getElementById('pending-revenue-container').innerHTML = html;
    });

    // Reviews, status chart, county, for-sale
    const [upcomingReviews, overdueReviews, statusDist, counties, forSale] = await Promise.all([
      upcomingReviewsPromise, overdueReviewsPromise, statusDistPromise, countiesPromise, forSalePromise
    ]);

    renderStatusChart(statusDist);
    document.getElementById('overdue-reviews-container').innerHTML = renderOverdueReviewsCompact(overdueReviews);
    document.getElementById('reviews-container').innerHTML = renderUpcomingReviewsCompact(upcomingReviews);
    document.getElementById('reviews-count').textContent = (overdueReviews.length + upcomingReviews.length);

    document.getElementById('county-breakdown-container').innerHTML =
      renderCountyBreakdown(counties) || '<p class="empty-state small"><i class="fas fa-map-marker-alt"></i> No location data</p>';
    document.getElementById('for-sale-container').innerHTML = renderForSaleProjectsCompact(forSale);

    // Client Requests widget
    Promise.all([requestsStatsPromise, recentRequestsPromise])
      .then(([stats, requests]) => {
        renderRequestsWidget(stats, requests);
      })
      .catch(err => {
        console.warn('Failed to load requests widget', err);
      });

    // Alerts widget
    alertsPromise
      .then(alerts => {
        renderAlertsWidget(alerts);
      })
      .catch(err => {
        console.warn('Failed to load alerts widget', err);
      });
  }

  // ============================================================
  // GREETING + HEADER LOGIC
  // ============================================================

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function updateGreetingSubtitle(kpis, domainsCount) {
    const el = document.getElementById('greeting-subtitle');
    if (!el) return;

    const parts = [];

    if (kpis.overdue_reviews > 0) {
      parts.push(
        `<span class="urgent"><i class="fas fa-exclamation-circle"></i> ${kpis.overdue_reviews} review${kpis.overdue_reviews !== 1 ? 's' : ''} overdue</span>`
      );
    }

    if (domainsCount > 0) {
      parts.push(
        `<span>${domainsCount} domain${domainsCount !== 1 ? 's' : ''} expiring</span>`
      );
    }

    if (parts.length === 0) {
      el.innerHTML = 'Everything looks good — no urgent items today.';
    } else {
      el.innerHTML = parts.join(' <span class="separator">·</span> ');
    }
  }

  function updateLastUpdatedTimestamp() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    const now = new Date();
    el.innerHTML = `<i class="fas fa-sync-alt"></i> Updated ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }

  // ============================================================
  // CLIENT REQUESTS WIDGET
  // ============================================================

  function renderRequestsWidget(stats, requests) {
    const countEl = document.getElementById('requests-count');
    const bodyEl = document.getElementById('requests-widget-body');
    if (!countEl || !bodyEl) return;

    const newCount = stats.new_count || 0;
    countEl.textContent = `${newCount} new`;

    if (!requests || requests.length === 0) {
      bodyEl.innerHTML = `
        <div class="dashboard-empty">
          <i class="fas fa-inbox dashboard-empty-icon"></i>
          <p class="dashboard-empty-text">No new requests</p>
        </div>
      `;
      return;
    }

    const top = requests.slice(0, 4);

    bodyEl.innerHTML = `
      <div class="requests-widget-list">
        ${top.map(r => `
          <a href="#client-requests" class="requests-widget-item">
            <div class="requests-widget-icon">
              <i class="fas fa-file-code"></i>
            </div>
            <div class="requests-widget-content">
              <p class="requests-widget-title">${escapeHtml(r.title)}</p>
              <div class="requests-widget-meta">
                <span class="priority-dot ${r.priority || 'medium'}"></span>
                <span>${escapeHtml(r.full_name)}</span>
                <span>·</span>
                <span>${formatRelativeTime(r.created_at)}</span>
              </div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  // ============================================================
  // ALERTS WIDGET
  // ============================================================

  function renderAlertsWidget(alerts) {
    const countEl = document.getElementById('alerts-count');
    const bodyEl = document.getElementById('alerts-widget-body');
    if (!countEl || !bodyEl) return;

    if (!alerts || alerts.length === 0) {
      countEl.textContent = '0';
      bodyEl.innerHTML = `
        <div class="dashboard-empty">
          <i class="fas fa-check-circle dashboard-empty-icon"></i>
          <p class="dashboard-empty-text">All systems operational</p>
        </div>
      `;
      return;
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 1, warning: 2, info: 3 };
    const sorted = [...alerts].sort((a, b) =>
      (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
    );
    const top = sorted.slice(0, 4);

    countEl.textContent = String(alerts.length);

    bodyEl.innerHTML = `
      <div class="alerts-widget-list">
        ${top.map(a => {
          const sev = a.severity || 'info';
          const iconClass = sev === 'critical' ? 'fa-exclamation-triangle'
                          : sev === 'warning' ? 'fa-exclamation-circle'
                          : 'fa-info-circle';
          return `
            <a href="#alerts" class="alerts-widget-item severity-${sev}">
              <div class="alerts-widget-icon">
                <i class="fas ${iconClass}"></i>
              </div>
              <div class="alerts-widget-content">
                <p class="alerts-widget-title">${escapeHtml(a.title || a.message || 'Alert')}</p>
                <p class="alerts-widget-meta">${formatRelativeTime(a.created_at)}</p>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function formatRelativeTime(iso) {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  // Initial load
  refreshDashboard();
  updateLastUpdatedTimestamp();

  // Refresh every 60 seconds
  if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
  lastUpdatedTimer = setInterval(() => {
    refreshDashboard();
    updateLastUpdatedTimestamp();
  }, 60000);

  // ============================================================
  // EVENT LISTENERS
  // ============================================================

  // KPI clicks
  document.getElementById('kpi-container').addEventListener('click', (e) => {
    const card = e.target.closest('.clickable');
    if (!card) return;
    const type = card.dataset.kpiType;
    if (!type) return;
    openKpiModal(type, refreshDashboard);
  });

  // Add Project button
  document.getElementById('add-project-btn').addEventListener('click', () => {
    const { close } = showModal(renderProjectForm());
    const form = document.getElementById('project-form');
    const cancelBtn = document.querySelector('.cancel-form-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById('project-thumbnail-file');
      const thumbnailUrlInput = document.getElementById('project-thumbnail');
      if (fileInput && fileInput.files.length > 0) {
        try {
          showToast('Uploading image...', 'info');
          const { url } = await uploadImage(fileInput.files[0]);
          thumbnailUrlInput.value = url;
        } catch (err) {
          showToast(err.message, 'error');
          return;
        }
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      try {
        await projectService.create(data);
        close();
        showToast('Project created', 'success');
        refreshDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Record Sale button
  document.getElementById('record-sale-btn').addEventListener('click', async () => {
    const allProjects = await projectService.getAll();
    const { close } = showModal(renderSaleForm(allProjects));
    const form = document.getElementById('sale-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      try {
        await salesService.create(data);
        close();
        showToast('Sale recorded', 'success');
        refreshDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ==================== KPI MODALS ====================

async function openKpiModal(type, refreshCallback = null) {
  switch (type) {
    case 'projects': await showProjectsSummaryModal(); break;
    case 'overdue': await showOverdueSummaryModal(refreshCallback); break;
    case 'clients': await showClientsSummaryModal(); break;
    case 'revenue': await showRevenueSummaryModal(); break;
    case 'domains': await showExpiringDomainsModal(); break;
  }
}

async function showExpiringDomainsModal() {
  const domains = expiringDomains;
  const now = new Date();
  const content = `
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
          ${domains.map(d => {
            const expiry = new Date(d.expiry_date);
            const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            return `<tr>
              <td><strong>${escapeHtml(d.name)}</strong></td>
              <td>${escapeHtml(d.domain_name) || '—'}</td>
              <td>${escapeHtml(d.registrar) || '—'}</td>
              <td>${new Date(d.expiry_date).toLocaleDateString()}</td>
              <td><span class="badge ${daysLeft <= 7 ? 'badge-overdue' : 'badge-due-soon'}">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span></td>
            </tr>`;
          }).join('')}
          ${domains.length === 0 ? '<tr><td colspan="5">No domains expiring soon 🎉</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
  showModal(content);
}

async function showProjectsSummaryModal() {
  const projects = await dashboardService.getProjectsSummary().catch(() => []);
  const content = `
    <div class="modal-header-bar">
      <h2><i class="fas fa-folder-open"></i> All Projects</h2>
      <span class="modal-count">${projects.length} total</span>
    </div>
    <input type="text" id="modal-project-search" class="modal-search" placeholder="Search by name or client..." />
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead>
          <tr><th>Name</th><th>Client</th><th>Status</th><th>Location</th></tr>
        </thead>
        <tbody id="modal-project-tbody">${renderProjectRows(projects)}</tbody>
      </table>
    </div>
    <p class="modal-no-results hidden" id="modal-no-projects">No matching projects.</p>
  `;
  showModal(content);
  document.getElementById('modal-project-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#modal-project-tbody tr');
    let visible = 0;
    rows.forEach(row => {
      const show = row.textContent.toLowerCase().includes(term);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    document.getElementById('modal-no-projects')?.classList.toggle('hidden', visible > 0);
  });
}

function renderProjectRows(projects) {
  if (projects.length === 0) return '<tr><td colspan="4">No projects found.</td></tr>';
  return projects.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.client) || '—'}</td>
      <td><span class="status ${(p.status || '').toLowerCase()}">${escapeHtml(p.status)}</span></td>
      <td>${escapeHtml(p.location) || '—'}</td>
    </tr>
  `).join('');
}

async function showOverdueSummaryModal(refreshCallback = null) {
  const overdue = await dashboardService.getOverdueReviews().catch(() => []);
  const now = new Date();
  const content = `
    <div class="modal-header-bar">
      <h2><i class="fas fa-exclamation-circle" style="color:#ef4444;"></i> Overdue Reviews</h2>
      <span class="modal-count">${overdue.length} overdue</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead>
          <tr><th>Name</th><th>Client</th><th>Days Overdue</th><th>Action</th></tr>
        </thead>
        <tbody id="overdue-tbody">
          ${overdue.map(r => {
            const dueDate = new Date(r.next_review_date);
            const days = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            return `<tr>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td>${escapeHtml(r.client) || '—'}</td>
              <td><span class="badge badge-overdue">${days} day${days !== 1 ? 's' : ''}</span></td>
              <td><button class="btn btn-sm btn-outline review-update-btn" data-id="${r.id}"><i class="fas fa-sync-alt"></i> Review & Update</button></td>
            </tr>`;
          }).join('')}
          ${overdue.length === 0 ? '<tr><td colspan="4">No overdue reviews 🎉</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;

  const parentModal = showModal(content);

  document.querySelectorAll('.review-update-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const projectId = btn.dataset.id;
      parentModal.close();

      const fullProject = await projectService.getOne(projectId).catch(() => null);
      const projectForForm = fullProject || { id: projectId };

      const childModal = showModal(renderReviewUpdateForm(projectForForm));
      const form = document.getElementById('review-update-form');
      if (!form) return;

      document.querySelector('.cancel-review-update-btn')?.addEventListener('click', () => childModal.close());

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
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
  const clients = await dashboardService.getClientsSummary().catch(() => []);
  const activeCount = clients.filter(c => c.is_active).length;
  const content = `
    <div class="modal-header-bar">
      <h2><i class="fas fa-users"></i> Clients</h2>
      <span class="modal-count">${clients.length} total · ${activeCount} active</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead>
          <tr><th>Client</th><th>Projects</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${clients.map(c => `<tr>
            <td><strong>${escapeHtml(c.client)}</strong></td>
            <td>${c.project_count}</td>
            <td>${c.is_active ? '<span class="badge badge-upcoming">Active</span>' : '<span class="badge status-cancelled">Inactive</span>'}</td>
          </tr>`).join('')}
          ${clients.length === 0 ? '<tr><td colspan="3">No clients yet.</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
  showModal(content);
}

async function showRevenueSummaryModal() {
  const sales = await dashboardService.getRevenueSummary().catch(() => []);
  const total = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const content = `
    <div class="modal-header-bar">
      <h2><i class="fas fa-dollar-sign"></i> Revenue Breakdown</h2>
      <span class="modal-count">${sales.length} sales</span>
    </div>
    <div class="summary-table-wrapper">
      <table class="summary-table">
        <thead>
          <tr><th>Project</th><th>Amount</th><th>Date</th></tr>
        </thead>
        <tbody>
          ${sales.map(s => `<tr>
            <td>${escapeHtml(s.project_name)}</td>
            <td>$${parseFloat(s.amount).toLocaleString()}</td>
            <td>${new Date(s.sale_date).toLocaleDateString()}</td>
          </tr>`).join('')}
          ${sales.length === 0 ? '<tr><td colspan="3">No sales recorded yet.</td></tr>' : ''}
        </tbody>
        <tfoot>
          <tr><td colspan="2" style="text-align:right;font-weight:700;">Total Revenue</td><td style="font-weight:700;">$${total.toLocaleString()}</td></tr>
        </tfoot>
      </table>
    </div>
  `;
  showModal(content);
}

// ==================== HELPER FUNCTIONS ====================

function escapeHtml(text) {
  return text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

// ==================== KPI RENDERERS ====================

function renderPlaceholderKPIs() {
  return `
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="projects">
      <i class="fas fa-folder-open kpi-icon"></i>
      <h3>Total Projects</h3>
      <div class="value">--</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="overdue">
      <i class="fas fa-exclamation-circle kpi-icon"></i>
      <h3>Overdue Reviews</h3>
      <div class="value">--</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="clients">
      <i class="fas fa-users kpi-icon"></i>
      <h3>Active Clients</h3>
      <div class="value">--</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="domains">
      <i class="fas fa-globe kpi-icon"></i>
      <h3>Domains Expiring</h3>
      <div class="value">--</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="revenue">
      <i class="fas fa-dollar-sign kpi-icon"></i>
      <h3>Total Revenue</h3>
      <div class="value">--</div>
    </div>
  `;
}

function renderClickableKPIs(data, domainsCount) {
  return `
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="projects">
      <i class="fas fa-folder-open kpi-icon"></i>
      <h3>Total Projects</h3>
      <div class="value">${data.total_projects}</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="overdue">
      <i class="fas fa-exclamation-circle kpi-icon"></i>
      <h3>Overdue Reviews</h3>
      <div class="value">${data.overdue_reviews}</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="clients">
      <i class="fas fa-users kpi-icon"></i>
      <h3>Active Clients</h3>
      <div class="value">${data.active_clients}</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="domains">
      <i class="fas fa-globe kpi-icon"></i>
      <h3>Domains Expiring</h3>
      <div class="value">${domainsCount}</div>
    </div>
    <div class="card kpi-card clickable compact-kpi" data-kpi-type="revenue">
      <i class="fas fa-dollar-sign kpi-icon"></i>
      <h3>Total Revenue</h3>
      <div class="value">$${data.total_revenue.toLocaleString()}</div>
    </div>
  `;
}

// ==================== CHART ====================

function renderStatusChart(distribution) {
  if (!distribution || distribution.length === 0) return;
  const ctx = document.getElementById('statusChartCanvas')?.getContext('2d');
  if (!ctx) return;
  if (statusChart) statusChart.destroy();
  const labels = distribution.map(d => d.status);
  const counts = distribution.map(d => parseInt(d.count));
  const colors = {
    'Live': '#3EE07F',
    'Development': '#5AC8FA',
    'Planning': '#FFB800',
    'Maintenance': '#A78BFA',
    'Archived': '#6B739A'
  };
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: labels.map(l => colors[l] || '#cbd5e1'),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 10,
            usePointStyle: true,
            boxWidth: 8,
            color: '#A8AAC7',
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        }
      }
    }
  });
}

// ==================== REVIEWS ====================

function renderOverdueReviewsCompact(overdue) {
  if (!overdue || overdue.length === 0) return '';
  const now = new Date();
  return `
    <div class="reviews-widget-section">
      <h4 class="reviews-widget-subtitle overdue">
        <i class="fas fa-exclamation-circle"></i> Overdue
      </h4>
      <ul class="reviews-widget-list">
        ${overdue.slice(0, 4).map(r => {
          const dueDate = new Date(r.next_review_date);
          const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
          return `
            <li class="reviews-widget-item">
              <span class="reviews-widget-name">${escapeHtml(r.name)}</span>
              <span class="reviews-widget-badge overdue">${daysOverdue}d</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function renderUpcomingReviewsCompact(upcoming) {
  if (!upcoming || upcoming.length === 0) {
    return '<p class="dashboard-empty-text" style="text-align:center;padding:1rem 0;">No upcoming reviews</p>';
  }
  return `
    <div class="reviews-widget-section">
      <h4 class="reviews-widget-subtitle">
        <i class="fas fa-calendar-alt"></i> Upcoming
      </h4>
      <ul class="reviews-widget-list">
        ${upcoming.slice(0, 4).map(r => `
          <li class="reviews-widget-item">
            <span class="reviews-widget-name">${escapeHtml(r.name)}</span>
            <span class="reviews-widget-badge upcoming">
              ${new Date(r.next_review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

// ==================== COUNTY + FOR-SALE ====================

function renderCountyBreakdown(counties) {
  if (!counties || counties.length === 0) return '';
  return `
    <h3 class="dashboard-widget-title" style="margin-bottom:0.8rem;border-bottom:1px solid var(--border-dim);padding-bottom:0.6rem;">
      <i class="fas fa-map-marker-alt"></i> Top Counties
    </h3>
    <ul class="compact-widget-list">
      ${counties.map(c => `
        <li class="compact-widget-item">
          <span class="compact-widget-label">
            <i class="fas fa-location-dot"></i> ${escapeHtml(c.location)}
          </span>
          <span class="compact-widget-value">${c.project_count}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderForSaleProjectsCompact(forSale) {
  if (!forSale || forSale.length === 0) {
    return `
      <h3 class="dashboard-widget-title" style="margin-bottom:0.8rem;border-bottom:1px solid var(--border-dim);padding-bottom:0.6rem;">
        <i class="fas fa-tag"></i> For Sale
      </h3>
      <div class="dashboard-empty">
        <i class="fas fa-tag dashboard-empty-icon"></i>
        <p class="dashboard-empty-text">No projects for sale</p>
      </div>
    `;
  }
  return `
    <h3 class="dashboard-widget-title" style="margin-bottom:0.8rem;border-bottom:1px solid var(--border-dim);padding-bottom:0.6rem;">
      <i class="fas fa-tag"></i> For Sale
    </h3>
    <ul class="compact-widget-list">
      ${forSale.map(p => `
        <li class="compact-widget-item">
          <span class="compact-widget-label">
            <i class="fas fa-folder-open"></i> ${escapeHtml(p.name)}
          </span>
          <span class="compact-widget-value">$${p.asking_price ? Number(p.asking_price).toLocaleString() : '0'}</span>
        </li>
      `).join('')}
    </ul>
  `;
}
