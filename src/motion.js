// ---------------------------------------------------------------------------
// Motion layer for the redesign. Everything here is progressive: without JS
// the content is visible, and with prefers-reduced-motion the effects become
// instant (see the reduced-motion block at the end of style.css).
//
//   startIntro()      first-visit preloader + hero entrance, fires `wishes:ready`
//   splitHeadings()   [data-split] headings rise word by word (Arabic-safe:
//                     whole words, because Arabic letters join)
//   lightStatement()  [data-light] paragraph: words light up with scroll
//   routineStem()     routine page: stem fills, a seed rides down it
//   flyToCart(el)     add-to-cart: a seed floats from the button to the cart
//   initDrifts()      drifting seeds in every dusk [data-drift] band
// ---------------------------------------------------------------------------

import { createDandelion } from './dandelion.js';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let readyFired = false;
function fireReady() {
  if (readyFired) return;
  readyFired = true;
  document.documentElement.classList.add('is-ready');
  dispatchEvent(new Event('wishes:ready'));
}
export function onReady(fn) {
  if (readyFired) fn();
  else addEventListener('wishes:ready', fn, { once: true });
}

/** Preloader: shown once per browser session on the home page. */
export function startIntro() {
  const pre = document.querySelector('.preloader');
  let seen = false;
  try {
    seen = sessionStorage.getItem('wishes-intro') === '1';
    sessionStorage.setItem('wishes-intro', '1');
  } catch {
    /* storage blocked: just show it */
  }
  if (!pre || seen || reduceMotion.matches) {
    pre?.remove();
    // let the first paint happen before the entrance runs
    requestAnimationFrame(() => requestAnimationFrame(fireReady));
    return;
  }
  document.documentElement.classList.add('is-intro');
  // Seed drift (CSS, 1.1s) → the curtain lifts (300ms ease-in).
  setTimeout(() => {
    pre.classList.add('is-leaving');
    fireReady();
    setTimeout(() => {
      pre.remove();
      document.documentElement.classList.remove('is-intro');
    }, 320);
  }, 1250);
}

/** Wrap each word of [data-split] headings so they can rise in turn. */
export function splitHeadings(root = document) {
  root.querySelectorAll('[data-split]:not(.is-split)').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map(
        (w, i) =>
          `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`,
      )
      .join(' ');
    el.classList.add('is-split');
  });
}

/** Scroll-scrubbed word lighting for a statement paragraph. */
export function lightStatement() {
  const el = document.querySelector('[data-light]');
  if (!el) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span>${w}</span>`).join(' ');
  const spans = [...el.children];
  if (reduceMotion.matches) {
    el.classList.add('is-lit');
    return;
  }
  let queued = false;
  const update = () => {
    queued = false;
    const r = el.getBoundingClientRect();
    // 0 when the paragraph's top reaches 85% of the screen, 1 at 35%
    const p = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.5 + r.height * 0.6), 0, 1);
    const lit = p * spans.length;
    spans.forEach((s, i) => s.style.setProperty('--lit', clamp(lit - i, 0, 1).toFixed(2)));
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

/** Routine page: the stem fills and a seed rides down as the steps scroll by. */
export function routineStem() {
  const wrap = document.querySelector('.routine-inner');
  const fill = wrap?.querySelector('.stem-fill');
  const seed = wrap?.querySelector('.stem-seed');
  if (!wrap || !fill) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = wrap.getBoundingClientRect();
    const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
    fill.style.transform = `scaleY(${p.toFixed(4)})`;
    if (seed) seed.style.transform = `translate(-50%, ${(p * (r.height - 60)).toFixed(1)}px)`;
    wrap.querySelectorAll('.step').forEach((step) => {
      const sr = step.getBoundingClientRect();
      step.classList.toggle('is-reached', sr.top < innerHeight * 0.6);
    });
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  addEventListener('resize', update);
  update();
}

/** A seed floats from the add button to the cart icon, then the badge pops. */
export function flyToCart(from) {
  const target = document.querySelector('.cart-link .icon');
  const badge = document.getElementById('cart-count');
  const pop = () => {
    if (!badge || reduceMotion.matches) return;
    badge.classList.remove('is-pop');
    void badge.offsetWidth;
    badge.classList.add('is-pop');
  };
  if (!from || !target || reduceMotion.matches || !from.isConnected) {
    pop();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const seed = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  seed.setAttribute('viewBox', '0 0 40 80');
  seed.setAttribute('class', 'fly-seed');
  seed.setAttribute('aria-hidden', 'true');
  seed.innerHTML = '<use href="#i-seed" />';
  document.body.appendChild(seed);
  const x0 = a.left + a.width / 2 - 12, y0 = a.top + a.height / 2 - 24;
  const x1 = b.left + b.width / 2 - 12, y1 = b.top + b.height / 2 - 24;
  const mx = (x0 + x1) / 2 + (x1 > x0 ? -60 : 60), my = Math.min(y0, y1) - 120;
  // Optical exception to the motion tokens: 700ms so the flight path is readable.
  const anim = seed.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(1)`, opacity: 0 },
      { transform: `translate(${mx}px, ${my}px) rotate(-18deg) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) rotate(8deg) scale(0.5)`, opacity: 0.2 },
    ],
    { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' },
  );
  anim.onfinish = () => {
    seed.remove();
    pop();
  };
}

/** Drifting seeds behind every dusk band with [data-drift]. */
export function initDrifts() {
  document.querySelectorAll('[data-drift] > .drift-canvas').forEach((canvas) => {
    createDandelion(canvas);
  });
}

/** Brand ribbon: slides sideways with the scroll instead of looping forever. */
export function marqueeDrift() {
  const band = document.querySelector('.marquee');
  const track = band?.querySelector('.marquee-track');
  if (!track || reduceMotion.matches) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = band.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    // RTL: the track overflows to the left, so drifting right keeps it filled.
    const x = Math.max(0, (innerHeight - r.top) * 0.35);
    track.style.setProperty('--drift', `${x.toFixed(1)}px`);
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}
