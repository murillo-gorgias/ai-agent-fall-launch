/* AI Agent fall launch page, version 4: every interaction on the page lives here. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const NS = 'http://www.w3.org/2000/svg';

  /* ───────── Easing: real cubic-bezier curves ───────── */
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6) return sy(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 30; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; v < x ? lo = t : hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const E = {
    out: bez(.16, 1, .3, 1),      // arrive and settle, long tail
    inOut: bez(.65, 0, .35, 1),   // travel
    soft: bez(.4, 0, .2, 1),
    run: bez(.45, 0, .25, 1),     // counters: slow start, quick run, gentle stop
    glide: bez(.5, 0, .2, 1),     // travel that leaves promptly and lands softly
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const P = (t, t0, d, e = E.out) => e(clamp((t - t0) / d));

  /* ───────── Bubble emoji: drawn live as SVG, every one the page can spawn, by name ───────── */
  // <bubble-emoji name="smile"> uses the Large drawing (56 px) for anything 32 px and up;
  // add `small` for the Small drawing (24 px, bigger features) at 28 px and below.
  // The look comes from the Bubble Emoji Lab: fine grain measured in screen pixels, thinner face lines,
  // and a hand-drawn wobble that redraws while the pointer is on the emoji (never under reduced motion).
  const LOOK = { grain: .15, contrast: 3, grainPx: 1, weight: .7, wobbleDepth: .5, wobbleWidth: 16 };
  const DRAW = {};
  const INK = /stroke="#1B1A19"/i;
  Object.entries(window.EMOJI || {}).forEach(([n, pair]) => {
    DRAW[n] = {};
    for (const v of ['lg', 'sm']) {
      const W = +pair[v].match(/viewBox="0 0 ([\d.]+)/)[1], s = W / 56;
      const [bubble, ...face] = pair[v].match(/<(path|circle|rect|ellipse|line|polyline|polygon)\b[^>]*\/>/g);
      const thin = el => INK.test(el) ? el.replace(/stroke-width="([\d.]+)"/, (m, w) => `stroke-width="${+(w * LOOK.weight).toFixed(3)}"`) : el;
      DRAW[n][v] = { W, bubble, face: face.map(thin).join(''), freq: +(1 / (LOOK.wobbleWidth * s)).toFixed(4), depth: +(LOOK.wobbleDepth * s * 5).toFixed(3) };
    }
  });
  const NAMES = Object.keys(DRAW);
  const REACT = ['heart', 'thumbs', 'laugh', 'wow', 'love', 'smile', 'party', 'stars', 'sparkle', 'wink', 'hug', 'check'];

  // Grain: grey noise blended in soft light on an opaque copy of the bubble, then cut back to the bubble's own edge.
  // Each emoji measures itself, so the grain stays 1 screen pixel whatever size it is drawn at.
  const GRAIN_FN = ['R', 'G', 'B'].map(c => `<feFunc${c} type="linear" slope="${LOOK.grain * LOOK.contrast}" intercept="${.5 - .5 * LOOK.grain * LOOK.contrast}"/>`).join('');
  const sized = new ResizeObserver(entries => entries.forEach(en => en.target.sizeGrain(en.contentRect.width)));

  let emojiId = 0;
  class BubbleEmoji extends HTMLElement {
    static get observedAttributes() { return ['name', 'small']; }
    get name() { return this.getAttribute('name'); }
    set name(v) { this.setAttribute('name', v); }
    connectedCallback() { if (!this.turb) this.draw(); sized.observe(this); }
    disconnectedCallback() { sized.unobserve(this); }
    attributeChangedCallback() { if (this.isConnected) this.draw(); }
    sizeGrain(px) {
      if (this.grainTurb && px > 0) this.grainTurb.setAttribute('baseFrequency', +(.6 / LOOK.grainPx * px / this.W).toFixed(4));
    }
    draw() {
      const D = DRAW[this.name] && DRAW[this.name][this.hasAttribute('small') ? 'sm' : 'lg'];
      if (!D) return;
      const id = `emo${++emojiId}`, region = `x="0" y="0" width="${D.W}" height="${D.W}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"`;
      this.W = D.W;
      this.seed = 1 + (emojiId * 37) % 900;
      this.innerHTML = `<svg viewBox="0 0 ${D.W} ${D.W}" aria-hidden="true" focusable="false"><defs>` +
        `<filter id="${id}g" ${region}><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="${this.seed}" result="n"/>` +
        `<feColorMatrix in="n" type="matrix" values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1" result="g"/>` +
        `<feComponentTransfer in="g" result="m">${GRAIN_FN}</feComponentTransfer>` +
        `<feComponentTransfer in="SourceGraphic" result="o"><feFuncA type="linear" slope="255" intercept="0"/></feComponentTransfer>` +
        `<feBlend in="m" in2="o" mode="soft-light" result="b"/><feComposite in="b" in2="SourceGraphic" operator="in"/></filter>` +
        `<filter id="${id}w" ${region}><feTurbulence type="fractalNoise" baseFrequency="${D.freq}" numOctaves="2" seed="${this.seed}" result="w"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="w" scale="${D.depth}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>` +
        `<g filter="url(#${id}g)">${D.bubble}</g><g filter="url(#${id}w)">${D.face}</g></svg>`;
      [this.grainTurb, this.turb] = this.querySelectorAll('feTurbulence');
      this.sizeGrain(this.offsetWidth);
    }
  }
  customElements.define('bubble-emoji', BubbleEmoji);
  const emo = (n, small, attrs = '') => `<bubble-emoji name="${n}"${small ? ' small' : ''}${attrs ? ' ' + attrs : ''}></bubble-emoji>`;
  const makeEmo = (n, cls) => { const el = document.createElement('bubble-emoji'); el.name = n; if (cls) el.className = cls; return el; };
  const emojify = html => html.replace(/:([a-z-]+):/g, (m, n) => (DRAW[n] ? emo(n, true, 'class="ie"') : m));

  // Boil: while the pointer is on an emoji (or drags it), its face lines redraw about six times a second.
  // After the pointer leaves, it keeps going for a moment, then settles back on its first drawing.
  const boiling = new Map();
  let boilTimer = 0;
  function boilTick() {
    const now = performance.now();
    for (const [el, until] of boiling) {
      el.step = (el.step || 0) + 1;
      if (now > until || !el.isConnected) { el.step = 0; boiling.delete(el); }
      el.turb.setAttribute('seed', el.seed + (el.step % 3));
    }
    if (!boiling.size) { clearInterval(boilTimer); boilTimer = 0; }
  }
  function boil(el, on) {
    if (RM || !el || !el.turb) return;
    if (on) boiling.set(el, Infinity);
    else if (boiling.has(el)) boiling.set(el, performance.now() + 420);
    if (on && !boilTimer) { boilTick(); boilTimer = setInterval(boilTick, 160); }
  }
  // An emoji boils when the pointer is on it, or on the button or link it sits in.
  const owned = t => {
    if (!t || !t.closest) return [];
    const e = t.closest('bubble-emoji');
    if (e) return [e];
    const host = t.closest('a, button');
    return host ? [...host.querySelectorAll('bubble-emoji')] : [];
  };
  addEventListener('pointerover', e => owned(e.target).forEach(el => boil(el, true)));
  addEventListener('pointerout', e => { const next = owned(e.relatedTarget); owned(e.target).forEach(el => next.includes(el) || boil(el, false)); });
  $$('[data-chat] .msg, [data-type]').forEach(el => (el.innerHTML = emojify(el.innerHTML)));

  /* ───────── Line icons for UI rows (no 3D objects in this version) ───────── */
  const ICON = {
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    parcel: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 3.5h6v3H9zM9 11h6M9 15h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.8 10.6c.7.6 1.3 1.4 1.3 2.4h5c0-1 .6-1.8 1.3-2.4A6 6 0 0 0 12 3z"/>',
    share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  const iconize = (root = document) => $$('[data-icon]', root).forEach(el => {
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#1B1A19" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICON[el.dataset.icon] || ''}</svg>`;
  });
  iconize();

  /* ───────── Toast, bursts ───────── */
  const toastEl = $('.toast');
  let toastT;
  function toast(text, img) {
    toastEl.innerHTML = (img ? emo(img, true) : '') + text;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }
  let live = 0;
  function burst(x, y, opts = {}) {
    if (RM) return;
    const { n = 7, names = REACT, spread = 150, size = 42 } = opts;
    for (let i = 0; i < n && live < 80; i++) {
      const img = makeEmo(pick(names), 'burst');
      img.style.width = img.style.height = `${size * rand(.75, 1.25)}px`;
      document.body.appendChild(img);
      live++;
      const a = rand(0, Math.PI * 2), d = rand(spread * .45, spread), r = rand(-30, 30);
      const s = parseFloat(img.style.width) / 2;
      const x0 = x - s, y0 = y - s, x1 = x0 + Math.cos(a) * d, y1 = y0 + Math.sin(a) * d * .8 - 30;
      img.animate([
        { transform: `translate(${x0}px,${y0}px) scale(.2)`, opacity: 0 },
        { transform: `translate(${(x0 + x1) / 2}px,${(y0 + y1) / 2}px) scale(1.1) rotate(${r / 2}deg)`, opacity: 1, offset: .3 },
        { transform: `translate(${x1}px,${y1}px) scale(1) rotate(${r}deg)`, opacity: 1, offset: .65 },
        { transform: `translate(${x1}px,${y1 - 50}px) scale(.7) rotate(${r * 1.5}deg)`, opacity: 0 }
      ], { duration: rand(1000, 1400), easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { img.remove(); live--; };
    }
  }
  const dragMode = on => document.documentElement.classList.toggle('is-dragging', on);
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // Click on empty space anywhere: reactions pop out.
  let downAt = null, swallow = false;
  const hint = $('.pile-hint');
  addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; if (hint && e.target.closest('.close')) hint.classList.add('gone'); }, true);
  addEventListener('click', e => {
    if (swallow) { swallow = false; return; }
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    if (e.target.closest('a, button, input, label, [data-drag], .msg, .p-card, .divider bubble-emoji, .seg, .opp-card, .share-pop, .cov')) return;
    burst(e.clientX, e.clientY);
    const host = e.target.closest('.pile-host');
    host && host._kick && host._kick(e.clientX, e.clientY);
  });

  /* ═════════════════════ Glass flower ═════════════════════
     The AI Agent flower sits in the hero's blue card, as in the Figma design: a white fade (24%) and an edge
     lit like Figma's Glass effect, bright where the edge faces the light, weaker on the far side, gone in
     between. The outline is sampled once. Each frame the light turns a little and each edge segment is re-lit. */
  const FLOWER_D = 'M901.667 700.925C870.969 700.925 840.015 704.749 809.536 712.287C807.569 695.536 806.55 678.639 806.55 661.997C806.55 645.355 807.569 628.604 809.572 611.707C840.052 619.245 871.005 623.069 901.667 623.069C1015.47 623.069 1119.21 570.74 1165.97 489.715C1196.12 437.496 1196.78 381.125 1167.86 331.017C1138.91 280.873 1089.75 253.27 1029.41 253.27C973.515 253.27 912.082 277.85 860.918 320.711C806.185 366.558 766.42 428.756 745.59 500.931C729.786 494.122 714.965 486.729 700.544 478.39C686.051 470.015 672.249 460.911 658.484 450.678C767.767 337.135 779.202 192.638 742.968 105.204C715.22 38.3455 661.143 0 594.502 0C527.862 0 473.821 38.3455 446.109 105.204C425.462 155.021 421.674 215.907 435.367 276.721C449.896 340.958 482.743 400.935 530.557 450.642C516.828 460.911 502.99 470.015 488.533 478.39C474.258 486.62 459.146 494.195 443.524 500.931C397.094 339.975 263.485 253.27 159.628 253.27C99.3245 253.27 50.1635 280.873 21.2132 330.98C-7.70067 381.088 -7.04519 437.459 23.1433 489.715C69.9007 570.74 173.685 623.069 287.483 623.069C318.145 623.069 349.062 619.282 379.542 611.744C381.508 628.568 382.491 645.428 382.491 661.997C382.491 678.566 381.508 695.39 379.505 712.251C349.025 704.713 318.072 700.925 287.41 700.925C173.612 700.925 69.8643 753.254 23.1068 834.242C-7.04519 886.499 -7.70067 942.87 21.2132 992.978C50.1635 1043.09 99.3244 1070.72 159.665 1070.72C215.563 1070.72 276.996 1046.11 328.196 1003.25C382.892 957.4 422.658 895.238 443.487 823.063C459.292 829.836 474.076 837.265 488.497 845.64C502.917 853.943 517.047 863.266 530.557 873.316C421.274 986.86 409.876 1131.32 446.146 1218.79C473.858 1285.69 527.935 1324.03 594.539 1324.03C661.143 1323.99 715.256 1285.65 742.968 1218.79C763.579 1168.97 767.403 1108.09 753.674 1047.27C739.181 983.036 706.334 923.023 658.484 873.316C672.067 863.193 686.196 853.87 700.544 845.604C714.965 837.265 729.749 829.873 745.554 823.063C791.947 983.947 925.555 1070.69 1029.41 1070.72C1089.72 1070.72 1138.88 1043.12 1167.79 993.014C1196.74 942.906 1196.05 886.535 1165.9 834.279C1119.14 753.291 1015.43 700.925 901.631 700.925H901.667ZM1029.34 340.23C1049.7 340.23 1077.34 346.056 1093.43 373.987C1109.53 401.845 1100.79 428.683 1090.63 446.308C1060.07 499.22 981.016 536.218 898.426 536.218C874.719 536.218 850.867 533.305 827.416 527.551C854.436 436.258 937.682 340.23 1029.34 340.23ZM290.651 536.182C208.061 536.218 129.003 499.256 98.4505 446.345C88.2906 428.72 79.5508 401.881 95.6465 373.987C111.742 346.056 139.381 340.23 159.738 340.23C251.396 340.23 334.641 436.258 361.662 527.551C338.21 533.268 314.358 536.182 290.651 536.182ZM238.14 960.022C211.229 975.535 184.136 983.728 159.701 983.728C139.381 983.728 111.742 977.902 95.6465 950.007C79.5508 922.113 88.2906 895.275 98.4505 877.686C129.003 824.738 208.025 787.776 290.651 787.776C314.358 787.776 338.246 790.69 361.698 796.443C341.16 866.98 296.405 926.337 238.14 960.022ZM533.251 124.577C543.448 106.952 562.311 85.977 594.539 85.977C624.399 85.977 648.543 104.549 662.49 138.27C689.183 202.761 674.07 310.151 594.466 393.105C577.788 375.699 563.331 356.508 551.496 335.969C510.2 264.413 502.662 177.489 533.215 124.577H533.251ZM655.826 1199.45C645.63 1217.08 626.766 1238.09 594.539 1238.09C564.678 1238.09 540.535 1219.48 526.551 1185.76C499.822 1121.27 514.934 1013.84 594.539 930.853C611.253 948.296 625.674 967.487 637.545 988.025C678.877 1059.58 686.379 1146.54 655.826 1199.45ZM725.853 737.851C702.62 747.209 679.678 758.425 657.574 771.171C635.324 784.025 614.13 798.3 594.539 813.668C575.02 798.373 553.826 784.098 531.503 771.171C509.217 758.316 486.275 747.137 463.188 737.814C466.684 713.015 468.468 687.524 468.468 661.997C468.468 636.47 466.72 610.797 463.224 586.144C486.312 576.821 509.254 565.642 531.503 552.824C553.535 540.115 574.692 525.84 594.502 510.363C614.276 525.803 635.47 540.078 657.574 552.824C679.715 565.605 702.693 576.785 725.853 586.144C722.393 611.016 720.609 636.506 720.609 661.997C720.609 687.488 722.357 713.197 725.853 737.851ZM1093.39 950.044C1077.3 977.938 1049.66 983.764 1029.34 983.764H1029.3C937.682 983.764 854.4 887.737 827.379 796.443C850.831 790.69 874.683 787.776 898.39 787.776C981.016 787.776 1060.07 824.738 1090.59 877.65C1100.79 895.275 1109.53 922.149 1093.39 950.044Z';
  const FW = 1189.08, FH = 1324.03;
  let RIM = null;
  function sampleRim() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', FLOWER_D);
    svg.appendChild(path); document.body.appendChild(svg);
    const len = path.getTotalLength(), step = 3, pts = [], segs = [];
    for (let l = 0; l <= len; l += step) { const q = path.getPointAtLength(l); pts.push([q.x, q.y]); }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
      if (d > step * 2.5 || d < 1e-3) { segs.push(null); continue; }        // jump between sub-paths
      let nx = -dy / d, ny = dx / d;
      if (path.isPointInFill(new DOMPoint((x0 + x1) / 2 + nx * 2, (y0 + y1) / 2 + ny * 2))) { nx = -nx; ny = -ny; }   // point outwards
      segs.push({ x0: x0 - nx * .7, y0: y0 - ny * .7, x1: x1 - nx * .7, y1: y1 - ny * .7, a: Math.atan2(ny, nx) });
    }
    svg.remove();
    return segs;
  }
  const LEVELS = 48;
  function paintRim(f, light) {
    const { ctx, k, W, H, x: ox, y: oy, s } = f;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const paths = Array.from({ length: LEVELS }, () => new Path2D());
    let prev = -1;
    for (const g of RIM) {
      if (!g) { prev = -1; continue; }
      const x0 = g.x0 * s + ox, y0 = g.y0 * s + oy, x1 = g.x1 * s + ox, y1 = g.y1 * s + oy;
      if ((x0 < -4 && x1 < -4) || (x0 > W + 4 && x1 > W + 4) || (y0 < -4 && y1 < -4) || (y0 > H + 4 && y1 > H + 4)) { prev = -1; continue; }
      const c = Math.cos(g.a - light);
      const lit = .92 * Math.pow(Math.max(0, c), 2.6) + .4 * Math.pow(Math.max(0, -c), 3.2);
      const b = Math.round(lit * (LEVELS - 1));
      if (b < 1) { prev = -1; continue; }
      if (b !== prev) paths[b].moveTo(x0, y0);
      paths[b].lineTo(x1, y1); prev = b;
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.15;
    for (let b = 1; b < LEVELS; b++) { ctx.strokeStyle = `rgba(255,255,255,${(b / (LEVELS - 1) * .9).toFixed(3)})`; ctx.stroke(paths[b]); }
  }
  const lightAt = t => -2.36 + t * (2 * Math.PI / 30);     // upper-left, one slow turn every 30 s
  const flowers = [];
  let gfId = 0;
  const flowerIO = new IntersectionObserver(ens => ens.forEach(en => { const f = flowers.find(f => f.host === en.target); if (f) f.on = en.isIntersecting; }));
  function makeFlower(host, x = 0, y = 0, s = 1, manual = false) {
    if (!RIM) RIM = sampleRim();
    const id = ++gfId;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gf-fill'); svg.setAttribute('width', FW); svg.setAttribute('height', FH);
    svg.setAttribute('viewBox', `0 0 ${FW} ${FH}`); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs><linearGradient id="gf${id}" x1="26" y1="10.5" x2="594.539" y2="662" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${FLOWER_D}" fill="url(#gf${id})" fill-opacity=".24"/>`;
    const cv = document.createElement('canvas');
    cv.className = 'gf-rim';
    host.prepend(cv); host.prepend(svg);
    const f = { host, svg, cv, ctx: cv.getContext('2d'), x, y, s, k: 1, W: 0, H: 0, on: false, manual, phase: id * 1.1 };
    f.place = (nx, ny, ns = f.s) => { f.x = nx; f.y = ny; f.s = ns; svg.style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px) scale(${ns})`; };
    f.size = () => {
      f.W = host.clientWidth; f.H = host.clientHeight;
      f.k = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      cv.width = Math.round(f.W * f.k); cv.height = Math.round(f.H * f.k);
      if (RM || !f.manual) paintRim(f, lightAt(0) + f.phase);
    };
    f.place(x, y, s); f.size();
    flowers.push(f); flowerIO.observe(host);
    return f;
  }
  let flowerRZ;
  addEventListener('resize', () => { clearTimeout(flowerRZ); flowerRZ = setTimeout(() => flowers.forEach(f => f.size()), 120); });

  /* ═════════════════════ Hero ═════════════════════
     Built from the Figma flow. One master clock drives everything, so any moment can be frozen:
     ?t=4.2 freezes a moment, ?debug shows a scrubber, ?speed=1.2 plays faster. */
  (() => {
    const T = { morph: 5.9, phone: 6.35, text: 6.35, pillIn: 7.1, ai: 7.95, reply: 8.45, clean: 11.55, end: 12.25 };
    const ARRIVE = .68;
    const HICON = {
      ig: '<span class="ico ig"><img src="assets/v3/ig-outline.svg" alt=""></span>',
      fb: '<span class="ico fb"><img src="assets/v3/fb-tile.svg" alt=""></span>',
      wa: '<span class="ico wa"><img src="assets/v3/wa-glyph.svg" alt=""></span>',
    };
    const G = [
      { key: 'ig', preview: null, clear: 9.3, arr: [.5, 2.15, 2.68, 3.05, 3.33, 3.54], msgs: [
        ['maya.wears', 'Are the waxed jackets true to size?'],
        ['jordan.outdoors', 'Do you ship to Canada? Checking before I order.'],
        ['noor.k', 'Replied to your story: need this in olive!'],
        ['ella.makes', 'Will the linen shirts be restocked soon?'],
        ['sam.runs', 'Can I still change the size on my order?'],
        ['maya.wears', 'Are the waxed jackets true to size?'] ] },
      { key: 'fb', preview: 2.75, clear: 10.1, arr: [2.75, 4.05, 4.29, 4.48, 4.63, 4.75], msgs: [
        ['Lena Park', 'Can I swap my tote for the olive one?'],
        ['Theo Martin', "What's your return window on sale items?"],
        ['Priya Shah', "The discount code isn't working at checkout."],
        ['Marco Bianchi', 'Do you have a store in Chicago I can visit?'],
        ['Ava Chen', 'How long does shipping take to Texas?'],
        ['maya.wears', 'Are the waxed jackets true to size?'] ] },
      { key: 'wa', preview: 4.2, clear: 10.9, arr: [4.2, 5.22, 5.38, 5.51, 5.61, 5.69], msgs: [
        ['Sam Okafor', 'My order said Tuesday. Where is it now?'],
        ['+1 415 555 0199', 'Hello? Is anyone there to help me?'],
        ['Ruth Adeyemi', 'Do you gift wrap orders for birthdays?'],
        ['Dan Kowalski', 'Is the XL back in stock in charcoal?'],
        ['Mia Rossi', 'Can I get an invoice for my last order?'],
        ['maya.wears', 'Are the waxed jackets true to size?'] ] },
    ];
    const SHIFTS = [3.45, 4.7];

    const cardHTML = (key, name, msg, front) =>
      `<div class="ncard"><div class="cbg"></div><div class="cmsg">${HICON[key]}<div class="tx"><div class="top"><b>${name}</b><em>now</em></div><p>${msg}</p></div></div>` +
      (front ? `<div class="cclr">${HICON[key]}<span>No new messages</span></div>` : '') + `</div>`;
    const groupsEl = $('#groups');
    G.forEach(g => {
      const el = document.createElement('div');
      el.className = 'el grp';
      el.innerHTML = g.msgs.map((m, i) => cardHTML(g.key, m[0], m[1], i === g.msgs.length - 1)).join('') + '<span class="badge">1</span>';
      groupsEl.appendChild(el);
      g.el = el;
      g.cards = $$('.ncard', el).map(c => ({ el: c, bg: $('.cbg', c), msg: $('.cmsg', c), clr: $('.cclr', c) }));
      g.badge = $('.badge', el);
    });

    const hero = $('.hero'), blue = $('#blue'), rig = $('#rig'), phone = $('#phone'), clock = $('#clock'), island = $('#island');
    const ai = $('#ai'), aiFlower = $('#aiFlower'), aiBusy = $('#aiBusy'), aiDone = $('#aiDone'), pill = $('#pill'), replay = $('#replay');
    const reveals = $$('[data-rv]', hero).map(el => ({ el, d: parseFloat(el.dataset.rv) }));
    const flower = makeFlower(blue, 963, 388, 1, true);

    const BLUE_LEFT = 650, PHONE = { x: 775, y: 36 }, LIST = { x: 925, y: 225 };
    const PITCH = 93, PITCH_CLEAR = 68, AI_H = 62;
    const set = (el, tf, op, blur) => {
      el.style.transform = tf;
      if (op !== undefined) el.style.opacity = op.toFixed(3);
      if (blur !== undefined) el.style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    };

    function render(t) {
      // Once the phone exists it breathes: one slow sine, eased in, applied to the whole phone layer
      const float = Math.sin(t * .78) * 4 * P(t, T.morph + .6, 1.6, E.soft);
      rig.style.transform = `translate3d(0px, ${float.toFixed(3)}px, 0px)`;
      const k = P(t, T.morph, 1.4, E.inOut);                   // blue card retreats to the right
      blue.style.clipPath = `inset(0px 0px 0px ${(BLUE_LEFT * k).toFixed(2)}px round 24px)`;
      const intro = P(t, 0, 1.1, E.soft);
      blue.style.opacity = intro.toFixed(3);
      blue.style.transform = `scale(${(.985 + .015 * intro).toFixed(4)})`;

      const kf = P(t, T.morph - .1, 1.8, E.inOut);
      flower.place(lerp(963, 649.5, kf), lerp(388, 0, kf));
      if (flower.on || RM) paintRim(flower, lightAt(t));

      const ph = P(t, T.phone, 1.2, E.out);
      set(phone, `translate(${PHONE.x}px, ${PHONE.y}px) scale(${(1.12 - .12 * ph).toFixed(4)})`, clamp(ph * 1.4), (1 - ph) * 10);
      const pc = P(t, T.phone + .25, 1.05, E.out);
      set(clock, `translate(${PHONE.x}px, ${(PHONE.y + 67 + (1 - pc) * 12).toFixed(2)}px)`, pc, (1 - pc) * 5);
      const pi = P(t, T.phone + .12, .8, E.out);
      set(island, `translate(${PHONE.x + 110}px, ${PHONE.y + 16}px) scale(${(.7 + .3 * pi).toFixed(3)})`, pi);

      const aiShift = P(t, T.ai - .45, .95, E.inOut) * (AI_H + 8);
      const car = P(t, SHIFTS[0], 1.05, E.inOut) + P(t, SHIFTS[1], 1.05, E.inOut);
      let listY = LIST.y + aiShift;
      G.forEach((g, gi) => {
        const n = g.cards.length, last = n - 1;
        const collapse = P(t, g.clear, .6, E.inOut);
        const shrink = P(t, g.clear + .2, .7, E.inOut);
        // Pose in the pile-up (2x, centre of the full blue card)
        const rel = gi - car;
        const xA = 600 + Math.sin(t * .6 + gi * 2) * 4;
        const yA = 222 + rel * 204 - 5 * t;
        const sA = 2 * (1 - .035 * Math.min(Math.abs(rel), 2));
        let bA, oA;
        if (rel < 0) { bA = 2.4 * -rel; oA = Math.max(0, 1 - .5 * Math.min(-rel, 1) - .35 * Math.max(-rel - 1, 0)); }
        else { bA = 9 * rel; oA = Math.max(0, 1 - .62 * rel); }
        if (g.preview !== null) oA *= P(t, g.preview, .8, E.out);
        // Pose in the phone (1x)
        const yP = listY;
        listY += lerp(PITCH, PITCH_CLEAR, shrink);
        const m = P(t, T.morph + gi * .08, 1.32, E.glide);
        set(g.el, `translate(${(lerp(xA, LIST.x, m) - 134).toFixed(2)}px, ${lerp(yA, yP, m).toFixed(2)}px) scale(${lerp(sA, 1, m).toFixed(4)})`, lerp(oA, 1, m), lerp(bA, 0, m));

        // Each new message lands on top and pushes the older ones back
        g.cards.forEach((c, i) => {
          const e = P(t, g.arr[i], ARRIVE, E.out);
          let depth = 0;
          for (let j = i + 1; j < n; j++) depth += P(t, g.arr[j], ARRIVE, E.out);
          const front = i === last;
          let op = clamp(e * 2.2) * clamp(2.7 - depth);
          if (!front) { depth *= 1 - collapse; op *= 1 - collapse; }
          c.el.style.zIndex = i;
          set(c.el, `translate(0px, ${(11 * depth - (1 - e) * 26).toFixed(2)}px) scale(${(Math.pow(.95, depth) * (1 + .05 * (1 - e))).toFixed(4)})`, op, 3.5 * (1 - e) * (1 - e));
          c.msg.style.opacity = (1 - clamp(depth * 1.6)).toFixed(3);
          if (front) {
            c.el.style.height = lerp(78, 60, shrink).toFixed(2) + 'px';
            c.bg.style.opacity = lerp(1, .45, shrink).toFixed(3);
            const mo = P(t, g.clear + .18, .4, E.soft), co = P(t, g.clear + .45, .55, E.out);
            c.msg.style.opacity = (1 - mo).toFixed(3);
            c.msg.style.transform = `translateY(${(-6 * mo).toFixed(2)}px)`;
            c.clr.style.opacity = co.toFixed(3);
            c.clr.style.transform = `translateY(${(6 * (1 - co)).toFixed(2)}px)`;
          }
        });

        // Badge: holds at 1 while the first message is read, climbs fast, counts down as AI Agent replies
        const climb = g.arr[1] - .05;
        const up = P(t, climb, g.arr[last] - climb + .4, x => Math.pow(x, 1.7));
        const down = P(t, T.reply, g.clear - T.reply, E.run);
        const count = Math.round((1 + up * 138) * (1 - down));
        g.badge.textContent = count > 99 ? '99+' : String(Math.max(0, count));
        let bump = 0;
        g.arr.forEach(a => { const q = clamp((t - a) / .32); if (q > 0 && q < 1) bump = Math.max(bump, Math.sin(Math.PI * q)); });
        set(g.badge, `scale(${((1 + .22 * bump) * (1 - P(t, g.clear - .05, .32, E.inOut))).toFixed(4)})`, P(t, g.arr[0], .3, E.out));
      });

      const pl = P(t, T.pillIn, .6, E.out) * (1 - P(t, T.ai - .4, .3, E.soft));
      set(pill, `translate(${LIST.x - 48}px, ${LIST.y + 3 * PITCH + 6}px) scale(${(.85 + .15 * pl).toFixed(4)})`, pl, (1 - pl) * 4);

      const a = P(t, T.ai + .05, 1, E.out);
      const done = P(t, T.clean, .5, E.soft);
      const cheer = Math.sin(Math.PI * clamp((t - T.clean) / .5)) * .025;
      set(ai, `translate(${LIST.x - 134}px, ${(LIST.y - (1 - a) * 18).toFixed(2)}px) scale(${(.96 + .04 * a + cheer).toFixed(4)})`, a, (1 - a) * 6);
      aiFlower.style.transform = `rotate(${(540 * P(t, T.reply - .2, T.clean - T.reply + .5, E.inOut)).toFixed(2)}deg)`;
      const left = Math.max(1, Math.round(556 * (1 - P(t, T.reply, T.clean - T.reply - .15, E.run))));
      aiBusy.textContent = `Replying to ${left} message${left === 1 ? '' : 's'}...`;
      aiBusy.style.opacity = (1 - done).toFixed(3);
      aiBusy.style.transform = `translateY(${(-5 * done).toFixed(2)}px)`;
      const dn = P(t, T.clean + .12, .5, E.out);
      aiDone.style.opacity = dn.toFixed(3);
      aiDone.style.transform = `translateY(${(5 * (1 - dn)).toFixed(2)}px)`;

      reveals.forEach(r => { const q = P(t, T.text + r.d, 1.2, E.out); set(r.el, `translateY(${((1 - q) * 22).toFixed(2)}px)`, q, (1 - q) * 6); });

      const rp = P(t, T.end, .5, E.out);
      replay.style.opacity = rp.toFixed(3);
      replay.classList.toggle('on', rp > .5);
    }

    /* Fit: desktop scales the whole 1200 x 624 stage; narrow screens move the copy into the flow
       and crop the stage to the phone card, starting the clock just before the phone forms. */
    const stage = $('.stage', hero), box = $('.stage-box', hero), copy = $('[data-hero-copy]', hero), slot = $('[data-copy-slot]', hero);
    let compact = false;
    const fit = () => {
      const w = box.parentElement.clientWidth;
      compact = w < 900;
      hero.classList.toggle('compact', compact);
      if (compact && copy.parentElement !== slot) slot.appendChild(copy);
      if (!compact && copy.parentElement !== stage) stage.prepend(copy);
      const s = compact ? Math.min(1, box.clientWidth / 550) : Math.min(1, box.clientWidth / 1200);
      stage.style.transform = compact ? `scale(${s}) translate(-650px, 0px)` : `scale(${s})`;
      box.style.height = 624 * s + 'px';
    };
    addEventListener('resize', fit); fit();

    const q = new URLSearchParams(location.search);
    const speed = parseFloat(q.get('speed')) || 1;
    let fixed = q.has('t') ? parseFloat(q.get('t')) : (RM ? T.end + 1 : null);
    let start = null, paused = false, pausedAt = 0;
    const offset = () => (compact ? T.morph - .5 : 0);
    const now = () => fixed !== null ? fixed : paused ? pausedAt : (performance.now() - start) / 1000 * speed + offset();
    let heroOn = true;
    new IntersectionObserver(([en]) => (heroOn = en.isIntersecting)).observe(hero);
    function loop() { if (heroOn) render(now()); if (fixed === null) requestAnimationFrame(loop); }
    replay.addEventListener('click', () => { start = performance.now(); paused = false; });

    render(fixed !== null ? fixed : offset());
    window.__seek = t => { fixed = t; render(t); };
    const decoded = $$('img', hero).map(img => img.decode().catch(() => {}));
    Promise.all([document.fonts.ready, ...decoded]).then(() => {
      start = performance.now();
      if (fixed === null) requestAnimationFrame(loop); else render(fixed);
      window.__ready = true;
    });

    if (q.has('debug')) {
      const bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(27,26,25,.85);color:#fff;font:500 12px/1 monospace';
      bar.innerHTML = `<button type="button" style="font:inherit;padding:6px 10px;border-radius:6px;background:#fff;color:#1b1a19">Pause</button><input type="range" min="0" max="${T.end + 2}" step="0.01" value="0" style="flex:1"><span>0.00 s</span>`;
      document.body.appendChild(bar);
      const [btn, range, label] = bar.children;
      fixed = null;
      btn.onclick = () => { if (paused) { start = performance.now() - pausedAt * 1000 / speed; paused = false; btn.textContent = 'Pause'; } else { pausedAt = now(); paused = true; btn.textContent = 'Play'; } };
      range.oninput = () => { paused = true; pausedAt = parseFloat(range.value); btn.textContent = 'Play'; };
      setInterval(() => { const v = now(); label.textContent = v.toFixed(2) + ' s'; if (!paused) range.value = v; }, 50);
    }
  })();

  /* ═════════════════════ Close: the bubble emoji pile ═════════════════════ */
  function makePile(host, names, count) {
    if (!window.Matter) return;
    const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;
    const layer = $('.pile-layer', host);
    const engine = Engine.create();
    engine.gravity.y = 1.15;
    const world = engine.world;
    const items = [];
    let statics = [], running = false, spawned = false, drag = null;
    const scale = () => Math.max(.55, Math.min(1.1, host.clientWidth / 1440));
    function build() {
      Composite.remove(world, statics);
      const W = host.clientWidth, H = host.clientHeight, Tk = 400;
      statics = [
        Bodies.rectangle(W / 2, H + Tk / 2, W * 3, Tk, { isStatic: true }),
        Bodies.rectangle(-Tk / 2, H / 2 - 1500, Tk, H * 2 + 3000, { isStatic: true }),
        Bodies.rectangle(W + Tk / 2, H / 2 - 1500, Tk, H * 2 + 3000, { isStatic: true })
      ];
      const hr = host.getBoundingClientRect();
      // The copy block is solid, with a pitched roof so the emoji tumble off instead of covering the title.
      $$('[data-solid]', host).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > W * .72) return;
        const x0 = r.left - hr.left + r.width * .06, x1 = r.right - hr.left - r.width * .06;
        const y0 = r.top - hr.top, y1 = r.bottom - hr.top - r.height * .06;
        const peak = Math.min(170, r.width * .2), cx = (x0 + x1) / 2;
        const verts = [{ x: x0, y: y0 + peak * .4 }, { x: cx, y: y0 - peak * .6 }, { x: x1, y: y0 + peak * .4 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
        const c = Matter.Vertices.centre(verts);
        statics.push(Bodies.fromVertices(c.x, c.y, [verts], { isStatic: true, friction: .02 }));
      });
      Composite.add(world, statics);
      items.forEach(({ b }) => { if (b.position.x < 0 || b.position.x > W) Body.setPosition(b, { x: W / 2, y: -100 }); });
    }
    function spawn(i) {
      const s = scale(), W = host.clientWidth;
      const w = rand(64, 112) * s;                       // the bubble is a square, so the body is a rounded square too
      const side = Math.random() < .6;
      const x = side ? (Math.random() < .5 ? rand(.03, .2) : rand(.8, .97)) * W : rand(.1, .9) * W;
      const b = Bodies.rectangle(x, -w - rand(0, 500), w, w, { chamfer: { radius: w * .2 }, restitution: .3, friction: .2, frictionAir: .012, density: .0016 });
      Body.setAngle(b, rand(-.5, .5));
      Body.setAngularVelocity(b, rand(-.08, .08));
      const img = makeEmo(names[i % names.length]);
      img.style.width = img.style.height = `${w}px`;
      layer.appendChild(img);
      items.push({ b, img, h: w / 2, name: names[i % names.length] });
      Composite.add(world, b);
    }
    function render() { for (const { b, img, h } of items) img.style.transform = `translate(${b.position.x - h}px,${b.position.y - h}px) rotate(${b.angle}rad)`; }
    let lastScroll = scrollY, shake = 0, lastKick = 0;
    function jostle() {
      const now = performance.now();
      shake = shake * .9 + Math.abs(scrollY - lastScroll);
      lastScroll = scrollY;
      if (shake < 50 || now - lastKick < 260) return;
      const m = Math.min(1, shake / 320);
      for (const { b } of items) {
        if (Math.random() > .75) continue;
        Body.setVelocity(b, { x: b.velocity.x + rand(-1.6, 1.6) * m, y: b.velocity.y - rand(2.5, 7.5) * m });
        Body.setAngularVelocity(b, b.angularVelocity + rand(-.08, .08) * m);
      }
      shake = 0; lastKick = now;
    }
    function frame() { if (!running) return; jostle(); Engine.update(engine, 1000 / 60); render(); requestAnimationFrame(frame); }
    function start() {
      if (!spawned) {
        spawned = true;
        build();
        count = Math.round(count * Math.max(.45, Math.min(1, host.clientWidth / 1440)));
        if (RM) { for (let i = 0; i < count; i++) spawn(i); for (let k = 0; k < 900; k++) Engine.update(engine, 1000 / 60); render(); return; }
        for (let i = 0; i < count; i++) setTimeout(() => spawn(i), i * 70);
      }
      if (RM || running) return;
      running = true;
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(([en]) => { if (en.isIntersecting) start(); else running = false; }).observe(host);
    let rz;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });
    document.fonts && document.fonts.ready.then(() => spawned && build());
    if (RM) return;
    const pt = e => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const hit = p => { const h = Query.point(items.map(i => i.b), p); return h[h.length - 1]; };
    host.addEventListener('touchstart', e => { const t = e.touches[0], r = host.getBoundingClientRect(); if (hit({ x: t.clientX - r.left, y: t.clientY - r.top })) e.preventDefault(); }, { passive: false });
    host.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button')) return;
      const p = pt(e), b = hit(p);
      if (!b) return;
      e.preventDefault();
      dragMode(true);
      const c = Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .1, damping: .1, length: 0 });
      Composite.add(world, c);
      drag = { c, b, id: e.pointerId, p0: p, moved: false };
      hover(elOf(b));
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
      host.classList.add('grabbing');
    });
    // The pile's emoji ignore the pointer (the host handles it), so find the one under the pointer to make it boil.
    let over = null;
    const elOf = b => { const it = b && items.find(i => i.b === b); return it ? it.img : null; };
    const hover = el => { if (el !== over) { boil(over, false); over = el; boil(el, true); } };
    host.addEventListener('pointermove', e => {
      const p = pt(e);
      if (drag && e.pointerId === drag.id) { drag.c.pointA = p; if (Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) > 5) drag.moved = true; return; }
      const b = hit(p);
      if (e.pointerType === 'mouse') host.style.cursor = b ? 'grab' : '';
      hover(elOf(b));
    });
    host.addEventListener('pointerleave', () => { if (!drag) hover(null); });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      Composite.remove(world, drag.c);
      host.classList.remove('grabbing');
      dragMode(false);
      if (!drag.moved) {
        Body.setVelocity(drag.b, { x: rand(-4, 4), y: -16 });
        Body.setAngularVelocity(drag.b, rand(-.3, .3));
        const it = items.find(i => i.b === drag.b);
        burst(e.clientX, e.clientY, { names: [it.name], n: 5 });
      }
      swallow = true;
      setTimeout(() => (swallow = false), 0);
      drag = null;
      if (e.pointerType !== 'mouse') hover(null);
    };
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);
    host._kick = (cx, cy) => {
      const r = host.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      for (const { b } of items) {
        const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy);
        if (d < 280 && d > 1) { const kk = (1 - d / 280) * 16; Body.setVelocity(b, { x: b.velocity.x + dx / d * kk, y: b.velocity.y + dy / d * kk - 4 }); }
      }
    };
  }
  makePile($('.close'), ['smile', 'heart', 'laugh', 'love', 'thumbs', 'wow', 'party', 'wink', 'stars', 'calm', 'hug', 'cool', 'tongue', 'sparkle', 'relieved', 'check', 'thinking', 'concerned', 'heart', 'smile', 'laugh', 'love', 'party', 'thumbs'], 24);

  /* ───────── Draggable emoji: they spring back home ───────── */
  $$('[data-drag]').forEach(el => {
    el.draggable = false;
    let s = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      s = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.remove('springback');
      el.classList.add('dragging');
      dragMode(true);
    });
    el.addEventListener('pointermove', e => {
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.hypot(dx, dy) > 4) s.moved = true;
      el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 12}deg) scale(1.08)`;
    });
    const end = e => {
      if (!s || e.pointerId !== s.id) return;
      el.classList.remove('dragging');
      el.classList.add('springback');
      dragMode(false);
      el.style.transform = '';
      if (!s.moved) {
        const name = el.getAttribute('name');
        burst(e.clientX, e.clientY, { names: name ? [name] : REACT, n: 6 });
      }
      s = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  /* ───────── Emoji drift when the page is still and bounce when it scrolls ───────── */
  if (!RM) {
    const deco = $$('[data-drag]').map(el => ({
      el, on: false, y: 0, v: 0, k: rand(.7, 1.3), r0: parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0,
      p: [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)], w: [rand(.45, .75), rand(.55, .85), rand(.35, .6)]
    }));
    const decoIO = new IntersectionObserver(ens => ens.forEach(en => { deco.find(d => d.el === en.target).on = en.isIntersecting; }));
    deco.forEach(d => decoIO.observe(d.el));
    let lastY = scrollY, lastAct = 0, calm = 0;
    const act = () => (lastAct = performance.now());
    addEventListener('scroll', act, { passive: true });
    addEventListener('pointermove', act, { passive: true });
    addEventListener('keydown', act);
    (function tick(t) {
      const sv = scrollY - lastY;
      lastY = scrollY;
      calm += (Math.min(1, Math.max(0, (t - lastAct - 500) / 1500)) - calm) * .04;
      const amp = .3 + .7 * calm, s = t / 1000;
      for (const d of deco) {
        if (!d.on) continue;
        d.v += (Math.max(-34, Math.min(34, sv * d.k)) - d.y) * .09;
        d.v *= .8;
        d.y += d.v;
        const x = Math.sin(s * d.w[0] + d.p[0]) * 7 * amp;
        const y = Math.sin(s * d.w[1] * 1.4 + d.p[1]) * 9 * amp + d.y;
        const r = d.r0 + Math.sin(s * d.w[2] + d.p[2]) * 5 * amp + d.y * .3;
        d.el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        d.el.style.rotate = `${r.toFixed(2)}deg`;
      }
      requestAnimationFrame(tick);
    })(0);
  } else {
    $$('[data-drag]').forEach(el => (el.style.rotate = getComputedStyle(el).getPropertyValue('--r') || '0deg'));
  }

  /* ───────── Scroll reveal ───────── */
  const riseIO = new IntersectionObserver(ens => {
    let k = 0;
    ens.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.style.transitionDelay = `${k++ * 90}ms`;
      en.target.classList.add('in');
      riseIO.unobserve(en.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.rise').forEach(el => riseIO.observe(el));

  /* ───────── Chats type themselves in ───────── */
  const DOTS = '<span class="dots"><i></i><i></i><i></i></span>';
  async function play(chat) {
    for (const el of chat.children) {
      if (!el.matches('.msg[data-ai]')) { await wait(RM ? 0 : 420); el.classList.add('show'); continue; }
      if (RM) { el.classList.add('show'); continue; }
      const html = el.innerHTML;
      el.innerHTML = DOTS;
      el.classList.add('show', 'is-typing');
      await wait(rand(700, 1000));
      el.innerHTML = html;
      el.classList.remove('is-typing');
    }
  }
  const chatIO = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { chatIO.unobserve(en.target); play(en.target); } }), { threshold: .35 });
  $$('[data-chat]').forEach(c => chatIO.observe(c));

  /* ───────── Tone of voice: one face, four voices ───────── */
  const TONES = [
    ['Formal', "I'm sorry to hear that. I have opened a delivery investigation for order #4821, and you will receive an update within 24 hours. If the parcel does not arrive, we will send a replacement at no cost."],
    ['Friendly', "Oh no, sorry about that! I've opened an investigation with the carrier for order #4821. You'll hear from us within 24 hours, and if it doesn't turn up, we'll send a new one for free."],
    ['Casual', "Ugh, the worst. I've already chased the carrier on #4821 :thinking: You'll get an update within a day, and if it's really gone, a new one ships free."],
    ['Playful', "Plot twist nobody asked for :wow: I'm on it: carrier investigation started for #4821 :sparkle: Update within 24h, and if your parcel ran off, a fresh one ships free :heart:"]
  ];
  const range = $('#tone-range'), reply = $('.tone-reply'), faces = $$('.tone-face bubble-emoji'), stops = $$('.tone-stops span');
  let toneRun = 0;
  async function setTone(i, animate = true) {
    const run = ++toneRun;
    faces.forEach((f, k) => f.classList.toggle('on', k === i));
    stops.forEach((s, k) => s.classList.toggle('on', k === i));
    $('.tone-name').textContent = TONES[i][0];
    $('#tone').dataset.tone = i;
    const parts = TONES[i][1].split(/(:[a-z-]+:)/).flatMap(p => (/^:[a-z-]+:$/.test(p) ? [emojify(p)] : [...p]));
    if (!animate || RM) { reply.innerHTML = parts.join(''); return; }
    reply.innerHTML = '';
    let out = '';
    for (const p of parts) {
      if (run !== toneRun) return;
      out += p;
      reply.innerHTML = out + '<span class="caret"></span>';
      await wait(p.length > 1 ? 120 : 11);
    }
    reply.innerHTML = out;
    if (i === 3) burst(...centerOf(reply), { names: ['tongue', 'laugh', 'party', 'stars', 'love'], n: 8, spread: 200 });
  }
  range.addEventListener('input', () => setTone(+range.value));
  setTone(+range.value, false);
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); setTone(+range.value); } }, { threshold: .5 }).observe(reply);

  /* ───────── Gaia ───────── */
  $$('[data-type]').forEach(el => {
    const html = el.innerHTML;
    if (RM) return;
    el.innerHTML = DOTS;
    new IntersectionObserver(async ([en], o) => {
      if (!en.isIntersecting) return;
      o.disconnect();
      await wait(900);
      const parts = html.split(/(<bubble-emoji[\s\S]*?<\/bubble-emoji>)/).flatMap(p => (p.startsWith('<bubble-emoji') ? [p] : [...p]));
      let out = '';
      for (const p of parts) { out += p; el.innerHTML = out; await wait(14); }
    }, { threshold: .6 }).observe(el);
  });
  $$('[data-burst]').forEach(b => b.addEventListener('click', () => {
    b.classList.add('done');
    b.textContent = 'Added to your reply';
    burst(...centerOf(b), { names: ['sparkle', 'stars', 'check'], n: 6, spread: 100 });
  }));
  $$('[data-onboard]').forEach(box => {
    const steps = $$('.ob-step', box), bar = $('.ob-bar span', box);
    let done = false;
    new IntersectionObserver(async ([en]) => {
      if (!en.isIntersecting || done) return;
      done = true;
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add('now');
        await wait(RM ? 0 : 800);
        steps[i].classList.remove('now');
        steps[i].classList.add('done');
        bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      }
      burst(...centerOf(box), { names: ['party', 'stars', 'sparkle', 'check'], n: 10, spread: 220 });
    }, { threshold: .6 }).observe(box);
  });

  /* Gaia Hub: two opportunity cards at a time. Applying a fix or dismissing one brings in the next. */
  const OPPS = [
    ['"Order tracking" resolves below your average', 'Assign intent to skill', 'AI Agent hands over 41% of tracking questions. Linking them to your Order status skill would answer most of them.'],
    ['Return window answers conflict across 3 articles', 'Merge into one guide', 'Two articles say 30 days and one says 14. Gaia drafted a single article that replaces all three.'],
    ['"Size exchange" hands over every time', 'Add an action to a skill', 'AI Agent has no way to swap a size. Add Create exchange to your Exchanges skill and it can finish the job.'],
    ['Delay questions spike every Monday', 'Add a shipping delay notice', 'Weekend orders ship on Tuesday. A short notice in your shipping guidance would answer these before they come in.'],
    ['"Gift wrap" has no answer in your knowledge', 'Write a help article', 'Shoppers asked 86 times this month. Gaia wrote a first draft from your past replies.'],
  ];
  const PRIORITY = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.14 11.81L8 8.76l2.86 3.05M5.14 7.24L8 4.18l2.86 3.06" stroke="#D90B28" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SHOPIFY = '<img src="assets/v4/shopify.svg" alt="">';
  const oppList = $('[data-opp-list]'), oppCount = $('[data-opp-count]');
  if (oppList) {
    let next = 0, left = 9;
    const oppCard = () => {
      const [title, action, body] = OPPS[next++ % OPPS.length];
      const el = document.createElement('div');
      el.className = 'opp-card';
      el.innerHTML = `<div class="opp-tags"><span class="opp-tag">${PRIORITY}Critical</span><span class="opp-tag">${SHOPIFY}northbound-outdoor</span></div>
        <div class="opp-text"><strong>${title}</strong><b>${action}</b><p>${body}</p></div>
        <div class="opp-btns"><button type="button" class="ob ob-primary" data-apply>Approve</button><button type="button" class="ob ob-secondary" data-dismiss>Dismiss</button><button type="button" class="ob ob-tertiary" data-ask>Ask Gaia</button></div>`;
      return el;
    };
    const replace = async (card, applied) => {
      if (card.classList.contains('busy')) return;
      card.classList.add('busy');
      if (applied) {
        const btn = $('[data-apply]', card);
        btn.textContent = 'Applying…';
        await wait(RM ? 0 : 700);
        btn.textContent = 'Done';
        burst(...centerOf(btn), { names: ['sparkle', 'check', 'smile'], n: 7, spread: 110 });
        await wait(RM ? 0 : 650);
      }
      left = Math.max(0, left - 1);
      oppCount.textContent = left;
      const fresh = oppCard();
      if (RM) { card.replaceWith(fresh); return; }
      card.classList.add('out');
      await wait(380);
      fresh.classList.add('enter');
      card.replaceWith(fresh);
    };
    oppList.append(oppCard(), oppCard());
    oppList.addEventListener('click', e => {
      const b = e.target.closest('[data-apply], [data-dismiss], [data-ask]');
      if (!b) return;
      if (b.matches('[data-ask]')) { toast('Gaia opens with this opportunity loaded.', 'sparkle'); return; }
      replace(b.closest('.opp-card'), b.matches('[data-apply]'));
    });
  }

  /* Shared chats: copy the link */
  $$('[data-share]').forEach(b => b.addEventListener('click', e => {
    if (b.classList.contains('done')) return;
    b.classList.add('done');
    $('b', b).textContent = 'Copied';
    $('.ic', b).dataset.icon = 'check';
    iconize(b);
    burst(e.clientX, e.clientY, { names: ['sparkle', 'heart', 'thumbs'], n: 6, spread: 90 });
    toast('Link copied. Your teammate sees the whole chat.', 'wink');
    setTimeout(() => { b.classList.remove('done'); $('b', b).textContent = 'Copy link'; $('.ic', b).dataset.icon = 'copy'; iconize(b); }, 2600);
  }));

  /* AI coverage: link a skill, switch an intent between AI and your team */
  $$('[data-cov] .cov-link').forEach(b => b.addEventListener('click', () => {
    const name = document.createElement('span');
    name.className = 'cov-skill linked';
    name.textContent = b.dataset.skillName;
    b.replaceWith(name);
    burst(...centerOf(name), { names: ['check', 'sparkle'], n: 5, spread: 80 });
  }));
  $$('[data-cov] .cov-status').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    b.classList.toggle('on', on);
    b.textContent = on ? 'AI allowed' : 'Handover';
  }));

  /* ───────── Actions in Skills: drag or click an action into a step ───────── */
  const skill = $('[data-skill]');
  const slots = $$('[data-slot]', skill);
  const blank = slots[0].innerHTML;
  function fill(slot, action) {
    slot.innerHTML = `<span class="got"><i class="ic sm" data-icon="bolt"></i>${action.dataset.action} <small>${action.dataset.app}</small></span>`;
    iconize(slot);
    slot.classList.add('filled');
    action.classList.add('used');
    burst(...centerOf(slot), { names: ['check', 'sparkle', 'thumbs'], n: 7, spread: 120 });
    if (slots.every(s => s.classList.contains('filled'))) runSkill();
  }
  const run = $('[data-run]');
  function runSkill() {
    const names = slots.map(s => $('.got', s).firstChild.nextSibling.textContent.trim());
    const chat = $('.run-chat', run);
    chat.innerHTML = `<div class="msg out">Can you cancel order #4821? I ordered the wrong colour.</div>
      <div class="msg in" data-ai>${emojify(`Done. I ran <b>${names[0]}</b> and <b>${names[1]}</b> on order #4821. Anything else? :wink:`)}</div>`;
    $('.run-empty', run).hidden = true;
    chat.hidden = false;
    play(chat);
    setTimeout(() => toast('Skill saved. AI Agent runs these steps now.', 'party'), 1600);
  }
  $$('.action').forEach(a => {
    let s = null, ghost = null, over = null;
    a.addEventListener('pointerdown', e => { s = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { a.setPointerCapture(e.pointerId); } catch (_) {} });
    a.addEventListener('pointermove', e => {
      if (!s || e.pointerId !== s.id) return;
      if (!ghost && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) {
        dragMode(true);
        ghost = a.cloneNode(true);
        ghost.classList.add('ghost');
        document.body.appendChild(ghost);
      }
      if (!ghost) return;
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slot = el && el.closest('[data-slot]:not(.filled)');
      if (slot !== over) { over && over.classList.remove('over'); over = slot; over && over.classList.add('over'); }
    });
    const end = e => {
      if (!s || e.pointerId !== s.id) return;
      dragMode(false);
      if (ghost) { ghost.remove(); ghost = null; if (over) { over.classList.remove('over'); fill(over, a); over = null; } }
      else { const free = slots.find(x => !x.classList.contains('filled')); free && fill(free, a); }
      s = null;
    };
    a.addEventListener('pointerup', end);
    a.addEventListener('pointercancel', end);
  });
  $('[data-reset]').addEventListener('click', () => {
    slots.forEach(s => { s.innerHTML = blank; s.classList.remove('filled'); });
    $$('.action').forEach(a => a.classList.remove('used'));
    $('.run-chat', run).hidden = true;
    $('.run-empty', run).hidden = false;
  });

  /* ───────── More like this ───────── */
  const mlt = $('[data-mlt]'), row = $('.mlt-row', mlt);
  $$('.mlt-row .p-card').forEach((c, i) => c.style.setProperty('--i', i));
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    $$('.seg button').forEach(o => o.setAttribute('aria-pressed', o === b));
    mlt.dataset.mode = b.dataset.mode;
    row.classList.remove('open');
  }));
  new IntersectionObserver(async ([en], o) => {
    if (!en.isIntersecting) return;
    o.disconnect();
    await wait(RM ? 0 : 1400);
    if (mlt.dataset.mode === 'after') row.classList.add('open');
  }, { threshold: .6 }).observe(mlt);
  $('.mlt-btn').addEventListener('click', e => {
    const open = row.classList.toggle('open');
    if (open) burst(e.clientX, e.clientY, { names: ['love', 'stars', 'sparkle', 'heart'], n: 6, spread: 110 });
  });

  /* ───────── Divider row ───────── */
  $$('[data-divider]').forEach(d => {
    d.innerHTML = d.dataset.divider.split(',').map((n, i) => emo(n, false, `data-n="${n}" style="--i:${i}"`)).join('');
    d.addEventListener('click', e => {
      const img = e.target.closest('bubble-emoji');
      if (!img) return;
      burst(e.clientX, e.clientY, { names: [img.dataset.n], n: 6 });
    });
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) return; d.classList.remove('wave'); d.offsetWidth; d.classList.add('wave'); }, { threshold: .8 }).observe(d);
  });

})();
