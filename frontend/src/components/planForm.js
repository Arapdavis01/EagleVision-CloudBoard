export function renderPlanForm(projects, plan = {}) {
  const categories = ['Feature', 'Bug Fix', 'Maintenance', 'Upgrade', 'Other'];
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['planned', 'in_progress', 'completed', 'cancelled'];

  // Default target date: +30 days from today
  const defaultTarget = new Date();
  defaultTarget.setDate(defaultTarget.getDate() + 30);
  const defaultDateStr = defaultTarget.toISOString().slice(0, 10);

  const isEdit = !!plan.id;

  return `
    <div class="plan-form-container">
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
        <!-- Template Selector (only on create) -->
        <div id="plan-templates-container" class="plan-templates-container"></div>
      ` : ''}

      <form id="plan-form" class="plan-form">
        <input type="hidden" name="id" value="${plan.id || ''}">

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
              ${projects.map(p => `
                <option value="${p.id}" ${plan.project_id == p.id ? 'selected' : ''}>${escapeAttr(p.name)}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-field">
            <label for="plan-title">
              <i class="fas fa-heading"></i> Title <span class="required">*</span>
            </label>
            <input type="text" id="plan-title" name="title" value="${escapeAttr(plan.title || '')}" 
                   required placeholder="What improvement do you want to make?" class="modern-input">
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
                ${categories.map(c => `
                  <option value="${c}" ${plan.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-field">
              <label for="plan-priority">
                <i class="fas fa-flag"></i> Priority
              </label>
              <select id="plan-priority" name="priority" class="modern-select">
                ${priorities.map(p => `
                  <option value="${p}" ${plan.priority === p ? 'selected' : (p === 'medium' && !plan.priority ? 'selected' : '')}>
                    ${p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- SECTION 3: Schedule & Budget -->
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-calendar-alt"></i></span>
            Schedule & Budget
          </h3>
          
          <div class="form-row-2">
            <div class="form-field">
              <label for="plan-cost">
                <i class="fas fa-dollar-sign"></i> Estimated Cost
              </label>
              <div class="input-with-prefix">
                <span class="input-prefix">$</span>
                <input type="number" id="plan-cost" name="estimated_cost" step="0.01" 
                       value="${plan.estimated_cost || ''}" placeholder="0.00" class="modern-input">
              </div>
            </div>
            
            <div class="form-field">
              <label for="plan-target">
                <i class="fas fa-bullseye"></i> Target Date
              </label>
              <input type="date" id="plan-target" name="target_date" 
                     value="${plan.target_date || defaultDateStr}" class="modern-input">
            </div>
          </div>
        </div>

        <!-- SECTION 4: Status (only on edit) -->
        ${isEdit ? `
        <div class="plan-form-section">
          <h3 class="section-title">
            <span class="section-icon"><i class="fas fa-chart-line"></i></span>
            Status
          </h3>
          <div class="form-field">
            <select id="plan-status" name="status" class="modern-select">
              ${statuses.map(s => `
                <option value="${s}" ${plan.status === s ? 'selected' : ''}>
                  ${s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                </option>
              `).join('')}
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
            <textarea id="plan-description" name="description" rows="3" 
                      placeholder="Describe what needs to be done..." class="modern-textarea">${escapeHtml(plan.description || '')}</textarea>
          </div>

          <div class="form-field">
            <label for="plan-notes">
              <i class="fas fa-sticky-note"></i> Notes
            </label>
            <textarea id="plan-notes" name="notes" rows="2" 
                      placeholder="Any additional notes or requirements..." class="modern-textarea">${escapeHtml(plan.notes || '')}</textarea>
          </div>
        </div>

        <!-- Form Actions -->
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

function escapeAttr(str) {
  return str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

function escapeHtml(str) {
  return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
