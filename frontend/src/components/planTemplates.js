// ============================================================
// EAGLEVISION CLOUDBOARD — PLAN TEMPLATES
// ============================================================
// Renders quick-pick template cards inside the plan form and
// wires up clicks via delegation.
//
// Usage:
//   container.innerHTML = renderPlanTemplates(templates);
//   const cleanup = initPlanTemplates(container, (templateId) => { ... });
//   // later: cleanup();
//
// Notes:
//   • Template cards use type="button" so they never submit the
//     surrounding form by accident.
//   • initPlanTemplates returns a cleanup function.
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';


// ============================================================
// CONSTANTS
// ============================================================
const CATEGORY_ICONS = {
  'Feature':     'fa-plus',
  'Bug Fix':     'fa-bug',
  'Maintenance': 'fa-wrench',
  'Upgrade':     'fa-arrow-up',
  'Other':       'fa-circle',
};

const DEFAULT_ICON = 'fa-circle';


// ============================================================
// HELPERS
// ============================================================
function getTemplateIcon(category) {
  return CATEGORY_ICONS[category] || DEFAULT_ICON;
}


// ============================================================
// RENDER
// ============================================================
export function renderPlanTemplates(templates = []) {
  const list = Array.isArray(templates) ? templates : [];

  if (list.length === 0) {
    return `
      <div class="plan-templates-section">
        <h3 class="templates-title">
          <i class="fas fa-bolt"></i> Quick Templates
        </h3>
        <p class="templates-empty">No templates available</p>
      </div>
    `;
  }

  const cards = list.map((t) => {
    const cost = Number(t.estimated_cost) || 0;
    const costHTML = cost > 0
      ? `<em>$${cost.toLocaleString()}</em>`
      : '';

    return `
      <button
        type="button"
        class="template-card"
        data-template-id="${escapeAttr(t.id)}"
        title="${escapeAttr(`Use template: ${t.name || ''}`)}"
      >
        <div class="template-icon">
          <i class="fas ${escapeAttr(getTemplateIcon(t.category))}"></i>
        </div>
        <div class="template-info">
          <strong>${escapeHtml(t.name)}</strong>
          <span>${escapeHtml(t.category)}</span>
          ${costHTML}
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="plan-templates-section">
      <h3 class="templates-title">
        <i class="fas fa-bolt"></i> Quick Templates
      </h3>
      <div class="templates-grid">${cards}</div>
    </div>
  `;
}


// ============================================================
// INIT
// ============================================================
/**
 * Wire up clicks on template cards.
 *
 * @param {HTMLElement} container
 * @param {(templateId: string) => void} callback
 * @returns {() => void}  cleanup function — call this before
 *                        re-rendering the container
 */
export function initPlanTemplates(container, callback) {
  if (!container || typeof callback !== 'function') {
    return () => {};
  }

  const onClick = (e) => {
    const card = e.target.closest('.template-card');
    if (!card) return;

    const id = card.dataset.templateId;
    if (id) callback(id);
  };

  container.addEventListener('click', onClick);

  return () => {
    container.removeEventListener('click', onClick);
  };
}
