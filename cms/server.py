#!/usr/bin/env python3
"""Kingsley FM · CMS — runs on your Mac only.

Start it by double-clicking cms/Start CMS.command (or: python3 cms/server.py).
It opens the editor at http://localhost:4321 and serves a preview of the site at /site/.

Everything you change is saved into content/*.json and assets/uploads/, then the pages are rebuilt.
Publish commits and pushes those changes with your own git setup (no co-author lines).
"""
import json, os, re, subprocess, sys, time, threading, webbrowser, shutil, urllib.request, urllib.parse, mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CONTENT = os.path.join(REPO, 'content')
UPLOADS = os.path.join(REPO, 'assets', 'uploads')
HISTORY = os.path.join(HERE, '.history')
SECRETS = os.path.join(HERE, '.secrets.json')
INDEX = os.path.join(HERE, 'build', '.index.json')
EDITABLE = ['cases', 'designs', 'about', 'engineering', 'projects', 'text', 'media', 'site']
MEDIA_EXT = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm', '.mov')
PORT = int(os.environ.get('CMS_PORT', '4321'))
_build_lock = threading.Lock()

def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return default

def write_json(path, data):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=1); f.write('\n')
    os.replace(tmp, path)

def run(cmd, timeout=180):
    p = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr).strip()

def build():
    with _build_lock:
        t = time.time()
        code, out = run([sys.executable, os.path.join(HERE, 'build', 'build.py')])
        return {'ok': code == 0, 'log': out[-4000:], 'seconds': round(time.time() - t, 1)}

def version(name):
    """A fingerprint of a content file as it is on disk, so the editor can tell when something else changed it."""
    try:
        import hashlib
        with open(os.path.join(CONTENT, name + '.json'), 'rb') as f: return hashlib.md5(f.read()).hexdigest()[:12]
    except OSError: return ''


def protos():
    """The prototypes you can put in a case study: every .html page in the Prototype folder, named by its <title>."""
    out, d = [], os.path.join(REPO, 'Prototype')
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith(('.html', '.htm')): continue
            try: m = re.search(r'<title>(.*?)</title>', open(os.path.join(d, f), encoding='utf-8', errors='ignore').read(20000), re.S | re.I)
            except OSError: m = None
            out.append({'src': 'Prototype/' + f, 'name': (m.group(1).strip() if m else '') or f.rsplit('.', 1)[0].replace('-', ' ')})
    return out


def media_library():
    out = []
    for base in ['assets']:
        for root, _, files in os.walk(os.path.join(REPO, base)):
            for n in files:
                if n.lower().endswith(MEDIA_EXT) and '/thumbs' not in root:
                    p = os.path.relpath(os.path.join(root, n), REPO).replace(os.sep, '/')
                    out.append({'path': p, 'size': os.path.getsize(os.path.join(root, n)), 'mtime': os.path.getmtime(os.path.join(root, n))})
    return sorted(out, key=lambda x: -x['mtime'])

# ---------------------------------------------------------------- inbox (the Cloudflare Worker in cms/inbox)
def inbox_call(path, body=None):
    site = read_json(os.path.join(CONTENT, 'site.json'), {})
    url = ((site.get('inbox') or {}).get('url') or '').strip().rstrip('/')
    key = read_json(SECRETS, {}).get('inbox_key', '')
    if not url or not key: return {'configured': False, 'hasUrl': bool(url), 'hasKey': bool(key)}
    req = urllib.request.Request(url + path, data=json.dumps(body).encode() if body is not None else None, method='POST' if body is not None else 'GET',
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'KingsleyCMS'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: out = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: msg = json.loads(e.read().decode()).get('error')
        except Exception: msg = None
        return {'configured': True, 'error': msg or f'The inbox answered {e.code}.'}
    except Exception as e:
        return {'configured': True, 'error': 'Could not reach the inbox. Check the address and your connection.'}
    out['configured'] = True; return out

# ---------------------------------------------------------------- analytics (GoatCounter)
def gc_get(code, token, path, params):
    url = f'https://{code}.goatcounter.com/api/v0/{path}?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as r: return json.loads(r.read().decode())

def _count(x): return x.get('count', x.get('count_unique', 0)) or 0

def analytics(days):
    site = read_json(os.path.join(CONTENT, 'site.json'), {})
    code = re.sub(r'^https?://|\.goatcounter\.com.*$', '', ((site.get('analytics') or {}).get('goatcounter') or '').strip())
    token = read_json(SECRETS, {}).get('goatcounter_token', '')
    if not code or not token: return {'configured': False, 'code': code, 'hasToken': bool(token)}
    end = date.today() + timedelta(days=1); start = end - timedelta(days=days)
    p = {'start': start.isoformat(), 'end': end.isoformat()}
    out = {'configured': True, 'code': code, 'start': p['start'], 'end': p['end']}
    try:
        out['total'] = gc_get(code, token, 'stats/total', p)
        hits = gc_get(code, token, 'stats/hits', {**p, 'limit': 100})
        rows, daily = [], {}
        for h in hits.get('hits', []):
            rows.append({'path': h.get('path', ''), 'title': h.get('title', ''), 'event': h.get('event', False), 'count': _count(h)})
            for d in h.get('stats', []) or []:
                if not h.get('event'): daily[d.get('day')] = daily.get(d.get('day'), 0) + (d.get('daily', 0) or 0)
        out['pages'] = sorted([r for r in rows if not r['event']], key=lambda r: -r['count'])
        out['events'] = sorted([r for r in rows if r['event']], key=lambda r: -r['count'])
        out['daily'] = [{'day': (start + timedelta(days=i)).isoformat(), 'count': daily.get((start + timedelta(days=i)).isoformat(), 0)} for i in range(days)]
        for key in ['toprefs', 'locations', 'browsers', 'systems', 'sizes', 'campaigns']:
            try: out[key] = [{'name': s.get('name') or '(direct)', 'id': s.get('id'), 'count': _count(s)} for s in gc_get(code, token, f'stats/{key}', {**p, 'limit': 20}).get('stats', [])]
            except Exception as e: out[key] = []
    except urllib.error.HTTPError as e:
        out['error'] = f'GoatCounter said {e.code}: ' + (e.read().decode(errors='ignore')[:300] or e.reason)
    except Exception as e:
        out['error'] = f'Could not reach GoatCounter: {e}'
    return out

# ---------------------------------------------------------------- what changed since the last publish (for the review before Publish)
LABELS = {'title': 'Title', 'slug': 'Address', 'kind': 'Type', 'fq': 'Station', 'tag': 'Tag', 'role': 'Role', 'year': 'Year', 'client': 'Client',
          'industry': 'Industry', 'did': 'What I did', 'headline': 'Headline', 'blurb': 'Summary', 'stat': 'Headline number', 'cover': 'Cover picture',
          'story': 'Overview', 'run': 'Opening run', 'statement': 'Closing statement', 'shots': 'Screens', 'exp': 'Feature notes', 'impact': 'Impact',
          'problem': 'Problem', 'goal': 'Goal', 'impactNote': 'How impact was measured', 'heroVideo': 'Opening video', 'heroPoster': 'Video poster',
          'brandVer': 'Brand page sections', 'type': 'Typefaces', 'colors': 'Brand colours', 'hidden': 'Hidden', 'category': 'Category', 'images': 'Picture',
          'bg': 'Background colour', 'dark': 'Dark picture', 'desc': 'Project info', 'case': 'Part of case study', 'credits': 'Credits', 'link': 'Opens',
          'layout': 'Layout page', 'where': 'Where', 'what': 'Description', 'years': 'Years', 'statLabel': 'Number label', 'stat2': 'Second number',
          'stat2Label': 'Second number label', 'name': 'Name', 'tech': 'Made with', 'sub': 'Under the heading', 'tools': 'Tools', 'chapters': 'Chapters'}
MEDIA_RE = re.compile(r'\.(jpe?g|png|webp|gif|svg|mp4|webm|mov)(\?|$)', re.I)
def _is_media(v): return isinstance(v, str) and bool(MEDIA_RE.search(v)) or isinstance(v, dict) and ('video' in v or 'color' in v)
def _short(v):
    if v is None or v == '' or v == [] or v == {}: return ''
    if isinstance(v, str): return re.sub(r'<br\s*/?>', ' / ', v)
    if isinstance(v, bool): return 'Yes' if v else 'No'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list) and all(isinstance(x, str) for x in v): return ' · '.join(_short(x) for x in v)
    return json.dumps(v, ensure_ascii=False)[:300]
def _diff(a, b, path, out):   # field-level differences, media kept whole so they can be shown as pictures
    if a == b: return
    if _is_media(a) or _is_media(b):
        out.append({'field': path, 'media': True, 'before': a, 'after': b}); return
    if isinstance(a, dict) and isinstance(b, dict):
        for k in list(dict.fromkeys(list(a) + list(b))):
            if k.startswith('_'): continue
            _diff(a.get(k), b.get(k), path + [k], out)
        return
    if isinstance(a, list) and isinstance(b, list) and (any(isinstance(x, (list, dict)) or _is_media(x) for x in a + b)):
        for i in range(max(len(a), len(b))):
            _diff(a[i] if i < len(a) else None, b[i] if i < len(b) else None, path + [i], out)
        return
    out.append({'field': path, 'media': False, 'before': _short(a), 'after': _short(b)})
def _label(path):
    P = list(path)
    if P[:1] == ['images']: return {'src': 'Picture', 'video': 'Video', 'ratio': 'Shape'}.get(P[-1], 'Picture')
    if P[:1] == ['shots'] and len(P) >= 2:
        return f'Screen {P[1] + 1}' + (' › ' + ['Picture', 'Label', 'Where', 'Note'][P[2]] if len(P) > 2 and isinstance(P[2], int) and P[2] < 4 else '')
    if P[:1] == ['run'] and len(P) >= 2: return f'Opening run › picture {P[1] + 1}'
    if P[:1] == ['story'] and len(P) >= 2: return 'Overview › ' + ('heading' if P[1] == 0 else f'paragraph {P[2] + 1}' if len(P) > 2 else 'paragraphs')
    if P[:1] == ['exp'] and len(P) >= 2: return 'Feature notes › ' + ('heading' if P[1] == 0 else f'note {P[2] + 1}' + (' › ' + ['title', 'text'][P[3]] if len(P) > 3 else '') if len(P) > 2 else 'notes')
    if P[:2] == ['impact', 'stats'] and len(P) >= 3: return f'Impact › number {P[2] + 1}'
    if P[:1] in (['credits'], ['type'], ['colors']) and len(P) >= 2: return f'{LABELS[P[0]]} › {P[1] + 1}'
    parts = []
    for p in path:
        if isinstance(p, int): parts.append(f'#{p + 1}')
        else: parts.append(LABELS.get(p, p))
    return ' › '.join(parts) or 'Value'
def _head_json(name):
    code, out = run(['git', 'show', f'HEAD:content/{name}.json'])
    if code: return None
    try: return json.loads(out)
    except Exception: return None
def changes():
    out, groups = {'groups': [], 'uploads': [], 'pages': 0}, []
    def collection(name, listkey, key, title_of, label, link=None):
        old = (_head_json(name) or {}).get(listkey, []); cur = (read_json(os.path.join(CONTENT, name + '.json'), {}) or {}).get(listkey, [])
        om = {key(x, i): x for i, x in enumerate(old)}; nm = {key(x, i): x for i, x in enumerate(cur)}
        items = []
        for k, x in nm.items():
            if k not in om: items.append({'status': 'added', 'title': title_of(x), 'thumb': _thumb(x), 'link': link(x) if link else None, 'fields': []})
            else:
                d = []; _diff(om[k], x, [], d)
                if d: items.append({'status': 'edited', 'title': title_of(x), 'thumb': _thumb(x), 'link': link(x) if link else None, 'fields': [dict(f, field=_label(f['field'])) for f in d]})
        for k, x in om.items():
            if k not in nm: items.append({'status': 'removed', 'title': title_of(x), 'thumb': _thumb(x), 'fields': []})
        if [key(x, i) for i, x in enumerate(old) if key(x, i) in nm] != [key(x, i) for i, x in enumerate(cur) if key(x, i) in om]:
            items.append({'status': 'reordered', 'title': 'New order', 'fields': [{'field': 'Order', 'media': False, 'before': ' · '.join(title_of(x) for x in old if key(x, 0) in nm), 'after': ' · '.join(title_of(x) for x in cur if key(x, 0) in om)}]})
        if items: groups.append({'section': label, 'items': items})
    def _thumb(x):
        for k in ['cover', 'images']:
            v = x.get(k)
            if k == 'images' and v: v = v[0].get('video') or v[0].get('src')
            if v: return v
        return None
    collection('cases', 'cases', lambda x, i: x.get('slug') or f'#{i}', lambda x: x.get('title', ''), 'Case studies', lambda x: ('brand' if x.get('kind') == 'Brand' else 'case') + '.html#' + x.get('slug', ''))
    collection('designs', 'projects', lambda x, i: x.get('title') or f'#{i}', lambda x: x.get('title', ''), 'Designs', lambda x: 'designs.html')
    collection('about', 'chapters', lambda x, i: (x.get('where') or '') + '|' + (x.get('role') or ''), lambda x: ' · '.join(filter(None, [x.get('where'), x.get('role')])), 'About', lambda x: 'about.html')
    collection('engineering', 'tools', lambda x, i: x.get('name') or f'#{i}', lambda x: x.get('name', ''), 'Engineering', lambda x: 'engineering.html')
    for name, label, page in [('engineering', 'Engineering page', 'engineering.html'), ('projects', 'Projects page', 'projects.html'), ('site', 'Settings', None)]:
        old = _head_json(name) or {}; cur = read_json(os.path.join(CONTENT, name + '.json'), {}) or {}
        d = []; _diff({k: v for k, v in old.items() if k != 'tools'}, {k: v for k, v in cur.items() if k != 'tools'}, [], d)
        if d: groups.append({'section': label, 'items': [{'status': 'edited', 'title': label, 'link': page, 'fields': [dict(f, field=_label(f['field'])) for f in d]}]})
    for name, label, media in [('text', 'Page text', False), ('media', 'Pictures & videos', True)]:
        old = _head_json(name) or {}; cur = read_json(os.path.join(CONTENT, name + '.json'), {}) or {}
        items = []
        for page in sorted(set(old) | set(cur)):
            o, n = old.get(page, {}), cur.get(page, {}); f = []
            for k in list(dict.fromkeys(list(o) + list(n))):
                if o.get(k) != n.get(k): f.append({'field': '' if media else k, 'media': media, 'before': o.get(k) or k, 'after': n.get(k) or k})
            if f: items.append({'status': 'edited', 'title': page.replace('.html', '').replace('index', 'home').capitalize(), 'link': page, 'fields': f})
        if items: groups.append({'section': label, 'items': items})
    code, st = run(['git', 'status', '--porcelain', '--untracked-files=all'])
    for l in st.splitlines():
        p = l[3:].strip('"')
        if l.startswith('??') and p.startswith('assets/') and MEDIA_RE.search(p): out['uploads'].append(p)
        if p.endswith('.html') and '/' not in p: out['pages'] += 1
    out['groups'] = groups
    out['total'] = sum(len(g['items']) for g in groups) + len(out['uploads'])
    return out

# ---------------------------------------------------------------- publish (git)
def git_status():
    code, out = run(['git', 'status', '--porcelain'])
    if code: return {'ok': False, 'log': out}
    files = [l[3:] for l in out.splitlines() if l.strip()]
    return {'ok': True, 'changes': files}

def publish(message):
    msg = (message or '').strip() or 'Update content'
    steps = [['git', 'add', '-A', '--', 'content', 'assets', 'cms', 'Prototype', '*.html', '*.js', '.gitignore'],   # *.js: the site's scripts the build writes (nav, sw, tuner…)
             ['git', 'commit', '-m', msg], ['git', 'push']]
    log = []
    for s in steps:
        code, out = run(s, timeout=120)
        log.append('$ ' + ' '.join(s) + '\n' + out)
        if code and not (s[1] == 'commit' and 'nothing to commit' in out): return {'ok': False, 'log': '\n\n'.join(log)}
    return {'ok': True, 'log': '\n\n'.join(log)}

# ---------------------------------------------------------------- the web server
class H(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *a): pass
    def translate_path(self, path):
        u = urllib.parse.urlparse(path).path
        if u.startswith('/site/'): return os.path.join(REPO, urllib.parse.unquote(u[6:]))
        if u == '/site': return REPO
        rel = urllib.parse.unquote(u.lstrip('/')) or 'index.html'
        return os.path.join(HERE, 'admin', rel)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def _json(self, data, code=200):
        b = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def _body(self):
        n = int(self.headers.get('Content-Length') or 0); return self.rfile.read(n) if n else b''
    def _local(self):   # only this Mac may talk to the editor
        return self.client_address[0] in ('127.0.0.1', '::1')

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path.startswith('/api/'):
            if not self._local(): return self._json({'error': 'local only'}, 403)
            if u.path == '/api/content':
                data = {n: read_json(os.path.join(CONTENT, n + '.json'), {}) for n in EDITABLE}
                return self._json({'content': data, 'versions': {n: version(n) for n in EDITABLE}, 'index': read_json(INDEX, {}), 'hasToken': bool(read_json(SECRETS, {}).get('goatcounter_token')), 'hasInboxKey': bool(read_json(SECRETS, {}).get('inbox_key'))})
            if u.path == '/api/media': return self._json({'files': media_library()})
            if u.path == '/api/versions': return self._json({n: version(n) for n in EDITABLE})
            if u.path == '/api/protos': return self._json({'files': protos()})
            if u.path == '/api/analytics': return self._json(analytics(max(1, min(366, int((q.get('days') or ['30'])[0])))))
            if u.path == '/api/inbox': return self._json(inbox_call('/list'))
            if u.path == '/api/status': return self._json(git_status())
            if u.path == '/api/changes': return self._json(changes())
            return self._json({'error': 'not found'}, 404)
        return super().do_GET()

    def do_PUT(self):
        if not self._local(): return self._json({'error': 'local only'}, 403)
        u = urllib.parse.urlparse(self.path)
        m = re.fullmatch(r'/api/content/(\w+)', u.path)
        if m and m.group(1) in EDITABLE:
            try: data = json.loads(self._body().decode('utf-8'))
            except Exception as e: return self._json({'error': 'not valid JSON: %s' % e}, 400)
            name = m.group(1); path = os.path.join(CONTENT, name + '.json')
            # the editor says which copy its changes are based on; if the file changed since (Claude, Git, another tab), don't overwrite it unasked
            base = self.headers.get('X-Base-Version')
            if base is None:   # an editor tab opened before this check existed: it can't tell what it would overwrite
                return self._json({'error': 'This CMS tab is out of date. Reload the page (your saved work is safe), then make the change again.'}, 409)
            if not self.headers.get('X-Force') and base != version(name):
                return self._json({'error': 'changed', 'version': version(name)}, 409)
            os.makedirs(HISTORY, exist_ok=True)
            if os.path.exists(path): shutil.copy(path, os.path.join(HISTORY, f'{name}-{time.strftime("%Y%m%d-%H%M%S")}.json'))
            write_json(path, data)
            return self._json({'ok': True, 'version': version(name)})
        if u.path == '/api/secrets':
            data = json.loads(self._body().decode('utf-8') or '{}'); cur = read_json(SECRETS, {}); cur.update({k: v for k, v in data.items() if k in ('goatcounter_token', 'inbox_key')})
            write_json(SECRETS, cur); return self._json({'ok': True})
        return self._json({'error': 'not found'}, 404)

    def do_POST(self):
        if not self._local(): return self._json({'error': 'local only'}, 403)
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        if u.path in ('/api/inbox/update', '/api/inbox/delete'):
            return self._json(inbox_call(u.path[len('/api/inbox'):], json.loads(self._body().decode() or '{}')))
        if u.path == '/api/build': return self._json(build())
        if u.path == '/api/publish': return self._json(publish(json.loads(self._body().decode() or '{}').get('message')))
        if u.path == '/api/upload':
            name = os.path.basename((q.get('name') or ['file'])[0])
            stem, ext = os.path.splitext(name)
            if ext.lower() not in MEDIA_EXT: return self._json({'error': 'Only pictures and videos: ' + ', '.join(MEDIA_EXT)}, 400)
            stem = re.sub(r'[^a-z0-9]+', '-', stem.lower()).strip('-') or 'file'
            os.makedirs(UPLOADS, exist_ok=True)
            fn, k = f'{stem}{ext.lower()}', 1
            while os.path.exists(os.path.join(UPLOADS, fn)): k += 1; fn = f'{stem}-{k}{ext.lower()}'
            with open(os.path.join(UPLOADS, fn), 'wb') as f: f.write(self._body())
            return self._json({'ok': True, 'path': f'assets/uploads/{fn}'})
        return self._json({'error': 'not found'}, 404)

def main():
    port = PORT
    for _ in range(20):
        try: srv = ThreadingHTTPServer(('127.0.0.1', port), H); break
        except OSError: port += 1
    url = f'http://localhost:{port}/'
    print(f'\n  Kingsley FM · CMS is running at {url}\n  (leave this window open while you edit; close it to stop)\n')
    if not os.path.exists(INDEX): print('  First build…', build()['ok'])
    if '--no-open' not in sys.argv: threading.Timer(.6, lambda: webbrowser.open(url)).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass

if __name__ == '__main__': main()
