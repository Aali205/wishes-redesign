// ---------------------------------------------------------------------------
// "رحلة طلباتي": the customer's orders and where each one is on its journey.
// Orders placed on this device are remembered (number + phone); any other
// order can be looked up with the same pair. Data comes from the track_order
// function in supabase/track_order.sql, which never exposes other orders.
// ---------------------------------------------------------------------------

import { formatPrice } from './data.js';
import { setupReveal } from './layout.js';

const STORAGE_KEY = 'wishes-orders-v1';

const STEPS = ['new', 'confirmed', 'shipped', 'delivered'];

const STAGES = {
  new: {
    label: 'استلمنا طلبك',
    text: 'طلبك وصلنا، وسنتواصل معكِ قريباً لتأكيده.',
  },
  confirmed: {
    label: 'تم تأكيد الطلب',
    text: 'أكّدنا طلبك ونجهّزه لكِ بكل حب.',
  },
  shipped: {
    label: 'طلبك في الطريق',
    text: 'طلبك خرج للتوصيل وسيصلك قريباً.',
  },
  delivered: {
    label: 'وصل طلبك',
    text: 'وصل طلبك! نتمنى أن تحبي منتجاتك.',
  },
  cancelled: {
    label: 'أُلغي الطلب',
    text: 'تم إلغاء هذا الطلب. تواصلي معنا إن كان لديكِ أي سؤال.',
  },
};

const STEP_LABELS = {
  new: 'الاستلام',
  confirmed: 'التأكيد',
  shipped: 'التوصيل',
  delivered: 'الوصول',
};

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ],
  );

const dateFormat = new Intl.DateTimeFormat('ar-SY', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/* ------------------------------ saved orders ----------------------------- */

function readSaved() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(list) ? list.filter((o) => o && o.id && o.phone) : [];
  } catch {
    return [];
  }
}

/** Remembers an order on this device so it shows up in "رحلة طلباتي". */
export function rememberOrder(id, phone) {
  const list = readSaved().filter((o) => o.id !== id);
  list.unshift({ id, phone });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* storage blocked — the order can still be looked up by number */
  }
}

async function track(id, phone) {
  const { supabase } = await import('./supabase.js');
  if (!supabase) throw new Error('not configured');
  const { data, error } = await supabase.rpc('track_order', {
    p_id: id,
    p_phone: phone,
  });
  if (error) throw error;
  return data[0] || null;
}

/* -------------------------------- scenes --------------------------------- */

// One small illustrated, animated scene per stage (see .scene-* in style.css).
const SCENES = {
  new: `
    <svg class="scene scene-new" viewBox="0 0 160 110" aria-hidden="true">
      <g class="scene-bob">
        <rect x="52" y="30" width="56" height="66" rx="8" class="fill-soft" />
        <path d="M66 30v-6a14 14 0 0 1 28 0v6" class="stroke-main" />
        <rect x="64" y="50" width="32" height="5" rx="2.5" class="fill-main" />
        <rect x="64" y="62" width="22" height="5" rx="2.5" class="fill-main" opacity=".5" />
      </g>
      <path class="scene-spark s1" d="M30 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
      <path class="scene-spark s2" d="M128 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
      <path class="scene-spark s3" d="M130 76l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
    </svg>`,
  confirmed: `
    <svg class="scene scene-confirmed" viewBox="0 0 160 110" aria-hidden="true">
      <circle cx="80" cy="55" r="40" class="scene-ring" />
      <circle cx="80" cy="55" r="32" class="fill-main" />
      <path d="M64 56l11 11 22-24" class="scene-check" />
    </svg>`,
  shipped: `
    <svg class="scene scene-shipped" viewBox="0 0 160 110" aria-hidden="true">
      <line x1="0" y1="92" x2="160" y2="92" class="scene-road" />
      <g class="scene-drive">
        <g class="scene-rumble">
          <rect x="58" y="36" width="38" height="30" rx="5" class="fill-main" />
          <path d="M96 46h14l10 12v8H96z" class="fill-soft" />
          <rect x="100" y="49" width="10" height="8" rx="2" class="fill-white" />
          <rect x="54" y="64" width="70" height="10" rx="5" class="fill-deep" />
        </g>
        <g class="scene-wheel" style="transform-origin: 72px 80px">
          <circle cx="72" cy="80" r="9" class="fill-deep" />
          <line x1="72" y1="73" x2="72" y2="87" class="stroke-white" />
        </g>
        <g class="scene-wheel" style="transform-origin: 110px 80px">
          <circle cx="110" cy="80" r="9" class="fill-deep" />
          <line x1="110" y1="73" x2="110" y2="87" class="stroke-white" />
        </g>
        <line x1="36" y1="46" x2="50" y2="46" class="scene-speed" />
        <line x1="30" y1="56" x2="48" y2="56" class="scene-speed d2" />
      </g>
    </svg>`,
  delivered: `
    <svg class="scene scene-delivered" viewBox="0 0 160 110" aria-hidden="true">
      <rect x="54" y="52" width="52" height="44" rx="5" class="fill-main" />
      <rect x="76" y="52" width="8" height="44" class="fill-soft" />
      <g class="scene-lid">
        <rect x="48" y="40" width="64" height="14" rx="4" class="fill-deep" />
        <path d="M80 40c-8-14-22-10-16-2 3 4 10 3 16 2zm0 0c8-14 22-10 16-2-3 4-10 3-16 2z" class="fill-soft" />
      </g>
      <rect class="confetti c1" x="40" y="20" width="6" height="6" rx="1" />
      <rect class="confetti c2" x="70" y="10" width="5" height="8" rx="1" />
      <rect class="confetti c3" x="100" y="16" width="6" height="6" rx="3" />
      <rect class="confetti c4" x="120" y="26" width="5" height="8" rx="1" />
      <rect class="confetti c5" x="55" y="14" width="6" height="6" rx="3" />
    </svg>`,
  cancelled: `
    <svg class="scene scene-cancelled" viewBox="0 0 160 110" aria-hidden="true">
      <circle cx="80" cy="55" r="32" class="fill-muted" />
      <path d="M68 43l24 24M92 43L68 67" class="stroke-white thick" />
    </svg>`,
};

/* -------------------------------- render --------------------------------- */

function timelineMarkup(status) {
  const current = STEPS.indexOf(status);
  const progress = current <= 0 ? 0 : current / (STEPS.length - 1);
  const steps = STEPS.map((step, index) => {
    const state =
      index < current ? 'done' : index === current ? 'current' : 'todo';
    return `<li class="journey-step is-${state}"><span class="journey-dot"></span>${STEP_LABELS[step]}</li>`;
  }).join('');
  return `
          <div class="journey-track" style="--progress: ${progress}">
            <span class="journey-bar"><span></span></span>
            <ol class="journey-steps">${steps}</ol>
          </div>`;
}

function paymentBadge(order) {
  if (order.status === 'cancelled') return '';
  if (order.paid) return '<span class="journey-badge is-paid">مدفوع</span>';
  if (order.payment === 'shamcash') {
    return '<span class="journey-badge">بانتظار تأكيد الدفع</span>';
  }
  return '<span class="journey-badge">الدفع عند الاستلام</span>';
}

function orderMarkup(order) {
  const status = STAGES[order.status] ? order.status : 'new';
  const stage = STAGES[status];
  const items = (Array.isArray(order.items) ? order.items : [])
    .map((item) => `<li>${esc(item.name)} × ${esc(item.qty)}</li>`)
    .join('');

  return `
        <article class="journey-card is-${status} reveal">
          <div class="journey-scene">${SCENES[status]}</div>
          <div class="journey-body">
            <header class="journey-head">
              <div>
                <h2>${stage.label}</h2>
                <p>${stage.text}</p>
              </div>
              ${paymentBadge(order)}
            </header>
            ${status === 'cancelled' ? '' : timelineMarkup(status)}
            <footer class="journey-meta">
              <span>رقم الطلب <strong dir="ltr">${esc(order.id)}</strong></span>
              <span>${esc(dateFormat.format(new Date(order.created_at)))}</span>
              <span>الإجمالي <strong>${esc(formatPrice(Number(order.total)))}</strong></span>
            </footer>
            <ul class="journey-items">${items}</ul>
          </div>
        </article>`;
}

/* --------------------------------- page ---------------------------------- */

export function initOrders() {
  const list = document.getElementById('orders-list');
  const form = document.getElementById('track-form');
  const formError = form.querySelector('[data-error]');

  // ?id=W-XXXX from the checkout's "follow your order" link.
  const wanted = new URLSearchParams(location.search).get('id');
  if (wanted) form.elements.id.value = wanted;

  const load = async () => {
    const saved = readSaved();
    if (!saved.length) {
      list.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon"><use href="#i-cart" /></svg>
          <h2>لا توجد طلبات على هذا الجهاز بعد</h2>
          <p>بعد أن تطلبي من Wishes ستظهر رحلة طلبك هنا، أو ابحثي عن طلب برقمه ورقم هاتفك.</p>
          <a class="btn btn-primary" href="./products.html">تصفّحي المنتجات</a>
        </div>`;
      return;
    }

    if (!list.children.length) {
      list.innerHTML = '<p class="journey-loading">جارٍ تحميل طلباتك…</p>';
    }
    const results = await Promise.all(
      saved.map((o) => track(o.id, o.phone).catch(() => undefined)),
    );
    const found = results.filter(Boolean);
    if (!found.length) {
      list.innerHTML = results.includes(undefined)
        ? '<p class="journey-loading">تعذّر تحميل الطلبات، تحقّقي من الاتصال بالإنترنت.</p>'
        : '<p class="journey-loading">لم نجد طلباتك المحفوظة.</p>';
      return;
    }
    list.innerHTML = found.map(orderMarkup).join('');
    setupReveal(list);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = form.elements.id.value.trim().toUpperCase();
    const phone = form.elements.phone.value.trim();
    formError.textContent = '';
    if (!id || phone.replace(/\D/g, '').length < 6) {
      formError.textContent = 'اكتبي رقم الطلب ورقم الهاتف الذي طلبتِ به.';
      return;
    }
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const order = await track(id, phone);
      if (!order) {
        formError.textContent = 'لم نجد طلباً بهذا الرقم وهذا الهاتف.';
        return;
      }
      rememberOrder(order.id, phone);
      form.reset();
      await load();
      list.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      formError.textContent = 'تعذّر البحث الآن، حاولي بعد قليل.';
    } finally {
      button.disabled = false;
    }
  });

  load();
  // Pick up status changes when the customer comes back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') load();
  });
}
