  // ---------- versions of the mark, colour and type sections ----------
  // The CMS sets a case study's own ("brandVer"); the address can override it for a preview (brand.html#oghosa/type=ticker).
  // Options: type = dial · ticker · specimen; col = dial · swatch; mark = sketch · still. Defaults: type dial, colour dial, mark sketch. Applications: sequence. Opening (info) = sheet · read · split · stations, default split.
  const VV = Object.assign({ info: 'split', mark: 'sketch', col: 'dial', type: 'dial' }, CS.brandVer || {},
    Object.fromEntries((decodeURIComponent(location.hash.slice(1)).split('/')[1] || '').split(',').filter(Boolean).map(x => x.split('='))));
  window.KMVV = VV;
  const VT = [];   // per-frame work for the versions
  const clampV = (v, a, b) => Math.max(a, Math.min(b, v));
  const progV = (sec, n) => { const r = sec.getBoundingClientRect(), p = clampV(-r.top / Math.max(1, r.height - innerHeight), 0, 1) * (n - 1), i = Math.floor(p), f = p - i, k = clampV((f - .3) / .4, 0, 1); return i + k * k * (3 - 2 * k); };
  const sndV = n => { try { if (localStorage.getItem('km-sound') === 'off') return; } catch (_) {} if (window.Popkit) Popkit.play(n); };
  const imgV = (m, cls = '') => `<img class="${cls}" src="${R(typeof m === 'string' ? m : m.poster || '')}" alt="${esc(CS.title)}">`;

  // Mark · Sketch to final: the red split line from the opening, dragged (or scrolled) across sketch and final
  if (VV.mark === 'sketch') {
    $('build').outerHTML = `<figure class="build pic cmpv in" id="build"><div class="cl sk">${imgV(SH[1][0])}</div><div class="cl" id="mkfin">${imgV(SH[1][0])}</div>
      <i class="cline" id="mkline"><span class="split-tag" id="mktag">50 / 50</span></i><span class="cmpl mono">Sketch</span><span class="cmpl r mono">Final</span></figure>`;
    const box = $('build'); let cx = .5, ct = .5, drag = false, seen = false, last = 50;
    const at = e => { const r = box.getBoundingClientRect(); ct = clampV((e.clientX - r.left) / r.width, .03, .97); };
    box.addEventListener('pointerdown', e => { drag = seen = true; box.setPointerCapture(e.pointerId); at(e); sndV('pop'); });
    box.addEventListener('pointermove', e => { if (drag) at(e); }); box.addEventListener('pointerup', () => drag = false);
    VT.push(dt => { if (!seen) { const r = box.getBoundingClientRect(); ct = clampV(.9 - clampV((innerHeight - r.top) / (innerHeight + r.height), 0, 1) * .8, .08, .92); }
      cx += (ct - cx) * (1 - Math.exp(-dt / 90)); $('mkfin').style.clipPath = `inset(0 0 0 ${(cx * 100).toFixed(2)}%)`; $('mkline').style.left = (cx * 100).toFixed(2) + '%';
      const pc = Math.round(cx * 100); if (pc !== last) { $('mktag').textContent = `${pc} / ${100 - pc}`; last = pc; } });
  }

  // Colour · Dial: the screen floods with each colour as the needle tunes to its station
  function colourDial(P) {
    P = P.slice(0, 4); const FQ = ['88.1', '91.4', '96.7', '104.3'];
    const sec = $('freqs'); sec.className = 'freqs cdial'; sec.style.height = (P.length * 80 + 40) + 'vh';
    sec.innerHTML = `<div class="cpin"><div class="cfill" id="cfill"></div><div class="cinfo" id="cinfo"><span class="mono" id="cfq"></span><b id="cnm"></b><span class="mono" id="chex"></span></div>
      <div class="cstations">${P.map(([n, h], k) => `<span class="mono" data-k="${k}">${FQ[k]} · ${esc(n)}</span>`).join('')}</div><div class="cruler"><canvas id="crc"></canvas></div></div>`;
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), cols = P.map(p => rgb(p[1])), cv = $('crc'), cx = cv.getContext('2d'), st = [...sec.querySelectorAll('.cstations span')];
    let cur = -1;
    VT.push(() => {
      const q = progV(sec, P.length), i = Math.min(P.length - 2, Math.floor(q)), t = q - i, c = cols[i].map((v, k) => v + (cols[i + 1][k] - v) * t);
      $('cfill').style.background = `rgb(${c.map(Math.round).join(' ')})`;
      const lum = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; sec.style.color = lum > 150 ? '#0e0e10' : '#fff';
      const k = Math.round(q); if (k !== cur) { if (cur >= 0) sndV('detent'); cur = k; $('cfq').textContent = FQ[k] + ' FM · ' + pad(k + 1); $('cnm').textContent = P[k][0]; $('chex').textContent = P[k][1].toUpperCase() + ' · RGB ' + cols[k].join(' '); st.forEach((s, j) => s.classList.toggle('on', j === k)); }
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); const col = getComputedStyle(sec).color, SP = 12, mid = W / 2;
      for (let n = -60; n <= (P.length - 1) * 10 + 60; n++) { const x = mid + (n - q * 10) * SP; if (x < 0 || x > W) continue; const major = n % 10 === 0 && n >= 0 && n <= (P.length - 1) * 10;
        cx.globalAlpha = major ? .9 : .3; cx.strokeStyle = col; cx.lineWidth = major ? 2 : 1; cx.beginPath(); cx.moveTo(x, H); cx.lineTo(x, H - (major ? 22 : 9)); cx.stroke(); }
      cx.globalAlpha = 1; cx.fillStyle = RED; cx.fillRect(mid - 1.5, H - 34, 3, 34);
    });
  }
  (function vloop() { let pt = performance.now(); const f = now => { const dt = Math.min(64, now - pt); pt = now; VT.forEach(fn => fn(dt)); requestAnimationFrame(f); }; requestAnimationFrame(f); })();
