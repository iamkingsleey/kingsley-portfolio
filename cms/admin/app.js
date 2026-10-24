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
  let C = {}, SAVED = {}, INDEX = {}, LIB = null, HAS_TOKEN = false, HAS_IKEY = false, INBOX_NEW = 0, route = 'dashboard', sub = null;
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
    } else if (t === 'blocksnote') {   // a section written as blocks on the page view
      const n = (get() || []).length; wrap.append(el('div', { class: 'help', text: `${n} block${n === 1 ? '' : 's'}: text, headings, pictures and more. Edit, add, move and remove them on the page view (“On the page”).` }));
    } else if (t === 'rowsnote') {   // a section arranged in a grid on the page view: its rows, read-only here, with a way back to automatic rows
      const R = get();
      if (!Array.isArray(R) || !R.length) wrap.append(el('div', { class: 'help', text: 'Automatic: the page lays the pictures out by their shapes. To give a picture a grid, click it on the page view (“On the page”).' }));
      else { const box = el('div', { class: 'rowsview' });
        R.forEach((r, i) => box.append(el('div', { class: 'rv' }, el('span', { class: 'mono', text: String(i + 1).padStart(2, '0') }), thumbs(r.pics), el('span', { text: r.fit === 'auto' ? 'As drawn' : ({ 1: 'Full width', 2: 'Pair', 3: 'Three' }[(r.pics || []).length] || '') + (r.split ? ' · ' + ({ left: 'wide left', right: 'wide right', middle: 'wide middle' })[r.split] : '') + ((r.pics || []).some(x => !x) ? ' · ' + (r.pics || []).filter(x => !x).length + ' empty' : '') }))));
        wrap.append(el('div', { class: 'help', text: 'Arranged in rows on the page view: edit, swap and fill them there.' }), box,
          el('button', { class: 'btn ghost small', type: 'button', style: 'justify-self:start', text: 'Back to automatic rows', onclick: () => { if (!confirm('Go back to automatic rows? Empty spots are dropped; the pictures stay.')) return; { const seen = new Set(); obj.media = obj[d.k].flatMap(r => (r.pics || []).filter(Boolean)).filter(m => { const k = JSON.stringify(m); if (seen.has(k)) return false; seen.add(k); return true; }); } delete obj[d.k]; touch(file); wrap.replaceWith(el('div', { class: 'help', text: 'Back to automatic rows. Reopen the section to see its pictures list.' })); onChange && onChange(); } })); }
    } else if (t === 'layout') {   // a section's grid: tap one; Auto keeps the shape-aware rows
      const box = el('div', { class: 'lyt' });
      const paint = () => { const cur = get() && get().length ? (LAYOUTS.find(L => L[2] && sig(L[2]) === sig(get())) || ['custom'])[0] : 'auto'; box.innerHTML = '';
        LAYOUTS.forEach(([k, name, G]) => box.append(el('button', { type: 'button', class: 'lyt-b' + (k === cur ? ' on' : ''), 'aria-pressed': String(k === cur),
          onclick: () => { if (G) set(clone(G)); else { delete obj[d.k]; touch(file); wrap.classList.add('changed'); } paint(); } }, mini(G), el('span', { text: name })))); };
      paint(); wrap.append(box);
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
  // small thumbnails in a list item's header: the pictures it holds (itself, or the ones inside it), so you can tell them apart closed
  const isPic = v => typeof v === 'string' && (/\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)(\?|$)/i.test(v) || /framerusercontent\.com\/images\//.test(v));
  function picsIn(v, out = [], depth = 0) {
    if (out.length >= 4 || depth > 4 || v == null) return out;
    if (isPic(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(x => picsIn(x, out, depth + 1));
    else if (typeof v === 'object') { if (v.color) out.push(v); else if (v.poster || v.video) out.push(v.poster || v.video); else Object.values(v).forEach(x => picsIn(x, out, depth + 1)); }
    return out.slice(0, 4); }
  function thumbs(v) {
    const P = picsIn(v), box = el('span', { class: 'thumbs' }); if (!P.length) return box;
    P.forEach(p => { if (typeof p === 'object') { const t = el('span', { class: 'th', text: (p.word || '').slice(0, 2) }); t.style.background = p.color; t.style.color = p.ink || '#fff'; box.append(t); }
      else box.append(isVid(p) ? el('video', { class: 'th', src: src(p), muted: true, playsinline: true, preload: 'metadata' }) : el('img', { class: 'th', src: src(p), alt: '', loading: 'lazy' })); });
    return box; }
  // the grids a section can use (shared by the picture sheet and the Form)
  const LAYOUTS = [['auto', 'Auto', null], ['wide', 'Full width', [{ n: 1 }]], ['pairs', 'Pairs', [{ n: 2 }]], ['p64', 'Pairs 60/40', [{ n: 2, split: 'left' }]], ['p46', 'Pairs 40/60', [{ n: 2, split: 'right' }]],
    ['threes', 'Threes', [{ n: 3 }]], ['t622', '60/20/20', [{ n: 3, split: 'left' }]], ['t262', '20/60/20', [{ n: 3, split: 'middle' }]], ['t226', '20/20/60', [{ n: 3, split: 'right' }]],
    ['wp', 'Wide, then a pair', [{ n: 1 }, { n: 2 }]], ['wwp', 'Wide, wide, pair', [{ n: 1 }, { n: 1 }, { n: 2 }]], ['wp64', 'Wide, then 60/40', [{ n: 1 }, { n: 2, split: 'left' }]], ['wwp64', 'Wide, wide, 60/40', [{ n: 1 }, { n: 1 }, { n: 2, split: 'left' }]]];
  const COLS = { '': n => Array(n).fill(1), left: n => n === 2 ? [3, 2] : [3, 1, 1], right: n => n === 2 ? [2, 3] : [1, 1, 3], middle: () => [1, 3, 1] };
  const mini = G => el('span', { class: 'lyt-mini' }, ...(G || [{ n: 1 }, { n: 2 }]).map(r => el('span', { class: 'lyt-row' + (G ? '' : ' auto') }, ...(COLS[r.split || ''] || COLS[''])(r.n).map(w => el('i', { style: `flex:${w}` })))));
  const sig = G => JSON.stringify((G || []).map(r => [r.n || 1, r.split || '']));
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
            el('span', { class: 'chev', text: '▾' }), thumbs(it), el('b', { text: title(it, i) }),
            el('span', { class: 'ib' },
              el('button', { type: 'button', title: 'Move up', text: '↑', onclick: () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; changed(); paint(); } } }),
              el('button', { type: 'button', title: 'Move down', text: '↓', onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; changed(); paint(); } } }),
              el('button', { type: 'button', title: 'Duplicate', text: '⧉', onclick: () => { arr.splice(i + 1, 0, clone(arr[i])); changed(); paint(); } }),
              el('button', { type: 'button', title: 'Remove', text: '✕', onclick: () => { if (confirm('Remove "' + title(it, i) + '"?')) { arr.splice(i, 1); changed(); paint(); } } }))),
          body);
        const of = d.of;
        const reThumb = v => { const o = item.querySelector(':scope > header > .thumbs'); if (o) o.replaceWith(thumbs(v)); };
        if (of.type === 'object') of.fields.filter(f => !f.when || f.when(it)).forEach(f => body.append(field(f, it, file, () => { item.querySelector('b').textContent = title(it, i); reThumb(it); changed(); })));
        else body.append(field({ ...of, k: i, label: '' }, arr, file, () => { item.querySelector('b').textContent = title(arr[i], i); reThumb(arr[i]); changed(); }));
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
    ...((C.designs && C.designs.projects) || []).filter(p => p.caseStudy).map(p => [p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), p.title]),
    // collections that live only as a shared name on their pieces (e.g. the 3D collection: arrows and a grid on Designs, no page of its own)
    ...[...new Set(((C.designs && C.designs.projects) || []).map(p => p.case).filter(Boolean))].filter(s => !(C.cases.cases || []).some(c => c.slug === s) && !((C.designs && C.designs.projects) || []).some(p => p.caseStudy && p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === s))
      .map(s => [s, s.replace(/-/g, ' ').replace(/^./, m => m.toUpperCase()).replace(/^3d/i, '3D')])];
  const PAIR = (a, b) => ({ type: 'tuple', fields: [{ label: a }, { label: b }] });
  const CASE = [
    { title: 'Basics', cols: 2, fields: [
      { k: 'title', label: 'Title' }, { k: 'slug', label: 'Address', help: 'The page link: case.html#this. Lowercase, no spaces.' },
      { k: 'kind', label: 'Type', type: 'select', options: [['Product', 'Product case study'], ['Brand', 'Brand case study']], repaint: true },
      { k: 'fq', label: 'Station', help: 'Its frequency on the Projects dial, e.g. 88.1' },
      { k: 'tag', label: 'Tag', help: 'Shown after the type, e.g. Marketplace' }, { k: 'role', label: 'My role' },
      { k: 'year', label: 'Year', ph: '2024 or 2020 – Now' }, { k: 'client', label: 'Client' },
      { k: 'industry', label: 'Industry', type: 'lines', rows: 2, help: 'One per line' }, { k: 'did', label: 'What I did', type: 'lines', rows: 3, help: 'One per line' },
      { k: 'fxDefault', label: 'Effect on every picture', type: 'select', full: true, options: [['', 'None (plain)'], ['beforeafter', 'Before and after'], ['swap', 'Hover to swap'], ['lens', 'Zoom lens'], ['zoom', 'Click to zoom'], ['pan', 'Drag to look around'], ['hotspots', 'Hotspots'], ['hoverzoom', 'Zoom on hover'], ['patternzoom', 'Pattern zoom'], ['camera', 'Camera'], ['tilt', 'Tilt'], ['kenburns', 'Ken Burns'], ['spotlight', 'Spotlight'], ['reveal', 'Reveal on scroll'], ['parallax', 'Parallax']], help: 'Each picture can still have its own: click it on the page view → Effect. “None” keeps the pictures plain.' },
      { k: 'hidden', label: 'Hide this case study from the site', type: 'bool', full: true } ] },
    { title: 'Opening', fields: [
      { k: 'headline', label: 'Headline', type: 'br', rows: 2, help: 'Press Enter for a line break' }, { k: 'blurb', label: 'Summary', type: 'textarea' },
      { k: 'stat', label: 'Headline number', ...PAIR('Number', 'What it counts') }, { k: 'cover', label: 'Cover picture', type: 'media', rich: true, help: 'Shown on Projects and Designs' } ] },
    { title: 'Story', fields: [
      { k: 'story', label: 'The brief', type: 'tuple', cols: 1, fields: [{ label: 'Heading' }, { label: 'Paragraphs', type: 'paras', help: 'Leave an empty line between paragraphs' }] },
      { k: 'problem', label: 'The brief · Problem', type: 'textarea' }, { k: 'goal', label: 'The brief · Goal', type: 'textarea' },
      { k: 'statement', label: 'Statement', type: 'textarea', rows: 2, help: 'One line set large mid-page (product: the design principle; brand: the scrolling ticker)' } ] },
    { title: 'Sections', help: 'The chapters of the case study, in order. Add, remove, reorder or duplicate them. Each can have text, points, numbers and pictures; leave a part empty to skip it.', fields: [
      { k: 'sections', label: '', type: 'list', itemLabel: 'Section', def: () => ({ h: '', p: [], media: [] }), title: (s, i) => `${i + 1} · ${s.h || 'Untitled section'}${s.off ? ' (hidden)' : ''}`, of: { type: 'object', fields: [
        { k: 'off', label: 'Hidden from the site', type: 'bool', help: 'Kept here and on the page view (dimmed), but left off the live page. Untick to bring it back.' },
        { k: 'h', label: 'Heading', help: 'e.g. Overview, Pain points, UX strategy, High fidelity, Impact, Logo, Colour and type, Mockups' },
        { k: 'title', label: 'Title on the page (product, optional)', help: 'Leave empty for the default, e.g. Pain points shows as “Listening to users”' },
        { k: 'p', label: 'Text', type: 'paras', rows: 4, help: 'Leave an empty line between paragraphs', when: s => !s.blocks },
        { k: 'blocks', label: 'Text and blocks', type: 'blocksnote', when: s => !!s.blocks },
        { k: 'list', label: 'Points (optional)', type: 'list', itemLabel: 'Point', def: () => ['', ''], title: x => x[0] || 'Point', of: PAIR('Title', 'Text') },
        { k: 'stats', label: 'Big numbers (optional)', type: 'list', itemLabel: 'Number', def: () => ['', ''], title: x => (x[0] + ' ' + x[1]).trim() || 'Number', help: 'Shown large, counting up, e.g. 72% · fewer fraud complaints', of: PAIR('Number', 'What it means') },
        { k: 'view', label: 'Big numbers style (product)', type: 'select', options: [['', 'Count up'], ['dial', 'Before / after dial']], help: 'The dial: drag from before to after. It works for numbers like “72% · fewer fraud complaints” or “40% · more sales”; anything else is listed under it.' },
        { k: 'chips', label: 'Colour or type names (brand, optional)', type: 'lines', rows: 2, help: 'One per line' },
        { k: 'notes', label: 'Sticky notes (product, optional)', type: 'list', itemLabel: 'Note', def: () => ({ t: '', p: '', w: '' }), title: (n, i) => `${i + 1} · ${(n && n.p) || 'Empty note'}`, help: 'Insights shown as sticky notes visitors can move around. Add as many as you like; leave it empty for no board.', of: { type: 'object', fields: [{ k: 't', label: 'Label', help: 'e.g. Buyer, Seller' }, { k: 'p', label: 'Insight' }, { k: 'w', label: 'From', help: 'e.g. Buyer interviews' }] } },
        { k: 'media', label: 'Pictures and videos', type: 'list', itemLabel: 'Picture', def: '', title: (m, i) => `${i + 1} · ${mname(m)}`, of: { type: 'media', rich: true }, when: s => !(s.rows && s.rows.length) },
        { k: 'rows', label: 'Grid', type: 'rowsnote' }] } } ] },
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
      { k: 'colors', label: 'Brand colours', full: true, help: 'Leave empty to sample colours from the pictures.', type: 'list', itemLabel: 'Colour', def: () => ['', '#000000'], title: c => c[0] + ' ' + c[1], of: { type: 'tuple', fields: [{ label: 'Name' }, { label: 'Hex', type: 'color' }] } } ] },
    { title: 'Picture sections', when: o => o.kind === 'Brand', help: 'The pictures after the Type section, in order. Add as many sections as you like; each is a stack of rows. A row with one picture runs the full width; two or three pictures sit side by side as squares. When this has any pictures, only these show after Type (leave it empty to use the section pictures instead).', fields: [
      { k: 'gallery', label: '', type: 'list', itemLabel: 'Picture section', def: () => ({ rows: [{ pics: [''] }] }), title: (g, i) => `${i + 1} · ${(g.rows || []).map(r => (r.pics || []).length === 1 ? 'Wide' : (r.pics || []).length + ' side by side').join(', ') || 'Empty'}`, of: { type: 'object', fields: [
        { k: 'rows', label: 'Rows', type: 'list', itemLabel: 'Row', def: () => ({ pics: [''] }), title: (r, i) => `${i + 1} · ${(r.pics || []).length === 1 ? 'One wide picture' : (r.pics || []).length + ' pictures side by side' + ((r.pics || []).length > 1 && r.split ? ', wide ' + r.split : '')}`, of: { type: 'object', fields: [
          { k: 'pics', label: 'Pictures (1 = full width, 2 or 3 = side by side)', type: 'list', itemLabel: 'Picture', def: '', title: (m, i) => `${i + 1} · ${mname(m)}`, of: { type: 'media', rich: true } },
          { k: 'split', label: 'Side by side: split', type: 'select', options: [['', 'Even · squares (default)'], ['left', 'Wide left · 2 pictures 60/40 · 3 pictures 60/20/20'], ['middle', 'Wide middle · 3 pictures 20/60/20'], ['right', 'Wide right · 2 pictures 40/60 · 3 pictures 20/20/60']], help: 'An asymmetric row: one height, the gaps off centre. Wide middle needs three pictures.' },
          { k: 'shape', label: 'Shape of a full-width picture', type: 'select', options: [['16:9', '16:9 (default)'], ['2:1', '2:1'], ['own', 'Its own shape, uncropped']] },
          { k: 'focus', label: 'Keep in view when cropped', type: 'select', options: [['', 'Middle (default)'], ['top', 'Top'], ['upper', 'Upper'], ['lower', 'Lower'], ['bottom', 'Bottom']] }] } }] } } ] }
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
    { k: 'type', label: 'How', type: 'select', options: [['', '—'], ['Full time', 'Full time'], ['Part time', 'Part time'], ['Contract', 'Contract'], ['Freelance', 'Freelance'], ['Volunteer', 'Volunteer']] }, { k: 'location', label: 'Location', ph: 'Lagos, Nigeria or Remote' },
    { k: 'what', label: 'What I did there', type: 'textarea' },
    { k: 's1', type: 'tuple', label: 'Number (optional)', fields: [{ label: 'Number' }, { label: 'Label' }] },
    { k: 's2', type: 'tuple', label: 'Second number (optional)', fields: [{ label: 'Number' }, { label: 'Label' }] },
    { k: 'hidden', label: 'Hide', type: 'bool' } ] };
  const TOOL = { type: 'object', fields: [
    { k: 'demo', label: 'Live demo on its card', type: 'select', options: [['', 'Pick from its name'], ['line', 'Lines (like LineCraft)'], ['mesh', 'Wireframe sphere (like MeshCraft)'], ['reel', 'Recording a cursor (like Protoreel)'], ['dial', 'Tuning dial']] }, { k: 'picture', label: 'Or a picture instead of a demo', type: 'media', accept: 'image/*' },
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
      if (!c.fxDefault) delete c.fxDefault; if (c.fx) { for (const k in c.fx) if (!c.fx[k] || !c.fx[k].k) delete c.fx[k]; if (!Object.keys(c.fx).length) delete c.fx; }
      const tidyRows = R => (R || []).map(r => { const o = { pics: (r.pics || []).map(x => x || '') }; if (r.fit === 'auto') { o.fit = 'auto'; o.pics = o.pics.filter(Boolean); } for (const k of ['split', 'shape', 'focus']) if (r[k] && !(k === 'shape' && r[k] === '16:9')) o[k] = r[k]; if (Array.isArray(r.w) && r.w.length === o.pics.length) { o.w = r.w; if (r.ar) o.ar = r.ar; } return o; }).filter(r => r.pics.length);
      for (const sec of c.sections || []) if (Array.isArray(sec.rows)) { sec.rows = tidyRows(sec.rows); if (!sec.rows.length) delete sec.rows; else sec.media = [...new Set(sec.rows.flatMap(r => r.pics.filter(Boolean)).map(m => JSON.stringify(m)))].map(m => JSON.parse(m)); }
      if (Array.isArray(c.coverRows)) { c.coverRows = tidyRows(c.coverRows); if (!c.coverRows.length) delete c.coverRows; else { const f = c.coverRows.flatMap(r => r.pics).find(Boolean); if (f) c.cover = f; } }
      if (Array.isArray(c.coverMore)) { c.coverMore = c.coverMore.filter(Boolean); if (!c.coverMore.length) delete c.coverMore; }
      if (Array.isArray(c.coverGrid) && !c.coverGrid.length) delete c.coverGrid;
      for (const sec of c.sections || []) if (Array.isArray(sec.grid) && !sec.grid.length) delete sec.grid;
      if (Array.isArray(c.gallery)) { c.gallery = c.gallery.map(g => ({ rows: (g.rows || []).map(r => { const o = { pics: (r.pics || []).map(x => x || '') }; if (r.shape && r.shape !== '16:9') o.shape = r.shape; if (r.focus) o.focus = r.focus; if (r.split) o.split = r.split; if (Array.isArray(r.w) && r.w.length === o.pics.length) { o.w = r.w; if (r.ar) o.ar = r.ar; } return o; }).filter(r => r.pics.length) })).filter(g => g.rows.length); if (!c.gallery.length) delete c.gallery; }   // empty rows and sections are dropped
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
    ['grp', 'Overview'], ['dashboard', 'Analytics', ''], ['inbox', 'Inbox', ''],
    ['grp', 'Content'], ['cases', 'Case studies', 'cases'], ['designs', 'Designs', 'designs'], ['about', 'About', 'about'], ['engineering', 'Engineering', 'engineering'], ['projects', 'Projects page', 'projects'],
    ['grp', 'Everything else'], ['text', 'Page text', 'text'], ['media', 'Pictures & videos', 'media'],
    ['grp', 'Site'], ['publish', 'Publish', ''], ['settings', 'Settings', 'site']
  ];
  function nav() {
    const n = $('nav'); n.innerHTML = '';
    for (const [k, label, files] of NAV) {
      if (k === 'grp') { n.append(el('div', { class: 'grp mono', text: label })); continue; }
      n.append(el('button', { type: 'button', class: route === k ? 'on' : '', 'data-files': files, onclick: () => go(k) }, label, k === 'inbox' && INBOX_NEW ? el('span', { class: 'ncount', text: String(INBOX_NEW) }) : null, el('i')));
    }
    paintDirty();
  }
  function go(r, s = null) { route = r; sub = s; nav(); render(); scrollTo(0, 0); try { history.replaceState(null, '', '#' + r + (s != null ? '/' + s : '')); } catch (_) {} }
  const head = (crumb, title) => { $('crumb').textContent = crumb; $('title').textContent = title; };
  function render() {
    const v = $('view-root'); v.innerHTML = '';
    ({ dashboard: vDash, publish: vPublish, cases: vCases, designs: vDesigns, about: vAbout, engineering: vEng, projects: vProjects, text: vText, media: vMedia, settings: vSettings, inbox: vInbox }[route] || vDash)(v);
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
        const send = focus => { try { fr.contentWindow.postMessage({ type: 'km-cms-data', cases: clone(C.cases.cases), focus: typeof focus === 'string' ? focus : undefined }, '*'); } catch (_) {} };
        window._kmCmsMsg = e => { if (e.source !== fr.contentWindow) return; const d = e.data || {};
          if (d.type === 'km-cms-ready') send();
          if (d.type === 'km-cms-edit' && d.slug === c.slug) { const keys = d.path.split('.'); let o = c;
            for (let k = 0; k < keys.length - 1; k++) { const nk = keys[k + 1], key = /^\d+$/.test(keys[k]) ? +keys[k] : keys[k]; if (o[key] == null) o[key] = /^\d+$/.test(nk) ? [] : {}; o = o[key]; }
            const last = keys[keys.length - 1]; o[/^\d+$/.test(last) ? +last : last] = d.value; touch('cases'); }
          if (d.type === 'km-cms-pick' && d.slug === c.slug) setMode('form', d.path);
          if (d.type === 'km-cms-blk' && d.slug === c.slug) blockOp(d);
          // "+ Tag" / "+ Skill" on the page: a new chip to type into (clear a chip's text to remove it)
          if (d.type === 'km-cms-tag' && d.slug === c.slug && (d.key === 'industry' || d.key === 'did')) { c[d.key] = (c[d.key] || []).filter(Boolean); c[d.key].push(d.key === 'did' ? 'New skill' : 'new tag'); touch('cases'); send(); }
          // a section's Hide / Show / Delete on the page. Numbered keys are the chapters; brief, principle and details are the fixed parts
          if (d.type === 'km-cms-sec' && d.slug === c.slug) {
            if (/^\d+$/.test(d.key)) { const i = +d.key, sec = (c.sections || [])[i]; if (!sec) return;
              if (d.act === 'hide') sec.off = true; else if (d.act === 'show') delete sec.off;
              else if (d.act === 'delete') { if (!confirm(`Delete the section “${sec.h || 'Untitled'}” for good? Its text and pictures go with it. (To keep it for later, use Hide instead.)`)) return; c.sections.splice(i, 1); } }
            else { c.off = c.off || {}; if (d.act === 'hide') c.off[d.key] = true; else delete c.off[d.key]; if (!Object.keys(c.off).length) delete c.off; }
            touch('cases'); send(); toast(d.act === 'hide' ? 'Hidden from the site. Save & rebuild to publish.' : d.act === 'show' ? 'Back on the site.' : 'Section deleted.'); }
          if ((d.type === 'km-cms-media' || d.type === 'km-cms-add' || d.type === 'km-cms-slot') && d.slug === c.slug) pictureSheet(d);
          if (d.type === 'km-cms-swap' && d.slug === c.slug) swapSpots(d);
          if (d.type === 'km-cms-widths' && d.slug === c.slug) { const B = block(d.section), R = B && B.get(); if (!R || !R[d.r]) return;   // widths dragged on the page
            if (d.w) { R[d.r].w = d.w; R[d.r].ar = d.ar; delete R[d.r].fit; } else { delete R[d.r].w; delete R[d.r].ar; } touch('cases'); send(); } };
        // ---- blocks added on the page (the + between blocks, "/", the ⋮⋮ handle). A place is "brief", "N:blocks" (section N's
        // text column) or "N:after" (after section N's pictures). A section's old paragraphs become text blocks the first time.
        const FRESH = { text: () => ({ t: 'text', v: '' }), heading: () => ({ t: 'heading', v: '' }), sub: () => ({ t: 'sub', v: '' }), quote: () => ({ t: 'quote', v: '' }),
          picture: () => ({ t: 'picture', m: '', cap: '' }), video: () => ({ t: 'video', m: '', cap: '' }), points: () => ({ t: 'points', items: [['', ''], ['', '']] }),
          numbers: () => ({ t: 'numbers', items: [['', ''], ['', '']] }), notes: () => ({ t: 'notes', items: [{ p: '', w: '' }, { p: '', w: '' }, { p: '', w: '' }] }), proto: () => ({ t: 'proto', src: '', h: 760, cap: '' }) };
        const placeOf = w => { if (w === 'brief') { c.briefBlocks = c.briefBlocks || []; return { list: c.briefBlocks, path: 'briefBlocks', si: -1 }; }
          const [n, where] = String(w).split(':'), sec = (c.sections || [])[+n]; if (!sec) return null;
          if (where === 'after') { sec.after = sec.after || []; return { list: sec.after, path: `sections.${n}.after`, si: +n }; }
          if (!sec.blocks) { sec.blocks = (sec.p || []).map(v => ({ t: 'text', v })); delete sec.p; }
          return { list: sec.blocks, path: `sections.${n}.blocks`, si: +n }; };
        const objAt = path => path.split('.').reduce((o, k) => o == null ? o : o[/^\d+$/.test(k) ? +k : k], c);
        const focusOf = (P, j, b) => !b ? null : b.t === 'points' || b.t === 'numbers' ? `${P.path}.${j}.items.0.0` : b.t === 'notes' ? `${P.path}.${j}.items.0.p` : b.t === 'picture' || b.t === 'video' || b.t === 'proto' ? null : `${P.path}.${j}.v`;
        const tidyList = P => { if (P.si >= 0) { const sec = c.sections[P.si]; if (sec.after && !sec.after.length) delete sec.after; } else if (!c.briefBlocks.length) delete c.briefBlocks; };
        // a prototype block: which interactive page it shows (any .html in the Prototype folder, or a full link), how tall, and what the bar says
        function blockProto(b) { const done = () => { m.remove(); send(); }, set = (k, v) => { b[k] = v; touch('cases'); };
          const src = el('input', { type: 'text', value: b.src || '', placeholder: 'Prototype/your-flow.html', oninput: e => set('src', e.target.value.trim()) });
          let PROTOS = [];
          const pick = el('select', { onchange: e => { if (!e.target.value) return; src.value = e.target.value; set('src', e.target.value); const p = PROTOS.find(x => x.src === e.target.value); if (p && !b.addr) { b.addr = p.name; addr.value = p.name; } } },
            el('option', { value: '', text: 'Loading the Prototype folder…' }));
          api('/api/protos').then(j => { PROTOS = j.files || []; pick.replaceChildren(el('option', { value: '', text: PROTOS.length ? 'Choose a prototype…' : 'No pages in the Prototype folder yet' }),
            ...PROTOS.map(p => el('option', { value: p.src, text: p.name + '  ·  ' + p.src.replace(/^Prototype\//, ''), selected: p.src === b.src }))); }).catch(() => {});
          const addr = el('input', { type: 'text', value: b.addr || '', placeholder: 'Shown in its top bar', oninput: e => set('addr', e.target.value) });
          const au = el('label', { style: 'display:flex;gap:10px;align-items:center;font-size:13px;cursor:pointer' }, el('input', { type: 'checkbox', checked: !!b.auto, onchange: e => { if (e.target.checked) set('auto', true); else { delete b.auto; touch('cases'); } } }), 'Plays on its own and loops (a cursor clicks through it; visitors can click in to take over)');
          const hh = el('input', { type: 'number', min: 360, max: 1400, step: 20, value: b.h || 760, oninput: e => set('h', +e.target.value || 760) });
          const fld = (t, x, help) => el('div', { class: 'f' }, el('label', { text: t }), x, help ? el('div', { class: 'help', text: help }) : '');
          const m = el('div', { class: 'modal', onclick: e => { if (e.target === m) done(); } }, el('div', { class: 'sheet', style: 'width:min(560px,100%)' },
            el('header', {}, el('b', { text: 'Prototype' }), el('button', { class: 'x', type: 'button', text: '×', onclick: done })),
            el('div', { class: 'mbody form', style: 'gap:14px' }, fld('Prototype', pick), fld('Or its address', src, 'Drop any .html prototype into the Prototype folder and it shows in the list above. A full https:// link works too.'),
              fld('Name in its top bar', addr), au, fld('Height on desktop (px)', hh, 'Phones get up to 78% of the screen.'),
              el('div', { class: 'acts', style: 'display:flex;gap:8px;justify-content:flex-end' }, el('button', { class: 'btn small', type: 'button', text: 'Done', onclick: done })))));
          document.body.append(m); }
        function blockMedia(path) { const b = objAt(path); if (!b) return; if (b.t === 'proto') { blockProto(b); return; }
          const done = () => { m.remove(); send(); };
          const m = el('div', { class: 'modal', onclick: e => { if (e.target === m) done(); } }, el('div', { class: 'sheet', style: 'width:min(680px,100%)' },
            el('header', {}, el('b', { text: b.t === 'video' ? 'Video' : 'Picture' }), el('button', { class: 'x', type: 'button', text: '×', onclick: done })),
            el('div', { class: 'mbody form', style: 'gap:14px' }, richMedia(b.m || '', v => { b.m = v; touch('cases'); send(); }, { rich: true, _file: 'cases' }),
              el('div', { class: 'acts', style: 'display:flex;gap:8px;justify-content:flex-end' }, el('button', { class: 'btn small', type: 'button', text: 'Done', onclick: done })))));
          document.body.append(m); }
        function blockOp(d) {
          if (d.op === 'section') { const at = d.w === 'brief' ? 0 : +String(d.w).split(':')[0] + 1; c.sections = c.sections || [];
            c.sections.splice(at, 0, { h: 'New section', title: '', blocks: [{ t: 'text', v: '' }], media: [] }); touch('cases'); send(`sections.${at}.title`); toast('Section added'); return; }
          if (d.op === 'more') { const b = objAt(d.path); if (!b) return; b.items = b.items || []; b.items.push(b.t === 'notes' ? { p: '', w: '' } : ['', '']); touch('cases');
            send(b.t === 'notes' ? `${d.path}.items.${b.items.length - 1}.p` : `${d.path}.items.${b.items.length - 1}.0`); return; }
          if (d.op === 'media') { blockMedia(d.path); return; }
          const P = placeOf(d.w); if (!P) return; const L = P.list, j = d.pos;
          if (d.op === 'insert' || d.op === 'replace') { const b = (FRESH[d.t] || FRESH.text)();
            if (d.op === 'replace' && L[j] && (L[j].t || 'text') === 'text' && !String(L[j].v || '').replace(/^\/\S*/, '').trim()) L.splice(j, 1, b);
            else { if (d.op === 'replace' && L[j]) L[j].v = String(L[j].v || '').replace(/^\/\S*/, '').trim(); L.splice(d.op === 'replace' ? j + 1 : j, 0, b); }
            const at = L.indexOf(b); touch('cases'); send(focusOf(P, at, b)); if (b.t === 'picture' || b.t === 'video' || b.t === 'proto') blockMedia(`${P.path}.${at}`); return; }
          if (!L[j]) return;
          if (d.op === 'turn') { L[j].t = d.t; touch('cases'); send(`${P.path}.${j}.v`); return; }
          if (d.op === 'up' && j > 0) { L.splice(j - 1, 0, L.splice(j, 1)[0]); touch('cases'); send(); return; }
          if (d.op === 'down' && j < L.length - 1) { L.splice(j + 1, 0, L.splice(j, 1)[0]); touch('cases'); send(); return; }
          if (d.op === 'dup') { L.splice(j + 1, 0, clone(L[j])); touch('cases'); send(focusOf(P, j + 1, L[j + 1])); toast('Duplicated'); return; }
          if (d.op === 'del') { const gone = L.splice(j, 1)[0]; tidyList(P); touch('cases');
            const prev = j > 0 && L[j - 1] && TEXTY.includes(L[j - 1].t || 'text') ? `${P.path}.${j - 1}.v` : null; send(d.quiet ? prev : null);
            if (!d.quiet) toast((NAMEB[gone.t || 'text'] || 'Block') + ' deleted'); }
        }
        const TEXTY = ['text', 'heading', 'sub', 'quote'], NAMEB = { text: 'Text', heading: 'Heading', sub: 'Small heading', quote: 'Pull quote', picture: 'Picture', video: 'Video', points: 'Points', numbers: 'Big numbers', notes: 'Sticky notes', proto: 'Prototype' };
        // a picture clicked on the page: find where it lives in the case study, then replace or remove it in a small sheet,
        // and give its row a grid. A section's pictures become rows the first time you change one: every other row keeps
        // exactly the shape the page drew it in, and only the row you picked changes.
        const same = (m, src) => m && (typeof m === 'string' ? m === src : m.video === src || m.poster === src);
        const allMedia = () => [c.cover, ...(c.coverRows || []).flatMap(r => r.pics || []), ...(c.briefRows || []).flatMap(r => r.pics || []), ...(c.sections || []).flatMap(s => [...(s.media || []), ...(s.rows || []).flatMap(r => r.pics || [])]), ...(c.run || []), ...(c.gallery || []).flatMap(g => (g.rows || []).flatMap(r => r.pics || []))].filter(Boolean);
        const bySrc = src => allMedia().find(m => same(m, src)) || src;
        const block = path => {
          if (path === 'cover') return { label: 'Cover', get: () => c.coverRows, set: R => { c.coverRows = R; }, base: () => [c.cover].filter(Boolean) };
          if (path === 'brief') return { label: 'The brief', get: () => c.briefRows, set: R => { if (R && R.length) c.briefRows = R; else delete c.briefRows; }, base: () => [] };
          if (/^sections\.\d+$/.test(path || '')) { const sec = (c.sections || [])[+path.split('.')[1]]; if (!sec) return null;
            return { label: sec.h || 'Section', get: () => sec.rows, set: R => { sec.rows = R; }, base: () => (sec.media || []).filter(Boolean) }; }
          if (/^gallery\.\d+$/.test(path || '')) { const g = (c.gallery || [])[+path.split('.')[1]]; if (!g) return null;
            return { label: 'Picture section ' + (+path.split('.')[1] + 1), get: () => g.rows, set: R => { g.rows = R; }, base: () => [] }; }
          return null; };
        // the block's rows, made from what the page drew if it has none yet
        const rowsOfBlock = (B, groups) => { let R = B.get(); if (Array.isArray(R) && R.length) return R;
          R = groups && groups.length ? groups.filter(g => g.length).map(g => ({ pics: g.map(bySrc), fit: 'auto' })) : B.base().map(m => ({ pics: [m], fit: 'auto' }));
          B.set(R); return R; };
        const findSpot = (R, at) => { if (at.r != null && R[at.r] && (at.j == null || at.j < (R[at.r].pics || []).length)) return [at.r, at.j ?? 0];
          for (let r = 0; r < R.length; r++) { const j = (R[r].pics || []).findIndex(m => same(m, at.src)); if (j >= 0) return [r, j]; } return null; };
        const ROWK = [['wide', 'Full width', 1, ''], ['pairs', 'Pairs', 2, ''], ['p64', '60/40', 2, 'left'], ['p46', '40/60', 2, 'right'], ['threes', 'Threes', 3, ''], ['t622', '60/20/20', 3, 'left'], ['t262', '20/60/20', 3, 'middle'], ['t226', '20/20/60', 3, 'right'], ['fours', 'Fours', 4, '']];
        const kindOf = r => r.fit === 'auto' ? 'auto' : Array.isArray(r.w) ? 'custom' : (ROWK.find(k => k[2] === (r.pics || []).length && k[3] === (r.split || '')) || [''])[0];
        function setRow(R, ri, k) {   // one row only; a picture that no longer fits moves to its own full-width row just below
          const [, , n, sp] = ROWK.find(x => x[0] === k), r = R[ri], P = (r.pics || []).filter(Boolean), keep = P.slice(0, n), spill = P.slice(n);
          while (keep.length < n) keep.push(''); const o = { pics: keep }; if (sp) o.split = sp; if (n === 1 && r.shape) o.shape = r.shape; if (r.focus) o.focus = r.focus;
          R.splice(ri, 1, o, ...spill.map(m => ({ pics: [m] }))); }
        function swapSpots(d) { const B = block(d.section); if (!B) return; const R = rowsOfBlock(B, d.groups), a = findSpot(R, d.a), b = findSpot(R, d.b); if (!a || !b) return;
          const A = R[a[0]].pics, Bp = R[b[0]].pics, t = A[a[1]]; A[a[1]] = Bp[b[1]] || ''; Bp[b[1]] = t;
          for (const r of R) if (r.fit === 'auto') r.pics = r.pics.filter(Boolean);
          touch('cases'); send(); }
        function rowPanel(d, getSpot) {
          const B = block(d.section); if (!B) return null;
          const box = el('div', { class: 'lyt' }), note = el('div', { class: 'help' }), acts = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
          const paint = () => { box.innerHTML = ''; acts.innerHTML = ''; const R = B.get(), at = getSpot(), cur = R && at ? kindOf(R[at[0]]) : 'auto';
            [['auto', 'As it is', 0, '']].concat(ROWK).forEach(([k, name, n, sp]) => box.append(el('button', { type: 'button', class: 'lyt-b' + (k === cur ? ' on' : ''), 'aria-pressed': String(k === cur), disabled: k === 'auto',
              style: k === 'auto' && cur !== 'auto' ? 'display:none' : '', onclick: () => { const R2 = rowsOfBlock(B, d.groups), p = getSpot(true); if (!p) return; setRow(R2, p[0], k); touch('cases'); send(); paint(); } },
              k === 'auto' ? mini(null) : mini([{ n, split: sp }]), el('span', { text: name }))));
            const R2 = B.get(), p2 = getSpot(), empty = R2 ? R2.reduce((a, r) => a + (r.pics || []).filter(x => !x).length, 0) : 0;
            const cr = R2 && p2 && Array.isArray(R2[p2[0]].w) ? 'Custom widths: ' + R2[p2[0]].w.map(x => Math.round(x)).join(' / ') + '. Pick a grid to reset them. ' : '';
            note.textContent = cr + 'Only this picture’s row changes. On the page, drag the line after a picture to set its width. ' + (empty ? `${empty} empty spot${empty > 1 ? 's' : ''} in ${B.label}: click one on the page to fill it. Visitors never see an empty spot.` : 'Drag pictures on the page to swap them.');
            if (R2 && p2) acts.append(el('button', { class: 'btn ghost small', type: 'button', text: '+ Row below', onclick: () => { R2.splice(p2[0] + 1, 0, { pics: [''] }); touch('cases'); send(); paint(); } }),
              el('button', { class: 'btn ghost small', type: 'button', text: 'Remove this row', onclick: () => { if (!confirm('Remove this whole row from the page?')) return; R2.splice(p2[0], 1); touch('cases'); send(); document.querySelector('.modal:last-of-type')?.remove(); } })); };
          paint();
          return el('div', { class: 'f' }, el('label', { text: 'Grid for this row' }), box, note, acts);
        }
        const locate = (src, secPath) => {
          const si = secPath && secPath.startsWith('sections.') ? +secPath.split('.')[1] : -1, secs = c.sections || [];
          const inSec = k => { const j = (secs[k] && secs[k].media || []).findIndex(m => same(m, src)); return j >= 0 ? { arr: secs[k].media, j, label: secs[k].h || 'Section ' + (k + 1) } : null; };
          if (si >= 0) { const r = inSec(si); if (r) return r; }
          for (let k = 0; k < secs.length; k++) { const r = inSec(k); if (r) return r; }
          if (same(c.cover, src)) return { obj: c, key: 'cover', label: 'Cover picture' };
          const j = (c.run || []).findIndex(m => same(m, src)); if (j >= 0) return { arr: c.run, j, label: 'Extra pictures' };
          return null; };
        // a picture's effect, kept by the picture: c.fx[picture] = { k, second, points }. "Same as the case" uses the case's default.
        const FXL = [['', 'Same as the case' ], ['none', 'None (plain)'], ['beforeafter', 'Before and after', 'Compare'], ['swap', 'Hover to swap', 'Compare'], ['lens', 'Zoom lens', 'Look closer'], ['zoom', 'Click to zoom', 'Look closer'], ['pan', 'Drag to look around', 'Look closer'], ['hotspots', 'Hotspots', 'Look closer'], ['hoverzoom', 'Zoom on hover', 'Look closer'], ['patternzoom', 'Pattern zoom', 'Look closer'],
          ['camera', 'Camera', 'Motion'], ['tilt', 'Tilt', 'Motion'], ['kenburns', 'Ken Burns', 'Motion'], ['spotlight', 'Spotlight', 'Motion'], ['reveal', 'Reveal on scroll', 'Motion'], ['parallax', 'Parallax', 'Motion']];
        const FXH = { hoverzoom: 'Point at it and it slowly pushes in toward the pointer; it eases back when you leave. Tap on a phone.', patternzoom: 'As visitors scroll past, it zooms slowly into one detail until that fills the frame. Set the detail below.', beforeafter: 'Drag across to compare with a second picture (leave it empty to compare with the same picture in black and white).', swap: 'Point at it (tap on a phone) to show a second picture.', lens: 'A round magnifier follows the pointer.', zoom: 'Click a spot to zoom in right there; click again to zoom out.',
          pan: 'The picture is bigger than its frame: drag to look around.', hotspots: 'Numbered points that open a note. Add them below.', camera: 'A viewfinder that focuses as it comes into view; a click takes the shot.', tilt: 'Leans toward the pointer in 3D.',
          kenburns: 'A slow drift and zoom.', spotlight: 'Dimmed except a circle of light that follows the pointer.', reveal: 'Wipes in each time it scrolls into view.', parallax: 'Moves a little slower than the page as you scroll.' };
        const msrc = m => typeof m === 'string' ? m : m && (m.video || m.poster) || '';
        function fxPanel(getSrc) {
          const box = el('div', { class: 'f' }), paint = () => { box.innerHTML = ''; const src = getSrc(); if (!src) return; c.fx = c.fx || {}; const cur = c.fx[src] || {};
            const sel = el('select', { onchange: e => { const k = e.target.value; if (!k) delete c.fx[src]; else c.fx[src] = Object.assign({}, cur, { k }); if (!Object.keys(c.fx).length) delete c.fx; touch('cases'); send(); paint(); } });
            let og = null, g0 = null; FXL.forEach(([k, n, g]) => { if (g !== g0) { g0 = g; og = g ? el('optgroup', { label: g }) : null; if (og) sel.append(og); } (og || sel).append(el('option', { value: k, selected: (cur.k || '') === k }, k === '' && c.fxDefault ? 'Same as the case (' + (FXL.find(x => x[0] === c.fxDefault) || [, c.fxDefault])[1] + ')' : n)); });
            box.append(el('label', { text: 'Effect' }), sel);
            const k = cur.k || ''; if (FXH[k]) box.append(el('div', { class: 'help', text: FXH[k] }));
            const upd = patch => { c.fx[src] = Object.assign({}, c.fx[src] || { k }, patch); touch('cases'); send(); };
            if (k === 'beforeafter' || k === 'swap') box.append(el('div', { class: 'f', style: 'margin-top:10px' }, el('label', { text: k === 'swap' ? 'Picture on hover' : 'Before picture' }), mediaField(cur.second || '', v => upd({ second: v || undefined }), { accept: 'image/*' })));
            if (k === 'patternzoom') box.append(el('div', { class: 'help', style: 'margin-top:10px', text: 'The detail it zooms into: across and down, 0 to 100%.' }),
              el('div', { class: 'hsr', style: 'grid-template-columns:auto 80px auto 80px' }, el('span', { class: 'mono', text: 'Across' }), el('input', { type: 'number', min: 0, max: 100, value: cur.ox ?? 50, oninput: e => upd({ ox: +e.target.value }) }),
                el('span', { class: 'mono', text: 'Down' }), el('input', { type: 'number', min: 0, max: 100, value: cur.oy ?? 50, oninput: e => upd({ oy: +e.target.value }) })));
            if (k === 'hotspots') { const pts = (cur.points || []).slice(), list = el('div', { class: 'hsl' });
              const save = () => upd({ points: pts.filter(p => p.t) });
              const row = (p, i) => el('div', { class: 'hsr' }, el('b', { class: 'mono', text: String(i + 1) }),
                el('input', { type: 'number', min: 0, max: 100, value: p.x ?? 50, title: 'From the left, %', oninput: e => { p.x = +e.target.value; save(); } }),
                el('input', { type: 'number', min: 0, max: 100, value: p.y ?? 50, title: 'From the top, %', oninput: e => { p.y = +e.target.value; save(); } }),
                el('input', { type: 'text', value: p.t || '', placeholder: 'Title', oninput: e => { p.t = e.target.value; save(); } }),
                el('input', { type: 'text', value: p.d || '', placeholder: 'Note', oninput: e => { p.d = e.target.value; save(); } }),
                el('button', { class: 'btn ghost small', type: 'button', text: '✕', title: 'Remove this point', onclick: () => { pts.splice(i, 1); save(); paint(); } }));
              pts.forEach((p, i) => list.append(row(p, i)));
              box.append(el('div', { class: 'help', style: 'margin-top:10px', text: 'Each point: across and down (0 to 100%), a title, and a note.' }), list,
                el('button', { class: 'btn ghost small', type: 'button', style: 'justify-self:start', text: '+ Add point', onclick: () => { pts.push({ x: 50, y: 50, t: 'Point ' + (pts.length + 1), d: '' }); save(); paint(); } })); }
          }; paint(); return box; }
        function pictureSheet(d) {
          const B = block(d.section); let where, spot = null;
          // a picture in a block with rows (or one that gets rows when you pick a grid): it lives at a row and a spot
          const inRows = () => { const R = B && B.get(); return R && R.length ? R : null; };
          const getSpot = force => { let R = inRows(); if (!R && force) R = rowsOfBlock(B, d.groups); if (!R) return null; if (!spot) spot = findSpot(R, d) || null;
            else if (!(R[spot[0]] && (R[spot[0]].pics || [])[spot[1]] !== undefined && same(R[spot[0]].pics[spot[1]], cur.src))) spot = findSpot(R, { src: cur.src }) || spot; return spot; };
          const cur = { src: d.src };
          if (d.type === 'km-cms-slot') { const R = inRows(); if (!R || !R[d.r]) return; spot = [d.r, d.j]; where = { rows: true, label: B.label + ' · empty spot', slot: true }; }
          else if (d.type === 'km-cms-add') { if (!B) return; const R = inRows();
            if (R || d.section.startsWith('gallery.') || d.section === 'brief') { const RR = R || rowsOfBlock(B, null); RR.push({ pics: [''] }); spot = [RR.length - 1, 0]; where = { rows: true, label: B.label + ' · new row', slot: true, newRow: true }; }
            else if (d.section === 'cover') { const RR = rowsOfBlock(B, null); RR.push({ pics: [''] }); spot = [RR.length - 1, 0]; where = { rows: true, label: 'Cover · new row', slot: true, newRow: true }; }
            else { const sec = (c.sections || [])[+d.section.split('.')[1]]; if (!sec) return; sec.media = sec.media || []; where = { arr: sec.media, j: sec.media.length, label: sec.h || 'Section', adding: true }; } }
          else if (inRows() && getSpot()) where = { rows: true, label: B.label };
          else if (d.section === 'cover') where = { obj: c, key: 'cover', label: 'Cover' };
          else where = locate(d.src, d.section);
          if (!where && B) where = { rows: true, label: B.label, lazy: true };   // a picture the page borrowed: it joins this section once you give its row a grid
          if (!where) { alert('This picture is filled in by the page from your other pictures. Change it in the Form.'); return; }
          const viaRows = () => where.rows || (B && inRows() && findSpot(inRows(), cur));
          const get = () => { if (viaRows()) { const p = getSpot(), R = inRows(); return p && R ? R[p[0]].pics[p[1]] : d.src; } return where.obj ? where.obj[where.key] : where.arr[where.j]; };
          const put = v => { { const o = msrc(get()), n = msrc(v); if (c.fx && o && n && o !== n && c.fx[o]) { c.fx[n] = c.fx[o]; delete c.fx[o]; } }
            if (viaRows()) { const p = getSpot(true); if (!p) return; const R = inRows(); R[p[0]].pics[p[1]] = v; cur.src = typeof v === 'string' ? v : v && (v.video || v.poster); if (d.section === 'cover' && p[0] === 0 && p[1] === 0) c.cover = v; }
            else if (where.obj) where.obj[where.key] = v; else where.arr[where.j] = v; touch('cases'); send(); };
          const close = () => { m.remove(); if (where.newRow && !get()) { const R = inRows(), p = getSpot(); if (R && p) R.splice(p[0], 1); } if (where.adding && !get()) where.arr.splice(where.j, 1); send(); };
          const removeIt = () => { if (!confirm('Remove this picture?')) return;
            if (viaRows()) { const R = rowsOfBlock(B, d.groups), p = getSpot(true); if (p) { const r = R[p[0]]; if (r.fit === 'auto') { r.pics.splice(p[1], 1); if (!r.pics.length) R.splice(p[0], 1); } else r.pics[p[1]] = ''; } }
            else where.arr.splice(where.j, 1);
            touch('cases'); m.remove(); send(); };
          let fxBox = fxPanel(() => msrc(get()));
          const m = el('div', { class: 'modal', onclick: e => { if (e.target === m) close(); } },
            el('div', { class: 'sheet', style: 'width:min(680px,100%)' },
              el('header', {}, el('b', { text: (where.slot || where.adding ? 'Add a picture · ' : 'Picture · ') + where.label }), el('button', { class: 'x', type: 'button', text: '×', onclick: close })),
              el('div', { class: 'mbody form', style: 'gap:14px' },
                richMedia(get() || '', v => { put(v); fxBox.replaceWith(fxBox = fxPanel(() => msrc(get()))); }, { rich: true, _file: 'cases' }),
                fxBox,
                B ? rowPanel(d, getSpot) : null,
                el('div', { class: 'acts', style: 'display:flex;gap:8px;justify-content:flex-end' },
                  !where.obj && !where.adding && !where.slot ? el('button', { class: 'btn danger small', type: 'button', text: 'Remove from page', onclick: removeIt }) : null,
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

  // ---------------------------------------------------------------- inbox: messages from the site (About's Call in, Shop, feedback)
  const ITYPES = [['all', 'All'], ['new', 'Unread'], ['Hiring', 'Hiring'], ['Message', 'Messages'], ['Shop', 'Shop'], ['Notify', 'Notify me'], ['Feedback', 'Feedback'], ['done', 'Done'], ['archived', 'Archived']];
  let IBOX = null;
  async function inboxPoll() { try { const r = await api('/api/inbox'); if (r.items) { IBOX = r.items; const n = r.items.filter(m => m.status === 'new').length; if (n !== INBOX_NEW) { INBOX_NEW = n; nav(); } } } catch (_) {} }
  setInterval(() => { if (document.visibilityState === 'visible') inboxPoll(); }, 90000);
  const when = iso => { const d = new Date(iso), s = (Date.now() - d) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : s < 86400 * 7 ? Math.round(s / 86400) + ' d ago' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  async function vInbox(v) {
    head('Overview', 'Inbox');
    const body = el('div', {}, el('div', { class: 'mono', text: 'Checking for messages…' })); v.append(body);
    let r; try { r = await api('/api/inbox'); } catch (e) { body.innerHTML = '';
      if (/not found/i.test(e.message)) body.append(el('div', { class: 'empty' }, el('h2', { text: 'Restart the CMS to use the inbox' }), el('div', { text: 'The CMS was already running when the inbox was added. Close the “Start CMS” window (or press Control-C in it), open “Start CMS.command” again, then come back here.' })));
      else body.append(el('div', { class: 'err', text: e.message })); return; }
    body.innerHTML = '';
    if (!r.configured) { body.append(el('div', { class: 'empty' }, el('h2', { text: 'Set up your inbox' }),
      el('div', { text: (r.hasUrl ? 'Add the inbox key' : 'Add the inbox address') + ' in Settings → Inbox. The one-time Cloudflare setup is in cms/inbox/README.md (about ten minutes, free).' }),
      el('button', { class: 'btn small', type: 'button', style: 'margin-top:14px', text: 'Open Settings', onclick: () => go('settings') }))); return; }
    if (r.error) { body.append(el('div', { class: 'err', text: r.error })); return; }
    IBOX = r.items || []; INBOX_NEW = IBOX.filter(m => m.status === 'new').length; nav();
    let f = vInbox.f || 'all', q = '', openKey = vInbox.open || null;
    const chips = el('div', { class: 'tabs' }), search = el('input', { class: 'search', placeholder: 'Search messages…', oninput: e => { q = e.target.value.toLowerCase(); paint(); } });
    const list = el('div', { class: 'ibl' }), pane = el('div', { class: 'ibp' });
    body.append(el('div', { class: 'ibbar' }, chips, search), el('div', { class: 'ibox' }, list, pane));
    const set = async (m, status) => { const was = m.status; m.status = status; paint(); try { const x = await api('/api/inbox/update', { method: 'POST', body: JSON.stringify({ key: m.key, status }) }); if (x.error) throw new Error(x.error); } catch (e) { m.status = was; paint(); toast('Couldn’t update: ' + e.message); } INBOX_NEW = IBOX.filter(x => x.status === 'new').length; nav(); };
    const shows = m => (f === 'all' ? m.status !== 'archived' : f === 'new' ? m.status === 'new' : f === 'done' || f === 'archived' ? m.status === f : m.type === f && m.status !== 'archived')
      && (!q || [m.name, m.email, m.subject, m.message, ...Object.values(m.fields || {})].join(' ').toLowerCase().includes(q));
    function paint() {
      chips.innerHTML = ''; ITYPES.forEach(([k, n]) => { const c = k === 'all' ? IBOX.filter(m => m.status !== 'archived').length : k === 'new' ? IBOX.filter(m => m.status === 'new').length : k === 'done' || k === 'archived' ? IBOX.filter(m => m.status === k).length : IBOX.filter(m => m.type === k && m.status !== 'archived').length;
        if (!c && !['all', 'new'].includes(k) && f !== k) return; chips.append(el('button', { type: 'button', class: f === k ? 'on' : '', onclick: () => { f = vInbox.f = k; paint(); } }, n, el('sup', { text: String(c) }))); });
      const L = IBOX.filter(shows); list.innerHTML = '';
      if (!L.length) list.append(el('div', { class: 'empty' }, el('h2', { text: IBOX.length ? 'Nothing here' : 'No messages yet' }), el('div', { text: IBOX.length ? 'Try another filter.' : 'When someone writes in from the site, it shows up here.' })));
      L.forEach(m => list.append(el('button', { type: 'button', class: 'ibi' + (m.status === 'new' ? ' new' : '') + (m.key === openKey ? ' on' : ''), onclick: () => { openKey = vInbox.open = m.key; if (m.status === 'new') set(m, 'read'); paint(); } },
        el('div', { class: 'ibh' }, el('b', { text: m.name || m.email || 'Someone' }), el('span', { class: 'mono', text: when(m.at) })),
        el('div', { class: 'ibs' }, el('span', { class: 'ibt t-' + String(m.type).toLowerCase(), text: m.type }), m.subject || ''),
        el('div', { class: 'ibx', text: (m.message || Object.entries(m.fields || {}).map(([a, b]) => a + ': ' + b).join(' · ')).slice(0, 140) }))));
      const m = IBOX.find(x => x.key === openKey); pane.innerHTML = '';
      if (!m) { pane.append(el('div', { class: 'empty' }, el('div', { text: L.length ? 'Pick a message to read it.' : '' }))); return; }
      const reply = m.email ? `mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'your message'))}&body=${encodeURIComponent('\n\n—\nOn ' + new Date(m.at).toLocaleString() + ', ' + (m.name || m.email) + ' wrote:\n' + (m.message || '').split('\n').map(l => '> ' + l).join('\n'))}` : null;
      pane.append(
        el('div', { class: 'ibph' }, el('span', { class: 'ibt t-' + String(m.type).toLowerCase(), text: m.type }), el('span', { class: 'mono', text: new Date(m.at).toLocaleString() + (m.page ? ' · from ' + m.page : '') + (m.country ? ' · ' + m.country : '') })),
        el('h2', { text: m.subject || (m.type + ' from ' + (m.name || m.email || 'someone')) }),
        el('div', { class: 'ibwho' }, el('b', { text: m.name || '—' }), m.email ? el('a', { href: 'mailto:' + m.email, text: m.email }) : null),
        m.message ? el('div', { class: 'ibmsg', text: m.message }) : null,
        Object.keys(m.fields || {}).length ? el('dl', { class: 'ibf' }, ...Object.entries(m.fields).flatMap(([a, b]) => [el('dt', { class: 'mono', text: a }), el('dd', { text: b })])) : null,
        el('div', { class: 'acts', style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:22px' },
          reply ? el('a', { class: 'btn small', href: reply, text: 'Reply by email' }) : null,
          el('button', { class: 'btn ghost small', type: 'button', text: m.status === 'done' ? 'Mark not done' : 'Mark done', onclick: () => set(m, m.status === 'done' ? 'read' : 'done') }),
          el('button', { class: 'btn ghost small', type: 'button', text: m.status === 'new' ? 'Mark read' : 'Mark unread', onclick: () => set(m, m.status === 'new' ? 'read' : 'new') }),
          el('button', { class: 'btn ghost small', type: 'button', text: m.status === 'archived' ? 'Unarchive' : 'Archive', onclick: () => set(m, m.status === 'archived' ? 'read' : 'archived') }),
          el('button', { class: 'btn danger small', type: 'button', text: 'Delete', onclick: async () => { if (!confirm('Delete this message for good?')) return; try { const x = await api('/api/inbox/delete', { method: 'POST', body: JSON.stringify({ key: m.key }) }); if (x.error) throw new Error(x.error); IBOX = IBOX.filter(y => y !== m); openKey = null; paint(); INBOX_NEW = IBOX.filter(y => y.status === 'new').length; nav(); } catch (e) { toast('Couldn’t delete: ' + e.message); } } })));
    }
    paint();
  }

  async function vSettings(v) {
    head('Site', 'Settings');
    C.site.analytics = C.site.analytics || { goatcounter: '' };
    if (C.site.available === undefined) C.site.available = true;
    const tok = el('input', { type: 'text', placeholder: HAS_TOKEN ? 'Saved on this Mac · paste a new one to replace it' : 'Paste your GoatCounter API token' });
    v.append(form([{ title: 'Availability', help: 'Shown on Home (“Open to new work”), on About (On air) and in the For recruiters card.', fields: [{ k: 'available', label: 'Taking new work', type: 'bool' }] }], C.site, 'site'));
    if (!C.site.corners) C.site.corners = 'rounded';
    v.append(form([{ title: 'Corners', help: 'The corners on pictures, videos and panels across the whole site: Designs, case studies, brand pages, Shop, Showcase and About.', fields: [{ k: 'corners', label: 'Corner style', type: 'select', options: [['rounded', 'Rounded'], ['sharp', 'Sharp (square corners)']] }] }], C.site, 'site'));
    if (!C.site.accent) C.site.accent = '#ff4a1c';
    { // Accent colour: every place the site uses its orange-red (needles, live dots, links, highlights) takes this colour
      const g = form([{ title: 'Accent colour', help: 'The orange-red used across the whole site: the red needle on every dial, live dots, highlights, the offline page and the tuner between pages. Pick a preset or any colour. Pictures keep their own colours.', fields: [{ k: 'accent', label: 'Colour', type: 'color' }] }], C.site, 'site');
      const box = g.querySelector('.group'), tx = box.querySelector('.color input[type=text]'), pk = box.querySelector('.color input[type=color]');
      const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
      const note = el('div', { class: 'help' });
      const check = () => { const v = (tx.value || '').trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) { note.textContent = 'Use a hex colour like #ff4a1c.'; return; }
        const onW = 1.05 / (lum(v) + .05), onB = (lum(v) + .05) / .05;
        note.textContent = onW < 3 ? 'Light colour: the few small labels with white text on the accent may be hard to read. A deeper shade works better.' : onB < 3 ? 'Dark colour: it may be hard to see on the dark theme.' : 'Reads well on both the light and dark themes.'; };
      const PRE = [['#ff4a1c', 'Signal red (default)'], ['#fb233b', 'Crimson'], ['#2f5bff', 'Cobalt'], ['#7a4dff', 'Violet'], ['#ff2e7e', 'Magenta'], ['#0fa968', 'Green'], ['#ff9f0a', 'Amber']];
      const sw = el('div', { class: 'swatches' }, ...PRE.map(([h, n]) => el('button', { type: 'button', class: 'sw', title: n, 'aria-label': n, style: `background:${h}`,
        onclick: () => { tx.value = h; pk.value = h; tx.dispatchEvent(new Event('input')); check(); } })));
      tx.addEventListener('input', check); pk.addEventListener('input', check); box.append(sw, note); check(); v.append(g);
    }
    if (!C.site.needle) C.site.needle = 'line';
    v.append(form([{ title: 'Dials', help: 'The head on the red needle, on every dial across the site (About, Engineering, the case study rulers and the logo and product pages).', fields: [{ k: 'needle', label: 'Needle head', type: 'select', options: [['line', 'Plain line (as now)'], ['dot', 'Dot'], ['triangle', 'Arrow'], ['diamond', 'Diamond'], ['cap', 'T cap']] }] }], C.site, 'site'));
    C.site.feedback = C.site.feedback || { on: true, to: 'iamkingsleey@gmail.com', after: 3 };
    v.append(form([{ title: 'Feedback', help: 'After a few minutes on the site, visitors are asked how easy it was to get around (1 to 5), and what they liked or what got in their way. Answers come to your email. The very first one sends you an email from FormSubmit asking you to confirm the address: click Activate in it once, and every answer after that arrives.', fields: [
      { k: 'on', label: 'Ask visitors', type: 'bool' }, { k: 'to', label: 'Send answers to', ph: 'you@example.com' }, { k: 'after', label: 'Minutes on the site before asking', ph: '3' }] }], C.site.feedback, 'site'));
    C.site.inbox = C.site.inbox || { url: '', email: true };
    const ikey = el('input', { type: 'text', placeholder: HAS_IKEY ? 'Saved on this Mac · paste a new one to replace it' : 'Paste the KEY you gave the Worker' });
    v.append(form([{ title: 'Inbox', help: 'Messages from the site (the Call in form on About, Shop requests and “Notify me”, feedback answers) come into Inbox. They are kept by a small free Cloudflare Worker until you read them here: set it up once with the steps in cms/inbox/README.md, then paste its address. Publish after saving so the site starts sending.', fields: [
      { k: 'url', label: 'Inbox address', ph: 'https://kingsley-inbox.you.workers.dev' }, { k: 'email', label: 'Also email me feedback answers', type: 'bool' }] }], C.site.inbox, 'site'),
      el('div', { class: 'group', style: 'margin-top:26px' }, el('h2', { text: 'Inbox key' }), el('p', { class: 'help', text: 'The same KEY you saved as a secret on the Worker. It stays on this Mac and is never put on the site.' }),
        el('div', { class: 'f' }, ikey), el('button', { class: 'btn small', type: 'button', style: 'justify-self:start', text: 'Save key', onclick: async () => { if (!ikey.value.trim()) return; await api('/api/secrets', { method: 'PUT', body: JSON.stringify({ inbox_key: ikey.value.trim() }) }); HAS_IKEY = true; ikey.value = ''; ikey.placeholder = 'Saved on this Mac'; toast('Key saved'); inboxPoll(); } })));
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
      else { toast(`Saved and rebuilt in ${r.seconds}s`); INDEX = (await api('/api/content')).index; if (typeof pubCount === 'function') pubCount(); }
    } catch (e) { toast(e.message, true); }
    b.classList.remove('busy'); b.textContent = 'Save & rebuild';
  }
  $('save').onclick = save;
  // Publish from anywhere: saves first if there are unsaved changes, then sends what you've saved to the live site.
  // The Publish page is still there to look through the changes first.
  const pubCount = async () => { try { const c = await api('/api/changes'); const n = c.total || 0; $('pub').textContent = n ? `Publish · ${n}` : 'Publish'; return c; } catch (_) { return null; } };
  $('pub').onclick = async () => {
    const b = $('pub'); if (b.classList.contains('busy')) return;
    if (dirty.size) { await save(); if (dirty.size) return; }   // the save stopped: nothing goes live until it works
    b.classList.add('busy'); b.textContent = 'Checking…';
    const c = await pubCount(); b.classList.remove('busy');
    if (!c) { toast('Couldn’t check your changes. Is the CMS still running?', true); await pubCount(); return; }
    if (!c.total && !c.pages) { toast('Nothing new to publish. Your live site already has everything.'); return; }
    const n = c.total || 0;
    if (!confirm(n ? `Publish ${n} change${n > 1 ? 's' : ''} to your live site?` : 'Publish your rebuilt pages to your live site?')) { await pubCount(); return; }
    b.classList.add('busy'); b.textContent = 'Publishing…';
    try { const r = await api('/api/publish', { method: 'POST', body: JSON.stringify({ message: 'Update content' }) });
      if (r.ok) toast('Published. GitHub updates the site in a minute or two.');
      else openModal('Publishing stopped', el('div', { class: 'form' }, el('div', { class: 'err', text: 'Nothing went live. The message below says why.' }), el('pre', { class: 'log', text: r.log }))); }
    catch (e) { toast(e.message, true); }
    b.classList.remove('busy'); await pubCount(); if (route === 'publish') render();
  };
  pubCount();

  // ---------------------------------------------------------------- start
  (async function start() {
    try {
      const r = await api('/api/content');
      C = r.content; INDEX = r.index; HAS_TOKEN = r.hasToken; HAS_IKEY = !!r.hasInboxKey; inboxPoll();
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
