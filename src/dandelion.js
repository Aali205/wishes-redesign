// ---------------------------------------------------------------------------
// Signature effect: "make a wish". A dandelion clock drawn in <canvas 2D>.
//
// Head mode (home hero, contact page): ~150 seeds sit on a slowly turning
// sphere (Fibonacci points, projected to 2D with depth). Moving the pointer or
// a finger across the head, pressing the "blow" button, or scrolling the hero
// away releases seeds. Free seeds ride a soft wind field, turn with their
// velocity and fade out; empty sockets regrow after a few seconds.
// Drift mode (page heads, CTA): no head, a few seeds float across.
//
// Everything is plain canvas: no libraries. The loop only runs while the
// canvas is on screen and the tab is visible. Reduced motion draws one still
// frame (a full head / scattered seeds) and releases seeds instantly.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

const COLORS = {
  fluff: [255, 244, 236], // pappus filaments
  gold: [242, 196, 107], // achene glow (--gold)
  stem: [150, 128, 170],
};
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

/**
 * @param {HTMLCanvasElement} canvas  fills its positioned parent
 * @param {object} opts
 * @param {HTMLElement} [opts.anchor]   element the head is centred on (head mode)
 * @param {number} [opts.seeds=150]
 * @param {(n:number)=>void} [opts.onRelease]  called with the running total
 * @param {HTMLElement} [opts.windTarget] pointer events are read from here
 */
export function createDandelion(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headMode = Boolean(opts.anchor);
  const N = opts.seeds ?? 150;
  const host = canvas.parentElement;
  const windTarget = opts.windTarget || host;

  let W = 0, H = 0, dpr = 1;
  let head = { x: 0, y: 0, R: 100 };
  let windDir = 1; // +1 blows to the right (towards the text in RTL)
  let t = 0; // time in 60fps frames
  let spin = 0;
  let released = 0;
  let running = false;
  let visible = true;
  let bloom = headMode && !reduced ? 0 : 1; // intro growth (0 → 1)
  let bloomStarted = !headMode || reduced;
  let gust = 0; // extra wind from scrolling
  let nextIdle = 180;

  // Sockets on the head: unit direction on a sphere, grow state 0..1.
  const sockets = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const th = i * GOLDEN;
    sockets.push({
      x: Math.cos(th) * r,
      y,
      z: Math.sin(th) * r,
      g: 1, // grown amount
      off: false,
      offAt: 0,
      delay: (1 - Math.abs(y)) * 30 + (i % 7) * 3, // bloom stagger
      tip: { x: 0, y: 0, z: 0 },
    });
  }

  /** Free-flying seeds. */
  const flyers = [];

  // Pointer tracking (screen px, velocity in px/frame, eased).
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false, last: 0 };

  function resize() {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (headMode) {
      const a = opts.anchor.getBoundingClientRect();
      head.x = a.left - rect.left + a.width / 2;
      head.y = a.top - rect.top + a.height * 0.4;
      head.R = clamp(Math.min(a.width, a.height) * 0.36, 70, 230);
      windDir = head.x < W / 2 ? 1 : -1;
    } else {
      windDir = document.dir === 'rtl' ? -1 : 1;
    }
    if (reduced || !running) draw();
  }

  /* ------------------------------ wind field ----------------------------- */
  function wind(x, y) {
    const base = 0.35 + gust * 1.4;
    return {
      x: windDir * base + 0.35 * Math.sin(y * 0.006 + t * 0.011) + 0.15 * Math.sin(t * 0.004 + x * 0.002),
      y: -0.12 - gust * 0.9 + 0.25 * Math.cos(x * 0.005 + t * 0.009),
    };
  }

  function spawnFree(x, y, vx, vy, scale) {
    if (flyers.length > 220) flyers.shift();
    flyers.push({
      x, y, vx, vy,
      a: Math.atan2(vy, vx) + Math.PI / 2, // umbrella points against motion
      spin: rand(-0.02, 0.02),
      life: 0,
      max: rand(360, 620),
      s: scale ?? rand(0.8, 1.1),
    });
  }

  function release(sock, vx, vy) {
    if (sock.off || sock.g < 0.95) return false;
    sock.off = true;
    sock.offAt = t;
    sock.g = 0;
    spawnFree(sock.tip.x, sock.tip.y, vx, vy, head.R / 150);
    released += 1;
    opts.onRelease?.(released);
    return true;
  }

  /** Public: a gust from the button (keyboard-friendly way to blow). */
  function blow(count = 22) {
    const cands = sockets.filter((s) => !s.off && s.g > 0.95);
    // Prefer the seeds on the windward side and facing the viewer.
    cands.sort((a, b) => b.x * windDir + b.z * 0.4 - (a.x * windDir + a.z * 0.4));
    cands.slice(0, count).forEach((s, i) => {
      release(s, windDir * rand(2.2, 4.2), rand(-2.4, -0.6) - i * 0.03);
    });
    if (reduced) draw();
    else wake();
  }

  /* ------------------------------ simulation ----------------------------- */
  function step(dt) {
    t += dt;
    spin += 0.0016 * dt;
    gust *= Math.pow(0.94, dt);

    if (headMode && bloomStarted && bloom < 1) bloom = Math.min(1, bloom + dt / 90);

    const cs = Math.cos(spin), sn = Math.sin(spin);
    const sway = Math.sin(t * 0.012) * 0.04;
    const pSpeed = Math.hypot(pointer.vx, pointer.vy);

    if (headMode) {
      for (const s of sockets) {
        // rotate around the vertical axis, then a gentle sway tilt
        const x = s.x * cs - s.z * sn;
        const z = s.x * sn + s.z * cs;
        const y = s.y;
        s.tip.x = head.x + (x + y * sway) * head.R;
        s.tip.y = head.y - y * head.R;
        s.tip.z = z;
        s.px = x; s.py = y;

        if (s.off && t - s.offAt > 300) {
          s.off = false; // regrow after ~5s
        }
        if (!s.off && s.g < 1) s.g = Math.min(1, s.g + dt / 70);

        // Pointer wind: seeds near a moving pointer let go.
        if (pointer.active && pSpeed > 3 && !s.off && s.g > 0.95) {
          const d = Math.hypot(s.tip.x - pointer.x, s.tip.y - pointer.y);
          if (d < head.R * 0.32 + pSpeed * 2) {
            release(s, pointer.vx * 0.22 + windDir * 0.8, pointer.vy * 0.22 - 1);
          }
        }
      }

      // Ambient: now and then one seed drifts off by itself.
      if (bloom >= 1 && t > nextIdle) {
        nextIdle = t + rand(150, 260);
        const front = sockets.filter((s) => !s.off && s.g >= 1 && s.tip.z > 0.2 && s.px * windDir > 0.2);
        if (front.length) release(front[(Math.random() * front.length) | 0], windDir * 1.2, -0.8);
      }
    } else if (flyers.length < 12 && Math.random() < 0.02 * dt) {
      // drift mode: seeds enter from the upwind edge
      const x = windDir > 0 ? -20 : W + 20;
      spawnFree(x, rand(H * 0.2, H * 0.95), windDir * rand(0.4, 0.9), rand(-0.3, 0.1), rand(0.5, 0.9));
    }

    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      const w = wind(f.x, f.y);
      const k = 1 - Math.pow(0.985, dt); // drag towards the wind
      f.vx += (w.x - f.vx) * k * 1.4;
      f.vy += (w.y - f.vy) * k * 1.4;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const target = Math.atan2(f.vy, f.vx) + Math.PI / 2;
      let da = ((target - f.a + Math.PI * 3) % TAU) - Math.PI;
      f.a += da * 0.04 * dt + f.spin * dt;
      f.life += dt;
      if (f.life > f.max || f.x < -80 || f.x > W + 80 || f.y < -80 || f.y > H + 80) flyers.splice(i, 1);
    }

    pointer.vx *= Math.pow(0.8, dt);
    pointer.vy *= Math.pow(0.8, dt);
  }

  /* -------------------------------- drawing ------------------------------ */
  function drawPappus(x, y, ang, len, spread, alpha, filaments = 9) {
    ctx.strokeStyle = rgba(COLORS.fluff, alpha);
    ctx.beginPath();
    for (let k = 0; k < filaments; k++) {
      const a = ang - spread + (2 * spread * k) / (filaments - 1);
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    }
    ctx.stroke();
  }

  function drawHead() {
    const R = head.R;
    // stem: a soft curve from below the head to the bottom edge
    ctx.lineWidth = Math.max(1.5, R * 0.018);
    ctx.strokeStyle = rgba(COLORS.stem, 0.55);
    ctx.beginPath();
    const sx = head.x + Math.sin(t * 0.012) * R * 0.04;
    ctx.moveTo(sx, head.y + R * 0.08);
    ctx.quadraticCurveTo(head.x + R * 0.12, head.y + R * 1.6, head.x + R * 0.42 * -windDir, H + 10);
    ctx.stroke();

    const order = sockets.slice().sort((a, b) => a.tip.z - b.tip.z);
    ctx.lineCap = 'round';
    for (const s of order) {
      const g = s.off ? 0 : Math.min(s.g, clamp((bloom * 120 - s.delay) / 60, 0, 1));
      if (g <= 0.02) continue;
      const depth = (s.tip.z + 1) / 2; // 0 back .. 1 front
      const alpha = (0.12 + depth * 0.68) * g;
      const bx = head.x + (s.tip.x - head.x) * 0.16;
      const by = head.y + (s.tip.y - head.y) * 0.16;
      const tx = head.x + (s.tip.x - head.x) * (0.16 + 0.56 * g);
      const ty = head.y + (s.tip.y - head.y) * (0.16 + 0.56 * g);
      // beak
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba(COLORS.fluff, alpha * 0.4);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // umbrella: wide when the seed faces us, a narrow fan when side-on
      const proj = Math.hypot(s.px, s.py);
      const ang = Math.atan2(-s.py, s.px);
      const spread = 0.55 + (1 - proj) * 2.4;
      drawPappus(tx, ty, ang, R * 0.3 * g * (0.6 + 0.4 * proj), spread, alpha * 0.5, depth > 0.5 ? 8 : 5);
    }
    // receptacle
    ctx.fillStyle = rgba(COLORS.gold, 0.9 * Math.min(1, bloom * 3));
    ctx.beginPath();
    ctx.arc(head.x, head.y, R * 0.05, 0, TAU);
    ctx.fill();
  }

  function drawFlyers() {
    ctx.lineCap = 'round';
    for (const f of flyers) {
      const fadeIn = clamp(f.life / 20, 0, 1);
      const fadeOut = clamp((f.max - f.life) / 90, 0, 1);
      const alpha = 0.85 * fadeIn * fadeOut;
      const L = 34 * f.s;
      const dx = Math.cos(f.a - Math.PI / 2), dy = Math.sin(f.a - Math.PI / 2);
      // achene at the bottom (glows gold), beak, umbrella on top
      const ax = f.x - dx * L * 0.55, ay = f.y - dy * L * 0.55;
      const px = f.x + dx * L * 0.45, py = f.y + dy * L * 0.45;
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba(COLORS.fluff, alpha * 0.8);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(px, py);
      ctx.stroke();
      drawPappus(px, py, Math.atan2(dy, dx), L * 0.42, 1.05, alpha * 0.9, 9);
      ctx.fillStyle = rgba(COLORS.gold, alpha);
      ctx.beginPath();
      ctx.arc(ax, ay, 1.8 * f.s, 0, TAU);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (headMode) {
      if (reduced) step(0); // compute tip positions once
      drawHead();
    }
    drawFlyers();
  }

  /* --------------------------------- loop -------------------------------- */
  let last = 0;
  function frame(now) {
    if (!running) return;
    const dt = last ? clamp((now - last) / 16.667, 0.2, 3) : 1;
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }
  function wake() {
    if (reduced || running || !visible || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  function sleep() {
    running = false;
  }

  /* -------------------------------- inputs ------------------------------- */
  if (!reduced) {
    windTarget.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const now = performance.now();
      if (pointer.active && now - pointer.last < 100) {
        const k = 16.667 / Math.max(8, now - pointer.last);
        pointer.vx = pointer.vx * 0.5 + (x - pointer.x) * k * 0.5;
        pointer.vy = pointer.vy * 0.5 + (y - pointer.y) * k * 0.5;
      }
      pointer.x = x; pointer.y = y; pointer.last = now; pointer.active = true;
    }, { passive: true });
    windTarget.addEventListener('pointerleave', () => { pointer.active = false; });
  }

  // Scroll: as the host leaves the top of the screen, a gust lifts seeds away.
  let lastP = 0;
  function onScroll() {
    const rect = host.getBoundingClientRect();
    const p = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
    const dp = p - lastP;
    lastP = p;
    if (!headMode || reduced || dp <= 0) return;
    gust = Math.min(1.5, gust + dp * 6);
    const n = Math.round(dp * N * 1.6);
    const live = sockets.filter((s) => !s.off && s.g > 0.95);
    for (let i = 0; i < n && live.length; i++) {
      const s = live.splice((Math.random() * live.length) | 0, 1)[0];
      release(s, windDir * rand(1, 3), rand(-3.5, -1.5));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else sleep();
  }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));

  resize();
  if (!reduced && !headMode) {
    // start mid-drift so the band isn't empty on arrival
    for (let i = 0; i < 6; i++) {
      spawnFree(rand(0.05, 0.95) * W, rand(0.2, 0.9) * H, windDir * rand(0.4, 0.9), rand(-0.3, 0.1), rand(0.5, 0.9));
      flyers[flyers.length - 1].life = rand(20, 200);
    }
  }
  if (reduced && !headMode) {
    // a still scatter for drift mode
    for (let i = 0; i < 7; i++) spawnFree(rand(0.05, 0.95) * W, rand(0.15, 0.9) * H, windDir, -0.3, rand(0.5, 0.9));
    flyers.forEach((f) => { f.life = 40; });
  }
  draw();
  wake();

  return {
    blow,
    /** Start the intro growth (called after the preloader). */
    start() {
      bloomStarted = true;
      wake();
    },
    get released() { return released; },
  };
}
