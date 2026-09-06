export function renderKanbanBoard(plans, { onApprove, onEdit, onDelete, onComplete, onReopen, onViewSR }) {
  const columns = [
    { id: 'planned', title: 'Planned', icon: 'fa-clipboard-list', color: '#e0f2fe' },
    { id: 'in_progress', title: 'In Progress', icon: 'fa-spinner', color: '#dbeafe' },
    { id: 'completed', title: 'Completed', icon: 'fa-check-circle', color: '#dcfce7' },
    { id: 'cancelled', title: 'Cancelled', icon: 'fa-times-circle', color: '#f3f4f6' }
  ];

  const escapeHtml = (text) =>
    text ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

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

  function getProgressBar(plan) {
    let progress = 0;
    if (plan.status === 'planned') progress = 25;
    else if (plan.status === 'in_progress') progress = 60;
    else if (plan.status === 'completed') progress = 100;
    else if (plan.status === 'cancelled') progress = 0;
    
    return `
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${progress}%; background: ${progress === 100 ? '#10b981' : progress >= 60 ? '#3b82f6' : '#f59e0b'};"></div>
      </div>
    `;
  }

  function renderCard(plan) {
    return `
      <div class="kanban-card" draggable="true" data-id="${plan.id}" data-status="${plan.status}">
        <div class="kanban-card-header">
          ${getPriorityBadge(plan.priority)}
          <span class="kanban-card-id">#${plan.id}</span>
        </div>
        <h4 class="kanban-card-title">${escapeHtml(plan.title)}</h4>
        <div class="kanban-card-project">
          <i class="fas fa-folder-open"></i> ${escapeHtml(plan.project_name || 'Unknown')}
        </div>
        <div class="kanban-card-meta">
          <span><i class="fas fa-tag"></i> ${escapeHtml(plan.category)}</span>
          ${plan.estimated_cost > 0 ? `<span><i class="fas fa-dollar-sign"></i> $${parseFloat(plan.estimated_cost).toLocaleString()}</span>` : ''}
        </div>
        ${plan.target_date ? `
          <div class="kanban-card-date ${new Date(plan.target_date) < new Date() && plan.status === 'planned' ? 'overdue' : ''}">
            <i class="fas fa-calendar-alt"></i> ${new Date(plan.target_date).toLocaleDateString()}
          </div>
        ` : ''}
        ${getProgressBar(plan)}
        <div class="kanban-card-actions">
          ${plan.status === 'planned' ? `
            <button class="btn btn-sm btn-primary kanban-approve-btn" data-id="${plan.id}" title="Approve & Create SR">
              <i class="fas fa-check"></i>
            </button>
          ` : ''}
          ${plan.status === 'in_progress' ? `
            <button class="btn btn-sm btn-success kanban-complete-btn" data-id="${plan.id}" title="Mark Complete">
              <i class="fas fa-check-circle"></i>
            </button>
          ` : ''}
          ${plan.status === 'completed' || plan.status === 'cancelled' ? `
            <button class="btn btn-sm btn-outline kanban-reopen-btn" data-id="${plan.id}" title="Reopen">
              <i class="fas fa-undo"></i>
            </button>
          ` : ''}
          <button class="btn btn-sm kanban-edit-btn" data-id="${plan.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger kanban-delete-btn" data-id="${plan.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  function renderColumn(column) {
    const columnPlans = plans.filter(p => p.status === column.id);
    
    return `
      <div class="kanban-column" data-status="${column.id}" style="border-top: 3px solid ${column.color};">
        <div class="kanban-column-header">
          <h3><i class="fas ${column.icon}" style="color: ${column.color};"></i> ${column.title}</h3>
          <span class="kanban-count">${columnPlans.length}</span>
        </div>
        <div class="kanban-column-body" data-status="${column.id}">
          ${columnPlans.length > 0 
            ? columnPlans.map(plan => renderCard(plan)).join('')
            : '<div class="kanban-empty">No plans</div>'
          }
        </div>
      </div>
    `;
  }

  return `
    <div class="kanban-board">
      ${columns.map(col => renderColumn(col)).join('')}
    </div>
  `;
}

export function initKanbanBoard(container, callbacks) {
  // Drag and drop functionality
  const cards = container.querySelectorAll('.kanban-card');
  const columns = container.querySelectorAll('.kanban-column-body');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      
      const planId = e.dataTransfer.getData('text/plain');
      const newStatus = column.dataset.status;
      
      if (planId && newStatus && callbacks.onStatusChange) {
        callbacks.onStatusChange(planId, newStatus);
      }
    });
  });

  // Button click handlers
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const planId = btn.dataset.id;

    if (btn.classList.contains('kanban-approve-btn')) {
      callbacks.onApprove(planId);
    } else if (btn.classList.contains('kanban-complete-btn')) {
      callbacks.onComplete(planId);
    } else if (btn.classList.contains('kanban-reopen-btn')) {
      callbacks.onReopen(planId);
    } else if (btn.classList.contains('kanban-edit-btn')) {
      callbacks.onEdit(planId);
    } else if (btn.classList.contains('kanban-delete-btn')) {
      callbacks.onDelete(planId);
    }
  });
}
