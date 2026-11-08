/* Visitor actions for the CMS Analytics page. Each is a GoatCounter "event" (no cookies, nothing personal), named by a
   path under /e/ so the CMS can group them:
     /e/hire/…      For recruiters opened, Book a call, email (clicked or copied), Résumé, LinkedIn, Dribbble, GitHub
     /e/case/…      a case study opened, read to its impact, read to the end, its prototype tried
     /e/tune/…      the station the dial tuned to; /e/nav/click|drag|menu how; /e/nav/back the back button
     /e/session/…   once per visit: light or dark, sound on or off; /e/theme/…, /e/sound/… when switched
     /e/404/…       a missing address someone landed on
   Every page loads this (cms/build/src/tools/post.py). KMtrack (in the analytics snippet) queues until GoatCounter loads. */
(() => {
  if (window.__kmTrack) return; window.__kmTrack = true;
  const T = (path, title) => { try { if (window.KMtrack) KMtrack(path, title || path); } catch (_) {} };
  const seen = new Set(), T1 = (p, t) => { if (!seen.has(p)) { seen.add(p); T(p, t); } };
  const file = ((location.pathname.split('/').pop() || 'index.html').replace(/^([a-z0-9-]+)$/i, '$1.html')).toLowerCase();
  const ls = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };

  // ---- clicks anywhere: hiring actions, the back button, theme and sound switches
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a, button'); if (!a) return;
    const h = (a.getAttribute('href') || '').toLowerCase();
    if (a.classList.contains('pt-rec')) { setTimeout(() => { if (a.getAttribute('aria-expanded') === 'true') T('/e/hire/recruiters', 'Opened For recruiters'); }, 0); return; }
    if (h.includes('calendar.app.google') || a.id === 'bookCall') return T('/e/hire/book-call', 'Book a call');
    if (h.startsWith('mailto:') || a.hasAttribute('data-copy')) return T('/e/hire/email', 'Email');
    if (a.classList.contains('cv') || /^r[ée]sum[ée]$/i.test(a.textContent.trim())) return T('/e/hire/resume', 'Résumé');
    if (h.includes('linkedin.com')) return T('/e/hire/linkedin', 'LinkedIn');
    if (h.includes('dribbble.com')) return T('/e/hire/dribbble', 'Dribbble');
    if (h.includes('github.com')) return T('/e/hire/github', 'GitHub');
    if (a.matches('.back, #stBack, .dback, [aria-label^="Tune back"]')) return T('/e/nav/back', 'Back button');
    if (a.id === 'themeBtn' || a.classList.contains('theme-btn')) return setTimeout(() => { const t = document.documentElement.dataset.theme || 'dark'; T('/e/theme/' + t, 'Switched to ' + t); }, 60);
    if (a.id === 'soundBtn' || a.classList.contains('sound-btn')) return setTimeout(() => { const off = ls('km-sound') === 'off'; T('/e/sound/' + (off ? 'muted' : 'on'), off ? 'Muted sound' : 'Turned sound on'); }, 60);
  }, true);

  // ---- once per visit: the theme and sound people actually browse with
  addEventListener('load', () => setTimeout(() => {
    try { if (sessionStorage.getItem('km-tracked')) return; sessionStorage.setItem('km-tracked', '1'); } catch (_) { return; }
    const t = document.documentElement.dataset.theme || 'dark';
    T('/e/session/theme-' + t, 'Visit in ' + t + ' mode');
    T('/e/session/sound-' + (ls('km-sound') === 'off' ? 'off' : 'on'), 'Visit with sound ' + (ls('km-sound') === 'off' ? 'off' : 'on'));
  }, 1500));

  // ---- a missing address (the 404 page)
  if (file === '404.html' || /^not found/i.test(document.title)) T('/e/404' + location.pathname, location.pathname + location.search);

  // ---- case studies: opened, read to the impact, read to the end, prototype tried
  if (file === 'case.html' || file === 'brand.html') {
    const slug = () => (location.hash.slice(1).split(/[?&]/)[0] || 'case').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const name = () => (document.title.split('·')[0] || slug()).trim();
    const start = () => { T1(`/e/case/${slug()}/open`, name()); };
    const check = () => {
      const s = slug(), H = innerHeight;
      const imp = document.querySelector('[data-ix*="mpact" i], [data-ix*="esult" i], .bign, .nums');
      if (imp && imp.getBoundingClientRect().top < H * .8) T1(`/e/case/${s}/impact`, name());
      if (scrollY + H >= document.documentElement.scrollHeight - 600) T1(`/e/case/${s}/end`, name());
    };
    setTimeout(start, 1200);
    addEventListener('hashchange', () => setTimeout(start, 800));
    let tk = 0; addEventListener('scroll', () => { if (!tk) tk = setTimeout(() => { tk = 0; check(); }, 400); }, { passive: true });
    // clicking into a prototype moves focus into its frame, which takes it from this page
    addEventListener('blur', () => setTimeout(() => { const f = document.activeElement; if (f && f.tagName === 'IFRAME') T1(`/e/case/${slug()}/prototype`, name()); }, 0));
  }
})();
