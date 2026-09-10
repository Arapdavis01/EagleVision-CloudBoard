import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { projectService } from '../../services/projectService.js';
import { servicePlanService } from '../../services/servicePlanService.js';
import { showModal } from '../../components/modal.js';
import { renderPlanForm } from '../../components/planForm.js';
import { renderKanbanBoard, initKanbanBoard } from '../../components/kanbanBoard.js';
import { renderPlanTemplates, initPlanTemplates } from '../../components/planTemplates.js';
import { showToast } from '../../utils/notifications.js';
import { confirmDialog } from '../../utils/confirm.js';

export async function servicePlannerPage() {
  document.body.classList.add('app-dashboard');

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="service-planner-header">
        <div class="header-left">
          <div class="page-icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div>
            <h2>Service Planner</h2>
            <p class="page-subtitle">Plan improvements before they become service records</p>
          </div>
        </div>
        <div class="header-actions">
          <button id="add-plan-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> New Plan
          </button>
        </div>
      </div>

      <!-- Enhanced Stats Grid -->
      <div id="planner-stats" class="planner-stats-grid">
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(26,71,42,0.1);">
            <i class="fas fa-layer-group"></i>
          </div>
          <div class="stat-info">
            <h3>Total Plans</h3>
            <p id="stat-total">0</p>
            <span class="stat-trend" id="stat-total-trend"></span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.1);">
            <i class="fas fa-spinner"></i>
          </div>
          <div class="stat-info">
            <h3>In Progress</h3>
            <p id="stat-progress">0</p>
            <span class="stat-trend" id="stat-progress-trend"></span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(239,68,68,0.1);">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="stat-info">
            <h3>High Priority</h3>
            <p id="stat-high">0</p>
            <span class="stat-trend" id="stat-high-trend"></span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.1);">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <h3>Overdue</h3>
            <p id="stat-overdue">0</p>
            <span class="stat-trend" id="stat-overdue-trend"></span>
          </div>
        </div>
      </div>

      <!-- View Toggle -->
      <div class="planner-view-toggle">
        <button id="view-board-btn" class="view-btn active">
          <i class="fas fa-columns"></i> Board
        </button>
        <button id="view-list-btn" class="view-btn">
          <i class="fas fa-list"></i> List
        </button>
        <button id="view-calendar-btn" class="view-btn">
          <i class="fas fa-calendar-alt"></i> Calendar
        </button>
        <div class="view-toggle-spacer"></div>
        <button id="bulk-mode-btn" class="btn btn-sm btn-outline">
          <i class="fas fa-check-square"></i> Bulk Select
        </button>
      </div>

      <!-- Bulk Actions Bar (hidden by default) -->
      <div id="bulk-actions-bar" class="bulk-actions-bar hidden">
        <span id="bulk-count">0 selected</span>
        <select id="bulk-status-select" class="filter-select">
          <option value="">Change Status...</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="bulk-priority-select" class="filter-select">
          <option value="">Change Priority...</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button id="bulk-delete-btn" class="btn btn-sm btn-danger">
          <i class="fas fa-trash"></i> Delete Selected
        </button>
        <button id="bulk-cancel-btn" class="btn btn-sm btn-outline">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>

      <!-- Filters -->
      <div class="planner-toolbar">
        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="plan-search" placeholder="Search plans...">
        </div>
        <select id="project-filter" class="filter-select">
          <option value="">All Projects</option>
        </select>
        <select id="status-filter" class="filter-select">
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="priority-filter" class="filter-select">
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select id="sort-select" class="filter-select">
          <option value="default">Sort: Priority</option>
          <option value="date-asc">Target Date (Earliest)</option>
          <option value="date-desc">Target Date (Latest)</option>
          <option value="cost-asc">Cost (Low to High)</option>
          <option value="cost-desc">Cost (High to Low)</option>
          <option value="created-desc">Newest First</option>
          <option value="created-asc">Oldest First</option>
        </select>
      </div>

      <!-- Plans Container -->
      <div id="plans-container">
        <div class="empty-state">
          <i class="fas fa-clipboard-list fa-3x"></i>
          <p>Loading service plans...</p>
        </div>
      </div>
    </div>
  `;

  initSidebar();

  const escapeHtml = (text) =>
    text ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  // ==================== STATE ====================
  let allProjects = [];
  let allPlans = [];
  let allTemplates = [];
  let searchTerm = '';
  let projectFilter = '';
  let statusFilter = 'all';
  let priorityFilter = 'all';
  let sortOption = 'default';
  let currentView = 'board';
  let bulkMode = false;
  let selectedPlanIds = new Set();

  // ==================== DOM ELEMENTS ====================
  const plansContainer = document.getElementById('plans-container');
  const searchInput = document.getElementById('plan-search');
  const projectFilterSelect = document.getElementById('project-filter');
  const statusFilterSelect = document.getElementById('status-filter');
  const priorityFilterSelect = document.getElementById('priority-filter');
  const sortSelect = document.getElementById('sort-select');
  const viewBoardBtn = document.getElementById('view-board-btn');
  const viewListBtn = document.getElementById('view-list-btn');
  const viewCalendarBtn = document.getElementById('view-calendar-btn');
  const bulkModeBtn = document.getElementById('bulk-mode-btn');
  const bulkActionsBar = document.getElementById('bulk-actions-bar');
  const bulkCount = document.getElementById('bulk-count');
  const bulkStatusSelect = document.getElementById('bulk-status-select');
  const bulkPrioritySelect = document.getElementById('bulk-priority-select');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  const bulkCancelBtn = document.getElementById('bulk-cancel-btn');

  // ==================== DATA LOADING ====================

  async function loadProjects() {
    try {
      allProjects = await projectService.getAll();
      projectFilterSelect.innerHTML = `
        <option value="">All Projects</option>
        ${allProjects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      `;
    } catch (err) {
      console.error('Failed to load projects:', err);
      showToast('Failed to load projects.', 'error');
    }
  }

  async function loadTemplates() {
    try {
      allTemplates = await servicePlanService.getTemplates();
    } catch (err) {
      console.warn('Failed to load templates:', err);
      allTemplates = [];
    }
  }

  async function loadPlans() {
    try {
      const filters = {};
      if (projectFilter) filters.project_id = projectFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (searchTerm) filters.search = searchTerm;
      if (sortOption !== 'default') filters.sort = sortOption;

      allPlans = await servicePlanService.getPlans(filters);
      renderCurrentView();
      loadStats();
    } catch (err) {
      console.error('Failed to load plans:', err);
      plansContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle fa-3x"></i>
          <p>Failed to load service plans.</p>
        </div>
      `;
    }
  }

  async function loadStats() {
    try {
      const stats = await servicePlanService.getStats();
      
      setTextSafely('stat-total', stats.total_plans || 0);
      setTextSafely('stat-progress', stats.in_progress || 0);
      setTextSafely('stat-high', stats.high_priority || 0);
      setTextSafely('stat-overdue', stats.overdue || 0);

      // Trends
      if (stats.new_this_week > 0) {
        setTextSafely('stat-total-trend', `+${stats.new_this_week} this week`);
      }
      if (stats.completed_this_month > 0) {
        setTextSafely('stat-progress-trend', `${stats.completed_this_month} done this month`);
      }
      if (stats.overdue > 0) {
        setTextSafely('stat-overdue-trend', 'Needs attention');
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function setTextSafely(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  }

  // ==================== RENDERING ====================

  function renderCurrentView() {
    if (allPlans.length === 0) {
      plansContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list fa-3x"></i>
          <p>No service plans found. Click "New Plan" to create one.</p>
        </div>
      `;
      return;
    }

    if (currentView === 'board') {
      renderBoard();
    } else if (currentView === 'list') {
      renderList();
    } else if (currentView === 'calendar') {
      renderCalendar();
    }
  }

  function renderBoard() {
    plansContainer.innerHTML = renderKanbanBoard(allPlans, {
      onApprove: handleApprove,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onComplete: handleComplete,
      onReopen: handleReopen,
      onViewSR: handleViewSR
    });

    initKanbanBoard(plansContainer, {
      onApprove: handleApprove,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onComplete: handleComplete,
      onReopen: handleReopen,
      onStatusChange: handleStatusChange
    });
  }

  function renderList() {
    plansContainer.innerHTML = `
      <div class="plans-list-view">
        ${allPlans.map(plan => `
          <div class="plan-list-item ${bulkMode ? 'bulk-selectable' : ''}" data-id="${plan.id}">
            ${bulkMode ? `
              <div class="bulk-checkbox">
                <input type="checkbox" class="plan-checkbox" data-id="${plan.id}" ${selectedPlanIds.has(plan.id) ? 'checked' : ''}>
              </div>
            ` : ''}
            <div class="list-item-priority">${getPriorityBadge(plan.priority)}</div>
            <div class="list-item-content">
              <h4>${escapeHtml(plan.title)}</h4>
              <div class="list-item-meta">
                <span><i class="fas fa-folder-open"></i> ${escapeHtml(plan.project_name || 'Unknown')}</span>
                <span><i class="fas fa-tag"></i> ${escapeHtml(plan.category)}</span>
                ${plan.target_date ? `<span><i class="fas fa-calendar-alt"></i> ${new Date(plan.target_date).toLocaleDateString()}</span>` : ''}
                ${plan.estimated_cost > 0 ? `<span><i class="fas fa-dollar-sign"></i> $${parseFloat(plan.estimated_cost).toLocaleString()}</span>` : ''}
              </div>
            </div>
            <div class="list-item-status">${getStatusBadge(plan.status)}</div>
            <div class="list-item-actions">
              ${renderActionButtons(plan)}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthName = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Group plans by date
    const plansByDate = {};
    allPlans.forEach(plan => {
      if (plan.target_date) {
        const dateKey = new Date(plan.target_date).toISOString().slice(0, 10);
        if (!plansByDate[dateKey]) plansByDate[dateKey] = [];
        plansByDate[dateKey].push(plan);
      }
    });

    let calendarHtml = `
      <div class="calendar-view">
        <div class="calendar-header">
          <h3>${monthName}</h3>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day-header">Sun</div>
          <div class="calendar-day-header">Mon</div>
          <div class="calendar-day-header">Tue</div>
          <div class="calendar-day-header">Wed</div>
          <div class="calendar-day-header">Thu</div>
          <div class="calendar-day-header">Fri</div>
          <div class="calendar-day-header">Sat</div>
    `;

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarHtml += `<div class="calendar-day empty"></div>`;
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayPlans = plansByDate[dateKey] || [];
      const isToday = day === today.getDate();

      calendarHtml += `
        <div class="calendar-day ${isToday ? 'today' : ''}">
          <span class="day-number">${day}</span>
          <div class="day-plans">
            ${dayPlans.slice(0, 3).map(p => `
              <div class="calendar-plan-dot ${p.priority}" title="${escapeHtml(p.title)}"></div>
            `).join('')}
            ${dayPlans.length > 3 ? `<span class="more-plans">+${dayPlans.length - 3}</span>` : ''}
          </div>
        </div>
      `;
    }

    calendarHtml += `</div></div>`;
    plansContainer.innerHTML = calendarHtml;
  }

  function renderActionButtons(plan) {
    return `
      ${plan.status === 'planned' ? `
        <button class="btn btn-sm btn-primary approve-plan-btn" data-id="${plan.id}" title="Approve & Create SR">
          <i class="fas fa-check"></i>
        </button>
      ` : ''}
      ${plan.status === 'in_progress' ? `
        <button class="btn btn-sm btn-success complete-plan-btn" data-id="${plan.id}" title="Mark Complete">
          <i class="fas fa-check-circle"></i>
        </button>
      ` : ''}
      ${plan.status === 'completed' || plan.status === 'cancelled' ? `
        <button class="btn btn-sm btn-outline reopen-plan-btn" data-id="${plan.id}" title="Reopen">
          <i class="fas fa-undo"></i>
        </button>
      ` : ''}
      <button class="btn btn-sm edit-plan-btn" data-id="${plan.id}" title="Edit">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn btn-sm btn-danger delete-plan-btn" data-id="${plan.id}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    `;
  }

  // ==================== BADGE HELPERS ====================

  function getPriorityBadge(priority) {
    const badges = {
      high: '<span class="badge priority-high">HIGH</span>',
      medium: '<span class="badge priority-medium">MEDIUM</span>',
      low: '<span class="badge priority-low">LOW</span>'
    };
    return badges[priority] || badges.medium;
  }

  function getStatusBadge(status) {
    const badges = {
      planned: '<span class="badge status-planned">PLANNED</span>',
      in_progress: '<span class="badge status-in-progress">IN PROGRESS</span>',
      completed: '<span class="badge status-completed">COMPLETED</span>',
      cancelled: '<span class="badge status-cancelled">CANCELLED</span>'
    };
    return badges[status] || badges.planned;
  }

  // ==================== ACTION HANDLERS ====================

  async function handleApprove(planId) {
    const confirmed = await confirmDialog(
      'Create Service Record from this plan?',
      'Approve Plan'
    );
    if (!confirmed) return;

    try {
      const result = await servicePlanService.approvePlan(planId);
      showToast('Service record created!', 'success');
      await loadPlans();

      const viewSR = await confirmDialog(
        'Service record created successfully. View it now?',
        'View Service Record'
      );
      if (viewSR && result.service_record) {
        location.hash = `#service-record?project_id=${result.service_record.project_id}`;
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve plan', 'error');
    }
  }

  async function handleComplete(planId) {
    const confirmed = await confirmDialog('Mark this plan as completed?', 'Complete Plan');
    if (!confirmed) return;

    try {
      await servicePlanService.completePlan(planId);
      showToast('Plan marked as completed', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to complete plan', 'error');
    }
  }

  async function handleReopen(planId) {
    const confirmed = await confirmDialog('Reopen this plan?', 'Reopen Plan');
    if (!confirmed) return;

    try {
      await servicePlanService.reopenPlan(planId);
      showToast('Plan reopened', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to reopen plan', 'error');
    }
  }

  function handleViewSR(planId) {
    const plan = allPlans.find(p => p.id == planId);
    if (plan) {
      location.hash = `#service-record?project_id=${plan.project_id}`;
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
    const plan = allPlans.find(p => p.id == planId);
    if (!plan) return;

    openPlanForm(plan);
  }

  async function handleDelete(planId) {
    const confirmed = await confirmDialog('Delete this service plan?', 'Confirm Deletion');
    if (!confirmed) return;

    try {
      await servicePlanService.deletePlan(planId);
      showToast('Service plan deleted', 'success');
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  }

  // ==================== FORM HANDLING ====================

  function openPlanForm(plan = null) {
    const { close } = showModal(renderPlanForm(allProjects, plan || {}));
    const form = document.getElementById('plan-form');
    if (!form) return;

    // Initialize templates if available
    const templatesContainer = document.getElementById('plan-templates-container');
    if (templatesContainer && allTemplates.length > 0 && !plan) {
      templatesContainer.innerHTML = renderPlanTemplates(allTemplates);
      initPlanTemplates(templatesContainer, (templateId) => {
        const template = allTemplates.find(t => t.id == templateId);
        if (template) {
          // Fill form fields
          const titleInput = document.getElementById('plan-title');
          const categoryInput = document.getElementById('plan-category');
          const priorityInput = document.getElementById('plan-priority');
          const costInput = document.getElementById('plan-cost');
          const descInput = document.getElementById('plan-description');

          if (titleInput) titleInput.value = template.name;
          if (categoryInput) categoryInput.value = template.category;
          if (priorityInput) priorityInput.value = template.priority;
          if (costInput) costInput.value = template.estimated_cost;
          if (descInput) descInput.value = template.description || '';
        }
      });
    }

    document.querySelector('.cancel-plan-btn')?.addEventListener('click', () => close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        if (plan) {
          await servicePlanService.updatePlan(plan.id, data);
          showToast('Service plan updated', 'success');
        } else {
          await servicePlanService.createPlan(data);
          showToast('Service plan created', 'success');
        }
        close();
        await loadPlans();
      } catch (err) {
        showToast(err.message || 'Failed to save plan', 'error');
      }
    });
  }

  // ==================== BULK ACTIONS ====================

  function toggleBulkMode() {
    bulkMode = !bulkMode;
    selectedPlanIds.clear();
    
    if (bulkMode) {
      bulkModeBtn.classList.add('active');
      bulkModeBtn.innerHTML = '<i class="fas fa-times"></i> Exit Bulk';
      bulkActionsBar.classList.remove('hidden');
      updateBulkCount();
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
      await servicePlanService.bulkUpdateStatus(Array.from(selectedPlanIds), status);
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
      await servicePlanService.bulkUpdatePriority(Array.from(selectedPlanIds), priority);
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

    const confirmed = await confirmDialog(
      `Delete ${selectedPlanIds.size} plans?`,
      'Bulk Delete'
    );
    if (!confirmed) return;

    try {
      await servicePlanService.bulkDelete(Array.from(selectedPlanIds));
      showToast(`${selectedPlanIds.size} plans deleted`, 'success');
      selectedPlanIds.clear();
      updateBulkCount();
      await loadPlans();
    } catch (err) {
      showToast(err.message || 'Failed to delete plans', 'error');
    }
  }

  // ==================== EVENT LISTENERS ====================

  // Add plan
  document.getElementById('add-plan-btn').addEventListener('click', () => openPlanForm());

  // View toggles
  viewBoardBtn.addEventListener('click', () => {
    currentView = 'board';
    viewBoardBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    viewCalendarBtn.classList.remove('active');
    renderCurrentView();
  });

  viewListBtn.addEventListener('click', () => {
    currentView = 'list';
    viewListBtn.classList.add('active');
    viewBoardBtn.classList.remove('active');
    viewCalendarBtn.classList.remove('active');
    renderCurrentView();
  });

  viewCalendarBtn.addEventListener('click', () => {
    currentView = 'calendar';
    viewCalendarBtn.classList.add('active');
    viewBoardBtn.classList.remove('active');
    viewListBtn.classList.remove('active');
    renderCurrentView();
  });

  // Bulk mode
  bulkModeBtn.addEventListener('click', toggleBulkMode);
  bulkCancelBtn.addEventListener('click', toggleBulkMode);
  bulkStatusSelect.addEventListener('change', (e) => applyBulkStatus(e.target.value));
  bulkPrioritySelect.addEventListener('change', (e) => applyBulkPriority(e.target.value));
  bulkDeleteBtn.addEventListener('click', applyBulkDelete);

  // Search with debounce
  searchInput.addEventListener('input', debounce(() => {
    searchTerm = searchInput.value;
    loadPlans();
  }, 300));

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

  // Plan actions event delegation for list view
  plansContainer.addEventListener('click', async (e) => {
    // Bulk checkbox
    const checkbox = e.target.closest('.plan-checkbox');
    if (checkbox) {
      const planId = checkbox.dataset.id;
      if (checkbox.checked) {
        selectedPlanIds.add(planId);
      } else {
        selectedPlanIds.delete(planId);
      }
      updateBulkCount();
      return;
    }

    const btn = e.target.closest('button');
    if (!btn) return;
    const planId = btn.dataset.id;

    if (btn.classList.contains('approve-plan-btn')) {
      handleApprove(planId);
    } else if (btn.classList.contains('complete-plan-btn')) {
      handleComplete(planId);
    } else if (btn.classList.contains('reopen-plan-btn')) {
      handleReopen(planId);
    } else if (btn.classList.contains('edit-plan-btn')) {
      handleEdit(planId);
    } else if (btn.classList.contains('delete-plan-btn')) {
      handleDelete(planId);
    } else if (btn.classList.contains('view-sr-btn')) {
      handleViewSR(planId);
    }
  });

  // ==================== INITIALIZATION ====================

  await loadProjects();
  await loadTemplates();
  await loadPlans();
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
