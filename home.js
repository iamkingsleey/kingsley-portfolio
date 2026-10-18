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
  }`;
  document.head.append(st);
  const prev = [...document.querySelectorAll('p')].find(p => p.textContent.startsWith('Previously'));
  if (prev) {
    const l = document.createElement('div'); l.className = 'introst';
    l.innerHTML = '<i></i><span>Open to new work.</span><b>Book a call</b>';
    l.addEventListener('click', () => { if (book) book.click(); });
    prev.after(l);
  }
})();
