# The case study page: the product design page (simple-src.html: sideways opening, panels, text, credits, right
# section dial) filled from content/cases.json instead of the sample app, plus an Impact section.
# case_page(cases, site) returns the HTML. site=True: the real site (the build adds theme, tuner, popkit);
# site=False: the preview (theme button, popkit inline, a switch between the six).
import json

def case_page(CASES, KFM, site):
    srcp = open(f'{KFM}/product-src.html', encoding='utf-8').read().split('\n')
    P = open(f'{KFM}/simple-src.html', encoding='utf-8').read()
    P = P.replace('/*__BASECSS__*/', '\n'.join(srcp[16:103])).replace('//__SCREENS__', '\n'.join(srcp[398:421]))
    def rep(a, b):
        nonlocal P
        assert P.count(a) == 1, (P.count(a), a[:90]); P = P.replace(a, b)

    rep('<title>Product Showcase</title>', '<title>Case study</title>')
    rep('</style>', """
/* ---------- case study additions ---------- */
.pn { aspect-ratio: 3 / 2 } .pn.tall { aspect-ratio: 4 / 5 }
.pn > .in.shotw { position: absolute; inset: -4%; display: block }
.pn img.shot, .pn video.shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; background: var(--panel) }
/* pinned versions: the panel keeps the picture's shape and fits the screen */
.pin .pn.fit { flex: none; aspect-ratio: 3 / 2; height: min(calc(100svh - 290px), calc((100vw - 300px) / 1.5)); width: auto; align-self: center }
.pn .cblk { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 600; letter-spacing: -.05em; font-size: clamp(48px, 7vw, 120px); line-height: 1 }
.slot > img, .slot > video { position: absolute; top: 0; left: -60px; width: calc(100% + 120px); max-width: none; height: 100%; object-fit: cover; will-change: transform }
.slot > .cblk { position: absolute; inset: 0 -60px; display: grid; place-items: center; font-weight: 600; letter-spacing: -.05em; font-size: clamp(48px, 6vw, 110px); line-height: 1; will-change: transform }
.cs-tag { display: inline-flex; align-items: center; gap: 7px; color: var(--ink) }
.cs-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--red) }
.intro .cat { display: flex; gap: 12px; align-items: center }
.txt h2 .n { font: 500 11px var(--mono); color: var(--muted); letter-spacing: .6px; margin-right: 10px }
.txt .one p + p { margin-top: 14px }
.txt .lead { color: var(--ink); font-size: clamp(19px, 1.7vw, 24px); line-height: 1.4; letter-spacing: -.01em; font-weight: 500; max-width: 40ch }
.txt dl.list { margin: 22px 0 0 }
.txt dl.list > div { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 20px; padding: 14px 0; border-top: 1px solid var(--line) }
.txt dl.list dt { color: var(--ink); font-size: 14px; font-weight: 500 }
.txt dl.list dd { margin: 0; font-size: 15px; line-height: 1.55 }
.txt .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 20px }
.txt .chip { font: 500 10.5px var(--mono); letter-spacing: .5px; text-transform: uppercase; color: var(--ink); background: var(--pill); padding: 8px 11px }
/* impact: the numbers, large */
.impact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--line) }
.impact > div { padding: 30px 28px 34px 0; border-bottom: 1px solid var(--line) }
.impact b { display: block; color: var(--ink); font-size: clamp(56px, 6.4vw, 104px); line-height: .9; font-weight: 500; letter-spacing: -.055em; font-variant-numeric: tabular-nums }
.impact span { display: block; margin-top: 14px; font-size: 15px; line-height: 1.45; max-width: 26ch }
.todo { color: var(--muted); font-style: italic; font-weight: 400 }
/* the pictures and videos run nearly edge to edge (56px from each side); the text keeps its column */
:root { --max: none; --bl: calc(56px - var(--gut)); --br: calc(56px - var(--gut)) }
@media (max-width: 899px) { :root { --bl: calc(16px - var(--gut)); --br: calc(16px - var(--gut)) } }
#s-intro > figure, #s-body > figure, #s-body > .row2, #s-body > .blk, #s-body > section.sty, #s-body > section.cam:not(.camonly) .pin > .pn { margin-left: var(--bl); margin-right: var(--br) }
#s-body > figure .cap, #s-intro > figure .cap, #s-body > .row2 .cap { padding-left: 16px; padding-right: 16px }
.flw .fwin { margin: 0 var(--br) 0 var(--bl) }
#hero.vfirst.land { aspect-ratio: auto; width: auto; height: min(calc((100vw - 32px) * .75), calc(100svh - 110px)) }
figure:has(> .pn.vfirst.land) .cap { max-width: none !important }
.camonly .pin .pn.fit { width: auto; height: calc(100svh - 120px); aspect-ratio: auto; margin: 0 var(--br) 0 var(--bl); align-self: stretch }
.pin .pn.fit:not(.camonly *) { height: min(calc(100svh - 270px), calc((100vw - 32px) / 1.5)) }
.txt.brief { padding-top: 0 }                     /* sits right under the overview, as one block */
.inote { margin: 22px 0 0; font-size: 14px; line-height: 1.5; color: var(--muted); max-width: 60ch }
.cam .pn { overflow: hidden }
.cam.still .pin { position: relative; top: auto }   /* a still picture: it scrolls by like the rest of the page */
.cam.still .pin .pn.fit { height: min(calc(100svh - 120px), calc((100vw - 96px) / 1.35)) }   /* taller: nearly a full screen */
.cam.still .pin { height: auto; padding: 40px 0 }
.camonly .pin .pn.fit { height: min(calc(100svh - 260px), calc((100vw - 400px) / 1.5)) }   /* just the picture, so it can be bigger */ .cam .cw { position: absolute; inset: 0 }
.cam .cw .camimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }
/* flow */
.flw .pin { padding-left: 0; padding-right: 0 }
.fwin { position: relative; flex: 1; min-height: 0; overflow: hidden }
.frow { position: absolute; top: 0; bottom: 0; left: 0; display: flex; gap: 16px; will-change: transform }
.flw .pin .pn.fcard { flex: none; height: 100%; width: auto; aspect-ratio: 3 / 2; transition: none } .flw .pin .pn.fcard.tall { aspect-ratio: 4 / 5 }
.fcard > .in.shotw { inset: 0 }
.fcard .fst { position: absolute; top: 14px; left: 16px }
/* the opening video */
.pn.vfirst { aspect-ratio: 4 / 5; width: min(100%, calc((100svh - 150px) * .8)); margin: 0 auto } .pn .vbig { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }   /* the video at its own shape, edge to edge */
.pn.vfirst.land { aspect-ratio: 4 / 3; width: min(100%, calc((100svh - 150px) * 4 / 3)) }
figure:has(> .pn.vfirst.land) .cap { max-width: min(100%, calc((100svh - 150px) * 4 / 3)); margin: 0 auto }
figure:has(> .pn.vfirst:not(.land)) .cap { max-width: min(100%, calc((100svh - 150px) * .8)); margin: 0 auto }
/* impact numbers count up into place */
.impact b.count { color: var(--ink) }
@media (max-width: 899px) { .fcard { width: 78vw } }
@media (max-width: 899px) { .txt dl.list > div { grid-template-columns: 1fr; gap: 4px } .impact > div { padding-right: 12px } }
</style>""")
    # page text that the script fills in
    rep('<span class="cat mono">Product design · UI/UX</span>', '<span class="cat mono" id="icat"></span>')
    rep('<figcaption class="cap mono"><span><b>01</b> · The prototype. Drag the dial</span><span id="hfq">88.1 FM</span></figcaption>',
        '<figcaption class="cap mono"><span><b>01</b> · <span id="hcap"></span></span><span id="hfq"></span></figcaption>')
    i = P.index('    <div class="meta rv">'); j = P.index('    </div>\n  </section>', i)
    P = P[:i] + '    <div class="meta rv" id="meta"></div>\n' + P[j + 11:]
    rep('<h2 class="rv">Overview</h2>', '<h2 class="rv" id="oh">Overview</h2>')
    i = P.index('    <div class="cols rv">\n      <p>People opened'); j = P.index('</div>', i) + 6
    P = P[:i] + '    <div class="cols rv" id="ocols"></div>' + P[j:]
    i = P.index('    <dl class="rv">\n      <div><dt>Year</dt>'); j = P.index('</dl>', i) + 5
    P = P[:i] + '    <dl class="rv" id="cred"></dl>' + P[j:]
    rep('<a class="next" href="#" onclick="return false"><span class="fq">Next on the dial · 100.7</span><span class="r"><h5>Card holder with stickers →</h5><span class="th"><img alt=""></span></span></a>',
        '<a class="next" href="#" id="next"><span class="fq" id="nfq"></span><span class="r"><h5 id="nnm"></h5><span class="th" id="nth"></span></span></a>')
    rep('<span class="fq">100.6</span><span class="nm">Tune · Product design</span>', '<span class="fq" id="sfq">88.1</span><span class="nm" id="snm">Case study</span>')
    rep('<b>100.0</b> Designs</a>', '<b>102.0</b> Projects</a>')

    # the data, and which case study the address asks for (case.html#kusnap)
    rep("  const VIDEO = __VIDEO__, POSTER = __POSTER__, TOOL_SRC = __TOOLS__;", """  const CASES = __CASES__, TOOL_SRC = __TOOLS__;
  const HP = decodeURIComponent(location.hash.slice(1)).split('/');
  let CI = CASES.findIndex(c => c.slug === HP[0]); if (CI < 0) CI = 0;
  const CS = CASES[CI], NX = CASES[(CI + 1) % CASES.length];
  // product case studies all use one version: Video + Flow + Camera ("ver": "mix" in the CMS)
  const CV = 'mix';
  window.KMCASE = { all: CASES, cur: CI, it: CS, next: NX };
  const VIDEO = '', POSTER = '';
  const esc = s => String(s).replace(/&(?!#?\\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/&lt;br>/g, '<br>');
  const isBrand = CS.kind === 'Brand';
  // a picture (url), a video ({video, poster}) or a coloured block ({color, word, ink}) inside a panel or a slot
  const shot = (m, cls = 'shot') => typeof m === 'string' ? `<img class="${cls}" src="${m}" alt="${esc(CS.title)}" decoding="async">`
    : m.video ? `<video class="${cls}" src="${m.video}" poster="${m.poster || ''}" muted loop playsinline autoplay preload="metadata"></video>`
    : `<div class="cblk" style="background:${m.color};color:${m.ink || (/^#f/i.test(m.color) ? '#111' : '#fff')}">${esc(m.word || '')}</div>`;
  const kindOf = m => typeof m === 'string' ? 'image' : m.video ? 'video' : 'brand';
""")
    rep("  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));", """  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  document.title = CS.title + ' · Case study';
  $('sfq').textContent = CS.fq; $('snm').textContent = CS.title;
  $('icat').textContent = 'Case study · ' + (isBrand ? 'Brand identity' : 'Product design');
  document.querySelector('.intro .tt p').textContent = CS.blurb;
  const yr = /^\\d/.test(CS.year) ? esc(CS.year) : '<span class="todo">Year</span>';
  const tools = isBrand ? ['illustrator', 'figma'] : ['figma'];
  $('meta').innerHTML = `<div><span class="mono">Year</span><b>${yr}</b></div><div><span class="mono">Role</span><b>${esc(CS.role)}</b></div>
    <div><span class="mono">Industry</span><b>${CS.industry.map(esc).join(', ')}</b></div><div><span class="mono">Tools</span><div class="ic" id="tools"></div></div>`;
  $('oh').textContent = 'Overview';
  $('ocols').innerHTML = CS.story[1].map(p => `<p>${esc(p)}</p>`).join('');
  // the brief, right under the overview: what was wrong, and what it had to do
  if (CS.problem) $('s-over').insertAdjacentHTML('afterend', `<section class="txt brief" id="s-brief"><h2 class="rv">The brief</h2><div class="cols rv"><div><h3>Problem</h3><p>${esc(CS.problem)}</p></div><div><h3>Goal</h3><p>${esc(CS.goal)}</p></div></div></section>`);
  $('cred').innerHTML = `<div><dt>Year</dt><dd>${yr}</dd></div><div><dt>Client</dt><dd>${esc(CS.client)}</dd></div>
    <div><dt>Deliverables</dt><dd>${CS.did.map(esc).join('<br>')}</dd></div><div><dt>Design</dt><dd>Kingsley Mkpandiok · ${esc(CS.role)}</dd></div>`;
  $('nfq').textContent = 'Next case study · ' + NX.fq + ' · ' + NX.kind; $('nnm').innerHTML = esc(NX.title) + ' →'; $('nth').innerHTML = shot(NX.cover, ''); $('next').href = (NX.page && NX.page !== 'case.html' ? NX.page : '') + '#' + NX.slug;
  const SH = CS.shots, heroM = SH[0][0];
  document.documentElement.dataset.cv = CV;
  $('hcap').textContent = SH[0][1]; $('hfq').textContent = SH[0][2];""")
    # the body: Video + Flow + Camera, then Impact
    rep("  if (V === 'tune') tick = buildTune();", """  {
    const pn = (k, tall) => `<figure><div class="pn${tall ? ' tall' : ''}"><div class="in shotw">${shot(SH[k][0])}</div></div>${cap('0' + (k + 1), esc(SH[k][1]), esc(SH[k][2]))}</figure>`;
    const E = CS.exp, I = CS.impact;
    const EXP = `<section class="txt"><h2 class="rv">${esc(E[0])}</h2><div class="cols rv">${E[1].map(([h, p]) => `<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div></section>`;
    const INOTE = `<p class="inote">${CS.impactNote ? esc(CS.impactNote) : '<span class="todo">How these were measured, and over what period: to fill in</span>'}</p>`;
    const IMP = I ? `<section class="txt" id="s-imp"><h2 class="rv">Impact</h2><div class="rv">${I.stats ? `<div class="impact">${I.stats.map(([a, b]) => `<div><b data-n="${esc(a)}">${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>`
      : `<div class="cols">${I.list.map(([h, p]) => `<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>`}${INOTE}</div></section>` : '';
    const S4 = SH.slice(1, 5), FQ4 = ['88.1', '91.4', '94.7', '98.0'];
    const pinH = n => `style="height:${n * 90 + 40}vh"`;
    const CAPBOX = id => `<div class="pcap"><span class="mono sw" id="${id}i"></span><div class="sw" id="${id}x"><h3 id="${id}h"></h3><p id="${id}p"></p></div></div>`;
    const setCap = (id, n, lab, h, p) => swap([id + 'i', id + 'x'], () => { $(id + 'i').innerHTML = `<b>0${n}</b> · ${lab}`; $(id + 'h').textContent = h; $(id + 'p').textContent = p; });
    const prog = (sec, n, vh) => { const r = sec.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1) * (n - 1); return reduce ? Math.round(p) : held(p); };

    {   // Video + Flow + Camera: the landscape video opens it (see the hero), then the flow, the notes, and the camera picture
      const ST = [[.5, .5, 1, SH[0][1], SH[0][3]], [.3, .34, 2, E[1][0][0], E[1][0][1]], [.7, .46, 2.1, E[1][1][0], E[1][1][1]], [.5, .72, 1.8, SH[0][1], CS.blurb]];
      body.innerHTML = `<section class="flw" ${pinH(4)}><div class="pin"><div class="fwin"><div class="frow" id="frow">${S4.map((s, i) => `<div class="pn fcard${i === 1 || i === 2 ? ' tall' : ''}"><div class="in shotw">${shot(s[0])}</div><span class="fst mono">0${i + 1} · ${FQ4[i]}</span></div>`).join('')}</div><i class="fneedle"></i></div>
        ${CAPBOX('fc')}</div></section>${EXP}
        <section class="cam camonly still" id="camsec"><div class="pin"><div class="pn on fit" id="cpn"><div class="cw" id="cw">${shot(SH[0][0], 'shot camimg')}</div></div></div></section>`;
      const fsec = body.firstChild, row = $('frow'), cards = [...row.children], csec = $('camsec'), cw = $('cw');
      let fcur = -1, ccur = -1;
      tick = (dt, vh) => {
        const fh = row.clientHeight; cards.forEach(c => { const w = Math.round(fh * (c.classList.contains('tall') ? .8 : 1.5)); if (c.offsetWidth !== w) c.style.width = w + 'px'; });
        const q = prog(fsec, 4, vh), W = row.parentElement.clientWidth, i0 = Math.min(2, Math.floor(q)), t = q - i0;
        const mid = k => cards[k].offsetLeft + cards[k].offsetWidth / 2, m = mid(i0) + (mid(i0 + 1) - mid(i0)) * t;
        row.style.transform = `translate3d(${(W / 2 - m).toFixed(1)}px,0,0)`;
        cards.forEach((c, i) => { const d = Math.abs(q - i); c.style.opacity = (1 - Math.min(1, d) * .55).toFixed(3); c.style.transform = `scale(${(1 - Math.min(1, d) * .08).toFixed(3)})`; });
        const fc = Math.round(q);
        if (fc !== fcur) { fcur = fc; setCap('fc', fc + 1, FQ4[fc] + ' FM', S4[fc][1], S4[fc][3]); }
        /* the closing picture is still now (no camera moving across it)
        const sc = A[2] + (B[2] - A[2]) * u, fx = A[0] + (B[0] - A[0]) * u, fy = A[1] + (B[1] - A[1]) * u, bw = cw.offsetWidth, bh = cw.offsetHeight;
        cw.style.transform = `translate3d(${((.5 - fx) * bw * sc).toFixed(1)}px,${((.5 - fy) * bh * sc).toFixed(1)}px,0) scale(${sc.toFixed(3)})`;
        const cc = Math.round(r);
        if (cc !== ccur) { if (ccur >= 0) snd('detent'); ccur = cc; } */
      };
    }
    body.insertAdjacentHTML('beforeend', IMP);
  }
  if (V === 'tune') tick = buildTune();""")
    # hero: the first picture instead of the working prototype
    i = P.index("    // the opening screen is the working prototype"); j = P.index("    sizeCam();", i)
    P = P[:i] + """    const hero = $('hero');
    if (!hero.firstChild) {
      // the opening video: the case study's own landscape video (heroVideo in the CMS), else its first video
      const vs = (CS.heroVideo ? [{ video: CS.heroVideo, poster: CS.heroPoster || '' }, 'The feature', 'Video'] : SH.find(s => s[0] && s[0].video));
      if (vs) { hero.classList.add('vfirst'); if (CS.heroVideo) hero.classList.add('land'); hero.innerHTML = `<video class="vbig" src="${vs[0].video}" poster="${vs[0].poster || ''}" muted loop playsinline autoplay></video>`; $('hcap').textContent = vs[1] + ', in motion'; if (vs[2]) $('hfq').textContent = vs[2]; }
      else hero.innerHTML = `<div class="in shotw">${shot(heroM)}</div>`;
    }
""" + P[j:]
    # no working dial on a case study
    i = P.index("  // ---------- the working dial ----------"); j = P.index("  $('tools').innerHTML", i)
    P = P[:i] + P[j:]
    i = P.index("    // the working dial: a spring toward the target"); j = P.index("    // section dial\n", i)
    P = P[:i] + P[j:]
    rep("  $('tools').innerHTML = ['figma', 'claude', 'aftereffects'].map(", "  $('tools').innerHTML = tools.map(")
    rep("  const ttl = $('ttl'); ttl.innerHTML = ttl.textContent.split(' ')", "  const ttl = $('ttl'); ttl.textContent = CS.headline.replace(/<br>/g, ' '); ttl.innerHTML = ttl.textContent.split(' ')")
    # the opening run from the case study's pictures
    i = P.index("  const RCOLS = ["); j = P.index("  ];", i) + 4
    P = P[:i] + """  const SPL = [[.5, .5], [.62, .3], [.3, .72], [.7, .26]], RR = CS.run.slice(0, 8), RCOLS = [];
  for (let k = 0; k < RR.length; k += 2) RCOLS.push({ split: SPL[RCOLS.length % 4], top: RR[k], bot: RR[k + 1] || RR[0] });""" + P[j:]
    i = P.index("  const rslot = (s, n) => {"); j = P.index("  };", i) + 4
    P = P[:i] + """  const rslot = (m, n) => `<figure class="slot">${shot(m, '').replace(' decoding="async"', '')}<div class="lab mono"><span>${esc(CS.title)}</span><span>${String(n).padStart(2, '0')} · ${kindOf(m)}</span></div></figure>`;""" + P[j:]
    # the opening run: pictures pan a little sideways, never further than their overhang, so no edge shows
    rep("const cx = x + el.offsetLeft + colW / 2 - RW / 2, px = (-cx * .06).toFixed(1);", "const cx = x + el.offsetLeft + colW / 2 - RW / 2, px = clamp(-cx * .06, -48, 48).toFixed(1);")
    # each picture is fitted to the part of its slot that shows, so it is always whole and centred, never an empty band
    rep("t.firstElementChild.style.transform = `translate3d(${px}px,${(-(colH - cut) * .5).toFixed(1)}px,0)`;", "{ const ti = t.firstElementChild; ti.style.height = cut.toFixed(1) + 'px'; ti.style.transform = `translate3d(${px}px,0,0)`; }")
    rep("bo.firstElementChild.style.transform = `translate3d(${px}px,${(cut * .5).toFixed(1)}px,0)`;", "{ const bi = bo.firstElementChild; bi.style.top = cut.toFixed(1) + 'px'; bi.style.height = (colH - cut).toFixed(1) + 'px'; bi.style.transform = `translate3d(${px}px,0,0)`; }")
    # section dial: Intro, Overview, each section, Credits
    rep("  const SECN = ['Intro', 'Overview', SECX, 'Credits'];\n  const secs = ['s-over', 's-body', 's-cred'].map($);",
        "  const SECN = ['Intro', 'Overview', 'Screens', ...(CS.impact ? ['Impact'] : []), 'Credits'];\n  const secs = ['s-over', 's-body', ...(CS.impact ? ['s-imp'] : []), 's-cred'].map($);")
    rep("go(k ? secs[k - 1] : null, k === 2 && pinned ? 0 : 90)", "go(k ? secs[k - 1] : null, k === 2 ? 0 : 90)")
    rep("  addEventListener('resize', fill);", """  addEventListener('resize', fill);
  addEventListener('hashchange', () => location.reload());   // next case study (or version): same page, new address
  // Impact: each number counts up and locks in, with a detent, when it scrolls into view
  document.querySelectorAll('.impact b[data-n]').forEach(b => {
    const m = b.dataset.n.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/); if (!m || reduce) return;
    const end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, fmt = v => m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
    b.textContent = fmt(0);
    const ob = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; ob.disconnect();
      const t0 = performance.now(), D = 1400; let lastQ = -1;
      const step = now => { const t = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - t, 4), v = end * e; b.textContent = fmt(dec ? +v.toFixed(dec) : Math.round(v));
        const q = Math.floor(e * 5); if (q !== lastQ) { lastQ = q; }
        if (t < 1) requestAnimationFrame(step); else b.classList.add('count'); };
      requestAnimationFrame(step); }, { rootMargin: '0px 0px -20% 0px' });
    ob.observe(b);
  });""")
    # section dial at the bottom of the screen, as on the brand page: a horizontal ruler, the needle in the middle
    rep(".sdial { position: fixed; right: 0; top: 0; bottom: 0; width: 112px; z-index: 30 }", ".sdial { position: fixed; left: 0; right: 0; bottom: 0; height: 64px; z-index: 30; transition: background-color .4s } .sdial::before { content: \"\"; position: absolute; inset: -28px 0 0; background: linear-gradient(to top, var(--bg) 62%, transparent); opacity: 0; transition: opacity .4s; pointer-events: none } .sdial.bgd::before { opacity: 1 }")
    rep("@media (min-width: 900px) { .wrap { padding-right: max(var(--gut), 128px) } }", "")
    rep("@media (max-width: 899px) { .sdial { width: 38px } .wrap { padding-right: 44px } }", "")
    rep("    const r = sd.getBoundingClientRect(), k = clamp(Math.round(sp + (e.clientY - r.top - r.height / 2) / 150), 0, SECN.length - 1);",
        "    const r = sd.getBoundingClientRect(), k = clamp(Math.round(sp + (e.clientX - r.left - r.width / 2) / 150), 0, SECN.length - 1);")
    i = P.index("    const SP = 30, right = Wd - (Wd < 60 ? 8 : 18), col = ink(), mid = Hd / 2;"); j = P.index("    requestAnimationFrame(frame);", i)
    P = P[:i] + """    const SP = 30, base = Hd - 22, col = ink(), mid = Wd / 2;
    for (let q = -40; q <= (SECN.length - 1) * 5 + 40; q++) {
      const x = mid + q * SP - sp * 5 * SP; if (x < -10 || x > Wd + 10) continue;
      const major = q % 5 === 0 && q >= 0 && q < SECN.length * 5, d = Math.abs(x - mid) / SP;
      let L = 6 + Math.max(0, 6 - d) * 3; if (major) L = Math.max(L, 16);
      sx.strokeStyle = col; sx.globalAlpha = (major ? .5 : .16) + Math.max(0, 1 - d / 6) * .35; sx.lineWidth = major ? 2 : 1.2;
      sx.beginPath(); sx.moveTo(x, base); sx.lineTo(x, base - L); sx.stroke();
      if (major) { sx.globalAlpha = d < 2.5 ? 1 : .5; sx.fillStyle = col; sx.font = '500 9.5px "Geist Mono", monospace'; sx.textAlign = 'center'; sx.textBaseline = 'alphabetic'; sx.fillText(SECN[q / 5].toUpperCase(), x, base + 15); }
    }
    sx.globalAlpha = 1; sx.fillStyle = RED; sx.fillRect(mid - 1.5, base - 34, 3, 36);   // the needle
    sd.parentElement.classList.toggle('bgd', sp > .5);   // past the opening run, the text slides under a soft fade instead of the ruler
""" + P[j:]
    P = P.replace('__CASES__', json.dumps(CASES, ensure_ascii=False))
    return P
