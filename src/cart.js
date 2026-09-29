// ---------------------------------------------------------------------------
// Cart state. Stored in the browser (localStorage) so it survives page moves.
// ---------------------------------------------------------------------------

import { getProduct } from './data.js';

const STORAGE_KEY = 'wishes-cart-v1';
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item.id),
        qty: Math.max(1, Math.min(99, Number(item.qty) || 1)),
      }))
      .filter((item) => getProduct(item.id));
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private mode or blocked storage — the cart still works for this page */
  }
  listeners.forEach((fn) => fn(items));
}

export function getItems() {
  return read();
}

/** Cart lines joined with their product, ready to render. */
export function getLines() {
  return read().map((item) => {
    const product = getProduct(item.id);
    return { product, qty: item.qty, total: product.price * item.qty };
  });
}

export function addItem(id, qty = 1) {
  if (!getProduct(id)) return;
  const items = read();
  const existing = items.find((item) => item.id === id);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + qty);
  } else {
    items.push({ id, qty: Math.max(1, Math.min(99, qty)) });
  }
  write(items);
}

export function setQty(id, qty) {
  const next = Math.max(1, Math.min(99, Number(qty) || 1));
  const items = read().map((item) =>
    item.id === id ? { ...item, qty: next } : item,
  );
  write(items);
}

export function removeItem(id) {
  write(read().filter((item) => item.id !== id));
}

export function clear() {
  write([]);
}

export function count() {
  return read().reduce((sum, item) => sum + item.qty, 0);
}

export function subtotal() {
  return getLines().reduce((sum, line) => sum + line.total, 0);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(read());
  return () => listeners.delete(fn);
}

// Keep other open tabs of the site in sync.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) listeners.forEach((fn) => fn(read()));
});
