// ---------------------------------------------------------------------------
// Admin dashboard: sign in, then list every order with its delivery stage and
// payment state. Access is enforced by Supabase (see supabase/schema.sql).
// ---------------------------------------------------------------------------

import { formatPrice } from './data.js';
import { supabase } from './supabase.js';
import { confirmDialog } from './ui.js';
import { mountAssistant, unmountAssistant } from './assistant.js';

const STATUS = {
  new: 'جديد',
  confirmed: 'مؤكَّد',
  shipped: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغى',
};

const PAYMENT = {
  cod: 'عند الاستلام',
  shamcash: 'شام كاش',
};

const root = document.getElementById('admin-root');
const headerActions = document.querySelector('.admin-header-actions');

let orders = [];
const filters = { status: 'open', paid: 'all', payment: 'all', q: '' };

// Everything shown here was typed by customers, so it is always escaped.
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

function message(title, text) {
  headerActions.hidden = true;
  root.innerHTML = `
    <section class="admin-card admin-message">
      <h1>${title}</h1>
      <p>${text}</p>
    </section>`;
}

/* --------------------------------- login --------------------------------- */

function showLogin(error = '') {
  headerActions.hidden = true;
  root.innerHTML = `
    <section class="admin-card admin-login">
      <h1>تسجيل دخول الإدارة</h1>
      <form class="checkout-form" novalidate>
        <label class="field">
          <span>البريد الإلكتروني</span>
          <input name="email" type="email" dir="ltr" autocomplete="username" required />
        </label>
        <label class="field">
          <span>كلمة المرور</span>
          <input name="password" type="password" dir="ltr" autocomplete="current-password" required />
        </label>
        <p class="field-error" role="alert">${esc(error)}</p>
        <button type="submit" class="btn btn-primary">دخول</button>
      </form>
    </section>`;

  const form = root.querySelector('form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    });
    button.disabled = false;
    if (signInError) showLogin('البريد أو كلمة المرور غير صحيحة.');
    else loadDashboard();
  });
}

/* ------------------------------- dashboard ------------------------------- */

async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data;
}

async function isAdmin() {
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}

async function loadDashboard() {
  headerActions.hidden = false;
  root.innerHTML = '<p class="admin-loading">جارٍ تحميل الطلبات…</p>';

  if (!(await isAdmin())) {
    const { data } = await supabase.auth.getUser();
    message(
      'لا تملكين صلاحية الإدارة',
      `الحساب ${esc(data.user?.email)} غير مضاف كمسؤول. أضيفيه إلى جدول admins في Supabase.`,
    );
    headerActions.hidden = false;
    return;
  }

  mountAssistant(supabase);

  try {
    orders = await fetchOrders();
  } catch {
    message('تعذّر تحميل الطلبات', 'تحقّقي من الاتصال بالإنترنت ثم اضغطي تحديث.');
    headerActions.hidden = false;
    return;
  }

  root.innerHTML = `
    <section class="admin-stats" aria-label="ملخص"></section>
    <section class="admin-card admin-filters" aria-label="تصفية الطلبات">
      <label class="field">
        <span>الحالة</span>
        <select name="status">
          <option value="open">كل الطلبات غير المُسلَّمة</option>
          <option value="all">كل الطلبات</option>
          ${Object.entries(STATUS)
            .map(([value, label]) => `<option value="${value}">${label}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field">
        <span>الدفع</span>
        <select name="paid">
          <option value="all">الكل</option>
          <option value="unpaid">غير مدفوع</option>
          <option value="paid">مدفوع</option>
        </select>
      </label>
      <label class="field">
        <span>طريقة الدفع</span>
        <select name="payment">
          <option value="all">الكل</option>
          <option value="cod">${PAYMENT.cod}</option>
          <option value="shamcash">${PAYMENT.shamcash}</option>
        </select>
      </label>
      <label class="field">
        <span>بحث</span>
        <input name="q" type="search" placeholder="الاسم، الرقم، رقم الطلب" />
      </label>
    </section>
    <section class="admin-orders" aria-live="polite"></section>`;

  const filterForm = root.querySelector('.admin-filters');
  for (const [key, value] of Object.entries(filters)) {
    filterForm.querySelector(`[name="${key}"]`).value = value;
  }
  filterForm.addEventListener('input', (event) => {
    filters[event.target.name] = event.target.value.trim();
    renderOrders();
  });

  renderStats();
  renderOrders();
}

function renderStats() {
  const active = orders.filter((o) => o.status !== 'cancelled');
  const count = (list) => list.length;
  const sum = (list) => list.reduce((total, o) => total + Number(o.total), 0);
  const tiles = [
    ['طلبات جديدة', count(active.filter((o) => o.status === 'new'))],
    [
      'بانتظار التوصيل',
      count(active.filter((o) => o.status !== 'delivered')),
    ],
    ['غير مدفوعة', count(active.filter((o) => !o.paid))],
    ['المبالغ المحصَّلة', formatPrice(sum(active.filter((o) => o.paid)))],
  ];
  root.querySelector('.admin-stats').innerHTML = tiles
    .map(
      ([label, value]) => `
      <div class="admin-stat">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>`,
    )
    .join('');
}

function matches(order) {
  if (filters.status === 'open') {
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return false;
    }
  } else if (filters.status !== 'all' && order.status !== filters.status) {
    return false;
  }
  if (filters.paid === 'paid' && !order.paid) return false;
  if (filters.paid === 'unpaid' && order.paid) return false;
  if (filters.payment !== 'all' && order.payment !== filters.payment) {
    return false;
  }
  if (filters.q) {
    const haystack = `${order.id} ${order.name} ${order.phone}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

function whatsappLink(phone) {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `963${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function orderMarkup(order) {
  const items = (Array.isArray(order.items) ? order.items : [])
    .map(
      (item) =>
        `<li>${esc(item.name)} × ${esc(item.qty)} <span>${esc(formatPrice(item.total))}</span></li>`,
    )
    .join('');
  const statusOptions = Object.entries(STATUS)
    .map(
      ([value, label]) =>
        `<option value="${value}"${value === order.status ? ' selected' : ''}>${label}</option>`,
    )
    .join('');

  return `
      <article class="admin-card admin-order" data-order="${esc(order.id)}" data-status="${esc(order.status)}">
        <header class="admin-order-head">
          <div>
            <h2>${esc(order.id)}</h2>
            <time>${esc(dateFormat.format(new Date(order.created_at)))}</time>
          </div>
          <strong class="admin-order-total">${esc(formatPrice(order.total))}</strong>
        </header>

        <div class="admin-order-body">
          <dl class="admin-order-info">
            <div><dt>الاسم</dt><dd>${esc(order.name)}</dd></div>
            <div>
              <dt>الرقم</dt>
              <dd>
                <a href="tel:${esc(order.phone)}" dir="ltr">${esc(order.phone)}</a>
                · <a href="${esc(whatsappLink(order.phone))}" target="_blank" rel="noopener">واتساب</a>
              </dd>
            </div>
            <div><dt>العنوان</dt><dd>${esc(order.city)} — ${esc(order.area)}</dd></div>
            ${order.notes ? `<div><dt>ملاحظات</dt><dd>${esc(order.notes)}</dd></div>` : ''}
            <div>
              <dt>الدفع</dt>
              <dd>${PAYMENT[order.payment] || esc(order.payment)}${
                order.txn ? ` · رقم العملية: <span dir="ltr">${esc(order.txn)}</span>` : ''
              }</dd>
            </div>
          </dl>
          <ul class="admin-order-items">${items}</ul>
        </div>

        <footer class="admin-order-controls">
          <label class="field">
            <span>حالة التوصيل</span>
            <select data-field="status">${statusOptions}</select>
          </label>
          <label class="admin-paid">
            <input type="checkbox" data-field="paid"${order.paid ? ' checked' : ''} />
            <span>${order.paid ? 'مدفوع' : 'غير مدفوع'}</span>
          </label>
        </footer>
      </article>`;
}

function renderOrders() {
  const list = orders.filter(matches);
  root.querySelector('.admin-orders').innerHTML = list.length
    ? list.map(orderMarkup).join('')
    : '<p class="admin-empty">لا توجد طلبات مطابقة.</p>';
}

async function updateOrder(id, changes) {
  const order = orders.find((o) => o.id === id);
  const before = { status: order.status, paid: order.paid };
  Object.assign(order, changes);
  renderStats();

  const { error } = await supabase
    .from('orders')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    Object.assign(order, before);
    window.alert('تعذّر حفظ التغيير، حاولي مرة أخرى.');
  }
  renderStats();
  renderOrders();
}

// Every status/payment change is confirmed first, so a stray tap can't
// tell a customer their order is on the way when it isn't.
function confirmTitle(order, field, value) {
  const who = `${esc(order.id)} — ${esc(order.name)}`;
  if (field === 'paid') {
    return value
      ? `تأكيد أن الطلب ${who} <strong>مدفوع</strong>؟`
      : `إرجاع الطلب ${who} إلى <strong>غير مدفوع</strong>؟`;
  }
  return `تغيير حالة الطلب ${who} إلى <strong>«${STATUS[value]}»</strong>؟`;
}

root.addEventListener('change', async (event) => {
  const control = event.target.closest('[data-field]');
  const card = control && control.closest('[data-order]');
  if (!card) return;
  const order = orders.find((o) => o.id === card.dataset.order);
  const field = control.dataset.field;
  const value = control.type === 'checkbox' ? control.checked : control.value;

  const answer = await confirmDialog({
    title: confirmTitle(order, field, value),
    confirmLabel: 'نعم، احفظي التغيير',
    cancelLabel: 'تراجع',
    danger: value === 'cancelled' || (field === 'paid' && !value),
  });
  if (answer) updateOrder(order.id, { [field]: value });
  else renderOrders(); // put the select/switch back as it was
});

document.getElementById('admin-refresh').addEventListener('click', loadDashboard);
document.getElementById('admin-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  unmountAssistant();
  showLogin();
});

/* ---------------------------------- start -------------------------------- */

if (!supabase) {
  message(
    'لوحة الطلبات غير مفعّلة بعد',
    'أضيفي رابط Supabase ومفتاحه في src/supabase.js لتفعيل حفظ الطلبات.',
  );
} else {
  const { data } = await supabase.auth.getSession();
  if (data.session) loadDashboard();
  else showLogin();
}
