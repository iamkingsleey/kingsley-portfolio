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
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // pages that live under a station: a case study under Projects, a design's own page under Designs
  const PARENT = { 'case.html': 'Designs', 'brand.html': 'Designs',   // case studies sit under Designs while Projects is off
    'logo.html': 'Designs', 'product.html': 'Designs', 'project.html': 'Designs', 'showcase.html': 'Designs' };
  const cur = STATIONS.find(s => s.href === file) || STATIONS.find(s => s.name === PARENT[file]) || STATIONS[0];
  const ci = STATIONS.indexOf(cur), RED = '#fb233b', SP = 74;
  const snd = n => { let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (_) {} if (on && window.Popkit) try { Popkit.play(n); } catch (_) {} };
  const go = s => {
    if (s === cur && !PARENT[file]) { scrollTo({ top: 0, behavior: 'smooth' }); return; }   // already here: back to the top
    if (window.Tuner) Tuner.go({ from: cur.fq, to: s.fq, name: s.name, href: s.href }); else location.href = s.href;
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
  e.stopPropagation();
}, { capture: true, passive: true });
