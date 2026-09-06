import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { projectService } from '../../services/projectService.js';
import { servicePlanService } from '../../services/servicePlanService.js';
import { showModal } from '../../components/modal.js';
import { renderPlanForm } from '../../components/planForm.js';
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

      <!-- Stats Grid -->
      <div id="planner-stats" class="planner-stats-grid">
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(26,71,42,0.1);">
            <i class="fas fa-layer-group"></i>
          </div>
          <div class="stat-info">
            <h3>Total Plans</h3>
            <p id="stat-total">0</p>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.1);">
            <i class="fas fa-spinner"></i>
          </div>
          <div class="stat-info">
            <h3>In Progress</h3>
            <p id="stat-progress">0</p>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(239,68,68,0.1);">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="stat-info">
            <h3>High Priority</h3>
            <p id="stat-high">0</p>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.1);">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <h3>Overdue</h3>
            <p id="stat-overdue">0</p>
          </div>
        </div>
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

  // State
  let allProjects = [];
  let allPlans = [];
  let searchTerm = '';
  let projectFilter = '';
  let statusFilter = 'all';
  let priorityFilter = 'all';

  const plansContainer = document.getElementById('plans-container');
  const searchInput = document.getElementById('plan-search');
  const projectFilterSelect = document.getElementById('project-filter');
  const statusFilterSelect = document.getElementById('status-filter');
  const priorityFilterSelect = document.getElementById('priority-filter');

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

  async function loadPlans() {
    try {
      const filters = {};
      if (projectFilter) filters.project_id = projectFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (searchTerm) filters.search = searchTerm;

      allPlans = await servicePlanService.getPlans(filters);
      renderPlans();
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
      document.getElementById('stat-total').textContent = stats.total_plans || 0;
      document.getElementById('stat-progress').textContent = stats.in_progress || 0;
      document.getElementById('stat-high').textContent = stats.high_priority || 0;
      document.getElementById('stat-overdue').textContent = stats.overdue || 0;
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

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

  function getCategoryIcon(category) {
    const icons = {
      'Feature': 'fa-plus',
      'Bug Fix': 'fa-bug',
      'Maintenance': 'fa-wrench',
      'Upgrade': 'fa-arrow-up',
      'Other': 'fa-circle'
    };
    return icons[category] || 'fa-circle';
  }

  function renderPlans() {
    if (allPlans.length === 0) {
      plansContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list fa-3x"></i>
          <p>No service plans found.</p>
        </div>
      `;
      return;
    }

    plansContainer.innerHTML = `
      <div class="plans-grid">
        ${allPlans.map(plan => `
          <div class="plan-card glass-card" data-id="${plan.id}">
            <div class="plan-card-header">
              ${getPriorityBadge(plan.priority)}
              ${getStatusBadge(plan.status)}
            </div>
            <h3 class="plan-title">${escapeHtml(plan.title)}</h3>
            <div class="plan-project">
              <i class="fas fa-folder-open"></i> ${escapeHtml(plan.project_name || 'Unknown Project')}
            </div>
            <div class="plan-meta">
              <span><i class="fas ${getCategoryIcon(plan.category)}"></i> ${escapeHtml(plan.category)}</span>
              ${plan.estimated_cost > 0 ? `<span><i class="fas fa-dollar-sign"></i> $${parseFloat(plan.estimated_cost).toLocaleString()}</span>` : ''}
              ${plan.target_date ? `<span><i class="fas fa-calendar-alt"></i> ${new Date(plan.target_date).toLocaleDateString()}</span>` : ''}
            </div>
            ${plan.description ? `<p class="plan-description">${escapeHtml(plan.description)}</p>` : ''}
            ${plan.update_id ? `
              <div class="plan-link">
                <i class="fas fa-link"></i> Linked SR: #${plan.update_id}
              </div>
            ` : ''}
            <div class="plan-actions">
              ${plan.status === 'planned' ? `
                <button class="btn btn-sm btn-primary approve-plan-btn" data-id="${plan.id}">
                  <i class="fas fa-check"></i> Approve & Create SR
                </button>
              ` : ''}
              ${plan.status === 'in_progress' && plan.update_id ? `
                <button class="btn btn-sm btn-outline view-sr-btn" data-update-id="${plan.update_id}">
                  <i class="fas fa-link"></i> View SR
                </button>
                <button class="btn btn-sm btn-success complete-plan-btn" data-id="${plan.id}">
                  <i class="fas fa-check-circle"></i> Mark Complete
                </button>
              ` : ''}
              ${plan.status === 'completed' ? `
                <button class="btn btn-sm btn-outline reopen-plan-btn" data-id="${plan.id}">
                  <i class="fas fa-undo"></i> Reopen
                </button>
              ` : ''}
              <button class="btn btn-sm edit-plan-btn" data-id="${plan.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger delete-plan-btn" data-id="${plan.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Event Listeners
  document.getElementById('add-plan-btn').addEventListener('click', () => {
    const { close } = showModal(renderPlanForm(allProjects));
    const form = document.getElementById('plan-form');
    if (!form) return;

    document.querySelector('.cancel-plan-btn')?.addEventListener('click', () => close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      try {
        await servicePlanService.createPlan(data);
        close();
        showToast('Service plan created', 'success');
        loadPlans();
      } catch (err) {
        showToast(err.message || 'Failed to create plan', 'error');
      }
    });
  });

  // Search
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

  // Plan actions (event delegation)
  plansContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const planId = btn.dataset.id;

    // Approve plan
    if (btn.classList.contains('approve-plan-btn')) {
      const confirmed = await confirmDialog(
        'Create Service Record from this plan?',
        'Approve Plan'
      );
      if (!confirmed) return;
      
      try {
        const result = await servicePlanService.approvePlan(planId);
        showToast('Service record created!', 'success');
        loadPlans();
        
        // Ask if user wants to view the service record
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

    // View Service Record
    if (btn.classList.contains('view-sr-btn')) {
      const updateId = btn.dataset.updateId;
      // Navigate to service record page
      const plan = allPlans.find(p => p.id == planId);
      if (plan) {
        location.hash = `#service-record?project_id=${plan.project_id}`;
      }
    }

    // Complete plan
    if (btn.classList.contains('complete-plan-btn')) {
      const confirmed = await confirmDialog(
        'Mark this plan as completed?',
        'Complete Plan'
      );
      if (!confirmed) return;
      
      try {
        await servicePlanService.completePlan(planId);
        showToast('Plan marked as completed', 'success');
        loadPlans();
      } catch (err) {
        showToast(err.message || 'Failed to complete plan', 'error');
      }
    }

    // Reopen plan
    if (btn.classList.contains('reopen-plan-btn')) {
      const confirmed = await confirmDialog(
        'Reopen this plan?',
        'Reopen Plan'
      );
      if (!confirmed) return;
      
      try {
        await servicePlanService.reopenPlan(planId);
        showToast('Plan reopened', 'success');
       
