# Run from build_v3.py (shares its names: rep, A, KFM, REPO, BUILD, THEME_BOOT, TUNER, CLICK, TOOLS).
# Builds the template pages a project can use instead of the default project page:
#   logo.html     layout "logo"
#   product.html  layouts "product-panels" and "product-story"
#   showcase.html layouts "illustration" and "3d" (both use the board / loupe / colours / contact sheet for now)
# Which piece a page shows comes from the address (logo.html#badge), so one file serves every project
# with that layout. The layout itself is set per project in content/designs.json (the CMS).

# which piece, and its neighbours on the dial (same order and stations as the project page)
KM = """<script>
  // Which piece this page shows (logo.html#badge) and its neighbours on the dial. Same order as project.html.
  (function () {
    var A = __ITEMS__, CAT = { '3d': '3D', illustration: 'Illustration', poster: 'Poster', brand: 'Brand', motion: 'Motion', product: 'Product', ui: 'UI' }, all = [];
    ['3d', 'illustration', 'poster', 'product', 'brand', 'motion', 'ui'].forEach(function (k) { (A[k] || []).forEach(function (it) { all.push(Object.assign({}, it, { src: it.src || it.poster, cat: CAT[k] })); }); });
    var slug = function (t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
    var h = decodeURIComponent(location.hash.slice(1)), file = location.pathname.split('/').pop() || 'index.html';
    var i = all.findIndex(function (x) { return slug(x.t) === h; });
    if (i < 0) i = Math.max(0, all.findIndex(function (x) { return x.page && x.page.split('#')[0] === file; }));
    window.KM = { all: all, cur: i, it: all[i], next: all[(i + 1) % all.length], ruler: all.find(function (x) { return x.video; }) || all[0], slug: slug,
      FQ: function (j) { return +(100 + (j + 1) / 10).toFixed(1); } };
  })();
</script>
""".replace('__ITEMS__', json.dumps(A, ensure_ascii=False))

# readout, back to Designs and next on the dial, all through the tuner
NAV = """<script>
(function () {
  var K = window.KM, it = K.it, nx = K.next, nj = (K.cur + 1) % K.all.length, q = function (s, r) { return (r || document).querySelector(s); };
  var go = function (to, name, href) { if (window.Tuner) Tuner.go({ from: K.FQ(K.cur), to: to, name: name, href: href }); else location.href = href; };
  document.title = it.t + ' · Kingsley M.';
  var st = q('.station'); st.setAttribute('data-readout', '');
  q('.fq', st).textContent = K.FQ(K.cur).toFixed(1); q('.nm', st).textContent = it.t;
  var back = q('.back', st); back.removeAttribute('onclick'); back.href = '__BACK__';
  back.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(100, 'Designs', back.href); });
  var n = q('.next');
  if (n) {
    n.removeAttribute('onclick'); n.href = nx.page || ('project.html#' + K.slug(nx.t));
    var lab = q('.fq, .mono', n); if (lab) lab.textContent = 'Next on the dial · ' + K.FQ(nj).toFixed(1) + ' · ' + nx.cat;
    var tt = q('h5, b', n); if (tt) tt.innerHTML = nx.t + ' <i>→</i>';
    var im = q('img', n); if (im) { im.removeAttribute('data-img'); im.src = nx.src || nx.poster; im.alt = nx.t; }
    n.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(K.FQ(nj), nx.t, n.href); });
  }
  try { sessionStorage.setItem('km-return', it.t); } catch (_) {}   // Designs reopens on this piece
  addEventListener('hashchange', function () { location.reload(); });   // next piece with the same layout: same file, new address
})();
</script>
"""
NAV = NAV.replace('__BACK__', 'designs.html?v=' + BUILD)
HEAD = THEME_BOOT + TUNER + KM
POP = '<script src="popkit.js"></script>\n' + CLICK
SND = "const snd = n => { let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (_) {} if (on && window.Popkit) Popkit.play(n); };   // Home's sound switch"
TITLE_FROM_CMS = ("ttl.innerHTML = ttl.textContent.split(' ')", "ttl.innerHTML = window.KM.it.t.split(' ')")

def finish(h):
    h = h.replace('</body>', NAV + '</body>', 1)
    assert '__' not in h.replace('__proto__', ''), re.findall(r'__[A-Z]+__', h)
    return h

# ---------------------------------------------------------------- logo.html
L = open(f'{KFM}/logo-src.html', encoding='utf-8').read()
L = rep(L, '<html lang="en" data-theme="dark">', '<html lang="en">')
L = rep(L, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + HEAD)
L = rep(L, '<title>Logo Case Study</title>', '<title>Logo design · Kingsley M.</title>')
L = rep(L, '<button class="theme" type="button" id="theme">Light</button>\n', '')
L = rep(L, "  $('theme').addEventListener('click', () => { const d = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = d ? 'dark' : 'light'; $('theme').textContent = d ? 'Light' : 'Dark'; });\n", '')
L = rep(L, "  const IMGS = __IMGS__;          // stand-in photos (your brand pieces)",
        "  // pictures: this piece first, then the other brand pieces as stand-ins; slot 7 is the video's still\n"
        "  const IMGS = (() => { const K = window.KM, l = [K.it.src, ...K.all.filter(x => x.cat === 'Brand' && x !== K.it).map(x => x.src)];\n"
        "    for (let j = 0; l.length < 7; j++) l.push(K.all[j % K.all.length].src); l.length = 7; l.push(K.ruler.poster || K.ruler.src); return l; })();")
L = rep(L, "  const VIDEO = __VIDEO__;        // stand-in video (the ruler picker loop)", "  const VIDEO = window.KM.ruler.video;   // stand-in video (the ruler picker loop)")
L = rep(L, "  const TOOL_SRC = __TOOLS__;", "  const TOOL_SRC = " + json.dumps(TOOLS) + ";")
L = rep(L, *TITLE_FROM_CMS)
L = rep(L, '<script>\n(function () {', POP + '<script>\n(function () {')
open(f'{REPO}/logo.html', 'w', encoding='utf-8').write(finish(L))

# ---------------------------------------------------------------- product.html
srcp = open(f'{KFM}/product-src.html', encoding='utf-8').read().split('\n')
P = open(f'{KFM}/simple-src.html', encoding='utf-8').read()
P = P.replace('/*__BASECSS__*/', '\n'.join(srcp[16:103])).replace('//__SCREENS__', '\n'.join(srcp[398:421]))
P = rep(P, '<html lang="en" data-theme="light">', '<html lang="en">')
P = rep(P, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + HEAD)
P = rep(P, '<title>Product Showcase</title>', '<title>Product design · Kingsley M.</title>')
P = rep(P, '<div class="pv" role="group" aria-label="Version" id="pv"></div>\n', '')
P = rep(P, "  const VIDEO = __VIDEO__, POSTER = __POSTER__, TOOL_SRC = __TOOLS__;",
        "  const KI = window.KM.it, KR = KI.video ? KI : window.KM.ruler;   // this piece's video, else the ruler picker's\n"
        "  const VIDEO = KR.video, POSTER = KR.poster || KR.src, TOOL_SRC = " + json.dumps(TOOLS) + ";")
P = rep(P, "  const snd = n => { if (window.Popkit) Popkit.play(n); };", "  " + SND)
P = rep(P, "  const V = 'panels';   // chosen: Panels. The other versions stay in the code, switched off (set V to try one)",
        "  // the CMS picks the version: product-panels (default) or product-story\n  const V = KI.layout === 'product-story' ? 'story' : 'panels';")
P = rep(P, "  buildPv();\n", '')
P = rep(P, "  addEventListener('click', e => { if (e.target.closest('a, button, .si')) snd('pop'); });", "  addEventListener('click', e => { if (e.target.closest('.si')) snd('pop'); });   // links and buttons get the site-wide pop")
P = rep(P, *TITLE_FROM_CMS)
P = rep(P, '<!--__POPKIT__-->', POP.rstrip())
open(f'{REPO}/product.html', 'w', encoding='utf-8').write(finish(P))

# ---------------------------------------------------------------- showcase.html (illustration, 3d)
S = open(f'{KFM}/showcase-src.html', encoding='utf-8').read()
S = rep(S, '<html lang="en" data-theme="light">', '<html lang="en">')
S = rep(S, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + HEAD)
S = rep(S, '<title>Showcase Pages</title>', '<title>Showcase · Kingsley M.</title>')
S = rep(S, '<div class="pv" role="group" aria-label="Version" id="pv"></div>\n', '')
S = rep(S, "  const PICS = __PICS__;   // { t, src, r } stand-ins: 3D renders and brand pieces",
        "  // the set: this piece first, then pieces from the same category, then the rest (stand-ins until the project has its own set)\n"
        "  const PICS = (() => { const K = window.KM, it = K.it, same = K.all.filter(x => x !== it && x.cat === it.cat), rest = K.all.filter(x => x !== it && x.cat !== it.cat);\n"
        "    return [it, ...same, ...rest].map(x => ({ t: x.t, src: x.src, r: x.r || .8 })); })();")
S = rep(S, "  const snd = n => { if (window.Popkit) Popkit.play(n); };", "  " + SND)
S = rep(S, "  const MODE = location.hash === '#illustration' ? 'ill' : '3d';", "  const MODE = 'ill';   // layouts \"illustration\" and \"3d\" both use the board for now (the 3D dial version stays in the code)")
S = rep(S, "    const P = PICS.slice().reverse();", "    const P = PICS;")
S = rep(S, "CRED('Personal, ongoing', 'Illustrations<br>Colour studies')", "CRED('Personal, ongoing', window.KM.it.layout === '3d' ? '3D models<br>Lighting and materials<br>Final renders' : 'Illustrations<br>Colour studies')")
S = rep(S, "  buildPv();\n", '')
S = rep(S, "  addEventListener('click', e => { if (e.target.closest('a, button')) snd('pop'); });\n", '')
S = rep(S, "ttl.innerHTML = words(ttl.textContent);", "ttl.innerHTML = words(window.KM.it.t);")
S = rep(S, '<!--__POPKIT__-->', POP.rstrip())
open(f'{REPO}/showcase.html', 'w', encoding='utf-8').write(finish(S))
print('layouts ok')
