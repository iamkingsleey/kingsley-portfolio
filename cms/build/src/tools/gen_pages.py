# about, engineering and projects pages: the About template filled with content/about.json, engineering.json and projects.json
# (and the case studies from content/cases.json). Run from build.py; writes the filled templates into cms/build/.gen.
import json, ast
def _rows(name): return json.load(open(f'{REPO}/content/{name}.json', encoding='utf-8'))
def make(fq, nm, stmt, h2, sub, tag, CH, out, post=None):
    s = open(f'{KFM}/about-src.html', encoding='utf-8').read()
    def rep(a, b):
        nonlocal s
        assert s.count(a) == 1, (s.count(a), a[:70]); s = s.replace(a, b)
    def cut(a, b):
        nonlocal s
        i = s.index(a); j = s.index(b, i); s = s[:i] + s[j:]
    rep('<title>About</title>', f'<title>{nm}</title>')
    rep('<span class="fq">94.0</span><span class="nm">About</span>', f'<span class="fq">{fq}</span><span class="nm">{nm}</span>')
    i = s.index('<section class="stmt" id="s-stmt">'); j = s.index('</section>', i) + 10
    s = s[:i] + f'<section class="stmt" id="s-stmt"><span class="mono">{fq} · {nm}</span><p id="stmt">{stmt}</p></section>' + s[j:]
    i = s.index('<div class="shead" id="s-band">'); j = s.index('<section class="band"', i)
    s = s[:i] + f'<div class="shead" id="s-band"><div><h2>{h2}</h2><p>{sub}</p></div><span class="mono">{tag}</span></div>\n  ' + s[j:]
    cut('  <!-- 4 · mixing desk -->', '  <div class="foot">')                 # What I do, How I work, On air, Call in
    rep('<span class="mono">Kingsley M. · 94.0 About</span>', f'<span class="mono">Kingsley M. · {fq} {nm}</span>')
    cut('  // ---------- 4 · what I do:', '  // ---------- arrivals')
    i = s.index('  const CH = ['); j = s.index('  ];', i) + 4
    rows = ',\n'.join('    ' + repr(list(c)) for c in CH)
    s = s[:i] + '  const CH = [\n' + rows + '\n  ];' + s[j:]
    rep("const SECN = ['About', 'Band', 'Skills', 'On air'], secEls = ['s-band', 's-desk', 's-air'].map($);",
        f"const SECN = ['{nm}', '{h2 if len(h2) < 14 else tag}'], secEls = ['s-band'].map($);")
    rep("['#bcard', 24], ['.bruler', 9], ['#skills', 16], ['.onair', 10], ['.call', 6], ['.foot', 4]]", "['#bcard', 24], ['.bruler', 9], ['.foot', 4]]")
    if post: s = post(s, rep)
    open(out, 'w', encoding='utf-8').write(s)


# About: the chapters ("the band so far")
_ab = _rows('about')
_K = ['fq', 'where', 'role', 'what', 'stat', 'statLabel', 'years', 'stat2', 'stat2Label']
_s = open(f'{KFM}/about-src.html', encoding='utf-8').read()
_i = _s.index('  const CH = ['); _j = _s.index('  ];', _i) + 4
# the role line carries the role, how it was held (contract, full time) and where: "Brand Designer · Contract · Remote"
_ch = [[(' · '.join(x for x in [c.get('role', ''), c.get('type', ''), c.get('location', '')] if x) if k == 'role' else c.get(k, '')) for k in _K] for c in _ab['chapters'] if not c.get('hidden')]
for _r in _ch:
    while len(_r) > 7 and not _r[-1] and not _r[-2]: del _r[-2:]   # no second stat
_s = _s[:_i] + '  const CH = [   // [frequency, where, role, what, stat, stat label, years, second stat, its label]\n' + ',\n'.join('    ' + json.dumps(r, ensure_ascii=False) for r in _ch) + '\n  ];' + _s[_j:]
open(f'{GEN}/about-src.html', 'w', encoding='utf-8').write(_s)

# Engineering: the things I've built (a tool's link rides at 9 and its button text at 10)
_en = _rows('engineering')
# laid out as a workbench: a card per tool with a small live demo on top (cms/build/src/workbench.html)
def _bench(s, rep):
    tools = [t for t in _en['tools'] if not t.get('hidden')]
    i = s.index('<section class="band" id="band">'); j = s.index('</section>', i) + 10
    s = s[:i] + '<section class="band wbband" id="band" hidden><div class="bpin"><div class="bruler"><canvas id="brc"></canvas></div><div class="bcard" id="bcard"></div></div></section>\n  <section class="wb" id="wb" aria-label="' + _en['title'].replace('"', '&quot;') + '"></section>' + s[j:]
    wb = open(f'{KFM}/workbench.html', encoding='utf-8').read().replace('__TOOLS__', json.dumps(tools, ensure_ascii=False).replace('</', '<\\/'))
    # the statement is commented out for now (it stays in the CMS); an empty stand-in keeps the page's script happy
    i = s.index('<section class="stmt" id="s-stmt">'); j = s.index('</section>', i) + 10
    s = s[:i] + '<!-- ' + s[i:j].replace('--', '- -') + ' -->\n  <p id="stmt" hidden></p>\n  <style>main > #s-band { margin-top: 0; padding-top: 150px } @media (max-width: 899px) { main > #s-band { padding-top: 96px } }</style>' + s[j:]
    return s.replace('</body>', wb + '\n</body>', 1)
make('96.0', 'Engineering', _en['statement'], _en['title'], _en['sub'], _en['tag'],
     [[t.get(k, '') for k in ['fq', 'name', 'type', 'what', 'stat', 'statLabel', 'tech']] + ([ '', '', t['link'], t.get('linkLabel') or 'Open'] if t.get('link') else []) for t in _en['tools'] if not t.get('hidden')], f'{GEN}/engineering-src.html', post=_bench)

# Projects: the case studies
CASES_ = [c for c in json.load(open(f'{REPO}/content/cases.json', encoding='utf-8'))['cases'] if not c.get('hidden')]
def cases_card(s, rep):
    import re
    i = s.index('  bcard.innerHTML = CH.map('); j = s.index('\n', i)
    s = s[:i] + """  const thumb = m => typeof m === 'string' ? `<img src="${m}" alt="" loading="lazy" decoding="async">` : `<div class="gfx" style="background:${m.color}">${m.word}</div>`;
  bcard.innerHTML = CH.map(c => `<a class="ch cs" href="${c[9]}#${c[7]}" data-fq="${c[0]}" data-nm="${c[1]}"><div class="tx"><span class="cs-tag">Case study</span><span class="fqv">${c[0]} FM · ${c[6]}</span><h3>${c[1]}</h3><div class="role">${c[2]}</div><p>${c[3]}</p>${c[4] ? `<div class="stats"><div class="stat"><b>${c[4]}</b><span class="mono">${c[5]}</span></div></div>` : ''}<span class="more">Read the case study <i>→</i></span></div></a>`).join('');""" + s[j:]
    css = """.bcard .ch.cs { display: block; text-decoration: none; color: inherit }
.cs-tag { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 16px; font: 500 10.5px var(--mono); letter-spacing: .6px; text-transform: uppercase; color: var(--ink) }
.cs-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--red) }
.bcard .fqv { display: block }
.bcard .more { display: inline-flex; gap: 10px; margin-top: 28px; color: var(--ink); font-size: 14px; font-weight: 500 }
.bcard .more i { font-style: normal; transition: transform .4s var(--ease) }
.bcard .ch.cs:hover .more i { transform: translateX(6px) }
.bcard .th { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: var(--panel); clip-path: inset(12% 0 0 0); transition: clip-path 1s cubic-bezier(.16,1,.3,1) }
.bcard .th > img, .bcard .th > .gfx { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.12); transition: transform 1.4s cubic-bezier(.16,1,.3,1) }
.bcard .th > .gfx { display: grid; place-items: center; color: #fff; font-size: clamp(26px, 2.6vw, 40px); font-weight: 600; letter-spacing: -.04em }
.bcard .ch.on .th { clip-path: inset(0 0 0 0) } .bcard .ch.on .th > * { transform: scale(1) }
.bcard .ch.cs:hover .th > * { transform: scale(1.04) }
@media (max-width: 899px) { .bcard .ch.cs { grid-template-columns: 1fr; gap: 20px } .bcard .th { max-width: 220px; order: -1 } }
"""
    s = s.replace('</style>', css + '</style>', 1)
    s = s.replace("const SECN = ['Projects', 'Case studies']", "const SECN = ['Projects', 'Cases']")
    s = s.replace('.bcard { position: relative; min-height: 340px }', '.bcard { position: relative; min-height: 400px }')
    return s
_pr = _rows('projects')
make('102.0', 'Projects', _pr['statement'], _pr['title'], _pr['sub'], _pr['tag'], [
    [c['fq'], c['title'], c['role'], c['blurb'], c['stat'][0], c['stat'][1], (c['kind'] + ' · ' + c['tag']), c['slug'], c['cover'], c.get('page', 'case.html')] for c in CASES_
], f'{GEN}/projects-src.html', post=cases_card)
