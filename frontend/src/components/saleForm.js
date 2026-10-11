// ============================================================
// EAGLEVISION CLOUDBOARD — SALE FORM
// ============================================================
// Renders the "Record Sale" form used inside a modal.
//
// Usage:
//   renderSaleForm(projects)   → form HTML
//
// Notes:
//   • Default sale_date uses the user's LOCAL date (not UTC)
//   • All attribute values escaped via shared utils
// ============================================================

import { escapeHtml, escapeAttr } from '../utils/dom.js';


// ============================================================
// CONSTANTS
// ============================================================
const PAYMENT_METHODS = [
  'Cash',
  'M-Pesa',
  'Bank Transfer',
  'PayPal',
  'Other',
];


// ============================================================
// HELPERS
// ============================================================

/**
 * Return today's date as YYYY-MM-DD in the user's LOCAL timezone.
 * (Avoids the UTC off-by-one issue that ships with toISOString.)
 */
function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


// ============================================================
// RENDER
// ============================================================
export function renderSaleForm(projects = []) {
  const projectOptions = Array.isArray(projects) && projects.length > 0
    ? projects
        .map((p) => `
          <option value="${escapeAttr(p.id)}">${escapeHtml(p.name)}</option>
        `)
        .join('')
    : '';

  const paymentOptions = PAYMENT_METHODS
    .map((m) => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`)
    .join('');

  return `
    <div class="project-form-wrapper">

      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="fas fa-receipt"></i>
        </div>
        <div class="form-header-text">
          <h2>Record Sale</h2>
          <p>Log a new payment received from a client</p>
        </div>
      </div>

      <form id="sale-form" class="modern-form" autocomplete="off" novalidate>

        <div class="form-row">
          <div class="form-group">
            <label for="sale-project">
              <i class="fas fa-folder-open"></i> Project <span class="required">*</span>
            </label>
            <select id="sale-project" name="project_id" required>
              <option value="">-- Select --</option>
              ${projectOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="sale-amount">
              <i class="fas fa-dollar-sign"></i> Amount ($) <span class="required">*</span>
            </label>
            <input
              type="number"
              id="sale-amount"
              name="amount"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="sale-date">
              <i class="fas fa-calendar-alt"></i> Sale Date
            </label>
            <input
              type="date"
              id="sale-date"
              name="sale_date"
              value="${escapeAttr(todayLocalISO())}"
              required
            >
          </div>
          <div class="form-group">
            <label for="sale-payment-method">
              <i class="fas fa-credit-card"></i> Payment Method
            </label>
            <select id="sale-payment-method" name="payment_method">
              ${paymentOptions}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="sale-notes">
            <i class="fas fa-sticky-note"></i> Notes
          </label>
          <textarea
            id="sale-notes"
            name="notes"
            rows="2"
            placeholder="Optional notes..."
          ></textarea>
        </div>

        <div class="form-actions-sticky">
          <button type="button" class="btn btn-outline cancel-sale-btn">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Record
          </button>
        </div>

      </form>
    </div>
  `;
}
