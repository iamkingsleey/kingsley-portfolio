  // ---------- type versions: dial, ticker (specimen is the page's own) ----------
  {
    const TYS = CS.type || [['Primary', 'Geist']], TF = TYS[0][1], TB = (TYS[1] || TYS[0])[1];
    const VAR = { 'Bricolage Grotesque': [200, 800], 'Epilogue': [100, 900], 'Geist': [100, 900] };
    const loadF = f => { if (!VAR[f] || f === 'Geist') return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@' + VAR[f].join('..') + '&display=swap'; document.head.appendChild(l); };
    loadF(TF); loadF(TB);
    const ff = f => VAR[f] ? `'${f}', var(--body)` : /serif/i.test(f) ? 'Georgia, "Times New Roman", serif' : 'var(--body)';
    const [w0, w1] = VAR[TF] || [400, 700];
    const box = html => { $('typebox').outerHTML = html; return $('typebox'); };
    const word = CS.title;
    const line = (CS.statement || CS.blurb).replace(/\.$/, '');

    if (VV.type === 'dial') {          // the weights are stations; scroll tunes through them
      const WS = [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold']].filter(w => w[0] >= w0 && w[0] <= w1);
      const sec = box(`<section class="type tdial" id="typebox" style="height:${WS.length * 70 + 40}vh"><div class="tpin"><span class="mono tdl" id="tdl"></span><span class="tbig" id="tdw" style="font-family:${ff(TF)}">${esc(word)}</span>
        <div class="tdst">${WS.map(w => `<span class="mono">${w[0]} · ${w[1]}</span>`).join('')}</div><div class="truler"><canvas id="tdc"></canvas></div></div></section>`);
      const cv = $('tdc'), cx = cv.getContext('2d'), st = [...sec.querySelectorAll('.tdst span')]; let cur = -1;
      VT.push(() => { const q = progV(sec, WS.length), i = Math.min(WS.length - 2, Math.floor(q)), t = q - i, w = WS[i][0] + (WS[i + 1][0] - WS[i][0]) * t;
        $('tdw').style.fontWeight = Math.round(w);
        const k = Math.round(q); if (k !== cur) { if (cur >= 0) sndV('detent'); cur = k; $('tdl').textContent = `${TF} · ${WS[k][1]} ${WS[k][0]}`; st.forEach((s, j) => s.classList.toggle('on', j === k)); }
        const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
        cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); const col = ink(), SP = 12, mid = W / 2;
        for (let n = -60; n <= (WS.length - 1) * 10 + 60; n++) { const x = mid + (n - q * 10) * SP; if (x < 0 || x > W) continue; const major = n % 10 === 0 && n >= 0 && n <= (WS.length - 1) * 10;
          cx.globalAlpha = major ? .9 : .2; cx.strokeStyle = col; cx.lineWidth = major ? 2 : 1; cx.beginPath(); cx.moveTo(x, H); cx.lineTo(x, H - (major ? 22 : 9)); cx.stroke(); }
        cx.globalAlpha = 1; cx.fillStyle = RED; cx.fillRect(mid - 1.5, H - 34, 3, 34); });

    } else if (VV.type === 'ticker') { // one line of the brand's voice runs across, faster or slower with the scroll
      const sec = box(`<section class="type tticker" id="typebox"><div class="tkrow" id="tkrow" style="font-family:${ff(TF)};font-weight:${Math.min(w1, 600)}">${(esc(line) + ' · ').repeat(4)}</div>
        <div class="tkrow rev" id="tkrow2" style="font-family:${ff(TB)};font-weight:400">${(esc(CS.blurb) + ' · ').repeat(3)}</div><div class="tread mono"><span>${esc(TF)}</span><span>${TB !== TF ? esc(TB) : ''}</span><span>Scroll to change speed</span></div></section>`);
      const r1 = $('tkrow'), r2 = $('tkrow2'); let x = 0, lastY = scrollY, v = 0;
      VT.push(dt => { const dy = scrollY - lastY; lastY = scrollY; v += (Math.abs(dy) * .9 - v) * .1; x += (.6 + v) * dt / 16;
        const w = r1.scrollWidth / 4, w2 = r2.scrollWidth / 3; r1.style.transform = `translate3d(${(-(x % w)).toFixed(1)}px,0,0)`; r2.style.transform = `translate3d(${(-w2 + (x * .6 % w2)).toFixed(1)}px,0,0)`; });
    }
  }
