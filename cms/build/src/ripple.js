/* Ripple: pictures react to the pointer like water. Small moves leave soft rings; keep moving and the water builds up,
   stronger and wider, then settles back to still when you rest. One WebGL surface follows the picture under the pointer,
   so the page never holds more than one GL context. It sits over the picture only while the water moves, so a still
   picture is always the browser's own sharp one.
   Works on <img> pictures and on tiles painted with a CSS background (the Designs grid). Skips videos, small images,
   the header and navigation, anything marked data-noripple, touch screens and Reduce Motion. */
(() => {
  if (window.__kmRipple) return; window.__kmRipple = true;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MIN = 140;   // smallest picture (css px) that ripples
  const SKIP = 'header, nav, .kmn-scale, .kmn-menu, .km-tg, [data-noripple], .dback, .cnav, .wb, .kframe, .fw, iframe, .logo, .av, .d-mini .d-info';
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0,1);}';
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D img,wav;uniform vec2 sc,off;uniform float amt,ca;
  void main(){vec4 w=texture2D(wav,v);vec2 n=(w.rg-.5)*2.;float h=(w.b-.5)*2.;
   vec2 uv=off+v*sc, d=n*amt;
   if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){gl_FragColor=vec4(0.);return;}
   vec4 g=texture2D(img,uv+d);
   vec3 c=vec3(texture2D(img,uv+d*(1.+ca)).r,g.g,texture2D(img,uv+d*(1.-ca)).b);
   float s=pow(clamp(dot(normalize(vec3(-n*3.,1.)),normalize(vec3(-.4,-.5,1.))),0.,1.),36.);
   c+=s*.35*clamp(length(n)*6.,0.,1.);c*=1.-h*.06;
   gl_FragColor=vec4(c*g.a,g.a);}`;

  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity .25s;z-index:1;display:block;margin:0;max-width:none';
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const mkTex = u => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; };
  const tImg = mkTex(0), tWav = mkTex(1); gl.uniform1i(U('img'), 0); gl.uniform1i(U('wav'), 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const MAXT = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

  // ---------- which picture is under the pointer ----------
  const bgUrl = el => { const b = getComputedStyle(el).backgroundImage; if (!b || b === 'none') return ''; const m = /url\(["']?([^"')]+)["']?\)/.exec(b); return m ? m[1] : ''; };
  function pick(t) {
    if (!(t instanceof Element) || t.closest(SKIP)) return null;
    let el = t.closest('img');
    if (!el) { for (let e = t, k = 0; e && k < 4; e = e.parentElement, k++) { if (e.querySelector && e.querySelector(':scope > video')) return null; if (bgUrl(e)) { el = e; break; } } }
    if (!el || el.closest(SKIP) || el.dataset.noripple !== undefined) return null;
    if (el.tagName === 'IMG' && (!el.complete || !el.naturalWidth || /\.svg(\?|$)/i.test(el.currentSrc || el.src))) return null;
    const r = el.getBoundingClientRect(); if (r.width < MIN || r.height < MIN) return null;
    if (getComputedStyle(el).visibility === 'hidden' || +getComputedStyle(el).opacity < .05) return null;
    return el;
  }

  // ---------- the picture as a texture (same-origin or CORS; anything else is left alone) ----------
  const cache = new Map();   // url -> Image (loaded with CORS so WebGL may read it)
  function source(el) {
    const u = el.tagName === 'IMG' ? (el.currentSrc || el.src) : bgUrl(el);
    if (!u) return null;
    let im = cache.get(u);
    if (!im) { im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = u; im.onerror = () => { im.bad = true; }; cache.set(u, im); if (cache.size > 40) cache.delete(cache.keys().next().value); }
    return im;
  }

  // ---------- the water ----------
  let GW = 160, GH = 160, A = new Float32Array(GW * GH), B = new Float32Array(GW * GH), px = new Uint8Array(GW * GH * 4);
  let cur = null, curIm = null, heat = 0, last = null, inside = false, awake = 0, still = 0, live = false;
  const drop = (gx, gy, rad, amp) => { const r2 = rad * rad, x0 = Math.max(1, gx - rad | 0), x1 = Math.min(GW - 2, gx + rad | 0), y0 = Math.max(1, gy - rad | 0), y1 = Math.min(GH - 2, gy + rad | 0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dd = (x - gx) * (x - gx) + (y - gy) * (y - gy); if (dd < r2) A[y * GW + x] += amp * (.5 + .5 * Math.cos(Math.PI * Math.sqrt(dd / r2))); } };

  function fit() {   // place the canvas exactly over the picture, inside its own positioned parent, so it scrolls with it
    const el = cur, host = el.tagName === 'IMG' ? el.offsetParent || el.parentElement : el;
    if (!host) return false;
    if (el.tagName !== 'IMG' && getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (cv.parentElement !== host) host.appendChild(cv);
    // layout sizes (not the on-screen box), so a hover zoom on the tile scales the water with it instead of twice
    const ecs = getComputedStyle(el), ew = el.offsetWidth, eh = el.offsetHeight, er = { width: ew, height: eh };
    if (!ew || !eh) return false;
    const left = el.tagName === 'IMG' ? el.offsetLeft : -parseFloat(ecs.borderLeftWidth || 0), top = el.tagName === 'IMG' ? el.offsetTop : -parseFloat(ecs.borderTopWidth || 0);
    const d = Math.min(2.5, devicePixelRatio || 1), W = Math.max(1, Math.round(ew * d)), H = Math.max(1, Math.round(eh * d));
    Object.assign(cv.style, { left: left + 'px', top: top + 'px', width: ew + 'px', height: eh + 'px', borderRadius: ecs.borderRadius });
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    const nGH = Math.max(40, Math.min(320, Math.round(GW * er.height / er.width)));
    if (nGH !== GH) { GH = nGH; A = new Float32Array(GW * GH); B = new Float32Array(GW * GH); px = new Uint8Array(GW * GH * 4); }
    // object-fit / background-size: cover by default, contain and fill when asked
    const iw = curIm.naturalWidth, ih = curIm.naturalHeight, ia = iw / ih, ba = er.width / er.height;
    const mode = el.tagName === 'IMG' ? getComputedStyle(el).objectFit : (/contain/.test(getComputedStyle(el).backgroundSize) ? 'contain' : 'cover');
    let sx = 1, sy = 1;
    if (mode === 'cover' || mode === 'none' || mode === 'scale-down') { if (ia > ba) sx = ba / ia; else sy = ia / ba; }
    else if (mode === 'contain') { if (ia > ba) sy = ia / ba; else sx = ba / ia; }
    gl.uniform2f(U('sc'), sx, sy); gl.uniform2f(U('off'), (1 - sx) / 2, (1 - sy) / 2);
    return true;
  }
  function upload() {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg);
    let src = curIm;
    if (curIm.naturalWidth > MAXT || curIm.naturalHeight > MAXT) { const k = MAXT / Math.max(curIm.naturalWidth, curIm.naturalHeight), c = document.createElement('canvas'); c.width = curIm.naturalWidth * k | 0; c.height = curIm.naturalHeight * k | 0; c.getContext('2d').drawImage(curIm, 0, 0, c.width, c.height); src = c; }
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return true; } catch (_) { curIm.bad = true; return false; }
  }
  function attach(el) {
    const im = source(el); if (!im || im.bad) return;
    const go = () => { if (im.bad || !im.naturalWidth || hoverEl !== el) return;
      cur = el; curIm = im; A.fill(0); B.fill(0); heat = 0; last = null;
      if (!fit() || !upload()) { cur = null; return; } live = true; still = 0; };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', () => { if (hoverEl === el) go(); }, { once: true });
  }

  let hoverEl = null, lastPick = 0;
  function findAt(x, y) {
    const st = document.elementsFromPoint(x, y);
    for (let k = 0; k < Math.min(7, st.length); k++) { const e = st[k];
      if (e === cv) continue;
      if (e.closest(SKIP)) return null;                       // the header or nav is on top here: no water under it
      const el = pick(e); if (el) return el; }
    return null;
  }
  document.documentElement.addEventListener('pointerleave', () => { inside = false; hoverEl = null; last = null; });
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastPick > 90 || (hoverEl && !hoverEl.isConnected)) { lastPick = now; const el = findAt(e.clientX, e.clientY);
      if (el !== hoverEl) { hoverEl = el; last = null; inside = !!el; if (el && el !== cur) { cv.style.opacity = '0'; live = false; attach(el); } } }
    if (!cur || !live || hoverEl !== cur) { inside = false; return; }
    inside = true;
    const r = cur.getBoundingClientRect(); if (!r.width) return;
    const gx = (e.clientX - r.left) / r.width * GW, gy = (e.clientY - r.top) / r.height * GH;
    if (gx < 0 || gy < 0 || gx > GW || gy > GH) { last = null; return; }
    if (last) { const dx = gx - last[0], dy = gy - last[1], dist = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(dist / 2));
      heat = Math.min(1, heat + dist * .0025);                                    // the longer you keep moving, the hotter it gets
      const rad = 2.2 + heat * 5.5, amp = (.35 + heat * 1.9) * Math.min(1.6, .35 + dist * .08);
      for (let s = 1; s <= n; s++) drop(last[0] + dx * s / n, last[1] + dy * s / n, rad, amp / n * 1.2); }
    last = [gx, gy]; awake = performance.now(); still = 0;
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (!cur || !live || hoverEl !== cur) return; const r = cur.getBoundingClientRect();
    drop((e.clientX - r.left) / r.width * GW, (e.clientY - r.top) / r.height * GH, 4 + heat * 6, 3); still = 0;
  }, { passive: true });

  (function frame() {
    requestAnimationFrame(frame);
    if (!live || !cur) return;
    if (!cur.isConnected) { live = false; cur = null; cv.remove(); return; }
    heat *= inside && performance.now() - awake < 120 ? .996 : .975;           // cools quickly at rest, slowly while you keep going
    let energy = 0; const damp = .986 - heat * .004;
    for (let it = 0; it < 2; it++) { for (let y = 1; y < GH - 1; y++) { const o = y * GW; for (let x = 1; x < GW - 1; x++) { const i = o + x; B[i] = ((A[i - 1] + A[i + 1] + A[i - GW] + A[i + GW]) * .5 - B[i]) * damp; } } const t = A; A = B; B = t; }
    for (let y = 0; y < GH; y++) { const o = y * GW; for (let x = 0; x < GW; x++) { const i = o + x, h = A[i];
      const dx = A[x < GW - 1 ? i + 1 : i] - A[x > 0 ? i - 1 : i], dy = A[y < GH - 1 ? i + GW : i] - A[y > 0 ? i - GW : i];
      energy += h < 0 ? -h : h; const q = i * 4;
      px[q] = Math.max(0, Math.min(255, 128 + dx * 42)); px[q + 1] = Math.max(0, Math.min(255, 128 + dy * 42)); px[q + 2] = Math.max(0, Math.min(255, 128 + h * 40)); px[q + 3] = 255; } }
    if (energy < GW * GH * .0004) { if (++still > 20) { cv.style.opacity = '0'; if (!inside) { live = false; cur = null; } return; } }   // calm again: hand back to the real picture
    else if (energy > 2) cv.style.opacity = '1';
    fit();
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tWav);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GW, GH, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.uniform1f(U('amt'), .03); gl.uniform1f(U('ca'), .08 + heat * .25);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })();
})();
