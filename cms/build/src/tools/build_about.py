# about.html, engineering.html, projects.html (from about-src / engineering-src / projects-src). Run from build_v3.py (shares rep, REPO, KFM, BUILD, THEME_BOOT, TUNER, CLICK).
for PG, FQ, NM in [('about', 94, 'About'), ('engineering', 96, 'Engineering'), ('projects', 102, 'Projects')]:
  A_ = open(f'{GEN}/{PG}-src.html', encoding='utf-8').read()
  A_ = rep(A_, '<html lang="en" data-theme="light">', '<html lang="en">')
  A_ = rep(A_, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + THEME_BOOT + TUNER)
  A_ = rep(A_, f'<title>{NM}</title>', f'<title>{NM} · Kingsley M.</title>')
  A_ = rep(A_, '<div class="station">', '<div class="station" data-readout>')
  A_ = rep(A_, '<a class="back" href="#" onclick="return false">', '<a class="back" href="index.html#home" id="back">')
  A_ = rep(A_, '<button class="theme" type="button" id="theme">Dark</button>\n', '')   # one theme switch for the site, on Home
  A_ = rep(A_, "  $('theme').onclick = () => { const d = document.documentElement.dataset.theme === 'light'; document.documentElement.dataset.theme = d ? 'dark' : 'light'; $('theme').textContent = d ? 'Light' : 'Dark'; };\n", '')
  A_ = rep(A_, "  addEventListener('click', e => { if (e.target.closest('a, button')) snd('pop'); });\n", '')   # the site-wide click sound covers it
  A_ = rep(A_, '<span class="mono">Back to 98.0 Home</span>', '<a class="mono" href="index.html#home" id="back2" style="text-decoration:none">Back to 98.0 Home</a>')
  A_ = rep(A_, "  const snd = n => { if (window.Popkit) Popkit.play(n); };", "  const snd = n => { let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (_) {} if (on && window.Popkit) Popkit.play(n); };   // Home's sound switch")
  A_ = rep(A_, "  const HEAD = __HEAD__;", "  const HEAD = 'assets/headshot.jpg';")
  if '__TOOLSVG__' in A_: A_ = rep(A_, "  const TS = __TOOLSVG__;", "  const TS = " + json.dumps({k: f'assets/{k}.svg' for k in ['figma', 'blender', 'illustrator', 'photoshop', 'aftereffect', 'claude', 'chatgpt']}) + ";")
  A_ = rep(A_, '<!--__POPKIT__-->', '<script src="popkit.js"></script>\n' + CLICK.rstrip())
  # back to Home through the tuner
  A_ = A_.replace('</body>', """<script>
    ['back', 'back2'].forEach(function (id) { var a = document.getElementById(id); if (!a) return;
      a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault();
        if (window.Tuner) Tuner.go({ from: """ + str(FQ) + """, to: 98, name: 'Home', href: a.getAttribute('href') }); else location.href = a.getAttribute('href'); }); });
  </script>
  </body>""", 1)
  assert '__' not in A_.replace('__proto__', ''), re.findall(r'__[A-Z]+__', A_)
  if PG == 'projects':   # each case study opens through the tuner
    for _u in set(re.findall(r'https://framerusercontent\.com/[^"\'?\s]+(?:\?[^"\'\s]*)?', A_)):
      _n = _u.split('?')[0].rsplit('/', 1)[1]
      if os.path.exists(f'{REPO}/assets/cases/{_n}'): A_ = A_.replace(_u, f'assets/cases/{_n}')
    A_ = A_.replace('</body>', """<script>
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a.ch.cs'); if (!a || e.metaKey || e.ctrlKey) return; e.preventDefault();
    var hp = a.getAttribute('href').split('#'), href = hp[0] + '?v=""" + BUILD + """#' + hp[1];
    if (window.Tuner) Tuner.go({ from: 102, to: +a.dataset.fq, name: a.dataset.nm, href: href }); else location.href = href; });
</script>
</body>""", 1)
  open(f'{REPO}/{PG}.html', 'w', encoding='utf-8').write(A_)
  print(PG, 'ok')
