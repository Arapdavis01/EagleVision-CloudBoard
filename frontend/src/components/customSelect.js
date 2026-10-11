// ============================================================
// EAGLEVISION CLOUDBOARD — CUSTOM SELECT
// ============================================================
// Replaces native <select> with a styled dropdown.
//
// Features:
//   • Consistent rendering across browsers
//   • Keyboard navigation (↑ ↓ Enter Esc Home End)
//   • ARIA attributes for screen readers
//   • Icons via <option data-icon="fa-code">
//   • Dispatches native 'change' + 'input' events
//   • Delegated document listeners (no per-instance leaks)
//   • Idempotent — safe to call multiple times
//
// Usage:
//   import { initCustomSelects } from '../../components/customSelect.js';
//   initCustomSelects();           // whole document
//   initCustomSelects(modalElement); // just inside a modal
// ============================================================

import { escapeHtml } from '../utils/dom.js';


// ============================================================
// STATE
// ============================================================
// Track all open wrappers so we can close on outside-click.
const openWrappers = new Set();


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Convert every un-converted <select> inside `container`.
 * Idempotent — safe to call repeatedly.
 */
export function initCustomSelects(container = document) {
  const selects = container.querySelectorAll('select:not([data-customized])');
  selects.forEach(createCustomSelect);
}


/**
 * Optional teardown for a container (e.g., before re-rendering).
 * Removes all custom selects and restores originals.
 */
export function destroyCustomSelects(container = document) {
  container.querySelectorAll('.custom-select').forEach((wrapper) => {
    const select = wrapper.__evSelect;
    if (select) {
      // Restore original visibility
      select.style.position = '';
      select.style.opacity  = '';
      select.style.pointerEvents = '';
      select.style.width    = '';
      select.style.height   = '';
      delete select.dataset.customized;
    }
    wrapper.remove();
  });
}


// ============================================================
// CREATE
// ============================================================

function createCustomSelect(select) {
  if (select.dataset.customized) return;
  select.dataset.customized = 'true';

  // ---------- Hide original select ----------
  select.style.position      = 'absolute';
  select.style.opacity       = '0';
  select.style.pointerEvents = 'none';
  select.style.width         = '1px';
  select.style.height        = '1px';
  select.style.margin        = '0';
  select.style.padding       = '0';
  select.setAttribute('tabindex', '-1');
  select.setAttribute('aria-hidden', 'true');

  // ---------- Build wrapper ----------
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  wrapper.__evSelect = select;   // back-reference for teardown

  // ---------- Trigger button ----------
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const valueSpan = document.createElement('span');
  valueSpan.className = 'custom-select-value';

  const arrow = document.createElement('i');
  arrow.className = 'fas fa-chevron-down custom-select-arrow';

  trigger.append(valueSpan, arrow);

  // ---------- Menu ----------
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  // ---------- Populate options ----------
  const options = Array.from(select.options);
  let selectedIndex = select.selectedIndex;

  if (options.length === 0) {
    menu.innerHTML = '<div class="custom-select-empty">No options</div>';
  } else {
    options.forEach((opt, idx) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'custom-select-option';
      optionEl.setAttribute('role', 'option');
      optionEl.setAttribute('data-index', String(idx));
      optionEl.id = `cs-opt-${Math.random().toString(36).slice(2, 8)}`;

      const label = opt.textContent.trim();
      const iconClass = opt.dataset.icon;

      optionEl.innerHTML = `
        ${iconClass ? `<i class="fas ${escapeHtml(iconClass)}"></i>` : ''}
        <span>${escapeHtml(label)}</span>
      `;

      if (opt.disabled) {
        optionEl.style.opacity = '0.4';
        optionEl.style.pointerEvents = 'none';
        optionEl.setAttribute('aria-disabled', 'true');
      }

      if (opt.selected) {
        optionEl.classList.add('selected');
        optionEl.setAttribute('aria-selected', 'true');
        updateTriggerValue(valueSpan, label, iconClass, !opt.value);
      }

      optionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opt.disabled) return;
        selectOption(idx);
      });

      menu.appendChild(optionEl);
    });
  }

  wrapper.append(trigger, menu);

  // Insert wrapper right after the original select
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  // ---------- State ----------
  let isOpen = false;
  let highlightedIndex = -1;

  // ---------- Open / close ----------
  function openMenu() {
    if (isOpen) return;
    isOpen = true;

    // Close every other open custom select
    openWrappers.forEach((w) => {
      if (w !== wrapper) closeWrapper(w);
    });

    wrapper.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    openWrappers.add(wrapper);

    // Position: flip upward if not enough room below
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

    // Scroll selected into view + set ARIA
    const selected = menu.querySelector('.custom-select-option.selected');
    if (selected) {
      selectedIndex = Number(selected.dataset.index);
      setHighlighted(selectedIndex);
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
    openWrappers.delete(wrapper);
    menu.removeAttribute('aria-activedescendant');
  }

  // ---------- Selection ----------
  function selectOption(index) {
    const opt = select.options[index];
    if (!opt) return;

    select.selectedIndex = index;
    selectedIndex = index;

    // Update visual
    menu.querySelectorAll('.custom-select-option').forEach((el) => {
      el.classList.remove('selected');
      el.removeAttribute('aria-selected');
    });

    const target = menu.querySelector(`.custom-select-option[data-index="${index}"]`);
    if (target) {
      target.classList.add('selected');
      target.setAttribute('aria-selected', 'true');
    }

    const label = opt.textContent.trim();
    const iconClass = opt.dataset.icon;
    updateTriggerValue(valueSpan, label, iconClass, !opt.value);

    // Notify listeners
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input',  { bubbles: true }));

    closeMenu();
  }

  // ---------- Highlight (for keyboard) ----------
  function setHighlighted(index) {
    const all = menu.querySelectorAll('.custom-select-option');
    all.forEach((el) => el.classList.remove('highlighted'));
    const target = menu.querySelector(`.custom-select-option[data-index="${index}"]`);
    if (target) {
      target.classList.add('highlighted');
      menu.setAttribute('aria-activedescendant', target.id);
      target.scrollIntoView({ block: 'nearest' });
    }
    highlightedIndex = index;
  }

  // ---------- Trigger events ----------
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeMenu() : openMenu();
  });

  // Keyboard on trigger
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) openMenu();

      const total = select.options.length;
      let next = highlightedIndex;
      if (e.key === 'ArrowDown') next = (next + 1) % total;
      if (e.key === 'ArrowUp')   next = (next - 1 + total) % total;
      setHighlighted(next);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        openMenu();
      } else if (highlightedIndex >= 0) {
        selectOption(highlightedIndex);
      }
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeMenu();
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setHighlighted(0);
    }
    if (e.key === 'End') {
      e.preventDefault();
      setHighlighted(select.options.length - 1);
    }
  });

  // ---------- External change sync ----------
  // If JS sets select.value programmatically, refresh UI.
  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    if (!opt) return;
    const label = opt.textContent.trim();
    const iconClass = opt.dataset.icon;
    updateTriggerValue(valueSpan, label, iconClass, !opt.value);

    menu.querySelectorAll('.custom-select-option').forEach((el) => {
      el.classList.remove('selected');
      el.removeAttribute('aria-selected');
    });

    const target = menu.querySelector(`.custom-select-option[data-index="${select.selectedIndex}"]`);
    if (target) {
      target.classList.add('selected');
      target.setAttribute('aria-selected', 'true');
    }
  });
}


// ============================================================
// HELPERS
// ============================================================

function updateTriggerValue(span, label, iconClass, isPlaceholder) {
  span.innerHTML = `
    ${iconClass ? `<i class="fas ${escapeHtml(iconClass)}"></i>` : ''}
    <span>${escapeHtml(label)}</span>
  `;
  span.classList.toggle('placeholder', !!isPlaceholder);
}

function closeWrapper(wrapper) {
  wrapper.classList.remove('open');
  openWrappers.delete(wrapper);
  const trigger = wrapper.querySelector('.custom-select-trigger');
  trigger?.setAttribute('aria-expanded', 'false');
}


// ============================================================
// DELEGATED DOCUMENT LISTENERS — installed ONCE
// ============================================================

if (typeof document !== 'undefined') {
  // Outside click closes every open wrapper
  document.addEventListener('click', (e) => {
    openWrappers.forEach((wrapper) => {
      if (!wrapper.contains(e.target)) closeWrapper(wrapper);
    });
  });

  // ESC closes the topmost open wrapper
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Close the last one added (topmost in DOM order)
    const last = Array.from(openWrappers).pop();
    if (!last) return;
    closeWrapper(last);
    last.querySelector('.custom-select-trigger')?.focus();
  });
}
