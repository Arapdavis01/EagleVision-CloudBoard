// ============================================================
// EAGLEVISION CLOUDBOARD — SERVICE PLANNER PAGE
// ============================================================
// Plan improvements before they become service records.
//
// Features:
//   • Stats grid (total, in progress, high priority, overdue)
//   • Views: Board (kanban), List, Calendar
//   • Filters: search, project, status, priority, sort
//   • Bulk select (list view) — bulk status/priority/delete
//   • Add / edit / delete plans
//   • Approve plan → creates Service Record
//   • Plan templates
// ============================================================

import { renderSidebar, initSidebar }        from '../../components/sidebar.js';
import { projectService }                    from '../../services/projectService.js';
import { servicePlanService }                from '../../services/servicePlanService.js';
import { showModal }                         from '../../components/modal.js';
import { renderPlanForm }                    from '../../components/planForm.js';
import { renderKanbanBoard, initKanbanBoard } from '../../components/kanbanBoard.js';
import { renderPlanTemplates, initPlanTemplates } from '../../components/planTemplates.js';
import { showToast }                         from '../../utils/notifications.js';
import { confirmDialog }                     from '../../utils/confirm.js';
import { escapeHtml, escapeAttr, debounce }  from '../../utils/dom.js';
import { format }                            from '../../utils/format.js';
import { registerCleanup }                   from '../../utils/pageLifecycle.js';


// ============================================================
// CONSTANTS
// ============================================================
const SEARCH_DEBOUNCE_MS = 300;

const PRIORITY_BADGES = {
  high:   '<span class="badge priority-high">HIGH</span>',
  medium: '<span class="badge priority-medium">MEDIUM</span>',
  low:    '<span class="badge priority-low">LOW</span>',
};

const STATUS_BADGES = {
  planned:     '<span class="badge status-planned">PLANNED</span>',
  in_progress: '<span class="badge status-in-progress">IN PROGRESS</span>',
  completed:   '<span class="badge status-completed">COMPLETED</span>',
  cancelled:   '<span class="badge status-cancelled">CANCELLED</span>',
};


// ============================================================
// PAGE ENTRY
// ============================================================
export async function servicePlannerPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="service-planner-header">
        <div class="header-left">
          <div class="page-icon"><i class="fas fa-clipboard-list"></i></div>
          <div>
            <h2>Service Planner</h2>
            <p class="page-subtitle">Plan improvements before they become service records</p>
          </div>
        </div>
        <div class="header-actions">
          <button id="add-plan-btn" class="btn btn-primary" type="button">
            <i class="fas fa-plus"></i> New Plan
          </button>
        </div>
      </div>

      <div id="planner-stats" class="planner-stats-grid">
        ${renderStatsCard('stat-total',    'Total Plans',   'fa-layer-group',        'var(--primary-tint)')}
        ${renderStatsCard('stat-progress', 'In Progress',   'fa-spinner',            'var(--cyan-soft)')}
        ${renderStatsCard('stat-high',     'High Priority', 'fa-exclamation-triangle', 'rgba(220,38,38,0.08)')}
        ${renderStatsCard('stat-overdue',  'Overdue',       'fa-clock',              'rgba(234,88,12,0.08)')}
      </div>

      <div class="planner-view-toggle">
        <button id="view-board-btn" class="view-btn active" type="button">
          <i class="fas fa-columns"></i> Board
        </button>
        <button id="view-list-btn" class="view-btn" type="button">
          <i class="fas fa-list"></i> List
        </button>
        <button id="view-calendar-btn" class="view-btn" type="button">
          <i class="fas fa-calendar-alt"></i> Calendar
        </button>
        <div class="view-toggle-spacer"></div>
        <button id="bulk-mode-btn" class="btn btn-sm btn-outline" type="button">
          <i class="fas fa-check-square"></i> Bulk Select
        </button>
      </div>

      <div id="bulk-actions-bar" class="bulk-actions-bar hidden">
        <span id="bulk-count">0 selected</span>
        <select id="bulk-status-select" class="filter-select" aria-label="Bulk change status">
          <option value="">Change Status...</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="bulk-priority-select" class="filter-select" aria-label="Bulk change priority">
          <option value="">Change Priority...</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button id="bulk-delete-btn" class="btn btn-sm btn-danger" type="button">
          <i class="fas fa-trash"></i> Delete Selected
        </button>
        <button id="bulk-cancel-btn" class="btn btn-sm btn-outline" type="button">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>

      <div class="planner-toolbar">
        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="plan-search" placeholder="Search plans...">
        </div>
        <select id="project-filter" class="filter-select" aria-label="Filter by project">
          <option value="">All Projects</option>
        </select>
        <select id="status-filter" class="filter-select" aria-label="Filter by status">
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="priority-filter" class="filter-select" aria-label="Filter by priority">
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select id="sort-select" class="filter-select" aria-label="Sort plans">
          <option value="default">Sort: Priority</option>
          <option value="date-asc">Target Date (Earliest)</option>
          <option value="date-desc">Target Date (Latest)</option>
          <option value="cost-asc">Cost (Low to High)</option>
          <option value="cost-desc">Cost (High to Low)</option>
          <option value="created-desc">Newest First</option>
          <option value="created-asc">Oldest First</option>
        </select>
      </div>

      <div id="plans-container">
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>Loading service plans...</p>
        </div>
      </div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let allProjects  = [];
  let allPlans     = [];
  let allTemplates = [];
  let searchTerm     = '';
  let projectFilter  = '';
  let statusFilter   = 'all';
  let priorityFilter = 'all';
  let sortOption     = 'default';
  let currentView    = 'board';
  let bulkMode       = false;
  let selectedPlanIds = new Set();
  let kanbanCleanup  = null;


  // ---------- DOM refs ----------
  const plansContainer       = document.getElementById('plans-container');
  const searchInput          = document.getElementById('plan-search');
  const projectFilterSelect  = document.getElementById('project-filter');
  const statusFilterSelect   = document.getElementById('status-filter');
  const priorityFilterSelect = document.getElementById('priority-filter');
  const sortSelect           = document.getElementById('sort-select');
  const viewBoardBtn         = document.getElementById('view-board-btn');
  const viewListBtn          = document.getElementById('view-list-btn');
  const viewCalendarBtn      = document.getElementById('view-calendar-btn');
  const bulkModeBtn          = document.getElementById('bulk-mode-btn');
  const bulkActionsBar       = document.getElementById('bulk-actions-bar');
  const bulkCount            = document.getElementById('bulk-count');
  const bulkStatusSelect     = document.getElementById('bulk-status-select');
  const bulkPrioritySelect   = document.getElementById('bulk-priority-select');
  const bulkDeleteBtn        = document.getElementById('bulk-delete-btn');
  const bulkCancelBtn        = document.getElementById('bulk-cancel-btn');


  // ---------- Helpers ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[servicePlanner] ${label}:`, err);
    };
  }

  function setTextSafely(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }


  // ============================================================
  // DATA LOADING
  // ============================================================
  async function loadProjects() {
    try {
      allProjects = await projectService.getAll();

      projectFilterSelect.innerHTML = `
        <option value="">All Projects</option>
        ${allProjects.map((p) => `
          <option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>
        `).join('')}
      `;
    } catch (err) {
      devOnly('load projects')(err);
      showToast('Failed to load projects.', 'error');
    }
  }

  async function loadTemplates() {
    try {
      allTemplates = await servicePlanService.getTemplates();
    } catch (err) {
      devOnly('load templates')(err);
      allTemplates = [];
    }
  }

  async function loadPlans() {
    try {
      const filters = {};
      if (projectFilter)             filters.project_id = projectFilter;
      if (statusFilter !== 'all')    filters.status     = statusFilter;
      if (priorityFilter !== 'all')  filters.priority   = priorityFilter;
      if (searchTerm)                filters.search     = searchTerm;
      if (sortOption !== 'default')  filters.sort       = sortOption;

      allPlans = await servicePlanService.getPlans(filters);
      renderCurrentView();
      loadStats();
    } catch (err) {
      devOnly('load plans')(err);
      plansContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to load service plans.</p>
        </div>
      `;
    }
  }

  async function loadStats() {
    try {
      const stats = await servicePlanService.getStats();

      setTextSafely('stat-total',    format.number(stats.total_plans || 0));
      setTextSafely('stat-progress', format.number(stats.in_progress || 0));
      setTextSafely('stat-high',     format.number(stats.high_priority || 0));
      setTextSafely('stat-overdue',  format.number(stats.overdue || 0));

      setTextSafely('stat-total-trend',    stats.new_this_week > 0      ? `+${stats.new_this_week} this week` : '');
      setTextSafely('stat-progress-trend', stats.completed_this_month > 0 ? `${stats.completed_this_month} done this month` : '');
      setTextSafely('stat-overdue-trend',  stats.overdue > 0            ? 'Needs attention' : '');
    } catch (err) {
      devOnly('load stats')(err);
    }
  }


  // ============================================================
  // RENDERING
  // ============================================================
  function renderStatsCard(id, label, icon, tint) {
    return `
      <div class="stat-card">
        <div class="stat-icon" style="background:${tint};">
          <i class="fas ${icon}"></i>
        </div>
        <div class="stat-info">
          <h3>${label}</h3>
          <p id="${id}">0</p>
          <span class="stat-trend" id="${id}-trend"></span>
        </div>
      </div>
    `;
  }

  function renderCurrentView() {
    // Cleanup previous kanban instance before rendering anything new
    if (kanbanCleanup && typeof kanbanCleanup === 'function') {
      try { kanbanCleanup(); } catch (_) { /* ignore */ }
      kanbanCleanup = null;
    }

    if (allPlans.length === 0) {
      plansContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>No service plans found. Click "New Plan" to create one.</p>
        </div>
      `;
      return;
    }

    if (currentView === 'board')         renderBoard();
    else if (currentView === 'list')     renderList();
    else if (currentView === 'calendar') renderCalendar();
  }


  // ---------- Board view ----------
  function renderBoard() {
    plansContainer.innerHTML = renderKanbanBoard(allPlans, {
      onApprove:  handleApprove,
      onEdit:     handleEdit,
      onDelete:   handleDelete,
      onComplete: handleComplete,
      onReopen:   handleReopen,
      onViewSR:   handleViewSR,
    });

    // initKanbanBoard may return a cleanup function — capture it
    const result = initKanbanBoard(plansContainer, {
      onApprove:      handleApprove,
      onEdit:         handleEdit,
      onDelete:       handleDelete,
      onComplete:     handleComplete,
      onReopen:       handleReopen,
      onStatusChange: handleStatusChange,
    });

    if (typeof result === 'function') {
      kanbanCleanup = result;
    }
  }


  // ---------- List view ----------
  function renderList() {
    plansContainer.innerHTML = `
      <div class="plans-list-view">
        ${allPlans.map((plan) => renderListItem(plan)).join('')}
      </div>
    `;
  }

  function renderListItem(plan) {
    const bulkPart = bulkMode ? `
      <div class="bulk-checkbox">
        <input
          type="checkbox"
          class="plan-checkbox"
          data-id="${escapeAttr(plan.id)}"
          ${selectedPlanIds.has(String(plan.id)) ? 'checked' : ''}
        >
      </div>
    ` : '';

    const datePart = plan.target_date
      ? `<span><i class="fas fa-calendar-alt"></i> ${format.date(plan.target_date)}</span>`
      : '';

    const costPart = plan.estimated_cost > 0
      ? `<span><i class="fas fa-dollar-sign"></i> ${format.currency(plan.estimated_cost)}</span>`
      : '';

    return `
      <div class="plan-list-item ${bulkMode ? 'bulk-selectable' : ''}" data-id="${escapeAttr(plan.id)}">
        ${bulkPart}
        <div class="list-item-priority">${PRIORITY_BADGES[plan.priority] || PRIORITY_BADGES.medium}</div>
        <div class="list-item-content">
          <h4>${escapeHtml(plan.title)}</h4>
          <div class="list-item-meta">
            <span><i class="fas fa-folder-open"></i> ${escapeHtml(plan.project_name || 'Unknown')}</span>
            <span><i class="fas fa-tag"></i> ${escapeHtml(plan.category)}</span>
            ${datePart}
            ${costPart}
          </div>
        </div>
        <div class="list-item-status">${STATUS_BADGES[plan.status] || STATUS_BADGES.planned}</div>
        <div class="list-item-actions">${renderActionButtons(plan)}</div>
      </div>
    `;
  }

  function renderActionButtons(plan) {
    const id = escapeAttr(plan.id);

    const approve = plan.status === 'planned' ? `
      <button type="button" class="btn btn-sm btn-primary approve-plan-btn" data-id="${id}" title="Approve & Create SR">
        <i class="fas fa-check"></i>
      </button>
    ` : '';

    const complete = plan.status === 'in_progress' ? `
      <button type="button" class="btn btn-sm btn-success complete-plan-btn" data-id="${id}" title="Mark Complete">
        <i class="fas fa-check-circle"></i>
      </button>
    ` : '';

    const reopen = (plan.status === 'completed' || plan.status === 'cancelled') ? `
      <button type="button" class="btn btn-sm btn-outline reopen-plan-btn" data-id="${id}" title="Reopen">
        <i class="fas fa-undo"></i>
      </button>
    ` : '';

    return `
      ${approve}
      ${complete}
      ${reopen}
      <button type="button" class="btn btn-sm edit-plan-btn" data-id="${id}" title="Edit">
        <i class="fas fa-edit"></i>
      </button>
      <button type="button" class="btn btn-sm btn-danger delete-plan-btn" data-id="${id}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    `;
  }


  // ---------- Calendar view ----------
  function renderCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear  = today.getFullYear();

    const firstDay      = new Date(currentYear, currentMonth, 1);
    const lastDay       = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth   = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthName = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Group plans by date
    const plansByDate = {};
    allPlans.forEach((plan) => {
      if (!plan.target_date) return;
      const dateKey = String(plan.target_date).slice(0, 10);
      if (!plansByDate[dateKey]) plansByDate[dateKey] = [];
      plansByDate[dateKey].push(plan);
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const headerDays = dayNames
      .map((d) => `<div class="calendar-day-header">${d}</div>`)
      .join('');

    const emptyCells = Array.from({ length: startDayOfWeek })
      .map(() => `<div class="calendar-day empty"></div>`)
      .join('');

    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayPlans = plansByDate[dateKey] || [];
      const isToday = day === today.getDate();

      const dots = dayPlans.slice(0, 3).map((p) => `
        <div class="calendar-plan-dot ${escapeAttr(p.priority)}" title="${escapeAttr(p.title)}"></div>
      `).join('');

      const more = dayPlans.length > 3
        ? `<span class="more-plans">+${dayPlans.length - 3}</span>`
        : '';

      return `
        <div class="calendar-day ${isToday ? 'today' : ''}">
          <span class="day-number">${day}</span>
          <div class="day-plans">${dots}${more}</div>
        </div>
      `;
    }).join('');

    plansContainer.innerHTML = `
      <div class="calendar-view">
        <div class="calendar-header">
          <h3>${monthName}</h3>
        </div>
        <div class="calendar-grid">
          ${headerDays}
          ${emptyCells}
          ${dayCells}
        </div>
      </div>
    `;
  }


  // ============================================================
  // ACTION HANDLERS
  // ============================================================
  async function handleApprove(planId) {
    const ok = await confirmDialog('Create Service Record from this plan?', 'Approve Plan');
    if (!ok) return;

    try {
      const result = await servicePlanService.approvePlan(planId);
      showToast('Service record created!', 'success');
      await loadPlans();

      const viewSR = await confirmDialog(
        'Service record created successfully. View it now?',
        'View Service Record'
      );
      if (viewSR && result.service_record) {
        location.hash = `#service-record?project_id=${encodeURIComponent(result.service_record.project_id)}`;
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve plan', 'error');
    }
  }

  async function handleComplete(planId) {
    const ok = await confirmDialog('Mark this plan as completed?', 'Complete Plan');
    if (!ok) return;

    try {
      await servicePlanService.completePlan(planId);
      showToast('Plan marked as completed', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to complete plan', 'error');
    }
  }

  async function handleReopen(planId) {
    const ok = await confirmDialog('Reopen this plan?', 'Reopen Plan');
    if (!ok) return;

    try {
      await servicePlanService.reopenPlan(planId);
      showToast('Plan reopened', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to reopen plan', 'error');
    }
  }

  function handleViewSR(planId) {
    const plan = allPlans.find((p) => String(p.id) === String(planId));
    if (plan) {
      location.hash = `#service-record?project_id=${encodeURIComponent(plan.project_id)}`;
    }
  }

  async function handleStatusChange(planId, newStatus) {
    try {
      await servicePlanService.updatePlan(planId, { status: newStatus });
      showToast(`Plan moved to ${newStatus.replace('_', ' ')}`, 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to update plan', 'error');
    }
  }

  function handleEdit(planId) {
    const plan = allPlans.find((p) => String(p.id) === String(planId));
    if (!plan) return;
    openPlanForm(plan);
  }

  async function handleDelete(planId) {
    const ok = await confirmDialog('Delete this service plan?', 'Confirm Deletion');
    if (!ok) return;

    try {
      await servicePlanService.deletePlan(planId);
      showToast('Service plan deleted', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  }


  // ============================================================
  // FORM HANDLING
  // ============================================================
  function openPlanForm(plan = null) {
    const modal = showModal(renderPlanForm(allProjects, plan || {}));
    const form  = document.getElementById('plan-form');
    if (!form) return;

    // Templates — only for new plans
    const templatesContainer = document.getElementById('plan-templates-container');
    if (templatesContainer && allTemplates.length > 0 && !plan) {
      templatesContainer.innerHTML = renderPlanTemplates(allTemplates);

      initPlanTemplates(templatesContainer, (templateId) => {
        const template = allTemplates.find((t) => String(t.id) === String(templateId));
        if (!template) return;

        const titleInput    = document.getElementById('plan-title');
        const categoryInput = document.getElementById('plan-category');
        const priorityInput = document.getElementById('plan-priority');
        const costInput     = document.getElementById('plan-cost');
        const descInput     = document.getElementById('plan-description');

        if (titleInput)    titleInput.value = template.name;
        if (categoryInput) categoryInput.value = template.category;
        if (priorityInput) priorityInput.value = template.priority;
        if (costInput)     costInput.value = template.estimated_cost;
        if (descInput)     descInput.value = template.description || '';
      });
    }

    modal.element.querySelector('.cancel-plan-btn')?.addEventListener('click', modal.close);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      try {
        if (plan) {
          await servicePlanService.updatePlan(plan.id, data);
          showToast('Service plan updated', 'success');
        } else {
          await servicePlanService.createPlan(data);
          showToast('Service plan created', 'success');
        }
        modal.close();
        await loadPlans();
      } catch (err) {
        showToast(err.message || 'Failed to save plan', 'error');
      }
    });
  }


  // ============================================================
  // BULK ACTIONS
  // ============================================================
  function toggleBulkMode() {
    bulkMode = !bulkMode;
    selectedPlanIds.clear();

    if (bulkMode) {
      bulkModeBtn.classList.add('active');
      bulkModeBtn.innerHTML = '<i class="fas fa-times"></i> Exit Bulk';
      bulkActionsBar.classList.remove('hidden');
      updateBulkCount();

      // Bulk mode only makes sense in list view
      if (currentView !== 'list') {
        setView('list');
      }
    } else {
      bulkModeBtn.classList.remove('active');
      bulkModeBtn.innerHTML = '<i class="fas fa-check-square"></i> Bulk Select';
      bulkActionsBar.classList.add('hidden');
    }

    renderCurrentView();
  }

  function updateBulkCount() {
    bulkCount.textContent = `${selectedPlanIds.size} selected`;
  }

  async function applyBulkStatus(status) {
    if (!status || selectedPlanIds.size === 0) return;
    try {
      await servicePlanService.bulkUpdateStatus([...selectedPlanIds], status);
      showToast(`${selectedPlanIds.size} plans updated`, 'success');
      selectedPlanIds.clear();
      updateBulkCount();
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to update plans', 'error');
    }
  }

  async function applyBulkPriority(priority) {
    if (!priority || selectedPlanIds.size === 0) return;
    try {
      await servicePlanService.bulkUpdatePriority([...selectedPlanIds], priority);
      showToast(`${selectedPlanIds.size} plans updated`, 'success');
      selectedPlanIds.clear();
      updateBulkCount();
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to update plans', 'error');
    }
  }

  async function applyBulkDelete() {
    if (selectedPlanIds.size === 0) return;

    const ok = await confirmDialog(`Delete ${selectedPlanIds.size} plans?`, 'Bulk Delete');
    if (!ok) return;

    try {
      await servicePlanService.bulkDelete([...selectedPlanIds]);
      showToast(`${selectedPlanIds.size} plans deleted`, 'success');
      selectedPlanIds.clear();
      updateBulkCount();
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to delete plans', 'error');
    }
  }


  // ============================================================
  // VIEW SWITCHING
  // ============================================================
  function setView(view) {
    currentView = view;
    viewBoardBtn.classList.toggle('active', view === 'board');
    viewListBtn.classList.toggle('active', view === 'list');
    viewCalendarBtn.classList.toggle('active', view === 'calendar');
    renderCurrentView();
  }


  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  document.getElementById('add-plan-btn').addEventListener('click', () => openPlanForm());

  viewBoardBtn.addEventListener('click', () => setView('board'));
  viewListBtn.addEventListener('click', () => setView('list'));
  viewCalendarBtn.addEventListener('click', () => setView('calendar'));

  bulkModeBtn.addEventListener('click', toggleBulkMode);
  bulkCancelBtn.addEventListener('click', toggleBulkMode);
  bulkStatusSelect.addEventListener('change', (e) => {
    applyBulkStatus(e.target.value);
    e.target.value = '';
  });
  bulkPrioritySelect.addEventListener('change', (e) => {
    applyBulkPriority(e.target.value);
    e.target.value = '';
  });
  bulkDeleteBtn.addEventListener('click', applyBulkDelete);

  // Debounced search
  const handleSearch = debounce((value) => {
    searchTerm = value;
    loadPlans();
  }, SEARCH_DEBOUNCE_MS);
  searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

  // Filters
  projectFilterSelect.addEventListener('change', () => {
    projectFilter = projectFilterSelect.value;
    loadPlans();
  });
  statusFilterSelect.addEventListener('change', () => {
    statusFilter = statusFilterSelect.value;
    loadPlans();
  });
  priorityFilterSelect.addEventListener('change', () => {
    priorityFilter = priorityFilterSelect.value;
    loadPlans();
  });
  sortSelect.addEventListener('change', () => {
    sortOption = sortSelect.value;
    loadPlans();
  });

  // Delegated container clicks
  const onPlansContainerClick = (e) => {
    // Bulk checkbox
    const checkbox = e.target.closest('.plan-checkbox');
    if (checkbox) {
      const planId = String(checkbox.dataset.id);
      if (checkbox.checked) selectedPlanIds.add(planId);
      else                  selectedPlanIds.delete(planId);
      updateBulkCount();
      return;
    }

    // Action buttons
    const btn = e.target.closest('button');
    if (!btn) return;
    const planId = btn.dataset.id;
    if (!planId) return;

    if (btn.classList.contains('approve-plan-btn'))       handleApprove(planId);
    else if (btn.classList.contains('complete-plan-btn')) handleComplete(planId);
    else if (btn.classList.contains('reopen-plan-btn'))   handleReopen(planId);
    else if (btn.classList.contains('edit-plan-btn'))     handleEdit(planId);
    else if (btn.classList.contains('delete-plan-btn'))   handleDelete(planId);
    else if (btn.classList.contains('view-sr-btn'))       handleViewSR(planId);
  };
  plansContainer.addEventListener('click', onPlansContainerClick);


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    plansContainer.removeEventListener('click', onPlansContainerClick);

    if (kanbanCleanup && typeof kanbanCleanup === 'function') {
      try { kanbanCleanup(); } catch (_) { /* ignore */ }
    }
    kanbanCleanup = null;
  });


  // ============================================================
  // INITIAL LOAD
  // ============================================================
  await loadProjects();
  await loadTemplates();
  await loadPlans();
}
