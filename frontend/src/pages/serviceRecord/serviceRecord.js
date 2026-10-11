// ============================================================
// EAGLEVISION CLOUDBOARD — SERVICE RECORD PAGE
// ============================================================
// Shows the full service history of a selected project.
//
// Features:
//   • Project selector (auto-fills from ?project_id=)
//   • Health score summary
//   • KPI row: total updates, last updated, total/avg cost, overdue plans
//   • Cost trend chart
//   • Quick filter chips
//   • Table view / Timeline view toggle
//   • Search + type filter + date range
//   • Print support
//   • Add / edit / delete service updates
// ============================================================

import { renderSidebar, initSidebar }        from '../../components/sidebar.js';
import { projectService }                    from '../../services/projectService.js';
import { showModal }                         from '../../components/modal.js';
import { renderUpdateForm }                  from '../../components/updateForm.js';
import { renderReviewUpdateForm }            from '../../components/reviewUpdateForm.js';
import { renderProjectHealthScore }          from '../../components/projectHealthScore.js';
import { renderCostChart }                   from '../../components/costCharts.js';
import { showToast }                         from '../../utils/notifications.js';
import { confirmDialog }                     from '../../utils/confirm.js';
import { escapeHtml, escapeAttr, debounce }  from '../../utils/dom.js';
import { format }                            from '../../utils/format.js';
import { registerCleanup }                   from '../../utils/pageLifecycle.js';


// ============================================================
// CONSTANTS
// ============================================================
const SEARCH_DEBOUNCE_MS = 200;

const UPDATE_TYPES = [
  { key: 'Feature',     icon: 'fa-plus',     cls: 'type-feature' },
  { key: 'Bug Fix',     icon: 'fa-bug',      cls: 'type-bugfix' },
  { key: 'Maintenance', icon: 'fa-wrench',   cls: 'type-maintenance' },
  { key: 'Upgrade',     icon: 'fa-arrow-up', cls: 'type-upgrade' },
  { key: 'Other',       icon: 'fa-circle',   cls: 'type-other' },
];

const QUICK_FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-30',    label: 'Last 30 Days' },
  { key: 'high-cost',  label: 'High Cost ($500+)' },
  { key: 'with-plan',  label: 'With Plan' },
];


// ============================================================
// PAGE ENTRY
// ============================================================
export async function serviceRecordPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="service-record-header">
        <h2>Service Record</h2>
        <div class="service-record-actions">
          <button id="add-update-btn" class="btn btn-primary" type="button" disabled>
            <i class="fas fa-plus"></i> Add Update
          </button>
          <button id="review-update-btn" class="btn btn-outline" type="button" disabled>
            <i class="fas fa-sync-alt"></i> Review &amp; Update
          </button>
        </div>
      </div>

      <div class="service-record-toolbar">
        <select id="project-select" class="sort-select" aria-label="Select project">
          <option value="">-- Select Project --</option>
        </select>
        <input type="text" id="update-search" placeholder="Search by title or description...">
        <select id="type-filter" class="sort-select" aria-label="Filter by type">
          <option value="all">All Types</option>
          ${UPDATE_TYPES.map((t) => `<option value="${t.key}">${t.key}</option>`).join('')}
        </select>
        <input type="date" id="date-from" title="From date">
        <input type="date" id="date-to" title="To date">
        <button id="clear-update-filters-btn" class="btn btn-outline btn-sm" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <div id="project-summary" class="card compact-card hidden">
        <div class="project-summary-wrapper">
          <div class="project-summary-header">
            <h3 id="summary-project-name"></h3>
            <span id="summary-client" class="badge badge-upcoming"></span>
            <span id="summary-status" class="status"></span>
          </div>
          <div id="health-score-container" class="health-score-wrapper"></div>
        </div>
      </div>

      <div id="summary-kpi-container" class="kpi-grid hidden service-record-kpi-grid">
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-clipboard-list kpi-icon"></i>
          <h3>Total Updates</h3>
          <div class="value" id="kpi-total-updates">0</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-calendar-check kpi-icon"></i>
          <h3>Last Updated</h3>
          <div class="value kpi-value-small" id="kpi-last-update">—</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-dollar-sign kpi-icon"></i>
          <h3>Total Cost</h3>
          <div class="value" id="kpi-total-cost">—</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-calculator kpi-icon"></i>
          <h3>Avg Cost</h3>
          <div class="value" id="kpi-avg-cost">—</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-exclamation-triangle kpi-icon"></i>
          <h3>Overdue Plans</h3>
          <div class="value" id="kpi-overdue-count">0</div>
        </div>
      </div>

      <div id="cost-chart-container" class="chart-container hidden">
        <h3><i class="fas fa-chart-line"></i> Cost Trend</h3>
        <canvas id="costChartCanvas"></canvas>
      </div>

      <div id="quick-filters-container" class="quick-filters-container hidden">
        <span class="quick-filters-label">Quick Filters:</span>
        ${QUICK_FILTERS.map((f) => `
          <button type="button" class="quick-filter-chip ${f.key === 'all' ? 'active' : ''}" data-filter="${f.key}">
            ${f.label}
          </button>
        `).join('')}
      </div>

      <div class="view-toggle" style="margin-bottom:0.5rem;">
        <button type="button" id="view-table-btn" class="view-toggle-btn active">
          <i class="fas fa-table"></i> Table
        </button>
        <button type="button" id="view-timeline-btn" class="view-toggle-btn">
          <i class="fas fa-stream"></i> Timeline
        </button>
        <button type="button" id="print-record-btn" class="btn btn-sm btn-outline" style="margin-left:auto;">
          <i class="fas fa-print"></i> Print
        </button>
      </div>

      <div id="updates-container">
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>Select a project to see its service record.</p>
        </div>
      </div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let allProjects    = [];
  let selectedProjectId = '';
  let allUpdates     = [];
  let searchTerm     = '';
  let typeFilter     = 'all';
  let dateFrom       = '';
  let dateTo         = '';
  let currentView    = 'table';
  let currentQuickFilter = 'all';
  let costChartInstance = null;
  let chartRenderTimer  = null;


  // ---------- DOM refs ----------
  const projectSelect        = document.getElementById('project-select');
  const addUpdateBtn         = document.getElementById('add-update-btn');
  const reviewUpdateBtn      = document.getElementById('review-update-btn');
  const updatesContainer     = document.getElementById('updates-container');
  const searchInput          = document.getElementById('update-search');
  const typeFilterSelect     = document.getElementById('type-filter');
  const dateFromInput        = document.getElementById('date-from');
  const dateToInput          = document.getElementById('date-to');
  const clearBtn             = document.getElementById('clear-update-filters-btn');
  const viewTableBtn         = document.getElementById('view-table-btn');
  const viewTimelineBtn      = document.getElementById('view-timeline-btn');
  const printBtn             = document.getElementById('print-record-btn');
  const projectSummary       = document.getElementById('project-summary');
  const summaryKpiContainer  = document.getElementById('summary-kpi-container');
  const costChartContainer   = document.getElementById('cost-chart-container');
  const quickFiltersContainer = document.getElementById('quick-filters-container');
  const healthScoreContainer = document.getElementById('health-score-container');


  // ---------- Helpers ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[serviceRecord] ${label}:`, err);
    };
  }

  function destroyChart() {
    if (costChartInstance && typeof costChartInstance.destroy === 'function') {
      costChartInstance.destroy();
    }
    costChartInstance = null;
  }


  // ============================================================
  // DATA LOADING
  // ============================================================
  async function loadProjects() {
    try {
      allProjects = await projectService.getAll();

      projectSelect.innerHTML = `
        <option value="">-- Select Project --</option>
        ${allProjects.map((p) => `
          <option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>
        `).join('')}
      `;

      // Auto-select if ?project_id= is present
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      const preselected = params.get('project_id');
      if (preselected) {
        projectSelect.value = preselected;
        selectedProjectId = preselected;
        setActionButtonsEnabled(true);
        await loadUpdates(preselected);
      }
    } catch (err) {
      devOnly('load projects')(err);
      showToast('Failed to load projects.', 'error');
    }
  }

  async function loadUpdates(projectId) {
    if (!projectId) return;
    try {
      allUpdates = await projectService.getUpdates(projectId);
      updateProjectSummaryAndKPIs();
      await loadHealthAndAnalytics(projectId);
      renderUpdates();
    } catch (err) {
      devOnly('load updates')(err);
      showToast('Failed to load service records.', 'error');
      allUpdates = [];
      updateProjectSummaryAndKPIs();
      renderUpdates();
    }
  }

  async function loadHealthAndAnalytics(projectId) {
    // Health score
    try {
      const healthData = await projectService.getHealth(projectId);
      if (healthScoreContainer && healthData) {
        healthScoreContainer.innerHTML = renderProjectHealthScore(healthData.score);

        const overdueEl = document.getElementById('kpi-overdue-count');
        if (overdueEl && healthData.metrics) {
          overdueEl.textContent = format.number(healthData.metrics.overdueCount || 0);
        }
      }
    } catch (err) {
      devOnly('health score')(err);
    }

    // Cost trend
    try {
      const analytics = await projectService.getCostAnalytics(projectId, 6);

      if (analytics?.monthly?.labels?.length > 0) {
        costChartContainer.classList.remove('hidden');

        // Destroy any previous chart before creating a new one
        destroyChart();

        // Small delay lets the canvas size settle after the container unhides
        clearTimeout(chartRenderTimer);
        chartRenderTimer = setTimeout(() => {
          // Guard against navigation mid-delay
          if (!document.getElementById('costChartCanvas')) return;

          costChartInstance = renderCostChart('costChartCanvas', {
            labels: analytics.monthly.labels,
            values: analytics.monthly.values,
          });
        }, 100);
      } else {
        destroyChart();
        costChartContainer.classList.add('hidden');
      }
    } catch (err) {
      devOnly('cost analytics')(err);
      destroyChart();
      costChartContainer.classList.add('hidden');
    }
  }


  // ============================================================
  // SUMMARY + KPIs
  // ============================================================
  function updateProjectSummaryAndKPIs() {
    if (!selectedProjectId) {
      projectSummary.classList.add('hidden');
      summaryKpiContainer.classList.add('hidden');
      costChartContainer.classList.add('hidden');
      quickFiltersContainer.classList.add('hidden');
      return;
    }

    projectSummary.classList.remove('hidden');
    summaryKpiContainer.classList.remove('hidden');
    quickFiltersContainer.classList.remove('hidden');

    const project = allProjects.find((p) => String(p.id) === String(selectedProjectId));
    if (project) {
      document.getElementById('summary-project-name').textContent = project.name;
      document.getElementById('summary-client').textContent = project.client || 'No client';

      const statusSpan = document.getElementById('summary-status');
      statusSpan.textContent = project.status || '—';
      statusSpan.className = `status ${(project.status || '').toLowerCase()}`;
    }

    const totalUpdates = allUpdates.length;
    const totalCost = allUpdates.reduce((sum, u) => sum + (Number(u.cost) || 0), 0);
    const avgCost = totalUpdates > 0 ? totalCost / totalUpdates : 0;
    const lastUpdateDate = totalUpdates > 0
      ? format.date(allUpdates[0].created_at)
      : '—';

    document.getElementById('kpi-total-updates').textContent = format.number(totalUpdates);
    document.getElementById('kpi-last-update').textContent   = lastUpdateDate;
    document.getElementById('kpi-total-cost').textContent    = format.currency(totalCost);
    document.getElementById('kpi-avg-cost').textContent      = format.currency(avgCost);
  }


  // ============================================================
  // FILTERING
  // ============================================================
  function applyQuickFilter(updates) {
    const now = new Date();

    switch (currentQuickFilter) {
      case 'this-month':
        return updates.filter((u) => {
          const d = new Date(u.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      case 'last-30':
        return updates.filter((u) => {
          const diff = (now - new Date(u.created_at)) / 86400000;
          return diff <= 30;
        });
      case 'high-cost':
        return updates.filter((u) => (Number(u.cost) || 0) >= 500);
      case 'with-plan':
        return updates.filter((u) => Boolean(u.plan_id));
      default:
        return updates;
    }
  }

  function getFilteredUpdates() {
    let filtered = [...allUpdates];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((u) =>
        (u.title || '').toLowerCase().includes(term) ||
        (u.description || '').toLowerCase().includes(term)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((u) => u.update_type === typeFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((u) => {
        const iso = new Date(u.created_at).toISOString().slice(0, 10);
        return iso >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter((u) => {
        const iso = new Date(u.created_at).toISOString().slice(0, 10);
        return iso <= dateTo;
      });
    }

    return applyQuickFilter(filtered);
  }


  // ============================================================
  // RENDERING
  // ============================================================
  function renderUpdates() {
    if (!selectedProjectId) {
      updatesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>Select a project to see its service record.</p>
        </div>`;
      return;
    }

    const filtered = getFilteredUpdates();

    if (filtered.length === 0) {
      updatesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>No service records found for this project.</p>
        </div>`;
      return;
    }

    if (currentView === 'timeline') {
      renderTimeline(filtered);
    } else {
      renderTable(filtered);
    }
  }

  function renderPlanBadge(u) {
    if (!u.plan_id) return '';
    return `
      <a href="#service-planner" class="plan-badge-link" title="View in Service Planner">
        <span class="plan-badge">
          <i class="fas fa-clipboard-list"></i> Plan #${escapeHtml(u.plan_id)}
        </span>
      </a>
    `;
  }

  function renderTable(items) {
    updatesContainer.innerHTML = `
      <div class="table-container card">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Description</th>
              <th>Cost</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((u) => {
              const { icon, cls } = getUpdateTypeVisual(u.update_type);
              const costCell = u.cost
                ? format.currency(u.cost)
                : '—';
              return `
                <tr data-id="${escapeAttr(u.id)}">
                  <td><span class="update-type-badge ${cls}"><i class="fas ${icon}"></i> ${escapeHtml(u.update_type)}</span></td>
                  <td>
                    <strong>${escapeHtml(u.title)}</strong>
                    ${renderPlanBadge(u)}
                  </td>
                  <td>${escapeHtml(u.description || '—')}</td>
                  <td>${costCell}</td>
                  <td>${format.date(u.created_at)}</td>
                  <td class="actions-cell">
                    <button type="button" class="btn btn-sm edit-update" data-id="${escapeAttr(u.id)}">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger delete-update" data-id="${escapeAttr(u.id)}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTimeline(items) {
    updatesContainer.innerHTML = `
      <div class="timeline-container">
        ${items.map((u) => {
          const { icon, cls } = getUpdateTypeVisual(u.update_type);
          const costPart = u.cost
            ? `<span><i class="fas fa-dollar-sign"></i> ${format.currency(u.cost)}</span>`
            : '';

          return `
            <div class="timeline-item" data-id="${escapeAttr(u.id)}">
              <div class="timeline-icon">
                <i class="fas ${icon}"></i>
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <strong>${escapeHtml(u.title)}</strong>
                  <span class="update-type-badge ${cls}"><i class="fas ${icon}"></i> ${escapeHtml(u.update_type)}</span>
                </div>
                ${renderPlanBadge(u)}
                <p>${escapeHtml(u.description || 'No description')}</p>
                <div class="timeline-meta">
                  <span><i class="fas fa-calendar-alt"></i> ${format.dateTime(u.created_at)}</span>
                  ${costPart}
                  <div class="actions-cell">
                    <button type="button" class="btn btn-sm edit-update" data-id="${escapeAttr(u.id)}">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger delete-update" data-id="${escapeAttr(u.id)}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function getUpdateTypeVisual(type) {
    return UPDATE_TYPES.find((t) => t.key === type) || UPDATE_TYPES[UPDATE_TYPES.length - 1];
  }


  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  function setActionButtonsEnabled(enabled) {
    addUpdateBtn.disabled = !enabled;
    reviewUpdateBtn.disabled = !enabled;
  }

  function resetFilters() {
    searchTerm = '';
    typeFilter = 'all';
    dateFrom = '';
    dateTo = '';
    currentQuickFilter = 'all';

    searchInput.value = '';
    typeFilterSelect.value = 'all';
    dateFromInput.value = '';
    dateToInput.value = '';

    quickFiltersContainer.querySelectorAll('.quick-filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.filter === 'all');
    });
  }

  projectSelect.addEventListener('change', async () => {
    selectedProjectId = projectSelect.value;
    setActionButtonsEnabled(Boolean(selectedProjectId));
    resetFilters();

    if (selectedProjectId) {
      await loadUpdates(selectedProjectId);
    } else {
      destroyChart();
      updateProjectSummaryAndKPIs();
      renderUpdates();
    }
  });

  // Debounced search
  const handleSearch = debounce((value) => {
    searchTerm = value;
    renderUpdates();
  }, SEARCH_DEBOUNCE_MS);
  searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

  typeFilterSelect.addEventListener('change', (e) => {
    typeFilter = e.target.value;
    renderUpdates();
  });

  dateFromInput.addEventListener('change', (e) => {
    dateFrom = e.target.value;
    renderUpdates();
  });

  dateToInput.addEventListener('change', (e) => {
    dateTo = e.target.value;
    renderUpdates();
  });

  clearBtn.addEventListener('click', () => {
    resetFilters();
    renderUpdates();
  });

  // Quick filters (delegated)
  quickFiltersContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.quick-filter-chip');
    if (!chip) return;

    quickFiltersContainer.querySelectorAll('.quick-filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentQuickFilter = chip.dataset.filter;
    renderUpdates();
  });

  // View toggles
  viewTableBtn.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('active');
    viewTimelineBtn.classList.remove('active');
    renderUpdates();
  });

  viewTimelineBtn.addEventListener('click', () => {
    currentView = 'timeline';
    viewTimelineBtn.classList.add('active');
    viewTableBtn.classList.remove('active');
    renderUpdates();
  });

  // Print
  printBtn.addEventListener('click', () => {
    if (!selectedProjectId) {
      showToast('Select a project first.', 'error');
      return;
    }

    const filtered = getFilteredUpdates();
    const project = allProjects.find((p) => String(p.id) === String(selectedProjectId));

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Service Record</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1>Service Record</h1>
          <p><strong>Project:</strong> ${escapeHtml(project?.name || '')}</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr><th>Type</th><th>Title</th><th>Description</th><th>Cost</th><th>Date</th><th>Plan</th></tr>
            ${filtered.map((u) => `
              <tr>
                <td>${escapeHtml(u.update_type)}</td>
                <td>${escapeHtml(u.title)}</td>
                <td>${escapeHtml(u.description || '')}</td>
                <td>${u.cost ? format.currency(u.cost) : '—'}</td>
                <td>${format.date(u.created_at)}</td>
                <td>${u.plan_id ? `Plan #${escapeHtml(u.plan_id)}` : '—'}</td>
              </tr>
            `).join('')}
          </table>
          <p><em>Generated by EagleVision CloudBoard</em></p>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('Please allow pop-ups to print.', 'error');
      return;
    }
    win.document.write(printContent);
    win.document.close();
    win.print();
  });

  // Add update
  addUpdateBtn.addEventListener('click', () => {
    if (!selectedProjectId) return;

    const modal = showModal(renderUpdateForm(selectedProjectId));
    const form  = document.getElementById('update-form');
    if (!form) return;

    modal.element.querySelector('.cancel-update-btn')?.addEventListener('click', modal.close);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await projectService.createUpdate(selectedProjectId, data);
        modal.close();
        showToast('Service record added', 'success');
        loadUpdates(selectedProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Review & Update
  reviewUpdateBtn.addEventListener('click', () => {
    if (!selectedProjectId) return;

    const project = allProjects.find((p) => String(p.id) === String(selectedProjectId));
    if (!project) {
      showToast('Project not found', 'error');
      return;
    }

    const modal = showModal(renderReviewUpdateForm(project));
    const form  = document.getElementById('review-update-form');
    if (!form) return;

    modal.element.querySelector('.cancel-review-update-btn')?.addEventListener('click', modal.close);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await projectService.reviewAndUpdate(selectedProjectId, data);
        modal.close();
        showToast('Review & update saved', 'success');
        loadUpdates(selectedProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Row actions (delegated)
  const onUpdatesContainerClick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const row = e.target.closest('.timeline-item, tr');
    const updateId = row?.dataset.id;
    if (!updateId) return;

    if (btn.classList.contains('delete-update')) {
      const ok = await confirmDialog('Delete this service record?', 'Confirm Deletion');
      if (!ok) return;

      try {
        await projectService.deleteUpdate(updateId);
        showToast('Service record deleted', 'success');
        loadUpdates(selectedProjectId);
      } catch (err) {
        showToast(err.message, 'error');
      }

    } else if (btn.classList.contains('edit-update')) {
      const update = allUpdates.find((u) => String(u.id) === String(updateId));
      if (!update) return;

      const modal = showModal(renderUpdateForm(selectedProjectId, update));
      const form  = document.getElementById('update-form');
      if (!form) return;

      modal.element.querySelector('.cancel-update-btn')?.addEventListener('click', modal.close);

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          await projectService.updateUpdate(updateId, data);
          modal.close();
          showToast('Service record updated', 'success');
          loadUpdates(selectedProjectId);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  };
  updatesContainer.addEventListener('click', onUpdatesContainerClick);


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    clearTimeout(chartRenderTimer);
    chartRenderTimer = null;
    destroyChart();
    updatesContainer.removeEventListener('click', onUpdatesContainerClick);
  });


  // ============================================================
  // INIT
  // ============================================================
  await loadProjects();
}
