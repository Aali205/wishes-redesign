// ---------------------------------------------------------------------------
// Entry point for every page. The page tells us which one it is through
// <body data-page="...">, and we wire up only what that page needs.
// ---------------------------------------------------------------------------

import {
  CATEGORY_LABELS,
  INSTAGRAM_DM,
  esc,
  formatPrice,
  getProduct,
  isSoldOut,
  products,
} from './data.js';
import { loadCatalog } from './catalog.js';
import * as cart from './cart.js';
import { mountCheckout } from './checkout.js';
import { initOrders } from './orders.js';
import { mountLayout, toast } from './layout.js';
import { createDandelion } from './dandelion.js';
import {
  initDrifts,
  marqueeDrift,
  lightStatement,
  onReady,
  routineStem,
  splitHeadings,
  startIntro,
} from './motion.js';
import {
  confirmDialog,
  qtyStepper,
  tagMarkup,
  renderGrid,
  setupCardActions,
  showcaseSlide,
} from './ui.js';

const page = document.body.dataset.page || 'home';

// The intro runs while the catalogue loads, so the preloader covers the wait.
startIntro();
splitHeadings();

// Prices, stock and new products come from the database (see catalog.js).
await loadCatalog();

mountLayout(page);
setupCardActions();

/* ---------------------------------- home --------------------------------- */

/**
 * Signature hero: the dandelion clock. Moving across it, pressing the
 * "blow" button or scrolling the hero away releases seeds (src/dandelion.js).
 */
function initDandelion(section, { seeds = 150, withButton = false } = {}) {
  const canvas = section?.querySelector('.hero-canvas');
  const anchor = section?.querySelector('.hero-stage');
  if (!canvas || !anchor) return;
  const count = document.getElementById('wish-count');
  const flower = createDandelion(canvas, {
    anchor,
    seeds,
    windTarget: section,
    onRelease: (n) => {
      if (count) count.textContent = n;
    },
  });
  if (!flower) return;
  onReady(() => flower.start());
  if (withButton) {
    document.getElementById('wish-btn')?.addEventListener('click', () => flower.blow());
  }
}

function initHome() {
  initDandelion(document.querySelector('.hero'), { withButton: true });
  // Eight picks keep the scroll-through short; the rest live on /products.html.
  initShowcase(document.getElementById('featured'), products.slice(0, 8));
  marqueeDrift();
}

/**
 * Horizontal product showcase. The section is N screens tall and its content
 * is pinned; each screen of vertical scroll slides the next product in
 * sideways. Scrolling back up returns to the previous one.
 */
function initShowcase(section, list) {
  if (!section || !list.length) return;

  const pin = section.querySelector('.showcase-pin');
  const track = section.querySelector('#showcase-track');
  const dotsRoot = section.querySelector('#showcase-dots');
  const snapsRoot = section.querySelector('#showcase-snaps');
  const current = section.querySelector('#showcase-current');
  const bar = section.querySelector('#showcase-bar');
  const count = list.length;
  const rtl = getComputedStyle(section).direction === 'rtl';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');

  section.style.setProperty('--count', count);
  section.querySelector('#showcase-total').textContent = pad(count);
  track.innerHTML = list
    .map((product, i) => showcaseSlide(product, i, count))
    .join('');
  dotsRoot.innerHTML = list
    .map(
      (product, i) =>
        `<button type="button" class="showcase-dot" data-goto="${i}" aria-label="${product.name}"></button>`,
    )
    .join('');
  snapsRoot.innerHTML = '<span></span>'.repeat(count);

  const slides = [...track.children];
  const dots = [...dotsRoot.children];
  const snaps = [...snapsRoot.children];
  let step = 0;
  let active = -1;

  // One "step" is the height of the pinned screen; sticky releases after
  // (count - 1) steps, so scroll distance / step is the slide position.
  const layout = () => {
    step = pin.offsetHeight;
    const offset =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0;
    snaps.forEach((snap, i) => {
      snap.style.top = `${i * step + offset}px`;
    });
    update();
  };

  const position = () => {
    const scrolled = -section.getBoundingClientRect().top;
    return Math.min(count - 1, Math.max(0, scrolled / step));
  };

  const update = () => {
    const pos = position();
    const width = track.clientWidth;
    track.style.transform = `translate3d(${(rtl ? 1 : -1) * pos * width}px, 0, 0)`;

    slides.forEach((slide, i) => {
      const d = i - pos;
      const near = Math.min(1, Math.abs(d));
      if (reduceMotion.matches) {
        slide.style.removeProperty('--scale');
        slide.style.removeProperty('--shift');
        slide.style.removeProperty('--fade');
      } else {
        slide.style.setProperty('--scale', 1 - near * 0.18);
        slide.style.setProperty('--shift', `${(rtl ? -1 : 1) * d * 14}%`);
        slide.style.setProperty('--fade', 1 - near * 0.85);
      }
    });

    bar?.style.setProperty('transform', `scaleX(${(pos / Math.max(1, count - 1)).toFixed(4)})`);

    const next = Math.round(pos);
    if (next !== active) {
      active = next;
      current.textContent = pad(active + 1);
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === active);
        slide.inert = i !== active;
      });
      dots.forEach((dot, i) =>
        dot.setAttribute('aria-current', i === active ? 'true' : 'false'),
      );
    }
  };

  const goTo = (i) => {
    const target = Math.min(count - 1, Math.max(0, i));
    const top = section.getBoundingClientRect().top + scrollY + target * step;
    scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };

  section.addEventListener('click', (event) => {
    const arrow = event.target.closest('[data-showcase]');
    if (arrow) goTo(active + (arrow.dataset.showcase === 'next' ? 1 : -1));
    const dot = event.target.closest('[data-goto]');
    if (dot) goTo(Number(dot.dataset.goto));
  });

  section.addEventListener('keydown', (event) => {
    if (event.target.matches('input')) return;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) goTo(active + 1);
    else if (event.key === back) goTo(active - 1);
    else return;
    event.preventDefault();
  });

  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true },
  );
  addEventListener('resize', layout);
  reduceMotion.addEventListener('change', update);
  layout();
}

/* -------------------------------- products ------------------------------- */

function initProducts() {
  const grid = document.getElementById('product-grid');
  const chips = document.querySelectorAll('.chip');
  const requested = new URLSearchParams(location.search).get('cat');

  const setFilter = (filter, updateUrl = true) => {
    const valid =
      filter === 'all' || filter in CATEGORY_LABELS ? filter : 'all';
    chips.forEach((chip) =>
      chip.classList.toggle('is-active', chip.dataset.filter === valid),
    );
    renderGrid(
      grid,
      valid === 'all' ? products : products.filter((p) => p.category === valid),
    );
    if (updateUrl) {
      const url =
        valid === 'all'
          ? location.pathname
          : `${location.pathname}?cat=${valid}`;
      history.replaceState(null, '', url);
    }
  };

  chips.forEach((chip) =>
    chip.addEventListener('click', () => setFilter(chip.dataset.filter)),
  );
  setFilter(requested || 'all', false);
}

/* --------------------------------- product ------------------------------- */

function initProduct() {
  const root = document.getElementById('product-detail');
  const id = new URLSearchParams(location.search).get('id');
  const product = id ? getProduct(id) : null;

  if (!product) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>لم نجد هذا المنتج</h2>
        <p>ربما تغيّر الرابط أو لم يعد المنتج متوفراً.</p>
        <a class="btn btn-primary" href="./products.html">عودة إلى المنتجات</a>
      </div>`;
    return;
  }

  document.title = `${product.name} | Wishes`;
  const soldOut = isSoldOut(product);

  root.innerHTML = `
      <nav class="breadcrumb" aria-label="مسار التصفح">
        <a href="./">الرئيسية</a>
        <span>/</span>
        <a href="./products.html">المنتجات</a>
        <span>/</span>
        <a href="./products.html?cat=${product.category}">${CATEGORY_LABELS[product.category]}</a>
      </nav>

      <div class="product-detail">
        <div class="product-detail-media">
          ${tagMarkup(product)}
          <img src="${esc(product.image)}" alt="${esc(product.name)}" />
        </div>
        <div class="product-detail-body">
          <span class="product-cat">${CATEGORY_LABELS[product.category]}</span>
          <h1>${esc(product.name)}</h1>
          <p class="lead">${esc(product.desc)}</p>
          <p class="product-detail-price">${formatPrice(product.price)}</p>
          <p>${esc(product.details)}</p>

          <div class="product-detail-buy">
            ${
              soldOut
                ? '<button type="button" class="btn btn-ghost" disabled>نفدت الكمية — راسلينا لنخبرك عند توفره</button>'
                : `<span class="qty-label">الكمية</span>
            ${qtyStepper()}
            <button type="button" class="btn btn-primary" data-add="${esc(product.id)}">أضيفي إلى السلة</button>`
            }
          </div>

          <div class="product-detail-links">
            <a class="btn btn-ghost" href="./cart.html">الذهاب إلى السلة</a>
            <a class="btn btn-ghost" href="${INSTAGRAM_DM}" target="_blank" rel="noopener">استفسري عبر إنستغرام</a>
          </div>
        </div>
      </div>`;

  const related = products.filter(
    (p) => p.id !== product.id && p.category === product.category,
  );
  const fallback = products.filter((p) => p.id !== product.id);
  renderGrid(
    document.getElementById('related-grid'),
    (related.length ? related : fallback).slice(0, 4),
  );
}

/* ----------------------------------- cart -------------------------------- */

function cartLineMarkup(line) {
  const href = `./product.html?id=${encodeURIComponent(line.product.id)}`;
  return `
          <li class="cart-line" data-line="${esc(line.product.id)}">
            <a class="cart-line-media" href="${href}">
              <img src="${esc(line.product.image)}" alt="${esc(line.product.name)}" loading="lazy" />
            </a>
            <div class="cart-line-info">
              <span class="product-cat">${CATEGORY_LABELS[line.product.category]}</span>
              <h3><a href="${href}">${esc(line.product.name)}</a></h3>
              <p class="cart-line-unit">سعر القطعة: ${formatPrice(line.product.price)}</p>
            </div>
            ${qtyStepper(line.qty, `كمية ${esc(line.product.name)}`)}
            <span class="cart-line-total">${formatPrice(line.total)}</span>
            <button type="button" class="cart-remove" data-remove="${esc(line.product.id)}" aria-label="حذف ${esc(line.product.name)}">
              <svg class="icon"><use href="#i-trash" /></svg>
            </button>
          </li>`;
}

function invoiceMarkup(lines, pieces, total) {
  const rows = lines
    .map(
      (line) => `
              <tr>
                <td>${esc(line.product.name)}</td>
                <td>${line.qty}</td>
                <td>${formatPrice(line.product.price)}</td>
                <td>${formatPrice(line.total)}</td>
              </tr>`,
    )
    .join('');

  return `
        <section class="invoice" aria-label="فاتورة الطلب">
          <h2>الفاتورة</h2>
          <table class="invoice-table">
            <thead>
              <tr><th>المنتج</th><th>الكمية</th><th>سعر القطعة</th><th>المجموع</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <dl class="invoice-summary">
            <div><dt>عدد القطع</dt><dd>${pieces}</dd></div>
            <div><dt>المجموع الفرعي</dt><dd>${formatPrice(total)}</dd></div>
            <div><dt>التوصيل</dt><dd>يُحدَّد حسب المنطقة</dd></div>
            <div class="invoice-total"><dt>الإجمالي</dt><dd>${formatPrice(total)}</dd></div>
          </dl>

          <div class="invoice-actions">
            <button type="button" class="btn btn-primary" id="start-checkout">إكمال الطلب</button>
            <button type="button" class="btn btn-ghost" id="clear-cart">إفراغ السلة</button>
          </div>
          <p class="invoice-note">أكملي الطلب بإدخال معلوماتك واختيار طريقة الدفع: عند الاستلام أو عبر شام كاش.</p>
        </section>`;
}

function initCart() {
  const root = document.getElementById('cart-root');
  const checkoutRoot = document.getElementById('checkout-root');
  const updateCheckout = mountCheckout(checkoutRoot);

  const render = () => {
    const lines = cart.getLines();
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    const pieces = lines.reduce((sum, line) => sum + line.qty, 0);

    updateCheckout(total);
    if (!lines.length) {
      checkoutRoot.hidden = true;
      root.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon"><use href="#i-cart" /></svg>
          <h2>سلّتك فارغة</h2>
          <p>أضيفي المنتجات التي تعجبك وستظهر هنا مع الفاتورة.</p>
          <a class="btn btn-primary" href="./products.html">تصفّحي المنتجات</a>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="cart-layout">
        <ul class="cart-lines">${lines.map(cartLineMarkup).join('')}</ul>
        ${invoiceMarkup(lines, pieces, total)}
      </div>`;

    root.querySelector('#start-checkout').addEventListener('click', () => {
      checkoutRoot.hidden = false;
      checkoutRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      checkoutRoot
        .querySelector('[name="name"]')
        ?.focus({ preventScroll: true });
    });

    root.querySelector('#clear-cart').addEventListener('click', async () => {
      const answer = await confirmDialog({
        title: 'هل تريدين إفراغ السلة بالكامل؟',
        confirmLabel: 'نعم، أفرغي السلة',
        danger: true,
      });
      if (answer) {
        cart.clear();
        toast('تم إفراغ السلة.');
      }
    });
  };

  root.addEventListener('click', async (event) => {
    const removeBtn = event.target.closest('[data-remove]');
    if (!removeBtn) return;
    const id = removeBtn.dataset.remove;
    const answer = await confirmDialog({
      title: 'حذف هذا المنتج من السلة؟',
      product: getProduct(id),
      confirmLabel: 'نعم، احذفيه',
      danger: true,
    });
    if (answer) {
      cart.removeItem(id);
      toast('تم حذف المنتج من السلة.');
    }
  });

  root.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty-input]');
    const line = input && input.closest('[data-line]');
    if (line) cart.setQty(line.dataset.line, input.value);
  });

  cart.subscribe(render);
}

/* --------------------------------- dispatch ------------------------------ */

const pages = {
  home: initHome,
  contact: () => initDandelion(document.querySelector('.contact-hero'), { seeds: 110 }),
  about: lightStatement,
  routine: routineStem,
  products: initProducts,
  product: initProduct,
  cart: initCart,
  orders: initOrders,
};

if (pages[page]) pages[page]();
initDrifts();
