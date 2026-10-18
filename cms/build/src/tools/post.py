# The last step of the build (run from build.py):
#  1. lists every piece of text and every picture/video on each page, so the CMS can show them (cms/build/.index.json)
#  2. applies your edits from content/text.json and content/media.json
#  3. adds analytics (content/site.json) to every page
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

INDEX = {}
for _p in PAGES:
    _f = f'{REPO}/{_p}'
    if not os.path.exists(_f): continue
    _s = open(_f, encoding='utf-8').read()
    INDEX[_p] = index_page(_s)
    _s = apply(_p, _s)
    if ANALYTICS and '</head>' in _s: _s = _s.replace('</head>', ANALYTICS + '</head>', 1)
    open(_f, 'w', encoding='utf-8').write(_s)
json.dump(INDEX, open(f'{HERE}/.index.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('post ok', sum(len(v['texts']) for v in INDEX.values()), 'texts,', sum(len(v['media']) for v in INDEX.values()), 'media')
