# case.html and brand.html: the case studies, drawn from content/cases.json by one template (cms/build/src/cases-src.html).
#   case.html#<slug>  product case studies in the Story layout (a narrative column, a ruler of chapters down the side)
#   brand.html#<slug> brand case studies in the Showcase layout (pictures nearly edge to edge, colour floods, type by weight)
# Run from build.py (shares rep, REPO, KFM, THEME_BOOT, TUNER, CLICK).
CS2 = [c for c in json.load(open(f'{REPO}/content/cases.json', encoding='utf-8'))['cases'] if not c.get('hidden')]
def _local2(o):   # Framer links -> assets/cases/<file> once tools/fetch-case-images.sh has downloaded them
    if isinstance(o, dict): return {k: _local2(v) for k, v in o.items()}
    if isinstance(o, list): return [_local2(v) for v in o]
    if isinstance(o, str) and o.startswith('https://framerusercontent.com/'):
        n = o.split('?')[0].rsplit('/', 1)[1]
        return f'assets/cases/{n}' if os.path.exists(f'{REPO}/assets/cases/{n}') else o
    return o
_KEEP = ('flow', 'team', 'timeline', 'platforms', 'overview', 'glance', 'fx', 'fxDefault', 'gallery', 'coverRows', 'coverMore', 'coverGrid', 'slug', 'title', 'kind', 'tag', 'fq', 'role', 'year', 'client', 'industry', 'did', 'headline', 'blurb', 'stat', 'cover', 'story', 'sections',
         'statement', 'exp', 'impact', 'impactNote', 'goal', 'problem', 'type', 'colors', 'run', 'typeView', 'off', 'briefRows', 'briefBlocks')   # off: parts hidden in the CMS
_data = json.dumps([{k: c[k] for k in _KEEP if k in c} for c in _local2(CS2)], ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
_tpl = open(f'{KFM}/cases-src.html', encoding='utf-8').read()
# picture shapes known before the page loads (see tools/imgsize.py)
import sys; sys.path.insert(0, f'{KFM}/tools'); from imgsize import ratios as _ratios
def _urls(o):
    if isinstance(o, str): return [o] if (o.startswith('http') or o.startswith('assets/')) and not o.lower().split('?')[0].endswith(('.mp4', '.webm', '.mov')) else []
    if isinstance(o, dict): return _urls(o.get('poster')) if 'video' in o else [x for v in o.values() for x in _urls(v)]
    if isinstance(o, list): return [x for v in o for x in _urls(v)]
    return []
_RAT = json.dumps(_ratios(REPO, _urls(_local2(CS2))), separators=(',', ':'))
for _out, _L, _title in (('case.html', 'H', 'Product case study'), ('brand.html', 'N', 'Brand case study')):
    t = _tpl
    t = rep(t, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + THEME_BOOT + TUNER)
    t = rep(t, '<title>__TITLE__</title>', f'<title>{_title} · Kingsley</title>')
    t = rep(t, 'const RATIO = {};', 'const RATIO = ' + _RAT + ';')
    t = rep(t, 'const CASES = __DATA__;', 'window.KM_L = "' + _L + '";\nconst CASES = ' + _data + ';')
    t = rep(t, '<script>\nconst CASES', '<script src="popkit.js"></script>\n' + CLICK + '<script>\nconst CASES') if '<script>\nconst CASES' in t else rep(t, '<script>\nwindow.KM_L', '<script src="popkit.js"></script>\n' + CLICK + '<script>\nwindow.KM_L')
    assert '__DATA__' not in t and '__TITLE__' not in t
    open(f'{REPO}/{_out}', 'w', encoding='utf-8').write(t)
print('cases ok', len(CS2))
