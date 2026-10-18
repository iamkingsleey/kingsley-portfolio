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
    { fq: 94.0, name: 'About', href: 'about.html' }
    // { fq: 102.0, name: 'Projects', href: 'projects.html' },   // Projects is off for now: remove the // to bring it back
  ];
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // pages that live under a station: a case study under Projects, a design's own page under Designs
  const PARENT = { 'case.html': 'Designs', 'brand.html': 'Designs',   // case studies sit under Designs while Projects is off
    'logo.html': 'Designs', 'product.html': 'Designs', 'project.html': 'Designs', 'showcase.html': 'Designs' };
  const cur = STATIONS.find(s => s.href === file) || STATIONS.find(s => s.name === PARENT[file]) || STATIONS[0];
  const ci = STATIONS.indexOf(cur), RED = '#ff4a1c', SP = 74;
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
  .kmn-scale .tr { position: absolute; inset: 0 }
  .kmn-scale .tk { position: absolute; top: 6px; height: 12px; background: repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 12px); opacity: .3 }
  .kmn-scale .nd { position: absolute; left: 50%; top: 2px; width: 2px; height: 30px; margin-left: -1px; background: ${RED}; border-radius: 1px; z-index: 2; transition: left .42s cubic-bezier(.22,1,.36,1) }
  .kmn-scale button { position: absolute; top: 34px; transform: translateX(-50%); padding: 4px 10px; border: 0; border-radius: 999px; background: none; color: var(--muted, #888); font: 500 13.5px Geist, system-ui, sans-serif; cursor: pointer; white-space: nowrap; transition: color .25s, background .25s }
  .kmn-scale button:hover, .kmn-scale button.pv { color: var(--ink, #111) }
  .kmn-scale button.on { color: var(--ink, #111) }   /* the red tick above is the only highlight */
  .kmn-scale button:focus-visible { outline: 2px solid ${RED}; outline-offset: 2px }
  @media (max-width: 900px) { .kmn-scale { top: auto; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); width: calc(100vw - 24px) } }
  @media (max-width: 699px) { .kmn-scale { -webkit-mask-image: none; mask-image: none } .kmn-scale button { font-size: 12.5px; padding: 4px 7px } }`;
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
      b.addEventListener('pointerenter', e => { look(); if (e.pointerType === 'mouse') snd('detent'); });   // a tap on a phone is just the pop b.addEventListener('focus', look);
      T.append(b); return b;
    });
    // the scale stays still with every station across it; the red tick goes straight to the one you pick, in one smooth move
    const place = i => { const g = S.clientWidth / STATIONS.length; bs.forEach((b, k) => b.style.left = (g * (k + .5)) + 'px'); nd.style.left = (g * (i + .5)) + 'px'; };
    // once a station is picked, the tick stays there (the page-change overlay would otherwise count as the pointer leaving)
    const back = () => { if (leaving) return; place(ci); bs.forEach(x => x.classList.remove('pv')); };
    addEventListener('resize', back);
    S.addEventListener('mouseleave', back); S.addEventListener('focusout', e => { if (!S.contains(e.relatedTarget)) back(); });
    const nd = document.createElement('i'); nd.className = 'nd';
    S.append(T, nd); document.body.append(S);
    nd.style.transition = 'none'; back(); nd.offsetWidth; nd.style.transition = '';   // on arrival it is already in place
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
