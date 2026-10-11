// ============================================================
// EAGLEVISION CLOUDBOARD — SERVICE PLAN FORM
// ============================================================
// Renders the Add/Edit Service Plan form used inside a modal.
//
// Usage:
//   renderPlanForm(projects)            → empty form (create)
//   renderPlanForm(projects, plan)      → prefilled form (edit)
//
// Notes:
//   • Default target date uses LOCAL time (+30 days), not UTC
//   • All attribute values escaped via shared utils
//   • Priority defaults to 'medium' when creating
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';


// ============================================================
// CONSTANTS
// ============================================================
const PLAN_CATEGORIES = [
  'Feature',
  'Bug Fix',
  'Maintenance',
  'Upgrade',
  'Other',
];

const PLAN_PRIORITIES = [
  { value: 'high',   label: 'High'   },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low'    },
];

const PLAN_STATUSES = [
  { value: 'planned',     label: 'Planned'     },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed'   },
  { value: 'cancelled',   label: 'Cancelled'   },
];

const DEFAULT_PRIORITY = 'medium';


// ============================================================
// HELPERS
// ============================================================
function devOnly(label) {
  return (err) => {
    if (import.meta?.env?.DEV) console.warn(`[planForm] ${label}:`, err);
  };
}

function isSameId(a, b) {
  if (a === null || a === undefined || a === '') return false;
  if (b === null || b === undefined || b === '') return false;
  return String(a) === String(b);
}

/**
 * Today + offset days, formatted as YYYY-MM-DD in LOCAL time.
 */
function localDatePlus(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


// ============================================================
// RENDER
// ============================================================
export function renderPlanForm(projects = [], plan = {}) {
  const isEdit = Boolean(plan.id);
  const defaultTargetDate = localDatePlus(30);

  // ---------- Build options ----------
  const projectOptions = Array.isArray(projects) && projects.length > 0
    ? projects.map((p) => `
        <option
          value="${escapeAttr(p.id)}"
          ${isSameId(plan.project_id, p.id) ? 'selected' : ''}
        >
          ${escapeHtml(p.name)}
        </option>
      `).join('')
    : '';

  const categoryOptions = PLAN_CATEGORIES.map((c) => `
    <option value="${escapeAttr(c)}" ${plan.category === c ? 'selected' : ''}>
      ${escapeHtml(c)}
    </option>
  `).join('');

  const currentPriority = plan.priority || DEFAULT_PRIORITY;
  const priorityOptions = PLAN_PRIORITIES.map((p) => `
    <option value="${escapeAttr(p.value)}" ${currentPriority === p.value ? 'selected' : ''}>
      ${escapeHtml(p.label)}
    </option>
  `).join('');

  const statusOptions = PLAN_STATUSES.map((s) => `
    <option value="${escapeAttr(s.value)}" ${plan.status === s.value ? 'selected' : ''}>
      ${escapeHtml(s.label)}
    </option>
  `).join('');

  return `
    <div class="plan-form-container">

      <!-- HEADER -->
      <div class="plan-form-header">
        <div class="plan-form-icon">
          <i class="fas fa-${isEdit ? 'edit' : 'clipboard-list'}"></i>
        </div>
        <div class="plan-form-title">
          <h2>${isEdit ? 'Edit Service Plan' : 'Create New Service Plan'}</h2>
          <p>${isEdit ? 'Update the details of your service plan' : 'Plan a new improvement for your project'}</p>
        </div>
      </div>

      ${!isEdit ? `
        <!-- Templates (loaded by caller via initPlanTemplates) -->
        <div id="plan-templates-container" class="plan-templates-container"></div>
      ` : ''}

      <form id="plan-form" class="plan-form" autocomplete="off" novalidate>
        <input type="hidden" name="id" value="${escapeAttr(plan.id || '')}">

        <!-- SECTION 1: Project & Title -->
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-folder-open"></i></span>
            Project Details
          </h3>

          <div class="form-field">
            <label for="plan-project">
              <i class="fas fa-building"></i> Project <span class="required">*</span>
            </label>
            <select id="plan-project" name="project_id" required class="modern-select">
              <option value="">Select a project...</option>
              ${projectOptions}
            </select>
          </div>

          <div class="form-field">
            <label for="plan-title">
              <i class="fas fa-heading"></i> Title <span class="required">*</span>
            </label>
            <input
              type="text"
              id="plan-title"
              name="title"
              value="${escapeAttr(plan.title)}"
              required
              placeholder="What improvement do you want to make?"
              class="modern-input"
            >
          </div>
        </div>

        <!-- SECTION 2: Classification -->
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-tasks"></i></span>
            Classification
          </h3>

          <div class="form-row-2">
            <div class="form-field">
              <label for="plan-category">
                <i class="fas fa-tag"></i> Category <span class="required">*</span>
              </label>
              <select id="plan-category" name="category" required class="modern-select">
                ${categoryOptions}
              </select>
            </div>

            <div class="form-field">
              <label for="plan-priority">
                <i class="fas fa-flag"></i> Priority
              </label>
              <select id="plan-priority" name="priority" class="modern-select">
                ${priorityOptions}
              </select>
            </div>
          </div>
        </div>

        <!-- SECTION 3: Schedule & Budget -->
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-calendar-alt"></i></span>
            Schedule &amp; Budget
          </h3>

          <div class="form-row-2">
            <div class="form-field">
              <label for="plan-cost">
                <i class="fas fa-dollar-sign"></i> Estimated Cost
              </label>
              <div class="input-with-prefix">
                <span class="input-prefix">$</span>
                <input
                  type="number"
                  id="plan-cost"
                  name="estimated_cost"
                  step="0.01"
                  min="0"
                  value="${escapeAttr(plan.estimated_cost)}"
                  placeholder="0.00"
                  class="modern-input"
                >
              </div>
            </div>

            <div class="form-field">
              <label for="plan-target">
                <i class="fas fa-bullseye"></i> Target Date
              </label>
              <input
                type="date"
                id="plan-target"
                name="target_date"
                value="${escapeAttr(plan.target_date || defaultTargetDate)}"
                class="modern-input"
              >
            </div>
          </div>
        </div>

        <!-- SECTION 4: Status (edit only) -->
        ${isEdit ? `
          <div class="plan-form-section">
            <h3 class="section-title">
              <span class="section-icon"><i class="fas fa-chart-line"></i></span>
              Status
            </h3>
            <div class="form-field">
              <select id="plan-status" name="status" class="modern-select">
                ${statusOptions}
              </select>
            </div>
          </div>
        ` : ''}

        <!-- SECTION 5: Description & Notes -->
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-align-left"></i></span>
            Details
          </h3>

          <div class="form-field">
            <label for="plan-description">
              <i class="fas fa-file-lines"></i> Description
            </label>
            <textarea
              id="plan-description"
              name="description"
              rows="3"
              placeholder="Describe what needs to be done..."
              class="modern-textarea"
            >${escapeHtml(plan.description)}</textarea>
          </div>

          <div class="form-field">
            <label for="plan-notes">
              <i class="fas fa-sticky-note"></i> Notes
            </label>
            <textarea
              id="plan-notes"
              name="notes"
              rows="2"
              placeholder="Any additional notes or requirements..."
              class="modern-textarea"
            >${escapeHtml(plan.notes)}</textarea>
          </div>
        </div>

        <!-- ACTIONS -->
        <div class="plan-form-actions">
          <button type="button" class="btn btn-outline cancel-plan-btn">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button type="submit" class="btn btn-primary save-plan-btn">
            <i class="fas fa-check"></i> ${isEdit ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>

      </form>
    </div>
  `;
}
