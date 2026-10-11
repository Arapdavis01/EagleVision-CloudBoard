// ============================================================
// EAGLEVISION CLOUDBOARD — FINANCE PAGE
// ============================================================
// Two sections toggled by URL: #finance?section=revenue|expenses
//
// Features:
//   • KPI cards for each section
//   • Monthly trend chart (per section)
//   • Period filter pills (All / This month / Last month / This year)
//   • Search + date-range filter
//   • Sortable table columns
//   • Pagination
//   • CSV export
//   • Add / edit / delete sales and expenses
//   • Multi-expense entry form
//   • Exchange rate editor
//
// Currency convention:
//   • Backend stores all money in USD
//   • The "dual currency" helper shows $X (KSh Y)
//   • Use format.usd() for USD-only displays
//   • Use format.kes() for KES-only displays
// ============================================================

import { renderSidebar, initSidebar }    from '../../components/sidebar.js';
import { financeService }                from '../../services/financeService.js';
import { projectService }                from '../../services/projectService.js';
import { dashboardService }              from '../../services/dashboardService.js';
import {
  renderSalesChart,
  destroyAllSalesCharts,
} from '../../components/salesChart.js';
import { renderSaleForm }                from '../../components/saleForm.js';
import {
  renderExpenseForm,
  renderMultipleExpenseForm,
} from '../../components/expenseForm.js';
import { renderInvoicePreview }          from '../../components/invoicePreview.js';
import { showModal }                     from '../../components/modal.js';
import { showToast }                     from '../../utils/notifications.js';
import { confirmDialog }                 from '../../utils/confirm.js';
import { escapeHtml }                    from '../../utils/dom.js';
import { format }                        from '../../utils/format.js';
import { registerCleanup }               from '../../utils/pageLifecycle.js';
import { CHART_COLORS }                  from '../../config/constants.js';


// ============================================================
// MODULE STATE
// ============================================================
const PAGE_SIZE = 10;
const DEFAULT_EXCHANGE_RATE = 129;


// ============================================================
// PAGE ENTRY
// ============================================================
export async function financePage() {
  const hashParams = new URLSearchParams(location.hash.split('?')[1] || '');
  let activeSection = hashParams.get('section') || 'revenue';

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content">
      <div class="finance-header">
        <h2 id="page-title">${activeSection === 'revenue' ? 'Revenue' : 'Expenses'}</h2>
        <div class="finance-actions">
          <span id="exchange-rate-badge" class="exchange-rate-badge">
            <i class="fas fa-exchange-alt"></i> 1 USD = KSh <span id="rate-value">${DEFAULT_EXCHANGE_RATE}</span>
          </span>
          <button id="edit-rate-btn" class="btn btn-sm btn-outline" type="button" aria-label="Edit exchange rate">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>

      <div id="finance-section-container"></div>
    </div>
  `;

  initSidebar();


  // ---------- STATE ----------
  let exchangeRate = DEFAULT_EXCHANGE_RATE;
  let allProjects  = [];


  // ---------- HELPERS ----------
  function devOnly(label) {
    return (err) => {
      if (import.meta?.env?.DEV) {
        console.warn(`[finance] ${label}:`, err);
      }
    };
  }

  function formatDualCurrency(usdAmount) {
    const usd = Number(usdAmount) || 0;
    const kes = usd * exchangeRate;
    return `${format.usd(usd)} <small class="text-muted">(${format.kes(kes)})</small>`;
  }

  function updateRateBadge() {
    const el = document.getElementById('rate-value');
    if (el) el.textContent = exchangeRate;
  }

  async function loadExchangeRate() {
    try {
      const prefs = await dashboardService.getPreferences();
      exchangeRate = Number(prefs?.exchange_rate) || DEFAULT_EXCHANGE_RATE;
      updateRateBadge();
    } catch (err) {
      devOnly('exchange rate')(err);
    }
  }

  async function loadProjects() {
    try {
      allProjects = await projectService.getAll();
    } catch (err) {
      devOnly('projects')(err);
      allProjects = [];
    }
  }


  // ============================================================
  // PERIOD FILTER (used by both sections)
  // ============================================================
  function applyPeriodFilter(period, fromInput, toInput, refreshFn) {
    const now = new Date();
    let from = '';
    let to   = '';

    const iso = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (period === 'this-month') {
      from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      to   = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (period === 'last-month') {
      from = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      to   = iso(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (period === 'this-year') {
      from = `${now.getFullYear()}-01-01`;
      to   = `${now.getFullYear()}-12-31`;
    }

    if (fromInput) fromInput.value = from;
    if (toInput)   toInput.value   = to;
    refreshFn();
  }


  // ============================================================
  // SHARED: Placeholder KPIs
  // ============================================================
  function renderPlaceholderKPIs(defs) {
    return defs.map(([icon, label]) => `
      <div class="card kpi-card compact-kpi">
        <i class="fas ${icon} kpi-icon"></i>
        <h3>${label}</h3>
        <div class="value kpi-placeholder">—</div>
      </div>
    `).join('');
  }


  // ============================================================
  // SHARED: CSV export
  // ============================================================
  function exportCSV(rows, filename) {
    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }


  // ============================================================
  // REVENUE SECTION
  // ============================================================
  function renderRevenueSection() {
    const container = document.getElementById('finance-section-container');
    container.innerHTML = `
      <div class="finance-actions">
        <button id="record-sale-btn" class="btn btn-primary" type="button">
          <i class="fas fa-plus"></i> Record Sale
        </button>
        <button id="export-revenue-csv-btn" class="btn btn-outline" type="button">
          <i class="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div class="filter-bar period-filter-bar">
        <button type="button" class="filter-pill active" data-period="all">All Time</button>
        <button type="button" class="filter-pill" data-period="this-month">This Month</button>
        <button type="button" class="filter-pill" data-period="last-month">Last Month</button>
        <button type="button" class="filter-pill" data-period="this-year">This Year</button>
      </div>

      <div id="revenue-kpi-container" class="kpi-grid">
        ${renderPlaceholderKPIs([
          ['fa-dollar-sign',  'Total Revenue'],
          ['fa-calendar-week','Revenue This Month'],
          ['fa-chart-line',   'Average Sale'],
          ['fa-receipt',      'Total Sales'],
        ])}
      </div>

      <div class="card compact-card" style="margin-bottom:1rem;">
        <h3><i class="fas fa-balance-scale"></i> Net Income (Revenue − Expenses)</h3>
        <div id="revenue-net-income-value" class="value" style="font-size:1.5rem;">--</div>
      </div>

      <div class="card chart-card compact-chart" style="margin-bottom:1rem;">
        <h3><i class="fas fa-chart-line"></i> Monthly Revenue</h3>
        <canvas id="revenueChartCanvas"></canvas>
      </div>

      <div class="finance-toolbar">
        <input type="text" id="revenue-search" placeholder="Search by project name...">
        <input type="month" id="revenue-date-from" title="From date">
        <input type="month" id="revenue-date-to" title="To date">
        <button id="clear-revenue-filters-btn" class="btn btn-outline btn-sm" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <div class="table-container card">
        <table id="revenue-table" class="summary-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="project_name">Project <i class="fas fa-sort"></i></th>
              <th class="sortable" data-sort="amount">Amount <i class="fas fa-sort"></i></th>
              <th class="sortable" data-sort="sale_date">Date <i class="fas fa-sort"></i></th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="revenue-tbody">
            <tr><td colspan="5" class="empty-state">Loading revenue…</td></tr>
          </tbody>
        </table>
      </div>
      <div id="revenue-pagination" class="pagination-bar"></div>
    `;

    initRevenueSection(container);
  }


  function initRevenueSection(container) {
    // ---------- Section state ----------
    let allRevenue = [];
    let filtered = [];
    let currentPage = 1;
    let sortField = 'sale_date';
    let sortDir   = 'desc';
    let searchTerm = '';
    let dateFrom   = '';
    let dateTo     = '';

    // ---------- DOM refs ----------
    const $ = (sel) => container.querySelector(sel);
    const searchInput   = $('#revenue-search');
    const dateFromInput = $('#revenue-date-from');
    const dateToInput   = $('#revenue-date-to');
    const clearBtn      = $('#clear-revenue-filters-btn');
    const tbody         = $('#revenue-tbody');
    const pagination    = $('#revenue-pagination');
    const kpiContainer  = $('#revenue-kpi-container');
    const netIncomeEl   = $('#revenue-net-income-value');
    const periodBar     = container.querySelector('.period-filter-bar');

    // ---------- Load ----------
    async function loadRevenue() {
      try {
        allRevenue = await financeService.getRevenue();
      } catch (err) {
        devOnly('revenue load')(err);
        showToast('Failed to load revenue.', 'error');
        allRevenue = [];
      }

      updateRevenueKPIs(allRevenue);
      updateRevenueChart(allRevenue);
      updateNetIncome(netIncomeEl);
      applyFiltersAndSort();
    }

    function updateRevenueKPIs(revenue) {
      const totalRevenue = revenue.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const now = new Date();
      const thisMonthRevenue = revenue
        .filter((s) => {
          const d = new Date(s.sale_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const avgSale = revenue.length ? totalRevenue / revenue.length : 0;

      kpiContainer.innerHTML = `
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-dollar-sign kpi-icon"></i>
          <h3>Total Revenue</h3>
          <div class="value">${formatDualCurrency(totalRevenue)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-calendar-week kpi-icon"></i>
          <h3>Revenue This Month</h3>
          <div class="value">${formatDualCurrency(thisMonthRevenue)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-chart-line kpi-icon"></i>
          <h3>Average Sale</h3>
          <div class="value">${formatDualCurrency(avgSale)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-receipt kpi-icon"></i>
          <h3>Total Sales</h3>
          <div class="value">${format.number(revenue.length)}</div>
        </div>
      `;
    }

    function updateRevenueChart(revenue) {
      const monthly = {};
      revenue.forEach((s) => {
        const month = String(s.sale_date || '').slice(0, 7);
        if (!month) return;
        monthly[month] = (monthly[month] || 0) + (Number(s.amount) || 0);
      });
      const sortedMonths = Object.keys(monthly).sort();
      const chartData = sortedMonths.map((m) => ({ month: m, total: monthly[m] }));

      renderSalesChart('revenueChartCanvas', chartData, {
        exchangeRate,
        label: 'Revenue',
        color: CHART_COLORS.primary,
      });
    }

    async function updateNetIncome(el) {
      try {
        const net = await financeService.getNetIncome();
        const income = Number(net?.net_income) || 0;
        const rev    = Number(net?.total_revenue) || 0;
        const exp    = Number(net?.total_expense) || 0;

        // FIX: USD for the small breakdown
        el.innerHTML = `
          ${formatDualCurrency(income)}
          <br>
          <small>Revenue: ${format.usd(rev)} | Expenses: ${format.usd(exp)}</small>
        `;
      } catch (err) {
        devOnly('net income')(err);
      }
    }

    // ---------- Filters + sort ----------
    function applyFiltersAndSort() {
      filtered = [...allRevenue];

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((s) => (s.project_name || '').toLowerCase().includes(term));
      }
      if (dateFrom) filtered = filtered.filter((s) => s.sale_date >= dateFrom);
      if (dateTo)   filtered = filtered.filter((s) => s.sale_date <= dateTo);

      filtered.sort((a, b) => {
        let valA, valB;
        if (sortField === 'amount') {
          valA = Number(a.amount) || 0;
          valB = Number(b.amount) || 0;
        } else if (sortField === 'sale_date') {
          valA = new Date(a.sale_date).getTime() || 0;
          valB = new Date(b.sale_date).getTime() || 0;
        } else {
          valA = String(a[sortField] || '').toLowerCase();
          valB = String(b[sortField] || '').toLowerCase();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      renderTable(pageItems);
      renderPagination(totalPages);
    }

    function renderTable(items) {
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No sales found.</td></tr>`;
        return;
      }

      tbody.innerHTML = items.map((s) => {
        const notePreview = s.notes
          ? escapeHtml(String(s.notes).slice(0, 30)) + (s.notes.length > 30 ? '…' : '')
          : '';

        return `
          <tr data-id="${s.id}">
            <td>${escapeHtml(s.project_name) || 'Unknown'}</td>
            <td>${formatDualCurrency(s.amount)}</td>
            <td>${format.date(s.sale_date)}</td>
            <td>${notePreview}</td>
            <td class="actions-cell">
              <button type="button" class="btn btn-sm view-invoice" title="View invoice">
                <i class="fas fa-file-invoice"></i>
              </button>
              <button type="button" class="btn btn-sm btn-danger delete-revenue" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }

      let html = '';
      for (let i = 1; i <= totalPages; i++) {
        html += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagination.innerHTML = html;
    }

    // ---------- Period filter ----------
    periodBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      periodBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      applyPeriodFilter(pill.dataset.period, dateFromInput, dateToInput, () => {});
      dateFrom = dateFromInput.value;
      dateTo   = dateToInput.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    // ---------- Other filters ----------
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    dateFromInput.addEventListener('change', (e) => {
      dateFrom = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    dateToInput.addEventListener('change', (e) => {
      dateTo = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    clearBtn.addEventListener('click', () => {
      searchTerm = dateFrom = dateTo = '';
      searchInput.value = dateFromInput.value = dateToInput.value = '';
      periodBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      periodBar.querySelector('[data-period="all"]')?.classList.add('active');
      currentPage = 1;
      applyFiltersAndSort();
    });

    // ---------- Sort ----------
    container.querySelectorAll('#revenue-table .sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = field;
          sortDir = 'asc';
        }
        currentPage = 1;
        applyFiltersAndSort();

        container.querySelectorAll('#revenue-table .sortable i').forEach((i) => {
          i.className = 'fas fa-sort';
        });
        th.querySelector('i').className = sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
      });
    });

    // ---------- Pagination ----------
    pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn) return;
      currentPage = parseInt(btn.dataset.page, 10);
      applyFiltersAndSort();
    });

    // ---------- Row actions ----------
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const row = e.target.closest('tr');
      const id  = row?.dataset.id;
      if (!id) return;

      const sale = allRevenue.find((s) => String(s.id) === String(id));
      if (!sale) return;

      if (btn.classList.contains('delete-revenue')) {
        // FIX: USD
        const ok = await confirmDialog(
          `Delete sale of ${format.usd(sale.amount)}?`,
          'Confirm Deletion'
        );
        if (!ok) return;
        try {
          await financeService.deleteRevenue(id);
          showToast('Sale deleted', 'success');
          loadRevenue();
        } catch (err) {
          showToast(err.message, 'error');
        }
      } else if (btn.classList.contains('view-invoice')) {
        showModal(renderInvoicePreview(sale));
      }
    });

    // ---------- Record sale ----------
    document.getElementById('record-sale-btn').addEventListener('click', async () => {
      await loadProjects();
      const modal = showModal(renderSaleForm(allProjects));

      document.getElementById('sale-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
          await financeService.createRevenue(data);
          modal.close();
          showToast('Sale recorded', 'success');
          loadRevenue();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // ---------- CSV export ----------
    document.getElementById('export-revenue-csv-btn').addEventListener('click', () => {
      const rows = [['Project', 'Amount (USD)', 'Amount (KES)', 'Date', 'Notes']];
      allRevenue.forEach((s) => {
        rows.push([
          s.project_name || 'Unknown',
          (Number(s.amount) || 0).toFixed(2),
          ((Number(s.amount) || 0) * exchangeRate).toFixed(2),
          s.sale_date,
          s.notes || '',
        ]);
      });
      exportCSV(rows, `revenue_export_${new Date().toISOString().slice(0, 10)}.csv`);
    });

    // ---------- Initial load ----------
    loadRevenue();
  }


  // ============================================================
  // EXPENSE SECTION
  // ============================================================
  function renderExpenseSection() {
    const container = document.getElementById('finance-section-container');
    container.innerHTML = `
      <div class="finance-actions">
        <button id="add-expense-btn" class="btn btn-primary" type="button">
          <i class="fas fa-plus"></i> Add Expense
        </button>
        <button id="add-multiple-expenses-btn" class="btn btn-outline" type="button">
          <i class="fas fa-list"></i> Add Multiple Expenses
        </button>
        <button id="export-expenses-csv-btn" class="btn btn-outline" type="button">
          <i class="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div class="filter-bar period-filter-bar">
        <button type="button" class="filter-pill active" data-period="all">All Time</button>
        <button type="button" class="filter-pill" data-period="this-month">This Month</button>
        <button type="button" class="filter-pill" data-period="last-month">Last Month</button>
        <button type="button" class="filter-pill" data-period="this-year">This Year</button>
      </div>

      <div id="expense-kpi-container" class="kpi-grid">
        ${renderPlaceholderKPIs([
          ['fa-wallet',        'Total Expenses'],
          ['fa-calendar-week', 'Expenses This Month'],
          ['fa-calculator',    'Average Expense'],
          ['fa-receipt',       'Expense Count'],
        ])}
      </div>

      <div class="card compact-card" style="margin-bottom:1rem;">
        <h3><i class="fas fa-balance-scale"></i> Net Income (Revenue − Expenses)</h3>
        <div id="expense-net-income-value" class="value" style="font-size:1.5rem;">--</div>
      </div>

      <div class="card chart-card compact-chart" style="margin-bottom:1rem;">
        <h3><i class="fas fa-chart-bar"></i> Monthly Expenses</h3>
        <canvas id="expenseChartCanvas"></canvas>
      </div>

      <div class="finance-toolbar">
        <input type="text" id="expense-search" placeholder="Search by category or notes...">
        <input type="month" id="expense-date-from" title="From date">
        <input type="month" id="expense-date-to" title="To date">
        <button id="clear-expense-filters-btn" class="btn btn-outline btn-sm" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <div class="table-container card">
        <table id="expense-table" class="summary-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="category">Category <i class="fas fa-sort"></i></th>
              <th>Project</th>
              <th class="sortable" data-sort="amount">Amount <i class="fas fa-sort"></i></th>
              <th class="sortable" data-sort="expense_date">Date <i class="fas fa-sort"></i></th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="expense-tbody">
            <tr><td colspan="6" class="empty-state">Loading expenses…</td></tr>
          </tbody>
        </table>
      </div>
      <div id="expense-pagination" class="pagination-bar"></div>
    `;

    initExpenseSection(container);
  }


  function initExpenseSection(container) {
    // ---------- Section state ----------
    let allExpenses = [];
    let filtered = [];
    let currentPage = 1;
    let sortField = 'expense_date';
    let sortDir   = 'desc';
    let searchTerm = '';
    let dateFrom   = '';
    let dateTo     = '';

    // ---------- DOM refs ----------
    const $ = (sel) => container.querySelector(sel);
    const searchInput   = $('#expense-search');
    const dateFromInput = $('#expense-date-from');
    const dateToInput   = $('#expense-date-to');
    const clearBtn      = $('#clear-expense-filters-btn');
    const tbody         = $('#expense-tbody');
    const pagination    = $('#expense-pagination');
    const kpiContainer  = $('#expense-kpi-container');
    const netIncomeEl   = $('#expense-net-income-value');
    const periodBar     = container.querySelector('.period-filter-bar');

    // ---------- Load ----------
    async function loadExpenses() {
      try {
        allExpenses = await financeService.getExpenses();
      } catch (err) {
        devOnly('expense load')(err);
        showToast('Failed to load expenses.', 'error');
        allExpenses = [];
      }

      updateExpenseKPIs(allExpenses);
      updateExpenseChart(allExpenses);
      updateNetIncome(netIncomeEl);
      applyFiltersAndSort();
    }

    function updateExpenseKPIs(expenses) {
      const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const now = new Date();
      const monthTotal = expenses
        .filter((e) => {
          const d = new Date(e.expense_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const avg = expenses.length ? total / expenses.length : 0;

      kpiContainer.innerHTML = `
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-wallet kpi-icon"></i>
          <h3>Total Expenses</h3>
          <div class="value">${formatDualCurrency(total)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-calendar-week kpi-icon"></i>
          <h3>Expenses This Month</h3>
          <div class="value">${formatDualCurrency(monthTotal)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-calculator kpi-icon"></i>
          <h3>Average Expense</h3>
          <div class="value">${formatDualCurrency(avg)}</div>
        </div>
        <div class="card kpi-card compact-kpi">
          <i class="fas fa-receipt kpi-icon"></i>
          <h3>Expense Count</h3>
          <div class="value">${format.number(expenses.length)}</div>
        </div>
      `;
    }

    function updateExpenseChart(expenses) {
      const monthly = {};
      expenses.forEach((e) => {
        const month = String(e.expense_date || '').slice(0, 7);
        if (!month) return;
        monthly[month] = (monthly[month] || 0) + (Number(e.amount) || 0);
      });
      const sortedMonths = Object.keys(monthly).sort();
      const chartData = sortedMonths.map((m) => ({ month: m, total: monthly[m] }));

      renderSalesChart('expenseChartCanvas', chartData, {
        exchangeRate,
        label: 'Expenses',
        color: CHART_COLORS.warning,
      });
    }

    async function updateNetIncome(el) {
      try {
        const net = await financeService.getNetIncome();
        const income = Number(net?.net_income) || 0;
        const rev    = Number(net?.total_revenue) || 0;
        const exp    = Number(net?.total_expense) || 0;

        // FIX: USD for the small breakdown
        el.innerHTML = `
          ${formatDualCurrency(income)}
          <br>
          <small>Revenue: ${format.usd(rev)} | Expenses: ${format.usd(exp)}</small>
        `;
      } catch (err) {
        devOnly('net income')(err);
      }
    }

    // ---------- Filters + sort ----------
    function applyFiltersAndSort() {
      filtered = [...allExpenses];

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((e) =>
          `${e.category || ''} ${e.notes || ''} ${e.project_name || ''}`
            .toLowerCase()
            .includes(term)
        );
      }
      if (dateFrom) filtered = filtered.filter((e) => e.expense_date >= dateFrom);
      if (dateTo)   filtered = filtered.filter((e) => e.expense_date <= dateTo);

      filtered.sort((a, b) => {
        let valA, valB;
        if (sortField === 'amount') {
          valA = Number(a.amount) || 0;
          valB = Number(b.amount) || 0;
        } else if (sortField === 'expense_date') {
          valA = new Date(a.expense_date).getTime() || 0;
          valB = new Date(b.expense_date).getTime() || 0;
        } else {
          valA = String(a[sortField] || '').toLowerCase();
          valB = String(b[sortField] || '').toLowerCase();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      renderTable(pageItems);
      renderPagination(totalPages);
    }

    function renderTable(items) {
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No expenses found.</td></tr>`;
        return;
      }

      tbody.innerHTML = items.map((e) => {
        const notePreview = e.notes
          ? escapeHtml(String(e.notes).slice(0, 30)) + (e.notes.length > 30 ? '…' : '')
          : '';

        return `
          <tr data-id="${e.id}">
            <td><span class="category-badge">${escapeHtml(e.category)}</span></td>
            <td>${escapeHtml(e.project_name) || '—'}</td>
            <td>${formatDualCurrency(e.amount)}</td>
            <td>${format.date(e.expense_date)}</td>
            <td>${notePreview}</td>
            <td class="actions-cell">
              <button type="button" class="btn btn-sm edit-expense" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" class="btn btn-sm btn-danger delete-expense" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }

      let html = '';
      for (let i = 1; i <= totalPages; i++) {
        html += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      pagination.innerHTML = html;
    }

    // ---------- Period filter ----------
    periodBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      periodBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      applyPeriodFilter(pill.dataset.period, dateFromInput, dateToInput, () => {});
      dateFrom = dateFromInput.value;
      dateTo   = dateToInput.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    // ---------- Other filters ----------
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    dateFromInput.addEventListener('change', (e) => {
      dateFrom = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    dateToInput.addEventListener('change', (e) => {
      dateTo = e.target.value;
      currentPage = 1;
      applyFiltersAndSort();
    });

    clearBtn.addEventListener('click', () => {
      searchTerm = dateFrom = dateTo = '';
      searchInput.value = dateFromInput.value = dateToInput.value = '';
      periodBar.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      periodBar.querySelector('[data-period="all"]')?.classList.add('active');
      currentPage = 1;
      applyFiltersAndSort();
    });

    // ---------- Sort ----------
    container.querySelectorAll('#expense-table .sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortField = field;
          sortDir = 'asc';
        }
        currentPage = 1;
        applyFiltersAndSort();

        container.querySelectorAll('#expense-table .sortable i').forEach((i) => {
          i.className = 'fas fa-sort';
        });
        th.querySelector('i').className = sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
      });
    });

    // ---------- Pagination ----------
    pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn) return;
      currentPage = parseInt(btn.dataset.page, 10);
      applyFiltersAndSort();
    });

    // ---------- Row actions ----------
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const row = e.target.closest('tr');
      const id  = row?.dataset.id;
      if (!id) return;

      const expense = allExpenses.find((x) => String(x.id) === String(id));
      if (!expense) return;

      if (btn.classList.contains('delete-expense')) {
        // FIX: USD
        const ok = await confirmDialog(
          `Delete expense of ${format.usd(expense.amount)}?`,
          'Confirm Deletion'
        );
        if (!ok) return;
        try {
          await financeService.deleteExpense(id);
          showToast('Expense deleted', 'success');
          loadExpenses();
        } catch (err) {
          showToast(err.message, 'error');
        }
      } else if (btn.classList.contains('edit-expense')) {
        await loadProjects();
        openExpenseModal(expense, () => loadExpenses());
      }
    });

    // ---------- Add expense ----------
    document.getElementById('add-expense-btn').addEventListener('click', async () => {
      await loadProjects();
      openExpenseModal({}, () => loadExpenses());
    });

    // ---------- Multi expense ----------
    document.getElementById('add-multiple-expenses-btn').addEventListener('click', async () => {
      await loadProjects();
      const modal = showModal(renderMultipleExpenseForm(allProjects, exchangeRate));
      attachMultiExpenseFormLogic(modal.close, () => loadExpenses());
    });

    // ---------- CSV export ----------
    document.getElementById('export-expenses-csv-btn').addEventListener('click', () => {
      const rows = [['Category', 'Project', 'Amount (USD)', 'Amount (KES)', 'Date', 'Notes']];
      allExpenses.forEach((e) => {
        rows.push([
          e.category,
          e.project_name || '',
          (Number(e.amount) || 0).toFixed(2),
          ((Number(e.amount) || 0) * exchangeRate).toFixed(2),
          e.expense_date,
          e.notes || '',
        ]);
      });
      exportCSV(rows, `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`);
    });

    // ---------- Initial load ----------
    loadExpenses();
  }


  // ============================================================
  // SHARED: Expense modal
  // ============================================================
  function openExpenseModal(expense, onSuccess) {
    const modal = showModal(renderExpenseForm(expense, allProjects));

    // Quick template buttons inside the modal
    modal.element.querySelectorAll('.quick-expense').forEach((btn) => {
      btn.addEventListener('click', () => {
        const category  = btn.dataset.category;
        const vendor    = btn.dataset.vendor;
        const amountKsh = parseFloat(btn.dataset.amount) || 0;
        const amountUsd = amountKsh / exchangeRate;

        const catInput    = document.getElementById('expense-category');
        const vendorInput = document.getElementById('expense-vendor');
        const amountInput = document.getElementById('expense-amount');

        if (catInput)    catInput.value = category;
        if (vendorInput) vendorInput.value = vendor;
        if (amountInput) amountInput.value = amountUsd.toFixed(2);
      });
    });

    // Submit
    document.getElementById('expense-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (expense?.id) {
          await financeService.updateExpense(expense.id, data);
          showToast('Expense updated', 'success');
        } else {
          await financeService.createExpense(data);
          showToast('Expense added', 'success');
        }
        modal.close();
        onSuccess?.();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Cancel
    modal.element.querySelector('.cancel-expense-btn')?.addEventListener('click', modal.close);
  }


  // ============================================================
  // SHARED: Multi expense logic
  // ============================================================
  function attachMultiExpenseFormLogic(close, onSuccess) {
    const form    = document.getElementById('multiple-expense-form');
    const tbody   = document.getElementById('multi-expense-tbody');
    const totalEl = document.getElementById('multi-expense-total');
    const addRowBtn = document.getElementById('add-row-btn');

    const paymentMethods = ['Cash', 'M-Pesa', 'Bank Transfer', 'PayPal', 'Card', 'Other'];
    const categories     = ['Hosting', 'Domain', 'SSL Certificate', 'Maintenance', 'Marketing', 'Software Licenses', 'Other'];

    function updateTotal() {
      let total = 0;
      tbody.querySelectorAll('.expense-amount').forEach((input) => {
        total += parseFloat(input.value) || 0;
      });
      // FIX: USD — the input values are in USD
      totalEl.textContent = format.usd(total);
    }

    function buildRow(index) {
      const row = document.createElement('tr');
      row.className = 'expense-row';
      row.dataset.index = String(index);
      row.innerHTML = `
        <td>
          <select name="category_${index}" class="form-control">
            ${categories.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </td>
        <td><input type="text" name="vendor_${index}" class="form-control" placeholder="Vendor"></td>
        <td><input type="number" name="amount_${index}" class="form-control expense-amount" step="0.01" placeholder="0.00"></td>
        <td>
          <select name="payment_method_${index}" class="form-control">
            ${paymentMethods.map((m) => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </td>
        <td>
          <button type="button" class="btn btn-sm btn-danger remove-row-btn" aria-label="Remove row">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      return row;
    }

    tbody.addEventListener('input', updateTotal);

    addRowBtn.addEventListener('click', () => {
      tbody.appendChild(buildRow(Date.now()));
      updateTotal();
    });

    tbody.addEventListener('click', (e) => {
      if (e.target.closest('.remove-row-btn')) {
        e.target.closest('tr')?.remove();
        updateTotal();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const projectId = document.getElementById('multi-expense-project').value;
      const date      = document.getElementById('multi-expense-date').value;

      if (!projectId) {
        showToast('Please select a project.', 'error');
        return;
      }

      const rows = tbody.querySelectorAll('.expense-row');
      const toCreate = [];

      rows.forEach((row) => {
        const idx      = row.dataset.index;
        const category = row.querySelector(`[name="category_${idx}"]`)?.value;
        const vendor   = row.querySelector(`[name="vendor_${idx}"]`)?.value;
        const amount   = parseFloat(row.querySelector(`[name="amount_${idx}"]`)?.value);
        const method   = row.querySelector(`[name="payment_method_${idx}"]`)?.value;

        if (amount > 0 && category) {
          toCreate.push({
            project_id: projectId,
            category,
            vendor,
            amount,
            payment_method: method,
            expense_date: date,
          });
        }
      });

      if (toCreate.length === 0) {
        showToast('Please enter at least one expense amount.', 'error');
        return;
      }

      try {
        await Promise.all(toCreate.map((exp) => financeService.createExpense(exp)));
        close();
        showToast(`${toCreate.length} expenses added`, 'success');
        onSuccess?.();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Initial total
    updateTotal();
    document.querySelector('.cancel-multi-expense-btn')?.addEventListener('click', close);
  }


  // ============================================================
  // SECTION SWITCHING
  // ============================================================
  function switchSection(section) {
    activeSection = section;

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = section === 'revenue' ? 'Revenue' : 'Expenses';

    if (section === 'revenue') {
      renderRevenueSection();
    } else {
      renderExpenseSection();
    }
  }


  // ============================================================
  // EXCHANGE RATE EDITOR
  // ============================================================
  document.getElementById('edit-rate-btn').addEventListener('click', () => {
    const modal = showModal(`
      <div class="modal-body">
        <h3>Update Exchange Rate</h3>
        <div class="form-group" style="margin-top:1rem;">
          <label for="new-rate-input">1 USD = KSh</label>
          <input type="number" id="new-rate-input" value="${exchangeRate}" step="1" min="1" required>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
          <button type="button" class="btn btn-outline" id="cancel-rate-btn">Cancel</button>
          <button type="button" class="btn btn-primary" id="save-rate-btn">Save</button>
        </div>
      </div>
    `);

    modal.element.querySelector('#cancel-rate-btn')?.addEventListener('click', modal.close);

    modal.element.querySelector('#save-rate-btn')?.addEventListener('click', async () => {
      const newRate = parseFloat(document.getElementById('new-rate-input').value);
      if (!newRate || newRate <= 0) {
        showToast('Please enter a valid rate.', 'error');
        return;
      }

      try {
        await dashboardService.updatePreferences({ exchange_rate: newRate });
        exchangeRate = newRate;
        updateRateBadge();
        modal.close();
        showToast('Exchange rate updated', 'success');
        switchSection(activeSection);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });


  // ============================================================
  // CLEANUP
  // ============================================================
  registerCleanup(() => {
    // Destroy chart instances BEFORE removing their canvases
    destroyAllSalesCharts();

    // Clear the section container to detach all listeners
    const container = document.getElementById('finance-section-container');
    if (container) container.innerHTML = '';
  });


  // ============================================================
  // INITIAL LOAD
  // ============================================================
  await loadExchangeRate();
  await loadProjects();
  switchSection(activeSection);
}
