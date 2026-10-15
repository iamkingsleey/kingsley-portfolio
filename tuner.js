/*!
 * Tuner — the page-to-page transition. The page behind blurs, the frequency readout moves to the middle
 * of the screen and counts to the next station over a tick ruler with the red needle, the next page loads
 * underneath, and it clears once that page is ready. Loaded in the <head> of every page.
 *
 *   Tuner.go({ from: 100, to: 98, name: 'Home', href: 'index.html#home' })
 */
(function (root) {
  'use strict';
  var KEY = 'km-tune', reduce = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = '' +
    'html.tuning body{filter:blur(18px) brightness(.55);transition:filter .45s cubic-bezier(.65,0,.35,1)}' +
    'html.tuning.tuned body{filter:none}' +
    'html.tuning:not(.live)::after{content:attr(data-tfq);position:fixed;inset:0;z-index:2000;display:grid;place-items:center;font:600 84px/1 Geist,system-ui,sans-serif;letter-spacing:-2.5px;color:var(--ink,#fff);padding-bottom:6vh}' +
    '.tuner{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;pointer-events:auto;opacity:0;transition:opacity .35s cubic-bezier(.65,0,.35,1)}' +
    '.tuner.on{opacity:1}' +
    '.tuner .tin{display:grid;justify-items:center;gap:8px;width:min(560px,88vw);padding-bottom:6vh;transform:translateY(12px);transition:transform .5s cubic-bezier(.34,1.56,.64,1)}' +
    '.tuner.on .tin{transform:none}' +
    '.tuner .tlb{font:500 10.5px "Geist Mono",ui-monospace,monospace;letter-spacing:.6px;text-transform:uppercase;color:var(--muted,#7a7a7a)}' +
    '.tuner .tfq{font:600 84px/1 Geist,system-ui,sans-serif;letter-spacing:-2.5px;color:var(--ink,#fff);font-variant-numeric:tabular-nums}' +
    '.tuner .tnm{font:500 15px Geist,system-ui,sans-serif;letter-spacing:-.2px;color:var(--ink,#fff);min-height:1.2em;text-align:center}' +
    '.tuner canvas{width:100%;height:64px;margin-top:10px}' +
    '@media (max-width:599px){.tuner .tfq,html.tuning:not(.live)::after{font-size:60px;letter-spacing:-1.8px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var el = null, num, nm, cv, cx, shown = 0;
  function build(name, label) {
    if (el) return el;
    el = document.createElement('div'); el.className = 'tuner'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="tin"><span class="tlb">' + (label || 'Tuning to') + '</span><span class="tfq">0.0</span><span class="tnm"></span><canvas aria-hidden="true"></canvas></div>';
    document.documentElement.appendChild(el);          // outside <body>, so it stays sharp while the page blurs
    num = el.querySelector('.tfq'); nm = el.querySelector('.tnm'); cv = el.querySelector('canvas'); cx = cv.getContext('2d');
    nm.textContent = name || '';
    return el;
  }
  function ink(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  // the tick ruler: one tick per 0.1, a long tick and label on every whole number, the red needle fixed in the middle
  function draw(v) {
    num.textContent = v.toFixed(1);
    var dpr = Math.min(2, root.devicePixelRatio || 1), W = cv.clientWidth || 320, H = cv.clientHeight || 64;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    var col = ink('--ink') || '#fff', SP = 14, base = H - 22, mid = W / 2;
    var first = Math.floor((v - mid / SP / 10) * 10) - 2, last = Math.ceil((v + mid / SP / 10) * 10) + 2;
    for (var q = first; q <= last; q++) {
      var x = mid + (q / 10 - v) * 10 * SP; if (x < -4 || x > W + 4) continue;
      var major = q % 10 === 0, d = Math.abs(x - mid) / SP, edge = Math.max(0, Math.min(1, Math.min(x, W - x) / 60));
      var L = (major ? 16 : 7) + Math.max(0, 8 - d) * 2.2;
      cx.globalAlpha = ((major ? .55 : .2) + Math.max(0, 1 - d / 8) * .35) * edge; cx.strokeStyle = col; cx.lineWidth = major ? 1.8 : 1.1;
      cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, base - L); cx.stroke();
      if (major) { cx.fillStyle = col; cx.font = '500 10px "Geist Mono", monospace'; cx.textAlign = 'center'; cx.fillText((q / 10).toFixed(0), x, base + 16); }
    }
    cx.globalAlpha = 1; cx.fillStyle = '#ff4a1c'; cx.fillRect(mid - 1.5, base - 40, 3, 42);
  }
  function count(from, to, ms, done) {
    var t0 = performance.now();
    (function f(now) {
      var k = ms ? Math.min(1, (now - t0) / ms) : 1, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      shown = from + (to - from) * e; draw(shown);
      if (k < 1) requestAnimationFrame(f); else if (done) done();
    })(t0);
  }

  // leaving: blur this page, bring the readout to the middle, count toward the next station, go
  function go(o) {
    if (reduce) { location.href = o.href; return; }
    var span = Math.abs(o.to - o.from), ms = Math.min(1100, 500 + span * 250);
    var at = Math.min(ms * .6, 480);                      // start loading the next page part-way through the count
    document.documentElement.classList.add('tuning', 'live');
    build(o.name, o.label); draw(o.from);
    requestAnimationFrame(function () { el.classList.add('on'); });
    count(o.from, o.to, ms);
    setTimeout(function () {
      try { sessionStorage.setItem(KEY, JSON.stringify({ from: o.from, to: o.to, v: shown, name: o.name, t: Date.now() })); } catch (e) {}
      location.href = o.href;
    }, at);
  }

  // arriving: if the last page tuned us here a moment ago, keep the readout up until this page is ready
  var arr = null;
  try { arr = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) {}
  if (arr && Date.now() - arr.t < 6000 && !reduce) {
    document.documentElement.classList.add('tuning');
    document.documentElement.setAttribute('data-tfq', (+arr.v).toFixed(1));
    var ready = false, counted = false, t0 = Date.now();
    var over = false, finish = function () {
      if (!ready || !counted || over || !el) return; over = true;
      document.documentElement.classList.add('tuned');
      el.classList.remove('on');
      setTimeout(function () { document.documentElement.classList.remove('tuning', 'live', 'tuned'); if (el) { el.remove(); el = null; } }, 480);
    };
    var start = function () {
      document.documentElement.classList.add('live');
      build(arr.name); el.classList.add('on'); draw(+arr.v);
      count(+arr.v, +arr.to, Math.max(250, Math.abs(arr.to - arr.v) * 400), function () { counted = true; setTimeout(finish, 180); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    var loaded = function () { ready = true; finish(); };
    if (document.readyState === 'complete') loaded(); else addEventListener('load', loaded);
    setTimeout(function () { ready = true; finish(); }, 2600);   // never hold a visitor on a slow picture
  }
  // back/forward cache: never come back to a blurred page
  addEventListener('pageshow', function (e) {
    if (e.persisted) { document.documentElement.classList.remove('tuning', 'live', 'tuned'); if (el) { el.remove(); el = null; } }
  });

  root.Tuner = { go: go };
})(window);
