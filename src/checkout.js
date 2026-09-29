// ---------------------------------------------------------------------------
// Checkout: the customer's details and payment choice, turned into an order
// message that is copied and sent to us over Instagram (the site has no server).
// ---------------------------------------------------------------------------

import { INSTAGRAM_DM, SHAM_CASH, formatPrice, getProduct } from './data.js';
import * as cart from './cart.js';
import { toast } from './layout.js';
import { rememberOrder } from './orders.js';

const DRAFT_KEY = 'wishes-customer-v1';

const CITIES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'درعا',
  'السويداء',
  'القنيطرة',
  'دير الزور',
  'الرقة',
  'الحسكة',
];

const PAYMENT_LABELS = {
  cod: 'الدفع عند الاستلام',
  shamcash: 'الدفع الآن عبر شام كاش',
};

// Name, phone and address are remembered for the next order on this device.
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDraft(data) {
  try {
    const { name, phone, city, area } = data;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, phone, city, area }));
  } catch {
    /* storage blocked — nothing to remember */
  }
}

function orderNumber() {
  const time = Date.now().toString(36).slice(-5);
  const random = Math.random().toString(36).slice(2, 5);
  return `W-${time}${random}`.toUpperCase();
}

/**
 * Saves the order for the admin dashboard. Resolves to true when saved,
 * false when the database couldn't be reached, or { unavailable: productId }
 * when the database refused an item that is sold out or no longer sold.
 */
async function saveOrder(data, lines, total) {
  try {
    const { supabase } = await import('./supabase.js');
    if (!supabase) return false;
    const { error } = await supabase.from('orders').insert({
      id: data.id,
      items: lines.map((line) => ({
        id: line.product.id,
        name: line.product.name,
        qty: line.qty,
        price: line.product.price,
        total: line.total,
      })),
      total,
      name: data.name,
      phone: data.phone,
      city: data.city,
      area: data.area,
      notes: data.notes || null,
      payment: data.payment,
      txn: data.txn || null,
    });
    const refused = error?.message?.match(/^(?:out_of_stock|unavailable):(.+)$/);
    if (refused) return { unavailable: refused[1] };
    return !error;
  } catch {
    return false;
  }
}

function orderText(data, lines, total) {
  const rows = lines.map(
    (line) =>
      `• ${line.product.name} × ${line.qty} = ${formatPrice(line.total)}`,
  );
  const payment =
    data.payment === 'shamcash' && data.txn
      ? `${PAYMENT_LABELS.shamcash} (رقم العملية: ${data.txn})`
      : PAYMENT_LABELS[data.payment];

  return [
    `طلب جديد من Wishes — ${data.id}`,
    '',
    ...rows,
    `الإجمالي: ${formatPrice(total)} (بدون التوصيل)`,
    '',
    `الاسم: ${data.name}`,
    `رقم التواصل: ${data.phone}`,
    `المدينة: ${data.city}`,
    `المنطقة والعنوان: ${data.area}`,
    data.notes ? `ملاحظات: ${data.notes}` : null,
    `طريقة الدفع: ${payment}`,
  ]
    .filter((row) => row !== null)
    .join('\n');
}

function shamCashMarkup() {
  if (!SHAM_CASH.account) {
    return `
          <p class="checkout-hint">سنرسل لكِ رقم حساب شام كاش برسالة على إنستغرام بعد إرسال الطلب، وبعد التحويل أرسلي لنا رقم العملية أو صورة الإشعار.</p>`;
  }
  return `
          <p class="checkout-hint">حوّلي المبلغ إلى حسابنا على شام كاش، ثم اكتبي رقم عملية التحويل هنا.</p>
          <dl class="shamcash-details">
            <div><dt>المبلغ</dt><dd data-checkout-total></dd></div>
            <div><dt>اسم الحساب</dt><dd>${SHAM_CASH.name}</dd></div>
            <div>
              <dt>رقم الحساب</dt>
              <dd class="shamcash-account">
                <span dir="ltr">${SHAM_CASH.account}</span>
                <button type="button" class="btn btn-ghost btn-small" data-copy-account>نسخ</button>
              </dd>
            </div>
          </dl>
          <label class="field">
            <span>رقم عملية التحويل</span>
            <input name="txn" type="text" inputmode="numeric" dir="ltr" autocomplete="off" />
            <small class="field-error" data-error="txn"></small>
          </label>`;
}

function formMarkup(draft) {
  const cities = CITIES.map(
    (city) =>
      `<option${city === draft.city ? ' selected' : ''}>${city}</option>`,
  ).join('');

  return `
      <section class="checkout" aria-labelledby="checkout-title">
        <h2 id="checkout-title">إكمال الطلب</h2>
        <form class="checkout-form" novalidate>
          <fieldset class="checkout-group">
            <legend>معلوماتك</legend>
            <label class="field">
              <span>الاسم الكامل</span>
              <input name="name" type="text" autocomplete="name" required />
              <small class="field-error" data-error="name"></small>
            </label>
            <label class="field">
              <span>رقم التواصل (واتساب)</span>
              <input name="phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" placeholder="09xx xxx xxx" required />
              <small class="field-error" data-error="phone"></small>
            </label>
            <label class="field">
              <span>المدينة</span>
              <select name="city" required>
                <option value="">اختاري المدينة</option>
                ${cities}
              </select>
              <small class="field-error" data-error="city"></small>
            </label>
            <label class="field">
              <span>المنطقة والعنوان بالتفصيل</span>
              <input name="area" type="text" autocomplete="street-address" placeholder="الحي، الشارع، أقرب معلم" required />
              <small class="field-error" data-error="area"></small>
            </label>
            <label class="field field-wide">
              <span>ملاحظات (اختياري)</span>
              <textarea name="notes" rows="2"></textarea>
            </label>
          </fieldset>

          <fieldset class="checkout-group">
            <legend>طريقة الدفع</legend>
            <div class="pay-options">
              <label class="pay-option">
                <input type="radio" name="payment" value="cod" checked />
                <span class="pay-option-body">
                  <strong>${PAYMENT_LABELS.cod}</strong>
                  <small>ادفعي نقداً عند وصول الطلب.</small>
                </span>
              </label>
              <label class="pay-option">
                <input type="radio" name="payment" value="shamcash" />
                <span class="pay-option-body">
                  <strong>${PAYMENT_LABELS.shamcash}</strong>
                  <small>حوّلي المبلغ من تطبيق شام كاش.</small>
                </span>
              </label>
            </div>
            <div class="shamcash-panel" hidden>${shamCashMarkup()}</div>
          </fieldset>

          <div class="checkout-footer">
            <p class="checkout-total">الإجمالي: <strong data-checkout-total></strong> <small>+ التوصيل حسب المنطقة</small></p>
            <button type="submit" class="btn btn-primary">إرسال الطلب</button>
          </div>
        </form>

        <div class="checkout-done" hidden>
          <h3><span data-done-title>تم تجهيز طلبك</span> <span data-order-id></span></h3>
          <p data-done-note></p>
          <textarea class="checkout-message" rows="12" readonly></textarea>
          <div class="invoice-actions">
            <a class="btn btn-primary" href="./my-orders.html" data-track-link hidden>تابعي رحلة طلبك</a>
            <a class="btn btn-ghost" href="${INSTAGRAM_DM}" target="_blank" rel="noopener">افتحي إنستغرام</a>
            <button type="button" class="btn btn-ghost" data-copy-order>نسخ الطلب مرة أخرى</button>
            <button type="button" class="btn btn-ghost" data-finish>تم الإرسال، أفرغي السلة</button>
          </div>
        </div>
      </section>`;
}

function validate(data) {
  const errors = {};
  if (data.name.length < 3) errors.name = 'اكتبي اسمك الكامل.';
  const digits = data.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    errors.phone = 'اكتبي رقم هاتف صحيح.';
  }
  if (!data.city) errors.city = 'اختاري المدينة.';
  if (data.area.length < 3) errors.area = 'اكتبي المنطقة والعنوان.';
  if (data.payment === 'shamcash' && SHAM_CASH.account && !data.txn) {
    errors.txn = 'اكتبي رقم عملية التحويل بعد الدفع.';
  }
  return errors;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mounts the checkout into `root` once. Returns an updater the cart page calls
 * whenever the cart changes, so the form keeps what the customer typed.
 */
export function mountCheckout(root) {
  const draft = readDraft();
  root.innerHTML = formMarkup(draft);

  const form = root.querySelector('.checkout-form');
  const done = root.querySelector('.checkout-done');
  const message = root.querySelector('.checkout-message');
  const shamPanel = root.querySelector('.shamcash-panel');
  const submit = form.querySelector('[type="submit"]');

  for (const key of ['name', 'phone', 'area']) {
    if (draft[key]) form.elements[key].value = draft[key];
  }

  const showErrors = (errors) => {
    root.querySelectorAll('[data-error]').forEach((slot) => {
      const text = errors[slot.dataset.error] || '';
      slot.textContent = text;
      const input = form.elements[slot.dataset.error];
      if (input) input.toggleAttribute('aria-invalid', Boolean(text));
    });
  };

  // Redesign (UX audit): blur-first validation. A field is checked when the
  // customer leaves it, and its message clears as soon as she edits it.
  const setFieldError = (name, text) => {
    const slot = root.querySelector(`[data-error="${name}"]`);
    if (slot) slot.textContent = text;
    form.elements[name]?.toggleAttribute('aria-invalid', Boolean(text));
  };
  form.addEventListener('focusout', (event) => {
    const name = event.target.name;
    if (!name || !root.querySelector(`[data-error="${name}"]`)) return;
    if (!event.target.value.trim()) return; // don't scold an untouched field
    const field = (key) => (form.elements[key]?.value || '').trim();
    const errors = validate({
      name: field('name'),
      phone: field('phone'),
      city: field('city'),
      area: field('area'),
      payment: form.elements.payment?.value,
      txn: field('txn'),
    });
    setFieldError(name, errors[name] || '');
  });
  form.addEventListener('input', (event) => {
    if (event.target.name) setFieldError(event.target.name, '');
  });

  form.addEventListener('change', (event) => {
    if (event.target.name === 'payment') {
      shamPanel.hidden = event.target.value !== 'shamcash';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const field = (name) => (form.elements[name]?.value || '').trim();
    const data = {
      id: orderNumber(),
      name: field('name'),
      phone: field('phone'),
      city: field('city'),
      area: field('area'),
      notes: field('notes'),
      payment: form.elements.payment.value,
      txn: field('txn'),
    };

    const errors = validate(data);
    showErrors(errors);
    const firstBad = Object.keys(errors)[0];
    if (firstBad) {
      form.elements[firstBad].focus();
      return;
    }

    saveDraft(data);
    const lines = cart.getLines();
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    const text = orderText(data, lines, total);

    submit.disabled = true;
    submit.textContent = 'جارٍ الإرسال…';
    const saved = await saveOrder(data, lines, total);
    submit.disabled = false;
    submit.textContent = 'إرسال الطلب';

    if (saved?.unavailable) {
      const name = getProduct(saved.unavailable)?.name || 'أحد المنتجات';
      toast(`عذراً، ${name} لم يعد متوفراً بالكمية المطلوبة. عدّلي السلة وحاولي مجدداً.`);
      return;
    }

    if (saved) rememberOrder(data.id, data.phone);
    const trackLink = root.querySelector('[data-track-link]');
    trackLink.hidden = !saved;
    trackLink.href = `./my-orders.html?id=${encodeURIComponent(data.id)}`;

    message.value = text;
    root.querySelector('[data-order-id]').textContent = data.id;
    root.querySelector('[data-done-title]').textContent = saved
      ? 'تم استلام طلبك'
      : 'تم تجهيز طلبك';
    root.querySelector('[data-done-note]').textContent = saved
      ? 'وصلنا طلبك وسنتواصل معكِ على رقمك لتأكيده وتحديد موعد التوصيل. يمكنكِ أيضاً إرسال التفاصيل لنا على إنستغرام لتأكيد أسرع.'
      : 'نسخنا تفاصيل الطلب لكِ. الصقيها في رسالة إلينا على إنستغرام واضغطي إرسال، وسنؤكد طلبك ونحدد موعد التوصيل.';
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (await copy(text)) toast('تم نسخ تفاصيل الطلب.');
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-copy-account]')) {
      if (await copy(SHAM_CASH.account)) toast('تم نسخ رقم الحساب.');
    }
    if (event.target.closest('[data-copy-order]')) {
      if (await copy(message.value)) toast('تم نسخ الطلب.');
      else message.select();
    }
    if (event.target.closest('[data-finish]')) {
      cart.clear();
      toast('شكراً لطلبك من Wishes!');
    }
  });

  return function update(total) {
    root.querySelectorAll('[data-checkout-total]').forEach((slot) => {
      slot.textContent = formatPrice(total);
    });
  };
}
