// ============================================================
// EAGLEVISION COUDBOARD — SHOWCASE CARD
// ============================================================
// Renders a single project card for the showcase grid.
//
// Usage:
//   import { renderShowcaseCard } from '../components/showcaseCard.js';
//   container.innerHTML = projects.map(renderShowcaseCard).join('');
//
// Caller is responsible for wiring clicks via delegation
// (see pages/showcase/showcase.js).
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';


// ============================================================
// HELPERS
// ============================================================

/**
 * Parse a tech_stack value into an array of strings.
 * Handles: array, JSON string, comma-separated string.
 */
function parseTechStack(tech) {
  if (!tech) return [];
  if (Array.isArray(tech)) return tech.filter(Boolean);

  if (typeof tech === 'string') {
    const trimmed = tech.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) { /* fall through */ }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return [];
}


// ============================================================
// RENDER
// ============================================================
export function renderShowcaseCard(project = {}) {
  const id = escapeAttr(project.id);

  // ---------- Thumbnail ----------
  const thumbnailUrl = project.thumbnail_url || '';
  const imageHtml = thumbnailUrl
    ? `<img
         class="showcase-thumbnail"
         src="${escapeAttr(thumbnailUrl)}"
         alt="${escapeAttr(project.name)}"
         loading="lazy"
       />`
    : `<div class="showcase-placeholder"><i class="fas fa-image"></i></div>`;

  // ---------- Tech badges (max 3) ----------
  const techList = parseTechStack(project.tech_stack).slice(0, 3);
  const techBadges = techList
    .map((t) => `<span class="tech-badge">${escapeHtml(t)}</span>`)
    .join('');

  // ---------- Status class ----------
  const statusClass = escapeAttr(
    String(project.status || '').toLowerCase().replace(/\s+/g, '-')
  );

  return `
    <div class="showcase-card" data-id="${id}">
      <div class="showcase-thumbnail-wrapper">
        ${imageHtml}
        <div class="showcase-overlay">
          <button type="button" class="btn btn-sm quick-view-showcase" data-id="${id}">
            <i class="fas fa-eye"></i> Quick View
          </button>
          <button type="button" class="btn btn-sm edit-showcase" data-id="${id}">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button type="button" class="btn btn-sm service-record-showcase" data-id="${id}">
            <i class="fas fa-history"></i> Service Record
          </button>
        </div>
      </div>

      <div class="showcase-info">
        <h3>${escapeHtml(project.name)}</h3>
        <p><i class="fas fa-user"></i> ${escapeHtml(project.client) || '—'}</p>
        ${techBadges ? `<div class="showcase-tech">${techBadges}</div>` : ''}
        <span class="status ${statusClass}">
          ${escapeHtml(project.status) || '—'}
        </span>
      </div>
    </div>
  `;
}
