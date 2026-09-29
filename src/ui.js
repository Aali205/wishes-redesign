// ---------------------------------------------------------------------------
// Product cards and the quantity steppers used on the products, product and
// cart pages.
// ---------------------------------------------------------------------------

import {
  CATEGORY_LABELS,
  esc,
  formatPrice,
  getProduct,
  isSoldOut,
} from './data.js';
import * as cart from './cart.js';
import { toast } from './layout.js';
import { flyToCart } from './motion.js';

export function qtyStepper(value = 1, name = 'الكمية') {
  return `
      <div class="qty" data-qty>
        <button type="button" class="qty-btn" data-step="-1" aria-label="إنقاص ${name}">−</button>
        <input class="qty-input" type="number" inputmode="numeric" min="1" max="99" value="${value}" aria-label="${name}" data-qty-input />
        <button type="button" class="qty-btn" data-step="1" aria-label="زيادة ${name}">+</button>
      </div>`;
}

/** The corner badge: "sold out" wins over the product's own tag. */
export function tagMarkup(product) {
  if (isSoldOut(product)) {
    return '<span class="product-tag is-sold-out">نفدت الكمية</span>';
  }
  return product.tag ? `<span class="product-tag">${esc(product.tag)}</span>` : '';
}

export function productCard(product, index = 0) {
  const href = `./product.html?id=${encodeURIComponent(product.id)}`;
  return `
      <article class="product${isSoldOut(product) ? ' is-sold-out' : ''}" style="animation-delay:${index * 60}ms">
        <a class="product-media" href="${href}">
          ${tagMarkup(product)}
          <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" decoding="async" />
        </a>
        <div class="product-body">
          <span class="product-cat">${CATEGORY_LABELS[product.category]}</span>
          <h3><a href="${href}">${esc(product.name)}</a></h3>
          <p>${esc(product.desc)}</p>
          <span class="product-price">${formatPrice(product.price)}</span>
          <div class="product-actions">
            ${
              isSoldOut(product)
                ? '<button type="button" class="btn btn-ghost" disabled>نفدت الكمية</button>'
                : `${qtyStepper()}
            <button type="button" class="btn btn-primary" data-add="${esc(product.id)}">أضيفي إلى السلة</button>`
            }
          </div>
        </div>
      </article>`;
}

/** One full-width product in the homepage's horizontal showcase. */
export function showcaseSlide(product, index, total) {
  const href = `./product.html?id=${encodeURIComponent(product.id)}`;
  const num = String(index + 1).padStart(2, '0');
  return `
      <article class="showcase-slide" data-slide="${index}" aria-roledescription="slide" aria-label="${index + 1} من ${total}">
        <div class="showcase-body">
          <span class="showcase-num" aria-hidden="true">${num}</span>
          <span class="product-cat">${CATEGORY_LABELS[product.category]}</span>
          <h3><a href="${href}">${esc(product.name)}</a></h3>
          <p>${esc(product.desc)}</p>
        </div>
        <a class="showcase-media" href="${href}" tabindex="-1">
          ${tagMarkup(product)}
          <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async" />
        </a>
        <div class="showcase-buy">
          <span class="product-price">${formatPrice(product.price)}</span>
          ${
            isSoldOut(product)
              ? '<button type="button" class="btn btn-ghost" disabled>نفدت الكمية</button>'
              : `<button type="button" class="btn btn-primary" data-add="${esc(product.id)}" data-buy>اشتري الآن</button>`
          }
          <a class="showcase-details" href="${href}">تفاصيل المنتج</a>
        </div>
      </article>`;
}

export function renderGrid(grid, list) {
  if (!grid) return;
  grid.innerHTML = list.length
    ? list.map((product, index) => productCard(product, index)).join('')
    : '<p class="empty-note">لا توجد منتجات في هذا القسم حالياً.</p>';
}

function clamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, Math.round(n)));
}

function readQty(scope) {
  const input = scope?.querySelector('[data-qty-input]');
  return input ? clamp(input.value) : 1;
}

/**
 * Modal yes/no question. Resolves with { qty } when confirmed (qty only when
 * a quantity picker was asked for) or null when the visitor cancels.
 */
export function confirmDialog({
  title,
  product,
  qty,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'confirm';
  dialog.innerHTML = `
      <form method="dialog" class="confirm-box">
        <img class="confirm-logo" src="./images/wishes-logo.png" alt="Wishes" width="585" height="298" />
        ${product ? `<img class="confirm-img" src="${esc(product.image)}" alt="" />` : ''}
        <h2 class="confirm-title">${title}</h2>
        ${product ? `<p class="confirm-product">${esc(product.name)} — <strong>${formatPrice(product.price)}</strong></p>` : ''}
        ${qty ? `<div class="confirm-qty"><span class="qty-label">الكمية</span>${qtyStepper(qty)}</div>` : ''}
        <div class="confirm-actions">
          <button value="ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${confirmLabel}</button>
          <button value="cancel" class="btn btn-ghost" formnovalidate>${cancelLabel}</button>
        </div>
      </form>`;
  document.body.appendChild(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const ok = dialog.returnValue === 'ok';
      const chosen = readQty(dialog);
      dialog.remove();
      resolve(ok ? { qty: chosen } : null);
    });
    // Clicking the dimmed backdrop counts as "cancel".
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close('cancel');
    });
    dialog.showModal();
    dialog.querySelector('button[value="ok"]').focus();
  });
}

/**
 * One delegated listener handles every stepper and "add to cart" button on the
 * page, including cards rendered later by the filters.
 */
export function setupCardActions() {
  document.addEventListener('click', (event) => {
    const stepBtn = event.target.closest('[data-step]');
    if (stepBtn) {
      const input = stepBtn.parentElement.querySelector('[data-qty-input]');
      if (input) {
        input.value = clamp(Number(input.value) + Number(stepBtn.dataset.step));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    const addBtn = event.target.closest('[data-add]');
    if (!addBtn) return;
    const product = getProduct(addBtn.dataset.add);
    const buyNow = addBtn.hasAttribute('data-buy');
    const scope = addBtn.closest('.product, .product-detail');
    confirmDialog({
      title: 'إضافة إلى السلة؟',
      product,
      qty: readQty(scope),
      confirmLabel: buyNow ? 'تأكيد والذهاب إلى السلة' : 'تأكيد الإضافة',
    }).then((answer) => {
      if (!answer) return;
      cart.addItem(product.id, answer.qty);
      if (buyNow) location.href = './cart.html';
      else {
        flyToCart(addBtn);
        toast(`تمت إضافة ${answer.qty} إلى السلة.`);
      }
    });
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty-input]');
    if (input) input.value = clamp(input.value);
  });
}
