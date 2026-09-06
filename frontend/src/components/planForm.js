export function renderPlanForm(projects, plan = {}) {
  const categories = ['Feature', 'Bug Fix', 'Maintenance', 'Upgrade', 'Other'];
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['planned', 'in_progress', 'completed', 'cancelled'];

  // Default target date: +30 days from today
  const defaultTarget = new Date();
  defaultTarget.setDate(defaultTarget.getDate() + 30);
  const defaultDateStr = defaultTarget.toISOString().slice(0, 10);

  return `
    <div class="form-header">
      <h2>${plan.id ? 'Edit Service Plan' : 'New Service Plan'}</h2>
    </div>
    <form id="plan-form" class="modern-form">
      <input type="hidden" name="id" value="${plan.id || ''}">

      <div class="form-group">
        <label for="plan-project"><i class="fas fa-folder-open"></i> Project <span class="required">*</span></label>
        <select id="plan-project" name="project_id" required>
          <option value="">-- Select Project --</option>
          ${projects.map(p => `
            <option value="${p.id}" ${plan.project_id == p.id ? 'selected' : ''}>${escapeAttr(p.name)}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="plan-title"><i class="fas fa-heading"></i> Title <span class="required">*</span></label>
        <input type="text" id="plan-title" name="title" value="${escapeAttr(plan.title || '')}" required placeholder="e.g., Mobile Responsive Design">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="plan-category"><i class="fas fa-tag"></i> Category <span class="required">*</span></label>
          <select id="plan-category" name="category" required>
            ${categories.map(c => `
              <option value="${c}" ${plan.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="plan-priority"><i class="fas fa-flag"></i> Priority</label>
          <select id="plan-priority" name="priority">
            ${priorities.map(p => `
              <option value="${p}" ${plan.priority === p ? 'selected' : (p === 'medium' ? 'selected' : '')}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="plan-cost"><i class="fas fa-dollar-sign"></i> Estimated Cost ($)</label>
          <input type="number" id="plan-cost" name="estimated_cost" step="0.01" value="${plan.estimated_cost || ''}" placeholder="0.00">
        </div>
        <div class="form-group">
          <label for="plan-target"><i class="fas fa-calendar-alt"></i> Target Date</label>
          <input type="date" id="plan-target" name="target_date" value="${plan.target_date || defaultDateStr}">
        </div>
      </div>

      ${plan.id ? `
      <div class="form-group">
        <label for="plan-status"><i class="fas fa-chart-line"></i> Status</label>
        <select id="plan-status" name="status">
          ${statuses.map(s => `
            <option value="${s}" ${plan.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
          `).join('')}
        </select>
      </div>
      ` : ''}

      <div class="form-group">
        <label for="plan-description"><i class="fas fa-align-left"></i> Description</label>
        <textarea id="plan-description" name="description" rows="3" placeholder="Describe the improvement...">${escapeHtml(plan.description || '')}</textarea>
      </div>

      <div class="form-group">
        <label for="plan-notes"><i class="fas fa-sticky-note"></i> Notes</label>
        <textarea id="plan-notes" name="notes" rows="2" placeholder="Additional notes...">${escapeHtml(plan.notes || '')}</textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline cancel-plan-btn"><i class="fas fa-arrow-left"></i> Back</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Plan</button>
      </div>
    </form>
  `;
}

function escapeAttr(str) {
  return str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

function escapeHtml(str) {
  return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
