// ---------------------------------------------------------------------------
// Loads the live catalogue from Supabase into the `products` list from
// data.js, so every page keeps using products/getProduct as before. If the
// database can't be reached quickly, the built-in list in data.js is used.
// ---------------------------------------------------------------------------

import { products } from './data.js';
import { supabase } from './supabase.js';

const TIMEOUT_MS = 4000;

export async function loadCatalog() {
  if (!supabase) return;
  const query = supabase
    .from('products')
    .select('id, name, desc, details, category, price, image, tag, stock')
    .eq('active', true)
    .order('sort')
    .order('created_at');
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve({ data: null }), TIMEOUT_MS),
  );
  try {
    const { data } = await Promise.race([query, timeout]);
    if (!Array.isArray(data) || !data.length) return;
    const live = data.map((p) => ({
      ...p,
      price: Number(p.price),
      tag: p.tag || undefined,
    }));
    products.splice(0, products.length, ...live);
  } catch {
    /* offline or blocked — keep the built-in list */
  }
}
