// ---------------------------------------------------------------------------
// Admin product assistant (Supabase Edge Function).
//
// The dashboard sends the chat so far (plus an optional product photo); this
// function checks the caller is an admin, asks Gemini for a reply and at most
// one proposed catalogue change, validates that proposal and returns it.
// It never changes the catalogue itself: the dashboard applies a proposal only
// after the admin confirms it, using the admin's own session (so the database
// rules in products.sql still decide what's allowed).
//
// Secrets: GEMINI_API_KEY (required), GEMINI_MODEL (optional).
// ---------------------------------------------------------------------------

import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
// The publishable key is public (it's in the site's JS); it's only a fallback
// for projects that don't expose SUPABASE_ANON_KEY to functions.
const PUBLISHABLE_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_3FkKaEcOVBsTDidjllebLg_MTFcTbGA';
const MAX_MESSAGES = 16;
const MAX_TEXT = 2000;
const MAX_IMAGE_BASE64 = 6_000_000; // ~4.5 MB image
const CATEGORIES = ['fragrance', 'body', 'hair', 'makeup'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const STORE_PROFILE = `
Wishes ("Where wishes come true") is an online beauty store in Syria selling
original makeup, skincare, body care, hair care and fragrances. Instagram:
@wishes.sy (https://www.instagram.com/wishes.sy/), orders and questions by
Instagram DM. Values: 100% original products from trusted sources, honest
personal advice by skin type, every order gift-wrapped.

Partners:
- Lashango: lashes and eye beauty. Wishes is the sole agent in Syria. @lashango
- Aliona Cosmetics: high-quality, elegant cosmetics. Sole agent in Syria. @aliona.cosmetics
- IBRAQ Perfumes (Ibrahim Al-Qurashi): original Saudi perfumes and perfume oils
  with strong projection and long wear. Sole agent in Syria. @ibraq.iq
- Heaven Beauty: Lebanese vegan, cruelty-free makeup, known for heart-shaped lip
  and cheek tints. Partner. @heavenbeauty.lb
- Milad Hannoun Beauty: luxury cosmetics by Damascus makeup artist Milad Hannoun.
  Partner. @miladhannounbeauty

How ordering works on the site: customers add products to the cart, enter name,
phone, city and address, then pay cash on delivery or pay now by Sham Cash
transfer. Delivery fee depends on the area. Customers follow each order on the
"رحلة طلباتي" page: new -> confirmed -> out for delivery -> delivered (or cancelled).
Prices are in US dollars ($).
Skincare tip the store shares: cleanse, moisturise, and always use sunscreen.
`.trim();

function systemPrompt(catalogue: unknown[]) {
  return `
You are the product assistant inside the private admin dashboard of the Wishes
beauty store. You talk with the store's admin (usually in Arabic; always reply in
the language the admin writes in, Arabic by default, warm and brief).

## What you know
${STORE_PROFILE}

## Scope
You only know about Wishes, what it does, its products and its partner brands.
If the admin asks about anything else (general knowledge, other shops, news,
coding, homework, personal advice, etc.), do not answer it, not even partly.
Reply in one or two sentences that you are the Wishes assistant and only know
about Wishes, what it does and its partners (Lashango, Aliona Cosmetics, IBRAQ,
Heaven Beauty, Milad Hannoun Beauty), and offer help with the products instead.
Recognising a product photo, or describing a beauty product the store sells or
might sell, is in scope.

## Current catalogue (JSON; stock null = not tracked)
${JSON.stringify(catalogue)}

Categories: fragrance = عطور, body = عناية بالجسم, hair = عناية بالشعر, makeup = مكياج.

## Managing products
You can propose exactly one change per reply by setting "action":
- "add": a new product. Needs name, desc, details, category, price and stock.
  When the admin sends a photo, identify the product (brand, line, type, size if
  visible) and write the Arabic texts in the store's style: name like
  "<product> – <brand>" (e.g. "زبدة الجسم – ذا بودي شوب"), desc one short line
  (max ~110 characters), details 1-3 sentences. Set use_photo true when the
  admin's photo should be the product image.
  Never guess the price or the quantity: they must come from the admin. If
  either is missing, set action "none", show what you recognised, and ask for them.
  Optional tag: a short badge such as "جديد" or "الأكثر مبيعاً", only if the admin wants one.
- "update": change an existing product. product_id must be exactly one id from
  the catalogue. Include only the fields that change. For "add 5 more" style
  requests set stock to the new total (current stock + amount; treat null as 0)
  and say the new total. Set use_photo true only if the admin wants the photo
  they sent to replace the product image.
- "delete": remove a product. product_id must be exactly one id from the catalogue.
- "none": just talking, answering, or asking a question.
If you are unsure which product the admin means, ask (action "none") and list the
closest matches by name. The dashboard asks the admin to confirm every change
before it happens, so phrase proposals as proposals ("سأضيف..."), never as done.
Never invent facts about partners or products that you are not told here or
can't see in the photo.
`.trim();
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Message shown to the admin.' },
    action: { type: 'string', enum: ['none', 'add', 'update', 'delete'] },
    product_id: { type: 'string', description: 'Existing id for update/delete.' },
    name: { type: 'string' },
    desc: { type: 'string' },
    details: { type: 'string' },
    category: { type: 'string', enum: CATEGORIES },
    price: { type: 'number' },
    stock: { type: 'integer' },
    tag: { type: 'string' },
    use_photo: { type: 'boolean' },
  },
  required: ['reply', 'action'],
};

type ChatMessage = {
  role: 'user' | 'model';
  text?: string;
  image?: { mimeType: string; data: string };
};

type Proposal = Record<string, unknown> & { type: string };

/** Keeps only valid, relevant fields of the model's proposal (or null). */
function checkProposal(raw: Record<string, unknown>, ids: Set<string>): Proposal | null {
  const type = raw.action;
  if (type !== 'add' && type !== 'update' && type !== 'delete') return null;

  const out: Proposal = { type };
  const str = (key: string, max: number) => {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim().slice(0, max);
  };

  if (type !== 'add') {
    const id = raw.product_id;
    if (typeof id !== 'string' || !ids.has(id)) return null;
    out.product_id = id;
    if (type === 'delete') return out;
  }

  str('name', 120);
  str('desc', 300);
  str('details', 2000);
  str('tag', 30);
  if (typeof raw.category === 'string' && CATEGORIES.includes(raw.category)) {
    out.category = raw.category;
  }
  if (typeof raw.price === 'number' && raw.price >= 0 && raw.price < 100000) {
    out.price = Math.round(raw.price * 100) / 100;
  }
  if (Number.isInteger(raw.stock) && (raw.stock as number) >= 0) out.stock = raw.stock;
  if (raw.use_photo === true) out.use_photo = true;

  if (type === 'add') {
    const needed = ['name', 'category', 'price', 'stock'];
    if (needed.some((k) => !(k in out))) return null;
    out.desc ??= '';
    out.details ??= '';
  } else if (Object.keys(out).length <= 2) {
    return null; // an update that changes nothing
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Only signed-in admins may use the assistant.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    PUBLISHABLE_KEY,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return json({ error: 'not_admin' }, 403);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'no_api_key' }, 500);

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json({ error: 'bad_request' }, 400);
  }

  const contents = [];
  for (const m of messages) {
    const parts: unknown[] = [];
    if (m.image) {
      const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(m.image.mimeType);
      if (!okType || typeof m.image.data !== 'string' || m.image.data.length > MAX_IMAGE_BASE64) {
        return json({ error: 'bad_image' }, 400);
      }
      parts.push({ inlineData: { mimeType: m.image.mimeType, data: m.image.data } });
    }
    if (typeof m.text === 'string' && m.text.trim()) {
      parts.push({ text: m.text.slice(0, MAX_TEXT) });
    }
    if (!parts.length) continue;
    contents.push({ role: m.role === 'model' ? 'model' : 'user', parts });
  }

  const { data: catalogue, error: catalogueError } = await supabase
    .from('products')
    .select('id, name, category, price, stock, tag, active')
    .order('sort');
  if (catalogueError) return json({ error: 'catalogue_unavailable' }, 500);

  const gemini = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(catalogue) }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (gemini.status === 429) return json({ error: 'rate_limited' }, 429);
  if (!gemini.ok) {
    console.error('Gemini error', gemini.status, await gemini.text());
    return json({ error: 'ai_unavailable' }, 502);
  }

  const result = await gemini.json();
  const candidate = result?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('Unparseable reply', candidate?.finishReason, text.slice(0, 500));
    return json({ error: 'ai_bad_reply' }, 502);
  }

  const ids = new Set((catalogue ?? []).map((p: { id: string }) => p.id));
  return json({
    reply: typeof parsed.reply === 'string' ? parsed.reply : '',
    proposal: checkProposal(parsed, ids),
  });
});
