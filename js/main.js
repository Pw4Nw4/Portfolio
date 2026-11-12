/* Rock Frederic — portfolio interactions. No dependencies. */
(() => {
  'use strict';

  const root = document.documentElement;
  const calm = root.dataset.motion === 'calm'; // set in <head>: saved choice, else the device setting
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Hero name: split into letters ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });

  /* Start the intro once fonts are in, so the letters don't jump. */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(() => root.classList.add('is-ready'));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1400);

  /* ---------- Scroll reveal ---------- */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--d', `${(i * 0.08).toFixed(2)}s`);
    });
  });

  const release = (el) => {
    // hand the element back to its own hover transitions once it has landed
    setTimeout(() => {
      el.classList.add('is-in');
      el.removeAttribute('data-reveal');
      el.style.removeProperty('--d');
    }, 1700);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
        release(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -9% 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Rotating phrase ---------- */
  const rot = $('[data-rotator]');
  if (rot) {
    const items = [...rot.children];
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      const cur = items[i];
      i = (i + 1) % items.length;
      cur.classList.remove('is-on');
      cur.classList.add('is-off');
      items[i].classList.add('is-on');
      // once it has left, let it drop back below (invisible) for its next turn
      setTimeout(() => cur.classList.remove('is-off'), 900);
    }, 2600);
  }

  /* ---------- Count-up stats ---------- */
  const counters = $$('[data-count]');
  if (counters.length && !calm) {
    counters.forEach((el) => { el.textContent = `0${el.dataset.suffix || ''}`; });
    const run = () => counters.forEach((el, n) => {
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now() + n * 120;
      const dur = 1300;
      const tick = (now) => {
        const p = clamp((now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    setTimeout(run, 1500);
  }

  /* ---------- Statement: words light up as you scroll ---------- */
  const scrubs = $$('[data-scrub]').map((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const words = [];
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
        words.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return { el, words };
  });

  /* ---------- Story photos: drift inside their frames (full motion only) ---------- */
  const parallax = calm ? [] : $$('[data-parallax]').map((el) => ({ frame: $('.photo__in', el), img: $('img', el) }));

  /* ---------- Scroll-linked updates ---------- */
  const nav = $('#nav');
  const bar = $('.progress span');
  const flow = $('[data-flow]');
  const flowNodes = flow ? $$('.flow__node', flow) : [];
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;

    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;

    nav.classList.toggle('is-scrolled', y > 24);
    if (!menuOpen && Math.abs(y - lastY) > 6) {
      nav.classList.toggle('is-hidden', y > lastY && y > 420);
      lastY = y;
    }

    scrubs.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.3));
      const head = p * (words.length + 4);
      words.forEach((w, i) => { w.style.opacity = (0.16 + 0.84 * clamp(head - i)).toFixed(2); });
    });

    parallax.forEach(({ frame, img }) => {
      const r = frame.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) return;
      const extra = img.offsetHeight - r.height;
      if (extra <= 0) return;
      const p = clamp((vh - r.top) / (vh + r.height)); // 0 as it enters, 1 as it leaves
      img.style.setProperty('--py', `${((p - 0.5) * extra).toFixed(1)}px`);
    });

    if (flow) {
      const r = flow.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / Math.max(vh * 0.42, r.height * 0.9));
      flow.style.setProperty('--p', p.toFixed(3));
      const last = flowNodes.length - 1;
      flowNodes.forEach((n, i) => n.classList.toggle('is-on', p >= i / last - 0.015));
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  /* ---------- Active nav link ---------- */
  const links = $$('.nav__links a');
  if ('IntersectionObserver' in window && links.length) {
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = byId.get(e.target.id);
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const setMenu = (open) => {
    menuOpen = open;
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav.classList.remove('is-hidden');
  };
  toggle.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  /* ---------- Process steps: a highlight runs through them ---------- */
  const stepsEl = $('[data-steps]');
  if (stepsEl && 'IntersectionObserver' in window) {
    const steps = $$('.step', stepsEl);
    let idx = -1;
    let timer = 0;
    let held = false;
    const activate = (i) => {
      idx = i;
      steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    };
    const play = () => {
      if (timer || held) return;
      activate((idx + 1) % steps.length);
      timer = setInterval(() => activate((idx + 1) % steps.length), 1900);
    };
    const stop = () => { clearInterval(timer); timer = 0; };
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.3 }).observe(stepsEl);
    if (fine) {
      steps.forEach((s, i) => s.addEventListener('pointerenter', () => { held = true; stop(); activate(i); }));
      stepsEl.addEventListener('pointerleave', () => { held = false; play(); });
    }
  }

  /* ---------- Pointer niceties (desktop only) ---------- */
  if (fine) {
    // spotlight that follows the cursor across cards
    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  if (fine && !calm) {
    // buttons lean toward the cursor
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // profile card tilts in 3D
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .12s linear';
        el.style.transform = `perspective(900px) rotateY(${(px * 9).toFixed(2)}deg) rotateX(${(-py * 9).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = '';
        el.style.transform = '';
      });
    });
  }

  /* ---------- Savannah local time, year ---------- */
  const clocks = $$('[data-localtime]');
  if (clocks.length) {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
      const tick = () => { const t = fmt.format(new Date()); clocks.forEach((c) => { c.textContent = t; }); };
      tick();
      setInterval(tick, 15000);
    } catch (err) {
      $$('[data-localtime-wrap]').forEach((el) => el.remove());
    }
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Motion toggle (footer) ---------- */
  const motionBtn = $('[data-motion-toggle]');
  if (motionBtn) {
    const other = calm ? 'full' : 'calm';
    $('b', motionBtn).textContent = calm ? 'Calm' : 'Full';
    motionBtn.setAttribute('aria-label', `Animation level is ${calm ? 'calm' : 'full'}. Switch to ${other}.`);
    motionBtn.addEventListener('click', () => {
      try { localStorage.setItem('motion', other); } catch (err) { /* private mode: nothing to save */ }
      location.reload();
    });
  }

  /* ==========================================================
     Hero field
     Scattered points drift around. Wherever the focus goes
     (the cursor, or a slow path of its own) they settle into
     an ordered grid, connect, and work starts flowing through.
     Calm mode: nothing drifts or travels by itself; the grid
     only follows the cursor.
     ========================================================== */
  (function heroField() {
    const canvas = $('.hero__field');
    if (!canvas || !canvas.getContext) return;
    const hero = canvas.closest('.hero');
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, gap = 48, cols = 0, rows = 0;
    let pts = [], packets = [];
    const focus = { x: 0, y: 0, tx: 0, ty: 0, set: false };
    let lastMove = -1e9, raf = 0, visible = true, t0 = 0, prev = 0;

    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gap = w < 720 ? 36 : 48;
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
      const ox = (w - (cols - 1) * gap) / 2;
      const oy = (h - (rows - 1) * gap) / 2;

      pts = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          pts.push({
            hx: ox + i * gap, hy: oy + j * gap,
            sx: (Math.random() - 0.5) * gap * 1.8, sy: (Math.random() - 0.5) * gap * 1.8,
            a: Math.random() * 6.283, b: Math.random() * 6.283,
            va: 0.25 + Math.random() * 0.6, vb: 0.25 + Math.random() * 0.6,
            x: 0, y: 0, o: 0,
          });
        }
      }
      packets = calm ? [] : Array.from({ length: w < 720 ? 7 : 16 }, () => ({
        row: Math.floor(Math.random() * rows), x: Math.random() * w, v: 46 + Math.random() * 80,
      }));
      if (!focus.set) {
        focus.x = focus.tx = w * 0.72;
        focus.y = focus.ty = h * 0.4;
        focus.set = true;
      }
    }

    function draw(now) {
      if (!t0) { t0 = now; prev = now; }
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const intro = calm ? 1 : 1 - Math.pow(1 - clamp((now - t0 - 250) / 2000), 3);
      const drift = calm ? 0 : 9;

      // no cursor lately: the focus wanders on its own
      if (!calm && now - lastMove > 2400) {
        focus.tx = w * (0.68 + 0.22 * Math.cos(t * 0.21));
        focus.ty = h * (0.42 + 0.24 * Math.sin(t * 0.29));
      }
      const ease = 1 - Math.exp(-dt * 3.4); // same feel at 60Hz or 240Hz
      focus.x += (focus.tx - focus.x) * ease;
      focus.y += (focus.ty - focus.y) * ease;

      const R = Math.min(Math.max(w, h) * 0.36, 430) * intro;
      const order = (x, y) => (R > 1 ? 1 - smooth(R * 0.3, R, Math.hypot(x - focus.x, y - focus.y)) : 0);

      ctx.clearRect(0, 0, w, h);

      if (R > 1) {
        const g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, R * 1.2);
        g.addColorStop(0, 'rgba(84, 94, 235, .24)');
        g.addColorStop(1, 'rgba(84, 94, 235, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(focus.x - R * 1.2, focus.y - R * 1.2, R * 2.4, R * 2.4);
      }

      for (let n = 0; n < pts.length; n++) {
        const p = pts[n];
        const o = order(p.hx, p.hy);
        const k = 1 - o;
        p.o = o;
        p.x = p.hx + k * (p.sx + Math.cos(t * p.va + p.a) * drift);
        p.y = p.hy + k * (p.sy + Math.sin(t * p.vb + p.b) * drift);
      }

      // connections appear only where things are in order
      ctx.lineWidth = 1;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const p = pts[j * cols + i];
          if (p.o < 0.03) continue;
          if (i < cols - 1) {
            const q = pts[j * cols + i + 1];
            const a = Math.min(p.o, q.o);
            if (a > 0.03) {
              ctx.strokeStyle = `rgba(134, 144, 255, ${(a * 0.5).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
          if (j < rows - 1) {
            const q = pts[(j + 1) * cols + i];
            const a = Math.min(p.o, q.o);
            if (a > 0.03) {
              ctx.strokeStyle = `rgba(134, 144, 255, ${(a * 0.34).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        }
      }

      for (let n = 0; n < pts.length; n++) {
        const p = pts[n];
        const s = 1.3 + p.o * 1.5;
        ctx.fillStyle = p.o > 0.5
          ? `rgba(222, 226, 255, ${(0.45 + p.o * 0.55).toFixed(3)})`
          : `rgba(150, 158, 225, ${(0.2 + p.o * 0.5).toFixed(3)})`;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }

      // work moving along the ordered rows
      for (let n = 0; n < packets.length; n++) {
        const k = packets[n];
        k.x += k.v * dt;
        if (k.x > w + 30) { k.x = -30; k.row = Math.floor(Math.random() * rows); }
        const y = pts[k.row * cols].hy;
        const o = order(k.x, y);
        if (o > 0.08) {
          ctx.fillStyle = `rgba(255, 170, 92, ${(o * 0.38).toFixed(3)})`;
          ctx.fillRect(k.x - 22, y - 0.75, 22, 1.5);
          ctx.fillStyle = `rgba(255, 178, 104, ${o.toFixed(3)})`;
          ctx.beginPath(); ctx.arc(k.x, y, 2.2, 0, 6.283); ctx.fill();
        }
      }

      if (visible) raf = requestAnimationFrame(draw);
    }

    const play = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };

    build();
    play();

    if (fine) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = hero.getBoundingClientRect();
        if (e.clientY > r.bottom || e.clientY < r.top) return;
        focus.tx = e.clientX - r.left;
        focus.ty = e.clientY - r.top;
        lastMove = performance.now();
      }, { passive: true });
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (hero.clientWidth === w && Math.abs(hero.clientHeight - h) < 120) return; // ignore mobile URL-bar jitter
        build();
        play();
      }, 180);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) play(); else cancelAnimationFrame(raf);
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (visible) { prev = performance.now(); play(); }
    });
  })();
})();
