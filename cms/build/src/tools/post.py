# The last step of the build (run from build.py):
#  1. lists every piece of text and every picture/video on each page, so the CMS can show them (cms/build/.index.json)
#  2. applies your edits from content/text.json and content/media.json
#  3. adds analytics (content/site.json) and the navigation (nav.js) to every page
import json, re, os, html as _html
PAGES = ['index.html', 'shop.html', 'about.html', 'engineering.html', 'projects.html', 'designs.html', 'case.html', 'brand.html',
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
_sh.copy(f'{KFM}/kit.js', f'{REPO}/kit.js'); _sh.copy(f'{KFM}/feedback.js', f'{REPO}/feedback.js'); _sh.copy(f'{KFM}/home.js', f'{REPO}/home.js'); _sh.copy(f'{KFM}/flow.js', f'{REPO}/flow.js')
_cases = json.load(open(f'{REPO}/content/cases.json', encoding='utf-8')).get('cases', [])
_dsn = [p for p in json.load(open(f'{REPO}/content/designs.json', encoding='utf-8')).get('projects', []) if not p.get('hidden')]
_ncs = len(_cases) + sum(1 for p in _dsn if p.get('caseStudy'))
_hint = f"{len(_dsn) + len(_cases)} pieces · {_ncs} case stud{'y' if _ncs == 1 else 'ies'}"
open(f'{REPO}/protips.js', 'w', encoding='utf-8').write(open(f'{KFM}/protips.js', encoding='utf-8').read().replace('__DESIGNS_HINT__', _hint))
_site = json.load(open(f'{REPO}/content/site.json', encoding='utf-8'))
# Accent colour (CMS → Settings → Accent colour): the site's orange-red, #ff4a1c, is written straight into the page and
# script sources. Every build starts from those sources, so swapping the literal here recolours the whole site, and
# going back to the default restores it.
ACCENT = str(_site.get('accent') or '#ff4a1c').strip().lower()
if not re.fullmatch(r'#[0-9a-f]{6}', ACCENT): ACCENT = '#ff4a1c'
def _acc(s): return re.sub(r'#ff4a1c', ACCENT, s, flags=re.I) if ACCENT != '#ff4a1c' else s
_sh.copy(f'{KFM}/tuner.js', f'{REPO}/tuner.js')   # the page-to-page transition (its source now lives with the others)
for _js in ('nav', 'kit', 'feedback', 'home', 'flow', 'protips', 'tuner'):
    _jf = f'{REPO}/{_js}.js'
    if os.path.exists(_jf):
        _t = open(_jf, encoding='utf-8').read(); _t2 = _acc(_t)
        if _t2 != _t: open(_jf, 'w', encoding='utf-8').write(_t2)
# Rounded corners for pictures, videos and panels across the site (CMS → Settings → Corners). Sharp leaves each page as it is.
CORNERS = ('<style id="km-corners">'
  'html[data-corners="rounded"]{--km-r:14px}'
  # the frames that hold a picture: round them and clip what is inside
  'html[data-corners="rounded"] :is(.ov-im,.fly,.km-keep,figure.m,.pc .im,figure .im,.print,.lpanel,.sbig,figure.sw .m,.onair,figure.slot,figure.panel,figure.lay,.pn .in,.d-frame,.d-pic,span.th,.keep,.gal .main){border-radius:var(--km-r)!important;overflow:hidden}'
  'html[data-corners="rounded"] .lb img{border-radius:var(--km-r)!important}'
  'html[data-corners="rounded"] figure.sw .m img{border-radius:var(--km-r)!important}'
  'html[data-corners="rounded"] :is(.gal .thumbs button,#strip button,.d-gt){border-radius:8px!important;overflow:hidden}html[data-corners="rounded"] :is(#strip button,.d-gt) img{border-radius:inherit}'
  'html[data-corners="rounded"] .call{border-radius:var(--km-r)!important}'
  # pictures that sit straight in a frame with a caption beside them: round the picture itself
  'html[data-corners="rounded"] :is(.slot,figure.slot,figure.panel,figure.lay,.pn .in)>:is(img,video,canvas),html[data-corners="rounded"] :is(figure.slot,figure.panel) :is(img,video){border-radius:var(--km-r)!important}'
  # pieces that come rounded on their own (the sticky-notes board, the Engineering stage) go square with the Sharp setting
  'html[data-corners="rounded"] .kb{border-radius:var(--km-r)!important}'
  'html[data-corners="sharp"] :is(.kb,.wb .stage){border-radius:0!important}'
  '</style>\n')
# The sound and theme buttons from Home, on every other page too, in the same places: bottom right on a computer, beside the
# menu button on a phone. They share Home's settings (km-sound, km-theme), so a change on any page holds everywhere.
TOGGLES = ('<style id="km-toggles">'
  '.km-tg{position:fixed;z-index:150;bottom:calc(24px + env(safe-area-inset-bottom,0px));width:36px;height:36px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;'
  'background:var(--pill,#f2f2f2);color:var(--ink,#000);cursor:pointer;transition:background .2s}'
  '.km-tg:hover{background:color-mix(in srgb,var(--ink,#000) 12%,var(--bg,#fff))}'
  '#themeBtn.km-tg{right:max(24px,env(safe-area-inset-right,0px))}#soundBtn.km-tg{right:calc(max(24px,env(safe-area-inset-right,0px)) + 44px)}'
  '#themeBtn.km-tg svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round}#soundBtn.km-tg svg{width:15px;height:15px;fill:currentColor}'
  '@media (max-width:899px){.km-tg{top:calc(16px + env(safe-area-inset-top,0px));bottom:auto;width:36px;height:36px}'
  '#themeBtn.km-tg{right:calc(max(16px,env(safe-area-inset-right,0px)) + 46px)}#soundBtn.km-tg{right:calc(max(16px,env(safe-area-inset-right,0px)) + 88px)}}'
  '@media print{.km-tg{display:none}}'
  '</style>'
  '<button class="km-tg" id="soundBtn" type="button" aria-label="Mute sound" aria-pressed="true"><svg viewBox="0 0 16 16" id="soundIco" aria-hidden="true"></svg></button>'
  '<button class="km-tg" id="themeBtn" type="button" aria-label="Dark mode" aria-pressed="false"><svg viewBox="0 0 16 16" id="themeIco" aria-hidden="true"></svg></button>\n'
  '<script>(function(){'
  'var sb=document.getElementById("soundBtn"),si=document.getElementById("soundIco"),tb=document.getElementById("themeBtn"),ti=document.getElementById("themeIco");'
  'var ON=\'<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 5.2a3.5 3.5 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>\','
  'OFF=\'<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>\','
  'MOON=\'<path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z"/>\','
  'SUN=\'<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>\';'
  'var on=true;try{on=localStorage.getItem("km-sound")!=="off"}catch(e){}'
  'function ps(){si.innerHTML=on?ON:OFF;sb.setAttribute("aria-pressed",on);sb.setAttribute("aria-label",on?"Mute sound":"Turn sound on");if(window.Popkit)Popkit.mute(!on)}'
  'sb.addEventListener("click",function(){on=!on;try{localStorage.setItem("km-sound",on?"on":"off")}catch(e){}ps();dispatchEvent(new CustomEvent("km-sound",{detail:on}));if(on&&window.Popkit)Popkit.play("pop")});'
  'function pt(){var d=document.documentElement.dataset.theme==="dark";ti.innerHTML=d?SUN:MOON;tb.setAttribute("aria-pressed",d);tb.setAttribute("aria-label",d?"Light mode":"Dark mode")}'
  'tb.addEventListener("click",function(){var t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("km-theme",t)}catch(e){}pt()});'
  'new MutationObserver(pt).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});'
  'ps();pt();addEventListener("load",ps)})();</script>\n')
_fb = _site.get('feedback') or {}
_ib = _site.get('inbox') or {}
SITEJS = ('<script>window.KM_SITE = ' + json.dumps({'available': _site.get('available', True) is not False, 'shop': bool(_site.get('shop')),
  'feedback': {'on': _fb.get('on', True) is not False, 'to': _fb.get('to') or 'iamkingsleey@gmail.com', 'after': _fb.get('after') or 3},
  'inbox': {'url': (_ib.get('url') or '').strip().rstrip('/'), 'email': _ib.get('email', True) is not False},
  'needle': _site.get('needle') or 'line', 'corners': _site.get('corners') or 'rounded'}) + ';'
  # corners (CMS → Settings → Corners): set on <html> before anything paints, so pictures and panels never flash sharp
  + 'document.documentElement.dataset.corners=window.KM_SITE.corners;'
  # kmNeedle: every dial draws its red needle through this, so the head (CMS → Settings → Dials) is the same everywhere.
  # A bar wider than tall points right (head at its right end); a taller one points up (head at its top).
  + 'window.kmNeedle=function(c,x,y,w,h){c.fillRect(x,y,w,h);var k=(window.KM_SITE||{}).needle||"line";if(k==="line")return;var hz=w>h,t=Math.min(w,h),hx=hz?x+w:x+w/2,hy=hz?y+h/2:y;c.beginPath();'
  + 'if(k==="dot"){c.arc(hx,hy,t*1.4+1.5,0,7)}else if(k==="diamond"){var d=t*1.6+2;c.moveTo(hx-d,hy);c.lineTo(hx,hy-d);c.lineTo(hx+d,hy);c.lineTo(hx,hy+d)}'
  + 'else if(k==="triangle"){var s=t*1.7+2;if(hz){c.moveTo(hx+s*1.3,hy);c.lineTo(hx-s*.4,hy-s);c.lineTo(hx-s*.4,hy+s)}else{c.moveTo(hx,hy-s*1.3);c.lineTo(hx-s,hy+s*.4);c.lineTo(hx+s,hy+s*.4)}}'
  + 'else if(k==="cap"){var L=t*2.6+3;if(hz)c.rect(hx-t,hy-L,t*1.6,L*2);else c.rect(hx-L,hy-t*.6,L*2,t*1.6)}c.closePath();c.fill()};'
  # kmSend: every form on the site sends through this. With an inbox set up (CMS → Settings → Inbox) the message goes there;
  # it resolves true once it is stored, false when there is no inbox or it could not be reached (the form then falls back to email)
  + 'window.kmSend=function(o){var u=(window.KM_SITE.inbox||{}).url;if(!u)return Promise.resolve(false);'
  + 'var b=Object.assign({page:(location.pathname.split("/").pop()||"index.html")+location.hash},o);'
  + 'return fetch(u+"/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.ok}).catch(function(){return false})};'
  + '</script>\n' + CORNERS)   # settings the pages read (CMS → Settings)
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
# ---- case-study pictures that still live on Framer: Framer hands out 2400px PNGs (often 1-3 MB each), which kept the
# case pages loading for seconds. The first build that can reach the internet saves each one here as a 2048px WebP in
# assets/cases/, and the pages point at that copy. A picture that can't be fetched (offline, say) keeps its Framer link,
# and is tried again next build. GIFs stay on Framer so they keep moving.
_FR = re.compile(r'https://framerusercontent\.com/images/([A-Za-z0-9]+)\.(?:png|jpe?g|webp)(?:\?[^"\'`)\s\\]*)?')
_LOCAL = {}
try:
    from PIL import Image as _Im0
    import io as _io0, urllib.request as _ur0, concurrent.futures as _cf0
    _ids = sorted(set(_FR.findall(open(f'{REPO}/content/cases.json', encoding='utf-8').read())))
    os.makedirs(f'{REPO}/assets/cases', exist_ok=True)
    def _grab(_id):
        _dst = f'{REPO}/assets/cases/{_id}.webp'
        if os.path.exists(_dst): return _id
        _url = next(m.group(0) for m in _FR.finditer(open(f'{REPO}/content/cases.json', encoding='utf-8').read()) if m.group(1) == _id)
        _url = re.sub(r'\?.*$', '', _url) + '?scale-down-to=2048'
        try:
            with _ur0.urlopen(_ur0.Request(_url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20) as _r: _b = _r.read()
            _im = _Im0.open(_io0.BytesIO(_b)); _im = _im.convert('RGBA' if _im.mode in ('RGBA', 'LA', 'P') else 'RGB')
            if max(_im.size) > 2048: _im.thumbnail((2048, 2048))
            _im.save(_dst + '.part', 'WEBP', quality=82, method=6); os.replace(_dst + '.part', _dst); return _id
        except Exception: return None
    if _ids:
        with _cf0.ThreadPoolExecutor(6) as _ex:
            for _id in _ex.map(_grab, _ids):
                if _id: _LOCAL[_id] = f'assets/cases/{_id}.webp'
        _miss = len(_ids) - len(_LOCAL)
        print(f'case pictures: {len(_LOCAL)} local' + (f', {_miss} still on Framer (offline?)' if _miss else ''))
except ImportError: pass
def _localize(html):
    return _FR.sub(lambda m: _LOCAL.get(m.group(1), m.group(0)), html) if _LOCAL else html
# ---- pictures: a WebP copy of every JPEG/PNG under assets/ (usually a third smaller, same look), plus a 1000px
# "md" copy of each design for places that show them small (the Designs grid, the 3D page's cards). The pages then
# point at the WebP; a picture without one (no Pillow on this machine, say) keeps its original. Copies are only
# remade when the original changes.
_WEBP = set()
try:
    from PIL import Image as _Im
    for _dp, _dn, _fn in os.walk(f'{REPO}/assets'):
        for _n in _fn:
            if not re.search(r'\.(jpe?g|png)$', _n, re.I): continue
            _src = os.path.join(_dp, _n); _rel = os.path.relpath(_src, REPO).replace(os.sep, '/')
            _out = re.sub(r'\.(jpe?g|png)$', '.webp', _src, flags=re.I)
            try:
                if not os.path.exists(_out) or os.path.getmtime(_out) < os.path.getmtime(_src):
                    _im = _Im.open(_src); _alpha = _im.mode in ('RGBA', 'LA', 'P')
                    _im = _im.convert('RGBA' if _alpha else 'RGB')
                    if max(_im.size) > 2400: _im.thumbnail((2400, 2400))
                    _im.save(_out, 'WEBP', quality=82, method=6)
                if os.path.getsize(_out) < os.path.getsize(_src): _WEBP.add(_rel)
                if '/thumbs/' not in _rel and _rel.startswith('assets/designs/') and _rel.count('/') == 2:
                    _md = f'{REPO}/assets/designs/md/' + os.path.basename(_out)
                    if not os.path.exists(_md) or os.path.getmtime(_md) < os.path.getmtime(_src):
                        os.makedirs(os.path.dirname(_md), exist_ok=True)
                        _m = _Im.open(_src); _m = _m.convert('RGBA' if _m.mode in ('RGBA', 'LA', 'P') else 'RGB'); _m.thumbnail((1000, 1000 * 4)); _m.save(_md, 'WEBP', quality=80, method=6)
                    # "sm" (640px) for the Designs grid tiles: about a third of md's weight, still sharp on a 3x phone screen
                    _sm = f'{REPO}/assets/designs/sm/' + os.path.basename(_out)
                    if not os.path.exists(_sm) or os.path.getmtime(_sm) < os.path.getmtime(_src):
                        os.makedirs(os.path.dirname(_sm), exist_ok=True)
                        _m = _Im.open(_src); _m = _m.convert('RGBA' if _m.mode in ('RGBA', 'LA', 'P') else 'RGB'); _m.thumbnail((640, 640 * 4)); _m.save(_sm, 'WEBP', quality=78, method=6)
            except Exception as _e: print('webp skipped', _rel, _e)
    # WebPs uploaded as-is (no JPG/PNG beside them) can be huge lossless files: one 360 KB picture held the Shop back
    # past 2 s on a phone. Over 250 KB they're re-saved lossy once; the smaller copy is kept only if it saves 40%+, so a
    # file is never squeezed twice.
    for _dp, _dn, _fn in os.walk(f'{REPO}/assets'):
        if '/md' in _dp or '/sm' in _dp or '/thumbs' in _dp: continue
        for _n in _fn:
            if not _n.lower().endswith('.webp'): continue
            _f = os.path.join(_dp, _n); _stem = _f[:-5]
            if any(os.path.exists(_stem + e) for e in ('.jpg', '.jpeg', '.png', '.JPG', '.PNG')) or os.path.getsize(_f) < 250_000: continue
            try:
                import io as _io
                _im = _Im.open(_f); _im.load(); _b = _io.BytesIO()
                _im.save(_b, 'WEBP', quality=85, alpha_quality=90, method=6)
                if _b.tell() < os.path.getsize(_f) * .6:
                    open(_f, 'wb').write(_b.getvalue()); print('webp squeezed', os.path.relpath(_f, REPO))
            except Exception as _e: print('webp squeeze skipped', _n, _e)
except ImportError:
    print('note: Pillow not installed, pictures keep their original format')
_PIC = re.compile(r'assets/[\w./-]+?\.(?:jpe?g|png)(?=["\'`)\s?#])', re.I)
def _webpify(html):
    return _PIC.sub(lambda m: re.sub(r'\.(jpe?g|png)$', '.webp', m.group(0), flags=re.I) if m.group(0) in _WEBP else m.group(0), html)
import hashlib as _hl
_vers = {}
def _ver(n):
    if n not in _vers:
        try: _vers[n] = _hl.md5(open(f'{REPO}/{n}.js', 'rb').read()).hexdigest()[:8]
        except OSError: _vers[n] = '0'
    return _vers[n]
# ---- offline page (cms/build/src/offline.html) and the small service worker that shows it when a page can't load.
# The worker only steps in when the network fails; online, every page comes straight from the site as before.
_off = _acc(open(f'{KFM}/offline.html', encoding='utf-8').read())
open(f'{REPO}/offline.html', 'w', encoding='utf-8').write(_off)
_swv = _hl.md5(_off.encode('utf-8')).hexdigest()[:8]
open(f'{REPO}/sw.js', 'w', encoding='utf-8').write(f"""// Offline page: keeps a copy of offline.html and shows it in place of any page that can't load (built by cms/build/src/tools/post.py)
const V = 'km-offline-{_swv}', OFF = 'offline.html';
self.addEventListener('install', e => {{ e.waitUntil(caches.open(V).then(c => c.add(new Request(OFF, {{ cache: 'reload' }}))).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil((async () => {{
  for (const k of await caches.keys()) if (k !== V && k.startsWith('km-offline')) await caches.delete(k);
  if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
  await self.clients.claim(); }})()); }});
self.addEventListener('fetch', e => {{
  const r = e.request; if (r.mode !== 'navigate' || r.method !== 'GET') return;   // pictures, scripts and the rest go straight to the network
  e.respondWith((async () => {{
    try {{ const p = await e.preloadResponse; if (p) return p; return await fetch(r); }}
    catch (_) {{ const c = await caches.open(V); return (await c.match(OFF)) || Response.error(); }}
  }})());
}});
""")
SWREG = "<script>if('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]cms=1/.test(location.search)) addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });</script>\n"
INDEX = {}
for _p in PAGES:
    _f = f'{REPO}/{_p}'
    if not os.path.exists(_f): continue
    _s = open(_f, encoding='utf-8').read()
    INDEX[_p] = index_page(_s)
    _s = apply(_p, _s)
    if ANALYTICS and '</head>' in _s: _s = _s.replace('</head>', ANALYTICS + '</head>', 1)
    if 'src="nav.js' not in _s: _s = _s.replace('</body>', NAV + '</body>', 1)
    if _p == 'index.html' and 'src="homebg.js' not in _s: _s = _s.replace('</body>', HOMEBG + '</body>', 1)
    if 'window.KM_SITE = ' not in _s: _s = _s.replace('<head>', '<head>\n' + SITEJS, 1)
    if 'src="kit.js' not in _s: _s = _s.replace('</body>', '<script src="kit.js" defer></script>\n</body>', 1)   # one feel across the site (cms/build/src/kit.js)
    if 'src="protips.js' not in _s: _s = _s.replace('</body>', '<script src="protips.js" defer></script>\n</body>', 1)
    if _p != 'index.html' and 'id="soundBtn"' not in _s and '</body>' in _s: _s = _s.replace('</body>', TOGGLES + '</body>', 1)   # Home's sound and theme buttons, on every page
    if 'src="feedback.js' not in _s: _s = _s.replace('</body>', '<script src="feedback.js" defer></script>\n</body>', 1)   # after a few minutes: how easy was it to get around?
    if _p == 'index.html' and 'src="home.js' not in _s: _s = _s.replace('</body>', '<script src="home.js" defer></script>\n</body>', 1)
    if _p in ('index.html', 'designs.html') and 'src="flow.js' not in _s:   # Designs keeps the arrival settle; only Home has the scroll
        _s = _s.replace('</head>', FLOWHEAD + '\n</head>', 1)
        _s = _s.replace('</body>', '<script src="flow.js" defer></script>\n</body>', 1)   # Designs: pull down at the top to go Home (phones only; flow.js decides)
    if 'serviceWorker.register' not in _s: _s = _s.replace('</body>', SWREG + '</body>', 1)   # offline: show offline.html when a page can't load
    _s = _acc(_s)   # the accent colour from Settings
    _s = _localize(_s)   # Framer pictures -> their saved WebP copies
    _s = _webpify(_s)
    if 'fonts.googleapis.com/css' in _s and 'fonts.gstatic.com' not in _s:   # the font files come from gstatic: connecting early saves a round trip
        _s = _s.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', 1)
    # every shared script gets ?v=<its content hash>, so a push shows up straight away instead of waiting out the browser's cache
    _s = re.sub(r'src="(nav|kit|protips|home|flow|homebg|tuner|popkit|feedback)\.js(?:\?v=\w+)?"', lambda m: f'src="{m.group(1)}.js?v={_ver(m.group(1))}"', _s)
    open(_f, 'w', encoding='utf-8').write(_s)
json.dump(INDEX, open(f'{HERE}/.index.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('post ok', sum(len(v['texts']) for v in INDEX.values()), 'texts,', sum(len(v['media']) for v in INDEX.values()), 'media')
