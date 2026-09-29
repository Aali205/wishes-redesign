// ---------------------------------------------------------------------------
// Admin chat assistant: a floating chat panel on the dashboard. The admin can
// write or send a product photo; the "product-assistant" Edge Function
// (Gemini) replies and may propose one catalogue change, which is shown as a
// card and applied here only after the admin confirms it.
// ---------------------------------------------------------------------------

import { CATEGORY_LABELS, esc, formatPrice } from './data.js';
import { confirmDialog } from './ui.js';

const BUCKET = 'product-images';
const MAX_SIDE = 1024;

const ERRORS = {
  no_api_key: 'المساعد غير مفعّل بعد: مفتاح Gemini غير مضاف في Supabase.',
  rate_limited: 'وصل المساعد إلى الحد اليومي المجاني. حاولي بعد قليل.',
  not_admin: 'هذا الحساب لا يملك صلاحية الإدارة.',
  bad_image: 'تعذّر قراءة الصورة، جرّبي صورة أخرى (JPG أو PNG).',
};

let supabase;
let history = []; // { role: 'user' | 'model', text, image? }
let lastPhoto = null; // { blob, base64, url } of the most recent photo sent
let pendingPhoto = null;
let busy = false;

const $ = (sel) => document.querySelector(sel);

/* -------------------------------- photos --------------------------------- */

/** Shrinks a photo to at most 1024px and returns it as JPEG. */
async function preparePhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  return { blob, base64, url: URL.createObjectURL(blob) };
}

async function uploadPhoto(photo, productId) {
  const path = `${productId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, photo.blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/* --------------------------------- chat ---------------------------------- */

function bubble(role, html) {
  const list = $('.assistant-messages');
  const el = document.createElement('div');
  el.className = `assistant-msg is-${role}`;
  el.innerHTML = html;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
  return el;
}

const textHtml = (text) => esc(text).replace(/\n/g, '<br />');

async function ask() {
  // Only the newest photo is sent as an image; older turns go as text.
  const messages = history.map((m, i) => ({
    role: m.role,
    text: m.text || (m.image ? '[صورة منتج]' : ''),
    ...(i === history.length - 1 && m.image
      ? { image: { mimeType: 'image/jpeg', data: m.image } }
      : {}),
  }));
  const { data, error } = await supabase.functions.invoke('product-assistant', {
    body: { messages },
  });
  if (error) {
    let code = '';
    try {
      code = (await error.context.json()).error;
    } catch {
      /* not a JSON error body */
    }
    throw new Error(ERRORS[code] || 'تعذّر الوصول إلى المساعد، حاولي مرة أخرى.');
  }
  return data;
}

async function send(event) {
  event.preventDefault();
  if (busy) return;
  const input = $('.assistant-input');
  const text = input.value.trim();
  if (!text && !pendingPhoto) return;

  const photo = pendingPhoto;
  clearPendingPhoto();
  input.value = '';
  if (photo) lastPhoto = photo;

  bubble(
    'user',
    `${photo ? `<img src="${photo.url}" alt="" />` : ''}${text ? `<p>${textHtml(text)}</p>` : ''}`,
  );
  history.push({ role: 'user', text, image: photo?.base64 });

  busy = true;
  const typing = bubble('model', '<p class="assistant-typing"><span></span><span></span><span></span></p>');
  try {
    const { reply, proposal } = await ask();
    typing.remove();
    history.push({ role: 'model', text: reply });
    bubble('model', `<p>${textHtml(reply)}</p>`);
    if (proposal) showProposal(proposal, history.length - 1);
  } catch (err) {
    typing.remove();
    history.pop(); // let the admin simply resend
    bubble('error', `<p>${esc(err.message)}</p>`);
  } finally {
    busy = false;
  }
}

/* ------------------------------- proposals ------------------------------- */

function row(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function proposalRows(p, current) {
  const change = (label, key, format = esc) => {
    if (!(key in p)) return '';
    const before = current && current[key] != null ? `<s>${format(current[key])}</s> ← ` : '';
    return row(label, `${before}<strong>${format(p[key])}</strong>`);
  };
  return [
    change('الاسم', 'name'),
    change('القسم', 'category', (v) => esc(CATEGORY_LABELS[v] || v)),
    change('السعر', 'price', (v) => esc(formatPrice(Number(v)))),
    change('الكمية', 'stock'),
    change('الوصف', 'desc'),
    change('التفاصيل', 'details'),
    change('الشارة', 'tag'),
  ].join('');
}

async function showProposal(p, historyIndex) {
  let current = null;
  if (p.product_id) {
    const { data } = await supabase
      .from('products')
      .select('id, name, category, price, stock, desc, details, tag, image')
      .eq('id', p.product_id)
      .maybeSingle();
    current = data;
  }

  const titles = {
    add: 'إضافة منتج جديد',
    update: `تعديل: ${esc(current?.name || p.product_id)}`,
    delete: `حذف: ${esc(current?.name || p.product_id)}`,
  };
  const photo = p.use_photo && lastPhoto ? lastPhoto : null;
  const image = photo ? photo.url : p.type !== 'add' ? current?.image : '';

  const card = bubble(
    'proposal',
    `
      <h4>${titles[p.type]}</h4>
      ${image ? `<img src="${esc(image)}" alt="" />` : ''}
      ${p.type === 'delete' ? '' : `<dl>${proposalRows(p, p.type === 'update' ? current : null)}</dl>`}
      ${photo && p.type === 'update' ? '<p class="assistant-note">ستُستبدل صورة المنتج بالصورة المرسلة.</p>' : ''}
      <div class="assistant-card-actions">
        <button type="button" class="btn ${p.type === 'delete' ? 'btn-danger' : 'btn-primary'} btn-small" data-apply>
          ${p.type === 'add' ? 'أضيفي المنتج' : p.type === 'delete' ? 'احذفي المنتج' : 'احفظي التعديل'}
        </button>
        <button type="button" class="btn btn-ghost btn-small" data-dismiss>إلغاء</button>
      </div>`,
  );

  const settle = (note, cssClass) => {
    card.querySelector('.assistant-card-actions').innerHTML =
      `<p class="assistant-note ${cssClass}">${note}</p>`;
    // Tell the assistant what happened so the next reply knows the outcome.
    history[historyIndex].text += `\n[${note}]`;
  };

  card.querySelector('[data-dismiss]').addEventListener('click', () =>
    settle('ألغت المسؤولة هذا الاقتراح', 'is-muted'),
  );

  card.querySelector('[data-apply]').addEventListener('click', async (event) => {
    if (p.type === 'delete') {
      const ok = await confirmDialog({
        title: `حذف <strong>${esc(current?.name || p.product_id)}</strong> من المتجر نهائياً؟`,
        confirmLabel: 'نعم، احذفيه',
        cancelLabel: 'تراجع',
        danger: true,
      });
      if (!ok) return;
    }
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    try {
      const doneNote = await apply(p, photo, current);
      settle(`✓ ${doneNote}`, 'is-done');
    } catch (err) {
      button.disabled = false;
      button.textContent = 'حاولي مجدداً';
      bubble('error', `<p>تعذّر الحفظ: ${esc(err.message || '')}</p>`);
    }
  });
}

const FIELDS = ['name', 'desc', 'details', 'category', 'price', 'stock', 'tag'];

async function apply(p, photo, current) {
  if (p.type === 'delete') {
    const { error } = await supabase.from('products').delete().eq('id', p.product_id);
    if (error) throw error;
    removeStoredPhoto(current?.image);
    return 'تم حذف المنتج';
  }

  const changes = Object.fromEntries(
    FIELDS.filter((key) => key in p).map((key) => [key, p[key]]),
  );

  if (p.type === 'add') {
    const id = `p-${Math.random().toString(36).slice(2, 10)}`;
    const image = photo ? await uploadPhoto(photo, id) : './images/wishes-logo.png';
    const { error } = await supabase.from('products').insert({
      ...changes,
      id,
      image,
      sort: -Math.floor(Date.now() / 1000), // newest first
    });
    if (error) throw error;
    return 'تمت إضافة المنتج إلى المتجر';
  }

  if (photo) changes.image = await uploadPhoto(photo, p.product_id);
  const { error } = await supabase
    .from('products')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', p.product_id);
  if (error) throw error;
  if (photo) removeStoredPhoto(current?.image);
  return 'تم حفظ التعديل';
}

/** Deletes an old uploaded photo (built-in site images are left alone). */
function removeStoredPhoto(url) {
  const marker = `/${BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  const path = url.split(marker)[1];
  supabase.storage.from(BUCKET).remove([path]);
}

/* ---------------------------------- UI ----------------------------------- */

function clearPendingPhoto() {
  pendingPhoto = null;
  $('.assistant-preview').hidden = true;
  $('.assistant-file').value = '';
}

export function mountAssistant(client) {
  if (document.querySelector('.assistant')) return;
  supabase = client;

  const wrap = document.createElement('div');
  wrap.className = 'assistant';
  wrap.innerHTML = `
    <button type="button" class="assistant-toggle" aria-expanded="false" aria-controls="assistant-panel">
      <span aria-hidden="true">✦</span> مساعد المنتجات
    </button>
    <section class="assistant-panel" id="assistant-panel" hidden aria-label="مساعد المنتجات">
      <header class="assistant-head">
        <div>
          <strong>مساعد Wishes</strong>
          <small>أضيفي، عدّلي أو احذفي منتجات بالكلام أو بصورة</small>
        </div>
        <button type="button" class="assistant-close" aria-label="إغلاق">×</button>
      </header>
      <div class="assistant-messages" aria-live="polite">
        <div class="assistant-msg is-model">
          <p>أهلاً! أرسلي صورة منتج مع السعر والكمية وسأجهّزه لكِ، أو اطلبي مثلاً: «زيدي كمية بادي مست 5» أو «احذفي سيت كايالي».</p>
        </div>
      </div>
      <form class="assistant-form">
        <div class="assistant-preview" hidden>
          <img alt="" />
          <button type="button" class="assistant-preview-remove" aria-label="إزالة الصورة">×</button>
        </div>
        <div class="assistant-row">
          <label class="assistant-attach" aria-label="إرفاق صورة منتج">
            <input type="file" class="assistant-file" accept="image/*" hidden />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </label>
          <textarea class="assistant-input" rows="1" placeholder="اكتبي رسالتك…" aria-label="رسالتك"></textarea>
          <button type="submit" class="btn btn-primary btn-small">إرسال</button>
        </div>
      </form>
    </section>`;
  document.body.appendChild(wrap);

  const toggle = wrap.querySelector('.assistant-toggle');
  const panel = wrap.querySelector('.assistant-panel');
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) wrap.querySelector('.assistant-input').focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  wrap.querySelector('.assistant-close').addEventListener('click', () => setOpen(false));

  wrap.querySelector('.assistant-form').addEventListener('submit', send);
  wrap.querySelector('.assistant-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      wrap.querySelector('.assistant-form').requestSubmit();
    }
  });

  wrap.querySelector('.assistant-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      pendingPhoto = await preparePhoto(file);
      const preview = wrap.querySelector('.assistant-preview');
      preview.querySelector('img').src = pendingPhoto.url;
      preview.hidden = false;
    } catch {
      bubble('error', `<p>${ERRORS.bad_image}</p>`);
    }
  });
  wrap
    .querySelector('.assistant-preview-remove')
    .addEventListener('click', clearPendingPhoto);
}

export function unmountAssistant() {
  document.querySelector('.assistant')?.remove();
  history = [];
  lastPhoto = null;
  pendingPhoto = null;
}
