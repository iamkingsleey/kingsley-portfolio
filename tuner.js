/*!
 * Tuner — the page-to-page transition. The page behind blurs, the frequency readout moves to the middle
 * of the screen and counts to the next station over a tick ruler with the red needle, the next page loads
 * underneath, and it clears once that page is ready. Loaded in the <head> of every page.
 *
 *   Tuner.go({ from: 100, to: 98, name: 'Home', href: 'index.html#home' })
 *
 * Leaving, the readout counts the first part of the way and holds there while the browser switches pages;
 * the next page shows the same readout at the same number from its very first paint and counts the rest,
 * so the number never jumps or runs backwards.
 */
(function (root) {
  'use strict';
  var KEY = 'km-tune', LEG = .6;   // share of the count done before the page switches
  var reduce = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* the blur sits on the overlay (backdrop-filter), never on <body>: a filter on <body> would make every fixed
       element on the page (station readout, dials, rulers) jump to the body's own position while it is applied */
  var css = '' +

    '.tuner{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;margin:0;z-index:2147483000;display:grid;place-items:center;pointer-events:auto;opacity:0;transition:opacity .2s cubic-bezier(.65,0,.35,1)}' +
    '.tuner::before{content:"";position:absolute;inset:0;background:rgb(11 11 11 / .6);background:color-mix(in srgb,var(--bg,#0b0b0b) 62%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}' +
    '.tuner.on{opacity:1}' +
    // leaving the screen it settles in place (a little smaller, fading), it never travels anywhere
    '.tuner .tin{transition:transform .25s cubic-bezier(.2,.8,.2,1)}' +
    '.tuner.out .tin{transform:translate(-50%,-56%) scale(.94)}' +
    // the page's own readout (top left) waits until the centre one has gone, so the number never seems to jump there
    'html.tuning [data-readout]{opacity:0!important;transition:none}' +
    '[data-readout]{transition:opacity .6s cubic-bezier(.2,.8,.2,1) .15s}' +
    '.tuner.now{transition:none}' +
    '.tuner .tin{position:absolute;left:50%;top:50%;transform:translate(-50%,-56%);display:grid;justify-items:center;gap:8px;width:min(560px,88vw)}' +
    '.tuner .tlb{font:500 10.5px "Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.6px;text-transform:uppercase;color:var(--muted,#7a7a7a)}' +
    '.tuner .tfq{font:600 84px/1 Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;letter-spacing:-2.5px;color:var(--ink,#fff);font-variant-numeric:tabular-nums}' +
    '.tuner .tnm{font:500 15px Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;letter-spacing:-.2px;color:var(--ink,#fff);min-height:1.2em;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.tuner canvas{display:block;width:100%;height:64px;margin-top:10px}' +
    '@media (max-width:599px){.tuner .tfq{font-size:60px;letter-spacing:-1.8px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var el = null, num, cv, cx, shown = 0, going = false;
  function build(name) {
    if (el) return el;
    el = document.createElement('div'); el.className = 'tuner'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="tin"><span class="tlb">Tuning to</span><span class="tfq">0.0</span><span class="tnm"></span><canvas aria-hidden="true"></canvas></div>';
    el.querySelector('.tnm').textContent = name || '';
    document.documentElement.appendChild(el);          // outside <body>, so it stays sharp while the page blurs
    num = el.querySelector('.tfq'); cv = el.querySelector('canvas'); cx = cv.getContext('2d');
    return el;
  }
  function v(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  // the tick ruler: one tick per 0.1, a long tick and label on every whole number, the red needle fixed in the middle
  function draw(f) {
    shown = f; num.textContent = f.toFixed(1);
    var dpr = Math.min(2, root.devicePixelRatio || 1), W = cv.clientWidth || Math.min(560, innerWidth * .88), H = 64;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    var col = v('--ink') || '#fff', SP = 14, base = H - 22, mid = W / 2;
    var first = Math.floor((f - mid / SP / 10) * 10) - 2, last = Math.ceil((f + mid / SP / 10) * 10) + 2;
    for (var q = first; q <= last; q++) {
      var x = mid + (q / 10 - f) * 10 * SP; if (x < -4 || x > W + 4) continue;
      var major = q % 10 === 0, d = Math.abs(x - mid) / SP, edge = Math.max(0, Math.min(1, Math.min(x, W - x) / 60));
      var L = (major ? 16 : 7) + Math.max(0, 8 - d) * 2.2;
      cx.globalAlpha = ((major ? .55 : .2) + Math.max(0, 1 - d / 8) * .35) * edge; cx.strokeStyle = col; cx.lineWidth = major ? 1.8 : 1.1;
      cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, base - L); cx.stroke();
      if (major) { cx.fillStyle = col; cx.font = '500 10px "Geist Mono", ui-monospace, monospace'; cx.textAlign = 'center'; cx.fillText((q / 10).toFixed(0), x, base + 16); }
    }
    cx.globalAlpha = 1; cx.fillStyle = '#fb233b'; cx.fillRect(mid - 1.5, base - 40, 3, 42);
  }
  // ease: leaving speeds up (ease-in), arriving slows into the station (ease-out); together one smooth sweep
  function count(from, to, ms, ease, done) {
    var t0 = performance.now();
    (function f(now) {
      var k = ms ? Math.max(0, Math.min(1, (now - t0) / ms)) : 1;
      draw(from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(f); else if (done) done();
    })(t0);
  }
  var easeIn = function (k) { return k * k; }, easeOut = function (k) { return 1 - (1 - k) * (1 - k); };

  // leaving: blur this page, bring the readout to the middle, count part of the way, switch pages
  function go(o) {
    if (going) return; going = true;
    var leave = function () { if (o.back) history.back(); else if (o.replace) location.replace(o.href); else location.href = o.href; };   // back: step back through the history, so the browser's own back agrees
    if (reduce) { leave(); return; }
    var span = Math.abs(o.to - o.from), total = Math.min(520, 260 + span * 70), leg = Math.round(total * LEG);
    var mid = o.from + (o.to - o.from) * LEG;
    document.documentElement.classList.add('tuning');
    build(o.name); el.classList.remove('out', 'now'); el.querySelector('.tnm').textContent = o.name || ''; draw(o.from);
    requestAnimationFrame(function () { el.classList.add('on'); });
    count(o.from, mid, leg, easeIn, function () {
      try { sessionStorage.setItem(KEY, JSON.stringify({ v: mid, to: o.to, name: o.name, ms: total - leg, t: Date.now() })); } catch (e) {}
      leave();                                           // the readout holds at mid while the next page comes in
      var u = null; try { u = new URL(o.href, location.href); } catch (e) {}
      if (!o.back && u && u.pathname === location.pathname && u.search === location.search) {   // same page, new place (the next case): finish here
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        count(mid, o.to, Math.max(140, total - leg), easeOut, function () {
          if (!el) { going = false; return; } document.documentElement.classList.add('tuned'); el.classList.add('out'); el.classList.remove('on');
          setTimeout(function () { document.documentElement.classList.remove('tuning', 'tuned'); if (el) { el.remove(); el = null; } going = false; }, 200); });
      }
    });
  }

  // arriving: if the last page tuned us here a moment ago, the readout is up from the first paint
  var arr = null;
  try { arr = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) {}
  if (arr && Date.now() - arr.t < 6000 && !reduce) {
    try { sessionStorage.setItem('km-loaded', '1'); } catch (e) {}   // Home's first-visit loader would be a second counter
    document.documentElement.classList.add('tuning');
    build(arr.name); el.classList.add('now', 'on'); draw(+arr.v);
    var ready = false, counted = false, over = false;
    var finish = function () {
      if (!ready || !counted || over || !el) return; over = true;
      var me = el; me.classList.remove('now');
      document.documentElement.classList.add('tuned');   // the page sharpens…
      requestAnimationFrame(function () { me.classList.add('out'); me.classList.remove('on'); });   // the readout fades where it is
      setTimeout(function () { if (going) return; document.documentElement.classList.remove('tuning', 'tuned'); me.remove(); if (el === me) el = null; }, 200);   // unless a tap already tuned away
    };
    var begin = function () { count(+arr.v, +arr.to, Math.max(140, +arr.ms || 200), easeOut, function () { counted = true; finish(); }); };
    requestAnimationFrame(begin);
    var loaded = function () { ready = true; finish(); };
    if (document.readyState !== 'loading') loaded(); else addEventListener('DOMContentLoaded', loaded);   // the page itself, not every picture: only a slow connection holds the readout up
    setTimeout(loaded, 2400);                          // never hold a visitor on a slow picture
  }
  // back/forward cache: never come back to a blurred page
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    going = false; document.documentElement.classList.remove('tuning', 'tuned');
    if (el) { el.remove(); el = null; }
  });

  root.Tuner = { go: go };
})(window);
