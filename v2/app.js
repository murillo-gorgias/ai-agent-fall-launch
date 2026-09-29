/* AI Agent fall launch page: every interaction on the page lives here. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // Every image the page can spawn, by short name.
  const PATH = {};
  'wink heart thumbs laugh cool typing hearteyes wow fire party clap sparkle monocle calm grin stars thinking tongue'
    .split(' ').forEach(n => (PATH[n] = `../assets/emoji/${n}.webp`));
  'gift bag parcel phone bolt search bulb wand gear sprout rocket clipboard'
    .split(' ').forEach(n => (PATH[n] = `../assets/objects/${n}.webp`));
  'wa-bubble wa-phone ig-heart ig-camera fb-thumbs fb-bubble'
    .split(' ').forEach(n => (PATH[n] = `../assets/channels/${n}.webp`));
  const REACT = ['heart', 'thumbs', 'laugh', 'wow', 'fire', 'hearteyes', 'party', 'clap', 'sparkle', 'wink', 'cool', 'stars'];

  // ":name:" in copy becomes an inline 3D emoji.
  const emojify = html => html.replace(/:([a-z-]+):/g, (m, n) => (PATH[n] ? `<img class="ie" src="${PATH[n]}" alt="">` : m));
  $$('[data-chat] .msg, [data-type]').forEach(el => (el.innerHTML = emojify(el.innerHTML)));

  /* ───────── Reaction counter + toast ───────── */
  const counter = $('.counter');
  let reactions = 0;
  function bump(n = 1) {
    reactions += n;
    counter.hidden = false;
    $('b', counter).textContent = reactions;
  }
  const toastEl = $('.toast');
  let toastT;
  function toast(text, img) {
    toastEl.innerHTML = (img ? `<img src="${PATH[img]}" alt="">` : '') + text;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  /* ───────── Emoji bursts ───────── */
  let live = 0;
  function burst(x, y, opts = {}) {
    if (RM) return;
    const { n = 7, names = REACT, spread = 150, size = 44 } = opts;
    for (let i = 0; i < n && live < 80; i++) {
      const img = new Image();
      img.src = PATH[pick(names)];
      img.className = 'burst';
      img.alt = '';
      img.style.width = img.style.height = `${size * rand(.75, 1.25)}px`;
      document.body.appendChild(img);
      live++;
      const a = rand(0, Math.PI * 2), d = rand(spread * .45, spread), r = rand(-40, 40);
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
  // While anything is dragged, no text on the page can be selected.
  const dragMode = on => document.documentElement.classList.toggle('is-dragging', on);
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // Click on empty space anywhere: reactions pop out.
  let downAt = null, swallow = false;
  const hint = $('.hero-hint');
  addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; hint && hint.classList.add('gone'); }, true);
  addEventListener('click', e => {
    if (swallow) { swallow = false; return; }
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    if (e.target.closest('a, button, input, label, [data-drag], .msg, .p-card, .divider img, .picker, .pinned, .tabs, .seg')) return;
    burst(e.clientX, e.clientY);
    bump();
    const host = e.target.closest('.pile-host');
    host && host._kick && host._kick(e.clientX, e.clientY);
  });

  /* ───────── Physics piles (hero + close) ───────── */
  function makePile(host, names, count) {
    if (!window.Matter) return;
    const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;
    const layer = $('.pile-layer', host);
    const engine = Engine.create();
    engine.gravity.y = 1.15;
    const world = engine.world;
    const items = [];
    let statics = [], running = false, spawned = false, drag = null;

    const scale = () => Math.max(.55, Math.min(1.15, host.clientWidth / 1440));
    function build() {
      Composite.remove(world, statics);
      const W = host.clientWidth, H = host.clientHeight, T = 400;
      statics = [
        Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, H / 2 - 1500, T, H * 2 + 3000, { isStatic: true }),
        Bodies.rectangle(W + T / 2, H / 2 - 1500, T, H * 2 + 3000, { isStatic: true })
      ];
      const hr = host.getBoundingClientRect();
      // The copy block is solid, with a pitched roof so emoji roll off instead of covering the kicker.
      $$('[data-solid]', host).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > W * .72) return; // Narrow screens: emoji fall past the copy and pile below it.
        const x0 = r.left - hr.left + r.width * .06, x1 = r.right - hr.left - r.width * .06;
        const y0 = r.top - hr.top, y1 = r.bottom - hr.top - r.height * .06;
        const peak = Math.min(170, r.width * .2), cx = (x0 + x1) / 2;
        const verts = [{ x: x0, y: y0 + peak * .4 }, { x: cx, y: y0 - peak * .6 }, { x: x1, y: y0 + peak * .4 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
        const c = Matter.Vertices.centre(verts);
        statics.push(Bodies.fromVertices(c.x, c.y, [verts], { isStatic: true, friction: .02 }));
      });
      Composite.add(world, statics);
      items.forEach(({ b }) => {
        if (b.position.x < 0 || b.position.x > W) Body.setPosition(b, { x: W / 2, y: -100 });
      });
    }

    function spawn(i) {
      const s = scale(), W = host.clientWidth;
      const r = rand(44, 80) * s;
      const side = Math.random() < .6;
      const x = side ? (Math.random() < .5 ? rand(.03, .2) : rand(.8, .97)) * W : rand(.1, .9) * W;
      const b = Bodies.circle(x, -r - rand(0, 500), r, { restitution: .45, friction: .08, frictionAir: .012, density: .0016 });
      Body.setAngularVelocity(b, rand(-.15, .15));
      const img = new Image();
      img.src = PATH[names[i % names.length]];
      img.alt = '';
      img.draggable = false;
      const d = r * 2.16;
      img.style.width = img.style.height = `${d}px`;
      img.style.objectFit = 'contain';
      layer.appendChild(img);
      items.push({ b, img, h: d / 2, name: names[i % names.length] });
      Composite.add(world, b);
    }

    function render() {
      for (const { b, img, h } of items) {
        img.style.transform = `translate(${b.position.x - h}px,${b.position.y - h}px) rotate(${b.angle}rad)`;
      }
    }
    // Scrolling jostles the pile: every so often, a scroll burst makes the emoji hop.
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
      shake = 0;
      lastKick = now;
    }
    function frame() {
      if (!running) return;
      jostle();
      Engine.update(engine, 1000 / 60);
      render();
      requestAnimationFrame(frame);
    }
    function start() {
      if (!spawned) {
        spawned = true;
        build();
        count = Math.round(count * Math.max(.45, Math.min(1, host.clientWidth / 1440)));
        if (RM) {
          for (let i = 0; i < count; i++) spawn(i);
          for (let k = 0; k < 900; k++) Engine.update(engine, 1000 / 60);
          render();
          return;
        }
        for (let i = 0; i < count; i++) setTimeout(() => spawn(i), i * 70);
      }
      if (RM || running) return;
      running = true;
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) start(); else running = false;
    }).observe(host);

    let rz;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(build, 150); });
    document.fonts && document.fonts.ready.then(() => spawned && build());

    if (RM) return;
    const pt = e => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const hit = p => { const h = Query.point(items.map(i => i.b), p); return h[h.length - 1]; };

    host.addEventListener('touchstart', e => {
      const t = e.touches[0], r = host.getBoundingClientRect();
      if (hit({ x: t.clientX - r.left, y: t.clientY - r.top })) e.preventDefault();
    }, { passive: false });

    host.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button')) return;
      const p = pt(e), b = hit(p);
      if (!b) return;
      e.preventDefault();
      dragMode(true);
      const c = Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .1, damping: .1, length: 0 });
      Composite.add(world, c);
      drag = { c, b, id: e.pointerId, p0: p, moved: false };
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
      host.classList.add('grabbing');
    });
    host.addEventListener('pointermove', e => {
      const p = pt(e);
      if (drag && e.pointerId === drag.id) {
        drag.c.pointA = p;
        if (Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) > 5) drag.moved = true;
      } else if (e.pointerType === 'mouse') {
        host.style.cursor = hit(p) ? 'grab' : '';
      }
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      Composite.remove(world, drag.c);
      host.classList.remove('grabbing');
      dragMode(false);
      if (!drag.moved) {
        // A tap on an emoji: it hops and throws off copies of itself.
        Body.setVelocity(drag.b, { x: rand(-4, 4), y: -16 });
        Body.setAngularVelocity(drag.b, rand(-.3, .3));
        const it = items.find(i => i.b === drag.b);
        burst(e.clientX, e.clientY, { names: [it.name], n: 5 });
        bump();
      }
      swallow = true;
      setTimeout(() => (swallow = false), 0);
      drag = null;
    };
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);

    host._kick = (cx, cy) => {
      const r = host.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      for (const { b } of items) {
        const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy);
        if (d < 280 && d > 1) {
          const k = (1 - d / 280) * 16;
          Body.setVelocity(b, { x: b.velocity.x + dx / d * k, y: b.velocity.y + dy / d * k - 4 });
        }
      }
    };
  }
  makePile($('.hero'), ['wink', 'heart', 'thumbs', 'laugh', 'cool', 'hearteyes', 'wow', 'fire', 'party', 'clap', 'sparkle', 'stars', 'tongue', 'grin', 'wa-bubble', 'ig-heart', 'fb-thumbs', 'gift', 'calm', 'typing', 'heart', 'laugh', 'thumbs', 'wink', 'fire', 'hearteyes'], 26);
  makePile($('.close'), ['heart', 'wink', 'party', 'thumbs', 'laugh', 'stars', 'gift', 'fire', 'cool', 'clap', 'wa-bubble', 'ig-heart', 'fb-thumbs', 'sparkle', 'hearteyes', 'wow', 'rocket', 'bolt'], 18);

  /* ───────── Draggable decorations: they spring back home ───────── */
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
        const name = Object.keys(PATH).find(k => el.src && el.src.endsWith(PATH[k]));
        burst(e.clientX, e.clientY, { names: name ? [name] : REACT, n: 6 });
        bump();
      }
      s = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  /* ───────── Decorations drift when the page is still and bounce when it scrolls ───────── */
  if (!RM) {
    const deco = $$('[data-drag]').map(el => ({
      el, on: false, y: 0, v: 0, k: rand(.7, 1.3),
      p: [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)], w: [rand(.45, .75), rand(.55, .85), rand(.35, .6)]
    }));
    const decoIO = new IntersectionObserver(ens => ens.forEach(en => {
      deco.find(d => d.el === en.target).on = en.isIntersecting;
    }));
    deco.forEach(d => decoIO.observe(d.el));
    let lastY = scrollY, lastAct = 0, calm = 0;
    const act = () => (lastAct = performance.now());
    addEventListener('scroll', act, { passive: true });
    addEventListener('pointermove', act, { passive: true });
    addEventListener('keydown', act);
    (function tick(t) {
      const sv = scrollY - lastY;
      lastY = scrollY;
      // calm eases from 0 (someone is scrolling or moving the pointer) to 1 (page left alone).
      calm += (Math.min(1, Math.max(0, (t - lastAct - 500) / 1500)) - calm) * .04;
      const amp = .3 + .7 * calm, s = t / 1000;
      for (const d of deco) {
        if (!d.on) continue;
        // A damped spring that trails the scroll and overshoots when it stops.
        d.v += (Math.max(-34, Math.min(34, sv * d.k)) - d.y) * .09;
        d.v *= .8;
        d.y += d.v;
        const x = Math.sin(s * d.w[0] + d.p[0]) * 7 * amp;
        const y = Math.sin(s * d.w[1] * 1.4 + d.p[1]) * 9 * amp + d.y;
        const r = Math.sin(s * d.w[2] + d.p[2]) * 5 * amp + d.y * .3;
        d.el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        d.el.style.rotate = `${r.toFixed(2)}deg`;
      }
      requestAnimationFrame(tick);
    })(0);
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
      if (!el.matches('.msg[data-ai]')) {
        await wait(RM ? 0 : 420);
        el.classList.add('show');
        continue;
      }
      if (RM) { el.classList.add('show'); continue; }
      const html = el.innerHTML;
      el.innerHTML = DOTS;
      el.classList.add('show', 'is-typing');
      await wait(rand(700, 1000));
      el.innerHTML = html;
      el.classList.remove('is-typing');
    }
  }
  const chatIO = new IntersectionObserver(ens => ens.forEach(en => {
    if (en.isIntersecting) { chatIO.unobserve(en.target); play(en.target); }
  }), { threshold: .35 });
  $$('[data-chat]').forEach(c => chatIO.observe(c));

  /* ───────── WhatsApp: hover a message, pick a reaction ───────── */
  function react(msg, name) {
    let rx = $('.rx', msg);
    if (!rx) { rx = document.createElement('span'); rx.className = 'rx'; msg.appendChild(rx); }
    rx.innerHTML = `<img src="${PATH[name]}" alt="">`;
    rx.style.animation = 'none'; rx.offsetWidth; rx.style.animation = '';
    msg.classList.add('reacted');
    bump();
  }
  $$('[data-react=picker] .msg').forEach(msg => {
    let t;
    msg.addEventListener('mouseenter', () => {
      clearTimeout(t);
      if ($('.picker', msg) || msg.classList.contains('is-typing')) return;
      const p = document.createElement('div');
      p.className = 'picker';
      p.innerHTML = ['thumbs', 'heart', 'laugh', 'wow', 'clap'].map(n => `<button data-n="${n}" aria-label="${n}"><img src="${PATH[n]}" alt=""></button>`).join('');
      p.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        e.stopPropagation();
        react(msg, b.dataset.n);
        burst(...centerOf(b), { names: [b.dataset.n], n: 5, spread: 90 });
        p.remove();
      });
      msg.appendChild(p);
    });
    msg.addEventListener('mouseleave', () => { t = setTimeout(() => { const p = $('.picker', msg); p && p.remove(); }, 250); });
    msg.addEventListener('click', () => { if (!matchMedia('(hover: hover)').matches) react(msg, 'heart'); });
  });

  /* ───────── Instagram: double-tap a message for a heart ───────── */
  $$('[data-react=doubletap] .msg').forEach(msg => {
    let last = 0;
    const love = () => {
      const h = new Image();
      h.src = PATH['ig-heart'];
      h.className = 'big-heart';
      h.alt = '';
      msg.appendChild(h);
      setTimeout(() => h.remove(), 1000);
      react(msg, 'ig-heart');
      burst(...centerOf(msg), { names: ['ig-heart', 'heart', 'hearteyes'], n: 6, spread: 110 });
    };
    msg.addEventListener('dblclick', e => { e.preventDefault(); love(); });
    msg.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') return;
      const now = Date.now();
      if (now - last < 320) love();
      last = now;
    });
  });

  /* ───────── Facebook: live reactions float up the card ───────── */
  $$('[data-live]').forEach(bar => {
    const phone = bar.closest('.phone');
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const c = $('b', b);
      c.textContent = +c.textContent + 1;
      bump();
      if (RM) return;
      const pr = phone.getBoundingClientRect(), br = b.getBoundingClientRect();
      for (let i = 0; i < 3; i++) {
        const img = new Image();
        img.src = PATH[b.dataset.r];
        img.className = 'live-rx';
        img.alt = '';
        img.style.left = `${br.left - pr.left + br.width / 2 - 20 + rand(-10, 10)}px`;
        phone.appendChild(img);
        const sway = rand(-50, 50);
        img.animate([
          { transform: 'translateY(0) scale(.3)', opacity: 0 },
          { transform: `translate(${sway * .3}px,-60px) scale(1.1)`, opacity: 1, offset: .15 },
          { transform: `translate(${-sway * .5}px,-180px) scale(1)`, opacity: 1, offset: .55 },
          { transform: `translate(${sway}px,-340px) scale(.8)`, opacity: 0 }
        ], { duration: rand(1800, 2400), delay: i * 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }).onfinish = () => img.remove();
      }
    });
  });

  /* ───────── Mesh gradient (hero + tone) ─────────
   * The Figma "Mesh gradient" fill: a 4x4 grid of colour points blended with Catmull-Rom curves in linear light.
   * Drawn on a tiny canvas that CSS stretches and blurs. Each inner point drifts slowly towards a neighbour's colour. */
  const MESH = [
    [1, .592, .502], [1, .592, .502], [1, .847, .588], [.962, .739, .369],
    [.780, .800, .992], [.780, .800, .992], [.969, .820, .984], [.969, .820, .984],
    [.969, .820, .984], [.820, .914, .988], [1, .710, .647], [1, .592, .502],
    [.962, .739, .369], [1, .912, .762], [.780, .800, .992], [.780, .800, .992]
  ];
  const toLin = v => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  const toSrgb = v => (v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055);
  const LIN = MESH.map(c => c.map(toLin));
  const cat = (a, b, c, d, t) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  // Each point swaps a little colour with a partner, on its own slow clock.
  const PARTNER = [1, 2, 3, 2, 5, 6, 7, 6, 9, 10, 11, 10, 13, 14, 15, 14];
  const SPEED = LIN.map((_, i) => .00011 + (i % 5) * .000023);
  function meshColours(t) {
    return LIN.map((c, i) => {
      const k = .38 * (.5 - .5 * Math.cos(t * SPEED[i] + i * 1.7));
      const o = LIN[PARTNER[i]];
      return [c[0] + (o[0] - c[0]) * k, c[1] + (o[1] - c[1]) * k, c[2] + (o[2] - c[2]) * k];
    });
  }
  function drawMesh(cv, t) {
    const W = cv.width, H = cv.height, ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = img.data;
    const P = meshColours(t);
    const seg = v => { const s = Math.min(v * 3, 2.9999), i = Math.floor(s); return [i, s - i]; };
    for (let y = 0; y < H; y++) {
      const [iy, ty] = seg(y / (H - 1));
      const rows = [iy - 1, iy, iy + 1, iy + 2].map(r => Math.min(Math.max(r, 0), 3));
      for (let x = 0; x < W; x++) {
        const [ix, tx] = seg(x / (W - 1));
        const cols = [ix - 1, ix, ix + 1, ix + 2].map(c => Math.min(Math.max(c, 0), 3));
        const o = (y * W + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const r = rows.map(rr => cat(...cols.map(cc => P[rr * 4 + cc][ch]), tx));
          px[o + ch] = 255 * toSrgb(Math.min(Math.max(cat(...r, ty), 0), 1));
        }
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const meshes = $$('canvas[data-mesh]').map(cv => { cv.width = 72; cv.height = 42; drawMesh(cv, 0); return { cv, seen: false }; });
  if (!RM && meshes.length) {
    const meshIO = new IntersectionObserver(ens => ens.forEach(en => {
      const m = meshes.find(m => m.cv === en.target);
      if (m) m.seen = en.isIntersecting;
    }));
    meshes.forEach(m => meshIO.observe(m.cv));
    let last = 0;
    (function tick(now) {
      // About 20 redraws a second is plenty for a change this slow.
      if (now - last > 50) {
        last = now;
        meshes.forEach(m => { if (m.seen && getComputedStyle(m.cv.parentNode).opacity !== '0') drawMesh(m.cv, now); });
      }
      requestAnimationFrame(tick);
    })(0);
  }

  /* ───────── Tone of voice slider ───────── */
  const TONES = [
    ['Formal', "I'm sorry to hear that. I have opened a delivery investigation for order #4821, and you will receive an update within 24 hours. If the parcel does not arrive, we will send a replacement at no cost."],
    ['Friendly', "Oh no, sorry about that! I've opened an investigation with the carrier for order #4821. You'll hear from us within 24 hours, and if it doesn't turn up, we'll send a new one for free."],
    ['Casual', "Ugh, the worst. I've already chased the carrier on #4821 :thinking: You'll get an update within a day, and if it's really gone, a new one ships free."],
    ['Playful', "Plot twist nobody asked for :wow: I'm on it: carrier investigation started for #4821 :sparkle: Update within 24h, and if your parcel ran off, a fresh one ships free :parcel::heart:"]
  ];
  const range = $('#tone-range'), reply = $('.tone-reply'), faces = $$('.tone-faces img'), stops = $$('.tone-stops span');
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
    if (i === 3) burst(...centerOf(reply), { names: ['tongue', 'laugh', 'party', 'stars', 'fire'], n: 8, spread: 200 });
  }
  range.addEventListener('input', () => setTone(+range.value));
  setTone(+range.value, false);
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); setTone(+range.value); } }, { threshold: .5 }).observe(reply);

  /* ───────── Gaia ───────── */
  // Typed answers.
  $$('[data-type]').forEach(el => {
    const html = el.innerHTML;
    if (RM) return;
    el.innerHTML = DOTS;
    new IntersectionObserver(async ([en], o) => {
      if (!en.isIntersecting) return;
      o.disconnect();
      await wait(900);
      const parts = html.split(/(<img[^>]*>)/).flatMap(p => (p.startsWith('<img') ? [p] : [...p]));
      let out = '';
      for (const p of parts) { out += p; el.innerHTML = out; await wait(14); }
    }, { threshold: .6 }).observe(el);
  });

  $$('[data-burst]').forEach(b => b.addEventListener('click', () => {
    b.classList.add('done');
    b.textContent = 'Added to your reply';
    burst(...centerOf(b), { names: [b.dataset.burst, 'sparkle', 'wand'], n: 6, spread: 100 });
    bump();
  }));

  // Onboarding checklist runs itself.
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
      burst(...centerOf(box), { names: ['party', 'rocket', 'sparkle', 'clap'], n: 10, spread: 220 });
    }, { threshold: .6 }).observe(box);
  });

  // Hub tabs.
  const tabs = $$('.tabs [role=tab]');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(o => {
      const on = o === t;
      o.setAttribute('aria-selected', on);
      const p = document.getElementById(o.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on) { p.classList.remove('in'); p.offsetWidth; p.classList.add('in'); }
    });
  }));

  $$('[data-fix]').forEach(b => b.addEventListener('click', async () => {
    if (b.classList.contains('done')) return;
    b.textContent = 'Drafting…';
    await wait(RM ? 0 : 900);
    b.textContent = 'Draft ready';
    b.classList.add('done');
    burst(...centerOf(b), { names: ['sparkle', 'bulb', 'clap'], n: 7, spread: 110 });
    bump();
  }));
  $$('.routine input').forEach(inp => inp.addEventListener('change', () => {
    if (inp.checked) { burst(...centerOf(inp.nextElementSibling), { names: ['clap', 'sparkle', 'thumbs'], n: 5, spread: 80 }); bump(); }
  }));

  /* ───────── Actions in Skills: drag or click an action into a step ───────── */
  const skill = $('[data-skill]');
  const slots = $$('[data-slot]', skill);
  const blank = slots[0].innerHTML;
  function fill(slot, action) {
    slot.innerHTML = `<span class="got"><img src="${PATH.bolt}" alt="">${action.dataset.action} <small>${action.dataset.app}</small></span>`;
    slot.classList.add('filled');
    action.classList.add('used');
    burst(...centerOf(slot), { names: ['bolt', 'sparkle', 'thumbs'], n: 7, spread: 120 });
    bump();
    if (slots.every(s => s.classList.contains('filled'))) runSkill();
  }
  // Once both action steps are set, show AI Agent running the skill.
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
    a.addEventListener('pointerdown', e => {
      s = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try { a.setPointerCapture(e.pointerId); } catch (_) {}
    });
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
      if (ghost) {
        ghost.remove(); ghost = null;
        if (over) { over.classList.remove('over'); fill(over, a); over = null; }
      } else {
        const free = slots.find(x => !x.classList.contains('filled'));
        free && fill(free, a);
      }
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
  // The "after" state shows its result on first view; the button then toggles it.
  new IntersectionObserver(async ([en], o) => {
    if (!en.isIntersecting) return;
    o.disconnect();
    await wait(RM ? 0 : 1400);
    if (mlt.dataset.mode === 'after') row.classList.add('open');
  }, { threshold: .6 }).observe(mlt);
  $('.mlt-btn').addEventListener('click', e => {
    const open = row.classList.toggle('open');
    if (open) { burst(e.clientX, e.clientY, { names: ['search', 'sparkle', 'hearteyes', 'bag'], n: 6, spread: 110 }); bump(); }
  });

  /* ───────── Divider rows ───────── */
  $$('[data-divider]').forEach(d => {
    d.innerHTML = d.dataset.divider.split(',').map((n, i) => `<img src="${PATH[n]}" alt="" data-n="${n}" style="--i:${i}">`).join('');
    d.addEventListener('click', e => {
      const img = e.target.closest('img');
      if (!img) return;
      burst(e.clientX, e.clientY, { names: [img.dataset.n], n: 6 });
      bump();
    });
    new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      d.classList.remove('wave'); d.offsetWidth; d.classList.add('wave');
    }, { threshold: .8 }).observe(d);
  });

  /* ───────── Pinned promo shows once the hero and promo scroll away ───────── */
  const pinned = $('.pinned');
  const vis = new Map();
  const pinIO = new IntersectionObserver(ens => {
    ens.forEach(en => vis.set(en.target, en.isIntersecting));
    pinned.classList.toggle('on', ![...vis.values()].some(Boolean));
  }, { threshold: .05 });
  [$('.hero'), $('#promo')].forEach(el => pinIO.observe(el));

  /* ───────── "Text us" buttons copy the number ───────── */
  $$('[data-copy]').forEach(b => b.addEventListener('click', e => {
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).catch(() => {});
    toast(`${b.dataset.copy} copied. Say hi!`, 'wink');
    burst(e.clientX, e.clientY, { names: ['gift', 'party', 'wink', 'heart'], n: 8 });
    bump();
  }));
})();
