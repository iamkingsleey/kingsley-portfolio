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

def media_library():
    out = []
    for base in ['assets']:
        for root, _, files in os.walk(os.path.join(REPO, base)):
            for n in files:
                if n.lower().endswith(MEDIA_EXT) and '/thumbs' not in root:
                    p = os.path.relpath(os.path.join(root, n), REPO).replace(os.sep, '/')
                    out.append({'path': p, 'size': os.path.getsize(os.path.join(root, n)), 'mtime': os.path.getmtime(os.path.join(root, n))})
    return sorted(out, key=lambda x: -x['mtime'])

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

# ---------------------------------------------------------------- publish (git)
def git_status():
    code, out = run(['git', 'status', '--porcelain'])
    if code: return {'ok': False, 'log': out}
    files = [l[3:] for l in out.splitlines() if l.strip()]
    return {'ok': True, 'changes': files}

def publish(message):
    msg = (message or '').strip() or 'Update content'
    steps = [['git', 'add', '-A', '--', 'content', 'assets', 'cms', '*.html', '.gitignore'],
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
                return self._json({'content': data, 'index': read_json(INDEX, {}), 'hasToken': bool(read_json(SECRETS, {}).get('goatcounter_token'))})
            if u.path == '/api/media': return self._json({'files': media_library()})
            if u.path == '/api/analytics': return self._json(analytics(max(1, min(366, int((q.get('days') or ['30'])[0])))))
            if u.path == '/api/status': return self._json(git_status())
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
            os.makedirs(HISTORY, exist_ok=True)
            if os.path.exists(path): shutil.copy(path, os.path.join(HISTORY, f'{name}-{time.strftime("%Y%m%d-%H%M%S")}.json'))
            write_json(path, data)
            return self._json({'ok': True})
        if u.path == '/api/secrets':
            data = json.loads(self._body().decode('utf-8') or '{}'); cur = read_json(SECRETS, {}); cur.update({k: v for k, v in data.items() if k == 'goatcounter_token'})
            write_json(SECRETS, cur); return self._json({'ok': True})
        return self._json({'error': 'not found'}, 404)

    def do_POST(self):
        if not self._local(): return self._json({'error': 'local only'}, 403)
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
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
