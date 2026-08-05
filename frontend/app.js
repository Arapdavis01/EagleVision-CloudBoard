/* ========== CONFIG ========== */
const API = 'https://eaglevision-api.onrender.com/api';
let currentPage = 'dashboard';
let charts = {};

// ---------- HELPERS ----------
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount || 0);
}

async function fetchJSON(url, options = {}) {
  // Always include credentials
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- AUTH ----------
async function checkAuth() {
  try {
    await fetchJSON(`${API}/auth/check`);
    return true;
  } catch {
    return false;
  }
}

async function login(email, password) {
  return fetchJSON(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function logout() {
  try {
    await fetchJSON(`${API}/auth/logout`, { method: 'POST' });
  } finally {
    // Clear any stale state and reload
    location.reload();
  }
}

// ---------- ROUTING ----------
function navigate(page, param = null) {
  currentPage = page;
  if (param) {
    window.history.pushState(null, '', `?id=${param}`);
  } else {
    window.history.pushState(null, '', window.location.pathname);
  }
  renderApp();
}

// ---------- CHART CLEANUP ----------
function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

// ---------- LOGIN PAGE ----------
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="glass card">
        <h2 style="font-size:1.8rem; text-align:center; margin-bottom:1.5rem; color:var(--primary);">
          🦅 EagleVision
        </h2>
        <form id="loginForm">
          <label>Email</label>
          <input type="email" id="loginEmail" required autocomplete="email" />
          <label>Password</label>
          <input type="password" id="loginPassword" required autocomplete="current-password" />
          <div id="loginError" style="color:var(--danger); font-size:0.85rem; min-height:1.2em;"></div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;" id="loginBtn">
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
      errorDiv.textContent = 'Please fill in both fields.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorDiv.textContent = '';

    try {
      await login(email, password);
      // Force full reload to ensure cookie is picked up
      location.reload();
    } catch (err) {
      errorDiv.textContent = 'Invalid email or password. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

// ---------- DASHBOARD ----------
async function renderDashboard() {
  destroyCharts();

  const [proj, fin, upt] = await Promise.all([
    fetchJSON(`${API}/projects`).catch(() => []),
    fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] })),
    fetchJSON(`${API}/uptime/status`).catch(() => [])
  ]);

  const totalProjects = Array.isArray(proj) ? proj.length : 0;
  const totalRevenue = fin.total || 0;
  const upCount = Array.isArray(upt) ? upt.filter(p => p.status === 'up').length : 0;
  const uptimePercent = totalProjects ? ((upCount / totalProjects) * 100).toFixed(1) : 0;
  const critical = totalProjects - upCount;

  // Fake response time data
  const labels = [], values = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 60 * 60000);
    labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    values.push(Math.floor(Math.random() * 300 + 50));
  }

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1>Dashboard</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Projects</div><div class="stat-value">${totalProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Uptime</div><div class="stat-value">${uptimePercent}%</div></div>
      <div class="stat-card"><div class="stat-label">Critical Alerts</div><div class="stat-value">${critical}</div></div>
    </div>
    <div class="chart-box">
      <h3>Response Time (24h)</h3>
      <canvas id="respChart"></canvas>
    </div>
  `;

  const ctx = document.getElementById('respChart').getContext('2d');
  charts.respChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Response Time (ms)',
        data: values,
        backgroundColor: 'rgba(30,58,95,0.6)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// ---------- PROJECTS ----------
async function renderProjects() {
  const projects = await fetchJSON(`${API}/projects`).catch(() => []);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1>Projects</h1>
    <input type="text" id="searchInput" placeholder="Search projects..." style="margin-bottom:1rem; max-width:300px;" class="input-modern" />
    <div class="table-container">
      <table class="table-modern">
        <thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Latency</th></tr></thead>
        <tbody id="projectTableBody"></tbody>
      </table>
    </div>
  `;

  function renderList(filter = '') {
    const term = filter.toLowerCase();
    const filtered = projects.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.client_name || '').toLowerCase().includes(term)
    );
    const tbody = document.getElementById('projectTableBody');
    tbody.innerHTML = filtered.map(p => `
      <tr class="clickable" data-id="${p.id}">
        <td>${p.name}</td>
        <td>${p.client_name || '—'}</td>
        <td><span class="badge badge-${p.liveStatus?.status === 'up' ? 'up' : 'down'}">${p.liveStatus?.status || 'unknown'}</span></td>
        <td>${p.liveStatus?.latency ? p.liveStatus.latency + 'ms' : '—'}</td>
      </tr>
    `).join('');

    document.querySelectorAll('#projectTableBody tr').forEach(row => {
      row.addEventListener('click', () => navigate('projectDetail', row.dataset.id));
    });
  }

  renderList();
  document.getElementById('searchInput').addEventListener('input', (e) => renderList(e.target.value));
}

// ---------- PROJECT DETAIL ----------
async function renderProjectDetail(id) {
  const project = await fetchJSON(`${API}/projects/${id}`);
  const history = await fetchJSON(`${API}/uptime/history/${id}?range=24h`).catch(() => []);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
      <div>
        <h1>${project.name}</h1>
        <p style="color:#64748b;">${project.client_name || ''}</p>
      </div>
      <span class="badge badge-${project.liveStatus?.status === 'up' ? 'up' : 'down'}">${project.liveStatus?.status || 'unknown'}</span>
    </div>
    <div class="stats-grid" style="margin-top:1.5rem;">
      <div class="stat-card"><div class="stat-label">Latency</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.latency || '—'} ms</div></div>
      <div class="stat-card"><div class="stat-label">Status Code</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.status_code || '—'}</div></div>
      <div class="stat-card"><div class="stat-label">Last Checked</div><div class="stat-value" style="font-size:1.2rem;">${project.liveStatus?.checked_at ? new Date(project.liveStatus.checked_at).toLocaleString() : '—'}</div></div>
    </div>
    <div class="chart-box" style="margin-top:1.5rem;">
      <h3>Response Time History</h3>
      <canvas id="lineChart"></canvas>
    </div>
    <button class="btn btn-primary" onclick="navigate('projects')">← Back to Projects</button>
  `;

  const labels = history.map(h => new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const data = history.map(h => h.response_time_ms);
  const ctx = document.getElementById('lineChart').getContext('2d');
  charts.lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Response Time (ms)',
        data,
        borderColor: '#1e3a5f',
        backgroundColor: 'rgba(30,58,95,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: { responsive: true }
  });
}

// ---------- FINANCE ----------
async function renderFinance() {
  const [fin, projects] = await Promise.all([
    fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] })),
    fetchJSON(`${API}/projects`).catch(() => [])
  ]);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1>Finance</h1>
    <div class="stat-card" style="display:inline-block; min-width:250px; margin-bottom:2rem;">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value" style="font-size:2rem;">${formatCurrency(fin.total)}</div>
    </div>
    <button class="btn btn-primary" id="showFormBtn">+ Record Sale</button>
    <div id="saleForm" style="display:none; margin:1rem 0;" class="glass card">
      <select id="saleProject" class="input-modern"><option value="">Select project</option>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      <input type="number" id="saleAmount" placeholder="Amount (KES)" class="input-modern" />
      <input type="text" id="saleNotes" placeholder="Notes" class="input-modern" />
      <button class="btn btn-success" id="saveSaleBtn">Save</button>
      <button class="btn btn-danger btn-sm" id="cancelSaleBtn">Cancel</button>
    </div>
    <div class="table-container">
      <table class="table-modern">
        <thead><tr><th>Project</th><th>Amount</th><th>Date</th><th>Notes</th><th></th></tr></thead>
        <tbody>${fin.sales.map(s => `
          <tr>
            <td>${s.project_name}</td>
            <td>${formatCurrency(s.amount)}</td>
            <td>${new Date(s.sale_date).toLocaleDateString()}</td>
            <td>${s.notes || '—'}</td>
            <td><button class="btn btn-danger btn-sm delete-sale" data-id="${s.id}">✕</button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;

  document.getElementById('showFormBtn').addEventListener('click', () => {
    document.getElementById('saleForm').style.display = 'block';
  });
  document.getElementById('cancelSaleBtn').addEventListener('click', () => {
    document.getElementById('saleForm').style.display = 'none';
  });
  document.getElementById('saveSaleBtn').addEventListener('click', async () => {
    const project_id = document.getElementById('saleProject').value;
    const amount = document.getElementById('saleAmount').value;
    const notes = document.getElementById('saleNotes').value;
    if (!project_id || !amount) return;
    await fetchJSON(`${API}/finance/sales`, {
      method: 'POST',
      body: JSON.stringify({ project_id: parseInt(project_id), amount: parseFloat(amount), notes })
    });
    navigate('finance');
  });
  document.querySelectorAll('.delete-sale').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Delete this record?')) {
        await fetchJSON(`${API}/finance/sales/${e.target.dataset.id}`, { method: 'DELETE' });
        navigate('finance');
      }
    });
  });
}

// ---------- ALERTS ----------
async function renderAlerts() {
  const downProjects = await fetchJSON(`${API}/uptime/status`).catch(() => []);
  const down = downProjects.filter(p => p.status === 'down');
  const main = document.querySelector('.main-content');
  main.innerHTML = `<h1>Down Projects</h1>`;
  if (down.length === 0) {
    main.innerHTML += `<div class="glass card" style="text-align:center; padding:2rem;">✅ All systems operational</div>`;
  } else {
    main.innerHTML += down.map(p => `
      <div class="glass card" style="margin-bottom:1rem; border-left:4px solid var(--danger); display:flex; justify-content:space-between;">
        <div>
          <strong>Project #${p.project_id}</strong>
          <div style="color:var(--danger);">DOWN</div>
          <small>Last checked: ${new Date(p.checked_at).toLocaleString()}</small>
        </div>
        <span class="badge badge-down">Offline</span>
      </div>
    `).join('');
  }
}

// ---------- LAYOUT ----------
function renderSidebar() {
  return `
    <div class="sidebar">
      <div class="sidebar-logo">🦅 EagleVision</div>
      <nav>
        <a class="${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')">📊 Dashboard</a>
        <a class="${currentPage === 'projects' ? 'active' : ''}" onclick="navigate('projects')">📁 Projects</a>
        <a class="${currentPage === 'finance' ? 'active' : ''}" onclick="navigate('finance')">💰 Finance</a>
        <a class="${currentPage === 'alerts' ? 'active' : ''}" onclick="navigate('alerts')">🚨 Alerts</a>
      </nav>
      <button class="btn btn-danger logout-btn" id="logoutBtn">Sign Out</button>
    </div>
    <div class="main-content"></div>
  `;
}

// ---------- APP INIT ----------
async function renderApp() {
  const loggedIn = await checkAuth();
  if (!loggedIn) {
    renderLogin();
    return;
  }

  document.getElementById('app').innerHTML = `<div class="dashboard-layout">${renderSidebar()}</div>`;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Route
  switch (currentPage) {
    case 'dashboard': await renderDashboard(); break;
    case 'projects': await renderProjects(); break;
    case 'projectDetail': {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) await renderProjectDetail(id);
      else navigate('projects');
      break;
    }
    case 'finance': await renderFinance(); break;
    case 'alerts': await renderAlerts(); break;
    default: navigate('dashboard');
  }
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) currentPage = 'projectDetail';
  else currentPage = 'dashboard';
  renderApp();
});

// Start
renderApp();
