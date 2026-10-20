// kit.js: one feel across the whole site. Loaded on every page (post.py adds it).
//  · Motion toolkit: two speeds (quick 180ms, smooth 520ms), one curve, things leave faster than they arrive.
//  · Every control: a hover (each page's own), a small press, a keyboard focus ring, and a done state that confirms in place.
//  · KM.say(el, text): a short mono confirmation beside the thing that was used, which fades by itself.
//  · Blur-up: pictures start as a soft blur of their own thumbnail and sharpen as they arrive (others simply fade in).
//  · Cursor light: on every still picture marked [data-light] (all design pieces and shop pictures), the pointer becomes the studio lamp.
//  · Keep the picture: opening a case study from Designs carries the picture across and lands it on the new page.
//  · Role match: KM.role, the "Hiring for" choice a recruiter makes, remembered for this visit and the next.
// With "reduce motion" on, all of it still works; it just doesn't glide.
(function () {
  if (window.KM && window.KM.kit) return;
  const KM = window.KM = window.KM || {}; KM.kit = true;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const M = KM.motion = { quick: 180, move: 520, leave: 360, ease: 'cubic-bezier(.2,.8,.2,1)' };
  const store = KM.store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { v == null || v === '' ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} }
  };

  const st = document.createElement('style');
  st.textContent = `
  :root { --km-quick: ${M.quick}ms; --km-move: ${M.move}ms; --km-leave: ${M.leave}ms; --km-ease: ${M.ease}; --km-ring: var(--ink, #111) }
  /* press: controls sink a touch while held (the scale property stacks on top of any transform the control already has) */
  :where(button, [role="button"], .btn, .chip):not(:disabled):active { scale: .97 }
  /* keyboard focus: a clear ring wherever a page hasn't drawn its own */
  :where(a, button, [role="button"], [tabindex], input, select, textarea, summary):focus-visible { outline: 2px solid var(--km-ring); outline-offset: 2px }   /* neutral: red is kept for the active tick */
  /* in-place confirmation */
  .km-say { position: fixed; z-index: 2147482000; padding: 5px 10px; border-radius: 999px; background: var(--ink, #111); color: var(--bg, #fff); font: 500 11.5px "Geist Mono", ui-monospace, monospace; letter-spacing: .2px;
    white-space: nowrap; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity var(--km-leave) var(--km-ease), transform var(--km-leave) var(--km-ease) }
  .km-say.on { opacity: 1; transform: none; transition-duration: var(--km-quick) }
  /* blur-up */
  img.km-lq { filter: blur(12px); background-size: cover; background-position: center; background-repeat: no-repeat }
  img.km-fade { opacity: 0 }
  /* cursor light */
  [data-light] { position: relative }
  .km-glow, .km-shade { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 2; border-radius: inherit; transition: opacity var(--km-move) var(--km-ease) }
  .km-glow { background: radial-gradient(circle at var(--lx, 32%) var(--ly, 26%), rgb(255 255 255 / .75), rgb(255 255 255 / .18) 30%, transparent 58%); mix-blend-mode: soft-light }
  .km-shade { background: radial-gradient(circle at var(--lx, 32%) var(--ly, 26%), transparent 38%, rgb(0 0 0 / .38) 98%); mix-blend-mode: multiply }
  [data-light].km-lit .km-glow, [data-light].km-lit .km-shade { opacity: 1; transition-duration: var(--km-quick) }
  /* keep the picture */
  .km-keep { position: fixed; z-index: 2147483001; margin: 0; overflow: hidden; pointer-events: none; transform-origin: 0 0; border-radius: 6px; box-shadow: 0 24px 60px -20px rgb(0 0 0 / .45) }
  .km-keep img { width: 100%; height: 100%; object-fit: cover; display: block }
  @media (prefers-reduced-motion: reduce) { img.km-lq { filter: none } :where(button, [role="button"], .btn, .chip):active { scale: none } }`;
  (document.head || root).appendChild(st);

  // ---------- in-place confirmation ----------
  let sayEl = null, sayT = 0;
  KM.say = function (anchor, text, hold) {
    if (!sayEl) { sayEl = document.createElement('div'); sayEl.className = 'km-say'; sayEl.setAttribute('role', 'status'); sayEl.setAttribute('aria-live', 'polite'); document.body.appendChild(sayEl); }
    sayEl.textContent = text;
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, bottom: innerHeight - 80, top: innerHeight - 80, width: 0 };
    sayEl.style.left = '0px'; sayEl.style.top = '0px'; sayEl.classList.remove('on');
    const w = sayEl.offsetWidth, below = r.bottom + 10 + 30 < innerHeight;
    sayEl.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    sayEl.style.top = (below ? r.bottom + 10 : r.top - 38) + 'px';
    requestAnimationFrame(() => sayEl.classList.add('on'));
    clearTimeout(sayT); sayT = setTimeout(() => sayEl.classList.remove('on'), hold || 2000);
  };

  // ---------- blur-up ----------
  const THUMB = /(^|\/)assets\/designs\/(?:md\/)?([^/?#]+)\.(webp|jpe?g|png)(\?.*)?$/i;
  function prep(img) {
    if (img.dataset.kmImg || img.closest('.tuner, .km-keep, [data-nokit]')) return; img.dataset.kmImg = '1';
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || /\.svg(\?|$)/i.test(src) || (img.width && img.width < 48 && img.complete)) return;
    if (img.complete && img.naturalWidth) return;                                  // already here: nothing to do
    const m = src.match(THUMB), lq = m && !/\/thumbs\//.test(src) ? src.replace(/assets\/designs\/(?:md\/)?/, 'assets/designs/thumbs/').replace(/\?.*$/, '') : null;
    if (reduce) return;
    if (lq) { img.style.backgroundImage = `url("${lq}")`; img.classList.add('km-lq'); } else img.classList.add('km-fade');
    const done = () => {
      const t = getComputedStyle(img).transition, own = t && !/^all 0s/.test(t) ? t + ', ' : '';
      img.style.transition = own + `filter ${M.move}ms ${M.ease}, opacity ${M.move}ms ${M.ease}`;
      requestAnimationFrame(() => { img.classList.remove('km-lq', 'km-fade'); setTimeout(() => { img.style.transition = ''; img.style.backgroundImage = ''; }, M.move + 80); });
    };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', () => { img.classList.remove('km-lq', 'km-fade'); img.style.backgroundImage = ''; }, { once: true });
  }
  const scan = n => { if (n.tagName === 'IMG') prep(n); else if (n.querySelectorAll) n.querySelectorAll('img').forEach(prep); };

  // ---------- cursor light ----------
  function light(el) {
    if (el.dataset.kmLight) { if (el._kmLamp) el._kmLamp(); return; } el.dataset.kmLight = '1';
    const g = document.createElement('i'), s = document.createElement('i'); g.className = 'km-glow'; s.className = 'km-shade';
    const lamp = el._kmLamp = () => { if (!g.isConnected) el.append(s, g); }; lamp();   /* put back if the picture inside was swapped */
    if (reduce) { el.classList.add('km-lit'); return; }                               // a fixed studio light instead of a moving one
    let raf = 0, px = .32, py = .26;
    const paint = () => { raf = 0; el.style.setProperty('--lx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--ly', (py * 100).toFixed(1) + '%'); };
    const mv = e => { if (!el.hasAttribute('data-light')) return; lamp(); const r = el.getBoundingClientRect(); px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); el.classList.add('km-lit'); if (!raf) raf = requestAnimationFrame(paint); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerdown', mv);
    const off = () => el.classList.remove('km-lit'); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
  }

  KM.light = el => el && light(el);   // for a picture that becomes lit after the page loads
  const watch = () => {
    scan(document.body); document.querySelectorAll('[data-light]').forEach(light);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return; scan(n);
      if (n.matches && n.matches('[data-light]')) light(n); if (n.querySelectorAll) n.querySelectorAll('[data-light]').forEach(light);
    }))).observe(document.body, { childList: true, subtree: true });
  };

  // ---------- role match ----------
  const ROLES = ['Product', 'Brand', '3D', 'Motion'];
  KM.role = {
    list: ROLES,
    get() { const r = store.get('km-role'); return ROLES.includes(r) ? r : ''; },
    set(r) { r = ROLES.includes(r) ? r : ''; store.set('km-role', r); dispatchEvent(new CustomEvent('km-role', { detail: r })); }
  };

  // ---------- keep the picture (arriving) ----------
  // Designs stores the picture and where it sat; this page shows it there above the tuning screen, then lands it on the same picture here.
  function arrive() {
    let k = null; try { k = JSON.parse(sessionStorage.getItem('km-keep') || 'null'); sessionStorage.removeItem('km-keep'); } catch (_) {}
    if (!k || Date.now() - k.t > 9000 || reduce) return;
    const f = document.createElement('div'); f.className = 'km-keep'; f.innerHTML = `<img alt="" src="${k.src}">`;
    Object.assign(f.style, { left: k.x + 'px', top: k.y + 'px', width: k.w + 'px', height: k.h + 'px' }); document.body.appendChild(f);
    const base = u => String(u || '').split(/[?#]/)[0].split('/').pop().replace(/\.(webp|jpe?g|png)$/i, '');
    const want = base(k.src);
    const find = () => [...document.images].find(im => im !== f.firstChild && base(im.currentSrc || im.src) === want && (() => { const r = im.getBoundingClientRect(); return r.width > 40 && r.bottom > 0 && r.top < innerHeight; })());
    const t0 = Date.now();
    (function wait() {
      if (root.classList.contains('tuning') || document.querySelector('.tuner.on')) { if (Date.now() - t0 < 6000) return setTimeout(wait, 60); }
      const im = find();
      if (!im) { f.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: M.leave, easing: M.ease, fill: 'forwards' }).onfinish = () => f.remove(); return; }
      const z = im.getBoundingClientRect(), a = { left: k.x, top: k.y, width: k.w, height: k.h };
      im.style.visibility = 'hidden';
      Object.assign(f.style, { left: z.left + 'px', top: z.top + 'px', width: z.width + 'px', height: z.height + 'px', borderRadius: getComputedStyle(im).borderRadius || '0px', boxShadow: 'none' });
      f.firstChild.style.objectFit = getComputedStyle(im).objectFit || 'cover';
      f.animate([{ transform: `translate(${a.left - z.left}px, ${a.top - z.top}px) scale(${a.width / z.width}, ${a.height / z.height})` }, { transform: 'none' }], { duration: M.move, easing: M.ease, fill: 'both' })
        .onfinish = () => { im.style.visibility = ''; f.remove(); };
    })();
  }
  // leaving: what Designs calls before it moves to a case study
  KM.keep = (src, r) => { try { sessionStorage.setItem('km-keep', JSON.stringify({ src, x: r.left, y: r.top, w: r.width, h: r.height, t: Date.now() })); } catch (_) {} };

  // ---------- the way back: the pages this visit has passed through (per tab). A page's own back control returns to the page
  // you came from (a case study opened from Projects goes back to Projects; one opened from a piece on Designs goes back to that piece);
  // only when you arrived from nowhere does it fall back to its usual place. Moving within a page (next case, a hash) replaces its entry.
  const TR = 'km-trail', fileOf = u => u.split('#')[0].split('?')[0] || 'index.html';
  const here = () => (location.pathname.split('/').pop() || 'index.html') + location.hash;
  const readT = () => { try { return JSON.parse(sessionStorage.getItem(TR)) || []; } catch (_) { return []; } };
  const writeT = a => { try { sessionStorage.setItem(TR, JSON.stringify(a.slice(-30))); } catch (_) {} };
  const nameHere = () => ((document.querySelector('.cnav .nm, [data-readout] .nm, .station .nm, .now .nm') || {}).textContent || document.title.split(' · ')[0]).trim();
  KM.trail = {
    mark(u = here(), t) { const a = readT(), top = a[a.length - 1];
      const back = a.length > 1 && a[a.length - 2].u === u ? a[a.length - 2] : null;
      if (t === undefined) t = back && back.t ? back.t : top && top.u === u && top.t ? top.t : nameHere();   // an automatic mark never renames a place the page already named (e.g. a Designs filter), even when you come back to it
      const e = { u, t };
      if (a.length > 1 && a[a.length - 2].u === u) { a.pop(); a[a.length - 1] = e; }                      // went back a step
      else if (a.length && fileOf(a[a.length - 1].u) === fileOf(u)) a[a.length - 1] = e;                 // same page, new place on it
      else a.push(e);
      writeT(a); },
    // the page before this one, read as if this page were already marked (so it is right from the first moment, and when you have just come back)
    prev() { const a = readT(), u = here(), f = fileOf(u);
      if (a.length > 1 && a[a.length - 2].u === u) a.pop();                       // came back a step: the last entry is where we came back from
      else if (!a.length || fileOf(a[a.length - 1].u) !== f) a.push({ u });      // new here: this page goes on the end
      for (let i = a.length - 2; i >= 0; i--) if (fileOf(a[i].u) !== f) return a[i];
      return null; },
    // where a back control should go, and what to call it
    back(fallback, fallbackName) { const p = KM.trail.prev(); if (!p) return { href: fallback, name: fallbackName };
      const f = fileOf(p.u); return { href: p.u, name: f === 'designs.html' && !/#[pf]-/.test(p.u) ? 'All designs' : f === 'index.html' ? 'Home' : f === 'projects.html' ? 'Projects' : (p.t || fallbackName) }; },
    // take the way back: when the page we name is the one right behind us in the browser's history, step back through it
    // (so the browser's own back button and this one always agree); otherwise go there.
    go(b, o) { const st = history.state, bk = !!(st && st.kmPrev && st.kmPrev === b.href && history.length > 1);
      if (window.Tuner) Tuner.go(Object.assign({}, o || {}, { name: b.name, href: b.href, back: bk })); else if (bk) history.back(); else location.href = b.href; },
    // what this history entry knows: which page sits right behind it. Pages that push their own entries (Designs) keep it with them.
    state(extra) { return Object.assign({}, history.state || {}, { kmPrev: kmPrev }, extra || {}); }
  };
  // which page is right behind this one in the history: the trail's last page, if that is where the browser says we came from
  let kmPrev = null;
  try { const st = history.state; if (st && 'kmPrev' in st) kmPrev = st.kmPrev;
    else { const p = KM.trail.prev(); let rf = ''; try { const r = new URL(document.referrer); if (r.origin === location.origin) rf = r.pathname.split('/').pop() || 'index.html'; } catch (_) {}
      kmPrev = p && rf && fileOf(p.u) === rf ? p.u : null; history.replaceState(KM.trail.state(), ''); } } catch (_) {}
  addEventListener('hashchange', () => { try { if (!history.state || !('kmPrev' in history.state)) history.replaceState(KM.trail.state(), ''); } catch (_) {} KM.trail.mark(); });
  addEventListener('pageshow', e => { if (!e.persisted) return;
    // back with the browser's back button: the page comes back exactly as it was left, so clear what leaving put on it
    // (the picture lifted off its tile, page covers, flying copies, blurs)
    document.querySelectorAll('.km-keep, .pagecover, .fly').forEach(n => n.remove());
    document.body.classList.remove('leaving'); document.querySelectorAll('.tune-out').forEach(n => n.classList.remove('tune-out'));
    try { sessionStorage.removeItem('km-keep'); } catch (_) {}
    KM.trail.mark(); });
  const go = () => { watch(); arrive(); setTimeout(() => KM.trail.mark(), 400); document.dispatchEvent(new Event('km-trail')); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
