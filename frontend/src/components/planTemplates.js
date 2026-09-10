export function renderPlanTemplates(templates) {
  if (!templates || templates.length === 0) {
    return `
      <div class="plan-templates-section">
        <h3 class="templates-title"><i class="fas fa-bolt"></i> Quick Templates</h3>
        <p class="templates-empty">No templates available</p>
      </div>
    `;
  }

  return `
    <div class="plan-templates-section">
      <h3 class="templates-title"><i class="fas fa-bolt"></i> Quick Templates</h3>
      <div class="templates-grid">
        ${templates.map(t => `
          <button class="template-card" data-template-id="${t.id}" title="Use this template">
            <div class="template-icon">
              <i class="fas ${getTemplateIcon(t.category)}"></i>
            </div>
            <div class="template-info">
              <strong>${escapeHtml(t.name)}</strong>
              <span>${escapeHtml(t.category)}</span>
              ${t.estimated_cost > 0 ? `<em>$${parseFloat(t.estimated_cost).toLocaleString()}</em>` : ''}
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function initPlanTemplates(container, callback) {
  container.addEventListener('click', (e) => {
    const templateCard = e.target.closest('.template-card');
    if (!templateCard) return;
    const templateId = templateCard.dataset.templateId;
    if (templateId && callback) {
      callback(templateId);
    }
  });
}

function getTemplateIcon(category) {
  const icons = {
    'Feature': 'fa-plus',
    'Bug Fix': 'fa-bug',
    'Maintenance': 'fa-wrench',
    'Upgrade': 'fa-arrow-up',
    'Other': 'fa-circle'
  };
  return icons[category] || 'fa-circle';
}

function escapeHtml(str) {
  return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
