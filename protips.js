// helping a recruiter get around in seconds.
//  1 · First visit: a one-line tip under the nav while the red tick sweeps once across the stations.
//  2 · Home: a small "Scroll for work" cue at the bottom, until they've scrolled once.
//  3 · Every page: pointing at a station says what's there.
//  4 · Home: "For recruiters" opens a three-line card (who, availability, where to look).
//  A small "?" next to sound and theme replays the tip.
(function () {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase(), home = file === 'index.html';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const get = k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set = k => { try { localStorage.setItem(k, '1'); } catch (_) {} };
  const HINT = { Home: 'Start here', Designs: '29 pieces · 7 case studies', Engineering: 'Plugins and tools I build', About: 'My story and how to reach me' };
  const st = document.createElement('style');
  st.textContent = `
  .pt-pill { position: fixed; z-index: 151; left: 50%; top: calc(88px + env(safe-area-inset-top, 0px)); transform: translate(-50%, -6px); opacity: 0; pointer-events: none;
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--ink, #111); color: var(--bg, #fff); font: 500 13px Geist, system-ui, sans-serif; white-space: nowrap;
    box-shadow: 0 10px 30px rgb(0 0 0 / .14); transition: opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1) }
  .pt-pill.on { opacity: 1; transform: translate(-50%, 0) }
  .pt-pill b { font-weight: 500; color: #ff4a1c }
  .pt-hint { position: fixed; z-index: 151; transform: translate(-50%, -4px); opacity: 0; pointer-events: none; padding: 5px 9px; border-radius: 7px; background: var(--ink, #111); color: var(--bg, #fff);
    font: 500 12px Geist, system-ui, sans-serif; white-space: nowrap; transition: opacity .15s, transform .25s cubic-bezier(.2,.8,.2,1) }
  .pt-hint.on { opacity: 1; transform: translate(-50%, 0) }
  .pt-cue { position: fixed; z-index: 30; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 2px;
    font: 500 11px "Geist Mono", ui-monospace, monospace; letter-spacing: .6px; text-transform: uppercase; color: var(--muted, #888); background: none; border: 0; cursor: pointer; transition: opacity .3s }
  .pt-cue svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; animation: ptb 1.6s cubic-bezier(.45,0,.55,1) infinite }
  .pt-cue:hover { color: var(--ink, #111) }
  @keyframes ptb { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(4px) } }
  .pt-rec { position: fixed; z-index: 150; left: max(48px, env(safe-area-inset-left, 0px)); top: calc(48px + env(safe-area-inset-top, 0px)); height: 36px; padding: 0 14px; border-radius: 999px; border: 0;
    background: var(--pill, #f2f2f2); color: var(--ink, #111); font: 500 13px Geist, system-ui, sans-serif; cursor: pointer; transition: background .2s }
  .pt-rec:hover { background: var(--pill-hover, #e8e8e8) }
  .pt-rec { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px 0 14px }
  .pt-rec svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform .3s cubic-bezier(.2,.8,.2,1) }
  .pt-rec[aria-expanded="true"] svg { transform: rotate(180deg) }
  .pt-card { position: fixed; z-index: 152; left: max(48px, env(safe-area-inset-left, 0px)); top: calc(96px + env(safe-area-inset-top, 0px)); width: min(320px, calc(100vw - 32px)); padding: 18px 18px 18px; border-radius: 20px;
    background: var(--bg, #fff); color: var(--text, #333); box-shadow: 0 0 0 1px var(--edge, rgb(0 0 0 / .07)), 0 24px 60px rgb(0 0 0 / .18); font: 14px/1.5 Geist, system-ui, sans-serif;
    opacity: 0; transform: translateY(-6px) scale(.98); transform-origin: top left; pointer-events: none; transition: opacity .2s, transform .3s cubic-bezier(.2,.8,.2,1) }
  .pt-card.on { opacity: 1; transform: none; pointer-events: auto }
  .pt-card .lb { font: 500 10.5px "Geist Mono", ui-monospace, monospace; letter-spacing: .7px; text-transform: uppercase; color: var(--muted, #888) }
  .pt-card .go { margin: 12px 0 16px; display: grid }
  .pt-card .go a { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px; padding: 12px 0; border-top: 1px solid var(--line, rgb(0 0 0 / .08)); color: var(--ink, #111); text-decoration: none }
  .pt-card .go a:last-child { border-bottom: 1px solid var(--line, rgb(0 0 0 / .08)) }
  .pt-card .go b { font-weight: 500 }
  .pt-card .go small { grid-column: 1; font-size: 12.5px; color: var(--muted, #888) }
  .pt-card .go i { grid-row: 1 / span 2; grid-column: 2; font-style: normal; color: var(--muted, #888); transition: transform .25s cubic-bezier(.2,.8,.2,1), color .2s }
  .pt-card .go a:hover i { transform: translateX(3px); color: #ff4a1c }
  .pt-card .ac { display: grid; grid-template-columns: 1fr 1fr; gap: 8px }
  .pt-card .ac a, .pt-card .ac button { height: 40px; padding: 0 14px; border-radius: 12px; border: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--pill, #f2f2f2); color: var(--ink, #111);
    font: 500 13.5px Geist, system-ui, sans-serif; text-decoration: none; cursor: pointer; transition: background .2s, transform .2s }
  .pt-card .ac a:hover, .pt-card .ac button:hover { transform: translateY(-1px) }
  .pt-q { position: fixed; z-index: 150; top: calc(48px + env(safe-area-inset-top, 0px)); right: calc(max(64px, env(safe-area-inset-right, 0px)) + 88px); width: 36px; height: 36px; border-radius: 50%; border: 0;
    background: var(--pill, #f2f2f2); color: var(--ink, #111); font: 600 14px Geist, system-ui, sans-serif; cursor: pointer }
  @media (max-width: 899px) {
    .pt-pill { top: auto; bottom: calc(92px + env(safe-area-inset-bottom, 0px)); white-space: normal; text-align: center; width: max-content; max-width: calc(100vw - 32px) }
    .pt-cue { bottom: calc(96px + env(safe-area-inset-bottom, 0px)) }
    .pt-rec { left: 16px; top: auto; bottom: calc(150px + env(safe-area-inset-bottom, 0px)) }
    .pt-card { left: 16px; top: auto; bottom: calc(194px + env(safe-area-inset-bottom, 0px)); max-height: calc(100vh - 220px); overflow: auto }
    .pt-q { display: none }
  }`;
  document.head.append(st);
  const start = () => {
    const S = document.querySelector('.kmn-scale'); if (!S) return;
    const btns = [...S.querySelectorAll('button')], nd = S.querySelector('.nd');
    // 3 · what's at each station
    const hint = document.createElement('div'); hint.className = 'pt-hint'; document.body.append(hint); let hide = null;
    btns.forEach(b => {
      b.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; const t = HINT[b.textContent.trim()]; if (!t) return;
        hide && hide(); const r = b.getBoundingClientRect(); hint.textContent = t; hint.style.left = (r.left + r.width / 2) + 'px'; hint.style.top = (S.getBoundingClientRect().bottom + 8) + 'px'; hint.classList.add('on'); });
      b.addEventListener('pointerleave', () => hint.classList.remove('on'));
    });
    if (!home) return;
    // 1 · the one-line tip, with the tick sweeping once across the stations
    const pill = document.createElement('div'); pill.className = 'pt-pill'; pill.setAttribute('role', 'status');
    pill.innerHTML = 'Tune in: pick a station, or <b>scroll ↓</b> for my work'; document.body.append(pill);
    let tt = [];
    hide = () => { pill.classList.remove('on'); tt.forEach(clearTimeout); tt = []; const h = btns.find(b => b.textContent.trim() === 'Home'); if (nd && h) nd.style.left = h.style.left; };
    const show = () => {
      hide(); pill.classList.add('on'); set('km-tip');
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
      addEventListener('wheel', () => set('km-scrolled'), { passive: true, once: true });
    }
    // 4 · for recruiters
    const rec = document.createElement('button'); rec.type = 'button'; rec.className = 'pt-rec'; rec.innerHTML = 'For recruiters<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5 8 10.5 12 6.5"/></svg>'; rec.setAttribute('aria-expanded', 'false');
    const card = document.createElement('div'); card.className = 'pt-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'For recruiters');
    const cv = [...document.querySelectorAll('a')].find(a => a.textContent.trim().toLowerCase() === 'resume');
    // the short route through the site: what to open first (nothing the landing page already says)
    card.innerHTML = `<span class="lb">For recruiters · the short route</span>
      <div class="go"><a href="case.html#kusnap"><b>Kusnap case study</b><small>Product, 0 to 1</small><i>→</i></a>
        <a href="brand.html#oghosa"><b>Oghosa case study</b><small>Brand identity</small><i>→</i></a>
        <a href="designs.html"><b>All designs</b><small>29 pieces · 7 case studies</small><i>→</i></a></div>
      <div class="ac"><a href="${cv ? cv.getAttribute('href') : '#'}" class="cv">Résumé</a><button type="button" class="bk">Book a call</button></div>`;
    card.querySelector('.bk').addEventListener('click', () => { const b = document.getElementById('bookCall'); if (b) b.click(); });
    const setOpen = o => { card.classList.toggle('on', o); rec.setAttribute('aria-expanded', o); };
    rec.addEventListener('click', e => { e.stopPropagation(); setOpen(!card.classList.contains('on')); });
    document.addEventListener('click', e => { if (!card.contains(e.target) && e.target !== rec) setOpen(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    document.body.append(rec, card);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(start, 30)); else setTimeout(start, 30);
})();
