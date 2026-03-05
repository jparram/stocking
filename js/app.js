/**
 * Stocking – Grocery List App
 * Stores the list in localStorage so items persist across page refreshes.
 */

const STORAGE_KEY = 'stocking_items';

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────

/** @type {Array<{id: string, name: string, qty: number, category: string, checked: boolean}>} */
let items = [];

// ──────────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────────

const addForm           = document.getElementById('add-form');
const itemNameInput     = document.getElementById('item-name');
const itemQtyInput      = document.getElementById('item-qty');
const itemCategoryInput = document.getElementById('item-category');
const groceryList       = document.getElementById('grocery-list');
const emptyState        = document.getElementById('empty-state');
const summaryText       = document.getElementById('summary-text');
const filterCategory    = document.getElementById('filter-category');
const clearCheckedBtn   = document.getElementById('clear-checked-btn');
const clearAllBtn       = document.getElementById('clear-all-btn');

// ──────────────────────────────────────────────
// Persistence helpers
// ──────────────────────────────────────────────

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch (_) {
    items = [];
  }
}

// ──────────────────────────────────────────────
// Unique ID
// ──────────────────────────────────────────────

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ──────────────────────────────────────────────
// Rendering
// ──────────────────────────────────────────────

/** Return the list of unique categories currently in `items` */
function getCategories() {
  const set = new Set(items.map(i => i.category));
  return [...set].sort();
}

/** Rebuild the filter dropdown, preserving the currently selected value */
function rebuildFilterDropdown() {
  const current = filterCategory.value;
  // Remove all options except the first ("All categories")
  while (filterCategory.options.length > 1) {
    filterCategory.remove(1);
  }
  getCategories().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
  // Restore selection if it still exists
  if ([...filterCategory.options].some(o => o.value === current)) {
    filterCategory.value = current;
  } else {
    filterCategory.value = 'All';
  }
}

/** Create a single list-item element */
function createItemElement(item) {
  const li = document.createElement('li');
  li.className = 'grocery-item' + (item.checked ? ' checked' : '');
  li.dataset.id = item.id;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'item-checkbox';
  checkbox.checked = item.checked;
  checkbox.setAttribute('aria-label', `Mark ${item.name} as ${item.checked ? 'unchecked' : 'checked'}`);
  checkbox.addEventListener('change', () => toggleItem(item.id));

  // Info
  const info = document.createElement('div');
  info.className = 'item-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'item-name';
  nameEl.textContent = item.name;

  const metaEl = document.createElement('div');
  metaEl.className = 'item-meta';
  metaEl.textContent = `Qty: ${item.qty}  ·  ${item.category}`;

  info.appendChild(nameEl);
  info.appendChild(metaEl);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.setAttribute('aria-label', `Remove ${item.name}`);
  deleteBtn.addEventListener('click', () => removeItem(item.id));

  li.appendChild(checkbox);
  li.appendChild(info);
  li.appendChild(deleteBtn);

  return li;
}

/** Re-render the full list based on current state and filter */
function render() {
  const filterValue = filterCategory.value;

  const visible = filterValue === 'All'
    ? items
    : items.filter(i => i.category === filterValue);

  // Update list
  groceryList.innerHTML = '';
  visible.forEach(item => {
    groceryList.appendChild(createItemElement(item));
  });

  // Empty state
  if (visible.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Summary
  const total   = visible.length;
  const checked = visible.filter(i => i.checked).length;
  summaryText.textContent =
    total === 0
      ? '0 items'
      : `${checked} of ${total} item${total !== 1 ? 's' : ''} checked`;

  // Rebuild filter dropdown
  rebuildFilterDropdown();
}

// ──────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────

function addItem(name, qty, category) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const item = {
    id: generateId(),
    name: trimmed,
    qty: Math.max(1, parseInt(qty, 10) || 1),
    category: category || 'General',
    checked: false,
  };

  items.unshift(item); // newest items appear at the top
  saveItems();
  render();
}

function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.checked = !item.checked;
  saveItems();
  render();
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

function clearChecked() {
  const count = items.filter(i => i.checked).length;
  if (count === 0) return;
  if (!confirm(`Remove ${count} checked item${count !== 1 ? 's' : ''}?`)) return;
  items = items.filter(i => !i.checked);
  saveItems();
  render();
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('Remove all items from the list?')) return;
  items = [];
  saveItems();
  render();
}

// ──────────────────────────────────────────────
// Event listeners
// ──────────────────────────────────────────────

addForm.addEventListener('submit', e => {
  e.preventDefault();
  addItem(itemNameInput.value, itemQtyInput.value, itemCategoryInput.value);
  itemNameInput.value = '';
  itemQtyInput.value  = '1';
  itemNameInput.focus();
});

clearCheckedBtn.addEventListener('click', clearChecked);
clearAllBtn.addEventListener('click', clearAll);
filterCategory.addEventListener('change', render);

// ──────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────

loadItems();
render();
