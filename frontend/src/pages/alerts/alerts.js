// ============================================================
// EAGLEVISION CLOUDBOARD — ALERTS PAGE
// ============================================================
// Shows uptime alerts + domain expiry warnings.
//
// Features:
//   • KPI row: down projects, monitored, avg response, 24h alerts
//   • Search across project name + client
//   • Sortable columns
//   • Row actions: view logs, resolve alert
//   • Separate table for domain expiries with days-left badge
// ============================================================

import { renderSidebar, initSidebar }  from '../../components/sidebar.js';
import { uptimeService }                from '../../services/uptimeService.js';
import { projectService }               from '../../services/projectService.js';
import { dashboardService }             from '../../services/dashboardService.js';
import { showModal }                    from '../../components/modal.js';
import { showToast }                    from '../../utils/notifications.js';
import { escapeHtml, escapeAttr, debounce } from '../../utils/dom.js';
import { format }                       from '../../utils/format.js';
import { registerCleanup }              from '../../utils/pageLifecycle.js';


// ============================================================
// CONSTANTS
// ============================================================
const SEARCH_DEBOUNCE_MS = 200;
const DOMAIN_WARN_DAYS   = 7;


// ============================================================
// PAGE ENTRY
// ============================================================
export async function alertsPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="alerts-header">
        <h2>Alerts</h2>
        <button id="refresh-alerts-btn" class="btn btn-outline" type="button">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div id="alerts-kpi-container" class="kpi-grid">
        ${renderPlaceholderKPIs()}
      </div>

      <div class="alerts-toolbar">
        <input type="text" id="alerts-search" placeholder="Search by project or client...">
        <button id="clear-alerts-search-btn" class="btn btn-outline btn-sm" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <div class="table-container card" id="alerts-table-wrapper">
        <table id="alerts-table" class="summary-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="name">Project <i class="fas fa-sort"></i></th>
              <th class="sortable" data-sort="client">Client <i class="fas fa-sort"></i></th>
              <th>Status</th>
              <th class="sortable" data-sort="checked_at">Last Checked <i class="fas fa-sort"></i></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="alerts-tbody">
            <tr><td colspan="5" class="empty-state">Loading uptime alerts…</td></tr>
          </tbody>
        </table>
      </div>

      <div id="alerts-empty-state" class="empty-state hidden">
        <i class="fas fa-check-circle"></i>
        <p>All systems are up. No down projects.</p>
      </div>

      <hr class="section-divider" style="margin: 1.5rem 0;">

      <div class="alerts-header">
        <h3><i class="fas fa-globe"></i> Domain Expiry Alerts</h3>
      </div>

      <div class="table-container card" id="domain-expiry-wrapper">
        <table id="domain-expiry-table" class="summary-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Domain</th>
              <th>Registrar</th>
              <th>Expiry Date</th>
              <th>Days Left</th>
            </tr>
          </thead>
          <tbody id="domain-expiry-tbody">
            <tr><td colspan="5" class="empty-state">Loading domain expiries…</td></tr>
          </tbody>
        </table>
      </div>

      <div id="domain-expiry-empty" class="empty-state hidden">
        <i class="fas fa-calendar-check"></i>
        <p>No domains expiring soon.</p>
      </div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let alerts          = [];
  let projects        = [];
  let expiringDomains = [];
  let sortField       = 'checked_at';
  let sortDir         = 'desc';
  let searchTerm      = '';


  // ---------- DOM refs ----------
  const tbody         = document.getElementById('alerts-tbody');
  const tableWrapper  = document.getElementById('alerts-table-wrapper');
  const emptyState    = document.getElementById('alerts-empty-state');
  const kpiContainer  = document.getElementById('alerts-kpi-container');
  const searchInput   = document.getElementById('alerts-search');
  const clearSearchBtn = document.getElementById('clear-alerts-search-btn');
  const refreshBtn    = document.getElementById('refresh-alerts-btn');
  const alertsTable   = document.getElementById('alerts-table');
  const domainTbody   = document.getElementById('domain-expiry-tbody');
  const domainWrapper = document.getElementById('domain-expiry-wrapper');
  const domainEmpty   = document.getElementById('domain-expiry-empty');


  // ---------- Helpers ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[alerts] ${label}:`, err);
    };
  }

  function getProjectIdForAlert(alert) {
    // Defensive: some APIs return `id`, others `project_id`.
    return alert.project_id ?? alert.id ?? null;
  }

  function getProjectForAlert(alert) {
    const pid = getProjectIdForAlert(alert);
    if (pid == null) return null;
    return projects.find((p) => String(p.id) === String(pid)) || null;
  }


  // ============================================================
  // LOADING
  // ============================================================
  async function loadAlerts() {
    const [alertsRes, projectsRes, domainsRes] = await Promise.allSettled([
      uptimeService.getAlerts(),
      projectService.getAll(),
      dashboardService.getExpiringDomains(),
    ]);

    alerts          = alertsRes.status  === 'fulfilled' ? (alertsRes.value  || []) : [];
    projects        = projectsRes.status === 'fulfilled' ? (projectsRes.value || []) : [];
    expiringDomains = domainsRes.status  === 'fulfilled' ? (domainsRes.value  || []) : [];

    if (alertsRes.status === 'rejected') {
      devOnly('load alerts')(alertsRes.reason);
      showToast('Failed to load alerts.', 'error');
    }

    updateKPIs(alerts, projects);
    applyFiltersAndSort();
    renderDomainExpiryTable();
  }

  function updateKPIs(alertsList, projectList) {
    const monitored        = projectList.filter((p) => p.live_url).length;
    const downCount        = alertsList.length;

    const responseTimes    = alertsList
      .map((a) => Number(a.response_time_ms))
      .filter((n) => Number.isFinite(n));

    const avgResponseTime  = responseTimes.length
      ? responseTimes.reduce((s, n) => s + n, 0) / responseTimes.length
      : 0;

    const last24h = alertsList.filter((a) => {
      const t = new Date(a.checked_at).getTime();
      if (!Number.isFinite(t)) return false;
      return (Date.now() - t) < 86400000;
    }).length;

    kpiContainer.innerHTML = `
      ${renderKPICard('fa-exclamation-triangle', 'Down Projects',    format.number(downCount))}
      ${renderKPICard('fa-globe',                'Total Monitored',  format.number(monitored))}
      ${renderKPICard('fa-clock',                'Avg Response Time', `${Math.round(avgResponseTime)} ms`)}
      ${renderKPICard('fa-history',              'Last 24h Alerts',  format.number(last24h))}
    `;
  }


  // ============================================================
  // FILTERS + SORT
  // ============================================================
  function applyFiltersAndSort() {
    let filtered = alerts.map((alert) => {
      const project = getProjectForAlert(alert);
      return {
        ...alert,
        client: project?.client || '—',
        name:   alert.name || project?.name || 'Unknown',
      };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((a) =>
        (a.name   || '').toLowerCase().includes(term) ||
        (a.client || '').toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let valA, valB;

      if (sortField === 'name') {
        valA = (a.name   || '').toLowerCase();
        valB = (b.name   || '').toLowerCase();
      } else if (sortField === 'client') {
        valA = (a.client || '').toLowerCase();
        valB = (b.client || '').toLowerCase();
      } else if (sortField === 'checked_at') {
        valA = new Date(a.checked_at || 0).getTime() || 0;
        valB = new Date(b.checked_at || 0).getTime() || 0;
      } else {
        return 0;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    renderAlertsTable(filtered);
  }

  function renderAlertsTable(items) {
    if (items.length === 0) {
      // Hide table, show friendly empty state
      tableWrapper.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    tableWrapper.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tbody.innerHTML = items.map((a) => {
      const statusText  = a.status || 'Down';
      const statusClass = statusText.toLowerCase().replace(/\s+/g, '-');
      const projectId   = escapeAttr(getProjectIdForAlert(a) ?? '');

      return `
        <tr data-id="${projectId}">
          <td><strong>${escapeHtml(a.name)}</strong></td>
          <td>${escapeHtml(a.client)}</td>
          <td><span class="status ${escapeAttr(statusClass)}">${escapeHtml(statusText)}</span></td>
          <td>${format.dateTime(a.checked_at)}</td>
          <td class="actions-cell">
            <button type="button" class="btn btn-sm view-logs" data-id="${projectId}">
              <i class="fas fa-history"></i> Logs
            </button>
            <button type="button" class="btn btn-sm btn-outline resolve-alert" data-id="${projectId}">
              <i class="fas fa-check"></i> Resolve
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderDomainExpiryTable() {
    if (expiringDomains.length === 0) {
      domainWrapper.classList.add('hidden');
      domainEmpty.classList.remove('hidden');
      return;
    }

    domainWrapper.classList.remove('hidden');
    domainEmpty.classList.add('hidden');

    const now = Date.now();

    domainTbody.innerHTML = expiringDomains.map((d) => {
      const expiryMs = new Date(d.expiry_date).getTime();
      const daysLeft = Number.isFinite(expiryMs)
        ? Math.ceil((expiryMs - now) / 86400000)
        : null;

      const badge = daysLeft == null
        ? '<span class="badge badge-upcoming">—</span>'
        : `<span class="badge ${daysLeft <= DOMAIN_WARN_DAYS ? 'badge-overdue' : 'badge-due-soon'}">
             ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
           </span>`;

      return `
        <tr>
          <td><strong>${escapeHtml(d.name)}</strong></td>
          <td>${escapeHtml(d.domain_name) || '—'}</td>
          <td>${escapeHtml(d.registrar)   || '—'}</td>
          <td>${format.date(d.expiry_date)}</td>
          <td>${badge}</td>
        </tr>
      `;
    }).join('');
  }


  // ============================================================
  // MODALS
  // ============================================================
  async function showUptimeLogsModal(projectId) {
    let logs = [];
    try {
      logs = await uptimeService.getLogs(projectId);
    } catch (err) {
      devOnly('load logs')(err);
      logs = [];
    }

    const project = projects.find((p) => String(p.id) === String(projectId));

    const content = `
      <div class="modal-header-bar">
        <h2><i class="fas fa-history"></i> Uptime Logs</h2>
        <span class="modal-count">${logs.length} recent checks</span>
      </div>
      <p style="margin-bottom:1rem;">
        <strong>Project:</strong> ${escapeHtml(project?.name || 'Unknown')}
      </p>
      <div class="summary-table-wrapper">
        <table class="summary-table">
          <thead>
            <tr><th>Checked At</th><th>Status</th><th>Response</th><th>HTTP Code</th></tr>
          </thead>
          <tbody>
            ${logs.map((log) => `
              <tr>
                <td>${format.dateTime(log.checked_at)}</td>
                <td>${log.is_up
                  ? '<span class="badge badge-upcoming">Up</span>'
                  : '<span class="badge badge-overdue">Down</span>'}</td>
                <td>${Number.isFinite(Number(log.response_time_ms))
                  ? `${Number(log.response_time_ms)} ms`
                  : '—'}</td>
                <td>${escapeHtml(log.status_code) || '—'}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="empty-state">No logs found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    showModal(content);
  }

  async function resolveAlert(projectId) {
    try {
      await uptimeService.resolveAlert(projectId);
      showToast('Alert acknowledged', 'success');
      loadAlerts();
    } catch (err) {
      showToast(err.message || 'Failed to resolve alert', 'error');
    }
  }


  // ============================================================
  // SHARED RENDER HELPERS
  // ============================================================
  function renderPlaceholderKPIs() {
    const defs = [
      ['fa-exclamation-triangle', 'Down Projects'],
      ['fa-globe',                'Total Monitored'],
      ['fa-clock',                'Avg Response Time'],
      ['fa-history',              'Last 24h Alerts'],
    ];
    return defs.map(([icon, label]) => renderKPICard(icon, label, '—', true)).join('');
  }

  function renderKPICard(icon, label, value, isPlaceholder = false) {
    return `
      <div class="card kpi-card compact-kpi">
        <i class="fas ${icon} kpi-icon"></i>
        <h3>${label}</h3>
        <div class="value${isPlaceholder ? ' kpi-placeholder' : ''}">${value}</div>
      </div>
    `;
  }


  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  const handleSearch = debounce(() => {
    searchTerm = searchInput.value.trim();
    applyFiltersAndSort();
  }, SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener('input', handleSearch);

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    applyFiltersAndSort();
  });

  refreshBtn.addEventListener('click', () => {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading uptime alerts…</td></tr>`;
    domainTbody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading domain expiries…</td></tr>`;
    loadAlerts();
  });

  // Sortable columns (delegated)
  const onSortClick = (e) => {
    const th = e.target.closest('th.sortable');
    if (!th) return;

    const field = th.dataset.sort;
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir = 'asc';
    }

    // Reset icons
    alertsTable.querySelectorAll('th.sortable i').forEach((i) => {
      i.className = 'fas fa-sort';
    });
    th.querySelector('i').className =
      sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';

    applyFiltersAndSort();
  };
  alertsTable.querySelector('thead').addEventListener('click', onSortClick);

  // Row actions (delegated)
  const onTableClick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const row = e.target.closest('tr');
    const projectId = row?.dataset.id;
    if (!projectId) return;

    if (btn.classList.contains('view-logs')) {
      await showUptimeLogsModal(projectId);
    } else if (btn.classList.contains('resolve-alert')) {
      await resolveAlert(projectId);
    }
  };
  alertsTable.addEventListener('click', onTableClick);


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    alertsTable.querySelector('thead').removeEventListener('click', onSortClick);
    alertsTable.removeEventListener('click', onTableClick);
  });


  // ============================================================
  // INITIAL LOAD
  // ============================================================
  loadAlerts();
}
