/**
 * Project Card Renderer
 * Renders a project as either a grid card or a list row.
 * Backward-compatible signature: renderProjectCard(project, view = 'grid')
 */

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseTechStack(tech) {
  if (!tech) return [];
  if (Array.isArray(tech)) return tech.filter(Boolean);
  if (typeof tech === 'string') {
    try {
      const parsed = JSON.parse(tech);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === 'string') {
        return parsed.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    } catch {
      return tech.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Returns { label, className } for review status based on next_review_date.
 * - overdue: past date
 * - due-soon: within 7 days
 * - null: no flag
 */
function getReviewFlag(nextReviewDate) {
  if (!nextReviewDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(nextReviewDate);
  if (isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueBy = Math.abs(diffDays);
    return {
      label: overdueBy === 1 ? 'Review overdue 1d' : `Review overdue ${overdueBy}d`,
      className: 'review-flag overdue',
      icon: 'fa-exclamation-circle'
    };
  }
  if (diffDays <= 7) {
    if (diffDays === 0) {
      return { label: 'Review today', className: 'review-flag due-soon', icon: 'fa-clock' };
    }
    return {
      label: diffDays === 1 ? 'Review tomorrow' : `Review in ${diffDays}d`,
      className: 'review-flag due-soon',
      icon: 'fa-clock'
    };
  }
  return null;
}

function getStatusClass(status) {
  return (status || '').toLowerCase().replace(/\s+/g, '-');
}

/* ============================================================
   TECH & TAG BADGES
   ============================================================ */

function renderTechBadges(techList, max = 3) {
  if (!techList.length) return '';
  const visible = techList.slice(0, max);
  const hidden = techList.length - visible.length;
  const badges = visible
    .map(t => `<span class="tech-badge">${escapeHtml(t)}</span>`)
    .join('');
  const more = hidden > 0
    ? `<span class="tech-badge tech-badge-more">+${hidden}</span>`
    : '';
  return `<div class="project-tech">${badges}${more}</div>`;
}

function renderTagBadges(tagList, max = 2) {
  if (!tagList.length) return '';
  const visible = tagList.slice(0, max);
  const hidden = tagList.length - visible.length;
  const badges = visible
    .map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`)
    .join('');
  const more = hidden > 0
    ? `<span class="tag-badge tag-badge-more">+${hidden}</span>`
    : '';
  return `<div class="project-tags">${badges}${more}</div>`;
}

/* ============================================================
   ACTION BUTTONS
   ============================================================ */

function renderActions(project, compact = false) {
  const token = project.public_token || '';
  const copyDisabled = !token ? 'disabled' : '';
  const copyTitle = token ? 'Copy public link' : 'No public link available';

  if (compact) {
    // Icon-only action row (list view)
    return `
      <div class="project-actions compact">
        <button class="project-action-btn quick-view-project" data-id="${project.id}" title="Quick view" aria-label="Quick view">
          <i class="fas fa-eye"></i>
        </button>
        <button class="project-action-btn edit-project" data-id="${project.id}" title="Edit" aria-label="Edit">
          <i class="fas fa-pen"></i>
        </button>
        <button class="project-action-btn service-record-project" data-id="${project.id}" title="Service record" aria-label="Service record">
          <i class="fas fa-history"></i>
        </button>
        <button class="project-action-btn copy-link" data-token="${escapeHtml(token)}" title="${copyTitle}" aria-label="Copy link" ${copyDisabled}>
          <i class="fas fa-link"></i>
        </button>
        <button class="project-action-btn danger delete-project" data-id="${project.id}" title="Delete" aria-label="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }

  // Full labelled actions (grid view)
  return `
    <div class="project-actions">
      <button class="btn btn-sm quick-view-project" data-id="${project.id}">
        <i class="fas fa-eye"></i> View
      </button>
      <button class="btn btn-sm edit-project" data-id="${project.id}">
        <i class="fas fa-pen"></i> Edit
      </button>
      <button class="btn btn-sm service-record-project" data-id="${project.id}">
        <i class="fas fa-history"></i> Record
      </button>
      <button class="btn btn-sm copy-link" data-token="${escapeHtml(token)}" title="${copyTitle}" ${copyDisabled}>
        <i class="fas fa-link"></i>
      </button>
      <button class="btn btn-sm btn-danger delete-project" data-id="${project.id}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
}

/* ============================================================
   GRID VIEW
   ============================================================ */

function renderGridCard(project) {
  const techList = parseTechStack(project.tech_stack);
  const tagList = parseTags(project.tags);
  const reviewFlag = getReviewFlag(project.next_review_date);
  const statusClass = getStatusClass(project.status);
  const updated = formatDate(project.last_updated);

  return `
    <div class="card project-card status-${statusClass}" data-id="${project.id}">
      <div class="project-card-top">
        <div class="project-card-title-wrap">
          <h3 class="project-card-title">${escapeHtml(project.name) || 'Untitled Project'}</h3>
          ${project.client ? `<p class="project-client"><i class="fas fa-user"></i> ${escapeHtml(project.client)}</p>` : ''}
        </div>
        <span class="status ${statusClass}">${escapeHtml(project.status) || '—'}</span>
      </div>

      ${reviewFlag ? `
        <div class="${reviewFlag.className}">
          <i class="fas ${reviewFlag.icon}"></i> ${escapeHtml(reviewFlag.label)}
        </div>
      ` : ''}

      <div class="project-meta-row">
        ${project.location ? `
          <span class="project-meta-item">
            <i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location)}
          </span>
        ` : ''}
        ${updated ? `
          <span class="project-meta-item">
            <i class="fas fa-clock"></i> ${escapeHtml(updated)}
          </span>
        ` : ''}
      </div>

      ${techList.length ? renderTechBadges(techList, 3) : ''}
      ${tagList.length ? renderTagBadges(tagList, 2) : ''}

      ${renderActions(project, false)}
    </div>
  `;
}

/* ============================================================
   LIST VIEW
   ============================================================ */

function renderListRow(project) {
  const techList = parseTechStack(project.tech_stack);
  const reviewFlag = getReviewFlag(project.next_review_date);
  const statusClass = getStatusClass(project.status);
  const updated = formatDate(project.last_updated);
  const techSummary = techList.slice(0, 2).join(' · ');

  return `
    <div class="card project-list-row" data-id="${project.id}">
      <div class="list-row-content">
        <div class="list-primary">
          <span class="list-name">${escapeHtml(project.name) || 'Untitled Project'}</span>
          <span class="list-sub">
            ${project.client ? `<span class="list-client"><i class="fas fa-user"></i> ${escapeHtml(project.client)}</span>` : ''}
            ${project.location ? `<span class="list-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location)}</span>` : ''}
            ${techSummary ? `<span class="list-tech"><i class="fas fa-code"></i> ${escapeHtml(techSummary)}</span>` : ''}
          </span>
          ${reviewFlag ? `
            <div class="${reviewFlag.className} compact">
              <i class="fas ${reviewFlag.icon}"></i> ${escapeHtml(reviewFlag.label)}
            </div>
          ` : ''}
        </div>

        <div class="list-meta">
          <span class="status ${statusClass}">${escapeHtml(project.status) || '—'}</span>
          ${updated ? `<span class="list-updated"><i class="fas fa-clock"></i> ${escapeHtml(updated)}</span>` : ''}
        </div>

        ${renderActions(project, true)}
      </div>
    </div>
  `;
}

/* ============================================================
   PUBLIC API
   ============================================================ */

export function renderProjectCard(project, view = 'grid') {
  if (!project) return '';
  return view === 'list' ? renderListRow(project) : renderGridCard(project);
}
