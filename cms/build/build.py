"""Builds the site from content/*.json and the page templates in cms/build/src.

Run it from anywhere:  python3 cms/build/build.py   (the CMS runs it for you when you save)
It writes the pages (index.html, designs.html, case.html, …) into the repo root.
"""
import json, urllib.parse, re, os, time
BUILD = time.strftime('%Y%m%d%H%M')   # cache-buster for designs.html links

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))   # the site's folder
KFM = os.path.join(HERE, 'src')                           # page templates
GEN = os.path.join(HERE, '.gen'); os.makedirs(GEN, exist_ok=True)   # pages made from templates + content, before the last step
src = open(f'{KFM}/index-orig.html', encoding='utf-8').read()
orig = src

def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, (c, a[:80])
    return s.replace(a, b)

# ---------------------------------------------------------------- archive
# (no longer written here: iteration-3/ is a full copy of the site as it was before iteration 4, taken from git,
#  so it can be compared with the live site. Build never touches the iteration-* folders.)

# ---------------------------------------------------------------- shared theme bootstrap (no flash of the wrong theme)
THEME_BOOT = """<script>
  // Theme: the visitor's saved pick, else dark. Shared by every page.
  (function () { var t; try { if (!localStorage.getItem('km-theme-v2')) { localStorage.removeItem('km-theme'); localStorage.setItem('km-theme-v2', '1'); } t = localStorage.getItem('km-theme'); } catch (e) {}   /* v2: forget the dark choice Designs used to save on its own (Nov 2026) */
    if (!t) t = 'dark';   // dark unless the visitor picks light with a theme button (a pick is the only thing ever saved)
    document.documentElement.dataset.theme = t; })();
</script>
"""
TOGGLE_ICONS = {
    'moon': '<path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z"/>',
    'sun': '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
}

CLICK = open(f'{KFM}/clickpop.html', encoding='utf-8').read()
TUNER = '<script src="tuner.js"></script>\n'   # page-to-page transition (see tuner.js)

# ================================================================ index.html
s = orig
# Geist and Geist Mono everywhere; Jockey One only for the name on Home
s = rep(s, 'family=Jockey+One&family=Geist:wght@400;500;600&display=swap', 'family=Jockey+One&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600;700&display=swap')
s = rep(s, ".needle { stroke: var(--ink); stroke-linecap: round }",
        ".needle { stroke: #ff4a1c; stroke-linecap: round }   /* the dial's main tick: the same red as the Designs needle */")
s = rep(s, '<style>\n', THEME_BOOT.replace('<script>\n', '<script>\n  var BUILD = "' + BUILD + '";   // changes every build so browsers fetch the new Designs page\n', 1) + TUNER + '<style>\n')
s = rep(s, "  --marker: #fff0a6;   /* highlighter on the bio */\n",
        "  --marker: #fff0a6;   /* highlighter on the bio */\n"
        "  --on-ink: #ffffff;   /* text on black chips */\n"
        "  --line: #eeeeee;     /* hairlines between list rows */\n"
        "  --card: #ffffff;     /* raised surfaces: dock, popovers */\n"
        "  --glass: rgb(255 255 255 / .85);\n"
        "  --scrim: rgb(255 255 255 / .72);\n"
        "  --edge: rgb(0 0 0 / .07);\n")
s = rep(s, '.pill.on { background: var(--ink); color: #fff }', '.pill.on { background: var(--ink); color: var(--on-ink) }')
s = s.replace('1px solid #eeeeee', '1px solid var(--line)')
s = rep(s, 'background: linear-gradient(var(--dir), rgb(255 255 255 / 0) 10%, rgb(255 255 255 / .55) 60%, var(--bg) 100%)',
        'background: linear-gradient(var(--dir), transparent 10%, color-mix(in srgb, var(--bg) 55%, transparent) 60%, var(--bg) 100%)')
s = s.replace('background: rgb(255 255 255 / .85)', 'background: var(--glass)')
s = rep(s, 'box-shadow: inset 0 0 0 1px rgb(0 0 0 / .07); pointer-events: none; z-index: 1 }', 'box-shadow: inset 0 0 0 1px var(--edge); pointer-events: none; z-index: 1 }')
s = rep(s, 'border-radius: 22px; background: #fff;', 'border-radius: 22px; background: var(--card);')
s = s.replace('background: var(--ink); color: #fff', 'background: var(--ink); color: var(--on-ink)')
s = rep(s, 'background: rgb(255 255 255 / .72);', 'background: var(--scrim);')
s = rep(s, 'text-decoration: underline dotted rgb(0 0 0 / .35);', 'text-decoration: underline dotted color-mix(in srgb, var(--ink) 35%, transparent);')

DARK_CSS = """
/* ---------- Dark mode ---------- */
html[data-theme="dark"] {
  --bg: #0b0b0b; --ink: #ffffff; --text: #c9c9c9; --muted: #8a8a8a; --time: #8a8a8a; --ring: #2a2a2a; --disc: #1a1a1a;
  --pill: #1c1c1c; --pill-hover: #262626; --tile: #161616; --photo: #333333; --marker: rgb(255 224 102 / .28);
  --on-ink: #000000; --line: #222222; --card: #161616; --glass: rgb(11 11 11 / .8); --scrim: rgb(11 11 11 / .72); --edge: rgb(255 255 255 / .1);
  color-scheme: dark;
}
/* Theme toggle: bottom-right on every page */
.theme-btn { position: fixed; z-index: 150; right: max(24px, env(safe-area-inset-right, 0px)); bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--pill); color: var(--ink); transition: background .2s }
.theme-btn:hover { background: var(--pill-hover) }
.theme-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round }
.sound-btn { position: fixed; z-index: 150; right: calc(max(24px, env(safe-area-inset-right, 0px)) + 44px); bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--pill); color: var(--ink); transition: background .2s }
.sound-btn:hover { background: var(--pill-hover) }
.sound-btn svg { width: 15px; height: 15px; fill: currentColor }
/* Phones: the dial sits at the bottom, so the two buttons move up beside the menu button */
.mode-bottom .theme-btn, .mode-bottom .sound-btn { top: calc(20px + env(safe-area-inset-top, 0px)); bottom: auto; width: 32px; height: 32px }
.mode-bottom .theme-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 40px) }
.mode-bottom .sound-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 78px) }
.inner.mode-bottom .theme-btn { right: max(16px, env(safe-area-inset-right, 0px)) }
.inner.mode-bottom .sound-btn { right: calc(max(16px, env(safe-area-inset-right, 0px)) + 38px) }
/* Leaving for the Designs page: the page closes over with a circle from the dial, then designs.html loads */
.leave { position: fixed; inset: 0; z-index: 200; background: var(--bg); pointer-events: none }
</style>"""
s = rep(s, '</style>', DARK_CSS)

TOGGLE_HTML = '<button class="sound-btn" id="soundBtn" type="button" aria-label="Mute sound" aria-pressed="true"><svg viewBox="0 0 16 16" id="soundIco" aria-hidden="true"></svg></button>' + '<button class="theme-btn" id="themeBtn" type="button" aria-label="Dark mode" aria-pressed="false"><svg viewBox="0 0 16 16" id="themeIco" aria-hidden="true"></svg></button>\n'
s = rep(s, '</body>', TOGGLE_HTML + '<script>\n' + """  // ---------- Sound switch (whole site; Designs reads the same setting) ----------
  (function () {
    const btn = document.getElementById('soundBtn'), ico = document.getElementById('soundIco');
    const ON = '<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 5.2a3.5 3.5 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
    const OFF = '<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
    let on = true; try { on = localStorage.getItem('km-sound') !== 'off'; } catch (e) {}
    function paint() {
      ico.innerHTML = on ? ON : OFF;
      btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Mute sound' : 'Turn sound on');
      if (window.Popkit) Popkit.mute(!on);
    }
    btn.addEventListener('click', () => {
      on = !on; try { localStorage.setItem('km-sound', on ? 'on' : 'off'); } catch (e) {}
      paint(); if (on && window.Popkit) Popkit.play('pop');
    });
    paint();
  })();
  // ---------- Theme toggle ----------
  (function () {
    const btn = document.getElementById('themeBtn'), ico = document.getElementById('themeIco');
    const ICONS = { moon: '%s', sun: '%s' };
    function paint() {
      const dark = document.documentElement.dataset.theme === 'dark';
      ico.innerHTML = dark ? ICONS.sun : ICONS.moon;
      btn.setAttribute('aria-pressed', dark); btn.setAttribute('aria-label', dark ? 'Light mode' : 'Dark mode');
    }
    btn.addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('km-theme', t); } catch (e) {}
      paint();
    });
    paint();
  })();
</script>
</body>""" % (TOGGLE_ICONS['moon'], TOGGLE_ICONS['sun']))

# loader: once per visit (coming back from designs.html skips it)
s = rep(s, "  var loader = document.getElementById('loader'), num = document.getElementById('ldNum'), svg = document.getElementById('ldStrip');",
        "  var loader = document.getElementById('loader'), num = document.getElementById('ldNum'), svg = document.getElementById('ldStrip');\n"
        "  try { if (sessionStorage.getItem('km-loaded')) { loader.remove(); return; } } catch (e) {}   // already seen this visit")
s = rep(s, "    if (done) return; done = true;", "    if (done) return; done = true;\n    try { sessionStorage.setItem('km-loaded', '1'); } catch (e) {}")

# Inner pages (Engineering, Projects, About) use the same station readout as Designs instead of the side menu
STATION_CSS = """
/* ---------- Station readout on inner pages (same as the Designs page) ---------- */
.side-nav { display: none !important }
.inner .menu-btn { display: none !important }
.station { position: fixed; z-index: 120; left: max(48px, env(safe-area-inset-left, 0px)); top: calc(80px + env(safe-area-inset-top, 0px)); display: flex; align-items: center; gap: 6px;
  opacity: 0; visibility: hidden; transform: translateY(-4px); transition: opacity .25s, transform .3s cubic-bezier(.2,.8,.2,1), visibility 0s .3s }
.inner .station { opacity: 1; visibility: visible; transform: none; transition: opacity .35s .1s, transform .4s cubic-bezier(.2,.8,.2,1) .1s, visibility 0s }
.station .back { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 13px 0 10px; border-radius: 999px; background: var(--pill); font: 500 12px "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted); letter-spacing: .3px; transition: background .25s, color .25s }
.station .back svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: transform .3s cubic-bezier(.2,.8,.2,1) }
.station .back span { font-family: var(--body); font-size: 13px; letter-spacing: -.1px }
.station .back:hover { background: var(--pill-hover); color: var(--ink) }
.station .back:hover svg { transform: translateX(-3px) }
.station .now { display: flex; align-items: baseline; gap: 9px; padding: 0 10px; color: var(--ink) }
.station .fq { font: 500 26px/1 var(--body); letter-spacing: -1px; font-variant-numeric: tabular-nums; min-width: 3.4ch }
.station .nm { font-size: 13px; font-weight: 500 }
.station .bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 11px; margin-left: 2px }
.station .bars i { width: 2.5px; border-radius: 1px; background: var(--ink) }
.station .bars i:nth-child(1) { height: 4px } .station .bars i:nth-child(2) { height: 7px } .station .bars i:nth-child(3) { height: 11px }
.station.tune-out .bars i { animation: sfade .3s steps(1) infinite }
.station.tune-out .bars i:nth-child(2) { animation-delay: .1s } .station.tune-out .bars i:nth-child(3) { animation-delay: .2s }
@keyframes sfade { 50% { opacity: .15 } }
.mode-bottom .station { left: max(16px, env(safe-area-inset-left, 0px)); top: calc(18px + env(safe-area-inset-top, 0px)) }
.mode-bottom .station .fq { font-size: 22px }
/* keep page content clear of the readout */
.inner.mode-top .sheet.about { padding-top: 150px }
.inner.mode-top .sheet:not(.about) { top: calc(50% + 30px) }
</style>"""
s = rep(s, '</style>', STATION_CSS)
STATION_HTML = """<div class="station" id="station" aria-label="Station">
  <button class="back" id="stBack" type="button" aria-label="Tune back to Home, 98.0"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>98.0 <span>Home</span></button>
  <div class="now"><span class="fq" id="stFq">96.0</span><span class="nm" id="stNm">Engineering</span><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></div>
</div>
"""
s = rep(s, '<body>\n', '<body>\n' + STATION_HTML)
s = rep(s, """  function setInner(s) {
    const inner = s.id !== 'home';""", """  function setInner(s) {
    const inner = s.id !== 'home';
    if (inner) { document.getElementById('stFq').textContent = s.f.toFixed(1); document.getElementById('stNm').textContent = s.name; }""")
# back button: the readout tunes down to 98.0 (silent), then Home closes the page into the dial as before
s = rep(s, "  // ---------- Theme toggle ----------", """  // ---------- Station readout: back to Home ----------
  (function () {
    const btn = document.getElementById('stBack'), st = document.getElementById('station'), fq = document.getElementById('stFq'), nm = document.getElementById('stNm');
    const reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.addEventListener('click', () => {
      if (st.classList.contains('tune-out')) return;
      const from = parseFloat(fq.textContent) || 98, t0 = performance.now(), dur = reduceM ? 0 : 420;
      st.classList.add('tune-out');
      (function run(now) {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
        fq.textContent = (from + (98 - from) * e).toFixed(1);
        if (k < 1) return requestAnimationFrame(run);
        nm.textContent = 'Home'; st.classList.remove('tune-out');
        document.dispatchEvent(new CustomEvent('station:home'));
      })(t0);
    });
  })();
  // ---------- Theme toggle ----------""")
s = rep(s, "  const OLD_IDS = {", "  document.addEventListener('station:home', () => tuneTo(STATIONS.find(x => x.id === 'home'), false));   // silent\n  const OLD_IDS = {")

# FM wave out of the typing cursor on Home: each keystroke sends a pulse out of the cursor
s = rep(s, '<span class="caret idle" id="caret" aria-hidden="true"></span></h1>',
        '<span class="caret idle" id="caret" aria-hidden="true"></span><canvas class="fm-wave" id="fmWave" aria-hidden="true"></canvas></h1>')
s = rep(s, '</style>', """h1.typer { position: relative }
/* Typing cursor hidden for now (it still marks where the text ends, so the FM wave starts there).
   To bring it back, delete this rule. */
.caret { opacity: 0; width: 0 !important; margin-left: 0 !important; animation: none !important }
.fm-wave { position: absolute; left: 0; top: 0; pointer-events: none }
</style>""")
s = rep(s, "    for (let i = from.length; i > keep; i--) { typedEl.textContent = from.slice(0, i - 1); await pause(34 + Math.random() * 18); }",
        "    for (let i = from.length; i > keep; i--) { typedEl.textContent = from.slice(0, i - 1); fmKick(-1); await pause(34 + Math.random() * 18); }")
s = rep(s, "      const ch = to[i]; typedEl.textContent = to.slice(0, i + 1);",
        "      const ch = to[i]; typedEl.textContent = to.slice(0, i + 1); fmKick(1);")
s = rep(s, "  let typedOnce = false;", """  // ---------- FM wave out of the cursor ----------
  // Every keystroke adds energy. Energy raises the wave's height and its frequency (frequency modulation),
  // then drains, so the wave flutters out of the cursor while the name types and settles when it rests.
  // Typing pushes the wave outward; deleting pulls it back toward the cursor.
  const fmCv = document.getElementById('fmWave'), fmCx = fmCv.getContext('2d');
  let fmEnergy = 0, fmDir = 1, fmPhase = 0, fmFreq = .12, fmRaf = 0;
  function fmKick(d) { if (reduce) return; fmEnergy = Math.min(1.6, fmEnergy + .55); fmDir = d; if (!fmRaf) fmRaf = requestAnimationFrame(fmFrame); }
  function fmFrame() {
    const dpr = Math.min(2, devicePixelRatio || 1), W = 90, H = 26;   // short and low
    const c = caretEl.getBoundingClientRect(), hr = typerEl.getBoundingClientRect();
    if (fmCv.width !== Math.round(W * dpr)) { fmCv.width = Math.round(W * dpr); fmCv.height = Math.round(H * dpr); fmCv.style.width = W + 'px'; fmCv.style.height = H + 'px'; }
    fmCv.style.transform = `translate(${(c.right - hr.left + 8).toFixed(1)}px, ${(c.top + c.height / 2 - hr.top - H / 2).toFixed(1)}px)`;
    fmCx.setTransform(dpr, 0, 0, dpr, 0, 0); fmCx.clearRect(0, 0, W, H);
    fmEnergy *= .955;
    const e = Math.min(1, fmEnergy);
    fmFreq += ((.09 + e * .28) - fmFreq) * .15;
    fmPhase += (.12 + e * .55) * fmDir;
    if (e > .01) {
      fmCx.beginPath();
      for (let x = 0; x <= W; x += 1.5) {
        const env = Math.exp(-x / (W * .38)) * Math.min(1, x / 6);   // strongest at the cursor, fading out
        const y = H / 2 + Math.sin(x * fmFreq - fmPhase) * (H * .34) * e * env;
        x ? fmCx.lineTo(x, y) : fmCx.moveTo(x, y);
      }
      fmCx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#000';
      fmCx.globalAlpha = .35 + .5 * e; fmCx.lineWidth = 1.6; fmCx.lineCap = 'round'; fmCx.stroke(); fmCx.globalAlpha = 1;
      fmRaf = requestAnimationFrame(fmFrame);
    } else fmRaf = 0;
  }
  let typedOnce = false;""")
# ripple ring colour follows the theme
s = rep(s, "ripCtx.strokeStyle = `rgba(0,0,0,${(.16 * fade).toFixed(3)})`;",
        "ripCtx.strokeStyle = document.documentElement.dataset.theme === 'dark' ? `rgba(255,255,255,${(.16 * fade).toFixed(3)})` : `rgba(0,0,0,${(.16 * fade).toFixed(3)})`;")

# Designs now lives on its own page: tuning to it closes this page over with a circle, then opens designs.html
s = rep(s, """  function tuneTo(s, sound) {
    const prev = active;""", """  function goDesigns(prev, sound) {
    setTarget(ang(STATIONS.find(x => x.id === 'designs').f)); play('pop', sound);
    if (prev && prev.id === 'home') emitRipple(true);
    let o = { x: M.cx, y: M.cy, r: 264.5 * M.S };
    const g = prev && prev.id !== 'home' && tagFor(STATIONS.find(x => x.id === 'designs'));
    if (g) o = { x: g.x + g.w / 2, y: g.y, r: g.h / 2 };
    if (window.Tuner) { Tuner.go({ from: 98, to: 100, name: 'Designs', href: 'designs.html?v=' + BUILD }); return; }   // readout to the middle, page blurs
    if (reduce) { location.href = 'designs.html?v=' + BUILD; return; }
    const cover = document.createElement('div'); cover.className = 'leave'; document.body.appendChild(cover);
    const far = Math.ceil(Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y))) + 8;
    const a = cover.animate([{ clipPath: `circle(${Math.round(o.r)}px at ${o.x}px ${o.y}px)` }, { clipPath: `circle(${far}px at ${o.x}px ${o.y}px)` }],
      { duration: 380, easing: EASE, fill: 'forwards' });
    setTimeout(() => { location.href = 'designs.html?v=' + BUILD; }, 240);   // start loading while the circle is still closing
  }
  // Fetch the Designs page and its first pictures while Home sits idle, so opening it is instant.
  function prefetchDesigns() {
    if (prefetchDesigns.done) return; prefetchDesigns.done = true;
    const add = (href, as) => { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; if (as) l.as = as; document.head.appendChild(l); };
    // (the Designs page itself and its first full pictures are fetched by flow.js; here only the small thumbnails)
    PROJECTS.forEach(p => p.images && p.images[0] && p.images[0].src && add(p.images[0].src.replace('assets/designs/', 'assets/designs/thumbs/'), 'image'));
  }
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
  addEventListener('load', () => idle(prefetchDesigns));
  // Coming back from designs.html (bfcache): clear the cover
  addEventListener('pageshow', () => document.querySelectorAll('.leave').forEach(c => c.remove()));
  function tuneTo(s, sound) {
    const prev = active;
    if (s.id === 'designs') { prefetchDesigns(); goDesigns(prev, sound); return; }
    const PAGE = { about: ['about.html', 94, 'About'], engineering: ['engineering.html', 96, 'Engineering'], projects: ['projects.html', 102, 'Projects'] }[s.id];
    if (PAGE) { setTarget(ang(s.f)); play('pop', sound); const href = PAGE[0] + '?v=' + BUILD;   // About, Engineering and Projects live on their own pages
      if (window.Tuner && !reduce) { Tuner.go({ from: (prev && prev.f) || 98, to: PAGE[1], name: PAGE[2], href }); return; } location.href = href; return; }""")

# old links to #designs / #feed go straight to the new page
s = rep(s, "  const hashId = OLD_IDS[location.hash.slice(1)] || location.hash.slice(1);",
        "  const hashId = OLD_IDS[location.hash.slice(1)] || location.hash.slice(1);\n"
        "  if (hashId === 'designs') { location.replace('designs.html?v=' + BUILD); return; }\n"
        "  if (['about', 'engineering', 'projects'].includes(hashId)) { location.replace(hashId + '.html?v=' + BUILD); return; }")
s = rep(s, "    if (sound) play(open ? 'open' : 'close', true);", "    if (sound) play('pop', true);   // one click sound everywhere")
s = rep(s, '</body>', CLICK + '</body>')
s = rep(s, '<a href="#">Medium</a></nav>', '<a href="#">Medium</a><a href="#">Unsplash</a></nav>')
s = rep(s, '<span>x</span><a href="#">resume</a>', '')   # no resume link for now
s = rep(s, '<a href="#" id="emailLink" data-email="">email</a>', '<a href="mailto:kingsleymkpandiok@gmail.com" id="emailLink" data-email="kingsleymkpandiok@gmail.com">email</a>')
s = rep(s, '<p>Senior product designer with experience designing from <span class="hl">0-1</span> at <br><span class="hl">e-commerce startups</span> and enterprise.</p>',
        '<p>I design where money meets trust: wallets, <br class="dbr">checkouts and the brands around them.</p>')
# real links from the old site (the rest stay as # until there's a URL)
for _n, _u in [('LinkedIn', 'https://www.linkedin.com/in/iamkingsleey/'), ('Medium', 'https://medium.com/@iamkingsleey'), ('Dribbble', 'https://dribbble.com/kingsleey'), ('Instagram', 'https://www.instagram.com/iamkingsleey/'), ('Unsplash', 'https://unsplash.com/@iamkingsleey'), ('github', 'https://github.com/iamkingsleey')]:
    s = rep(s, f'<a href="#">{_n}</a>', f'<a href="{_u}" target="_blank" rel="noopener">{_n}</a>')
# the old dial (v3) is still in the markup; nav.js hides it once it loads, which can show it for a frame on arrival.
# Hide it in the page's own styles so it never paints.
s = rep(s, '</head>', '<style>#dialLayer, .side-nav, .station .back, .sdial { display: none !important }</style>\n</head>')
s = rep(s, '</head>', '<style>.socials .wip { font-size: 13px; padding: 6px 4px 6px 8px; color: var(--muted); letter-spacing: .02em; cursor: default; align-self: center }</style>\n</head>')
open(f'{REPO}/index.html', 'w', encoding='utf-8').write(s)

# ================================================================ designs.html
d = open(f'{KFM}/work-src.html', encoding='utf-8').read()
pj = json.load(open(f'{REPO}/content/designs.json', encoding='utf-8'))['projects']
LAYOUT_PAGE = {'logo': 'logo.html', 'product-panels': 'product.html', 'product-story': 'product.html', 'illustration': 'showcase.html', '3d': 'showcase.html'}
slugify = lambda t: re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', t.lower()))
# the pieces, by category, in the order they are listed in content/designs.json
A = {k: [] for k in ['3d', 'illustration', 'poster', 'brand', 'motion', 'product', 'ui']}
for p in pj:
    if p.get('hidden'): continue
    im = p['images'][0]
    e = {'t': p['title'], 'bg': p.get('bg', '#111111'), 'dark': p.get('dark', True), 'r': im.get('ratio', 0.8)}
    if im.get('video'):
        e['video'] = im['video']; e['poster'] = im['src']
        if im.get('sound'): e['sound'] = im['sound']
        if im.get('hd'): e['hd'] = im['hd']   # a full-resolution copy, loaded only when the piece is opened (the grid keeps the light one)   # a copy with its soundtrack, played only once someone opens the piece
    else:
        e['src'] = im['src']
    if im.get('live'):   # a piece that runs as a small live page (live/…): the picture is its still; phones get a portrait layout and still
        e['live'] = im['live']
        if im.get('srcm'): e['srcm'] = im['srcm']; e['rm'] = im.get('ratiom', 0.8)
    lay = p.get('layout')   # optional: logo · product-panels · product-story · illustration · 3d (opens that page)
    if lay:
        e['layout'] = lay
        e['page'] = LAYOUT_PAGE[lay] + '#' + slugify(p['title'])
    if p.get('desc'): e['desc'] = p['desc']
    if len(p['images']) > 1:   # a project with several pictures: they become its own gallery on Designs (arrows + a grid under it)
        e['gal'] = [{'src': x['src'], 'r': x.get('ratio', 0.8), **({'video': x['video']} if x.get('video') else {})} for x in p['images'] if x.get('src')]
    if p.get('caseStudy'): e['cs'] = True   # optional: shown as a case study (its layout page is the case study)
    for f_ in ('year', 'case', 'credits', 'link', 'tools', 'mix', 'client'):   # optional: year, the case study it belongs to (slug), credits [[role, name]], link (a page to open instead of the small view)
        if p.get(f_): e[f_] = p[f_]
    A.setdefault(p.get('category', '3d'), []).append(e)
# case studies (content/cases.json) join the feed first in their category, tagged, and open case.html
CASES = [c for c in json.load(open(f'{REPO}/content/cases.json', encoding='utf-8'))['cases'] if not c.get('hidden')]   # a case hidden in the CMS leaves the feed too
def _loc(o):
    if isinstance(o, str) and o.startswith('https://framerusercontent.com/'):
        n = o.split('?')[0].rsplit('/', 1)[1]
        return f'assets/cases/{n}' if os.path.exists(f'{REPO}/assets/cases/{n}') else o
    return o
for _c in CASES: _c['cover'] = _loc(_c['cover']) if isinstance(_c['cover'], str) else _c['cover']
def case_cover(c):
    m = c['cover']
    if isinstance(m, str): return m
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000" viewBox="0 0 1500 1000"><rect width="1500" height="1000" fill="{m["color"]}"/><text x="750" y="560" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="600" font-size="190" letter-spacing="-9" fill="#fff">{m["word"]}</text></svg>'
    return 'data:image/svg+xml,' + urllib.parse.quote(svg)
for kind, k in [('Brand', 'brand'), ('Product', 'product')]:
    A[k] = [{'t': c['title'], 'bg': '#111111', 'dark': True, 'r': 1.5, 'src': c.get('preview') or case_cover(c), 'cs': True, 'fq': c['fq'], 'page': c.get('page', 'case.html') + '#' + c['slug'], 'desc': c['blurb'], 'client': c['client'] if c['client'] != 'Personal project' else '', 'year': c['year'] if c['year'][:1].isdigit() else '', 'tools': 'Figma' if kind == 'Product' else 'Illustrator · Figma'} for c in CASES if c['kind'] == kind] + A[k]

d = rep(d, '<meta charset="utf-8">\n<title>Designs Dial</title>',
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Designs · Kingsley M.</title>')
d = rep(d, '<meta name="claude:viewport-fit-sides" content="cover">\n', '<meta name="claude:viewport-fit-sides" content="cover">\n' + THEME_BOOT + TUNER)   # Designs follows the same rule as every page: the visitor's own pick, else dark
d = rep(d, '</style>\n', '</style>\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n</head>\n<body>\n', 1)
d = rep(d, '  const A = __ASSETS__;', '  // Pieces by category. Images and videos are the files in assets/designs (listed in content/designs.json).\n  const A = ' + json.dumps(A, ensure_ascii=False) + ';')
# the first screen of Designs, in the order the grid deals it (the same fixed shuffle as mixIn in work-src.html).
# Their small thumbnails are asked for in the page's head, before its script runs, and Home reads the same list to fetch
# them while you're still on Home, so scrolling down into Designs lands on pictures, not a dark page.
def _grid_order():
    cats = [('product', 'Case study'), ('brand', 'Brand'), ('ui', 'UI/UX'), ('3d', '3D'), ('illustration', 'Illustration'), ('poster', 'Poster'), ('motion', 'Motion')]
    lst = [dict(x, cat=name) for k, name in cats for x in A.get(k, [])]
    isx = lambda x: x['cat'] in ('Illustration', 'Poster', 'UI/UX') or x.get('mix')
    base = [x for x in lst if not isx(x)]; extra = [x for x in lst if isx(x)]
    sd = 7
    for i in range(len(extra) - 1, 0, -1):
        sd = (sd * 16807) % 2147483647; j = int(sd / 2147483647 * (i + 1)); extra[i], extra[j] = extra[j], extra[i]
    n = len(base) + len(extra); step = n / max(1, len(extra)); out = []; k = 0
    for i in range(n):
        if k < len(extra) and int((k + .5) * step) == i: out.append(extra[k]); k += 1
        elif base: out.append(base.pop(0))
    return out + base + extra[k:]
def _thumb(u):
    m = re.match(r'assets/(designs|uploads)/(?!(?:thumbs|sm|md)/)(.+)\.(?:jpe?g|png|webp)$', u or '')
    return f'assets/{m.group(1)}/thumbs/{m.group(2)}.webp' if m else None
# the first screen gets a 400px copy (assets/…/th2/) instead of the 300px thumbnail: on most screens that is already as sharp
# as the tile, so the first screen is finished the moment it lands, and only big, dense screens fetch a sharper copy after it
_TH2_N = 16
def _th2(u):
    m = re.match(r'assets/(designs|uploads)/(?!(?:thumbs|sm|md|th2)/)(.+)\.(?:jpe?g|png|webp)$', u or '')
    if not m: return None
    out = f'assets/{m.group(1)}/th2/{m.group(2)}.webp'
    srcs = [f'{REPO}/{u}'] + [f'{REPO}/assets/{m.group(1)}/{m.group(2)}.{e}' for e in ('webp', 'jpg', 'jpeg', 'png')]
    src = next((x for x in srcs if os.path.exists(x)), None)
    if not src: return None
    o = f'{REPO}/{out}'
    if not os.path.exists(o) or os.path.getmtime(o) < os.path.getmtime(src):
        try:
            from PIL import Image as _I2
            os.makedirs(os.path.dirname(o), exist_ok=True)
            with _I2.open(src) as im:
                im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB'); im.thumbnail((400, 1600)); im.save(o, 'WEBP', quality=74, method=6)
        except Exception as e:
            print('th2 skipped', u, e); return None
    return out
_TH2 = {}
for _x in _grid_order()[:_TH2_N]:
    _u = _x.get('poster') if _x.get('video') else _x.get('src')
    _t2 = _th2(_u)
    if _t2: _TH2[_x['t']] = _t2
for _d in ('designs', 'uploads'):   # copies for pieces no longer on the first screen are cleared away
    for _dp, _dn, _fn in os.walk(f'{REPO}/assets/{_d}/th2'):
        for _n in _fn:
            _rel = os.path.relpath(os.path.join(_dp, _n), REPO).replace(os.sep, '/')
            if _rel not in _TH2.values():
                try: os.remove(os.path.join(_dp, _n))
                except OSError: pass
_first = [t for t in ((_TH2.get(x['t']) or _thumb(x.get('poster') if x.get('video') else x.get('src'))) for x in _grid_order()[:12]) if t]
d = d.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n</head>',
              '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' + ''.join(f'<link rel="preload" as="image" href="{t}" fetchpriority="high" data-first>\n' for t in _first) + '</head>', 1)
# ---- the All grid, built into the page. Designs used to draw its grid with script once the whole page had loaded, so on a
# slow phone the screen stayed empty for seconds. Now the tiles are in the HTML, in the same order and with the same shapes the
# page script uses; a few lines right after them size the grid and bring the first screen in, before the long script runs.
# The page script then picks these tiles up instead of drawing its own (and redraws them if they ever disagree with the data).
import html as _html
try:
    from PIL import Image as _PILIm
except Exception:
    _PILIm = None
def _ratio(u, fallback):
    """The shape the grid reads from the thumbnail (width / height, 3 decimals), so nothing moves when the script takes over."""
    if _PILIm:
        t = _thumb(u)
        for pth in ([f'{REPO}/{t}'] if t else []) + ([f'{REPO}/{u}'] if u and not u.startswith(('http', 'data:')) else []):
            if os.path.exists(pth):
                try:
                    with _PILIm.open(pth) as _im: w, h = _im.size
                    return f'{w / h:.3f}'
                except Exception: pass
    try: return f'{float(fallback):.3f}'
    except Exception: return '0.800'
def _th_of(u):
    t = _thumb(u)
    if t and os.path.exists(f'{REPO}/{t}'): return t
    if u and re.search(r'framerusercontent\.com/images/', u):
        return re.sub(r'([?&])scale-down-to=\d+', r'\1scale-down-to=1024', u) if 'scale-down-to=' in u else u + '?scale-down-to=1024'
    return u
_ovt = []
for _i, _x in enumerate(_grid_order()):
    _still = _x.get('poster') if _x.get('video') else _x.get('src')
    _r = f"{float(_x.get('r') or 1.5):.3f}" if _x.get('cs') else _ratio(_still, _x.get('r', .8))
    _mob = ''
    if _x.get('live') and _x.get('srcm'):   # phones show live pieces in their portrait layout
        _mob = f' data-thm="{_th_of(_x["srcm"])}" data-bgm="{_x["srcm"]}" data-rm="{_ratio(_x["srcm"], _x.get("rm", .8))}"'
    _t2 = '' if _mob else _TH2.get(_x['t'], '')
    _f2 = ' data-th2' if _t2 else ''
    _ovt.append(f'<button class="ov-t{" white" if _x.get("video") and not _x.get("dark", True) else ""}" type="button" data-i="{_i}" style="--d:{min(_i, 8) * 40}ms;--r:{_r}"{_mob}{_f2}>'
                f'<span class="ov-im" data-th="{_t2 or _th_of(_still)}" data-bg="{_still}"></span><span class="ov-c"><b>{_i + 1:02d}</b> <span class="ov-n">{_html.escape(_x["t"], quote=False)}</span><em>{_x["cat"]}</em></span></button>')
OV_STATIC = ('<div class="ov flat" id="ov" role="dialog" aria-label="All work"><div class="ov-grid">' + ''.join(_ovt) + '</div></div>\n'
  '<script>(function () {   /* the first screen of the grid, before the page script: size the tiles and bring them in */\n'
  "var ov = document.getElementById('ov'); if (!ov) return;\n"
  "var mob = innerWidth < 900, T = [].slice.call(ov.querySelectorAll('.ov-t'));\n"
  "if (mob) T.forEach(function (t) { if (!t.dataset.thm) return; var im = t.firstChild; im.dataset.th = t.dataset.thm; im.dataset.bg = t.dataset.bgm; t.style.setProperty('--r', t.dataset.rm); });\n"
  "var role = ''; try { role = localStorage.getItem('km-role') || ''; } catch (e) {}\n"
  "if (['Product', 'UI/UX', 'Brand', '3D', 'Motion'].indexOf(role) >= 0 || /^#f-|(^#|\\/)p-/.test(decodeURIComponent(location.hash))) return;   // a chosen role or a link to one piece: the page script lays these out\n"
  "var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, grid = ov.firstChild;\n"
  "ov.style.transition = 'none'; document.body.classList.add('all');\n"
  "var cols = mob ? 2 : 4, g = mob ? 12 : 22, gw = grid.clientWidth; if (!gw || !T.length) return;\n"
  "var w = (gw - g * (cols - 1)) / cols;\n"
  "T.forEach(function (t) { var r = parseFloat(t.style.getPropertyValue('--r')) || .8; t.style.setProperty('--sp', String(Math.round(w / r + g))); });\n"
  "var SIZED = /(^|\\/)assets\\/(designs\\/[^/]+|uploads\\/(?!(?:thumbs|sm|md)\\/)[\\w\\/.-]+)\\.webp$/, sized = function (u, d) { return u.replace(/assets\\/(designs|uploads)\\//, 'assets/$1/' + d + '/'); };\n"
  "var sharp = function (el, u) { var px = (el.offsetWidth || gw / cols || 400) * (devicePixelRatio || 1); return !SIZED.test(u) ? u : px <= 520 ? sized(u, 'sm') : px <= 760 ? sized(u, 'md') : u; };\n"
  "var spread = cols === 4 ? [-350, -117, 117, 350] : [-120, 120], top0 = T[0].offsetTop, left0 = T[0].offsetLeft, lim = innerHeight * 1.4;\n"
  "var geo = T.map(function (t) { return [t.offsetTop, t.offsetLeft, t.offsetWidth, t.offsetHeight]; }), onS = [];\n"
  "T.forEach(function (t, k) { var ot = geo[k][0], ol = geo[k][1], ow = geo[k][2]; if (ot > lim) return;\n"
  "  var im = t.firstChild, th = im.dataset.th, bg = im.dataset.bg;\n"
  "  if (th) { im.style.setProperty('--th', 'url(' + th + ')'); im.removeAttribute('data-th'); }\n"
  "  if (bg && t.hasAttribute('data-th2') && ow * (devicePixelRatio || 1) <= 400) { im.removeAttribute('data-bg'); bg = ''; }   // the 400px copy is already as sharp as this tile\n"
  "  if (ot < innerHeight && bg) { im.removeAttribute('data-bg'); onS.push([t, sharp(t, bg), ow * Math.min(geo[k][3], innerHeight - ot)]); }   // the sharp copy for what's on screen, as the page script would pick it\n"
  "  t.dataset.pf = '1';\n"
  "  var go = function () { t.classList.remove('m-in'); requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('m-in'); }); }); };\n"
  "  if (!reduce) { var c = Math.round((ol - left0) / (ow + g)), row = Math.max(0, Math.round((ot - top0) / 300));\n"
  "    t.style.setProperty('--fx', Math.round((spread[c] || 0) * .6) + 'px'); t.style.setProperty('--fy', (200 + row * 60) + 'px');\n"
  "    t.style.setProperty('--fdl', (.02 + c * .04 + row * .07).toFixed(2) + 's'); t.style.setProperty('--fd', [1.05, 1.3, 1.2, 1.15][(c + row) % 4] + 's'); }\n"
  "  var ok = function () { t.classList.add('ok'); if (t._fly) { t._fly(); t._fly = null; } };\n"
  "  if (!th) { ok(); return; }\n"
  "  var i = new Image(); i.onload = i.onerror = ok; i.src = th;\n"
  "  if (!reduce) { if (i.complete) t._fly = go; else { t.style.setProperty('--fdl', '0s'); t._fly = go; } }\n"
  "});\n"
  "// the sharp copies for what's on screen, biggest first (the thumbnails, asked for first in the page's head, show while these arrive)\n"
  "onS.sort(function (a, b) { return b[2] - a[2]; });\n"
  "var put = function (o, k) { var i = new Image(); if (!k) try { i.fetchPriority = 'high'; } catch (e) {} i.src = o[1]; o[0].firstChild.style.setProperty('--bg', 'url(' + o[1] + ')'); };   // asked for now, not when the page next lays itself out (after the long script)\n"
  "onS.forEach(put);\n"
  "})();</script>\n")
d = rep(d, '</div>\n\n<script>\n(function () {\n', '</div>\n\n' + OV_STATIC + '<script>\n(function () {\n')
# theme: share the key with index.html; the page's own theme button stays
d = rep(d, "  let startDark = matchMedia('(prefers-color-scheme: dark)').matches;\n  try { const v = localStorage.getItem('kfm-theme'); if (v) startDark = v === 'dark'; } catch (_) {}\n  applyTheme(startDark);",
        "  applyTheme(document.documentElement.dataset.theme === 'dark');")
d = rep(d, "    if (save) try { localStorage.setItem('kfm-theme', dark ? 'dark' : 'light'); } catch (_) {}",
        "    if (save) try { localStorage.setItem('km-theme', dark ? 'dark' : 'light'); } catch (_) {}")
# back to Home: after the readout tunes 100.0 → 98.0, go to index.html#home
d = rep(d, """      nm.textContent = 'Home'; station.classList.remove('tune-out');
      $('toast').classList.add('show');
      setTimeout(() => {
        $('toast').classList.remove('show'); document.body.classList.remove('leaving');
        fq.textContent = '100.0'; nm.textContent = 'Designs'; leaving = false;
      }, 1600);""", """      nm.textContent = 'Home'; station.classList.remove('tune-out');
      location.href = './';""")
d = rep(d, '<div class="toast" id="toast" role="status">In the real site this lands back on Home</div>\n', '')
# returning via the back button (bfcache): reset the readout
d = rep(d, "  addEventListener('resize', measure);\n  measure();",
        "  addEventListener('pageshow', e => { if (e.persisted) { document.body.classList.remove('leaving'); $('fq').textContent = '100.0'; $('nm').textContent = 'Designs'; leaving = false; } });\n  addEventListener('resize', measure);\n  measure();")
# Designs uses Home's dial sound: Popkit's detent as each piece passes the needle (and nothing else)
d = rep(d, '<script>\n(function () {', '<script src="popkit.js"></script>\n' + CLICK + '<script>\n(function () {')
i0 = d.index("  function tick() {"); i1 = d.index("\n  }\n", i0) + 4
d = d[:i0] + "  function tick() {                             // same detent as Home's dial\n    if (soundOn && window.Popkit) Popkit.play('detent');\n  }\n" + d[i1:]
d = rep(d, '<button type="button" id="snd" aria-label="Mute ticks" aria-pressed="true">', '<button type="button" id="snd" aria-label="Mute dial sound" aria-pressed="true">')
# one theme toggle for the site, on Home: Designs follows the saved choice and has no toggle of its own
d = rep(d, '<button type="button" class="themebtn" id="themeBtn" aria-label="Dark mode" aria-pressed="false"><svg viewBox="0 0 16 16" id="themeIco"></svg></button>', '')
d = rep(d, "  document.getElementById('themeBtn').addEventListener('click', () => { applyTheme(document.documentElement.dataset.theme !== 'dark', true); });", "")
# sound: one switch for the site, next to the theme toggle on Home. Designs follows it and has no button.
d = rep(d, '<button type="button" id="snd" aria-label="Mute dial sound" aria-pressed="true"><svg viewBox="0 0 16 16" id="sndIco"></svg></button>', '<button type="button" id="snd" style="display:none" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 16 16" id="sndIco"></svg></button>')
d = rep(d, "  let ac = null, soundOn = true;", "  let ac = null, soundOn = true;\n  try { soundOn = localStorage.getItem('km-sound') !== 'off'; } catch (e) {}   // set by the sound button on Home")
d = d.rstrip() + '\n</body>\n</html>\n'
assert '__ASSETS__' not in d and '__GLITCH__' not in d
open(f'{REPO}/designs.html', 'w', encoding='utf-8').write(d)

# ================================================================ project.html (the project page every piece opens)
t = open(f'{KFM}/project-tpl.html', encoding='utf-8').read()
TOOLS = {'blender': 'assets/blender.svg', 'figma': 'assets/figma.svg', 'photoshop': 'assets/photoshop.svg', 'aftereffects': 'assets/aftereffect.svg', 'illustrator': 'assets/illustrator.svg', 'claude': 'assets/claude.svg', 'chatgpt': 'assets/chatgpt.svg'}
t = rep(t, '__TUNER__', TUNER.rstrip())
t = rep(t, '__ITEMS__', json.dumps(A, ensure_ascii=False))
t = rep(t, '__TOOLS__', json.dumps(TOOLS))
t = rep(t, '__BACK__', 'designs.html?v=' + BUILD)
t = rep(t, '__POPKIT__', '<script src="popkit.js" defer></script>\n' + CLICK)
assert '__' not in t.replace('__proto__', '')
open(f'{REPO}/project.html', 'w', encoding='utf-8').write(t)
exec(open(f'{KFM}/tools/build_layouts.py').read())
exec(open(f'{KFM}/tools/gen_pages.py').read())   # about, engineering and projects, from content/*.json
exec(open(f'{KFM}/tools/build_about.py').read())
exec(open(f'{KFM}/tools/build_cases2.py').read())   # case.html (Story) and brand.html (Showcase); the older pages' builder is tools/build_case.py
# ================================================================ shop.html (102.0): packs and templates for sale, from content/shop.json
# (only once it's switched on in content/site.json, "shop": true; until then no page and no station in the nav)
_shop_on = bool(json.load(open(f'{REPO}/content/site.json', encoding='utf-8')).get('shop')) and os.path.exists(f'{KFM}/shop-src.html') and os.path.exists(f'{REPO}/content/shop.json')
if _shop_on:
  _sh_src = open(f'{KFM}/shop-src.html', encoding='utf-8').read()
  _shop = json.load(open(f'{REPO}/content/shop.json', encoding='utf-8'))
  _sh_src = rep(_sh_src, '<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + THEME_BOOT + TUNER)
  _sh_src = rep(_sh_src, '__SHOP__', json.dumps(_shop, ensure_ascii=False))
  _sh_src = rep(_sh_src, '<script>\n(function () {', '<script src="popkit.js"></script>\n' + CLICK + '<script>\n(function () {')
  open(f'{REPO}/shop.html', 'w', encoding='utf-8').write(_sh_src)
exec(open(f'{KFM}/tools/post.py').read())   # your text and picture changes, analytics, and the list the CMS edits
print('ok', len(s), len(d))
