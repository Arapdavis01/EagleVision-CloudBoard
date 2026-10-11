// ============================================================
// EAGLEVISION CLOUDBOARD — KANBAN BOARD COMPONENT
// ============================================================
// Renders and initializes a Kanban board for service plans.
//
// Public API:
//   renderKanbanBoard(plans, callbacks)  → HTML string
//   initKanbanBoard(container, callbacks) → cleanup function
//
// Callbacks:
//   onApprove(planId)
//   onComplete(planId)
//   onReopen(planId)
//   onEdit(planId)
//   onDelete(planId)
//   onStatusChange(planId, newStatus)
//   onViewSR(planId)  — reserved; not used in current layout
//
// IMPORTANT: The container MUST persist across re-renders. The
// cleanup function returned by initKanbanBoard removes every
// listener it attached. The page must call it before swapping
// out the container's HTML, or a new instance is created on top
// of the old one and every button fires multiple times.
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { format }                 from '../utils/format.js';


// ============================================================
// CONSTANTS
// ============================================================
const COLUMNS = [
  { id: 'planned',     title: 'Planned',     icon: 'fa-clipboard-list', tint: 'var(--cyan-soft)' },
  { id: 'in_progress', title: 'In Progress', icon: 'fa-spinner',        tint: 'rgba(124, 58, 237, 0.08)' },
  { id: 'completed',   title: 'Completed',   icon: 'fa-check-circle',   tint: 'var(--primary-tint)' },
  { id: 'cancelled',   title: 'Cancelled',   icon: 'fa-times-circle',   tint: 'var(--bg-subtle)' },
];

const PRIORITY_BADGES = {
  high:   '<span class="badge priority-high">HIGH</span>',
  medium: '<span class="badge priority-medium">MEDIUM</span>',
  low:    '<span class="badge priority-low">LOW</span>',
};

const PROGRESS_MAP = {
  planned:     25,
  in_progress: 60,
  completed:   100,
  cancelled:   0,
};

const PROGRESS_COLORS = {
  100: 'var(--primary)',
  60:  'var(--cyan)',
  25:  'var(--status-warn)',
  0:   'var(--text-muted)',
};


// ============================================================
// RENDER
// ============================================================

/**
 * Build the Kanban board HTML.
 * @param {Array}  plans     List of plan objects
 * @param {Object} callbacks Currently unused at render time,
 *                           kept for signature compatibility.
 * @returns {string} HTML
 */
export function renderKanbanBoard(plans = [], callbacks = {}) {
  return `
    <div class="kanban-board">
      ${COLUMNS.map((col) => renderColumn(col, plans)).join('')}
    </div>
  `;
}


// ============================================================
// INIT — attaches delegated listeners; returns a cleanup fn
// ============================================================

/**
 * Attach drag + click listeners to a Kanban container.
 * @param {HTMLElement} container
 * @param {Object}      callbacks
 * @returns {Function}  cleanup — call this BEFORE re-rendering
 */
export function initKanbanBoard(container, callbacks = {}) {
  if (!container) return () => {};

  const {
    onApprove,
    onComplete,
    onReopen,
    onEdit,
    onDelete,
    onStatusChange,
    onViewSR,
  } = callbacks;


  // ---------- Click (button actions) ----------
  const onClick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const planId = btn.dataset.id;
    if (!planId) return;

    if (btn.classList.contains('kanban-approve-btn'))       onApprove?.(planId);
    else if (btn.classList.contains('kanban-complete-btn')) onComplete?.(planId);
    else if (btn.classList.contains('kanban-reopen-btn'))   onReopen?.(planId);
    else if (btn.classList.contains('kanban-edit-btn'))     onEdit?.(planId);
    else if (btn.classList.contains('kanban-delete-btn'))   onDelete?.(planId);
    else if (btn.classList.contains('kanban-view-sr-btn'))  onViewSR?.(planId);
  };


  // ---------- Drag & drop ----------
  const onDragStart = (e) => {
    const card = e.target.closest('.kanban-card');
    if (!card) return;

    card.classList.add('dragging');
    try {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) { /* some browsers restrict setData */ }
  };

  const onDragEnd = (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    // Clean up any lingering drag-over highlights
    container.querySelectorAll('.kanban-column-body.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });
  };

  const onDragOver = (e) => {
    const col = e.target.closest('.kanban-column-body');
    if (!col) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    col.classList.add('drag-over');
  };

  const onDragLeave = (e) => {
    const col = e.target.closest('.kanban-column-body');
    if (!col) return;
    // Only remove if we actually left the column (not just moved to a child)
    if (!col.contains(e.relatedTarget)) {
      col.classList.remove('drag-over');
    }
  };

  const onDrop = (e) => {
    const col = e.target.closest('.kanban-column-body');
    if (!col) return;
    e.preventDefault();

    col.classList.remove('drag-over');

    let planId = '';
    try {
      planId = e.dataTransfer.getData('text/plain');
    } catch (_) { /* ignore */ }

    const newStatus = col.dataset.status;
    if (planId && newStatus) {
      onStatusChange?.(planId, newStatus);
    }
  };


  // ---------- Attach ----------
  container.addEventListener('click', onClick);
  container.addEventListener('dragstart', onDragStart);
  container.addEventListener('dragend', onDragEnd);
  container.addEventListener('dragover', onDragOver);
  container.addEventListener('dragleave', onDragLeave);
  container.addEventListener('drop', onDrop);


  // ---------- Cleanup ----------
  return () => {
    container.removeEventListener('click', onClick);
    container.removeEventListener('dragstart', onDragStart);
    container.removeEventListener('dragend', onDragEnd);
    container.removeEventListener('dragover', onDragOver);
    container.removeEventListener('dragleave', onDragLeave);
    container.removeEventListener('drop', onDrop);
  };
}


// ============================================================
// INTERNAL RENDERERS
// ============================================================

function renderColumn(column, plans) {
  const columnPlans = plans.filter((p) => p.status === column.id);

  return `
    <div class="kanban-column" data-status="${escapeAttr(column.id)}">
      <div class="kanban-column-header">
        <h3>
          <i class="fas ${column.icon}" style="color:${column.tint};"></i>
          ${column.title}
        </h3>
        <span class="kanban-count">${columnPlans.length}</span>
      </div>
      <div class="kanban-column-body" data-status="${escapeAttr(column.id)}">
        ${columnPlans.length > 0
          ? columnPlans.map(renderCard).join('')
          : '<div class="kanban-empty">No plans</div>'}
      </div>
    </div>
  `;
}


function renderCard(plan) {
  const id = escapeAttr(plan.id);

  const progress = PROGRESS_MAP[plan.status] ?? 0;
  const progressColor = PROGRESS_COLORS[progress] || PROGRESS_COLORS[0];

  const isOverdue = plan.status === 'planned' &&
                    plan.target_date &&
                    new Date(plan.target_date).getTime() < Date.now();

  const datePart = plan.target_date ? `
    <div class="kanban-card-date ${isOverdue ? 'overdue' : ''}">
      <i class="fas fa-calendar-alt"></i> ${format.date(plan.target_date)}
    </div>
  ` : '';

  const costPart = (Number(plan.estimated_cost) > 0) ? `
    <span>
      <i class="fas fa-dollar-sign"></i>
      ${format.currency(plan.estimated_cost)}
    </span>
  ` : '';

  return `
    <div class="kanban-card" draggable="true" data-id="${id}" data-status="${escapeAttr(plan.status)}">
      <div class="kanban-card-header">
        ${PRIORITY_BADGES[plan.priority] || PRIORITY_BADGES.medium}
        <span class="kanban-card-id">#${escapeHtml(plan.id)}</span>
      </div>

      <h4 class="kanban-card-title">${escapeHtml(plan.title)}</h4>

      <div class="kanban-card-project">
        <i class="fas fa-folder-open"></i> ${escapeHtml(plan.project_name || 'Unknown')}
      </div>

      <div class="kanban-card-meta">
        <span><i class="fas fa-tag"></i> ${escapeHtml(plan.category)}</span>
        ${costPart}
      </div>

      ${datePart}

      <div class="progress-bar-container">
        <div class="progress-bar" style="width:${progress}%; background:${progressColor};"></div>
      </div>

      <div class="kanban-card-actions">
        ${renderCardActions(plan, id)}
      </div>
    </div>
  `;
}


function renderCardActions(plan, escapedId) {
  const approve = plan.status === 'planned' ? `
    <button type="button" class="btn btn-sm btn-primary kanban-approve-btn" data-id="${escapedId}" title="Approve & Create SR">
      <i class="fas fa-check"></i>
    </button>
  ` : '';

  const complete = plan.status === 'in_progress' ? `
    <button type="button" class="btn btn-sm btn-success kanban-complete-btn" data-id="${escapedId}" title="Mark Complete">
      <i class="fas fa-check-circle"></i>
    </button>
  ` : '';

  const reopen = (plan.status === 'completed' || plan.status === 'cancelled') ? `
    <button type="button" class="btn btn-sm btn-outline kanban-reopen-btn" data-id="${escapedId}" title="Reopen">
      <i class="fas fa-undo"></i>
    </button>
  ` : '';

  return `
    ${approve}
    ${complete}
    ${reopen}
    <button type="button" class="btn btn-sm kanban-edit-btn" data-id="${escapedId}" title="Edit">
      <i class="fas fa-edit"></i>
    </button>
    <button type="button" class="btn btn-sm btn-danger kanban-delete-btn" data-id="${escapedId}" title="Delete">
      <i class="fas fa-trash"></i>
    </button>
  `;
}
