/**
 * Custom Select — Replaces native <select> with a styled dropdown
 * ───────────────────────────────────────────────────────────────
 * Automatically finds every <select> in a container and replaces it
 * with a modern custom dropdown that:
 *   • Renders consistently across all browsers
 *   • Has a dark theme-friendly menu
 *   • Supports options with icons
 *   • Fires 'change' events on the original <select>
 *
 * Usage:
 *   import { initCustomSelects } from '../../components/customSelect.js';
 *   // After rendering a page:
 *   initCustomSelects();
 */

export function initCustomSelects(container = document) {
  const selects = container.querySelectorAll('select:not([data-customized])');

  selects.forEach((select) => {
    createCustomSelect(select);
  });
}

function createCustomSelect(select) {
  // Skip hidden or empty selects
  if (select.dataset.customized) return;
  select.dataset.customized = 'true';

  // Hide the original select but keep it for form submission
  select.style.position = 'absolute';
  select.style.opacity = '0';
  select.style.pointerEvents = 'none';
  select.style.width = '0';
  select.style.height = '0';

  // ---------- Build wrapper ----------
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  // ---------- Build trigger ----------
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const valueSpan = document.createElement('span');
  valueSpan.className = 'custom-select-value';

  const arrow = document.createElement('i');
  arrow.className = 'fas fa-chevron-down custom-select-arrow';

  trigger.appendChild(valueSpan);
  trigger.appendChild(arrow);

  // ---------- Build menu ----------
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  // ---------- Populate options ----------
  const options = Array.from(select.options);

  if (options.length === 0) {
    menu.innerHTML = `<div class="custom-select-empty">No options</div>`;
  } else {
    options.forEach((opt) => {
      // Skip if optgroup option is disabled
      const optionEl = document.createElement('div');
      optionEl.className = 'custom-select-option';
      optionEl.setAttribute('role', 'option');

      const value = opt.value;
      const label = opt.textContent.trim();

      // Support icons via data-icon attribute: <option data-icon="fa-code" value="...">...</option>
      const iconClass = opt.dataset.icon;

      optionEl.innerHTML = `
        ${iconClass ? `<i class="fas ${iconClass}"></i>` : ''}
        <span>${escapeHtml(label)}</span>
      `;

      if (opt.selected) {
        optionEl.classList.add('selected');
        updateTriggerValue(valueSpan, label, iconClass, false);
      }
      if (opt.disabled) {
        optionEl.style.opacity = '0.4';
        optionEl.style.pointerEvents = 'none';
      }

      optionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectOption(value, label, iconClass);
      });

      menu.appendChild(optionEl);
    });
  }

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  // ---------- Insert wrapper after the original select ----------
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  // ---------- State ----------
  let isOpen = false;

  function openMenu() {
    if (isOpen) return;
    isOpen = true;

    // Close any other open custom selects
    document.querySelectorAll('.custom-select.open').forEach((el) => {
      if (el !== wrapper) el.classList.remove('open');
    });

    wrapper.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');

    // Position: if menu would overflow bottom, flip upward
    const rect = trigger.getBoundingClientRect();
    const menuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      menu.style.top = 'auto';
      menu.style.bottom = 'calc(100% + 6px)';
    } else {
      menu.style.top = 'calc(100% + 6px)';
      menu.style.bottom = 'auto';
    }

    // Scroll selected option into view
    const selected = menu.querySelector('.custom-select-option.selected');
    if (selected) {
      setTimeout(() => {
        selected.scrollIntoView({ block: 'nearest' });
      }, 50);
    }
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    wrapper.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function selectOption(value, label, iconClass) {
    // Update the original <select>
    select.value = value;

    // Update visual selection
    menu.querySelectorAll('.custom-select-option').forEach((el) => {
      el.classList.remove('selected');
    });

    const matchingOption = Array.from(menu.querySelectorAll('.custom-select-option')).find(
      (el) => el.textContent.trim() === label
    );
    if (matchingOption) matchingOption.classList.add('selected');

    updateTriggerValue(valueSpan, label, iconClass, false);

    // Dispatch change event on the original select
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));

    closeMenu();
  }

  // ---------- Event listeners ----------
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeMenu() : openMenu();
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeMenu();
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
      trigger.focus();
    }
  });

  // ---------- Sync: if JS updates select.value, refresh UI ----------
  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    if (opt) {
      const label = opt.textContent.trim();
      const iconClass = opt.dataset.icon;
      updateTriggerValue(valueSpan, label, iconClass, false);
      menu.querySelectorAll('.custom-select-option').forEach((el) => {
        el.classList.remove('selected');
      });
      const matchingOption = Array.from(menu.querySelectorAll('.custom-select-option')).find(
        (el) => el.textContent.trim() === label
      );
      if (matchingOption) matchingOption.classList.add('selected');
    }
  });
}

// ---------- Helper: Update trigger text ----------
function updateTriggerValue(span, label, iconClass, isPlaceholder) {
  span.innerHTML = `
    ${iconClass ? `<i class="fas ${iconClass}"></i>` : ''}
    <span>${escapeHtml(label)}</span>
  `;
  span.classList.toggle('placeholder', !!isPlaceholder);
}

// ---------- Helper: Escape HTML ----------
function escapeHtml(str) {
  return str
    ? String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';
}
