// ============================================================
// EAGLEVISION CLOUDBOARD — SHOWCASE PAGE
// ============================================================
// Public-facing project gallery with filters + detail modal.
//
// Features:
//   • KPI stats row (total / live / development / maintenance)
//   • Search + status filter + type filter + sort
//   • Grid with lazy "Load More" (8 per page)
//   • Detail modal with cost summary + print
// ============================================================

import { renderSidebar, initSidebar }    from '../../components/sidebar.js';
import { projectService }                from '../../services/projectService.js';
import { financeService }                from '../../services/financeService.js';
import { dashboardService }              from '../../services/dashboardService.js';
import { renderShowcaseCard }            from '../../components/showcaseCard.js';
import { showModal }                     from '../../components/modal.js';
import { showToast }                     from '../../utils/notifications.js';
import { escapeHtml, escapeAttr, debounce } from '../../utils/dom.js';
import { format }                        from '../../utils/format.js';
import { registerCleanup }               from '../../utils/pageLifecycle.js';


// ============================================================
// CONSTANTS
// ============================================================
const PAGE_SIZE            = 8;
const SEARCH_DEBOUNCE_MS   = 200;
const DEFAULT_EXCHANGE_RATE = 129;


// ============================================================
// PAGE ENTRY
// ============================================================
export async function showcasePage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="showcase-header">
        <h2>Project Showcase</h2>
        <button id="refresh-showcase-btn" class="btn btn-outline" type="button">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div id="showcase-stats" class="kpi-grid compact-stats">
        ${renderStatCard('stat-total',       'Total Projects', 'fa-folder-open')}
        ${renderStatCard('stat-live',        'Live',           'fa-rocket')}
        ${renderStatCard('stat-development', 'Development',    'fa-code')}
        ${renderStatCard('stat-maintenance', 'Maintenance',    'fa-wrench')}
      </div>

      <div class="showcase-toolbar">
        <input type="text" id="showcase-search" placeholder="Search by name or client...">
        <select id="showcase-status-filter" class="sort-select" aria-label="Filter by status">
          <option value="all">All Status</option>
          <option value="Planning">Planning</option>
          <option value="Development">Development</option>
          <option value="Live">Live</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Archived">Archived</option>
        </select>
        <select id="showcase-type-filter" class="sort-select" aria-label="Filter by type">
          <option value="all">All Types</option>
          <option value="Website">Website</option>
          <option value="Web Application">Web Application</option>
          <option value="Mobile App">Mobile App</option>
          <option value="Desktop App">Desktop App</option>
          <option value="API / Backend">API / Backend</option>
          <option value="Other">Other</option>
        </select>
        <select id="showcase-sort" class="sort-select" aria-label="Sort">
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="client-asc">Client A–Z</option>
          <option value="updated-desc">Last Updated (newest)</option>
          <option value="updated-asc">Last Updated (oldest)</option>
        </select>
        <button id="clear-showcase-filters-btn" class="btn btn-outline btn-sm" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <div id="showcase-grid" class="showcase-grid">
        <p class="empty-state">Loading projects…</p>
      </div>

      <div id="load-more-container" class="load-more-wrapper hidden">
        <button id="load-more-btn" class="btn btn-outline" type="button">Load More</button>
      </div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let allProjects       = [];
  let filteredProjects  = [];
  let exchangeRate      = DEFAULT_EXCHANGE_RATE;
  let currentPage       = 1;


  // ---------- DOM refs ----------
  const searchInput       = document.getElementById('showcase-search');
  const statusFilter      = document.getElementById('showcase-status-filter');
  const typeFilter        = document.getElementById('showcase-type-filter');
  const sortSelect        = document.getElementById('showcase-sort');
  const clearBtn          = document.getElementById('clear-showcase-filters-btn');
  const refreshBtn        = document.getElementById('refresh-showcase-btn');
  const grid              = document.getElementById('showcase-grid');
  const loadMoreContainer = document.getElementById('load-more-container');
  const loadMoreBtn       = document.getElementById('load-more-btn');


  // ---------- Helpers ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) console.warn(`[showcase] ${label}:`, err);
    };
  }

  /**
   * Sanitize a URL — only allow http(s) and mailto. Blocks
   * javascript:, data:, and other dangerous protocols.
   */
  function safeUrl(url) {
    if (!url) return '';
    const s = String(url).trim();
    if (/^(https?:|mailto:|\/|#)/i.test(s)) return s;
    return '';
  }

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
  // DATA
  // ============================================================
  async function loadExchangeRate() {
    try {
      const prefs = await dashboardService.getPreferences();
      exchangeRate = Number(prefs?.exchange_rate) || DEFAULT_EXCHANGE_RATE;
    } catch (err) {
      devOnly('exchange rate')(err);
    }
  }

  async function loadShowcase() {
    try {
      allProjects = await projectService.getAll();
      updateStats(allProjects);
      applyFiltersAndSort();
    } catch (err) {
      devOnly('load showcase')(err);
      showToast('Failed to load projects.', 'error');
      grid.innerHTML = `<p class="empty-state">Error loading projects.</p>`;
    }
  }

  function updateStats(projects) {
    const count = (status) => projects.filter((p) => p.status === status).length;

    setText('stat-total',       format.number(projects.length));
    setText('stat-live',        format.number(count('Live')));
    setText('stat-development', format.number(count('Development')));
    setText('stat-maintenance', format.number(count('Maintenance')));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }


  // ============================================================
  // FILTER + SORT
  // ============================================================
  function applyFiltersAndSort() {
    const term   = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const type   = typeFilter.value;
    const sort   = sortSelect.value;

    filteredProjects = allProjects.filter((p) => {
      const matchesSearch =
        !term ||
        (p.name   || '').toLowerCase().includes(term) ||
        (p.client || '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || p.status === status;
      const matchesType   = type   === 'all' || p.project_type === type;
      return matchesSearch && matchesStatus && matchesType;
    });

    const str   = (v) => (v || '').toString().toLowerCase();
    const date  = (v) => {
      const d = new Date(v || 0);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };

    filteredProjects.sort((a, b) => {
      switch (sort) {
        case 'name-asc':     return str(a.name).localeCompare(str(b.name));
        case 'name-desc':    return str(b.name).localeCompare(str(a.name));
        case 'client-asc':   return str(a.client).localeCompare(str(b.client));
        case 'client-desc':  return str(b.client).localeCompare(str(a.client));
        case 'updated-desc': return date(b.last_updated) - date(a.last_updated);
        case 'updated-asc':  return date(a.last_updated) - date(b.last_updated);
        default:             return 0;
      }
    });

    currentPage = 1;
    renderGrid();
  }


  // ============================================================
  // RENDER
  // ============================================================
  function renderGrid() {
    const end       = currentPage * PAGE_SIZE;
    const pageItems = filteredProjects.slice(0, end);

    if (pageItems.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <p>No projects found.</p>
        </div>`;
      loadMoreContainer.classList.add('hidden');
      return;
    }

    grid.innerHTML = pageItems.map((p) => renderShowcaseCard(p)).join('');

    loadMoreContainer.classList.toggle('hidden', end >= filteredProjects.length);
  }

  function renderStatCard(id, label, icon) {
    return `
      <div class="card kpi-card compact-kpi">
        <i class="fas ${icon} kpi-icon"></i>
        <h3>${label}</h3>
        <div class="value" id="${id}">0</div>
      </div>
    `;
  }


  // ============================================================
  // DETAIL MODAL
  // ============================================================
  async function openProjectDetails(projectId) {
    const project = allProjects.find((p) => String(p.id) === String(projectId));
    if (!project) {
      showToast('Project not found.', 'error');
      return;
    }

    // ---------- Fetch financial data ----------
    let projectExpenses = [];
    let allRevenue = [];
    try {
      [projectExpenses, allRevenue] = await Promise.all([
        financeService.getExpensesByProject(projectId),
        financeService.getRevenue(),
      ]);
    } catch (err) {
      devOnly('financial data')(err);
    }

    const totalExpenses  = projectExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const projectRevenue = allRevenue
      .filter((s) => String(s.project_id) === String(projectId))
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const netProfit   = projectRevenue - totalExpenses;
    const askingPrice = Number(project.asking_price) || 0;

    const techStack = parseTechStack(project.tech_stack).join(', ') || '—';

    // ---------- Sanitize URLs ----------
    const liveUrl   = safeUrl(project.live_url);
    const githubUrl = safeUrl(project.github);

    // ---------- Build modal HTML ----------
    const content = `
      <div class="modal-header-bar">
        <h2><i class="fas fa-info-circle"></i> ${escapeHtml(project.name)}</h2>
        <span class="status ${escapeAttr((project.status || '').toLowerCase())}">${escapeHtml(project.status) || '—'}</span>
      </div>

      ${project.thumbnail_url
        ? `<img src="${escapeAttr(project.thumbnail_url)}" alt="${escapeAttr(project.name)}" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:1rem;" />`
        : `<div class="showcase-placeholder" style="height:200px;margin-bottom:1rem;"><i class="fas fa-image"></i></div>`
      }

      <div class="quick-view-grid">
        <div><strong>Client:</strong>      ${escapeHtml(project.client)      || '—'}</div>
        <div><strong>Location:</strong>    ${escapeHtml(project.location)    || '—'}</div>
        <div>
          <strong>Live URL:</strong>
          ${liveUrl
            ? `<a href="${escapeAttr(liveUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(liveUrl)}</a>`
            : '—'}
        </div>
        <div>
          <strong>GitHub:</strong>
          ${githubUrl
            ? `<a href="${escapeAttr(githubUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(githubUrl)}</a>`
            : '—'}
        </div>
        <div><strong>Hosting:</strong>      ${escapeHtml(project.hosting)      || '—'}</div>
        <div><strong>Tech Stack:</strong>   ${escapeHtml(techStack)}</div>
        <div><strong>Project Type:</strong> ${escapeHtml(project.project_type) || '—'}</div>
        <div><strong>Last Updated:</strong> ${format.dateTime(project.last_updated)}</div>
      </div>

      <hr class="form-divider">

      <h3><i class="fas fa-calculator"></i> Cost Summary</h3>
      <div class="cost-summary-grid">
        <div>
          <strong>Total Expenses:</strong>
          ${format.currency(totalExpenses)}
          <small class="text-muted">(${format.currency(totalExpenses * exchangeRate)})</small>
        </div>
        <div>
          <strong>Total Revenue:</strong>
          ${format.currency(projectRevenue)}
          <small class="text-muted">(${format.currency(projectRevenue * exchangeRate)})</small>
        </div>
        <div>
          <strong>Net Profit:</strong>
          ${format.currency(netProfit)}
          <small class="text-muted">(${format.currency(netProfit * exchangeRate)})</small>
        </div>
        <div>
          <strong>Asking Price:</strong>
          ${format.currency(askingPrice)}
          <small class="text-muted">(${format.currency(askingPrice * exchangeRate)})</small>
        </div>
      </div>

      <div class="form-group">
        <strong>Description:</strong>
        <p>${escapeHtml(project.description) || 'No description.'}</p>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline print-cost-summary-btn">
          <i class="fas fa-print"></i> Print Statement
        </button>
        <button type="button" id="close-showcase-modal-btn" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back
        </button>
      </div>
    `;

    const modal = showModal(content);

    modal.element.querySelector('#close-showcase-modal-btn')
      ?.addEventListener('click', modal.close);

    modal.element.querySelector('.print-cost-summary-btn')
      ?.addEventListener('click', () => {
        printCostSummary(project, {
          totalExpenses,
          projectRevenue,
          netProfit,
          askingPrice,
        });
      });
  }


  // ============================================================
  // PRINT
  // ============================================================
  function printCostSummary(project, { totalExpenses, projectRevenue, netProfit, askingPrice }) {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('Please allow pop-ups to print.', 'error');
      return;
    }

    const rows = [
      ['Total Expenses', totalExpenses],
      ['Total Revenue',  projectRevenue],
      ['Net Profit',     netProfit],
      ['Asking Price',   askingPrice],
    ];

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Project Cost Summary — ${escapeHtml(project.name)}</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1>${escapeHtml(project.name)}</h1>
          <p><strong>Client:</strong> ${escapeHtml(project.client) || '—'}</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr><th>Metric</th><th>USD</th><th>KES (${exchangeRate})</th></tr>
            ${rows.map(([label, amount]) => `
              <tr>
                <td>${label}</td>
                <td>${format.currency(amount)}</td>
                <td>${format.currency(amount * exchangeRate)}</td>
              </tr>
            `).join('')}
          </table>
          <p><em>Generated by EagleVision CloudBoard</em></p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  }


  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  const handleSearch = debounce(() => applyFiltersAndSort(), SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener('input', handleSearch);
  statusFilter.addEventListener('change', applyFiltersAndSort);
  typeFilter.addEventListener('change', applyFiltersAndSort);
  sortSelect.addEventListener('change', applyFiltersAndSort);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = 'all';
    typeFilter.value = 'all';
    sortSelect.value = 'name-asc';
    applyFiltersAndSort();
  });

  refreshBtn.addEventListener('click', async () => {
    grid.innerHTML = '<p class="empty-state">Loading projects…</p>';
    await loadShowcase();
  });

  loadMoreBtn.addEventListener('click', () => {
    currentPage += 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end   = currentPage * PAGE_SIZE;
    const items = filteredProjects.slice(start, end);

    if (items.length > 0) {
      grid.insertAdjacentHTML('beforeend', items.map((p) => renderShowcaseCard(p)).join(''));
    }

    if (end >= filteredProjects.length) {
      loadMoreContainer.classList.add('hidden');
    }
  });

  // Grid click → detail modal
  const onGridClick = (e) => {
    const card = e.target.closest('.showcase-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    openProjectDetails(id);
  };
  grid.addEventListener('click', onGridClick);


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    grid.removeEventListener('click', onGridClick);
    // Note: the search debounce closure isn't tracked here — it fires
    // only on input and uses closures that will be GC'd with the page.
  });


  // ============================================================
  // INIT
  // ============================================================
  await loadExchangeRate();
  await loadShowcase();
}
