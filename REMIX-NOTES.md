# Wishes (untitled1): FULL REDESIGN, "The wishing hour"

**Date:** 2026-09-28 18:39 (Riyadh) · **Project:** `WebstormProjects\untitled1` (Wishes / ويشز, a Syrian make-up, skincare and fragrance shop, exclusive agent for Lashango, Aliona Cosmetics and IBRAQ) · **Port:** 5534
**Original files:** untouched. Everything here is a redesigned copy.

**How to open:** double-click `open-site.bat`. It serves `dist\` on http://localhost:5534 (Node's `http-server` if Node is installed, otherwise Python). You need internet for the Google Fonts and for the live Supabase catalogue and orders. Offline, the site still runs with the built-in product list and fallback Arabic fonts.

---

## Design direction and why it fits
Wishes' own line is "جمالك يبدأ بأمنية" ("your beauty starts with a wish") and "Where wishes come true". The old site said this with pink blobs and floating icons. The redesign **stages the wish itself**: a dusk sky over Damascus with a dandelion clock that you blow on to make a wish. Every product is then "a wish granted", shown in a **Damascene arch window**. Shopping pages move to a light "petal" canvas so the pink product photos stay true, and every page opens under the same dusk band. The logo is kept exactly as it was: its pink script glows on dusk.

## Design system (CSS custom properties in `public/style.css`, section 1)
| Token | Hex | Role |
|---|---|---|
| Dusk | `#1F1430` | dark canvas: hero, page heads, about, contact, footer, header |
| Petal | `#F6EEF2` | light canvas for shopping (a cool rose-white, not cream) |
| Ink | `#26142E` | text on petal (secondary `#5B4763`, 7.4:1) |
| Moon / Haze | `#FBF3F7` / `#BBAAC8` | text on dusk (secondary 8.6:1) |
| Wish gold | `#F2C46B` | the seeds' glow, primary CTAs on dusk, focus rings on dusk |
| Damask rose | `#A82D66` | CTAs, prices and links on petal (6.3:1 with white) |

- **Type:** *Aref Ruqaa* for display (Ruqaa calligraphy, like a handwritten wish note, in tune with the script logo) + *Readex Pro* 400/500/600 for text. Perfect-fourth scale from 16px (16 / 21 / 28 / 38 / 50 / 67), fluid `clamp()` for display and hero. Headings use line-height 1.15, body 1.6, and nothing is smaller than 12px. Fallbacks: Traditional Arabic, Sakkal Majalla, Segoe UI and Tahoma.
- **Space:** 4/8 tokens `--s-1…--s-10`, `--gutter: clamp(16px, 4vw, 48px)`, content capped at 1280px, text measure 62ch.
- **Shape by hierarchy:** arches (`999px 999px 16px 16px`) only for product and brand windows, 16px panels, 10px inputs, pills for controls.
- **Depth:** 1px hairlines first, one soft shadow under 0.08 alpha, no glass and no glows.
- **Legacy components** (checkout, invoice, order-journey scenes, admin dashboard, admin AI assistant) keep their structure. They are re-skinned through token aliases (`--pink-*` and `--plum-*` now map to the new palette), with weights capped at 600 and the 12.5px text raised to 12px.

## Motion system
- **Tokens:** 100/150/200/300ms; `--ease-out: cubic-bezier(.16,1,.3,1)` for enters and `--ease-in: cubic-bezier(.7,0,.84,0)` for exits. Only transform and opacity animate (plus colour and border colour on hover).
- **Documented optical exceptions:** `--motion-reveal` 600ms (large scroll reveals and the hero entrance), a 900ms photo settle inside arches, the 1.1s preloader seed drift, and the 700ms add-to-cart seed flight.
- **Pieces:**
  1. **Intro / preloader** (home, once per session): the logo scales in while a seed drifts down, then the curtain lifts (300ms ease-in). The headline lines rise out of masks, then the lead, CTAs and dandelion follow in a stagger. A CSS failsafe hides the preloader after 3s even if JS fails.
  2. **Signature hero: the dandelion clock** (`src/dandelion.js`, see below).
  3. **Pinned scroll section:** the featured-products showcase (8 products, one screen of scroll each). It keeps the original sideways mechanics and adds arch windows, parallax inside the photo, a scrubbed progress hairline and 44px dots.
  4. **Scroll-driven:** word-by-word lighting of the About statement, the Routine page's stem filling with a seed riding down it (steps turn rose as they're reached), the brand ribbon sliding with scroll (no longer an infinite loop), and the hero gust (scrolling the hero away blows its seeds off).
  5. **Reveals:** dusk-band headings rise word by word from masks (whole words, so Arabic joining is kept); partner and category arches settle from a slight zoom; lists stagger by 70ms; product cards rise in as filters change.
  6. **Page transitions:** cross-document View Transitions (`@view-transition { navigation: auto }`). The header stays fixed, the old page fades out (150ms ease-in) and the new one rises in (300ms ease-out). Browsers without support fall back to the page-head word reveal.
  7. **Micro-interactions:** an **add-to-cart seed** floats from the button to the cart icon, then the badge pops. Also: nav underline scale-in, a menu toggle that morphs to ×, a full-screen dusk mobile menu with staggered Ruqaa links, button press (0.98), a dialog rise, the toast, and chip, arrow and link hovers.
- **Reduced motion:** there's no preloader and nothing starts hidden (the head script only adds `.js-motion` when motion is allowed). The dandelion draws one still frame and "blow" removes seeds instantly. The ribbon, showcase parallax, page transitions and journey scenes are static, and the statement is fully lit.

## Signature effect: how the dandelion works
- The canvas is plain 2D, with no libraries. About 150 seeds sit on a **Fibonacci sphere** that turns slowly around its vertical axis, projected to 2D with depth (back seeds dim, front seeds bright).
- Each seed is a beak plus a **pappus umbrella** whose fan widens as it turns towards you. That's why the head reads as a 3D clock.
- **Ways to release seeds:**
  - Move the pointer (or drag a finger) across the head: seeds near a fast-moving pointer let go and take its velocity.
  - Press **انفخي أمنية** (keyboard-friendly): a gust releases the 22 seeds on the windward side.
  - **Scroll the hero away:** a gust proportional to the scroll lifts seeds off.
  - Once in a while, a single seed drifts off on its own.
- **Flight:** free seeds follow a soft sine wind field with drag (frame-rate-independent), turn their umbrella against their velocity, and glow gold at the achene before fading out. Empty sockets regrow after about 5s. A live counter reads "N أمنية طارت" (`aria-live`).
- **Performance:** DPR is capped at 2. The loop runs only while the canvas is on screen and the tab is visible (IntersectionObserver + visibilitychange). Seeds blow towards the text (worked out from the layout, so it's RTL-aware).
- **Drift mode:** the same module, run with no head, puts a few seeds drifting through every dusk page-head band and the home CTA. The Contact page gets its own smaller dandelion.

## Page by page
- **Home:** the old pink blob hero with floating icons is replaced by a dusk hero, a Ruqaa headline and the interactive dandelion.
  - The four hero badges become a quiet "promises" strip.
  - The ribbon is now large Ruqaa words that move with scroll.
  - The pinned showcase uses arch windows on petal.
  - The Instagram CTA is a dusk band with drifting seeds.
- **Partners (شركاؤنا):** the uniform cards are now an editorial list of alternating rows, with logos in arch windows. The three exclusive agencies are marked with a gold dot and "الوكيل الوحيد في سوريا", and partners are labelled "شريك Wishes".
- **Categories:** four tall arch tiles (2×2 on phones) with the Ruqaa name, a one-line description and photo zoom on hover.
- **Products:** a segmented chip filter (the `?cat=` deep links still work) and a 4/3/2-column grid of arch cards. Each card has the category, name, description, price in Ruqaa rose, a 44px stepper and "أضيفي إلى السلة". The sold-out state is kept.
- **Product:** a sticky arched photo next to the details, breadcrumb, price, a buy panel (stepper and add), links to the cart and Instagram, and related products.
- **Routine:** three large step panels along a scroll-filled stem, with a seed riding down it.
- **About:** the story is now a Ruqaa statement that lights up word by word. The four features are a hairline list in gold and haze, next to the logo in a dusk arch.
- **Contact:** a full dusk screen with its own dandelion and the two Instagram CTAs.
- **Cart:** a framed list of lines with arched thumbnails and a sticky invoice. Checkout keeps all its fields, cash on delivery or Sham Cash, and order saving. It now has **blur-first validation** (a field is checked when you leave it and cleared as you type).
- **My orders:** the same journey list, animated order scenes and track form, re-skinned.
- **Admin + AI assistant:** unchanged behaviour, re-skinned through the tokens.
- **Header:** dusk, gold underline for the current page, cart pill with a live count.
  - On narrow screens the menu goes full screen, with a Tab focus loop, Escape to close and focus returned to the toggle.
  - There's a skip link.
- **Footer:** "كل أمنية تبدأ برسالة." in Ruqaa, the Instagram CTA, a two-column link list, the exclusive-agent line and the copyright.

**Features kept:** cart in localStorage (synced across tabs), quantity steppers, confirm dialogs for add and remove, empty states, toast, filters and deep links, product pages, live Supabase catalogue with the built-in fallback, checkout to Supabase, order tracking, and the admin dashboard with its AI assistant. All copy, prices, products and links are exactly as in the original.

## Libraries and build
- **No new libraries.** Everything is vanilla JS and CSS (the cloud workspace can't reach npm or CDNs).
- `@supabase/supabase-js` is now the **official UMD build copied unchanged** from the project's `node_modules` into `public/vendor/supabase.js`. `src/supabase.js` loads it on demand, so the site needs **no bundler** and runs from any static server.
- **dist:** npm was blocked in the cloud, so `dist\` was produced by a small script equivalent to `vite build --base=./`: `public/` goes to the root, the pages and `src/` are copied, and root URLs are made relative. `npm run dev` / `vite build` still work on your PC too.

## Skills used
`frontend-design:frontend-design` (plan, then a review against generic defaults), `vectorlab-ux-skills` motion, reduced-motion, anti-slop, typography, colour-palette and viewports, and `ux-audit` for the final pass. I also used the learning log (frame-rate-independent easing, section progress without ScrollTrigger) and the Mizwala site notes (cross-document view transitions, word-level Arabic splitting, IntersectionObserver-gated loops).

**Plan review against defaults (what I changed before building):**
- A near-black background with gold was drifting towards the "dark + single accent" cliché. I moved to a violet dusk with a rose horizon and gave the shopping pages a petal canvas.
- The rose/gold pairing is tied to the brand's pink photos.
- I dropped the single-word headline accent from the old hero, the arrows on links and the ✦ separators.
- The numbers appear only on the real sequences (showcase slides, routine steps).

## UX audit (catalog defaults, no .ux-profile.md)
**Fixed in this run:**
- Blur-first checkout validation.
- Legacy 700/800 weights reduced to 600.
- 12.5px text raised to 12px.
- 44px hit areas: nav, dots, steppers, footer links, breadcrumb and showcase links.
- The infinite marquee became scroll-linked.
- The mobile-menu focus loop.
- Room kept for the floating Instagram button next to the showcase footer.

**Passing:**
- No page overflow at 375, 390, 1280 or 1440 on any page.
- The destructive confirmations name the product and use a destructive verb.
- No glass, rainbow gradients or cartoon empty states.
- Reduced motion is honoured.
- No console errors.

**Heuristic notes:** product titles inside cards are inline text links (the photo and buttons are the large targets). The page patterns are marketing (home, partners, categories, about, contact, routine), list (products, orders), detail (product) and form (cart and checkout).

## Known limits
- Screenshots were taken in the cloud without the web fonts (fallback Arabic faces), so Aref Ruqaa and Readex Pro look better on your PC.
- The cloud can't reach Supabase, so the catalogue came from the built-in list there.
- Cross-document view transitions need Chrome/Edge 126+ (other browsers just navigate normally).
- The first paint on each page still waits up to 4s for the Supabase catalogue if the network is slow (same as the original). On the home page the preloader covers it.

## How to run
- Double-click `open-site.bat`, or run `npx http-server dist -p 5534`, or `python -m http.server 5534` inside `dist`.
- For development: `npm install` then `npx vite` in this folder. Source pages are at the root, `src/` holds the modules and `public/` the static assets.
