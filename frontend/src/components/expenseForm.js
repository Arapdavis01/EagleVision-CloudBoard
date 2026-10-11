// ============================================================
// EAGLEVISION CLOUDBOARD — EXPENSE FORMS
// ============================================================
// Two forms in one file:
//   1. renderExpenseForm(expense, projects)
//      → single-expense form (used in finance page)
//   2. renderMultipleExpenseForm(projects, exchangeRate)
//      → multi-row form for recording several expenses at once
//
// Notes:
//   • Default dates use LOCAL time, not UTC (fixes Nairobi drift)
//   • Category options are de-duplicated in the multi-row form
//   • All attribute values escaped via shared utils
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';


// ============================================================
// CONSTANTS
// ============================================================
const EXPENSE_CATEGORIES = [
  'Domain',
  'Hosting',
  'SSL Certificate',
  'Maintenance',
  'Marketing',
  'Software Licenses',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'M-Pesa',
  'Bank Transfer',
  'PayPal',
  'Card',
  'Other',
];

// Quick-add presets (amounts in KES, converted via exchangeRate)
const QUICK_EXPENSES = [
  { category: 'Domain',          vendor: 'GoDaddy',        amountKsh: 1000 },
  { category: 'Hosting',         vendor: 'Render',         amountKsh: 500  },
  { category: 'SSL Certificate', vendor: 'SSL Provider',   amountKsh: 2500 },
  { category: 'Maintenance',     vendor: 'Maintenance',    amountKsh: 1500 },
];


// ============================================================
// HELPERS
// ============================================================
function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameId(a, b) {
  if (a === null || a === undefined || a === '') return false;
  if (b === null || b === undefined || b === '') return false;
  return String(a) === String(b);
}

function buildCategoryOptions(selected) {
  return EXPENSE_CATEGORIES.map((c) => `
    <option value="${escapeAttr(c)}" ${c === selected ? 'selected' : ''}>
      ${escapeHtml(c)}
    </option>
  `).join('');
}

function buildPaymentOptions(selected) {
  return PAYMENT_METHODS.map((m) => `
    <option value="${escapeAttr(m)}" ${m === selected ? 'selected' : ''}>
      ${escapeHtml(m)}
    </option>
  `).join('');
}


// ============================================================
// 1. SINGLE EXPENSE FORM
// ============================================================
export function renderExpenseForm(expense = {}, projects = []) {
  const isEdit = Boolean(expense.id);

  const projectOptions = Array.isArray(projects) && projects.length > 0
    ? projects.map((p) => `
        <option
          value="${escapeAttr(p.id)}"
          ${isSameId(expense.project_id, p.id) ? 'selected' : ''}
        >
          ${escapeHtml(p.name)}
        </option>
      `).join('')
    : '';

  const quickButtons = QUICK_EXPENSES.map((q) => `
    <button
      type="button"
      class="btn btn-sm btn-outline quick-expense"
      data-category="${escapeAttr(q.category)}"
      data-amount="${escapeAttr(q.amountKsh)}"
      data-vendor="${escapeAttr(q.vendor)}"
    >
      ${escapeHtml(q.category)} (KSh ${q.amountKsh.toLocaleString()})
    </button>
  `).join('');

  return `
    <div class="project-form-wrapper">

      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="fas fa-${isEdit ? 'pen' : 'wallet'}"></i>
        </div>
        <div class="form-header-text">
          <h2>${isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <p>${isEdit ? 'Update this expense record' : 'Log a new business expense'}</p>
        </div>
      </div>

      <form id="expense-form" class="modern-form" autocomplete="off" novalidate>
        <input type="hidden" name="id" value="${escapeAttr(expense.id || '')}">

        <!-- Project link (optional) -->
        <div class="form-group">
          <label for="expense-project">
            <i class="fas fa-folder-open"></i> Project
          </label>
          <select id="expense-project" name="project_id">
            <option value="">-- General Expense (no project) --</option>
            ${projectOptions}
          </select>
        </div>

        <!-- Quick expense templates -->
        <div class="expense-templates">
          <span class="templates-label">
            <i class="fas fa-bolt"></i> Quick Add:
          </span>
          ${quickButtons}
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="expense-vendor">
              <i class="fas fa-store"></i> Vendor / Provider
            </label>
            <input
              type="text"
              id="expense-vendor"
              name="vendor"
              value="${escapeAttr(expense.vendor)}"
              placeholder="e.g., GoDaddy, Render"
            >
          </div>
          <div class="form-group">
            <label for="expense-category">
              <i class="fas fa-tags"></i> Category <span class="required">*</span>
            </label>
            <select id="expense-category" name="category" required>
              ${buildCategoryOptions(expense.category)}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="expense-amount">
              <i class="fas fa-dollar-sign"></i> Amount ($) <span class="required">*</span>
            </label>
            <input
              type="number"
              id="expense-amount"
              name="amount"
              step="0.01"
              min="0.01"
              value="${escapeAttr(expense.amount)}"
              required
              placeholder="0.00"
            >
          </div>
          <div class="form-group">
            <label for="expense-date">
              <i class="fas fa-calendar-alt"></i> Date
            </label>
            <input
              type="date"
              id="expense-date"
              name="expense_date"
              value="${escapeAttr(expense.expense_date || todayLocalISO())}"
              required
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="expense-payment-method">
              <i class="fas fa-credit-card"></i> Payment Method
            </label>
            <select id="expense-payment-method" name="payment_method">
              ${buildPaymentOptions(expense.payment_method)}
            </select>
          </div>
          <div class="form-group">
            <label for="expense-reference">
              <i class="fas fa-receipt"></i> Reference / Invoice No.
            </label>
            <input
              type="text"
              id="expense-reference"
              name="reference"
              value="${escapeAttr(expense.reference)}"
              placeholder="e.g., INV-1234"
            >
          </div>
        </div>

        <div class="form-group">
          <label for="expense-notes">
            <i class="fas fa-sticky-note"></i> Notes
          </label>
          <textarea
            id="expense-notes"
            name="notes"
            rows="2"
            placeholder="Optional notes..."
          >${escapeHtml(expense.notes)}</textarea>
        </div>

        <div class="form-actions-sticky">
          <button type="button" class="btn btn-outline cancel-expense-btn">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Save
          </button>
        </div>

      </form>
    </div>
  `;
}


// ============================================================
// 2. MULTIPLE EXPENSE FORM
// ============================================================
export function renderMultipleExpenseForm(projects = [], exchangeRate = 129) {
  const rate = Number(exchangeRate) || 129;

  const projectOptions = Array.isArray(projects) && projects.length > 0
    ? projects.map((p) => `
        <option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>
      `).join('')
    : '';

  const defaultRows = QUICK_EXPENSES.map((row, index) => {
    const amountUsd = (row.amountKsh / rate).toFixed(2);

    return `
      <tr class="expense-row" data-index="${index}">
        <td>
          <select name="category_${index}" class="form-control">
            ${buildCategoryOptions(row.category)}
          </select>
        </td>
        <td>
          <input
            type="text"
            name="vendor_${index}"
            class="form-control"
            value="${escapeAttr(row.vendor)}"
            placeholder="Vendor"
          >
        </td>
        <td>
          <input
            type="number"
            name="amount_${index}"
            class="form-control expense-amount"
            step="0.01"
            min="0"
            value="${escapeAttr(amountUsd)}"
            placeholder="0.00"
          >
        </td>
        <td>
          <select name="payment_method_${index}" class="form-control">
            ${buildPaymentOptions('Cash')}
          </select>
        </td>
        <td>
          <button
            type="button"
            class="btn btn-sm btn-danger remove-row-btn"
            aria-label="Remove row"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="project-form-wrapper">

      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="fas fa-list"></i>
        </div>
        <div class="form-header-text">
          <h2>Record Multiple Expenses</h2>
          <p>Add several expenses to a project in one go</p>
        </div>
      </div>

      <form id="multiple-expense-form" class="modern-form" autocomplete="off" novalidate>

        <div class="form-row">
          <div class="form-group">
            <label for="multi-expense-project">
              <i class="fas fa-folder-open"></i> Project <span class="required">*</span>
            </label>
            <select id="multi-expense-project" name="project_id" required>
              <option value="">-- Select Project --</option>
              ${projectOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="multi-expense-date">
              <i class="fas fa-calendar-alt"></i> Expense Date
            </label>
            <input
              type="date"
              id="multi-expense-date"
              name="expense_date"
              value="${escapeAttr(todayLocalISO())}"
              required
            >
          </div>
        </div>

        <div class="table-container" style="margin-bottom:1rem;">
          <table class="summary-table multi-expense-table" id="multi-expense-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Vendor / Provider</th>
                <th>Amount ($)</th>
                <th>Payment Method</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="multi-expense-tbody">
              ${defaultRows}
            </tbody>
          </table>
        </div>

        <div class="multi-expense-footer">
          <button type="button" id="add-row-btn" class="btn btn-outline btn-sm">
            <i class="fas fa-plus"></i> Add Row
          </button>
          <div class="multi-total">
            <strong>Total:</strong> <span id="multi-expense-total">$0.00</span>
          </div>
        </div>

        <div class="form-actions-sticky">
          <button type="button" class="btn btn-outline cancel-multi-expense-btn">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Save All
          </button>
        </div>

      </form>
    </div>
  `;
}
