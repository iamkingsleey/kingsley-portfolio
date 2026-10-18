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
