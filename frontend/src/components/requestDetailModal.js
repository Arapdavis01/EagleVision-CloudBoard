import { showModal } from './modal.js';
import { systemRequestService } from '../services/systemRequestService.js';
import { showToast } from '../utils/notifications.js';
import { confirmModal } from './modal.js';

/**
 * Opens the detail modal for a system request.
 * @param {object} request - The request object from the API
 * @param {function} onUpdate - Callback fired after a successful action (approve/reject/delete)
 */
export async function openRequestDetailModal(request, onUpdate) {
  const escapeHtml = (text) =>
    text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const escapeAttr = (text) =>
    text ? String(text).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  // ---------- Priority + status helpers ----------
  const priorityBadge = (p) => {
    const map = {
      high: '<span class="badge priority-high"><i class="fas fa-exclamation"></i> HIGH</span>',
      medium: '<span class="badge priority-medium"><i class="fas fa-minus"></i> MEDIUM</span>',
      low: '<span class="badge priority-low"><i class="fas fa-arrow-down"></i> LOW</span>',
    };
    return map[p] || map.medium;
  };

  const statusBadge = (s) => {
    const map = {
      new: '<span class="badge status-planned"><i class="fas fa-star"></i> NEW</span>',
      reviewing: '<span class="badge status-in-progress"><i class="fas fa-eye"></i> REVIEWING</span>',
      approved: '<span class="badge status-completed"><i class="fas fa-check"></i> APPROVED</span>',
      rejected: '<span class="badge badge-overdue"><i class="fas fa-times"></i> REJECTED</span>',
      converted: '<span class="badge status-completed"><i class="fas fa-rocket"></i> CONVERTED</span>',
    };
    return map[s] || map.new;
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (val) => {
    if (!val) return '—';
    return val;
  };

  // ---------- Build the modal content ----------
  const content = `
    <div class="modal-header-bar">
      <div class="request-modal-title">
        <h2>
          <i class="fas fa-file-code"></i>
          ${escapeHtml(request.title)}
        </h2>
        <div class="request-modal-subtitle">
          <span class="reference-code-chip">
            <i class="fas fa-hashtag"></i> ${escapeHtml(request.reference_code)}
          </span>
          ${statusBadge(request.status)}
          ${priorityBadge(request.priority)}
        </div>
      </div>
      <span class="modal-count">
        <i class="fas fa-clock"></i> ${formatDate(request.created_at)}
      </span>
    </div>

    <div class="modal-body request-modal-body">

      <!-- CLIENT INFO -->
      <div class="request-detail-section">
        <h4 class="request-detail-section-title">
          <i class="fas fa-user-circle"></i> Client Information
        </h4>
        <div class="request-detail-grid">
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-user"></i> Full Name</span>
            <span class="field-value">${escapeHtml(request.full_name)}</span>
          </div>
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-envelope"></i> Email</span>
            <span class="field-value">
              <a href="mailto:${escapeAttr(request.email)}" class="link-inline">
                ${escapeHtml(request.email)}
              </a>
            </span>
          </div>
          ${request.phone ? `
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-phone"></i> Phone</span>
            <span class="field-value">
              <a href="tel:${escapeAttr(request.phone)}" class="link-inline">
                ${escapeHtml(request.phone)}
              </a>
            </span>
          </div>
          ` : ''}
          ${request.company ? `
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-building"></i> Company</span>
            <span class="field-value">${escapeHtml(request.company)}</span>
          </div>
          ` : ''}
          ${request.location ? `
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-map-marker-alt"></i> Location</span>
            <span class="field-value">${escapeHtml(request.location)}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- SYSTEM DETAILS -->
      <div class="request-detail-section">
        <h4 class="request-detail-section-title">
          <i class="fas fa-cubes"></i> System Details
        </h4>
        <div class="request-detail-grid">
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-layer-group"></i> System Type</span>
            <span class="field-value">${escapeHtml(request.system_type)}</span>
          </div>
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-dollar-sign"></i> Budget Range</span>
            <span class="field-value">${formatCurrency(request.budget_range)}</span>
          </div>
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-hourglass-half"></i> Timeline</span>
            <span class="field-value">${escapeHtml(request.timeline) || '—'}</span>
          </div>
          <div class="request-detail-field">
            <span class="field-label"><i class="fas fa-users"></i> Target Users</span>
            <span class="field-value">${escapeHtml(request.target_users) || '—'}</span>
          </div>
        </div>

        <div class="request-detail-field request-detail-full">
          <span class="field-label"><i class="fas fa-align-left"></i> Description</span>
          <div class="field-text-block">${escapeHtml(request.description) || '—'}</div>
        </div>

        ${request.features ? `
        <div class="request-detail-field request-detail-full">
          <span class="field-label"><i class="fas fa-list-check"></i> Requested Features</span>
          <div class="field-text-block">${escapeHtml(request.features)}</div>
        </div>
        ` : ''}

        ${request.reference_urls ? `
        <div class="request-detail-field request-detail-full">
          <span class="field-label"><i class="fas fa-link"></i> Reference URLs</span>
          <div class="field-text-block">
            <a href="${escapeAttr(request.reference_urls)}" target="_blank" rel="noopener" class="link-inline">
              ${escapeHtml(request.reference_urls)}
            </a>
          </div>
        </div>
        ` : ''}

        ${request.attachment_url ? `
        <div class="request-detail-field request-detail-full">
          <span class="field-label"><i class="fas fa-paperclip"></i> Attachment</span>
          <div class="field-text-block">
            <a href="${escapeAttr(request.attachment_url)}" target="_blank" rel="noopener" class="link-inline">
              <i class="fas fa-download"></i> Download attachment
            </a>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- ADMIN NOTES -->
      <div class="request-detail-section">
        <h4 class="request-detail-section-title">
          <i class="fas fa-sticky-note"></i> Admin Notes
        </h4>
        <textarea
          id="request-admin-notes"
          class="modern-textarea request-notes-textarea"
          rows="3"
          placeholder="Add private notes about this request..."
        >${escapeHtml(request.admin_notes || '')}</textarea>
        <button id="save-notes-btn" class="btn btn-outline btn-sm" style="margin-top: 0.6rem;">
          <i class="fas fa-save"></i> Save Notes
        </button>
      </div>

      ${request.project_id ? `
      <div class="request-detail-section request-linked-project">
        <h4 class="request-detail-section-title">
          <i class="fas fa-rocket"></i> Converted to Project
        </h4>
        <p class="linked-project-info">
          <i class="fas fa-folder-open"></i>
          <span><strong>${escapeHtml(request.project_name || 'Project #' + request.project_id)}</strong></span>
        </p>
      </div>
      ` : ''}
    </div>

    <!-- ==================== ACTIONS ==================== -->
    <div class="modal-footer request-modal-footer">
      <button id="delete-request-btn" class="btn btn-danger btn-sm">
        <i class="fas fa-trash"></i> Delete
      </button>
      <div class="request-footer-spacer"></div>
      ${request.status === 'new' || request.status === 'reviewing' ? `
        <button id="reject-request-btn" class="btn btn-outline btn-sm">
          <i class="fas fa-times"></i> Reject
        </button>
      ` : ''}
      ${request.status === 'new' || request.status === 'reviewing' ? `
        <button id="approve-request-btn" class="btn btn-primary btn-sm">
          <i class="fas fa-check"></i> Approve
        </button>
      ` : ''}
      ${request.status === 'approved' ? `
        <button id="convert-request-btn" class="btn btn-primary btn-sm">
          <i class="fas fa-rocket"></i> Convert to Project
        </button>
      ` : ''}
    </div>
  `;

  const modal = showModal(content, { size: 'lg' });
  const element = modal.element;

  // ==================== SAVE ADMIN NOTES ====================
  element.querySelector('#save-notes-btn')?.addEventListener('click', async () => {
    const notes = element.querySelector('#request-admin-notes')?.value || '';
    const btn = element.querySelector('#save-notes-btn');
    const originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      await systemRequestService.updateRequest(request.id, { admin_notes: notes });
      showToast('Notes saved', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save notes', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });

  // ==================== APPROVE ====================
  element.querySelector('#approve-request-btn')?.addEventListener('click', async () => {
    const confirmed = await confirmModal({
      title: 'Approve Request?',
      message: `Approve "${request.title}" from ${request.full_name}?`,
      confirmText: 'Approve',
      confirmClass: 'btn-primary',
      icon: 'fa-check-circle',
      iconColor: 'var(--primary)',
    });
    if (!confirmed) return;

    try {
      await systemRequestService.approveRequest(request.id);
      showToast('Request approved', 'success');
      modal.close();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast(err.message || 'Failed to approve', 'error');
    }
  });

  // ==================== REJECT ====================
  element.querySelector('#reject-request-btn')?.addEventListener('click', async () => {
    const confirmed = await confirmModal({
      title: 'Reject Request?',
      message: `Reject "${request.title}" from ${request.full_name}?`,
      confirmText: 'Reject',
      confirmClass: 'btn-danger',
      icon: 'fa-times-circle',
      iconColor: 'var(--status-error)',
    });
    if (!confirmed) return;

    try {
      await systemRequestService.rejectRequest(request.id);
      showToast('Request rejected', 'success');
      modal.close();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast(err.message || 'Failed to reject', 'error');
    }
  });

  // ==================== CONVERT TO PROJECT ====================
  element.querySelector('#convert-request-btn')?.addEventListener('click', async () => {
    // Import the project form module dynamically to avoid circular deps
    const { renderProjectForm } = await import('./projectForm.js');
    const { projectService } = await import('../services/projectService.js');
    const { initCustomSelects } = await import('./customSelect.js');

    modal.close();

    // Pre-fill the project form with data from the request
    const prefillProject = {
      name: request.title,
      client: request.company || request.full_name,
      client_email: request.email,
      client_number: request.phone,
      location: request.location,
      description: `${request.description}\n\n--- Features ---\n${request.features || 'Not specified'}\n\n--- Target Users ---\n${request.target_users || 'Not specified'}`,
      status: 'Planning',
      project_type: mapSystemTypeToProjectType(request.system_type),
    };

    const projectModal = showModal(renderProjectForm(prefillProject), { size: 'lg' });
    const form = document.getElementById('project-form');
    if (!form) return;

    initCustomSelects(projectModal.element);

    document.querySelector('.cancel-form-btn')?.addEventListener('click', () => projectModal.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const created = await projectService.create(data);
        await systemRequestService.convertToProject(request.id, created.id);
        projectModal.close();
        showToast('Project created and request marked as converted', 'success');
        if (onUpdate) onUpdate();
      } catch (err) {
        showToast(err.message || 'Failed to convert request', 'error');
      }
    });
  });

  // ==================== DELETE ====================
  element.querySelector('#delete-request-btn')?.addEventListener('click', async () => {
    const confirmed = await confirmModal({
      title: 'Delete Request?',
      message: `Permanently delete "${request.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
      icon: 'fa-trash-alt',
      iconColor: 'var(--status-error)',
    });
    if (!confirmed) return;

    try {
      await systemRequestService.deleteRequest(request.id);
      showToast('Request deleted', 'success');
      modal.close();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  });
}

// ==================== HELPERS ====================

/**
 * Maps the public form's system_type to a project_type used in the dashboard.
 */
function mapSystemTypeToProjectType(systemType) {
  if (!systemType) return 'Other';
  const map = {
    'Website': 'Website',
    'Web Application': 'Web Application',
    'Mobile App': 'Mobile App',
    'Desktop App': 'Desktop App',
    'API / Backend': 'API / Backend',
    'E-commerce': 'Web Application',
    'Business Management System': 'Web Application',
    'Other': 'Other',
  };
  return map[systemType] || 'Other';
}
