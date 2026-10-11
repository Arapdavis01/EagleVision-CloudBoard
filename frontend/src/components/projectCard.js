// ============================================================
// EAGLEVISION CLOUDBOARD — PROJECT CARD
// ============================================================
// Renders a project as either a grid card or a list row.
//
// Usage:
//   import { renderProjectCard } from '../components/projectCard.js';
//
//   renderProjectCard(project, 'grid')   // default
//   renderProjectCard(project, 'list')
//
// Action buttons carry class hooks so the projects page can
// delegate clicks:
//   .quick-view-project  [data-id]
//   .edit-project        [data-id]
//   .service-record-project [data-id]
//   .copy-link           [data-token]
//   .delete-project      [data-id]
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';
import { format }                 from '../utils/format.js';


// ============================================================
// PARSERS
// ============================================================

function parseTechStack(tech) {
  if (!tech) return [];
  if (Array.isArray(tech)) return tech.filter(Boolean);

  if (typeof tech === 'string') {
    const trimmed = tech.trim();
    // Try JSON array first
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) { /* fall through */ }
    }
    // Fallback: comma-separated
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}


// ============================================================
// REVIEW FLAG
// ============================================================
/**
 * Returns { label, className, icon } based on next_review_date.
 * - overdue: past date
 * - due-soon: within 7 days
 * - null: no flag
 */
function getReviewFlag(nextReviewDate) {
  if (!nextReviewDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(nextReviewDate);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due - now) / 86400000);

  if (diffDays < 0) {
    const overdueBy = Math.abs(diffDays);
    return {
      label: overdueBy === 1 ? 'Review overdue by 1 day' : `Review overdue by ${overdueBy} days`,
      className: 'review-flag overdue',
      icon: 'fa-exclamation-circle',
    };
  }
  if (diffDays === 0) {
    return { label: 'Review due today', className: 'review-flag due-soon', icon: 'fa-clock' };
  }
  if (diffDays <= 7) {
    return {
      label: diffDays === 1 ? 'Review due tomorrow' : `Review due in ${diffDays} days`,
      className: 'review-flag due-soon',
      icon: 'fa-clock',
    };
  }
  return null;
}


// ============================================================
// HELPERS
// ============================================================

function getStatusClass(status) {
  const raw = String(status || '').trim().toLowerCase().replace(/\s+/g, '-');
  return raw || 'archived';
}

function isForSale(project) {
  const v = project.for_sale;
  return v === true || v === 'true' || v === 1 || v === '1';
}


// ============================================================
// BADGES
// ============================================================

function renderTechBadges(techList, max = 3) {
  if (!techList.length) return '';
  const visible = techList.slice(0, max);
  const hidden  = techList.length - visible.length;

  const badges = visible
    .map((t) => `<span class="tech-badge">${escapeHtml(t)}</span>`)
    .join('');

  const more = hidden > 0
    ? `<span class="tech-badge tech-badge-more">+${hidden} more</span>`
    : '';

  return `<div class="project-tech">${badges}${more}</div>`;
}

function renderTagBadges(tagList, max = 2) {
  if (!tagList.length) return '';
  const visible = tagList.slice(0, max);
  const hidden  = tagList.length - visible.length;

  const badges = visible
    .map((t) => `<span class="tag-badge">${escapeHtml(t)}</span>`)
    .join('');

  const more = hidden > 0
    ? `<span class="tag-badge tag-badge-more">+${hidden} more</span>`
    : '';

  return `<div class="project-tags">${badges}${more}</div>`;
}


// ============================================================
// ACTION BUTTONS
// ============================================================

function renderActions(project, compact = false) {
  const token = project.public_token || '';
  const copyDisabled = token ? '' : 'disabled';
  const copyTitle    = token ? 'Copy public link' : 'No public link available';

  if (compact) {
    return `
      <div class="project-actions compact">
        <button type="button" class="project-action-btn quick-view-project" data-id="${escapeAttr(project.id)}" title="Quick view" aria-label="Quick view">
          <i class="fas fa-eye"></i>
        </button>
        <button type="button" class="project-action-btn edit-project" data-id="${escapeAttr(project.id)}" title="Edit project" aria-label="Edit project">
          <i class="fas fa-pen"></i>
        </button>
        <button type="button" class="project-action-btn service-record-project" data-id="${escapeAttr(project.id)}" title="Service record" aria-label="Service record">
          <i class="fas fa-history"></i>
        </button>
        <button type="button" class="project-action-btn copy-link" data-token="${escapeAttr(token)}" title="${copyTitle}" aria-label="Copy public link" ${copyDisabled}>
          <i class="fas fa-link"></i>
        </button>
        <button type="button" class="project-action-btn danger delete-project" data-id="${escapeAttr(project.id)}" title="Delete project" aria-label="Delete project">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }

  return `
    <div class="project-actions">
      <button type="button" class="btn btn-sm quick-view-project" data-id="${escapeAttr(project.id)}">
        <i class="fas fa-eye"></i> View
      </button>
      <button type="button" class="btn btn-sm edit-project" data-id="${escapeAttr(project.id)}">
        <i class="fas fa-pen"></i> Edit
      </button>
      <button type="button" class="btn btn-sm service-record-project" data-id="${escapeAttr(project.id)}">
        <i class="fas fa-history"></i> Record
      </button>
      <button type="button" class="btn btn-sm copy-link" data-token="${escapeAttr(token)}" title="${copyTitle}" ${copyDisabled}>
        <i class="fas fa-link"></i>
      </button>
      <button type="button" class="btn btn-sm btn-danger delete-project" data-id="${escapeAttr(project.id)}" title="Delete project">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
}


// ============================================================
// GRID CARD
// ============================================================

function renderGridCard(project) {
  const techList    = parseTechStack(project.tech_stack);
  const tagList     = parseTags(project.tags);
  const reviewFlag  = getReviewFlag(project.next_review_date);
  const statusClass = getStatusClass(project.status);
  const updated     = format.date(project.last_updated);
  const forSale     = isForSale(project);

  return `
    <div class="card project-card status-${escapeAttr(statusClass)}" data-id="${escapeAttr(project.id)}">
      <div class="project-card-top">
        <div class="project-card-title-wrap">
          <h3 class="project-card-title">${escapeHtml(project.name) || 'Untitled Project'}</h3>
          ${project.client ? `
            <p class="project-client">
              <i class="fas fa-user"></i> ${escapeHtml(project.client)}
            </p>
          ` : ''}
        </div>
        <div class="project-card-badges">
          ${forSale ? `<span class="badge badge-forsale"><i class="fas fa-tag"></i> For Sale</span>` : ''}
          <span class="status ${escapeAttr(statusClass)}">${escapeHtml(project.status) || '—'}</span>
        </div>
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
        ${project.project_type ? `
          <span class="project-meta-item">
            <i class="fas fa-cube"></i> ${escapeHtml(project.project_type)}
          </span>
        ` : ''}
        ${updated ? `
          <span class="project-meta-item">
            <i class="fas fa-clock"></i> ${escapeHtml(updated)}
          </span>
        ` : ''}
      </div>

      ${techList.length ? renderTechBadges(techList, 3) : ''}
      ${tagList.length  ? renderTagBadges(tagList, 2)   : ''}

      ${renderActions(project, false)}
    </div>
  `;
}


// ============================================================
// LIST ROW
// ============================================================

function renderListRow(project) {
  const techList    = parseTechStack(project.tech_stack);
  const reviewFlag  = getReviewFlag(project.next_review_date);
  const statusClass = getStatusClass(project.status);
  const updated     = format.date(project.last_updated);
  const techSummary = techList.slice(0, 2).join(' · ');
  const forSale     = isForSale(project);

  return `
    <div class="card project-list-row status-${escapeAttr(statusClass)}" data-id="${escapeAttr(project.id)}">
      <div class="list-row-content">
        <div class="list-primary">
          <div class="list-name-row">
            <span class="list-name">${escapeHtml(project.name) || 'Untitled Project'}</span>
            ${forSale ? `<span class="badge badge-forsale compact"><i class="fas fa-tag"></i> For Sale</span>` : ''}
          </div>
          <div class="list-sub">
            ${project.client ? `
              <span><i class="fas fa-user"></i> ${escapeHtml(project.client)}</span>
            ` : ''}
            ${project.location ? `
              <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location)}</span>
            ` : ''}
            ${techSummary ? `
              <span><i class="fas fa-code"></i> ${escapeHtml(techSummary)}</span>
            ` : ''}
          </div>
          ${reviewFlag ? `
            <div class="${reviewFlag.className} compact">
              <i class="fas ${reviewFlag.icon}"></i> ${escapeHtml(reviewFlag.label)}
            </div>
          ` : ''}
        </div>

        <div class="list-meta">
          <span class="status ${escapeAttr(statusClass)}">${escapeHtml(project.status) || '—'}</span>
          ${updated ? `
            <span class="list-updated">
              <i class="fas fa-clock"></i> ${escapeHtml(updated)}
            </span>
          ` : ''}
        </div>

        ${renderActions(project, true)}
      </div>
    </div>
  `;
}


// ============================================================
// PUBLIC API
// ============================================================

export function renderProjectCard(project, view = 'grid') {
  if (!project) return '';
  return view === 'list' ? renderListRow(project) : renderGridCard(project);
}
