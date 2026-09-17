export function renderProjectForm(project = {}) {
  return `
    <div class="project-form-wrapper">

      <!-- ==================== HEADER ==================== -->
      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="fas fa-${project.id ? 'edit' : 'folder-plus'}"></i>
        </div>
        <div class="form-header-text">
          <h2>${project.id ? 'Edit Project' : 'Create New Project'}</h2>
          <p>${project.id ? 'Update the details of your project' : 'Add a new project to your portfolio'}</p>
        </div>
      </div>

      <form id="project-form" class="modern-form">
        <input type="hidden" name="id" value="${project.id || ''}">

        <!-- ==================== SECTION 1: BASIC INFORMATION ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-info-circle"></i></span>
            <span class="form-section-title">Basic Information</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-name">
                <i class="fas fa-tag"></i> Project Name <span class="required">*</span>
              </label>
              <input id="project-name" name="name" value="${escapeAttr(project.name) || ''}" required placeholder="e.g., EagleVision Dashboard">
            </div>
            <div class="form-group">
              <label for="project-client">
                <i class="fas fa-user"></i> Client Name
              </label>
              <input id="project-client" name="client" value="${escapeAttr(project.client) || ''}" placeholder="Client or company name">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-client-number">
                <i class="fas fa-phone"></i> Client Number
              </label>
              <input id="project-client-number" name="client_number" value="${escapeAttr(project.client_number) || ''}" placeholder="e.g., +254 712 345 678">
            </div>
            <div class="form-group">
              <label for="project-client-email">
                <i class="fas fa-envelope"></i> Client Email
              </label>
              <input type="email" id="project-client-email" name="client_email" value="${escapeAttr(project.client_email) || ''}" placeholder="client@example.com">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-location">
                <i class="fas fa-map-marker-alt"></i> Location (County)
              </label>
              <input id="project-location" name="location" list="counties-list" value="${escapeAttr(project.location) || ''}" placeholder="Search county...">
              <datalist id="counties-list">
                ${COUNTIES.map(c => `<option value="${c}">`).join('')}
              </datalist>
            </div>
            <div class="form-group">
              <label for="project-type">
                <i class="fas fa-cube"></i> Project Type
              </label>
              <select id="project-type" name="project_type">
                ${PROJECT_TYPES.map(t => `
                  <option value="${t}" ${project.project_type === t ? 'selected' : ''}>${t}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- ==================== SECTION 2: STATUS & TIMELINE ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-chart-line"></i></span>
            <span class="form-section-title">Status & Timeline</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-status">
                <i class="fas fa-signal"></i> Project Status
              </label>
              <select id="project-status" name="status">
                ${['Planning','Development','Live','Maintenance','Archived'].map(s => `
                  <option value="${s}" ${project.status === s ? 'selected' : ''}>${s}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="project-next-review">
                <i class="fas fa-calendar-alt"></i> Next Review Date
              </label>
              <input type="date" id="project-next-review" name="next_review_date" value="${formatDateInput(project.next_review_date)}">
            </div>
          </div>
        </div>

        <!-- ==================== SECTION 3: LINKS & HOSTING ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-link"></i></span>
            <span class="form-section-title">Links & Hosting</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-live-url">
                <i class="fas fa-globe"></i> Live URL
              </label>
              <input id="project-live-url" name="live_url" value="${escapeAttr(project.live_url) || ''}" placeholder="https://example.com">
            </div>
            <div class="form-group">
              <label for="project-github">
                <i class="fab fa-github"></i> GitHub Repository
              </label>
              <input id="project-github" name="github" value="${escapeAttr(project.github) || ''}" placeholder="https://github.com/username/repo">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-hosting">
                <i class="fas fa-server"></i> Hosting Provider
              </label>
              <input id="project-hosting" name="hosting" list="hosting-list" value="${escapeAttr(project.hosting) || ''}" placeholder="e.g., Render, Vercel, Netlify">
              <datalist id="hosting-list">
                ${HOSTING_PROVIDERS.map(h => `<option value="${h}">`).join('')}
              </datalist>
            </div>
            <div class="form-group">
              <label for="project-database">
                <i class="fas fa-database"></i> Database Host
              </label>
              <input id="project-database" name="database_host" list="database-list" value="${escapeAttr(project.database_host) || ''}" placeholder="e.g., Supabase, MongoDB">
              <datalist id="database-list">
                ${DATABASE_PROVIDERS.map(d => `<option value="${d}">`).join('')}
              </datalist>
            </div>
          </div>
        </div>

        <!-- ==================== SECTION 4: TECHNICAL DETAILS ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-code"></i></span>
            <span class="form-section-title">Technical Details</span>
          </div>

          <div class="form-group">
            <label for="project-tech-stack">
              <i class="fas fa-layer-group"></i> Tech Stack
            </label>
            <input id="project-tech-stack" name="tech_stack" value='${project.tech_stack ? JSON.stringify(project.tech_stack) : ''}' placeholder='["React", "Node.js", "PostgreSQL"]'>
            <span class="form-helper">Enter as JSON array or comma-separated list</span>
          </div>

          <div class="form-group">
            <label for="project-tags">
              <i class="fas fa-hashtag"></i> Tags
            </label>
            <input id="project-tags" name="tags" value="${escapeAttr(project.tags) || ''}" placeholder="dashboard, saas, internal">
            <span class="form-helper">Separate multiple tags with commas</span>
          </div>

          <div class="form-group">
            <label for="project-description">
              <i class="fas fa-align-left"></i> Description
            </label>
            <textarea id="project-description" name="description" rows="4" placeholder="Describe what this project does, its purpose, and any key features...">${escapeHtml(project.description) || ''}</textarea>
          </div>
        </div>

        <!-- ==================== SECTION 5: DOMAIN INFORMATION ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-globe"></i></span>
            <span class="form-section-title">Domain Information</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-domain-name">
                <i class="fas fa-link"></i> Domain Name
              </label>
              <input id="project-domain-name" name="domain_name" value="${escapeAttr(project.domain_name) || ''}" placeholder="e.g., eaglevision.com">
            </div>
            <div class="form-group">
              <label for="project-registrar">
                <i class="fas fa-building"></i> Registrar
              </label>
              <input id="project-registrar" name="registrar" list="registrar-list" value="${escapeAttr(project.registrar) || ''}" placeholder="e.g., Namecheap, GoDaddy">
              <datalist id="registrar-list">
                ${REGISTRARS.map(r => `<option value="${r}">`).join('')}
              </datalist>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-expiry-date">
                <i class="fas fa-calendar-times"></i> Domain Expiry Date
              </label>
              <input type="date" id="project-expiry-date" name="expiry_date" value="${formatDateInput(project.expiry_date)}">
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-modern">
                <input type="checkbox" name="auto_renew" value="true" ${project.auto_renew ? 'checked' : ''}>
                <span class="checkbox-box"></span>
                <span class="checkbox-text">
                  <i class="fas fa-sync-alt"></i> Auto-renew enabled
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- ==================== SECTION 6: SALE OPPORTUNITY ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-tag"></i></span>
            <span class="form-section-title">Sale Opportunity</span>
          </div>

          <div class="form-row">
            <div class="form-group checkbox-group">
              <label class="checkbox-modern">
                <input type="checkbox" name="for_sale" value="true" ${project.for_sale ? 'checked' : ''}>
                <span class="checkbox-box"></span>
                <span class="checkbox-text">
                  <i class="fas fa-dollar-sign"></i> Mark as For Sale
                </span>
              </label>
            </div>
            <div class="form-group">
              <label for="project-asking-price">
                <i class="fas fa-money-bill-wave"></i> Asking Price (USD)
              </label>
              <div class="input-with-prefix">
                <span class="input-prefix">$</span>
                <input type="number" id="project-asking-price" name="asking_price" step="0.01" value="${project.asking_price || ''}" placeholder="0.00">
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== SECTION 7: MEDIA ==================== -->
        <div class="form-section">
          <div class="form-section-header">
            <span class="form-section-icon"><i class="fas fa-image"></i></span>
            <span class="form-section-title">Media</span>
          </div>

          <div class="form-group">
            <label for="project-thumbnail">
              <i class="fas fa-image"></i> Project Thumbnail
            </label>
            <div class="thumbnail-uploader">
              <div class="thumbnail-preview" id="thumbnail-preview">
                ${project.thumbnail_url
                  ? `<img src="${escapeAttr(project.thumbnail_url)}" alt="Thumbnail" />`
                  : `<i class="fas fa-image"></i><span>No image selected</span>`}
              </div>
              <div class="thumbnail-actions">
                <input id="project-thumbnail" name="thumbnail_url" value="${escapeAttr(project.thumbnail_url) || ''}" placeholder="https://... or upload below">
                <div class="thumbnail-buttons">
                  <label for="project-thumbnail-file" class="btn btn-outline btn-sm">
                    <i class="fas fa-upload"></i> Upload Image
                  </label>
                  <input type="file" id="project-thumbnail-file" accept="image/*" style="display:none;">
                  <button type="button" class="btn btn-ghost btn-sm" id="clear-thumbnail-btn">
                    <i class="fas fa-times"></i> Clear
                  </button>
                </div>
                <span class="form-helper">Paste a URL or upload a file (jpg, png, webp)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== ACTIONS ==================== -->
        <div class="form-actions-sticky">
          <button type="button" class="btn btn-outline cancel-form-btn">
            <i class="fas fa-arrow-left"></i> Cancel
          </button>
          <button type="submit" class="btn btn-primary save-form-btn">
            <i class="fas fa-save"></i> ${project.id ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  `;
}

// ==================== HELPERS ====================
function escapeAttr(str) {
  return str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
function escapeHtml(str) {
  return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}
function formatDateInput(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    return dateStr.slice(0, 10);
  }
  return dateStr;
}

// ==================== DATA ====================

// Kenya counties
const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta",
  "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
  "Wajir", "West Pokot"
];

// Project types
const PROJECT_TYPES = [
  "Website",
  "Web Application",
  "Mobile App",
  "Desktop App",
  "API / Backend",
  "Other"
];

// Hosting providers
const HOSTING_PROVIDERS = [
  "Render",
  "Vercel",
  "Netlify",
  "Railway",
  "Fly.io",
  "AWS",
  "Google Cloud",
  "Azure",
  "DigitalOcean",
  "Heroku",
  "Cloudflare Pages",
  "GitHub Pages",
  "Hostinger",
  "cPanel",
  "Other"
];

// Database providers
const DATABASE_PROVIDERS = [
  "Supabase",
  "Firebase",
  "MongoDB Atlas",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "SQLite",
  "Redis",
  "PlanetScale",
  "Neon",
  "Railway",
  "AWS RDS",
  "Azure SQL",
  "Other"
];

// Domain registrars
const REGISTRARS = [
  "Namecheap",
  "GoDaddy",
  "Cloudflare",
  "Google Domains",
  "Porkbun",
  "Dynadot",
  "NameSilo",
  "Hover",
  "Bluehost",
  "Hostinger",
  "Other"
];
