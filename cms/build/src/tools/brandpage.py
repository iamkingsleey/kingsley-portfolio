# The brand case study page: the logo page (logo-src.html: sideways opening, facts and story, construction,
# colour as frequencies, type, applications, statement, next) filled from content/cases.json.
import json

def brand_page(CASES, KFM):
    L = open(f'{KFM}/logo-src.html', encoding='utf-8').read()
    def rep(a, b):
        nonlocal L
        assert L.count(a) == 1, (L.count(a), a[:90]); L = L.replace(a, b)
    def cut(a, b, new=''):
        nonlocal L
        i = L.index(a); j = L.index(b, i) + len(b); L = L[:i] + new + L[j:]

    rep('<html lang="en" data-theme="dark">', '<html lang="en" data-theme="light">')
    rep('<title>Logo Case Study</title>', '<title>Brand case study</title>')
    rep('<button class="theme" type="button" id="theme">Light</button>', '<button class="theme" type="button" id="theme">Dark</button>')
    rep('</style>', """
/* ---------- brand case study additions ---------- */
[hidden] { display: none !important }
.slot > img { position: absolute; top: 0; left: -60px; width: calc(100% + 120px); max-width: none; height: 100%; object-fit: cover; will-change: transform }
.intro .cat { display: flex; gap: 10px; align-items: center }
.cs-tag { display: inline-flex; align-items: center; gap: 7px; color: var(--ink) }
.cs-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--red) }
.story .brief { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line) }
.story .brief h3 { margin: 0 0 8px }
.story .brief p { margin: 0; font-size: 14px }
.build.pic { aspect-ratio: 3 / 2 } .build.pic > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }
.build.pic { clip-path: inset(100% 0 0 0); transition: clip-path 1.2s cubic-bezier(.16,1,.3,1) } .build.pic.in { clip-path: inset(0 0 0 0) }
.full { aspect-ratio: 3 / 2 }
.todo { color: var(--muted); font-style: italic; font-weight: 400 }
@media (max-width: 899px) { .story .brief { grid-template-columns: 1fr } }
</style>""")
    # station, opening
    rep('<b>100.0</b> Designs</a><span class="fq">21</span><span class="nm">Nova · Logo design</span>',
        '<b>102.0</b> Projects</a><span class="fq" id="sfq">98.0</span><span class="nm" id="snm">Brand</span>')
    rep('<a class="back" href="#" onclick="return false">', '<a class="back" href="#" onclick="return false" id="back">')
    rep('<span class="cat mono">Logo design · Placeholder brand</span>', '<span class="cat"><span class="cs-tag mono">Case study</span><span class="mono" id="icat"></span></span>')
    rep('<div class="tt"><h1 id="ttl">Nova</h1><p>A mark for a radio-first music app: a dial, a band of signal running through it, and a notch where the needle lands. Built to work at 16 pixels and on a billboard.</p></div>',
        '<div class="tt"><h1 id="ttl"></h1><p id="blurb"></p></div>')
    # title, facts and story
    rep('<header class="title rv"><h2>Tuning a brand<br>into one mark</h2><span class="mono">21 / 24</span></header>', '<header class="title rv"><h2 id="h2"></h2><span class="mono" id="cnt"></span></header>')
    i = L.index('    <dl class="facts">'); j = L.index('    </div>\n  </section>', L.index('<div class="story rv">', i)) + 10
    L = L[:i] + '    <dl class="facts" id="facts"></dl>\n    <div class="story rv" id="story"></div>' + L[j:]
    # construction: the logo itself
    rep('<div class="shead rv"><h4>Construction</h4><span class="mono">Drawn on a 12-unit grid</span></div>', '<div class="shead rv"><h4>The mark</h4><span class="mono" id="markcap"></span></div>')
    rep('<figure class="build" id="build"><svg viewBox="0 0 1600 900" id="buildSvg" aria-label="How the mark is built"></svg></figure>', '<figure class="build pic" id="build"></figure>')
    rep('<span class="mono">Each colour has a station</span>', '<span class="mono" id="palcap">Each colour has a station</span>')
    rep('<div class="shead rv"><h4>Typeface</h4><span class="mono">Geist · Geist Mono</span></div>', '<div class="shead rv"><h4>Typeface</h4><span class="mono" id="typecap"></span></div>')
    i = L.index('  <section class="type">'); j = L.index('</section>', i) + 10
    L = L[:i] + '  <section class="type" id="typebox"></section>' + L[j:]
    rep('<div class="shead rv"><h4>Applications</h4><span class="mono">Stand-ins from your brand pieces</span></div>', '<div class="shead rv"><h4>Applications</h4><span class="mono">In use</span></div>')
    i = L.index('  <section class="seq">'); j = L.index('</section>', i) + 10
    L = L[:i] + '  <section class="seq" id="seq"></section>' + L[j:]
    i = L.index('  <section class="statement rv">'); j = L.index('</a>', i) + 4
    L = L[:i] + '  <section class="statement rv"><span class="mono" id="stl"></span><p id="stp"></p></section>\n  <a class="next rv" href="#" id="next"><span class="mono" id="nfq"></span><span class="r"><h5 id="nnm"></h5><span class="th" id="nth"></span></span></a>' + L[j:]

    # the script: the data, which case study, and filling the page
    rep("""  const IMGS = __IMGS__;          // stand-in photos (your brand pieces)
  const VIDEO = __VIDEO__;        // stand-in video (the ruler picker loop)
  const TOOL_SRC = __TOOLS__;
  const $ = id => document.getElementById(id);""", """  const CASES = __CASES__, TOOL_SRC = __TOOLS__;
  const $ = id => document.getElementById(id);
  let CI = CASES.findIndex(c => c.slug === decodeURIComponent(location.hash.slice(1)).split('/')[0]); if (CI < 0) CI = CASES.findIndex(c => c.kind === 'Brand');
  const CS = CASES[CI], NX = CASES[(CI + 1) % CASES.length], SH = CS.shots;
  window.KMCASE = { all: CASES, cur: CI, it: CS, next: NX };
  const esc = s => String(s).replace(/&(?!#?\\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/&lt;br>/g, '<br>');
  const R = m => m;   // the preview swaps this to look up its stand-in pictures
  const img = (m, alt = CS.title) => typeof m === 'string' ? `<img src="${R(m)}" alt="${esc(alt)}">` : `<img src="${R(m.poster || '')}" alt="${esc(alt)}">`;
  const pad = n => String(n).padStart(2, '0');
  document.title = CS.title + ' · Brand case study';
  $('sfq').textContent = CS.fq; $('snm').textContent = CS.title;
  $('icat').textContent = 'Brand identity · ' + CS.client;
  $('ttl').textContent = CS.title; $('blurb').textContent = CS.blurb;
  $('h2').innerHTML = CS.headline; $('cnt').textContent = 'Case study · ' + pad(CI + 1) + ' / ' + pad(CASES.length);
  const yr = /^\\d/.test(CS.year) ? esc(CS.year) : '<span class="todo">Year</span>';
  $('facts').innerHTML = `<div class="fact"><dt class="mono">Category</dt><dd><span class="chips"><span class="chip cat">Brand identity</span></span></dd></div>
    <div class="fact"><dt class="mono">Industry</dt><dd><span class="chips">${CS.industry.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span></dd></div>
    <div class="fact"><dt class="mono">Client · Year</dt><dd>${esc(CS.client)} · ${yr}</dd></div>
    <div class="fact"><dt class="mono">What I did</dt><dd><span class="chips">${CS.did.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span></dd></div>
    <div class="fact"><dt class="mono">Tools</dt><dd><span class="tools" id="tools"></span></dd></div>`;
  $('story').innerHTML = `<h3>${esc(CS.story[0])}</h3>${CS.story[1].map(p => `<p>${esc(p)}</p>`).join('')}
    ${CS.problem ? `<div class="brief"><div><h3>Problem</h3><p>${esc(CS.problem)}</p></div><div><h3>Goal</h3><p>${esc(CS.goal)}</p></div></div>` : ''}`;
  // the mark: the logo picture (shots[1]); applications: one wide, then the tall pair
  $('build').innerHTML = img(SH[1][0], 'The ' + CS.title + ' mark'); $('markcap').textContent = SH[1][3] || '';
  $('seq').innerHTML = `<figure class="panel full reveal"><div class="plab mono"><span>${esc(SH[4][1])}</span><span>06</span></div>${img(SH[4][0])}</figure>
    <div class="two"><figure class="panel reveal"><div class="plab mono"><span>${esc(SH[2][1])}</span><span>07</span></div>${img(SH[2][0])}</figure><figure class="panel reveal"><div class="plab mono"><span>${esc(SH[3][1])}</span><span>08</span></div>${img(SH[3][0])}</figure></div>`;
  $('stl').textContent = 'Brand identity · ' + CS.title; $('stp').textContent = CS.statement;
  $('nfq').textContent = 'Next case study · ' + NX.fq + ' · ' + NX.kind; $('nnm').innerHTML = esc(NX.title) + ' →'; $('nth').innerHTML = img(NX.cover, NX.title);
  $('next').href = (NX.page || 'case.html') + '#' + NX.slug;
  // typeface: the brand's own faces, shown in that face when it is on Google Fonts
  const TY = CS.type || [['Primary', 'Geist']], GF = ['Bricolage Grotesque', 'Epilogue', 'Geist', 'Inter', 'Fraunces', 'Playfair Display', 'DM Serif Display'];
  TY.forEach(([, f]) => { if (GF.includes(f) && f !== 'Geist') { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;500;600&display=swap'; document.head.appendChild(l); } });
  const fam = f => GF.includes(f) ? `"${f}", var(--body)` : (/serif/i.test(f) ? 'Georgia, "Times New Roman", serif' : 'var(--body)');
  $('typecap').textContent = TY.map(([r, f]) => r + ' · ' + f).join(' · ');
  $('typebox').innerHTML = `<div class="aa" style="font-family:${fam(TY[0][1])}">Aa</div>
    <div class="meta">${TY.map(([r, f]) => `<span class="mono">${esc(r)} · ${esc(f)}</span><div class="glyphs" style="font-family:${fam(f)}">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div>`).join('')}
      <div class="weights" style="font-family:${fam(TY[0][1])}"><span style="font-weight:400">Regular 400</span><span style="font-weight:500">Medium 500</span><span style="font-weight:600">Semibold 600</span></div></div>`;""")
    # no sample mark: drop markSVG and its uses
    i = L.index("  // ---------- the sample mark: dial + signal band + notch ----------"); j = L.index("  $('tools').innerHTML", i)
    L = L[:i] + L[j:]
    rep("  $('tools').innerHTML = ['illustrator', 'figma', 'blender'].map(", "  $('tools').innerHTML = ['illustrator', 'figma'].map(")
    # the opening run: the case study's pictures; each fitted to the part of its slot that shows
    i = L.index("  const COLS = ["); j = L.index("  ];", i) + 4
    L = L[:i] + """  const SPL = [[.46, .46], [.62, .30], [.28, .76], [.72, .22]], RR = CS.run.slice(0, 8), COLS = [];
  for (let k = 0; k < RR.length; k += 2) COLS.push({ split: SPL[COLS.length % 4], top: RR[k], bot: RR[k + 1] || RR[0] });""" + L[j:]
    i = L.index("  const gfx = (g, bg) => {"); j = L.index("  };", L.index("  const slotHTML = (s, n) => {")) + 4
    L = L[:i] + """  const slotHTML = (m, n) => `<figure class="slot" style="margin:0">${img(m)}<div class="lab mono"><span>${esc(CS.title)}</span><span>${pad(n)} · image</span></div></figure>`;""" + L[j:]
    rep("const cx = x + el.offsetLeft + colW / 2 - W / 2, px = (-cx * .06).toFixed(1);", "const cx = x + el.offsetLeft + colW / 2 - W / 2, px = Math.max(-48, Math.min(48, -cx * .06)).toFixed(1);")
    rep("t.firstElementChild.style.transform = `translate3d(${px}px,${(-(colH - cut) * .42).toFixed(1)}px,0) scale(1.16)`;",
        "{ const ti = t.firstElementChild; ti.style.height = cut.toFixed(1) + 'px'; ti.style.transform = `translate3d(${px}px,0,0)`; }")
    rep("bo.firstElementChild.style.transform = `translate3d(${px}px,${(cut * .42).toFixed(1)}px,0) scale(1.16)`;",
        "{ const bi = bo.firstElementChild; bi.style.top = cut.toFixed(1) + 'px'; bi.style.height = (colH - cut).toFixed(1) + 'px'; bi.style.transform = `translate3d(${px}px,0,0)`; }")
    # no construction drawing
    i = L.index("  // ---------- 3 · construction drawing ----------"); j = L.index("  // ---------- 4 · palette as frequencies ----------", i)
    L = L[:i] + L[j:]
    # palette: the brand's colours (CMS "colors": [name, hex]); until then, sampled from its pictures
    i = L.index("  const PAL = ["); j = L.index("\n", L.index("$('freqs').innerHTML", i)) + 1
    L = L[:i] + """  const FQS = ['88.1', '91.4', '96.7', '104.3'];
  const swatches = P => { $('freqs').innerHTML = P.slice(0, 4).map(([n, h], k) => { const rgb = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), lum = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000, c = lum > 150 ? '#0e0e10' : '#fff';
    return `<div class="fq-sw" style="background:${h};color:${c}"><span style="display:flex;justify-content:space-between"><span>${FQS[k]} FM</span><span>${pad(k + 1)}</span></span><span><span class="big">${esc(n)}</span><br>${h.toUpperCase()} · RGB ${rgb.join(' ')}</span></div>`; }).join(''); };
  if (CS.colors && CS.colors.length) swatches(CS.colors);
  else {
    const named = ((CS.sections.find(s => s.chips) || {}).chips || []).filter(n => !(CS.type || []).some(t => t[1] === n));
    $('palcap').textContent = named.length ? 'Brand colours: ' + named.join(', ') + ' · swatches sampled for now' : 'Sampled from the pictures for now';
    const names = [];   // sampled colours get numbers, not names, until the real ones are in the CMS
    const srcs = [SH[1][0], SH[0][0], SH[4][0], SH[2][0]].map(m => R(typeof m === 'string' ? m : m.poster || ''));
    const bins = new Map(); let left = srcs.length;
    const done = () => { const top = [...bins.values()].sort((a, b) => b[0] - a[0]), out = [];
      for (const e of top) { const c = [e[1] / e[0], e[2] / e[0], e[3] / e[0]]; if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 60)) out.push(c); if (out.length === 4) break; }
      while (out.length < 4) out.push([240, 240, 240]);
      swatches(out.map((c, k) => [names[k] || 'Colour ' + pad(k + 1), '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')])); };
    srcs.forEach(src => { const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => { try { const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 32, 32); const d = x.getImageData(0, 0, 32, 32).data;
        for (let k = 0; k < d.length; k += 4) { const key = (d[k] >> 5) << 6 | (d[k + 1] >> 5) << 3 | (d[k + 2] >> 5), e = bins.get(key) || [0, 0, 0, 0]; e[0]++; e[1] += d[k]; e[2] += d[k + 1]; e[3] += d[k + 2]; bins.set(key, e); } } catch (_) {} if (!--left) done(); };
      im.onerror = () => { if (!--left) done(); }; im.src = src; });
  }
""" + L[j:]
    # section dial: no construction section id change needed (build is still #build)
    rep("  const SECN = ['01', '02', '03', '04', 'Story', 'Build', 'Colour', 'Type', 'Use', 'Next'];", "  const SECN = ['01', '02', '03', '04', 'Story', 'Mark', 'Colour', 'Type', 'Use', 'Next'];")
    rep("document.querySelectorAll('.rv, .reveal, .build')", "document.querySelectorAll('.rv, .reveal, .build')")
    rep("  addEventListener('resize', sizeRun);", "  addEventListener('resize', sizeRun);\n  addEventListener('hashchange', () => location.reload());")
    # versions (tools/brandvar): mark, colour and type can each be swapped; applications stay the sequence
    rep('</style>', open(f'{KFM}/tools/brandvar/var.css').read() + open(f'{KFM}/tools/brandvar/info.css').read() + '</style>')
    rep("  if (CS.colors && CS.colors.length) swatches(CS.colors);", open(f'{KFM}/tools/brandvar/var.js').read() + open(f'{KFM}/tools/brandvar/type.js').read() + open(f'{KFM}/tools/brandvar/info.js').read() + "\n  const onPal = P => { VV.col === 'dial' ? colourDial(P) : swatches(P); };\n  if (CS.colors && CS.colors.length) onPal(CS.colors);")
    rep("      swatches(out.map((c, k) =>", "      onPal(out.map((c, k) =>")
    L = L.replace('__CASES__', json.dumps(CASES, ensure_ascii=False))
    return L
