/* nav.js */
// The site's one navigation: a tuning scale at the top centre of every page, with the five stations under it.
// The red tick sits over the page you're on. Point at a station and that name lights up; click and the tick
// moves straight to it, then the page tunes in. It replaces every other way of moving around (the home dial, the back
// links and the section dials), so a visitor only ever has one thing to learn. The transition starts on the click. On phones it sits at the bottom.
(function () {
  if (window.KMNAV) return; window.KMNAV = true;
  const STATIONS = [
    { fq: 98.0, name: 'Home', href: 'index.html' },
    { fq: 100.0, name: 'Designs', href: 'designs.html' },
    { fq: 96.0, name: 'Engineering', href: 'engineering.html' },
    { fq: 94.0, name: 'About', href: 'about.html' },
    { fq: 102.0, name: 'Shop', href: 'shop.html', gate: 'shop' }   // shown once the shop is switched on (content/site.json "shop": true)
    // { fq: 102.0, name: 'Projects', href: 'projects.html' },   // Projects is off for now: remove the // to bring it back
  ].filter(s => !s.gate || (window.KM_SITE || {})[s.gate]);
  const file = ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html').replace(/^home\.html$/, 'index.html')).toLowerCase();
  // pages that live under a station: a case study under Projects, a design's own page under Designs
  const PARENT = { 'case.html': 'Designs', 'brand.html': 'Designs',   // case studies sit under Designs while Projects is off
    'logo.html': 'Designs', 'product.html': 'Designs', 'project.html': 'Designs', 'showcase.html': 'Designs' };
  const cur = STATIONS.find(s => s.href === file) || STATIONS.find(s => s.name === PARENT[file]) || STATIONS[0];
  const ci = STATIONS.indexOf(cur), RED = '#fb233b', SP = 74;
  const snd = n => { let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (_) {} if (on && window.Popkit) try { Popkit.play(n); } catch (_) {} };
  const go = s => {
    if (s === cur && !PARENT[file]) { scrollTo({ top: 0, behavior: 'smooth' }); return; }   // already here: back to the top
    const to = s.href === 'index.html' ? 'home' : s.href.replace(/\.html$/, '');   // clean addresses: /designs, not /designs.html
    if (window.Tuner) Tuner.go({ from: cur.fq, to: s.fq, name: s.name, href: to }); else location.href = to;
  };
  const css = `
  .station .back, .sdial, #dialLayer, .side-nav { display: none !important }   /* the old ways of moving around */
  html.kmn { --hero-left: max(24px, calc(50vw - 220px)) !important }            /* Home: without its dial, the intro sits in the middle */
  .kmn-scale { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 150; width: min(480px, calc(100vw - 80px)); height: 66px; overflow: hidden; border-radius: 18px;
    background: color-mix(in srgb, var(--bg, #fff) 82%, transparent); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); color: var(--ink, #111) }
  /* the frosted band: the nav's glass runs edge to edge, from the top of the screen down to the nav (on phones, from the nav to the bottom).
     It sits under the page's own readout and buttons, so they stay sharp on top of it. */
  /* the page melts into it as on Designs: solid page colour behind the nav, thinning to nothing below it, with the blur fading the same way */
  .kmn-band { position: fixed; left: 0; right: 0; top: 0; height: 150px; z-index: 30; pointer-events: none; transition: opacity .3s;
    background: linear-gradient(var(--bg, #fff) 50%, color-mix(in srgb, var(--bg, #fff) 60%, transparent) 72%, transparent);
    -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); -webkit-mask-image: linear-gradient(#000 52%, transparent); mask-image: linear-gradient(#000 52%, transparent) }
  .kmn-band.off { opacity: 0 }
  html.kmn .kmn-scale { background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none }   /* the band already frosts behind it */
  .kmn-scale .tr { position: absolute; inset: 0 }
  .kmn-scale .tk { position: absolute; top: 6px; height: 12px; background: repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 12px); opacity: .3 }
  .kmn-scale .nd { position: absolute; left: 50%; top: 2px; width: 2px; height: 30px; margin-left: -1px; background: ${RED}; border-radius: 1px; z-index: 2; transition: left .42s cubic-bezier(.22,1,.36,1) }
  .kmn-scale button { position: absolute; top: 34px; transform: translateX(-50%); padding: 4px 10px; border: 0; border-radius: 999px; background: none; color: var(--muted, #888); font: 500 13.5px Geist, system-ui, sans-serif; cursor: pointer; white-space: nowrap; transition: color .25s, background .25s }
  .kmn-scale button:hover, .kmn-scale button.pv { color: var(--ink, #111) }
  .kmn-scale button.on { color: var(--ink, #111) }   /* the red tick above is the only highlight */
  .kmn-scale button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px }   /* red is kept for the tick */
  @media (max-width: 900px) { .kmn-scale { top: auto; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); width: calc(100vw - 24px) }
    .kmn-band { top: auto; bottom: 0; height: calc(130px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(transparent, color-mix(in srgb, var(--bg, #fff) 60%, transparent) 28%, var(--bg, #fff) 50%);
      -webkit-mask-image: linear-gradient(transparent, #000 48%); mask-image: linear-gradient(transparent, #000 48%) } }
  @media (max-width: 699px) { .kmn-scale { -webkit-mask-image: none; mask-image: none } .kmn-scale button { font-size: 12.5px; padding: 10px 7px; top: 28px } }   /* taller labels: easier to tap, the text stays put */
  /* phones: the nav lives at the bottom, so a thin frosted strip at the top keeps the page's readout readable as content scrolls under it */
  .kmn-top { display: none }
  @media (max-width: 900px) { .kmn-top { display: block; position: fixed; left: 0; right: 0; top: 0; height: calc(var(--kmn-top, 72px) + env(safe-area-inset-top, 0px)); z-index: 15; pointer-events: none;
    background: linear-gradient(var(--bg, #fff) 45%, color-mix(in srgb, var(--bg, #fff) 55%, transparent) 75%, transparent);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); -webkit-mask-image: linear-gradient(#000 55%, transparent); mask-image: linear-gradient(#000 55%, transparent) } }
  /* phones: a menu button at the top right instead of the scale; it opens the stations as a full-screen list */
  .kmn-mb, .kmn-menu { display: none }
  @media (max-width: 900px) {
    .kmn-scale, .kmn-band, #menuBtn, #menu { display: none !important }
    .kmn-mb { display: grid; place-items: center; position: fixed; z-index: 160; top: calc(16px + env(safe-area-inset-top, 0px)); right: max(16px, env(safe-area-inset-right, 0px)); width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%;
      background: var(--pill, rgb(127 127 127 / .12)); color: var(--ink, #111); cursor: pointer; -webkit-tap-highlight-color: transparent }
    .kmn-mb i { position: absolute; left: 12px; width: 16px; height: 1.5px; border-radius: 2px; background: currentColor; transition: transform .32s cubic-bezier(.65,0,.35,1), opacity .2s, width .32s cubic-bezier(.65,0,.35,1) }
    .kmn-mb i:nth-child(1) { top: 14.5px } .kmn-mb i:nth-child(2) { top: 19.25px; width: 10px; left: 18px }   /* the short line sits to the right */ .kmn-mb i:nth-child(3) { top: 24px }
    html.kmn-open .kmn-mb i:nth-child(1) { transform: translateY(4.75px) rotate(45deg) }
    html.kmn-open .kmn-mb i:nth-child(2) { opacity: 0; width: 0 }
    html.kmn-open .kmn-mb i:nth-child(3) { transform: translateY(-4.75px) rotate(-45deg) }
    .kmn-menu { display: flex; flex-direction: column; justify-content: flex-end; position: fixed; inset: 0; z-index: 158; background: var(--bg, #fff); color: var(--ink, #111);
      padding: calc(88px + env(safe-area-inset-top, 0px)) max(24px, env(safe-area-inset-right, 0px)) calc(40px + env(safe-area-inset-bottom, 0px)) max(24px, env(safe-area-inset-left, 0px));
      opacity: 0; visibility: hidden; transition: opacity .28s, visibility 0s .28s }
    html.kmn-open .kmn-menu { opacity: 1; visibility: visible; transition: opacity .22s }
    html.kmn-open, html.kmn-open body { overflow: hidden }
    .kmn-menu .lb { font: 600 10.5px "Geist Mono", ui-monospace, monospace; letter-spacing: .7px; text-transform: uppercase; color: var(--muted, #888); margin-bottom: 8px }
    .kmn-menu ul { list-style: none; margin: 0; padding: 0 }
    .kmn-menu button { position: relative; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; width: 100%; padding: 16px 0 16px 0; border: 0; border-bottom: 1px solid var(--line, rgb(127 127 127 / .16)); background: none;
      font: 600 34px/1.05 Geist, system-ui, sans-serif; letter-spacing: -1px; color: var(--muted, #999); text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent;
      opacity: 0; transform: translateY(14px); transition: color .2s, opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1) }
    html.kmn-open .kmn-menu button { opacity: 1; transform: none }
    .kmn-menu button.on { color: var(--ink, #111); padding-left: 16px }
    .kmn-menu button.on::before { content: ''; position: absolute; left: 0; top: 50%; width: 2px; height: 30px; margin-top: -15px; border-radius: 1px; background: ${RED} }
    .kmn-menu button:active { color: var(--ink, #111) }
    .kmn-menu small { font: 400 13px "Geist Mono", ui-monospace, monospace; letter-spacing: 0; color: var(--muted, #888); font-variant-numeric: tabular-nums }
    html.kmn-open .shuf, html.kmn-open .pt-rec, html.kmn-open .pt-card, html.kmn-open .vsw { visibility: hidden }
    /* sound and theme live in the menu on phones, so the top bar only carries the page title and the menu button */
    html.kmn-set #soundBtn, html.kmn-set #themeBtn { display: none !important }
    .kmn-menu .kmn-opts { display: flex; gap: 10px; margin-top: 28px; opacity: 0; transform: translateY(14px); transition: opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1) }
    html.kmn-open .kmn-menu .kmn-opts { opacity: 1; transform: none; transition-delay: 320ms }
    .kmn-menu .kmn-opts button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; width: auto; height: 48px; padding: 0 16px; border: 0; border-radius: 999px;
      background: var(--pill, rgb(127 127 127 / .12)); color: var(--ink, #111); font: 500 15px Geist, system-ui, sans-serif; letter-spacing: -.1px; opacity: 1; transform: none; transition: background .2s }
    .kmn-menu .kmn-opts button:active { background: color-mix(in srgb, var(--ink, #111) 14%, var(--bg, #fff)) }
    .kmn-menu .kmn-opts svg { width: 16px; height: 16px; flex: none }
    @media (prefers-reduced-motion: reduce) { .kmn-menu, .kmn-menu button, .kmn-mb i { transition: none } }
  }`;
  const start = () => {
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    document.documentElement.classList.add('kmn');
    const S = document.createElement('nav'); S.className = 'kmn-scale'; S.setAttribute('aria-label', 'Stations');
    const T = document.createElement('div'); T.className = 'tr';
    const tk = document.createElement('div'); tk.className = 'tk'; tk.style.left = '0'; tk.style.width = '100%'; T.append(tk);
    let leaving = false;
    addEventListener('pageshow', e => { if (e.persisted) { leaving = false; back(); } });   // coming back with the browser's back button
    const bs = STATIONS.map((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.name; b.style.left = (i * SP) + 'px';
      b.title = s.fq.toFixed(1) + ' FM'; if (s === cur) { b.className = 'on'; b.setAttribute('aria-current', 'page'); }
      // click: the scale tunes across to the station, then the page changes (the scale only moves on purpose, never under the pointer)
      b.addEventListener('click', () => { snd('pop');   // one pop, right on the click (the page's own click sound is the same pop, so they merge into one)
        if (s !== cur) { leaving = true; place(i); go(s); } else go(s); });
      const look = () => bs.forEach(x => x.classList.toggle('pv', x === b));
      b.addEventListener('pointerenter', e => { look(); if (e.pointerType === 'mouse') snd('detent'); });   /* a tap on a phone is just the pop */
      b.addEventListener('focus', look);
      T.append(b); return b;
    });
    // the scale stays still with every station across it; the red tick goes straight to the one you pick, in one smooth move
    const place = i => { const g = S.clientWidth / STATIONS.length; bs.forEach((b, k) => b.style.left = (g * (k + .5)) + 'px'); nd.style.left = (g * (i + .5)) + 'px'; };
    // once a station is picked, the tick stays there (the page-change overlay would otherwise count as the pointer leaving)
    const back = () => { if (leaving) return; place(ci); bs.forEach(x => x.classList.remove('pv')); };
    addEventListener('resize', back);
    S.addEventListener('mouseleave', back); S.addEventListener('focusout', e => { if (!S.contains(e.relatedTarget)) back(); });
    const nd = document.createElement('i'); nd.className = 'nd';
    S.append(T, nd); const band = document.createElement('div'); band.className = 'kmn-band'; band.setAttribute('aria-hidden', 'true'); document.body.append(band, S);
    // phones: the menu button and its list of stations
    const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'kmn-mb'; mb.setAttribute('aria-label', 'Open menu'); mb.setAttribute('aria-expanded', 'false'); mb.innerHTML = '<i></i><i></i><i></i>';
    const M = document.createElement('nav'); M.className = 'kmn-menu'; M.setAttribute('aria-label', 'Stations'); M.id = 'kmnMenu'; mb.setAttribute('aria-controls', 'kmnMenu');
    M.innerHTML = '<span class="lb">Stations</span><ul>' + STATIONS.map((s, i) => `<li><button type="button" data-i="${i}"${s === cur ? ' class="on" aria-current="page"' : ''}>${s.name}<small>${s.fq.toFixed(1)} FM</small></button></li>`).join('') + '</ul>';
    const mbs = [...M.querySelectorAll('button')];
    const menu = o => { document.documentElement.classList.toggle('kmn-open', o); mb.setAttribute('aria-expanded', String(o)); mb.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
      mbs.forEach((b, k) => b.style.transitionDelay = o ? (60 + k * 45) + 'ms' : '0ms'); M.inert = !o; };
    M.inert = true;
    mb.addEventListener('click', () => { const o = !document.documentElement.classList.contains('kmn-open'); snd(o ? 'open' : 'close'); menu(o); if (o) (mbs.find(b => b.classList.contains('on')) || mbs[0]).focus({ preventScroll: true }); });
    mbs.forEach(b => b.addEventListener('click', () => { const s = STATIONS[+b.dataset.i]; snd('pop');
      if (s === cur && !PARENT[file]) { menu(false); return; } leaving = true; go(s); setTimeout(() => menu(false), 600); }));
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.documentElement.classList.contains('kmn-open')) { menu(false); mb.focus(); } });
    addEventListener('pageshow', e => { if (e.persisted) menu(false); });
    document.body.append(M, mb);
    // phones: the page's sound and theme buttons move into the menu (the menu's buttons press the page's own, so each page keeps its logic)
    const sB = document.getElementById('soundBtn'), tB = document.getElementById('themeBtn');
    if (sB || tB) {
      document.documentElement.classList.add('kmn-set');
      const O = document.createElement('div'); O.className = 'kmn-opts';
      const I = { on: '<path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 5.2a3.5 3.5 0 0 1 0 5.6M12.8 3.4a6 6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
        off: '<path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l3.5 3.5M14.5 6L11 9.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
        moon: '<path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
        sun: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' };
      const svg = d => `<svg viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
      const mk = (src, paint) => { if (!src) return; const b = document.createElement('button'); b.type = 'button';
        b.addEventListener('click', () => { src.click(); setTimeout(paint.bind(null, b), 30); }); paint(b); O.append(b); };
      const soundOn = () => { try { return localStorage.getItem('km-sound') !== 'off'; } catch (_) { return true; } };
      mk(sB, b => { const on = soundOn(); b.innerHTML = svg(on ? I.on : I.off) + (on ? 'Sound on' : 'Sound off'); b.setAttribute('aria-pressed', String(on)); });
      mk(tB, b => { const dk = document.documentElement.dataset.theme === 'dark'; b.innerHTML = svg(dk ? I.sun : I.moon) + (dk ? 'Light mode' : 'Dark mode'); });
      M.append(O);
    }
    if (file !== 'index.html') { const top = document.createElement('div'); top.className = 'kmn-top'; top.setAttribute('aria-hidden', 'true'); document.body.append(top); }
    // a page that opens on a dark hero whatever the theme (About's signal) keeps it clear of the page-colour fade until it scrolls past
    const hero = document.querySelector('.sig');
    if (hero) { const chk = () => band.classList.toggle('off', hero.getBoundingClientRect().bottom > (innerWidth > 900 ? 150 : innerHeight - 130) && innerWidth > 900); addEventListener('scroll', chk, { passive: true }); chk(); }
    nd.style.transition = 'none'; back(); nd.offsetWidth; nd.style.transition = '';   // on arrival it is already in place
    // keyboard: ← and → tune to the neighbouring station, exactly like clicking it (the needle moves, then the page changes).
    // Left alone whenever the arrows mean something else: typing, an open piece, sheet, menu or card, or a control that uses them itself.
    addEventListener('keydown', e => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || leaving) return;
      const a = document.activeElement;
      if (a && a !== document.body && !a.closest('.kmn-scale') && (a.matches('input, textarea, select, [contenteditable], [role="slider"], [role="listbox"], [role="option"], [tabindex]:not(button):not(a)') || a.closest('.ov, .rolepick, .pt-card, [role="dialog"]'))) return;
      if (document.querySelector('body.open, .sheet.open, .lb.on, .pt-card.on, .rolepick.open, .tuner')) return;
      const j = ci + (e.key === 'ArrowRight' ? 1 : -1); if (j < 0 || j >= STATIONS.length) return;
      e.preventDefault(); bs[j].click();
    });
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start); else start();
})();

// The nav's ticks swell around the red needle, like the ruler on the About page.
// Ticks near the needle grow taller and darker in a smooth bump; as the needle glides to a new station the bump
// travels with it, so the scale ripples like a wave flowing under the tick.
(function () {
  const start = () => {
    const S = document.querySelector('.kmn-scale'), tk = S && S.querySelector('.tk'), nd = S && S.querySelector('.nd');
    if (!S || !tk || !nd) return;
    const st = document.createElement('style');
    st.textContent = `.kmn-scale .tk { background: none !important; opacity: 1 !important; height: 30px !important; top: 4px !important }
      .kmn-scale .tk i { position: absolute; top: 0; width: 1px; margin-left: -.5px; background: currentColor; border-radius: 1px }`;
    document.head.append(st);
    let ticks = [];
    const build = () => {
      tk.innerHTML = ''; ticks = [];
      const W = tk.clientWidth;
      for (let x = 6; x < W; x += 12) { const i = document.createElement('i'); i.style.left = x + 'px'; tk.append(i); ticks.push({ i, x }); }
    };
    build(); addEventListener('resize', build);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = -1, settle = 0;
    const frame = t => {
      if (!S.getClientRects().length) { requestAnimationFrame(frame); return; }   // phones: the scale is hidden behind the menu button
      const sr = S.getBoundingClientRect(), nr = nd.getBoundingClientRect(), tr = tk.getBoundingClientRect();
      const n = nr.left + nr.width / 2 - tr.left;                 // the needle, in the ticks' own space
      const moving = Math.abs(n - last) > .2; last = n;
      settle += ((moving ? 1 : 0) - settle) * .08;                 // while it travels, a gentle wave runs through the ticks
      const w = t / 1000;
      for (const o of ticks) {
        const d = (o.x - n) / 46, bump = Math.exp(-d * d);         // the swell under the needle
        const wave = reduce ? 0 : settle * .35 * Math.sin(o.x / 22 - w * 9) * Math.exp(-(((o.x - n) / 140) ** 2));
        const h = 12 + bump * 14 + wave * 8;                      // 12px resting, up to 26px right beside the needle
        o.i.style.height = Math.max(6, h).toFixed(1) + 'px';
        o.i.style.opacity = (.22 + bump * .45 + Math.max(0, wave) * .2).toFixed(3);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(start, 0)); else setTimeout(start, 0);
})();
// any link to another site opens in a new tab, so visitors never leave the portfolio (covers links added later from the CMS too)
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="http"]');
  if (!a || a.target === '_blank' || a.host === location.host) return;
  a.target = '_blank'; a.rel = 'noopener';
}, true);
// two-finger swipe left/right on a trackpad = back/forward, as in any browser. Some pages run their own smooth scroll and
// call preventDefault on every wheel event, which also kills the browser's swipe; sideways swipes skip those handlers
// (nothing on these pages scrolls sideways with the wheel), so the browser's own back/forward swipe works again.
addEventListener('wheel', e => {
  if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.5) return;
  if (document.getElementById('allBtn') && !document.body.classList.contains('all')) return;   /* Designs' row view scrolls sideways itself */
  if (document.body.classList.contains('reelon') && e.target.closest && e.target.closest('.reelv')) return;   /* the Designs Reel: a sideways swipe moves through the pieces */
  e.stopPropagation();
}, { capture: true, passive: true });
;
/* homebg.js */
// Home: a trail of the design pieces follows the mouse. As the pointer moves, pictures appear one after another
// along its path, out of focus as if behind frosted glass, then sink and fade. They sit behind the intro, and never
// under the nav or the links row, so those stay on the plain background.
// The pictures come from content/designs.json, so the CMS keeps them in step with the Designs page.
(function () {
  const L = window.KM_HOMEBG || []; if (!L.length || window.KMHBG) return; window.KMHBG = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;   // mouse only
  const GAP = 80, LIFE = 1100, H = 190;                       // px of travel between pictures, how long each lives (ms), picture height
  const st = document.createElement('style');
  st.textContent = `
  .kmtrail { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden }
  .panel[data-station="home"] { background: transparent }   /* let the trail show through Home's backdrop */
  .kmtrail i { position: absolute; left: 0; top: 0; display: block; border-radius: 6px; background-size: cover; background-position: center; will-change: transform, opacity, filter;
    animation: kmtr ${LIFE}ms cubic-bezier(.22,1,.36,1) forwards }
  @keyframes kmtr {
    0%   { opacity: 0; transform: translate(var(--x), var(--y)) scale(.7) rotate(var(--r)); filter: blur(6px) }
    14%  { opacity: .85; transform: translate(var(--x), var(--y)) scale(1) rotate(var(--r)); filter: blur(10px) }
    100% { opacity: 0; transform: translate(var(--x), calc(var(--y) + 46px)) scale(.86) rotate(var(--r)); filter: blur(24px) }
  }`;
  document.head.append(st);
  const W = document.createElement('div'); W.className = 'kmtrail'; W.setAttribute('aria-hidden', 'true');
  // keep-clear zones: the nav and the links row (with a little breathing room)
  const clear = () => ['.kmn-scale', '.socials'].map(q => document.querySelector(q)).filter(Boolean).map(e => e.getBoundingClientRect());
  const hits = (a, b) => a.left < b.right + 16 && a.right > b.left - 16 && a.top < b.bottom + 16 && a.bottom > b.top - 16;
  let lx = null, ly = null, n = 0;
  const spawn = (x, y) => {
    const it = L[n++ % L.length], h = H, w = h * (it.ratio || 1), box = { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
    if (clear().some(z => hits(box, z))) return;
    const e = document.createElement('i');
    e.style.cssText = `width:${w}px;height:${h}px;background-image:url("${it.src}");--x:${(x - w / 2).toFixed(0)}px;--y:${(y - h / 2).toFixed(0)}px;--r:${(Math.random() * 8 - 4).toFixed(1)}deg`;
    W.append(e); setTimeout(() => e.remove(), LIFE + 50);
  };
  const start = () => {
    document.body.prepend(W);
    // warm the pictures so the first trail doesn't flicker (asked for the way Designs asks, so Designs can reuse the copy)
    L.forEach(it => { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = it.src; });
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !document.querySelector('.panel[data-station="home"]:not([hidden])')) return;
      if (lx === null) { lx = e.clientX; ly = e.clientY; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (dx * dx + dy * dy < GAP * GAP) return;
      lx = e.clientX; ly = e.clientY; spawn(lx, ly);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { lx = ly = null; });
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start); else start();
})();
;
/* kit.js */
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
  .km-say { position: fixed; z-index: 2147482000; padding: 5px 10px; border-radius: 999px; background: var(--ink, #111); color: var(--bg, #fff); font: 600 11.5px "Geist Mono", ui-monospace, monospace; letter-spacing: .2px;
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
  const lqIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; lqIO.unobserve(e.target); const f = e.target._kmLq; e.target._kmLq = null; if (f) f(); }), { rootMargin: '600px 0px' }) : null;
  function prep(img) {
    if (img.dataset.kmImg || img.closest('.tuner, .km-keep, [data-nokit]')) return; img.dataset.kmImg = '1';
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || /\.svg(\?|$)/i.test(src) || (img.width && img.width < 48 && img.complete)) return;
    if (img.complete && img.naturalWidth) return;                                  // already here: nothing to do
    const m = src.match(THUMB), lq = m && !/\/thumbs\//.test(src) ? src.replace(/assets\/designs\/(?:md\/)?/, 'assets/designs/thumbs/').replace(/\?.*$/, '') : null;
    if (reduce) return;
    if (lq) {
      // a lazy picture gets its blurred stand-in only as it nears the screen, so the stand-ins don't all download up front
      const put = () => { if (img.complete && img.naturalWidth) return; img.style.backgroundImage = `url("${lq}")`; };
      if (img.loading === 'lazy' && lqIO) { img._kmLq = put; lqIO.observe(img); } else put();
      img.classList.add('km-lq');
    } else img.classList.add('km-fade');
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
  // only when you arrived from nowhere does it fall back to its usual place. Moving within a page (a hash, a Designs filter) replaces its entry,
  // except on the case study pages, where each case is its own place: Kusnap → next → Bulvds, and back returns to Kusnap.
  const TR = 'km-trail', fileOf = u => u.split('#')[0].split('?')[0] || 'index.html';
  const placeOf = u => /^(case|brand)\.html$/.test(fileOf(u)) ? fileOf(u) + '#' + (u.split('#')[1] || '') : fileOf(u);
  const here = () => ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html').replace(/^home\.html$/, 'index.html')) + location.hash;
  const readT = () => { try { return JSON.parse(sessionStorage.getItem(TR)) || []; } catch (_) { return []; } };
  const writeT = a => { try { sessionStorage.setItem(TR, JSON.stringify(a.slice(-30))); } catch (_) {} };
  const nameHere = () => ((document.querySelector('.cnav .nm, [data-readout] .nm, .station .nm, .now .nm') || {}).textContent || document.title.split(' · ')[0]).trim();
  KM.trail = {
    mark(u = here(), t) { const a = readT(), top = a[a.length - 1];
      const back = a.length > 1 && a[a.length - 2].u === u ? a[a.length - 2] : null;
      if (t === undefined) t = back && back.t ? back.t : top && top.u === u && top.t ? top.t : nameHere();   // an automatic mark never renames a place the page already named (e.g. a Designs filter), even when you come back to it
      const e = { u, t };
      if (a.length > 1 && a[a.length - 2].u === u) { a.pop(); a[a.length - 1] = e; }                      // went back a step
      else if (a.length && placeOf(a[a.length - 1].u) === placeOf(u)) a[a.length - 1] = e;               // same place, updated
      else a.push(e);
      writeT(a); },
    // the page before this one, read as if this page were already marked (so it is right from the first moment, and when you have just come back)
    prev() { const a = readT(), u = here(), f = placeOf(u);
      if (a.length > 1 && a[a.length - 2].u === u) a.pop();                       // came back a step: the last entry is where we came back from
      else if (!a.length || placeOf(a[a.length - 1].u) !== f) a.push({ u });     // new here: this place goes on the end
      for (let i = a.length - 2; i >= 0; i--) if (placeOf(a[i].u) !== f) return a[i];
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
  // a new hash: if it is a new place (another case study), the place we just left is the one right behind it in the history
  addEventListener('hashchange', e => { try { const st = history.state;
      if (st && 'kmPrev' in st) kmPrev = st.kmPrev;
      else { const o = String(e.oldURL || '').split('/').pop(); if (o && placeOf(o) !== placeOf(here())) kmPrev = o; history.replaceState(KM.trail.state(), ''); } } catch (_) {}
    KM.trail.mark(); });
  addEventListener('pageshow', e => { if (!e.persisted) return;
    // back with the browser's back button: the page comes back exactly as it was left, so clear what leaving put on it
    // (the picture lifted off its tile, page covers, flying copies, blurs)
    document.querySelectorAll('.km-keep, .pagecover, .fly, .km-circ').forEach(n => n.remove());
    document.body.classList.remove('leaving'); document.querySelectorAll('.tune-out').forEach(n => n.classList.remove('tune-out'));
    try { sessionStorage.removeItem('km-keep'); } catch (_) {}
    KM.trail.mark(); });
  const go = () => { watch(); arrive(); setTimeout(() => KM.trail.mark(), 400); document.dispatchEvent(new Event('km-trail')); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
;
/* ripple.js */
/* Ripple: pictures react to the pointer like water. Small moves leave soft rings; keep moving and the water builds up,
   stronger and wider, then settles back to still when you rest. One WebGL surface follows the picture under the pointer,
   so the page never holds more than one GL context. It sits over the picture only while the water moves, so a still
   picture is always the browser's own sharp one.
   Works on <img> pictures, motion pieces (<video>, which keep playing under the water) and tiles painted with a CSS
   background (the Designs grid). Pages that paint pictures on their own canvas (the Designs reel) drive it through
   window.KMRipple: drive(src, u, v) as the pointer moves over a picture, and frameFor(src) to get the rippled picture
   back to draw in its place.
   Skips small images, the header and navigation, anything marked data-noripple, touch screens and Reduce Motion. */
(() => {
  if (window.__kmRipple) return; window.__kmRipple = true;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MIN = 140;   // smallest picture (css px) that ripples
  const SKIP = 'header, nav, .kmn-scale, .kmn-menu, .km-tg, [data-noripple], .dback, .cnav, .wb, .kframe, .fw, iframe, .logo, .av, .d-mini .d-info, #row';
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0,1);}';
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D img,wav;uniform vec2 sc,off;uniform float amt,ca;
  void main(){vec4 w=texture2D(wav,v);vec2 n=(w.rg-.5)*2.;float h=(w.b-.5)*2.;
   vec2 uv=off+v*sc, d=n*amt;
   if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){gl_FragColor=vec4(0.);return;}
   vec4 g=texture2D(img,uv+d);
   vec3 c=vec3(texture2D(img,uv+d*(1.+ca)).r,g.g,texture2D(img,uv+d*(1.-ca)).b);
   float s=pow(clamp(dot(normalize(vec3(-n*3.,1.)),normalize(vec3(-.4,-.5,1.))),0.,1.),36.);
   c+=s*.35*clamp(length(n)*6.,0.,1.);c*=1.-h*.06;
   gl_FragColor=vec4(c*g.a,g.a);}`;

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true'); cv.dataset.ripple = '';
  cv.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity .25s;z-index:1;display:block;margin:0;max-width:none';
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const mkTex = u => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; };
  const tImg = mkTex(0), tWav = mkTex(1); gl.uniform1i(U('img'), 0); gl.uniform1i(U('wav'), 1);
  const MAXT = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
  const isV = e => e && e.tagName === 'VIDEO', isMedia = e => e && (e.tagName === 'IMG' || e.tagName === 'VIDEO');
  const natW = m => m.videoWidth || m.naturalWidth || m.width || 0, natH = m => m.videoHeight || m.naturalHeight || m.height || 0;

  // ---------- which picture is under the pointer ----------
  const bgUrl = el => { const b = getComputedStyle(el).backgroundImage; if (!b || b === 'none') return ''; const m = /url\(["']?([^"')]+)["']?\)/.exec(b); return m ? m[1] : ''; };
  function pick(t) {
    if (!(t instanceof Element) || t.closest(SKIP)) return null;
    let el = t.closest('img, video');
    if (!el) for (let e = t, k = 0; e && k < 4; e = e.parentElement, k++) {
      const v = e.querySelector && e.querySelector(':scope > video'); if (v && natW(v)) { el = v; break; }   // a motion tile: its playing video
      const pi = e.querySelector && e.querySelector(':scope > img'); if (pi && pi.naturalWidth && getComputedStyle(pi).pointerEvents === 'none') { el = pi; break; }   // a picture that lets the pointer through (the poster strips)
      if (bgUrl(e)) { el = e; break; } }
    if (!el || el.closest(SKIP) || el.dataset.noripple !== undefined) return null;
    if (el.tagName === 'IMG' && (!el.complete || !el.naturalWidth || /\.svg(\?|$)/i.test(el.currentSrc || el.src))) return null;
    if (isV(el) && el.readyState < 2) return null;
    const r = el.getBoundingClientRect(); if (r.width < MIN || r.height < MIN) return null;
    if (getComputedStyle(el).visibility === 'hidden') return null;
    return el;
  }

  // ---------- the picture as a texture (same-origin or CORS; anything else is left alone) ----------
  const cache = new Map();   // url -> Image (loaded with CORS so WebGL may read it)
  function source(el) {
    if (isV(el)) return el;                                    // videos are read frame by frame, straight from the element
    const u = el.tagName === 'IMG' ? (el.currentSrc || el.src) : bgUrl(el);
    if (!u) return null;
    let im = cache.get(u);
    if (!im) { im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = u; im.onerror = () => { im.bad = true; }; cache.set(u, im); if (cache.size > 40) cache.delete(cache.keys().next().value); }
    return im;
  }

  // ---------- the water ----------
  let GW = 160, GH = 160, A = new Float32Array(GW * GH), B = new Float32Array(GW * GH), px = new Uint8Array(GW * GH * 4);
  let cur = null, curIm = null, mode = 'dom', heat = 0, last = null, inside = false, awake = 0, still = 0, live = false, shown = false;
  const grid = aspect => { const nGH = Math.max(40, Math.min(320, Math.round(GW * aspect))); if (nGH !== GH) { GH = nGH; A = new Float32Array(GW * GH); B = new Float32Array(GW * GH); px = new Uint8Array(GW * GH * 4); } };
  const drop = (gx, gy, rad, amp) => { const r2 = rad * rad, x0 = Math.max(1, gx - rad | 0), x1 = Math.min(GW - 2, gx + rad | 0), y0 = Math.max(1, gy - rad | 0), y1 = Math.min(GH - 2, gy + rad | 0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dd = (x - gx) * (x - gx) + (y - gy) * (y - gy); if (dd < r2) A[y * GW + x] += amp * (.5 + .5 * Math.cos(Math.PI * Math.sqrt(dd / r2))); } };
  function stir(gx, gy) {   // the pointer moved to (gx, gy) on the grid
    if (last) { const dx = gx - last[0], dy = gy - last[1], dist = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(dist / 2));
      heat = Math.min(1, heat + dist * .0025);                                    // the longer you keep moving, the hotter it gets
      const rad = 2.2 + heat * 5.5, amp = (.35 + heat * 1.9) * Math.min(1.6, .35 + dist * .08);
      for (let s = 1; s <= n; s++) drop(last[0] + dx * s / n, last[1] + dy * s / n, rad, amp / n * 1.2); }
    last = [gx, gy]; awake = performance.now(); still = 0;
  }
  const reset = () => { A.fill(0); B.fill(0); heat = 0; last = null; still = 0; };

  function fit() {   // DOM mode: place the canvas exactly over the picture, inside its own positioned parent, so it scrolls with it
    const el = cur, host = isMedia(el) ? el.offsetParent || el.parentElement : el;
    if (!host) return false;
    if (!isMedia(el) && getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (cv.parentElement !== host) host.appendChild(cv);
    // layout sizes (not the on-screen box), so a hover zoom on the tile scales the water with it instead of twice
    const ecs = getComputedStyle(el), ew = el.offsetWidth, eh = el.offsetHeight;
    if (!ew || !eh) return false;
    const left = isMedia(el) ? el.offsetLeft : -parseFloat(ecs.borderLeftWidth || 0), top = isMedia(el) ? el.offsetTop : -parseFloat(ecs.borderTopWidth || 0);
    const d = Math.min(2.5, devicePixelRatio || 1), W = Math.max(1, Math.round(ew * d)), H = Math.max(1, Math.round(eh * d));
    Object.assign(cv.style, { left: left + 'px', top: top + 'px', width: ew + 'px', height: eh + 'px', borderRadius: ecs.borderRadius });
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    grid(eh / ew);
    // object-fit / background-size: cover by default, contain and fill when asked
    const ia = natW(curIm) / natH(curIm), ba = ew / eh;
    const fitMode = isMedia(el) ? ecs.objectFit : (/contain/.test(ecs.backgroundSize) ? 'contain' : 'cover');
    let sx = 1, sy = 1;
    if (fitMode === 'cover' || fitMode === 'none' || fitMode === 'scale-down') { if (ia > ba) sx = ba / ia; else sy = ia / ba; }
    else if (fitMode === 'contain') { if (ia > ba) sy = ia / ba; else sx = ba / ia; }
    gl.uniform2f(U('sc'), sx, sy); gl.uniform2f(U('off'), (1 - sx) / 2, (1 - sy) / 2);
    return true;
  }
  function upload() {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    let src = curIm;
    if (!isV(src) && (natW(src) > MAXT || natH(src) > MAXT)) { const k = MAXT / Math.max(natW(src), natH(src)), c = document.createElement('canvas'); c.width = natW(src) * k | 0; c.height = natH(src) * k | 0; c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); src = c; }
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return true; } catch (_) { curIm.bad = true; return false; }
  }
  function attach(el) {
    const im = source(el); if (!im || im.bad) return;
    const go = () => { if (im.bad || !natW(im) || hoverEl !== el) return;
      mode = 'dom'; cur = el; curIm = im; reset();
      if (!fit() || !upload()) { cur = null; return; } live = true; };
    if (isV(im) || (im.complete && im.naturalWidth)) go(); else im.addEventListener('load', () => { if (hoverEl === el) go(); }, { once: true });
  }

  let hoverEl = null, lastPick = 0;
  function findAt(x, y) {
    const st = document.elementsFromPoint(x, y);
    for (let k = 0; k < Math.min(7, st.length); k++) { const e = st[k];
      if (e === cv) continue;
      if (e.closest(SKIP)) return null;                       // the header, nav or a canvas-drawn view is on top here
      const el = pick(e); if (el) return el; }
    return null;
  }
  document.documentElement.addEventListener('pointerleave', () => { if (mode === 'dom') inside = false; hoverEl = null; last = null; });
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastPick > 90 || (hoverEl && !hoverEl.isConnected)) { lastPick = now; const el = findAt(e.clientX, e.clientY);
      if (el !== hoverEl) { hoverEl = el; if (mode === 'dom') last = null; if (el && el !== cur) { cv.style.opacity = '0'; live = false; attach(el); } } }
    if (mode !== 'dom') return;
    if (!cur || !live || hoverEl !== cur) { inside = false; return; }
    inside = true;
    const r = cur.getBoundingClientRect(); if (!r.width) return;
    const gx = (e.clientX - r.left) / r.width * GW, gy = (e.clientY - r.top) / r.height * GH;
    if (gx < 0 || gy < 0 || gx > GW || gy > GH) { last = null; return; }
    stir(gx, gy);
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (mode !== 'dom' || !cur || !live || hoverEl !== cur) return; const r = cur.getBoundingClientRect();
    drop((e.clientX - r.left) / r.width * GW, (e.clientY - r.top) / r.height * GH, 4 + heat * 6, 3); still = 0;
  }, { passive: true });

  // ---------- for pages that draw their own pictures (the Designs reel) ----------
  function useExt(src) {
    if (mode === 'ext' && cur === src && live) return true;
    const w = natW(src), h = natH(src); if (!w || !h || src.bad) return false;
    mode = 'ext'; cur = src; curIm = src; cv.remove(); cv.style.opacity = '0';
    const k = Math.min(1, 1600 / Math.max(w, h)), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, cv.width, cv.height); grid(h / w); reset();
    gl.uniform2f(U('sc'), 1, 1); gl.uniform2f(U('off'), 0, 0);
    if (!upload()) { cur = null; return false; }
    live = true; return true;
  }
  window.KMRipple = {
    drive(src, u, v) { if (!src || !useExt(src)) return; if (u < 0 || v < 0 || u > 1 || v > 1) { last = null; return; } inside = true; stir(u * GW, v * GH); },
    splash(src, u, v) { if (!src || !useExt(src)) return; drop(u * GW, v * GH, 4 + heat * 6, 3); still = 0; awake = performance.now(); },
    leave() { if (mode === 'ext') { last = null; } },
    frameFor(src) { return mode === 'ext' && live && shown && cur === src ? cv : null; }
  };

  (function frame() {
    requestAnimationFrame(frame);
    if (!live || !cur) return;
    if (mode === 'dom' && !cur.isConnected) { live = false; cur = null; cv.remove(); return; }
    const now = performance.now();
    if (mode === 'ext') inside = now - awake < 160;
    heat *= inside && now - awake < 120 ? .996 : .975;                             // cools quickly at rest, slowly while you keep going
    let energy = 0; const damp = .986 - heat * .004;
    for (let it = 0; it < 2; it++) { for (let y = 1; y < GH - 1; y++) { const o = y * GW; for (let x = 1; x < GW - 1; x++) { const i = o + x; B[i] = ((A[i - 1] + A[i + 1] + A[i - GW] + A[i + GW]) * .5 - B[i]) * damp; } } const t = A; A = B; B = t; }
    for (let y = 0; y < GH; y++) { const o = y * GW; for (let x = 0; x < GW; x++) { const i = o + x, h = A[i];
      const dx = A[x < GW - 1 ? i + 1 : i] - A[x > 0 ? i - 1 : i], dy = A[y < GH - 1 ? i + GW : i] - A[y > 0 ? i - GW : i];
      energy += h < 0 ? -h : h; const q = i * 4;
      px[q] = Math.max(0, Math.min(255, 128 + dx * 42)); px[q + 1] = Math.max(0, Math.min(255, 128 + dy * 42)); px[q + 2] = Math.max(0, Math.min(255, 128 + h * 40)); px[q + 3] = 255; } }
    if (energy < GW * GH * .0004) { if (++still > 20) { shown = false; cv.style.opacity = '0'; if (!inside) { live = false; cur = null; } return; } }   // calm again: hand back to the real picture
    else if (energy > 2) { shown = true; if (mode === 'dom') cv.style.opacity = '1'; }
    if (mode === 'dom' && !fit()) return;
    if (isV(curIm) && curIm.readyState >= 2) upload();                            // motion pieces keep playing under the water
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tWav);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GW, GH, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.uniform1f(U('amt'), .03); gl.uniform1f(U('ca'), .08 + heat * .25);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })();
})();
;
/* protips.js */
// helping a recruiter get around in seconds.
//  1 · First visit: a one-line tip under the nav while the red tick sweeps once across the stations.
//  2 · Home: a small "Scroll for work" cue at the bottom, until they've scrolled once.
//  4 · Home: "For recruiters" opens a three-line card (who, availability, where to look).
//  A small "?" next to sound and theme replays the tip.
(function () {
  const file = ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html').replace(/^home\.html$/, 'index.html')).toLowerCase(), home = file === 'index.html';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set = k => { try { localStorage.setItem(k, '1'); } catch (_) {} };
  const st = document.createElement('style');
  st.textContent = `
  .pt-pill { position: fixed; z-index: 151; left: 50%; top: calc(88px + env(safe-area-inset-top, 0px)); transform: translate(-50%, -6px); opacity: 0; pointer-events: none;
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--ink, #111); color: var(--bg, #fff); font: 500 13px Geist, system-ui, sans-serif; white-space: nowrap;
    box-shadow: 0 10px 30px rgb(0 0 0 / .14); transition: opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1) }
  .pt-pill.on { opacity: 1; transform: translate(-50%, 0) }
  .pt-pill b { font-weight: 500; color: #fb233b }
  .pt-cue { position: fixed; z-index: 30; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 2px;
    font: 600 11px "Geist Mono", ui-monospace, monospace; letter-spacing: .6px; text-transform: uppercase; color: var(--muted, #888); background: none; border: 0; cursor: pointer; transition: opacity .3s }
  .pt-cue svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; animation: ptb 1.6s cubic-bezier(.45,0,.55,1) infinite }
  .pt-cue:hover { color: var(--ink, #111) }
  @keyframes ptb { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(4px) } }
  .pt-rec { position: fixed; z-index: 150; left: max(48px, env(safe-area-inset-left, 0px)); top: calc(48px + env(safe-area-inset-top, 0px)); height: 36px; padding: 0 14px; border-radius: 999px; border: 0;
    background: var(--pill, #f2f2f2); color: var(--ink, #111); font: 500 13px Geist, system-ui, sans-serif; cursor: pointer; transition: background .2s }
  .pt-rec:hover { background: var(--pill-hover, #e8e8e8) }
  .pt-rec { display: inline-flex; align-items: center; gap: 8px; padding: 0 6px 0 14px }
  /* the arrow sits in a small circle in the page colour (black in dark mode, white in light) */
  .pt-rec svg { box-sizing: border-box; width: 26px; height: 26px; padding: 4px; border-radius: 50%; background: var(--bg, #fff); fill: none; stroke: currentColor; stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; transition: transform .3s cubic-bezier(.2,.8,.2,1) }
  .pt-rec[aria-expanded="true"] svg { transform: rotate(180deg) }
  .pt-card { position: fixed; z-index: 152; left: max(48px, env(safe-area-inset-left, 0px)); top: calc(96px + env(safe-area-inset-top, 0px)); width: min(320px, calc(100vw - 32px)); padding: 18px 18px 18px; border-radius: 20px;
    background: var(--bg, #fff); color: var(--text, #333); box-shadow: 0 0 0 1px var(--edge, rgb(0 0 0 / .07)), 0 24px 60px rgb(0 0 0 / .18); font: 14px/1.5 Geist, system-ui, sans-serif;
    opacity: 0; transform: translateY(-6px) scale(.98); transform-origin: top left; pointer-events: none; transition: opacity .2s, transform .3s cubic-bezier(.2,.8,.2,1) }
  .pt-card.on { opacity: 1; transform: none; pointer-events: auto }
  .pt-card .lb { font: 600 10.5px "Geist Mono", ui-monospace, monospace; letter-spacing: .7px; text-transform: uppercase; color: var(--muted, #888) }
  .pt-card .rr { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 12px; font-size: 12.5px; color: var(--muted, #888) }
  .pt-card .rr span { margin-right: 4px }
  .pt-card .rr button { height: 28px; padding: 0 10px; border: 0; border-radius: 999px; background: var(--pill, #f2f2f2); color: var(--muted, #888); font: 500 12px Geist, system-ui, sans-serif; cursor: pointer; transition: background .18s, color .18s }
  .pt-card .rr button:hover { color: var(--ink, #111) }
  .pt-card .rr button[aria-pressed="true"] { background: var(--ink, #111); color: var(--bg, #fff) }
  .pt-card .go { margin: 12px 0 16px; display: grid }
  .pt-card .go a { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; padding: 12px 0; border-top: 1px solid var(--line, rgb(0 0 0 / .08)); color: var(--ink, #111); text-decoration: none }
  .pt-card .go a:last-child { border-bottom: 1px solid var(--line, rgb(0 0 0 / .08)) }
  .pt-card .go b { font-weight: 500 }
  .pt-card .go small { grid-column: 1; font-size: 12.5px; color: var(--muted, #888) }
  .pt-card .go i { grid-row: 1 / span 2; grid-column: 2; font-style: normal; color: var(--muted, #888); transition: transform .25s cubic-bezier(.2,.8,.2,1), color .2s }
  .pt-card .go a:hover i { transform: translateX(3px); color: var(--ink, #111) }
  .pt-card .ac { display: grid; grid-template-columns: 1fr 1fr; gap: 8px }
  .pt-card .ac a, .pt-card .ac button { height: 40px; padding: 0 14px; border-radius: 12px; border: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--pill, #f2f2f2); color: var(--ink, #111);
    font: 500 13.5px Geist, system-ui, sans-serif; text-decoration: none; cursor: pointer; transition: background .2s, transform .2s }
  .pt-card .ac a:hover, .pt-card .ac button:hover { transform: translateY(-1px) }
  .pt-q { position: fixed; z-index: 150; top: calc(48px + env(safe-area-inset-top, 0px)); right: calc(max(64px, env(safe-area-inset-right, 0px)) + 88px); width: 36px; height: 36px; border-radius: 50%; border: 0;
    background: var(--pill, #f2f2f2); color: var(--ink, #111); font: 600 14px Geist, system-ui, sans-serif; cursor: pointer }
  @media (max-width: 899px) {
    .pt-pill { top: auto; bottom: calc(28px + env(safe-area-inset-bottom, 0px)); white-space: normal; text-align: center; width: max-content; max-width: calc(100vw - 32px) }
    .pt-cue { bottom: calc(22px + env(safe-area-inset-bottom, 0px)) }
    .pt-rec { left: max(16px, env(safe-area-inset-left, 0px)); top: calc(18px + env(safe-area-inset-top, 0px)); bottom: auto }   /* top left, where the version switch was */
    .pt-card { left: 16px; top: calc(64px + env(safe-area-inset-top, 0px)); bottom: auto; max-height: calc(100dvh - 88px); overflow: auto }
    .pt-q { display: none }
  }`;
  document.head.append(st);
  const start = () => {
    const S = document.querySelector('.kmn-scale'); if (!S) return;
    const btns = [...S.querySelectorAll('button')], nd = S.querySelector('.nd');
    let hide = null;   // (the station hover hints were removed)
    if (!home) return;
    // 1 · the one-line tip, with the tick sweeping once across the stations
    const pill = document.createElement('div'); pill.className = 'pt-pill'; pill.setAttribute('role', 'status');
    pill.innerHTML = 'Tune in: pick a station, or <b>scroll ↓</b> for my work'; document.body.append(pill);
    let tt = [];
    hide = () => { pill.classList.remove('on'); tt.forEach(clearTimeout); tt = []; const h = btns.find(b => b.textContent.trim() === 'Home'); if (nd && h) nd.style.left = h.style.left; };
    // phones: a hint never covers the page; on a short screen where it would sit on the links, it stays out
    const clash = el => { if (innerWidth >= 900) return false; const r = el.getBoundingClientRect(); return [...document.querySelectorAll('.socials, .links, .vsw')].some(x => { const q = x.getBoundingClientRect(); return q.height && r.top < q.bottom + 8 && r.bottom > q.top - 8 && r.left < q.right && r.right > q.left; }); };
    const show = () => {
      hide(); if (clash(pill)) { set('km-tip'); return; } pill.classList.add('on'); set('km-tip');
      if (nd && !reduce) btns.forEach((b, k) => tt.push(setTimeout(() => { nd.style.left = b.style.left; }, 350 + k * 260)));
      if (nd && !reduce) tt.push(setTimeout(() => { const h = btns.find(b => b.textContent.trim() === 'Home'); if (h) nd.style.left = h.style.left; }, 350 + btns.length * 260 + 200));
      tt.push(setTimeout(hide, 4800));
    };
    ['wheel', 'touchmove', 'pointerdown', 'keydown'].forEach(t => addEventListener(t, () => { if (pill.classList.contains('on')) hide(); }, { passive: true }));
    if (!get('km-tip')) { if (document.getElementById('loader') && !sessionStorage.getItem('km-loaded')) document.addEventListener('loader:done', () => setTimeout(show, 700), { once: true }); else setTimeout(show, 900); }
    const q = document.createElement('button'); q.type = 'button'; q.className = 'pt-q'; q.textContent = '?'; q.setAttribute('aria-label', 'How to get around'); q.title = 'How to get around';
    q.addEventListener('click', e => { e.stopPropagation(); setTimeout(show, 0); }); document.body.append(q);
    // 2 · scroll cue
    if (!get('km-scrolled')) {
      const cue = document.createElement('button'); cue.type = 'button'; cue.className = 'pt-cue';
      cue.innerHTML = 'Scroll for work<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6"/></svg>';
      cue.addEventListener('click', () => { const d = btns.find(b => b.textContent.trim() === 'Designs'); if (d) d.click(); });
      document.body.append(cue);
      const fitCue = () => { cue.style.visibility = ''; if (clash(cue)) cue.style.visibility = 'hidden'; }; requestAnimationFrame(fitCue); addEventListener('resize', fitCue);
      addEventListener('wheel', () => set('km-scrolled'), { passive: true, once: true });
    }
    // 4 · for recruiters
    const rec = document.createElement('button'); rec.type = 'button'; rec.className = 'pt-rec'; rec.innerHTML = 'For recruiters<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5 8 10.5 12 6.5"/></svg>'; rec.setAttribute('aria-expanded', 'false');
    const card = document.createElement('div'); card.className = 'pt-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'For recruiters');
    const cv = [...document.querySelectorAll('a')].find(a => a.textContent.trim().toLowerCase() === 'resume');
    // the short route through the site: what to open first (nothing the landing page already says)
    card.innerHTML = `<span class="lb">For recruiters · the short route</span>
      <div class="rr" role="group" aria-label="Hiring for"><span>Hiring for</span>${['', 'Product', 'Brand', '3D', 'Motion'].map(r => `<button type="button" data-r="${r}">${r || 'Any'}</button>`).join('')}</div>
      <div class="go"></div>
      <div class="ac"><a href="${cv ? cv.getAttribute('href') : '#'}" class="cv">Résumé</a><button type="button" class="bk">Book a call</button></div>`;
    // role match: picking a role shows only that kind of work, the two strongest pieces and then all of it on Designs
    // (the choice is remembered by kit.js, so Designs opens on the same work; its chips and picker bring the rest back)
    const ROUTES = {
      '':      [['case.html#kusnap', 'Kusnap case study', 'Product, 0 to 1'], ['brand.html#oghosa', 'Oghosa case study', 'Brand identity'], ['designs.html', 'All designs', '110 pieces · 4 case studies']],
      Product: [['case.html#kusnap', 'Kusnap case study', 'Product, 0 to 1'], ['case.html#bulvds', 'Bulvds case study', 'Product design'], ['designs.html', 'All product work', 'Case studies on Designs']],
      Brand:   [['brand.html#oghosa', 'Oghosa case study', 'Brand identity'], ['brand.html#kauri', 'Kauri case study', 'Brand identity'], ['designs.html', 'All brand work', 'Identities and brand pieces on Designs']],
      '3D':    [['designs.html#p-paper-plane-with-coin', '3D collection', 'Every render in one place'], ['designs.html#p-paper-plane-with-coin', 'Paper plane with coin', '3D render'], ['designs.html', 'All 3D work', 'Renders on Designs']],
      Motion:  [['designs.html#p-tennis-ball-and-rackets', 'Tennis ball and rackets', 'Motion'], ['designs.html#p-red-padlock', 'Red padlock', 'Motion'], ['designs.html', 'All motion work', 'Loops on Designs']]
    };
    const rr = card.querySelector('.rr'), go = card.querySelector('.go');
    const role = r => { rr.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.r === r)));
      go.innerHTML = (ROUTES[r] || ROUTES['']).map(([h, t, d]) => `<a href="${h}"><b>${t}</b><small>${d}</small><i>→</i></a>`).join(''); };
    rr.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
      if (window.KM && KM.role) KM.role.set(b.dataset.r); else role(b.dataset.r); });
    addEventListener('km-role', e => role(e.detail));
    role(window.KM && KM.role ? KM.role.get() : '');
    card.querySelector('.bk').addEventListener('click', () => { const b = document.getElementById('bookCall'); if (b) b.click(); });
    const setOpen = o => { card.classList.toggle('on', o); rec.setAttribute('aria-expanded', o); };
    rec.addEventListener('click', e => { e.stopPropagation(); setOpen(!card.classList.contains('on')); });
    document.addEventListener('click', e => { if (!card.contains(e.target) && e.target !== rec) setOpen(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    document.body.append(rec, card);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(start, 30)); else setTimeout(start, 30);
})();
;
/* feedback.js */
// feedback.js: after a few minutes on the site, one quick question: how easy was it to get around (1 to 5)?
// Web: a card at the bottom right. Phones: a card in the middle of the screen, the page dimmed behind it.
// The score sits on a small dial: click or tap a number, or drag through it. Its ticks ripple like an FM wave.
// Then one optional follow-up (what you liked most, what got in your way), and it is sent to Kingsley's email.
//
//  · Time counts only while the tab is in view, and carries over between pages (this browser).
//  · It waits for a quiet moment: nothing open, no menu, no tuning, nobody mid-drag or typing.
//  · Sent: never again on this browser. Not now / close: not for 30 days. Never in the CMS.
//  · Settings (CMS → Settings → Feedback): on/off, the email it goes to, and how many minutes before it asks.
//  · Add ?feedback=now to any page address to see it straight away.
(function () {
  const CFG = (window.KM_SITE && window.KM_SITE.feedback) || {};
  const FORCE = /[?&]feedback=now\b/.test(location.search);
  if (!FORCE && CFG.on === false) return;
  if (/[?&]cms=1\b/.test(location.search) || window.top !== window) return;   // the CMS preview, or inside any frame
  const TO = CFG.to || 'iamkingsleey@gmail.com', AFTER = Math.max(.25, +CFG.after || 3) * 60000;
  const K = 'km-fb', KT = 'km-fb-t';
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const state = (() => { try { return JSON.parse(get(K, '{}')) || {}; } catch (_) { return {}; } })();
  if (!FORCE && (state.sent || (state.snooze && Date.now() < state.snooze))) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = n => { if (get('km-sound', 'on') === 'off' || !window.Popkit) return; try { Popkit.play(n); } catch (_) {} };

  // ---------- the clock: visible time only, carried across pages ----------
  let spent = +get(KT, 0) || 0, lastTap = 0, shown = false;
  addEventListener('pointerdown', () => { lastTap = performance.now(); }, true);
  addEventListener('keydown', () => { lastTap = performance.now(); }, true);
  const quiet = () => {
    const d = document, b = d.body; if (!b) return false;
    if (b.classList.contains('open') || d.documentElement.classList.contains('kmn-open') || d.documentElement.classList.contains('tuning')) return false;   // a piece, the menu, a page change
    if (d.querySelector('.tuner, .km-keep, .recruit.open, .pt-card.open')) return false;
    const a = d.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;   // typing (the About form)
    return performance.now() - lastTap > 2500;                                                          // not right in the middle of something
  };
  const step = 1000;
  const clock = setInterval(() => {
    if (shown) return;
    if (document.visibilityState === 'visible') { spent += step; put(KT, String(spent)); }
    if (spent >= AFTER && quiet()) { clearInterval(clock); open(); }
  }, step);
  if (FORCE) { clearInterval(clock); addEventListener('load', () => setTimeout(open, 600)); if (document.readyState === 'complete') setTimeout(open, 600); }

  // ---------- the card ----------
  const N = 5, WORD = ['', 'Frustrating', 'Hard work', 'Okay', 'Easy', 'Effortless'];
  const LIKED = ['The dial', 'Moving between pages', 'Case studies', 'The sounds', 'Speed', 'The look'];
  const STUCK = ['Finding the work', 'Going back', 'Too much motion', 'Slow to load', 'Small text', 'Something else'];
  const CSS = `
  .kfb, .kfb * { box-sizing: border-box }
  .kfb { --b: #fff; --i: #0e0e10; --t: #3d3d42; --m: #8a8a90; --f: #c9c9cd; --p: #efeff0; --l: #e6e6e8; --sh: 0 24px 60px -18px rgb(0 0 0 / .28), 0 2px 8px rgb(0 0 0 / .06);
    position: fixed; z-index: 2147482000; inset: 0; pointer-events: none; font: 400 15px/1.5 Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased }
  .kfb.dark { --b: #141416; --i: #f4f4f5; --t: #c9c9cd; --m: #85858c; --f: #3a3a3e; --p: #1f1f22; --l: #2a2a2e; --sh: 0 24px 60px -18px rgb(0 0 0 / .8), 0 0 0 1px rgb(255 255 255 / .05) }
  .kfb button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer }
  .kfb button:focus-visible, .kfb [tabindex]:focus-visible { outline: 2px solid var(--i); outline-offset: 2px }
  .kfb .sc { position: absolute; inset: 0; background: rgb(0 0 0 / .32); opacity: 0; transition: opacity .3s }
  .kfb .cd { position: absolute; width: 360px; max-width: calc(100vw - 32px); background: var(--b); color: var(--t); border-radius: 18px; box-shadow: var(--sh); padding: 20px 20px 18px; pointer-events: auto;
    right: max(24px, env(safe-area-inset-right, 0px)); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); opacity: 0; translate: 0 18px;
    transition: opacity .3s, translate .55s cubic-bezier(.2,.9,.25,1.15), scale .55s cubic-bezier(.2,.9,.25,1.15) }
  .kfb.on .cd { opacity: 1; translate: 0 0 }
  .kfb.mob .sc { pointer-events: auto } .kfb.mob.on .sc { opacity: 1 }
  .kfb.mob .cd { right: auto; bottom: auto; left: 50%; top: 50%; width: calc(100vw - 32px); max-width: 400px; translate: -50% -46%; scale: .96 }
  .kfb.mob.on .cd { translate: -50% -50%; scale: 1 }
  .kfb .mo { font: 600 11px/1.4 "Geist Mono", ui-monospace, Menlo, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--m) }
  .kfb .hd { display: flex; align-items: center; justify-content: space-between; gap: 12px }
  .kfb .x { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--m); margin: -6px -6px 0 0; transition: background .2s, color .2s }
  .kfb .x:hover { background: var(--p); color: var(--i) }
  .kfb .x svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.6; fill: none; stroke-linecap: round }
  .kfb h3 { margin: 10px 0 4px; color: var(--i); font-size: 20px; line-height: 1.2; font-weight: 500; letter-spacing: -.02em; text-wrap: balance }
  .kfb .sub { margin: 0; font-size: 13px; color: var(--m) }
  .kfb .bd { margin-top: 16px; user-select: none; -webkit-user-select: none }
  .kfb .ft { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px }
  .kfb .lt { font-size: 13px; color: var(--m); padding: 8px 0 } .kfb .lt:hover { color: var(--i) }
  .kfb .go { height: 38px; padding: 0 18px; border-radius: 999px; background: var(--i); color: var(--b); font-size: 14px; font-weight: 500; transition: opacity .2s, transform .2s }
  .kfb .go:disabled { opacity: .25; cursor: default } .kfb .go:not(:disabled):active { transform: scale(.97) }
  .kfb .ro { display: flex; align-items: baseline; gap: 10px; min-height: 40px }
  .kfb .ro b { color: var(--i); font-size: 40px; line-height: 1; font-weight: 500; letter-spacing: -.04em; font-variant-numeric: tabular-nums }
  .kfb .ro span { font-size: 14px; color: var(--t) } .kfb .ro.empty b { color: var(--f) }
  .kfb .tn { position: relative; height: 84px; touch-action: none; cursor: grab; -webkit-tap-highlight-color: transparent } .kfb .tn.dr { cursor: grabbing }
  .kfb .tn canvas { width: 100%; height: 100%; display: block }
  .kfb .gp + .gp { margin-top: 16px }
  .kfb .ch { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px }
  .kfb .ch button { height: 34px; padding: 0 13px; border-radius: 999px; background: var(--p); font-size: 13px; color: var(--t); transition: background .2s, color .2s }
  .kfb .ch button[aria-pressed="true"] { background: var(--i); color: var(--b) }
  .kfb .nt { margin-top: 14px; width: 100%; border: 0; border-bottom: 1px solid var(--l); background: transparent; padding: 10px 0; font: 400 16px/1.4 inherit; font-family: inherit; color: var(--i); outline: none; border-radius: 0 }
  .kfb .nt:focus { border-color: var(--i) }
  .kfb .dn b { display: block; margin-top: 14px; color: var(--i); font-size: 26px; font-weight: 500; letter-spacing: -.03em }
  .kfb .lamp { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2fb35b; margin-right: 8px; vertical-align: 1px }
  .kfb .err { margin-top: 10px; font-size: 13px; color: #d4380d }
  .kfb .st { animation: kfbin .45s cubic-bezier(.2,.9,.25,1) both } @keyframes kfbin { from { opacity: 0; translate: 12px 0 } }
  @media (max-height: 560px) { .kfb.mob .cd { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); translate: -50% 12px } .kfb.mob.on .cd { translate: -50% 0 } }
  @media (prefers-reduced-motion: reduce) { .kfb .cd, .kfb .sc, .kfb .st { transition: none; animation: none } }`;
  const X = '<button type="button" class="x" data-x aria-label="Close"><svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8"/></svg></button>';

  let root, card, val = 0, stopDial = null;
  const isDark = () => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g); if (!c) return false; const [r, g, b, a] = c.map(Number); if (a === 0) return document.documentElement.dataset.theme === 'dark'; return (r * 299 + g * 587 + b * 114) / 1000 < 128; };
  const mobile = () => matchMedia('(max-width: 640px), (hover: none) and (pointer: coarse) and (max-width: 900px)').matches;

  function open() {
    if (shown) return; shown = true;
    if (!document.getElementById('kfb-css')) { const s = document.createElement('style'); s.id = 'kfb-css'; s.textContent = CSS; document.head.appendChild(s); }
    root = document.createElement('div'); root.className = 'kfb' + (isDark() ? ' dark' : '') + (mobile() ? ' mob' : '');
    root.innerHTML = `<div class="sc"></div><div class="cd" role="dialog" aria-labelledby="kfb-q"${mobile() ? ' aria-modal="true"' : ''}></div>`;
    document.body.appendChild(root); card = root.querySelector('.cd');
    root.querySelector('.sc').addEventListener('click', () => close('later'));
    addEventListener('keydown', onKey);
    step1();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
    snd('detent'); track('/feedback/shown');
  }
  const onKey = e => { if (e.key === 'Escape' && root) close('later'); };
  function close(why) {
    if (!root) return; if (stopDial) stopDial();
    if (why === 'later') { state.snooze = Date.now() + 30 * 864e5; put(K, JSON.stringify(state)); }
    root.classList.remove('on'); const r = root; root = null; removeEventListener('keydown', onKey);
    setTimeout(() => r.remove(), reduce ? 0 : 400);
  }
  const wireX = () => card.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => { snd('pop'); close(val && card.dataset.done ? 'done' : 'later'); }));

  // step 1: the score
  function step1() {
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo">Quick question · 1 of 2</span>${X}</div>
      <h3 id="kfb-q">How easy was it to find your way around?</h3><p class="sub">1 is frustrating, 5 is effortless.</p>
      <div class="bd"><div class="ro empty" data-ro><b>–</b><span>Tap a number or drag the dial</span></div>
      <div class="tn" role="slider" tabindex="0" aria-label="Score, 1 to 5" aria-valuemin="1" aria-valuemax="5" aria-valuenow="3"><canvas></canvas></div></div>
      <div class="ft"><button type="button" class="lt" data-later>Not now</button><button type="button" class="go" data-next disabled>Next</button></div></div>`;
    wireX();
    card.querySelector('[data-later]').addEventListener('click', () => { snd('pop'); close('later'); });
    card.querySelector('[data-next]').addEventListener('click', () => { snd('pop'); step2(); });
    dial(card.querySelector('.tn'), v => {
      val = v; card.querySelector('[data-next]').disabled = false;
      const ro = card.querySelector('[data-ro]'); ro.classList.remove('empty'); ro.innerHTML = `<b>${v}</b><span>${WORD[v]}</span>`;
    });
  }

  // step 2: what you liked, what got in the way (both optional), then send
  function step2() {
    if (stopDial) stopDial();
    const low = val <= 3;
    const grp = (lab, list, k) => `<div class="gp" data-g="${k}"><span class="mo">${lab}</span><div class="ch">${list.map(c => `<button type="button" aria-pressed="false">${c}</button>`).join('')}</div></div>`;
    const liked = grp('Liked most', LIKED, 'liked'), stuck = grp('Got in your way', STUCK, 'stuck');
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo">${val} / 5 · ${WORD[val]} · 2 of 2</span>${X}</div>
      <h3 id="kfb-q">What did you like most, and what got in your way?</h3><p class="sub">Optional. Tap any that fit.</p>
      <div class="bd">${low ? stuck + liked : liked + stuck}<input class="nt" data-note placeholder="Tell me more (optional)" autocomplete="off" maxlength="600" aria-label="Tell me more"></div>
      <div class="err" data-err hidden></div>
      <div class="ft"><button type="button" class="lt" data-skip>Skip</button><button type="button" class="go" data-send>Send</button></div></div>`;
    wireX();
    card.querySelectorAll('.ch button').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); snd(on ? 'detent' : 'pop'); }));
    card.querySelector('[data-skip]').addEventListener('click', () => send(true));
    card.querySelector('[data-send]').addEventListener('click', () => send(false));
  }

  const picked = k => [...card.querySelectorAll(`[data-g="${k}"] button[aria-pressed="true"]`)].map(b => b.textContent);
  async function send(skip) {
    const btn = card.querySelector('[data-send]'), err = card.querySelector('[data-err]');
    const liked = skip ? [] : picked('liked'), stuck = skip ? [] : picked('stuck'), note = skip ? '' : card.querySelector('[data-note]').value.trim();
    btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true; snd('pop');
    const page = ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html').replace(/^home\.html$/, 'index.html')) + location.hash;
    const body = { _subject: `Site feedback: ${val}/5 · ${WORD[val]}`, _template: 'table', _captcha: 'false',
      Score: `${val} / 5 (${WORD[val]})`, 'Liked most': liked.join(', ') || '—', 'Got in the way': stuck.join(', ') || '—', Note: note || '—',
      Page: page, 'Time on site': Math.round(spent / 60000) + ' min', Screen: `${innerWidth}×${innerHeight}${mobile() ? ' · phone' : ''}`, Theme: isDark() ? 'dark' : 'light' };
    try {
      // to the inbox when there is one (CMS → Inbox), and to your email unless that's switched off; sent if either arrives
      const IB = (window.KM_SITE && KM_SITE.inbox) || {};
      const toInbox = window.kmSend ? kmSend({ type: 'Feedback', subject: `Site feedback: ${val}/5 · ${WORD[val]}`, message: note || '', fields: { Score: body.Score, 'Liked most': body['Liked most'], 'Got in the way': body['Got in the way'], 'Time on site': body['Time on site'], Screen: body.Screen, Theme: body.Theme } }) : Promise.resolve(false);
      // never wait forever: each route gets 15 seconds, and the button says so if it's slow
      const cap = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r(false), ms))]);
      const ac = 'AbortController' in window ? new AbortController() : null, slow = setTimeout(() => { btn.textContent = 'Still sending…'; }, 5000);
      const toMail = IB.url && IB.email === false ? Promise.resolve(false) : fetch('https://formsubmit.co/ajax/' + encodeURI(TO), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: ac && ac.signal })
        .then(r => r.json().catch(() => ({})).then(j => {
          // FormSubmit answers 200 even when it didn't send (for example before the address is confirmed), so read its reply
          const ok = r.ok && String(j.success) !== 'false';
          if (!ok) console.warn('Feedback email not sent:', j.message || r.status);
          return ok; }))
        .catch(() => false);
      const [a1, a2] = await Promise.all([cap(toInbox, 15000), cap(toMail, 15000)]);
      clearTimeout(slow); if (ac) ac.abort();
      if (!a1 && !a2) throw new Error('not sent');
      state.sent = Date.now(); delete state.snooze; put(K, JSON.stringify(state)); track('/feedback/sent/' + val);
      done();
    } catch (_) {
      btn.disabled = false; btn.textContent = 'Try again'; err.hidden = false; err.textContent = 'That didn’t send. Check your connection and try again in a moment.';
    }
  }
  function done() {
    card.dataset.done = '1';
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo"><span class="lamp"></span>Sent · ${val} / 5</span>${X}</div>
      <div class="dn"><b>Thanks. That helps.</b><p class="sub" style="margin-top:6px">I read every one of these.</p></div></div>`;
    wireX(); snd('detent'); setTimeout(() => close('done'), 3200);
  }
  const track = p => { if (window.KMtrack) try { KMtrack(p, 'Feedback'); } catch (_) {} };

  // ---------- the dial: the ruler slides under a fixed red needle; its ticks ripple like an FM wave ----------
  function dial(tn, onPick) {
    const cv = tn.querySelector('canvas'), cx = cv.getContext('2d'), SP = 60;
    let pos = 3, vel = 0, target = 3, drag = null, picked = false, live = true, last = 3, amt = 0, phase = 0, freq = .05, v0 = 0;
    const css = n => getComputedStyle(root || document.body).getPropertyValue(n).trim();
    const sc = () => tn.getBoundingClientRect().width / tn.offsetWidth || 1;
    const cl = v => Math.max(1, Math.min(N, Math.round(v)));
    const setV = (v, sound) => { v = cl(v); if (v === v0) return; v0 = v; if (sound) snd('detent'); tn.setAttribute('aria-valuenow', v); onPick(v); };
    const draw = dt => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); const mid = W / 2, ink = css('--i') || '#0e0e10', mu = css('--m') || '#8a8a90', TY = 16;
      const sp = Math.min(1, Math.abs(pos - last) * 14 / Math.max(.5, dt / 16)); last = pos; amt += (sp - amt) * (sp > amt ? .35 : .06);
      const lvl = v0 || Math.round(pos);
      if (!reduce) { freq += ((.06 + lvl * .008 + amt * .07) - freq) * .08; phase += (.035 + amt * .42) * dt / 16; }
      const wave = x => reduce ? 0 : Math.sin((x - mid) * freq - phase) * (1.4 + 11 * amt) * Math.exp(-(((x - mid) / (W * .32)) ** 2));
      for (let k = -10; k <= (N - 1) * 10 + 10; k++) {
        const v = 1 + k / 10, x = mid + (v - pos) * SP; if (x < -4 || x > W + 4) continue;
        const major = k % 10 === 0 && k >= 0 && k <= (N - 1) * 10, d = Math.abs(x - mid) / SP, e = Math.max(0, Math.min(1, Math.min(x, W - x) / 36));
        cx.globalAlpha = ((major ? .7 : .22) + Math.max(0, 1 - d) * .3) * e; cx.strokeStyle = ink; cx.lineWidth = major ? 1.6 : 1;
        const L = Math.max(3, (major ? 22 : 11) + Math.max(0, 1 - d) * 6 + wave(x)), base = TY + 26;
        cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, base - L); cx.stroke();
        if (major) { const on = d < .5 && picked; cx.globalAlpha = (on ? 1 : .6) * e; cx.fillStyle = on ? ink : mu; cx.font = `500 ${on ? 13 : 12}px "Geist Mono", ui-monospace, monospace`; cx.textAlign = 'center'; cx.fillText(String(v), x, TY + 48); }
      }
      cx.globalAlpha = 1; cx.fillStyle = '#fb233b'; cx.fillRect(mid - 1.5, TY - 8, 3, 34);
    };
    let pt = performance.now();
    const loop = now => { if (!live) return; const dt = Math.min(64, now - pt); pt = now;
      if (!drag) { const a = (target - pos) * 170 - vel * 19; vel += a * dt / 1000; pos += vel * dt / 1000; if (Math.abs(target - pos) < .0008 && Math.abs(vel) < .01) { pos = target; vel = 0; } }
      draw(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const settle = v => { picked = true; target = cl(v); setV(target, false); };
    const at = e => { const r = tn.getBoundingClientRect(); return pos + ((e.clientX - r.left) / sc() - tn.offsetWidth / 2) / SP; };
    tn.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; drag = { x: e.clientX, p: pos, moved: false, id: e.pointerId }; vel = 0; tn.setPointerCapture(e.pointerId); tn.classList.add('dr'); e.preventDefault(); });
    tn.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = (e.clientX - drag.x) / sc(); if (Math.abs(dx) > 4) drag.moved = true; if (!drag.moved) return;
      pos = Math.max(.6, Math.min(N + .4, drag.p - dx / SP)); picked = true; setV(pos, true); });
    const up = e => { if (!drag) return; const d = drag; drag = null; tn.classList.remove('dr');
      if (!d.moved) { const v = cl(at(e)); if (v !== v0) snd('detent'); settle(v); amt = Math.max(amt, .6); } else settle(pos); };
    tn.addEventListener('pointerup', up); tn.addEventListener('pointercancel', up);
    tn.addEventListener('keydown', e => { const k = e.key; let v = null;
      if (k === 'ArrowRight' || k === 'ArrowUp') v = (v0 || 2) + 1; if (k === 'ArrowLeft' || k === 'ArrowDown') v = (v0 || 4) - 1; if (/^[1-5]$/.test(k)) v = +k;
      if (v !== null) { e.preventDefault(); v = cl(v); if (v !== v0) snd('detent'); settle(v); amt = Math.max(amt, .5); } });
    stopDial = () => { live = false; stopDial = null; };
  }
})();
;
/* home.js */
// Home, iteration 4: "open to work" is one quiet line in the intro (under "Previously…"), the corner clock is gone,
// and the sound and theme buttons sit at the top right where the clock was.
(function () {
  const book = document.getElementById('bookCall');
  const st = document.createElement('style');
  st.textContent = `
  #time { display: none !important }
  .introst { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; color: var(--muted); cursor: pointer; width: fit-content }
  .introst i { position: relative; width: 6px; height: 6px; border-radius: 50%; background: #2fb35b }
  /* the on-air light: two soft rings ripple outwards from it, one after the other */
  .introst i::before, .introst i::after { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgb(47 179 91 / .7); animation: inring 2.4s cubic-bezier(.2,.6,.3,1) infinite }
  .introst i::after { animation-delay: 1.2s }
  @keyframes inring { 0% { transform: scale(1); opacity: .9 } 100% { transform: scale(4.2); opacity: 0 } }
  @media (prefers-reduced-motion: reduce) { .introst i::before, .introst i::after { animation: none; opacity: 0 } }
  .introst b { font-weight: inherit; color: var(--text); text-decoration: underline; text-decoration-color: var(--line, rgb(0 0 0 / .2)); text-underline-offset: 3px; transition: text-decoration-color .2s }
  .introst:hover b { text-decoration-color: currentColor }
  @media (min-width: 900px) {
    .theme-btn { top: calc(48px + env(safe-area-inset-top, 0px)) !important; bottom: auto !important; right: max(64px, env(safe-area-inset-right, 0px)) !important }
    .sound-btn { top: calc(48px + env(safe-area-inset-top, 0px)) !important; bottom: auto !important; right: calc(max(64px, env(safe-area-inset-right, 0px)) + 44px) !important }
  }
  @media (max-width: 900px) { 
    .mode-bottom .theme-btn, .mode-bottom .sound-btn { top: calc(20px + env(safe-area-inset-top, 0px)) !important }
    .mode-bottom .theme-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 50px) !important } .mode-bottom .sound-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 90px) !important } }`;
  document.head.append(st);
  const prev = [...document.querySelectorAll('p')].find(p => p.textContent.startsWith('Previously'));
  if (prev && (window.KM_SITE || {}).available !== false) {   // shown only while taking new work (CMS → Settings)
    const l = document.createElement('div'); l.className = 'introst';
    l.innerHTML = '<i></i><span>Open to new work.</span><b>Book a call</b>';
    l.addEventListener('click', () => { if (book) book.click(); });
    prev.after(l);
  }
})();
;
/* flow.js */
// Home and Designs read as one scroll. Home → Designs going down, Designs → Home going back up.
// Scroll past the end of a page and it eases up into the next one; scroll up past the top and it eases back down
// into the one before. No Tuner for this: the page drifts away, the next page's background slides in, and the
// next page settles into place. The nav stays put, and its red tick moves to the new station.
// Each page also gets its neighbours ready in the background, so the move is quick.
(function () {
  const ORDER = ['index.html', 'designs.html', 'engineering.html', 'about.html'];
  const file = ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html').replace(/^home\.html$/, 'index.html')).toLowerCase();
  const at = ORDER.indexOf(file); if (at < 0) return;
  const clean = u => u === 'index.html' ? 'home' : u.replace(/\.html$/, '');   // clean addresses, as the nav uses
  const withV = u => { u = u && clean(u); return u && window.BUILD ? u + '?v=' + window.BUILD : u; };   /* the same address the nav uses, so one cached copy serves both */
  // only between Home and Designs: Home flows down into Designs, and Designs flows back up to Home
  // Home → Designs everywhere; Designs → Home only on phones and tablets, by pulling down at the top of the grid
  const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const ALLOW = { 'index.html': [1], 'designs.html': TOUCH ? [-1] : [] }[file] || [];
  if (!ALLOW.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const home = file === 'index.html';
  const bgOf = f => f === 'designs.html' || document.documentElement.dataset.theme === 'dark' ? '#0b0b0b' : '#ffffff';
  // what scrolls on this page (Designs scrolls its grid; Home doesn't scroll at all)
  const scroller = () => {
    if (home) return null;
    if (file === 'designs.html') return document.body.classList.contains('open') ? false : document.getElementById('ov');
    return document.scrollingElement || document.documentElement;
  };
  const edges = () => {
    const sc = scroller(); if (sc === false) return { top: false, bottom: false };
    if (!sc) return { top: true, bottom: true };
    return { top: sc.scrollTop <= 1, bottom: sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 };
  };
  let gone = false;
  const go = dir => {
    const to = withV(ORDER[at + dir]); if (!ORDER[at + dir] || !ALLOW.includes(dir) || gone || document.querySelector('.secret:not([hidden]), .tuner')) return; gone = true;
    try { sessionStorage.setItem('km-flow', JSON.stringify({ d: dir, t: Date.now() })); } catch (_) {}
    if (reduce) { location.href = to; return; }
    if (window.Popkit) try { Popkit.play('detent'); } catch (_) {}
    // the tick glides to the new station
    const S = document.querySelector('.kmn-scale'), nd = S && S.querySelector('.nd');
    const btn = S && [...S.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === ({ 'index.html': 'home', 'designs.html': 'designs', 'engineering.html': 'engineering', 'about.html': 'about' })[to]);
    if (nd && btn) nd.style.left = btn.style.left;
    const E = 'cubic-bezier(.65,0,.35,1)', MS = 520;
    const cover = document.createElement('div');
    cover.style.cssText = `position:fixed;left:0;right:0;top:0;height:100vh;z-index:140;pointer-events:none;background:${bgOf(to)};transform:translateY(${dir > 0 ? 100 : -100}%)`;
    document.body.append(cover);
    // move what's on screen; a wrapper that only holds fixed panels (Home's) is not moved itself, its panels are,
    // since moving the wrapper would make those panels collapse into it
    const T = [];
    [...document.body.children].filter(e => e !== cover && !e.classList.contains('kmn-scale') && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName)).forEach(e => {
      const fx = [...e.children].filter(k => getComputedStyle(k).position === 'fixed');
      if (getComputedStyle(e).position !== 'fixed' && fx.length) T.push(...fx); else T.push(e);
    });
    // leave hidden things hidden (the recruiter card, tips): animate each from its own current opacity, and skip the invisible ones
    T.filter(e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.01; }).forEach(e => e.animate([{ translate: '0 0', opacity: getComputedStyle(e).opacity }, { translate: `0 ${dir > 0 ? -28 : 28}vh`, opacity: 0 }], { duration: MS, easing: E, fill: 'forwards' }));
    cover.animate([{ transform: `translateY(${dir > 0 ? 100 : -100}%)` }, { transform: 'none' }], { duration: MS, easing: E, fill: 'forwards' });
    setTimeout(() => { location.href = to; }, MS / 2);       // start loading half way; this page stays on screen until the next one can paint
  };
  // going back up to Home takes two scrolls: the first one arms it and says so, a second one (a separate scroll, within a
  // couple of seconds) goes. One stray scroll at the top of Designs never throws you back.
  let armed = 0, armGesture = -1, gesture = 0, tipEl = null;
  const tip = on => {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.innerHTML = TOUCH ? 'Pull down <b style="font-weight:500;color:#fb233b">once more ↓</b> to go Home' : 'Once more, <b style="font-weight:500;color:#fb233b">scroll ↑</b> to go Home';   /* same words and red as Home's "scroll ↓" tip, so the two directions read as a pair on any device */
      tipEl.style.cssText = 'white-space:nowrap;position:fixed;z-index:151;left:50%;top:calc(88px + env(safe-area-inset-top,0px));transform:translate(-50%,-6px);opacity:0;pointer-events:none;padding:7px 13px;border-radius:999px;background:#fff;color:#111;font:500 13px Geist,system-ui,sans-serif;transition:opacity .2s,transform .35s cubic-bezier(.2,.8,.2,1)';
      if (matchMedia('(max-width: 899px)').matches) { tipEl.style.top = 'auto'; tipEl.style.bottom = 'calc(92px + env(safe-area-inset-bottom,0px))'; }
      document.body.append(tipEl); }
    tipEl.style.opacity = on ? 1 : 0; tipEl.style.transform = on ? 'translate(-50%,0)' : 'translate(-50%,-6px)';
  };
  let disarmT = 0;
  const back = () => {
    if (armed && gesture !== armGesture && performance.now() - armed < 2600) { tip(false); go(-1); return; }
    if (!armed || performance.now() - armed >= 2600) { armed = performance.now(); armGesture = gesture; tip(true); clearTimeout(disarmT); disarmT = setTimeout(() => { armed = 0; tip(false); }, 2600); }
  };
  const disarm = () => { if (armed) { armed = 0; tip(false); clearTimeout(disarmT); } };
  // wheel: only a fresh gesture that starts at the edge counts (so a long scroll down a page never spills into the next one)
  let quiet = 0, startEdge = null, acc = 0, over = 0;
  const NEED = home ? 40 : 60;   // a light scroll is enough once you're resting at the edge
  // and only once you've been resting at that edge for a moment, so reaching the bottom never throws you straight onwards
  let topSince = performance.now(), botSince = 0;
  const mark = () => { const e = edges(), n = performance.now(); topSince = e.top ? (topSince || n) : 0; botSince = e.bottom ? (botSince || n) : 0; };
  document.addEventListener('scroll', mark, { passive: true, capture: true });
  setTimeout(mark, 300);
  const rested = (since) => home || (since && performance.now() - since > 200);
  addEventListener('wheel', e => {
    if (e.ctrlKey || gone) return;
    const now = performance.now();
    if (now - quiet > 300) { gesture++; mark(); const e = edges(); startEdge = { top: e.top && rested(topSince), bottom: e.bottom && rested(botSince) }; acc = 0; }
    quiet = now;
    acc += e.deltaY;
    if (e.deltaY > 0) disarm();                                 // scrolling down again cancels the way back
    // keep pulling past the edge in the same scroll and it goes too (a firm pull, so a flick that just reaches the top stays)
    const ed = edges();
    if (ed.top && e.deltaY < 0) over += e.deltaY; else if (!ed.top || e.deltaY > 0) over = 0;
    if (acc > NEED && startEdge.bottom && ed.bottom) go(1);
    else if ((acc < -NEED && startEdge.top && ed.top) || over < -320) back();
  }, { passive: true, capture: true });
  // touch: a swipe that starts at the edge
  let ty = null, tEdge = null;
  addEventListener('touchstart', e => { gesture++; ty = e.touches[0].clientY; mark(); const g = edges(); tEdge = { top: g.top && rested(topSince), bottom: g.bottom && rested(botSince) }; }, { passive: true, capture: true });
  addEventListener('touchmove', e => {
    if (ty == null || gone) return; const dy = ty - e.touches[0].clientY, need = home ? 60 : 110;
    if (dy > need && tEdge.bottom && edges().bottom) { ty = null; go(1); }
    else if (dy < -need && tEdge.top && edges().top) { ty = null; back(); }
  }, { passive: true, capture: true });
  // keys on Home (nothing there to scroll)
  if (home) addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, button, a')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
  });
  addEventListener('pageshow', e => { if (e.persisted && (home || gone)) location.reload(); });   // coming back: a fresh page, not the slid-away one
  // get the neighbours ready: the next page is built in the background where the browser allows it, and its pictures are fetched
  const warm = () => {
    const next = ALLOW.includes(1) ? withV(ORDER[at + 1]) : null, prev = ALLOW.includes(-1) ? withV(ORDER[at - 1]) : null;
    // (the page itself is fetched, not pre-built: a page built in the background loses its WebGL grid and its scroll handling)
    try { const sr = document.createElement('script'); sr.type = 'speculationrules'; sr.textContent = JSON.stringify({ prefetch: [next, prev].filter(Boolean).map(u => ({ source: 'list', urls: [u] })) }); document.head.append(sr); } catch (_) {}
    [next, prev].filter(Boolean).forEach(u => fetch(u, { credentials: 'same-origin' }).then(r => r.text()).then(t => {
      const get = s => { const im = new Image(); im.decoding = 'async'; im.src = s; };
      // its script, so the page can run the moment it arrives
      const js = (t.match(/<script src="(site-[\w-]+\.js\?v=\w+)"/) || [])[1]; if (js) fetch(js, { credentials: 'same-origin' }).catch(() => {});
      // Designs lists the pictures on its first screen (in the order its grid shows them): fetch their thumbnails, then
      // the sharp copies the grid will lay over them, the same size the grid picks for this screen
      const first = [...t.matchAll(/<link rel="preload" as="image" href="([^"]+)" data-first>/g)].map(m => m[1]);
      if (first.length) {
        const w = (innerWidth < 900 ? (innerWidth - 76) / 2 : (innerWidth - 162) / 4) * (devicePixelRatio || 1), d = w <= 520 ? 'sm' : 'md';
        first.forEach(get); first.forEach(s => get(s.replace('/thumbs/', '/' + d + '/')));
        return;
      }
      const seen = new Set(); (t.match(/(?:assets\/[\w\/-]+|pv\/[\w-]+)\.(?:jpe?g|png|webp)/g) || []).forEach(s => { if (seen.size < 12 && !seen.has(s)) { seen.add(s); get(s); } });
    }).catch(() => {}));
  };
  // as soon as this page has finished loading (so the neighbours never compete with it): Home → Designs is the move
  // most visitors make first, often within a second or two, so this doesn't wait for the page to go idle
  const idle = () => setTimeout(warm, 150);
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
})();
;
