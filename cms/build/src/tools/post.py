# The last step of the build (run from build.py):
#  1. lists every piece of text and every picture/video on each page, so the CMS can show them (cms/build/.index.json)
#  2. applies your edits from content/text.json and content/media.json
#  3. adds analytics (content/site.json) and the navigation (nav.js) to every page
import json, re, os, html as _html
PAGES = ['index.html', 'about.html', 'engineering.html', 'projects.html', 'designs.html', 'case.html', 'brand.html',
         'logo.html', 'product.html', 'project.html', 'showcase.html']
def _load(name, d):
    try: return json.load(open(f'{REPO}/content/{name}', encoding='utf-8'))
    except FileNotFoundError: return d
TEXT, MEDIA, SITE = _load('text.json', {}), _load('media.json', {}), _load('site.json', {})

# strings already edited through the structured editors (case studies, designs, about, engineering, projects) are left out of the page lists
_struct = set()
def _walk(o):
    if isinstance(o, dict): [_walk(v) for v in o.values()]
    elif isinstance(o, list): [_walk(v) for v in o]
    elif isinstance(o, str): _struct.add(o)
for _n in ['cases.json', 'designs.json', 'about.json', 'engineering.json', 'projects.json']: _walk(_load(_n, {}))

MED = re.compile(r'''(?:assets/|pv/|https://framerusercontent\.com/)[^"'()\s<>`]+?\.(?:jpe?g|png|webp|gif|svg|mp4|webm|mov|wav|mp3)(?:\?[^"'()\s<>`]*)?''', re.I)
CODE = re.compile(r'[{}<>;=\\|]|=>|://|^[#.(\[]|\.(?:html|js|css|json|jpe?g|png|svg|mp4)\b|var\(|\d(?:px|vh|vw|ms|s|deg|%)\b|rgb\(|^[A-Z_]+$|^[a-z]+[A-Z]')
CSSY = re.compile(r'\b(?:transform|opacity|ease(?:-out|-in)?|cubic-bezier|translate|scale|rotate|clip-path|monospace|sans-serif|serif|inherit|none|auto|solid|flex|grid|block|absolute|relative)\b')
KEYS = {'Escape', 'Enter', 'End', 'Tab', 'Untitled', 'Backspace', 'Space'}
raw_edge = lambda t: bool(re.match(r'^[\s,·:;.)(+-]|[\s,·:(+-]$', t))
def _prose(t, strict=False):
    t0 = t; t = t.strip()
    if len(t) < 2 or not re.search(r'[A-Za-z]', t) or CODE.search(t) or t in _struct: return False
    if strict:   # inside scripts: real sentences or labels only, not class names, keys or CSS
        if t0 != t0.strip() or raw_edge(t0) or t in KEYS or re.search(r'["/@]|^[a-z]{2}-[A-Z]{2}$|\w:\w|^\w+(?:, \w+)+$|^[a-z.]+$|rgba?\(', t): return False
        if re.fullmatch(r'[A-Z][a-z]+(?:[A-Z][a-z]+)+', t) and t not in ('LinkedIn', 'GitHub', 'ChatGPT', 'LineCraft', 'MeshCraft', 'ShareBuddy'): return False
        if CSSY.search(t) and not re.search(r'[A-Z]', t[:1]): return False
        if not (re.search(r'[A-Z]', t) or re.search(r"[.,:!?’'—–·]", t) or len(t.split()) >= 4): return False
        if re.fullmatch(r'[a-z0-9-]+(?: [a-z0-9-]+)*', t) and len(t.split()) < 4: return False
    return True
def _blocks(src):   # (kind, start, end): script and style bodies, and the page between them
    out, i = [], 0
    for m in re.finditer(r'<(script|style)\b[^>]*>(.*?)</\1>', src, re.S | re.I):
        out.append(('html', i, m.start())); out.append((m.group(1).lower(), m.start(2), m.end(2))); i = m.end()
    out.append(('html', i, len(src))); return out
def _js_strings(code):   # the string literals in a script, skipping comments
    out, i, n = [], 0, len(code)
    while i < n:
        c = code[i]
        if c == '/' and i + 1 < n and code[i + 1] == '/': i = code.find('\n', i); i = n if i < 0 else i; continue
        if c == '/' and i + 1 < n and code[i + 1] == '*': i = code.find('*/', i + 2); i = n if i < 0 else i + 2; continue
        if c in '\'"`':
            j, buf, tmpl = i + 1, [], False
            while j < n and code[j] != c:
                if code[j] == '\\': buf.append(code[j:j + 2]); j += 2; continue
                if c != '`' and code[j] == '\n': break
                if c == '`' and code.startswith('${', j):
                    tmpl = True; d = 1; j += 2
                    while j < n and d: d += (code[j] == '{') - (code[j] == '}'); j += 1
                    continue
                buf.append(code[j]); j += 1
            if not tmpl and j < n and code[j] == c: out.append((c, ''.join(buf)))
            i = j + 1; continue
        i += 1
    return out
def index_page(src):
    texts, seen = [], set()
    b0 = src.find('<body')
    for kind, a, b in _blocks(src):
        part = src[a:b]
        if kind == 'html':
            if b <= b0: continue
            part = re.sub(r'<!--.*?-->', ' ', part[max(0, b0 - a):] if a < b0 else part, flags=re.S)
            for m in re.finditer(r'>([^<>]+)<', part):
                raw = m.group(1).strip()
                if raw and raw not in seen and _prose(_html.unescape(raw)):
                    seen.add(raw); texts.append({'raw': raw, 'text': _html.unescape(raw), 'where': 'page'})
        elif kind == 'script':
            for q, raw in _js_strings(part):
                txt = raw.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
                if raw not in seen and len(txt) >= 3 and _prose(txt, True) and '<' not in raw:
                    seen.add(raw); texts.append({'raw': raw, 'text': txt, 'where': 'script'})
    media = sorted(set(m.group(0) for m in MED.finditer(src)) - _struct)
    return {'texts': texts, 'media': media}

def _js(v, q): v = v.replace('\\', '\\\\').replace(q, '\\' + q); return v.replace('${', '\\${') if q == '`' else v
def apply(page, src):
    for raw, new in {**TEXT.get('*', {}), **TEXT.get(page, {})}.items():
        if new is None or new == '': continue
        esc_html = _html.escape(new, quote=False)
        src = re.sub(r'(>\s*)' + re.escape(raw) + r'(\s*<)', lambda m: m.group(1) + esc_html + m.group(2), src)
        for q in "'\"`":
            src = src.replace(q + raw + q, q + _js(new, q) + q)
    for old, new in {**MEDIA.get('*', {}), **MEDIA.get(page, {})}.items():
        if new: src = src.replace(old, new)
    return src

GC = (SITE.get('analytics') or {}).get('goatcounter', '').strip()
GC = re.sub(r'^https?://|\.goatcounter\.com.*$', '', GC)
ANALYTICS = ('' if not GC else
  '<script>window.goatcounter = { path: function () { return location.pathname.replace(/\\/index\\.html$/, "/") + location.hash; } };\n'
  '  window.KMtrack = function (path, title) { try { window.goatcounter.count({ path: path, title: title, event: true }); } catch (_) {} };</script>\n'
  f'<script data-goatcounter="https://{GC}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n')

# the one navigation (cms/build/src/nav.js) on every page
import shutil as _sh
_sh.copy(f'{KFM}/nav.js', f'{REPO}/nav.js')
NAV = '<script src="nav.js" defer></script>\n'
# iteration 4: Home's intro status (home.js), Home ↔ Designs by scrolling (flow.js), tips for getting around (protips.js)
_sh.copy(f'{KFM}/home.js', f'{REPO}/home.js'); _sh.copy(f'{KFM}/flow.js', f'{REPO}/flow.js')
_cases = json.load(open(f'{REPO}/content/cases.json', encoding='utf-8')).get('cases', [])
_dsn = [p for p in json.load(open(f'{REPO}/content/designs.json', encoding='utf-8')).get('projects', []) if not p.get('hidden')]
_ncs = len(_cases) + sum(1 for p in _dsn if p.get('caseStudy'))
_hint = f"{len(_dsn) + len(_cases)} pieces · {_ncs} case stud{'y' if _ncs == 1 else 'ies'}"
open(f'{REPO}/protips.js', 'w', encoding='utf-8').write(open(f'{KFM}/protips.js', encoding='utf-8').read().replace('__DESIGNS_HINT__', _hint))
_site = json.load(open(f'{REPO}/content/site.json', encoding='utf-8'))
SITEJS = '<script>window.KM_SITE = ' + json.dumps({'available': _site.get('available', True) is not False}) + ';</script>\n'   # settings the pages read (CMS → Settings)
# arriving by scroll: Designs settles up into place (its grid only fades: moving it would throw its drum out of line); Home only fades
FLOWHEAD = ('<script>(function(){var on=function(){try{var f=JSON.parse(sessionStorage.getItem("km-flow")||"null");sessionStorage.removeItem("km-flow");'
  'if(f&&Date.now()-f.t<6000)document.documentElement.classList.add(f.d>0?"flow-up":"flow-down")}catch(e){}};'
  'if(document.prerendering)document.addEventListener("prerenderingchange",on,{once:true});else on()})()</script>'
  '<style>html.flow-up body>*:not(.kmn-scale):not(.ov):not([class^="pt-"]),html.flow-down body>*:not(.kmn-scale):not([class^="pt-"]){animation:flin .45s cubic-bezier(.2,.8,.2,1) both}html.flow-down body>*:not(.kmn-scale):not([class^="pt-"]){animation-name:flfade}'   # the tips and the recruiter card are left out: they stay hidden until asked for
  'html.flow-up .ov{animation:flfade .45s cubic-bezier(.2,.8,.2,1) both}@keyframes flfade{from{opacity:.15}}'
  'html.flow-up{--fl:36px}@keyframes flin{from{translate:0 var(--fl);opacity:.15}}</style>')
# Home: the design pieces, blurred, floating behind the intro (cms/build/src/homebg.js; pictures from content/designs.json)
_sh.copy(f'{KFM}/homebg.js', f'{REPO}/homebg.js')
_dz = [p for p in json.load(open(f'{REPO}/content/designs.json', encoding='utf-8')).get('projects', []) if not p.get('hidden')]
_bg = []
for _d in _dz:
    _im = next((m for m in _d.get('images', []) if isinstance(m, dict) and m.get('src') and not m.get('video')), None)
    if _im:
        _t = _im['src'].replace('assets/designs/', 'assets/designs/thumbs/', 1)   # the trail is small and blurred: the thumbnail is plenty
        _bg.append({'src': _t if _t != _im['src'] and os.path.exists(f'{REPO}/{_t}') else _im['src'], 'ratio': _im.get('ratio', 1)})
HOMEBG = '<script>window.KM_HOMEBG = ' + json.dumps(_bg[:12]) + ';</script>\n<script src="homebg.js" defer></script>\n'
INDEX = {}
for _p in PAGES:
    _f = f'{REPO}/{_p}'
    if not os.path.exists(_f): continue
    _s = open(_f, encoding='utf-8').read()
    INDEX[_p] = index_page(_s)
    _s = apply(_p, _s)
    if ANALYTICS and '</head>' in _s: _s = _s.replace('</head>', ANALYTICS + '</head>', 1)
    if 'src="nav.js"' not in _s: _s = _s.replace('</body>', NAV + '</body>', 1)
    if _p == 'index.html' and 'src="homebg.js"' not in _s: _s = _s.replace('</body>', HOMEBG + '</body>', 1)
    if 'window.KM_SITE = ' not in _s: _s = _s.replace('<head>', '<head>\n' + SITEJS, 1)
    if 'src="protips.js"' not in _s: _s = _s.replace('</body>', '<script src="protips.js" defer></script>\n</body>', 1)
    if _p == 'index.html' and 'src="home.js"' not in _s: _s = _s.replace('</body>', '<script src="home.js" defer></script>\n</body>', 1)
    if _p in ('index.html', 'designs.html') and 'src="flow.js"' not in _s:
        _s = _s.replace('</head>', FLOWHEAD + '\n</head>', 1).replace('</body>', '<script src="flow.js" defer></script>\n</body>', 1)
    open(_f, 'w', encoding='utf-8').write(_s)
json.dump(INDEX, open(f'{HERE}/.index.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('post ok', sum(len(v['texts']) for v in INDEX.values()), 'texts,', sum(len(v['media']) for v in INDEX.values()), 'media')
