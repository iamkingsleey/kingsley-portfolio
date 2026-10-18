# case.html: the case study page = the product design page filled from content/cases.json (tools/casepage.py).
# Run from build_v3.py (shares rep, REPO, KFM, BUILD, THEME_BOOT, TUNER, CLICK).
import sys; sys.path.insert(0, f'{KFM}/tools'); from casepage import case_page
CS_ = json.load(open(f'{REPO}/content/cases.json', encoding='utf-8'))['cases']
def _local(o):   # Framer links -> assets/cases/<file> once tools/fetch-case-images.sh has downloaded them
    if isinstance(o, dict): return {k: _local(v) for k, v in o.items()}
    if isinstance(o, list): return [_local(v) for v in o]
    if isinstance(o, str) and o.startswith('https://framerusercontent.com/'):
        n = o.split('?')[0].rsplit('/', 1)[1]
        return f'assets/cases/{n}' if os.path.exists(f'{REPO}/assets/cases/{n}') else o
    return o
C_ = case_page(_local(CS_), KFM, True)
C_ = rep(C_, '<html lang="en" data-theme="light">', '<html lang="en">')
C_ = rep(C_, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + THEME_BOOT + TUNER)
C_ = rep(C_, '<div class="pv" role="group" aria-label="Version" id="pv"></div>\n', '')
C_ = rep(C_, "  buildPv();\n", '')
C_ = rep(C_, "  addEventListener('click', e => { if (e.target.closest('a, button, .si')) snd('pop'); });", '')
C_ = rep(C_, "  const snd = n => { if (window.Popkit) Popkit.play(n); };", "  const snd = n => { let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (_) {} if (on && window.Popkit) Popkit.play(n); };")
C_ = rep(C_, '__TOOLS__', json.dumps({'figma': 'assets/figma.svg', 'illustrator': 'assets/illustrator.svg'}))
C_ = rep(C_, '<a class="back" href="#" onclick="return false">', '<a class="back" href="projects.html?v=' + BUILD + '" id="back">')
C_ = rep(C_, '<!--__POPKIT__-->', '<script src="popkit.js"></script>\n' + CLICK.rstrip())
C_ = C_.replace('</body>', """<script>
  (function () { var K = window.KMCASE, a = document.getElementById('back'), n = document.getElementById('next');
    a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault();
      if (window.Tuner) Tuner.go({ from: +K.it.fq, to: 102, name: 'Projects', href: a.getAttribute('href') }); else location.href = a.getAttribute('href'); });
    n.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault();
      var href = (K.next.page || 'case.html') + '?v=""" + BUILD + """#' + K.next.slug;
      if (window.Tuner) Tuner.go({ from: +K.it.fq, to: +K.next.fq, name: K.next.title, href: href }); else location.href = href; });
  })();
</script>
</body>""", 1)
assert '__' not in C_.replace('__proto__', ''), re.findall(r'__[A-Z]+__', C_)
open(f'{REPO}/case.html', 'w', encoding='utf-8').write(C_)
# brand.html: brand case studies on the logo page
from brandpage import brand_page
B_ = brand_page(_local(CS_), KFM)
B_ = rep(B_, '<html lang="en" data-theme="light">', '<html lang="en">')
B_ = rep(B_, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + THEME_BOOT + TUNER)
B_ = rep(B_, '<div class="station">', '<div class="station" data-readout>')
B_ = rep(B_, '<button class="theme" type="button" id="theme">Dark</button>\n', '')
B_ = rep(B_, "  $('theme').addEventListener('click', () => { const d = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = d ? 'dark' : 'light'; $('theme').textContent = d ? 'Light' : 'Dark'; });\n", '')
B_ = rep(B_, '__TOOLS__', json.dumps({'figma': 'assets/figma.svg', 'illustrator': 'assets/illustrator.svg'}))
B_ = rep(B_, '<a class="back" href="#" onclick="return false" id="back">', '<a class="back" href="projects.html?v=' + BUILD + '" id="back">')
B_ = rep(B_, '<script>\n(function () {', '<script src="popkit.js"></script>\n' + CLICK + '<script>\n(function () {')
B_ = B_.replace('</body>', """<script>
  (function () { var K = window.KMCASE, a = document.getElementById('back'), n = document.getElementById('next');
    a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault();
      if (window.Tuner) Tuner.go({ from: +K.it.fq, to: 102, name: 'Projects', href: a.getAttribute('href') }); else location.href = a.getAttribute('href'); });
    n.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault();
      var href = (K.next.page || 'case.html') + '?v=""" + BUILD + """#' + K.next.slug;
      if (window.Tuner) Tuner.go({ from: +K.it.fq, to: +K.next.fq, name: K.next.title, href: href }); else location.href = href; });
  })();
</script>
</body>""", 1)
assert '__' not in B_.replace('__proto__', ''), re.findall(r'__[A-Z]+__', B_)
open(f'{REPO}/brand.html', 'w', encoding='utf-8').write(B_)
print('case ok')
