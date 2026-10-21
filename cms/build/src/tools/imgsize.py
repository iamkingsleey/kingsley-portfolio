# Picture shapes (width / height) for the case studies, so a case page can draw at once instead of waiting for its
# pictures to load. Local files are read from disk; Framer links are read from their first few kilobytes (only when the
# build can reach the internet) and remembered in cms/build/ratios.json, so each picture is looked up once.
import json, os, struct, urllib.request
def _dims(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n' and len(b) >= 24: return struct.unpack('>II', b[16:24])
    if b[:6] in (b'GIF87a', b'GIF89a'): return struct.unpack('<HH', b[6:10])
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
        k = b[12:16]
        if k == b'VP8X': return 1 + int.from_bytes(b[24:27], 'little'), 1 + int.from_bytes(b[27:30], 'little')
        if k == b'VP8 ': w, h = struct.unpack('<HH', b[26:30]); return w & 0x3fff, h & 0x3fff
        if k == b'VP8L': v = int.from_bytes(b[21:25], 'little'); return (v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1
    if b[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(b):
            if b[i] != 0xff: i += 1; continue
            m = b[i + 1]
            if m in (0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf):
                h, w = struct.unpack('>HH', b[i + 5:i + 9]); return w, h
            i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
    return None
def ratios(repo, urls):
    path = f'{repo}/cms/build/ratios.json'
    try: cache = json.load(open(path, encoding='utf-8'))
    except Exception: cache = {}
    out, changed, online = {}, False, True
    for u in sorted(set(urls)):
        if u in cache: out[u] = cache[u]; continue
        b = None
        if not u.startswith('http') and os.path.exists(f'{repo}/{u}'):
            with open(f'{repo}/{u}', 'rb') as f: b = f.read(262144)
        elif u.startswith('http') and online:
            try:
                rq = urllib.request.Request(u, headers={'Range': 'bytes=0-262143', 'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(rq, timeout=4) as r: b = r.read(262144)
            except Exception: online = False   # offline: skip the rest this time, the page measures them itself
        d = _dims(b) if b else None
        if d and d[1]: out[u] = cache[u] = round(d[0] / d[1], 3); changed = True
    if changed:
        try: json.dump(cache, open(path, 'w', encoding='utf-8'), indent=0, sort_keys=True)
        except Exception: pass
    return out
