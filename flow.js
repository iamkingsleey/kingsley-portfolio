// Home and Designs read as one scroll. Home → Designs going down, Designs → Home going back up.
// Scroll past the end of a page and it eases up into the next one; scroll up past the top and it eases back down
// into the one before. No Tuner for this: the page drifts away, the next page's background slides in, and the
// next page settles into place. The nav stays put, and its red tick moves to the new station.
// Each page also gets its neighbours ready in the background, so the move is quick.
(function () {
  const ORDER = ['index.html', 'designs.html', 'engineering.html', 'about.html'];
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const at = ORDER.indexOf(file); if (at < 0) return;
  // only between Home and Designs: Home flows down into Designs, and Designs flows back up to Home
  const ALLOW = { 'index.html': [1], 'designs.html': [-1] }[file] || [];
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
    const to = ORDER[at + dir]; if (!to || !ALLOW.includes(dir) || gone || document.querySelector('.secret:not([hidden]), .tuner')) return; gone = true;
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
    T.forEach(e => e.animate([{ translate: '0 0', opacity: 1 }, { translate: `0 ${dir > 0 ? -28 : 28}vh`, opacity: 0 }], { duration: MS, easing: E, fill: 'forwards' }));
    cover.animate([{ transform: `translateY(${dir > 0 ? 100 : -100}%)` }, { transform: 'none' }], { duration: MS, easing: E, fill: 'forwards' });
    setTimeout(() => { location.href = to; }, MS / 2);       // start loading half way; this page stays on screen until the next one can paint
  };
  // going back up to Home takes two scrolls: the first one arms it and says so, a second one (a separate scroll, within a
  // couple of seconds) goes. One stray scroll at the top of Designs never throws you back.
  let armed = 0, armGesture = -1, gesture = 0, tipEl = null;
  const tip = on => {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.innerHTML = 'Once more, <b style="font-weight:500;color:#ff4a1c">scroll ↑</b> to go Home';   /* same words and red as Home's "scroll ↓" tip, so the two directions read as a pair on any device */
      tipEl.style.cssText = 'position:fixed;z-index:151;left:50%;top:calc(88px + env(safe-area-inset-top,0px));transform:translate(-50%,-6px);opacity:0;pointer-events:none;padding:7px 13px;border-radius:999px;background:#fff;color:#111;font:500 13px Geist,system-ui,sans-serif;transition:opacity .2s,transform .35s cubic-bezier(.2,.8,.2,1)';
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
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });   // coming back: a fresh page, not the slid-away one
  // get the neighbours ready: the next page is built in the background where the browser allows it, and its pictures are fetched
  const warm = () => {
    const next = ALLOW.includes(1) ? ORDER[at + 1] : null, prev = ALLOW.includes(-1) ? ORDER[at - 1] : null;
    // (the page itself is fetched, not pre-built: a page built in the background loses its WebGL grid and its scroll handling)
    try { const sr = document.createElement('script'); sr.type = 'speculationrules'; sr.textContent = JSON.stringify({ prefetch: [next, prev].filter(Boolean).map(u => ({ source: 'list', urls: [u] })) }); document.head.append(sr); } catch (_) {}
    [next, prev].filter(Boolean).forEach(u => fetch(u, { credentials: 'same-origin' }).then(r => r.text()).then(t => {
      const seen = new Set(); (t.match(/(?:assets\/[\w\/-]+|pv\/[\w-]+)\.(?:jpe?g|png|webp)/g) || []).forEach(s => { if (seen.size < 60 && !seen.has(s)) { seen.add(s); const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = s; /* fetched the same way Designs asks for them, so the cached copy works there */ } });
    }).catch(() => {}));
  };
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(warm, { timeout: 2500 });
})();
