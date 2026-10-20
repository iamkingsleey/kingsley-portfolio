// Kingsley FM · CMS. Everything here edits content/*.json through the little server in cms/server.py,
// then rebuilds the site. No framework: a small form builder and a view per section.
(function () {
  const $ = id => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c));
    return n;
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const api = async (path, opt = {}) => { const r = await fetch(path, opt); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
  const toast = (msg, bad) => { const t = $('toast'); t.textContent = msg; t.className = 'toast on' + (bad ? ' bad' : ''); clearTimeout(t._t); t._t = setTimeout(() => t.className = 'toast', 2600); };
  const slug = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isVid = p => /\.(mp4|webm|mov)(\?|$)/i.test(p || '');
  const src = p => !p ? '' : /^(https?:|data:)/.test(p) ? p : '/site/' + p;

  // ---------------------------------------------------------------- state
  let C = {}, SAVED = {}, INDEX = {}, LIB = null, HAS_TOKEN = false, route = 'dashboard', sub = null;
  const dirty = new Set();
  const touch = file => { dirty.add(file); paintDirty(); };
  function paintDirty() {
    $('dirty').hidden = !dirty.size;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('d', (b.dataset.files || '').split(',').some(f => dirty.has(f))));
  }
  addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });

  // ---------------------------------------------------------------- form builder
  // a field def: { k: key or index, label, type, help, options, rows, of (list item def), fields (object/tuple fields), def (new item) }
  function field(d, obj, file, onChange) {
    const get = () => obj[d.k], set = v => { obj[d.k] = v; touch(file); wrap.classList.add('changed'); onChange && onChange(v); };
    const wrap = el('div', { class: 'f' + (d.wide ? ' wide' : '') });
    if (d.label && d.type !== 'bool') wrap.append(el('label', { text: d.label }));
    if (d.help) wrap.append(el('div', { class: 'help', text: d.help }));
    const t = d.type || 'text';
    if (t === 'text' || t === 'number' || t === 'url') {
      wrap.append(el('input', { type: t === 'number' ? 'number' : 'text', step: d.step || 'any', placeholder: d.ph || '', value: get() ?? '', oninput: e => set(t === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value) }));
    } else if (t === 'textarea' || t === 'lines' || t === 'paras' || t === 'br') {
      // lines: one item per line · paras: paragraphs separated by an empty line · br: line breaks become <br>
      const to = v => t === 'lines' ? (v || []).join('\n') : t === 'paras' ? (v || []).join('\n\n') : t === 'br' ? String(v || '').replace(/<br\s*\/?>/g, '\n') : (v ?? '');
      const from = s => t === 'lines' ? s.split('\n').map(x => x.trim()).filter(Boolean) : t === 'paras' ? s.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean) : t === 'br' ? s.replace(/\n/g, '<br>') : s;
      wrap.append(el('textarea', { rows: d.rows || (t === 'paras' ? 6 : 3), placeholder: d.ph || '', oninput: e => set(from(e.target.value)) }, to(get())));
    } else if (t === 'select') {
      const s = el('select', { onchange: e => set(e.target.value) }, (typeof d.options === 'function' ? d.options() : d.options).map(([v, n]) => el('option', { value: v, selected: String(get() ?? '') === String(v) }, n)));
      wrap.append(s);
    } else if (t === 'bool') {
      wrap.append(el('label', { class: 'toggle' }, el('input', { type: 'checkbox', checked: !!get(), onchange: e => set(e.target.checked) }), d.label));
    } else if (t === 'color') {
      const tx = el('input', { type: 'text', value: get() || '', oninput: e => { set(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) pk.value = e.target.value; } });
      const pk = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(get() || '') ? get() : '#000000', oninput: e => { tx.value = e.target.value; set(e.target.value); } });
      wrap.append(el('div', { class: 'color' }, pk, tx));
    } else if (t === 'media') {
      wrap.append(d.rich ? richMedia(get(), v => set(v), { ...d, _file: file }) : mediaField(get(), v => set(v), d));
    } else if (t === 'tuple') {   // a fixed-length array shown side by side, e.g. [value, label]
      if (!Array.isArray(get())) obj[d.k] = d.fields.map(f => f.blank ?? '');
      const arr = get();
      const row = el('div', { class: 'tuple', style: `--n:${d.cols || d.fields.length}` });
      d.fields.forEach((f, i) => row.append(field({ ...f, k: i }, arr, file, () => { wrap.classList.add('changed'); onChange && onChange(arr); })));
      wrap.append(row);
    } else if (t === 'object') {
      if (!get() || typeof get() !== 'object') obj[d.k] = {};
      const o = get(), box = el('div', { class: d.cols ? 'row' + d.cols : 'form', style: 'gap:14px' });
      d.fields.forEach(f => box.append(field(f, o, file, () => onChange && onChange(o))));
      wrap.append(box);
    } else if (t === 'list') {
      if (!Array.isArray(get())) obj[d.k] = [];
      wrap.append(listField(get(), d, file, () => { touch(file); wrap.classList.add('changed'); onChange && onChange(get()); }));
    }
    return wrap;
  }
  function form(defs, obj, file) {   // defs: groups [{ title, help, cols, fields, when }]
    const f = el('div', { class: 'form' });
    const paint = () => {
      f.innerHTML = '';
      for (const g of defs) {
        if (g.when && !g.when(obj)) continue;
        const box = el('div', { class: 'group' }, g.title && el('h2', { text: g.title }), g.help && el('p', { class: 'help', text: g.help }));
        let row = null;
        for (const d of g.fields) {
          if (d.when && !d.when(obj)) continue;
          const node = field(d, obj, file, d.repaint ? () => paint() : null);
          if (g.cols && !d.full) { if (!row || row.children.length >= g.cols) { row = el('div', { class: 'row' + g.cols }); box.append(row); } row.append(node); }
          else { row = null; box.append(node); }
        }
        f.append(box);
      }
    };
    paint(); return f;
  }
  function listField(arr, d, file, changed) {
    const box = el('div', { class: 'list' });
    const title = (it, i) => (d.title ? d.title(it, i) : '') || `${d.itemLabel || 'Item'} ${i + 1}`;
    const paint = () => {
      box.innerHTML = '';
      arr.forEach((it, i) => {
        const body = el('div', { class: 'body' });
        const holder = { v: it };
        const item = el('div', { class: 'item' + (d.open ? '' : ' closed') },
          el('header', { onclick: e => { if (!e.target.closest('.ib')) item.classList.toggle('closed'); } },
            el('span', { class: 'chev', text: '▾' }), el('b', { text: title(it, i) }),
            el('span', { class: 'ib' },
              el('button', { type: 'button', title: 'Move up', text: '↑', onclick: () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; changed(); paint(); } } }),
              el('button', { type: 'button', title: 'Move down', text: '↓', onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; changed(); paint(); } } }),
              el('button', { type: 'button', title: 'Duplicate', text: '⧉', onclick: () => { arr.splice(i + 1, 0, clone(arr[i])); changed(); paint(); } }),
              el('button', { type: 'button', title: 'Remove', text: '✕', onclick: () => { if (confirm('Remove "' + title(it, i) + '"?')) { arr.splice(i, 1); changed(); paint(); } } }))),
          body);
        const of = d.of;
        if (of.type === 'object') of.fields.forEach(f => body.append(field(f, it, file, () => { item.querySelector('b').textContent = title(it, i); changed(); })));
        else body.append(field({ ...of, k: i, label: '' }, arr, file, () => { item.querySelector('b').textContent = title(arr[i], i); changed(); }));
        box.append(item);
      });
      box.append(el('button', { class: 'btn ghost small addrow', type: 'button', text: '+ Add ' + (d.itemLabel || 'item').toLowerCase(), onclick: () => { arr.push(typeof d.def === 'function' ? d.def() : clone(d.def ?? '')); changed(); paint(); box.querySelectorAll('.item')[arr.length - 1].classList.remove('closed'); } }));
    };
    paint(); return box;
  }

  // ---------------------------------------------------------------- pictures and videos
  function preview(p) {
    if (p && typeof p === 'object') { if (p.color) { const b = el('div', { class: 'pv', text: p.word || '' }); b.style.background = p.color; b.style.color = p.ink || '#fff'; return b; } p = p.poster || p.video; }
    if (!p) return el('div', { class: 'pv', text: 'None' });
    const pv = el('div', { class: 'pv' });
    pv.append(isVid(p) ? el('video', { src: src(p), muted: true, loop: true, autoplay: true, playsinline: true }) : el('img', { src: src(p), alt: '', loading: 'lazy' }));
    return pv;
  }
  function mediaField(value, set, d = {}) {
    const box = el('div', { class: 'media' });
    const paint = v => {
      box.innerHTML = '';
      const inp = el('input', { type: 'text', value: v || '', placeholder: 'assets/… or https://…', onchange: e => { set(e.target.value); paint(e.target.value); } });
      box.append(preview(v), el('div', { class: 'mb' }, inp, el('div', { class: 'mbtn' },
        el('button', { class: 'btn ghost small', type: 'button', text: 'Upload…', onclick: () => upload(d.accept, (p, meta) => { set(p); paint(p); d.onMeta && d.onMeta(meta); }) }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Choose from library', onclick: () => library(p => { set(p); paint(p); measure(p).then(m => d.onMeta && d.onMeta(m)); }) }),
        v && el('button', { class: 'btn ghost small', type: 'button', text: 'Remove', onclick: () => { set(''); paint(''); } }))));
    };
    paint(value); return box;
  }
  // a picture, a video with its poster, or a coloured block with a word: the three things a case-study slot can hold
  function richMedia(value, set, d) {
    const box = el('div', { class: 'form', style: 'gap:10px' });
    const kindOf = v => v && typeof v === 'object' ? (v.video != null ? 'video' : 'block') : 'picture';
    const paint = v => {
      box.innerHTML = ''; const k = kindOf(v);
      const tabs = el('div', { class: 'tabs', style: 'justify-self:start' });
      [['picture', 'Picture'], ['video', 'Video'], ['block', 'Colour block']].forEach(([kk, n]) => tabs.append(el('button', { type: 'button', class: k === kk ? 'on' : '', text: n, onclick: () => {
        if (kk === k) return; const nv = kk === 'picture' ? (typeof v === 'object' ? v.poster || '' : v) : kk === 'video' ? { video: '', poster: typeof v === 'string' ? v : (v && v.poster) || '' } : { color: '#111111', word: '', ink: '' };
        set(nv); paint(nv); } })));
      box.append(tabs);
      if (k === 'picture') box.append(mediaField(v, nv => { set(nv); }, { accept: 'image/*' }));
      else if (k === 'video') {
        box.append(el('div', { class: 'f' }, el('label', { text: 'Video' }), mediaField(v.video, nv => { v.video = nv; set(v); }, { accept: 'video/*' })),
          el('div', { class: 'f' }, el('label', { text: 'Poster (shown while it loads)' }), mediaField(v.poster, nv => { v.poster = nv; set(v); }, { accept: 'image/*' })));
      } else {
        const o = v; const g = el('div', { class: 'row3' });
        [{ k: 'color', label: 'Colour', type: 'color' }, { k: 'word', label: 'Word on it' }, { k: 'ink', label: 'Text colour (optional)', type: 'color' }].forEach(f => g.append(field(f, o, d._file, () => set(o))));
        box.append(g);
      }
    };
    paint(value); return box;
  }
  // size and main colour of a picture, so a new design piece sits right on the dial
  function measure(p) {
    return new Promise(res => {
      if (!p) return res({});
      if (isVid(p)) { const v = document.createElement('video'); v.onloadedmetadata = () => res({ ratio: +(v.videoWidth / v.videoHeight).toFixed(4), video: true }); v.onerror = () => res({ video: true }); v.src = src(p); return; }
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => {
        const out = { ratio: +(im.naturalWidth / im.naturalHeight).toFixed(4) };
        try { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; r /= n; g /= n; b /= n;
          out.bg = '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); out.dark = (r * 299 + g * 587 + b * 114) / 1000 < 150; } catch (_) {}
        res(out);
      };
      im.onerror = () => res({}); im.src = src(p);
    });
  }
  // pictures are made web-ready before they're uploaded: at most 2000px on the long side, and a JPEG unless they have
  // see-through parts (then PNG), so a 3 MB render becomes a few hundred KB and the site stays quick
  async function webReady(f) {
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return f;
    const bmp = await createImageBitmap(f).catch(() => null); if (!bmp) return f;
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, w, h);
    let alpha = false;
    if (f.type !== 'image/jpeg') { const d = cx.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) { alpha = true; break; } }
    const type = alpha ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => cv.toBlob(r, type, .86));
    if (!blob || (k === 1 && blob.size >= f.size)) return f;   // already small: keep the original
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + (alpha ? '.png' : '.jpg'), { type });
  }
  function upload(accept, done) {
    const i = el('input', { type: 'file', accept: accept || 'image/*,video/*' });
    i.onchange = async () => {
      let f = i.files[0]; if (!f) return;
      toast('Uploading ' + f.name + '…');
      f = await webReady(f);
      try { const r = await api('/api/upload?name=' + encodeURIComponent(f.name), { method: 'POST', body: f }); LIB = null; done(r.path, await measure(r.path)); toast('Uploaded'); }
      catch (e) { toast(e.message, true); }
    };
    i.click();
  }
  async function library(pick) {
    if (!LIB) LIB = (await api('/api/media')).files;
    const q = el('input', { class: 'search', placeholder: 'Search pictures and videos' }), grid = el('div', { class: 'lib' });
    const paint = () => { grid.innerHTML = ''; LIB.filter(f => f.path.toLowerCase().includes(q.value.toLowerCase())).slice(0, 300).forEach(f => grid.append(el('button', { type: 'button', onclick: () => { closeModal(); pick(f.path); } }, preview(f.path), el('span', { text: f.path.replace('assets/', '') })))); };
    q.oninput = paint; paint();
    openModal('Library', el('div', { class: 'form', style: 'gap:14px' }, el('div', { class: 'bar' }, q, el('button', { class: 'btn ghost small', type: 'button', text: 'Upload new…', onclick: () => upload('', p => { closeModal(); pick(p); }) })), grid));
  }
  function openModal(t, body) { $('mtitle').textContent = t; $('mbody').innerHTML = ''; $('mbody').append(body); $('modal').hidden = false; }
  function closeModal() { $('modal').hidden = true; }
  $('mclose').onclick = closeModal; $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });

  // ---------------------------------------------------------------- schemas
  const mname = p => !p ? 'empty' : typeof p === 'object' ? (p.color ? 'Colour · ' + (p.word || p.color) : 'Video · ' + String(p.video || '').split('/').pop()) : String(p).split('/').pop().split('?')[0];
  const CASE_SLUGS = () => [['', 'None'], ...(C.cases.cases || []).map(c => [c.slug, c.title]),
    ...((C.designs && C.designs.projects) || []).filter(p => p.caseStudy).map(p => [p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), p.title])];
  const PAIR = (a, b) => ({ type: 'tuple', fields: [{ label: a }, { label: b }] });
  const CASE = [
    { title: 'Basics', cols: 2, fields: [
      { k: 'title', label: 'Title' }, { k: 'slug', label: 'Address', help: 'The page link: case.html#this. Lowercase, no spaces.' },
      { k: 'kind', label: 'Type', type: 'select', options: [['Product', 'Product case study'], ['Brand', 'Brand case study']], repaint: true },
      { k: 'fq', label: 'Station', help: 'Its frequency on the Projects dial, e.g. 88.1' },
      { k: 'tag', label: 'Tag', help: 'Shown after the type, e.g. Marketplace' }, { k: 'role', label: 'My role' },
      { k: 'year', label: 'Year', ph: '2024 or 2020 – Now' }, { k: 'client', label: 'Client' },
      { k: 'industry', label: 'Industry', type: 'lines', rows: 2, help: 'One per line' }, { k: 'did', label: 'What I did', type: 'lines', rows: 3, help: 'One per line' },
      { k: 'hidden', label: 'Hide this case study from the site', type: 'bool', full: true } ] },
    { title: 'Opening', fields: [
      { k: 'headline', label: 'Headline', type: 'br', rows: 2, help: 'Press Enter for a line break' }, { k: 'blurb', label: 'Summary', type: 'textarea' },
      { k: 'stat', label: 'Headline number', ...PAIR('Number', 'What it counts') }, { k: 'cover', label: 'Cover picture', type: 'media', rich: true, help: 'Shown on Projects and Designs' } ] },
    { title: 'Story', fields: [
      { k: 'story', label: 'The brief', type: 'tuple', cols: 1, fields: [{ label: 'Heading' }, { label: 'Paragraphs', type: 'paras', help: 'Leave an empty line between paragraphs' }] },
      { k: 'problem', label: 'The brief · Problem', type: 'textarea' }, { k: 'goal', label: 'The brief · Goal', type: 'textarea' },
      { k: 'statement', label: 'Statement', type: 'textarea', rows: 2, help: 'One line set large mid-page (product: the design principle; brand: the scrolling ticker)' } ] },
    { title: 'Sections', help: 'The chapters of the case study, in order. Add, remove, reorder or duplicate them. Each can have text, points, numbers and pictures; leave a part empty to skip it.', fields: [
      { k: 'sections', label: '', type: 'list', itemLabel: 'Section', def: () => ({ h: '', p: [], media: [] }), title: (s, i) => `${i + 1} · ${s.h || 'Untitled section'}`, of: { type: 'object', fields: [
        { k: 'h', label: 'Heading', help: 'e.g. Overview, Pain points, UX strategy, High fidelity, Impact, Logo, Colour and type, Mockups' },
        { k: 'title', label: 'Title on the page (product, optional)', help: 'Leave empty for the default, e.g. Pain points shows as “Listening to users”' },
        { k: 'p', label: 'Text', type: 'paras', rows: 4, help: 'Leave an empty line between paragraphs' },
        { k: 'list', label: 'Points (optional)', type: 'list', itemLabel: 'Point', def: () => ['', ''], title: x => x[0] || 'Point', of: PAIR('Title', 'Text') },
        { k: 'stats', label: 'Big numbers (optional)', type: 'list', itemLabel: 'Number', def: () => ['', ''], title: x => (x[0] + ' ' + x[1]).trim() || 'Number', help: 'Shown large, counting up, e.g. 72% · fewer fraud complaints', of: PAIR('Number', 'What it means') },
        { k: 'chips', label: 'Colour or type names (brand, optional)', type: 'lines', rows: 2, help: 'One per line' },
        { k: 'media', label: 'Pictures and videos', type: 'list', itemLabel: 'Picture', def: '', title: (m, i) => `${i + 1} · ${mname(m)}`, of: { type: 'media', rich: true } }] } } ] },
    { title: 'Extra pictures', help: 'Spare pictures the page uses to pair with a picture that would otherwise sit alone, so every row runs edge to edge.', fields: [
      { k: 'run', label: '', type: 'list', itemLabel: 'Picture', def: '', title: (p, i) => `${i + 1} · ${mname(p)}`, of: { type: 'media', rich: true } } ] },
    { title: 'Screens', when: () => false, help: 'In order: 1 the wide hero, 2 wide, 3 and 4 tall (side by side), 5 wide. Each has a label, where it lives, and a note.', fields: [
      { k: 'shots', label: '', type: 'list', itemLabel: 'Screen', def: () => ['', '', '', ''], title: (s, i) => `${i + 1} · ${s[1] || 'Untitled'}`,
        of: { type: 'tuple', cols: 1, fields: [{ label: 'Picture, video or colour block', type: 'media', rich: true }, { label: 'Label' }, { label: 'Where', ph: 'Mobile, Web, Brand…' }, { label: 'Note', type: 'textarea', rows: 2 }] } } ] },
    { title: 'Product page', when: () => false, fields: [
      { k: 'heroVideo', label: 'Opening video', type: 'media', accept: 'video/*', help: 'Landscape works best. Leave empty to open on the first screen.' },
      { k: 'heroPoster', label: 'Video poster (shown while it loads)', type: 'media', accept: 'image/*' },
      { k: 'exp', label: 'Feature notes', type: 'tuple', cols: 1, fields: [{ label: 'Heading' }, { label: 'Notes', type: 'list', itemLabel: 'Note', def: () => ['', ''], title: n => n[0], of: { type: 'tuple', cols: 1, fields: [{ label: 'Title' }, { label: 'Text', type: 'textarea', rows: 2 }] } }] } ] },
    { title: 'Impact note', when: o => o.kind !== 'Brand', help: 'Put the big numbers in a section (Sections → Big numbers). This note sits under them.', fields: [
      { k: '_imp', label: 'Numbers', when: () => false, type: 'list', itemLabel: 'Number', def: () => ['', ''], title: s => s[0] + ' ' + s[1], of: PAIR('Number', 'What it means') },
      { k: 'impactNote', label: 'How these were measured', type: 'textarea', rows: 2 } ] },
    { title: 'Brand page', when: o => o.kind === 'Brand', cols: 2, fields: [
      { k: 'brandVer', label: 'Sections', when: () => false, type: 'object', cols: 2, full: true, fields: [
        { k: 'info', label: 'Opening', type: 'select', options: [['split', 'Split'], ['sheet', 'Sheet'], ['read', 'Read along'], ['stations', 'Stations']] },
        { k: 'type', label: 'Type', type: 'select', options: [['dial', 'Dial'], ['ticker', 'Ticker'], ['specimen', 'Specimen']] },
        { k: 'col', label: 'Colour', type: 'select', options: [['dial', 'Dial'], ['swatch', 'Swatches']] },
        { k: 'mark', label: 'Mark', type: 'select', options: [['sketch', 'Sketch → final'], ['still', 'Still']] }] },
      { k: 'typeView', label: 'Type section', type: 'select', full: true, options: [['weights', 'Weights (default)'], ['tester', 'Tester'], ['pairing', 'Pairing']], help: 'How the typefaces are shown on the brand page' },
      { k: 'type', label: 'Typefaces', full: true, type: 'list', itemLabel: 'Typeface', def: () => ['Primary', ''], title: t => t[0] + ' · ' + t[1], help: 'Primary first, then Secondary', of: PAIR('Role', 'Font name') },
      { k: 'colors', label: 'Brand colours', full: true, help: 'Leave empty to sample colours from the pictures.', type: 'list', itemLabel: 'Colour', def: () => ['', '#000000'], title: c => c[0] + ' ' + c[1], of: { type: 'tuple', fields: [{ label: 'Name' }, { label: 'Hex', type: 'color' }] } } ] }
  ];
  const DESIGN = [
    { title: 'The piece', cols: 2, fields: [
      { k: 'title', label: 'Title' },
      { k: 'category', label: 'Category', type: 'select', options: [['3d', '3D'], ['illustration', 'Illustration'], ['poster', 'Poster'], ['brand', 'Brand'], ['motion', 'Motion'], ['product', 'Case study']] },
      { k: 'year', label: 'Year' }, { k: 'case', label: 'Part of a collection or case study', type: 'select', options: CASE_SLUGS, help: 'A collection (e.g. 3D collection): its pieces share arrows and a grid on Designs. A product or brand case study: adds “Read case study”.' },
      { k: 'desc', label: 'Project info', type: 'textarea', full: true },
      { k: 'caseStudy', label: 'Show as a case study (it opens its layout page, set under “Opens”)', type: 'bool', full: true },
      { k: 'hidden', label: 'Hide this piece from the site', type: 'bool', full: true } ] },
    { title: 'Picture', fields: [ { k: '_img', label: 'Picture', type: 'media', accept: 'image/*', help: 'Its shape and colour are read automatically when you upload.' },
      { k: '_vid', label: 'Video (optional)', type: 'media', accept: 'video/*', help: 'If set, the video plays and the picture is its poster.' },
      { k: '_more', label: 'More pictures (optional)', type: 'list', itemLabel: 'Picture', def: '', title: (m, i) => `${i + 2} · ${mname(m)}`, help: 'With more than one picture, the piece on Designs gets arrows and a grid of all its pictures under it.', of: { type: 'media', accept: 'image/*' } } ] },
    { title: 'On the dial', cols: 3, fields: [ { k: '_ratio', label: 'Shape (width ÷ height)', type: 'number', help: '0.8 tall · 1.5 wide' }, { k: 'bg', label: 'Background colour', type: 'color' }, { k: 'dark', label: 'Dark picture (light text over it)', type: 'bool' } ] },
    { title: 'Credits', fields: [ { k: 'credits', label: '', type: 'list', itemLabel: 'Credit', def: () => ['', ''], title: c => c.join(' · '), of: PAIR('Role', 'Name') } ] },
    { title: 'Opens', help: 'By default a piece opens its own page on Designs. Point it somewhere else here.', cols: 2, fields: [
      { k: 'link', label: 'Open this page instead', ph: 'case.html#kusnap' },
      { k: 'layout', label: 'Or a layout page', type: 'select', options: [['', 'None'], ['logo', 'Logo'], ['product-panels', 'Product · panels'], ['product-story', 'Product · story'], ['illustration', 'Illustration'], ['3d', '3D']] } ] }
  ];
  const CHAPTER = { type: 'object', fields: [
    { k: 'where', label: 'Where' }, { k: 'role', label: 'Role' }, { k: 'years', label: 'Years', ph: '2020 – Now' }, { k: 'fq', label: 'Station', ph: '88.1' },
    { k: 'what', label: 'What I did there', type: 'textarea' },
    { k: 's1', type: 'tuple', label: 'Number (optional)', fields: [{ label: 'Number' }, { label: 'Label' }] },
    { k: 's2', type: 'tuple', label: 'Second number (optional)', fields: [{ label: 'Number' }, { label: 'Label' }] },
    { k: 'hidden', label: 'Hide', type: 'bool' } ] };
  const TOOL = { type: 'object', fields: [
    { k: 'name', label: 'Name' }, { k: 'type', label: 'Kind', ph: 'Figma plugin' }, { k: 'fq', label: 'Station', ph: '88.1' }, { k: 'tech', label: 'Made with', ph: 'TypeScript · Figma API' },
    { k: 'what', label: 'What it does', type: 'textarea' }, { k: 's', type: 'tuple', label: 'Number (optional)', fields: [{ label: 'Number' }, { label: 'Label' }] }, { k: 'link', label: 'Link (optional)', ph: 'https://www.figma.com/community/plugin/…' }, { k: 'linkLabel', label: 'Link button text', ph: 'Get it on Figma' }, { k: 'hidden', label: 'Hide', type: 'bool' } ] };
  const PAGEINTRO = [{ title: 'Page', fields: [{ k: 'statement', label: 'Statement', type: 'textarea', rows: 3 }, { k: 'title', label: 'List heading' }, { k: 'sub', label: 'Under the heading' }, { k: 'tag', label: 'Small tag on the right' }] }];

  // stored shapes ↔ friendlier shapes for the forms (put back on save)
  function prep() {
    for (const c of C.cases.cases || []) { if (c.impact === undefined) c.impact = null; c._imp = (c.impact && c.impact.stats) || []; }
    for (const p of C.designs.projects || []) { const im = (p.images = p.images && p.images.length ? p.images : [{ src: '', ratio: .8 }])[0]; p._img = im.src; p._vid = im.video || ''; p._ratio = im.ratio; p._more = p.images.slice(1).map(x => x.src); }
    for (const ch of C.about.chapters || []) { ch.s1 = [ch.stat || '', ch.statLabel || '']; ch.s2 = [ch.stat2 || '', ch.stat2Label || '']; }
    for (const t of C.engineering.tools || []) t.s = [t.stat || '', t.statLabel || ''];
  }
  function pack(name) {
    const d = clone(C[name]);
    if (name === 'cases') for (const c of d.cases) {
      c.page = c.kind === 'Brand' ? 'brand.html' : 'case.html'; if (c.kind !== 'Brand') c.ver = 'mix'; else c.brandVer = Object.assign({ info: 'split', type: 'dial', col: 'dial', mark: 'sketch' }, c.brandVer);
      if (c.kind !== 'Brand') c.impact = c._imp && c._imp.length ? { stats: c._imp } : (c.impact && c.impact.list ? c.impact : null);
      if (!c.slug) c.slug = slug(c.title); delete c._imp;
      if (c.colors && !c.colors.length) delete c.colors;
      for (const sec of c.sections || []) for (const k of ['list', 'stats', 'chips', 'p']) if (Array.isArray(sec[k]) && !sec[k].length) delete sec[k];   // an empty part is skipped on the page
    }
    if (name === 'designs') for (const p of d.projects) {
      const im = p.images[0]; im.src = p._img; if (p._vid) im.video = p._vid; else delete im.video; if (p._ratio) im.ratio = +p._ratio;
      { const old = Object.fromEntries(p.images.slice(1).map(x => [x.src, x])); p.images = [p.images[0], ...(p._more || []).filter(Boolean).map(src => old[src] || { src, ratio: .8 })]; }
      delete p._img; delete p._vid; delete p._ratio; delete p._more; for (const k of ['case', 'link', 'layout', 'year', 'caseStudy']) if (!p[k]) delete p[k];
    }
    if (name === 'about') for (const ch of d.chapters) { [ch.stat, ch.statLabel] = ch.s1; [ch.stat2, ch.stat2Label] = ch.s2; delete ch.s1; delete ch.s2; }
    if (name === 'engineering') for (const t of d.tools) { [t.stat, t.statLabel] = t.s; delete t.s; }
    return d;
  }

  // ---------------------------------------------------------------- views
  const NAV = [
    ['grp', 'Overview'], ['dashboard', 'Analytics', ''],
    ['grp', 'Content'], ['cases', 'Case studies', 'cases'], ['designs', 'Designs', 'designs'], ['about', 'About', 'about'], ['engineering', 'Engineering', 'engineering'], ['projects', 'Projects page', 'projects'],
    ['grp', 'Everything else'], ['text', 'Page text', 'text'], ['media', 'Pictures & videos', 'media'],
    ['grp', 'Site'], ['publish', 'Publish', ''], ['settings', 'Settings', 'site']
  ];
  function nav() {
    const n = $('nav'); n.innerHTML = '';
    for (const [k, label, files] of NAV) {
      if (k === 'grp') { n.append(el('div', { class: 'grp mono', text: label })); continue; }
      n.append(el('button', { type: 'button', class: route === k ? 'on' : '', 'data-files': files, onclick: () => go(k) }, label, el('i')));
    }
    paintDirty();
  }
  function go(r, s = null) { route = r; sub = s; nav(); render(); scrollTo(0, 0); try { history.replaceState(null, '', '#' + r + (s != null ? '/' + s : '')); } catch (_) {} }
  const head = (crumb, title) => { $('crumb').textContent = crumb; $('title').textContent = title; };
  function render() {
    const v = $('view-root'); v.innerHTML = '';
    ({ dashboard: vDash, publish: vPublish, cases: vCases, designs: vDesigns, about: vAbout, engineering: vEng, projects: vProjects, text: vText, media: vMedia, settings: vSettings }[route] || vDash)(v);
  }

  function thumb(m) { const d = el('div', { class: 'th' }); if (!m) return d; if (typeof m === 'object' && m.color) { d.style.background = m.color; d.style.color = m.ink || '#fff'; d.textContent = m.word || ''; return d; } if (typeof m === 'object') m = m.poster || m.video || ''; if (isVid(m)) d.append(el('video', { src: src(m), muted: true, autoplay: true, loop: true, playsinline: true })); else d.style.backgroundImage = `url("${src(m)}")`; return d; }

  function vCases(v) {
    const list = C.cases.cases;
    if (sub != null && list[sub]) {
      const c = list[sub]; head('Case studies', c.title || 'New case study');
      // two ways to edit: right on the page (click any words and type; click pictures to open their section), or the full form
      let mode = (() => { try { return localStorage.getItem('cms-case-mode') || 'page'; } catch (_) { return 'page'; } })();
      const body = el('div');
      const tabs = el('div', { class: 'seg' }, ...[['page', 'On the page'], ['form', 'Form']].map(([k, n]) => el('button', { type: 'button', class: 'seg-b', 'data-k': k, text: n, onclick: () => setMode(k) })));
      const setMode = (k, focusPath) => { mode = k; try { localStorage.setItem('cms-case-mode', k); } catch (_) {} tabs.querySelectorAll('.seg-b').forEach(b => b.classList.toggle('on', b.dataset.k === k)); paintBody(focusPath); };
      const pageUrl = `/site/${c.kind === 'Brand' ? 'brand' : 'case'}.html?cms=1#${c.slug}`;
      function paintBody(focusPath) {
        body.innerHTML = ''; if (window._kmCmsMsg) removeEventListener('message', window._kmCmsMsg);
        if (mode === 'form') { const f = form(CASE, c, 'cases'); body.append(f);
          if (focusPath) { const m = /^sections\.(\d+)/.exec(focusPath); const grp = [...f.querySelectorAll('.group')].find(g => g.querySelector('h2') && g.querySelector('h2').textContent === 'Sections');
            if (grp && m) { const it = grp.querySelectorAll(':scope .list > .item')[+m[1]]; if (it) { it.classList.remove('closed'); setTimeout(() => it.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); it.classList.add('flash'); setTimeout(() => it.classList.remove('flash'), 1600); } } }
          return; }
        const note = el('p', { class: 'help', text: 'Click any words on the page and type. Click a picture to replace or remove it, or “+ Add picture” to add one to that section. Changes are kept as you go; press Save & rebuild when you are done.' });
        const fr = el('iframe', { class: 'pageedit', src: pageUrl, title: 'Edit ' + c.title + ' on the page' });
        const send = () => { try { fr.contentWindow.postMessage({ type: 'km-cms-data', cases: clone(C.cases.cases) }, '*'); } catch (_) {} };
        window._kmCmsMsg = e => { if (e.source !== fr.contentWindow) return; const d = e.data || {};
          if (d.type === 'km-cms-ready') send();
          if (d.type === 'km-cms-edit' && d.slug === c.slug) { const keys = d.path.split('.'); let o = c;
            for (let k = 0; k < keys.length - 1; k++) { const nk = keys[k + 1], key = /^\d+$/.test(keys[k]) ? +keys[k] : keys[k]; if (o[key] == null) o[key] = /^\d+$/.test(nk) ? [] : {}; o = o[key]; }
            const last = keys[keys.length - 1]; o[/^\d+$/.test(last) ? +last : last] = d.value; touch('cases'); }
          if (d.type === 'km-cms-pick' && d.slug === c.slug) setMode('form', d.path);
          if ((d.type === 'km-cms-media' || d.type === 'km-cms-add') && d.slug === c.slug) pictureSheet(d); };
        // a picture clicked on the page: find where it lives in the case study, then replace or remove it in a small sheet
        const same = (m, src) => m && (typeof m === 'string' ? m === src : m.video === src || m.poster === src);
        const locate = (src, secPath) => {
          const si = secPath ? +secPath.split('.')[1] : -1, secs = c.sections || [];
          const inSec = k => { const j = (secs[k] && secs[k].media || []).findIndex(m => same(m, src)); return j >= 0 ? { arr: secs[k].media, j, label: secs[k].h || 'Section ' + (k + 1) } : null; };
          if (si >= 0) { const r = inSec(si); if (r) return r; }
          for (let k = 0; k < secs.length; k++) { const r = inSec(k); if (r) return r; }
          if (same(c.cover, src)) return { obj: c, key: 'cover', label: 'Cover picture' };
          const j = (c.run || []).findIndex(m => same(m, src)); if (j >= 0) return { arr: c.run, j, label: 'Extra pictures' };
          return null; };
        function pictureSheet(d) {
          let where;
          if (d.type === 'km-cms-add') { const si = +d.section.split('.')[1], sec = (c.sections || [])[si]; if (!sec) return; sec.media = sec.media || []; where = { arr: sec.media, j: sec.media.length, label: sec.h || 'Section', adding: true }; }
          else where = locate(d.src, d.section);
          if (!where) { alert('This picture is filled in by the page from your other pictures. Change it in the Form.'); return; }
          const get = () => where.obj ? where.obj[where.key] : where.arr[where.j];
          const put = v => { if (where.obj) where.obj[where.key] = v; else where.arr[where.j] = v; touch('cases'); };
          const close = () => { m.remove(); if (where.adding && !get()) where.arr.splice(where.j, 1); send(); };
          const m = el('div', { class: 'modal', onclick: e => { if (e.target === m) close(); } },
            el('div', { class: 'sheet', style: 'width:min(640px,100%)' },
              el('header', {}, el('b', { text: (where.adding ? 'Add a picture · ' : 'Picture · ') + where.label }), el('button', { class: 'x', type: 'button', text: '×', onclick: close })),
              el('div', { class: 'mbody form', style: 'gap:14px' },
                richMedia(get() || '', v => { put(v); }, { rich: true, _file: 'cases' }),
                el('div', { class: 'acts', style: 'display:flex;gap:8px;justify-content:flex-end' },
                  !where.obj && !where.adding ? el('button', { class: 'btn danger small', type: 'button', text: 'Remove from page', onclick: () => { if (!confirm('Remove this picture?')) return; where.arr.splice(where.j, 1); touch('cases'); m.remove(); send(); } }) : null,
                  el('button', { class: 'btn small', type: 'button', text: 'Done', onclick: close })))));
          document.body.append(m);
        }
        addEventListener('message', window._kmCmsMsg);
        body.append(note, fr);
      }
      v.append(el('button', { class: 'back', type: 'button', text: '← All case studies', onclick: () => go('cases') }),
        el('div', { class: 'headrow' }, el('h2', { text: c.title }), el('div', { class: 'acts' }, tabs,
          el('a', { class: 'btn ghost small', href: `/site/${c.kind === 'Brand' ? 'brand' : 'case'}.html#${c.slug}`, target: '_blank', text: 'Preview ↗' }),
          el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: () => { if (confirm('Delete this case study?')) { list.splice(sub, 1); touch('cases'); go('cases'); } } }))),
        body);
      setMode(mode);
      return;
    }
    head('Content', 'Case studies');
    v.append(el('p', { class: 'lead', text: 'The case studies on Projects. Product ones open the product page, brand ones the brand page. Use the arrows to change the order.' }));
    const g = el('div', { class: 'grid' });
    list.forEach((c, i) => g.append(el('div', { class: 'card' + (c.hidden ? ' hid' : '') },
      el('button', { type: 'button', style: 'all:unset;display:block;cursor:pointer;width:100%', onclick: () => go('cases', i) }, thumb(c.cover), el('div', { class: 'cx' }, el('b', { text: c.title }), el('span', { class: 'mono', text: `${c.fq} · ${c.kind}${c.hidden ? ' · hidden' : ''}` }))),
      el('div', { style: 'display:flex;gap:4px;padding:0 10px 10px' },
        el('button', { class: 'btn ghost small', type: 'button', text: '←', title: 'Earlier', onclick: () => { if (i) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; touch('cases'); render(); } } }),
        el('button', { class: 'btn ghost small', type: 'button', text: '→', title: 'Later', onclick: () => { if (i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; touch('cases'); render(); } } })))));
    g.append(el('button', { class: 'card add', type: 'button', text: '+ New case study', onclick: () => {
      list.push({ slug: '', title: 'New case study', kind: 'Product', tag: '', role: '', year: '', client: '', industry: [], did: [], headline: '', blurb: '', stat: ['', ''], cover: '', story: ['', []], run: [], sections: [], statement: '', shots: [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']], exp: ['The feature', []], impact: null, _imp: [], problem: '', goal: '', impactNote: '', page: 'case.html', fq: '' });
      touch('cases'); go('cases', list.length - 1); } }));
    v.append(g);
  }

  function vDesigns(v) {
    const list = C.designs.projects;
    if (sub != null && list[sub]) {
      const p = list[sub]; head('Designs', p.title || 'New piece');
      const meta = m => { if (m.ratio) p._ratio = m.ratio; if (m.bg) p.bg = m.bg; if (m.dark != null) p.dark = m.dark; touch('designs'); render(); };
      const defs = DESIGN.map(g => ({ ...g, fields: g.fields.map(f => f.k === '_img' || f.k === '_vid' ? { ...f, onMeta: meta } : f) }));
      v.append(el('button', { class: 'back', type: 'button', text: '← All designs', onclick: () => go('designs') }),
        el('div', { class: 'headrow' }, el('h2', { text: p.title }), el('div', { class: 'acts' },
          el('a', { class: 'btn ghost small', href: '/site/designs.html', target: '_blank', text: 'Open Designs ↗' }),
          el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: () => { if (confirm('Delete this piece?')) { list.splice(sub, 1); touch('designs'); go('designs'); } } }))),
        form(defs, p, 'designs'));
      return;
    }
    head('Content', 'Designs');
    v.append(el('p', { class: 'lead', text: 'Every piece on the Designs dial, in order within each category. Case studies join the dial automatically.' }));
    const cats = [['all', 'All'], ['3d', '3D'], ['illustration', 'Illustration'], ['poster', 'Poster'], ['brand', 'Brand'], ['motion', 'Motion'], ['product', 'Product']];
    let cat = vDesigns.cat || 'all';
    const tabs = el('div', { class: 'tabs' }), g = el('div', { class: 'grid' });
    const paint = () => {
      tabs.innerHTML = ''; cats.forEach(([k, n]) => tabs.append(el('button', { type: 'button', class: cat === k ? 'on' : '', text: n, onclick: () => { cat = vDesigns.cat = k; paint(); } })));
      g.innerHTML = '';
      list.forEach((p, i) => { if (cat !== 'all' && p.category !== cat) return;
        g.append(el('div', { class: 'card' + (p.hidden ? ' hid' : '') },
          el('button', { type: 'button', style: 'all:unset;display:block;cursor:pointer;width:100%', onclick: () => go('designs', i) }, thumb(p._vid || p._img), el('div', { class: 'cx' }, el('b', { text: p.title }), el('span', { class: 'mono', text: (cats.find(c => c[0] === p.category) || ['', p.category])[1] + (p.case ? ' · in ' + p.case : '') + (p.hidden ? ' · hidden' : '') }))),
          el('div', { style: 'display:flex;gap:4px;padding:0 10px 10px' },
            el('button', { class: 'btn ghost small', type: 'button', text: '←', onclick: () => { let j = i - 1; while (j >= 0 && list[j].category !== p.category) j--; if (j >= 0) { [list[j], list[i]] = [list[i], list[j]]; touch('designs'); paint(); } } }),
            el('button', { class: 'btn ghost small', type: 'button', text: '→', onclick: () => { let j = i + 1; while (j < list.length && list[j].category !== p.category) j++; if (j < list.length) { [list[j], list[i]] = [list[i], list[j]]; touch('designs'); paint(); } } })))); });
      g.append(el('button', { class: 'card add', type: 'button', text: '+ New piece', onclick: () => {
        list.push({ title: 'New piece', category: cat === 'all' ? '3d' : cat, images: [{ src: '', ratio: .8 }], bg: '#111111', dark: true, desc: '', _img: '', _vid: '', _ratio: .8 });
        touch('designs'); go('designs', list.length - 1); } }));
    };
    paint(); v.append(el('div', { class: 'bar' }, tabs), g);
  }

  function vAbout(v) {
    head('Content', 'About');
    v.append(el('p', { class: 'lead', text: 'The chapters on About (“the band so far”), from first to latest. The rest of the About page text is under Page text → About.' }),
      form([{ title: 'Chapters', fields: [{ k: 'chapters', label: '', type: 'list', itemLabel: 'Chapter', def: () => ({ fq: '', where: '', role: '', what: '', years: '', s1: ['', ''], s2: ['', ''] }), title: c => [c.where, c.role].filter(Boolean).join(' · '), of: CHAPTER }] }], C.about, 'about'));
  }
  function vEng(v) {
    head('Content', 'Engineering');
    v.append(form([...PAGEINTRO, { title: 'Things I’ve built', fields: [{ k: 'tools', label: '', type: 'list', itemLabel: 'Tool', def: () => ({ fq: '', name: '', type: '', what: '', tech: '', s: ['', ''] }), title: t => t.name, of: TOOL }] }], C.engineering, 'engineering'));
  }
  function vProjects(v) {
    head('Content', 'Projects page');
    v.append(el('p', { class: 'lead', text: 'The text at the top of Projects. The case studies themselves are under Case studies.' }), form(PAGEINTRO, C.projects, 'projects'));
  }

  const PAGES = [['index.html', 'Home'], ['about.html', 'About'], ['engineering.html', 'Engineering'], ['projects.html', 'Projects'], ['designs.html', 'Designs'], ['case.html', 'Product case study'], ['brand.html', 'Brand case study'], ['logo.html', 'Logo page'], ['product.html', 'Product page'], ['project.html', 'Project page'], ['showcase.html', 'Showcase page']];
  function vText(v) {
    head('Everything else', 'Page text');
    v.append(el('p', { class: 'lead', text: 'Every other piece of text on the site, page by page: headings, labels, buttons, links. Type your version on the right; leave it as it is to keep the original.' }));
    let page = vText.page || 'index.html';
    const tabs = el('div', { class: 'tabs' }), q = el('input', { class: 'search', placeholder: 'Find text…' }), box = el('div');
    const T = C.text;
    const paint = () => {
      tabs.innerHTML = ''; PAGES.forEach(([p, n]) => tabs.append(el('button', { type: 'button', class: page === p ? 'on' : '', text: n, onclick: () => { page = vText.page = p; paint(); } })));
      box.innerHTML = '';
      const rows = ((INDEX[page] || {}).texts || []).filter(t => !q.value || t.text.toLowerCase().includes(q.value.toLowerCase()) || ((T[page] || {})[t.raw] || '').toLowerCase().includes(q.value.toLowerCase()));
      if (!rows.length) box.append(el('div', { class: 'empty', text: 'Nothing found on this page.' }));
      rows.forEach(t => {
        const cur = (T[page] || {})[t.raw];
        const r = el('div', { class: 'trow' + (cur != null ? ' ed' : '') });
        const ta = el('textarea', { rows: 1, oninput: e => { const val = e.target.value; T[page] = T[page] || {}; if (val === t.text) delete T[page][t.raw]; else T[page][t.raw] = val; r.classList.toggle('ed', val !== t.text); touch('text'); } }, cur != null ? cur : t.text);
        r.append(el('div', { class: 'orig' }, el('span', { class: 'mono', text: t.where === 'script' ? 'Shown by the page' : 'On the page' }), t.text), ta,
          el('button', { class: 'rs', type: 'button', title: 'Back to the original', text: '↺', onclick: () => { if (T[page]) delete T[page][t.raw]; ta.value = t.text; r.classList.remove('ed'); touch('text'); } }));
        box.append(r);
        requestAnimationFrame(() => { ta.style.height = 'auto'; ta.style.height = Math.max(38, ta.scrollHeight + 2) + 'px'; });
      });
    };
    q.oninput = paint; paint();
    v.append(el('div', { class: 'bar' }, tabs), el('div', { class: 'bar' }, q, el('span', { class: 'mono', text: 'Changes show after Save & rebuild' })), box);
  }
  function vMedia(v) {
    head('Everything else', 'Pictures & videos');
    v.append(el('p', { class: 'lead', text: 'Every picture and video on each page that isn’t part of a case study or a design piece (those are edited there). Replace one here and it changes everywhere on that page.' }));
    let page = vMedia.page || 'index.html';
    const tabs = el('div', { class: 'tabs' }), g = el('div', { class: 'mgrid' }), M = C.media;
    const paint = () => {
      tabs.innerHTML = ''; PAGES.forEach(([p, n]) => tabs.append(el('button', { type: 'button', class: page === p ? 'on' : '', text: n, onclick: () => { page = vMedia.page = p; paint(); } })));
      g.innerHTML = '';
      const list = (INDEX[page] || {}).media || [];
      if (!list.length) g.append(el('div', { class: 'empty', text: 'No pictures on this page outside case studies and designs.' }));
      list.forEach(orig => {
        const cur = (M[page] || {})[orig] || '';
        const setv = val => { M[page] = M[page] || {}; if (!val || val === orig) delete M[page][orig]; else M[page][orig] = val; touch('media'); paint(); };
        g.append(el('div', { class: 'mcell' + (cur ? ' ed' : '') }, preview(cur || orig), el('div', { class: 'cx' },
          el('div', { class: 'p', text: cur ? orig + ' → ' + cur : orig }),
          el('div', { class: 'mbtn', style: 'display:flex;gap:6px;flex-wrap:wrap' },
            el('button', { class: 'btn ghost small', type: 'button', text: 'Upload…', onclick: () => upload(isVid(orig) ? 'video/*' : 'image/*', p => setv(p)) }),
            el('button', { class: 'btn ghost small', type: 'button', text: 'Library', onclick: () => library(p => setv(p)) }),
            cur && el('button', { class: 'btn ghost small', type: 'button', text: 'Reset', onclick: () => setv('') })))));
      });
    };
    paint(); v.append(el('div', { class: 'bar' }, tabs), g);
  }

  async function vSettings(v) {
    head('Site', 'Settings');
    C.site.analytics = C.site.analytics || { goatcounter: '' };
    if (C.site.available === undefined) C.site.available = true;
    const tok = el('input', { type: 'text', placeholder: HAS_TOKEN ? 'Saved on this Mac · paste a new one to replace it' : 'Paste your GoatCounter API token' });
    v.append(form([{ title: 'Availability', help: 'Shown on Home (“Open to new work”), on About (On air) and in the For recruiters card.', fields: [{ k: 'available', label: 'Taking new work', type: 'bool' }] }], C.site, 'site'));
    v.append(form([{ title: 'Analytics', help: 'Free and private: GoatCounter counts visits without cookies. Make an account at goatcounter.com, then put your site code here.', fields: [{ k: 'goatcounter', label: 'GoatCounter code', ph: 'kingsley', help: 'The first part of your GoatCounter address: kingsley.goatcounter.com → kingsley' }] }], C.site.analytics, 'site'),
      el('div', { class: 'group', style: 'margin-top:26px' }, el('h2', { text: 'Analytics API token' }), el('p', { class: 'help', text: 'So this CMS can show your numbers. In GoatCounter: Settings → API → New token, tick “Read statistics”. It stays on this Mac (it is never published).' }),
        el('div', { class: 'f' }, tok), el('button', { class: 'btn small', type: 'button', style: 'justify-self:start', text: 'Save token', onclick: async () => { if (!tok.value.trim()) return; await api('/api/secrets', { method: 'PUT', body: JSON.stringify({ goatcounter_token: tok.value.trim() }) }); HAS_TOKEN = true; tok.value = ''; tok.placeholder = 'Saved on this Mac'; toast('Token saved'); } })));
  }

  // ---------------------------------------------------------------- publish: review what changed since the last publish, then send it live
  async function vPublish(v) {
    head('Site', 'Publish');
    const body = el('div', {}, el('div', { class: 'mono', text: 'Looking at your changes…' }));
    v.append(el('p', { class: 'lead', text: 'Everything you have saved since you last published. Check it, then press Publish to send it live.' }));
    if (dirty.size) v.append(el('div', { class: 'note', style: 'margin-bottom:18px' }, 'You have changes that aren’t saved yet, so they aren’t listed here. ', el('button', { class: 'btn small', type: 'button', text: 'Save & rebuild now', onclick: async () => { await save(); render(); } })));
    v.append(body);
    let c; try { c = await api('/api/changes'); } catch (e) { body.innerHTML = ''; body.append(el('div', { class: 'err', text: e.message })); return; }
    body.innerHTML = '';
    const BADGE = { added: 'New', edited: 'Edited', removed: 'Removed', reordered: 'Reordered' };
    if (!c.total) body.append(el('div', { class: 'empty' }, el('h2', { text: 'Nothing new to publish' }), el('div', { text: 'Your live site already has everything you’ve saved.' })));
    const shortSrc = p => typeof p === 'string' ? p.split('/').pop().split('?')[0] : p && p.color ? 'Colour · ' + (p.word || p.color) : p && p.video ? 'Video · ' + String(p.video).split('/').pop() : '';
    for (const g of c.groups) {
      const box = el('div', { class: 'group', style: 'margin-bottom:18px' }, el('h2', { text: g.section }));
      for (const it of g.items) {
        const card = el('div', { class: 'chg ' + it.status },
          el('div', { class: 'chh' }, it.thumb ? el('div', { class: 'cth' }, preview(it.thumb)) : null,
            el('div', { class: 'cht' }, el('b', { text: it.title || 'Untitled' }), el('span', { class: 'badge ' + it.status, text: BADGE[it.status] || it.status })),
            it.link && it.status !== 'removed' ? el('a', { class: 'btn ghost small', href: '/site/' + it.link, target: '_blank', text: 'View ↗' }) : null));
        const rows = el('div', { class: 'chr' });
        for (const f of it.fields.slice(0, 40)) {
          if (f.media) rows.append(el('div', { class: 'cr media' }, f.field ? el('span', { class: 'mono', text: f.field }) : null,
            el('div', { class: 'ba' }, el('figure', {}, preview(f.before), el('figcaption', { text: f.before ? shortSrc(f.before) : 'None' })), el('i', { text: '→' }), el('figure', {}, preview(f.after), el('figcaption', { text: f.after ? shortSrc(f.after) : 'None' })))));
          else rows.append(el('div', { class: 'cr' }, el('span', { class: 'mono', text: f.field }), el('div', { class: 'tx' },
            f.before ? el('del', { text: f.before }) : null, el('ins', { text: f.after || '(removed)' }))));
        }
        if (it.fields.length > 40) rows.append(el('div', { class: 'mono', text: '+ ' + (it.fields.length - 40) + ' more' }));
        if (it.fields.length) card.append(rows);
        box.append(card);
      }
      body.append(box);
    }
    if (c.uploads.length) {
      const g = el('div', { class: 'lib', style: 'grid-template-columns:repeat(auto-fill,minmax(120px,1fr))' });
      c.uploads.forEach(p => g.append(el('a', { href: '/site/' + p, target: '_blank', style: 'display:grid;gap:6px;text-decoration:none;border:1px solid var(--line);border-radius:10px;overflow:hidden' }, preview(p), el('span', { text: p.replace('assets/', '') }))));
      body.append(el('div', { class: 'group', style: 'margin-bottom:18px' }, el('h2', { text: 'New pictures & videos' }), el('p', { class: 'help', text: c.uploads.length + ' file' + (c.uploads.length > 1 ? 's' : '') + ' you uploaded' }), g));
    }
    const msg = el('input', { type: 'text', value: 'Update content', placeholder: 'What changed' }), out = el('div');
    const btn = el('button', { class: 'btn', type: 'button', text: c.total ? `Publish ${c.total} change${c.total > 1 ? 's' : ''}` : 'Publish', disabled: !c.total && !c.pages, style: 'justify-self:start', onclick: async () => {
      if (dirty.size && !confirm('You have unsaved changes. Publish without them?')) return;
      btn.classList.add('busy'); btn.textContent = 'Publishing…';
      try { const r = await api('/api/publish', { method: 'POST', body: JSON.stringify({ message: msg.value }) }); out.innerHTML = ''; out.append(el('pre', { class: 'log', text: r.log }));
        toast(r.ok ? 'Published. GitHub updates the site in a minute or two.' : 'Publish stopped, see the log', !r.ok); if (r.ok) setTimeout(render, 1200); }
      catch (e) { toast(e.message, true); }
      btn.classList.remove('busy'); btn.textContent = 'Publish'; } });
    body.append(el('div', { class: 'group' }, el('h2', { text: 'Send it live' }), el('p', { class: 'help', text: 'Commits these changes under your name and pushes them to GitHub. The site updates a minute or two later.' }),
      el('div', { class: 'f' }, el('label', { text: 'What changed (a short note for your history)' }), msg), btn, out));
  }

  // ---------------------------------------------------------------- analytics
  async function vDash(v) {
    head('Overview', 'Analytics');
    let days = vDash.days || 30;
    const range = el('div', { class: 'tabs' }), body = el('div', {}, el('div', { class: 'mono', text: 'Loading…' }));
    [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, 'Year']].forEach(([d, n]) => range.append(el('button', { type: 'button', class: d === days ? 'on' : '', text: n, onclick: () => { vDash.days = d; render(); } })));
    v.append(el('div', { class: 'bar' }, el('span', { class: 'grow' }), range), body);
    let a; try { a = await api('/api/analytics?days=' + days); } catch (e) { body.innerHTML = ''; body.append(el('div', { class: 'err', text: e.message })); return; }
    body.innerHTML = '';
    if (!a.configured) {
      body.append(el('div', { class: 'empty' }, el('h2', { text: 'See where your visitors come from' }),
        el('div', { text: 'Visits, pages, countries, where people found you, devices, and which designs get opened. Private, no cookies, free for personal sites.' }),
        el('ol', {}, el('li', {}, 'Make a free account at ', el('a', { href: 'https://www.goatcounter.com/signup', target: '_blank', text: 'goatcounter.com' }), ' and pick a code (e.g. kingsley).'),
          el('li', { text: 'Put that code in Settings → Analytics, then Save & rebuild and Publish. The site starts counting.' }),
          el('li', { text: 'In GoatCounter, make an API token with “Read statistics” and paste it under Settings → Analytics API token.' })),
        el('button', { class: 'btn', type: 'button', style: 'margin-top:16px', text: 'Open settings', onclick: () => go('settings') })));
      return;
    }
    if (a.error) body.append(el('div', { class: 'err', text: a.error }));
    const T = a.total || {}, pages = a.pages || [], sum = (pages.reduce((s, p) => s + p.count, 0));
    const views = T.total ?? sum, top = pages[0];
    body.append(el('div', { class: 'stats' },
      el('div', { class: 'stat' }, el('span', { class: 'mono', text: 'Visits' }), el('b', { text: fmt(views) })),
      el('div', { class: 'stat' }, el('span', { class: 'mono', text: 'Pages viewed' }), el('b', { text: fmt(pages.length) })),
      el('div', { class: 'stat' }, el('span', { class: 'mono', text: 'Countries' }), el('b', { text: fmt((a.locations || []).length) })),
      el('div', { class: 'stat' }, el('span', { class: 'mono', text: 'Designs opened' }), el('b', { text: fmt((a.events || []).reduce((s, e) => s + e.count, 0)) }))));
    const P = el('div', { class: 'panels' });
    P.append(el('div', { class: 'panel wide' }, el('h3', { text: 'Visits per day' }), chart(a.daily || [])));
    P.append(rank('Where visitors come from', a.toprefs, x => x.name === '(direct)' || !x.name ? 'Direct · typed or bookmarked' : x.name));
    P.append(rank('Countries', a.locations));
    P.append(rank('Most viewed pages', pages.map(p => ({ name: niceP(p.path), count: p.count }))));
    P.append(rank('Designs opened', (a.events || []).map(e => ({ name: e.title || e.path, count: e.count }))));
    P.append(rank('Devices', a.systems)); P.append(rank('Browsers', a.browsers));
    P.append(rank('Screen sizes', a.sizes)); if ((a.campaigns || []).length) P.append(rank('Campaigns', a.campaigns));
    body.append(P, el('p', { class: 'lead', style: 'margin-top:18px', html: `From GoatCounter · <a href="https://${a.code}.goatcounter.com" target="_blank">open the full dashboard ↗</a>` }));
  }
  const fmt = n => (n || 0).toLocaleString('en-GB');
  const niceP = p => { const m = { '/': 'Home', '/index.html': 'Home', '/about.html': 'About', '/engineering.html': 'Engineering', '/projects.html': 'Projects', '/designs.html': 'Designs' }; if (m[p]) return m[p]; const h = (p || '').match(/(case|brand)\.html#(.+)/); return h ? 'Case study · ' + h[2] : p; };
  function rank(t, rows, name) {
    rows = rows || []; const max = Math.max(1, ...rows.map(r => r.count));
    return el('div', { class: 'panel' }, el('h3', { text: t }), rows.length ? el('ul', { class: 'rank' }, rows.slice(0, 10).map(r => el('li', {}, el('i', { style: `width:${(r.count / max * 100).toFixed(1)}%` }), el('span', { text: name ? name(r) : r.name }), el('b', { text: fmt(r.count) })))) : el('div', { class: 'mono', text: 'No data yet' }));
  }
  function chart(daily) {
    const W = 1000, H = 160, n = Math.max(1, daily.length), max = Math.max(1, ...daily.map(d => d.count)), bw = W / n;
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart'); svg.setAttribute('preserveAspectRatio', 'none');
    daily.forEach((d, i) => { const h = d.count ? Math.max(2, (d.count / max) * (H - 24)) : 2, r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', (i * bw + bw * .15).toFixed(1)); r.setAttribute('width', (bw * .7).toFixed(1)); r.setAttribute('y', (H - 18 - h).toFixed(1)); r.setAttribute('height', h.toFixed(1)); r.setAttribute('rx', 1.5);
      if (!d.count) r.setAttribute('class', 'z'); const tt = document.createElementNS(ns, 'title'); tt.textContent = d.day + ': ' + d.count; r.append(tt); svg.append(r); });
    [0, n - 1].forEach(i => { if (!daily[i]) return; const t = document.createElementNS(ns, 'text'); t.setAttribute('x', i ? W : 0); t.setAttribute('y', H - 3); t.setAttribute('text-anchor', i ? 'end' : 'start'); t.textContent = daily[i].day; svg.append(t); });
    return svg;
  }

  // ---------------------------------------------------------------- save
  async function save() {
    const b = $('save'); if (b.classList.contains('busy')) return;
    b.classList.add('busy'); b.textContent = dirty.size ? 'Saving…' : 'Rebuilding…';
    try {
      for (const name of [...dirty]) { await api('/api/content/' + name, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack(name)) }); dirty.delete(name); }
      paintDirty(); b.textContent = 'Rebuilding…';
      const r = await api('/api/build', { method: 'POST' });
      if (!r.ok) { openModal('The rebuild stopped', el('div', { class: 'form' }, el('div', { class: 'err', text: 'Your changes are saved, but the pages could not be rebuilt. The message below says why.' }), el('pre', { class: 'log', text: r.log }))); toast('Rebuild stopped', true); }
      else { toast(`Saved and rebuilt in ${r.seconds}s`); INDEX = (await api('/api/content')).index; }
    } catch (e) { toast(e.message, true); }
    b.classList.remove('busy'); b.textContent = 'Save & rebuild';
  }
  $('save').onclick = save;

  // ---------------------------------------------------------------- start
  (async function start() {
    try {
      const r = await api('/api/content');
      C = r.content; INDEX = r.index; HAS_TOKEN = r.hasToken;
      C.cases = C.cases.cases ? C.cases : { cases: [] }; C.designs = C.designs.projects ? C.designs : { projects: [] };
      C.about.chapters = C.about.chapters || []; C.engineering.tools = C.engineering.tools || [];
      C.text = C.text || {}; C.media = C.media || {}; C.site = C.site || {};
      prep();
      const h = location.hash.slice(1).split('/'); route = h[0] || 'dashboard'; sub = h[1] != null && h[1] !== '' ? +h[1] : null;
      nav(); render();
    } catch (e) {
      $('view-root').append(el('div', { class: 'err', text: 'Could not reach the CMS server. Start it with “Start CMS.command” in the cms folder.\n\n' + e.message }));
    }
  })();
})();
