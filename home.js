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
  .vsw { position: fixed; z-index: 150; left: max(48px, env(safe-area-inset-left, 0px)); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: var(--pill, #f2f2f2);
    font: 600 12px "Geist Mono", ui-monospace, monospace; letter-spacing: .3px }
  .vsw a { padding: 5px 10px; border-radius: 999px; color: var(--muted, #888); text-decoration: none; transition: color .2s, background .2s }
  .vsw a:hover { color: var(--ink, #111) }
  .vsw a.on { background: var(--bg, #fff); color: var(--ink, #111) }
  @media (max-width: 900px) { .vsw { left: max(16px, env(safe-area-inset-left, 0px)); bottom: calc(20px + env(safe-area-inset-bottom, 0px)); top: auto }   /* phones: bottom left; the menu sits top right */
    .mode-bottom .theme-btn, .mode-bottom .sound-btn { top: calc(20px + env(safe-area-inset-top, 0px)) !important }
    .mode-bottom .theme-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 50px) !important } .mode-bottom .sound-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 90px) !important } }`;
  document.head.append(st);
  // version switch, bottom left: this site is v4; v3 is the previous build, kept in iteration-3/
  const vs = document.createElement('nav'); vs.className = 'vsw'; vs.setAttribute('aria-label', 'Site version');
  vs.innerHTML = '<a href="iteration-3/index.html" title="Iteration 3">v3</a><a class="on" aria-current="page" title="Iteration 4">v4</a>';
  document.body.append(vs);
  const prev = [...document.querySelectorAll('p')].find(p => p.textContent.startsWith('Previously'));
  if (prev && (window.KM_SITE || {}).available !== false) {   // shown only while taking new work (CMS → Settings)
    const l = document.createElement('div'); l.className = 'introst';
    l.innerHTML = '<i></i><span>Open to new work.</span><b>Book a call</b>';
    l.addEventListener('click', () => { if (book) book.click(); });
    prev.after(l);
  }
})();
