// ============================================================
// EAGLEVISION CLOUDBOARD — INVOICE PREVIEW
// ============================================================
// Renders a printable invoice preview inside a modal.
//
// Usage:
//   import { renderInvoicePreview } from '../components/invoicePreview.js';
//   showModal(renderInvoicePreview(sale));
//
// Notes:
//   • All user data is escaped (no XSS)
//   • Amount uses format.usd() for consistent formatting
//   • Date uses format.date() for consistent formatting
//   • The print button is wired up by the caller (finance.js)
//     OR the caller can call bindInvoicePreview(modalElement)
// ============================================================

import { escapeHtml } from '../utils/dom.js';
import { format }     from '../utils/format.js';


// ============================================================
// RENDER
// ============================================================
export function renderInvoicePreview(sale = {}) {
  const amount = Number(sale.amount) || 0;
  const notes  = sale.notes ? String(sale.notes) : '';

  return `
    <div id="invoice-print" class="invoice-preview">

      <div class="invoice-header">
        <h2><i class="fas fa-file-invoice"></i> Invoice</h2>
        ${sale.id ? `<span class="invoice-ref">#${escapeHtml(sale.id)}</span>` : ''}
      </div>

      <dl class="invoice-details">
        <div class="invoice-row">
          <dt>Project</dt>
          <dd>${escapeHtml(sale.project_name) || '—'}</dd>
        </div>

        <div class="invoice-row">
          <dt>Client</dt>
          <dd>${escapeHtml(sale.client) || '—'}</dd>
        </div>

        <div class="invoice-row">
          <dt>Amount</dt>
          <dd class="invoice-amount">${format.usd(amount)}</dd>
        </div>

        <div class="invoice-row">
          <dt>Date</dt>
          <dd>${format.date(sale.sale_date)}</dd>
        </div>

        ${sale.payment_method ? `
          <div class="invoice-row">
            <dt>Payment Method</dt>
            <dd>${escapeHtml(sale.payment_method)}</dd>
          </div>
        ` : ''}

        ${notes ? `
          <div class="invoice-row invoice-row-block">
            <dt>Notes</dt>
            <dd>${escapeHtml(notes)}</dd>
          </div>
        ` : ''}
      </dl>

      <div class="invoice-actions">
        <button type="button" class="btn btn-outline invoice-print-btn">
          <i class="fas fa-print"></i> Print
        </button>
      </div>
    </div>
  `;
}


// ============================================================
// OPTIONAL: wire up the print button + open the print dialog
// ============================================================
/**
 * Attach a print handler to the button inside a rendered invoice.
 * Safe to call multiple times (idempotent within a modal).
 *
 * @param {HTMLElement} root  The modal element (or any ancestor)
 */
export function bindInvoicePreview(root) {
  if (!root) return;

  const btn = root.querySelector('.invoice-print-btn');
  if (!btn || btn.dataset.bound === '1') return;

  btn.dataset.bound = '1';

  btn.addEventListener('click', () => {
    printInvoice(root);
  });
}


// ============================================================
// INTERNAL: print just the invoice
// ============================================================
function printInvoice(root) {
  const invoice = root.querySelector('#invoice-print');
  if (!invoice) return;

  // Open a lightweight print window with just the invoice HTML
  const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=600');
  if (!win) {
    // Pop-up blocked — fall back to window.print() on the current page
    window.print();
    return;
  }

  const styles = `
    body { font-family: 'Inter', system-ui, sans-serif; padding: 32px; color: #0F172A; }
    h2 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; margin: 0 0 4px; }
    .invoice-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #16A34A; padding-bottom: 16px; }
    .invoice-ref { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #8A94A6; }
    .invoice-details { display: flex; flex-direction: column; gap: 12px; margin: 0; }
    .invoice-row { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
    .invoice-row-block { flex-direction: column; align-items: flex-start; }
    .invoice-row dt { font-weight: 600; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }
    .invoice-row dd { margin: 0; font-size: 14px; }
    .invoice-amount { font-weight: 700; color: #16A34A; font-size: 18px; }
    .invoice-actions { display: none; }
  `;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice</title>
        <style>${styles}</style>
      </head>
      <body>${invoice.outerHTML}</body>
    </html>
  `);
  win.document.close();

  // Wait for fonts/render, then trigger print
  win.focus();
  setTimeout(() => {
    win.print();
  }, 200);
}
