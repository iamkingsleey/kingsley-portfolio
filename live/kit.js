// Shared helpers for the live chart cards. Each card only runs while it can be seen: the Designs grid tells it
// (postMessage { km_play: true|false }) as its tile comes and goes, and it also stops when the tab is hidden.
window.KM = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = true; const runs = [];
  const live = () => shown && !document.hidden && !reduce;
  const kick = () => runs.forEach(f => f());
  addEventListener('message', e => { if (e.data && typeof e.data.km_play === 'boolean') { shown = e.data.km_play; kick(); } });
  document.addEventListener('visibilitychange', kick);
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 1;
  // a repeating step (data ticks)
  function every(ms, fn) { let t = 0; const run = () => { clearInterval(t); if (live()) t = setInterval(fn, ms); }; runs.push(run); run(); }
  // a drawing loop; fn(now, dt) also runs once at the start so a paused card still shows its first frame
  function frame(fn) { let r = 0, last = performance.now();
    const tick = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; fn(now, dt); if (live()) r = requestAnimationFrame(tick); };
    const run = () => { cancelAnimationFrame(r); last = performance.now(); if (live()) r = requestAnimationFrame(tick); };
    runs.push(run); requestAnimationFrame(now => { fn(now, 0); run(); }); }
  // a number that counts to its new value
  function tween(from, to, ms, out) { const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); out(from + (to - from) * e, k); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
  const setChip = (el, n) => { el.textContent = pct(n); el.classList.toggle('dn', n < 0); };
  // an element's size in rem, so charts draw in the same units as the card
  const size = el => { const r = rem(); return [el.clientWidth / r, el.clientHeight / r]; };
  // a smooth line through points (Catmull-Rom as cubic Béziers)
  function smooth(p) { if (!p.length) return ''; let d = `M${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}`;
    for (let i = 0; i < p.length - 1; i++) { const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)},${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)},${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)},${c[1].toFixed(2)}`; }
    return d; }
  // a wandering price: calm drift, the odd sharp move that eases back
  function walker(start, vol) { let v = start, vel = 0, lift = 0;
    return () => { if (Math.random() < .04 && Math.abs(lift) < vol * .5) lift = (Math.random() < .6 ? 1 : -1) * vol * rnd(4, 7);
      lift *= .92; vel = vel * .55 + rnd(-1, 1) * vol + (start + lift - v) * .06; v += vel; return v; }; }
  const onResize = fn => { if ('ResizeObserver' in window) new ResizeObserver(() => fn()).observe(document.documentElement); else addEventListener('resize', fn); };
  return { reduce, live, every, frame, tween, rnd, clamp, money, pct, setChip, size, smooth, walker, onResize, rem };
})();
