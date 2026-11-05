// Shared bits for the checkout explorations: naira formatting, and a demo hand that plays a script, pauses when the tile
// is off screen ({ km_play } from the Designs grid) and hands over to a real visitor, resuming after a quiet spell.
(() => {



  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const naira = n => '₦' + Math.round(n).toLocaleString('en-NG');
  let shown = true, gen = 0, idleT = 0, script = null, hand = null;
  addEventListener('message', e => { if (e.data && typeof e.data.km_play === 'boolean') shown = e.data.km_play; });
  const playing = () => shown && !document.hidden;
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 1;
  const sleep = ms => { const g = gen; return new Promise((res, rej) => { let t = 0, last = performance.now(); const f = now => { if (g !== gen) return rej(0); if (playing()) t += now - last; last = now; t >= ms ? res() : requestAnimationFrame(f); }; requestAnimationFrame(f); }); };
  const place = (x, y) => { hand.style.transform = `translate(${x - 9 * rem()}px, ${y - 4 * rem()}px)`; };
  const H = {
    sleep, place: (x, y) => { hand.classList.add('on'); hand.style.transition = 'opacity .3s'; place(x, y); },
    at(el, fx = .5, fy = .55, ms = 650) { if (typeof el === 'string') el = document.querySelector(el); const r = el.getBoundingClientRect(); hand.classList.add('on'); hand.style.transition = `transform ${ms}ms cubic-bezier(.45,.05,.2,1), opacity .3s`; place(r.left + r.width * fx, r.top + r.height * fy); return sleep(ms); },
    async tap(el, fn, fx, fy) { if (typeof el === 'string') el = document.querySelector(el); await H.at(el, fx, fy); hand.classList.add('down'); el.classList.add('press'); await sleep(120); hand.classList.remove('down'); el.classList.remove('press'); fn && fn(); await sleep(160); },
    down(on) { hand.classList.toggle('down', on); }, away() { hand.classList.remove('on'); },
    // a smooth number move, paused while hidden
    tween(from, to, ms, out) { const g = gen; return new Promise((res, rej) => { let t = 0, last = performance.now(); const f = now => { if (g !== gen) return rej(0); if (playing()) t += now - last; last = now; const k = Math.min(1, t / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; out(from + (to - from) * e, k); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }); },
  };
  const touched = () => { gen++; if (hand) hand.classList.remove('on'); clearTimeout(idleT); idleT = setTimeout(run, 9000); };
  function run() { const g = ++gen; (async () => { while (g === gen) { try { await script(H); } catch (_) { return; } } })(); }
  window.CO = { fmt, naira,
    demo(fn) { script = fn; hand = document.createElement('div'); hand.className = 'hand';
      hand.innerHTML = '<svg viewBox="0 0 26 26"><path d="M9.2 12.4V5.6a1.7 1.7 0 0 1 3.4 0v5.3l.1-1.2a1.6 1.6 0 0 1 3.2.2v1.3a1.6 1.6 0 0 1 3.1.4v1.1a1.5 1.5 0 0 1 3 .3v4.4c0 3.5-2.6 6.1-6.1 6.1h-1.6c-2 0-3.4-.8-4.6-2.4l-3.6-4.8a1.6 1.6 0 0 1 2.4-2.1z" fill="#fff" stroke="#0d0f14" stroke-width="1.3" stroke-linejoin="round"/></svg>';
      document.body.append(hand); ['pointerdown', 'keydown', 'wheel'].forEach(t => addEventListener(t, e => { if (e.isTrusted) touched(); }, { capture: true, passive: true }));
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(run, 500); } };
})();
