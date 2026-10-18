  // ---------- versions of the opening section (title, facts, story, brief). CMS: sheet · read · split · stations; default split ----------
  {
    const IV = ['sheet', 'read', 'split', 'stations'].includes(VV.info) ? VV.info : 'split', sec = document.querySelector('.info'), ttl = document.querySelector('.title');
    const F = [...$('facts').children].map(f => [f.querySelector('dt').textContent, f.querySelector('dd')]);   // the fact values, moved as they are (tools stay live)
    const P = CS.story[1], B = CS.problem ? [['Problem', CS.problem], ['Goal', CS.goal]] : [];
    const strip = () => `<dl class="isheet">${F.map((f, k) => `<div><dt class="mono">${esc(f[0])}</dt><dd data-k="${k}"></dd></div>`).join('')}</dl>`;
    const fillStrip = root => root.querySelectorAll('dd[data-k]').forEach(d => { const src = F[+d.dataset.k][1]; while (src.firstChild) d.appendChild(src.firstChild); });
    const briefH = () => B.length ? `<div class="ibrief">${B.map(([h, p], k) => `<div><span class="mono">${pad(k + 1)} · ${h}</span><p>${esc(p)}</p></div>`).join('')}</div>` : '';
    if (IV === 'sheet') {          // a spec sheet: the facts in one row, then the story set large, then the brief
      sec.className = 'info isht'; sec.innerHTML = `${strip()}<div class="istory"><h3 class="rv">${esc(CS.story[0])}</h3><div class="rv">${P.map(p => `<p>${esc(p)}</p>`).join('')}</div></div>${briefH()}`;
      fillStrip(sec); sec.querySelectorAll('.rv').forEach(e => e.classList.add('in'));
    } else if (IV === 'read') {    // read along: the story at statement size, lighting up word by word as you scroll
      sec.className = 'info iread'; sec.innerHTML = `${strip()}<p class="iwords">${(CS.story[0] + '. ' + P.join(' ')).split(/\s+/).map(w => `<span>${esc(w)} </span>`).join('')}</p>${briefH()}`;
      fillStrip(sec); const ws = [...sec.querySelectorAll('.iwords span')], box = sec.querySelector('.iwords'); let lit = -1;
      VT.push(() => { const r = box.getBoundingClientRect(), t = clampV((innerHeight * .78 - r.top) / (r.height + innerHeight * .25), 0, 1), n = Math.round(t * ws.length);
        if (n !== lit) { ws.forEach((w, i) => w.classList.toggle('on', i < n)); lit = n; } });
    } else if (IV === 'split') {   // the brief as one panel: the red line moves across it, from the problem to the goal
      sec.className = 'info ispl'; sec.innerHTML = `${strip()}<div class="istory"><h3>${esc(CS.story[0])}</h3><div>${P.map(p => `<p>${esc(p)}</p>`).join('')}</div></div>
        ${B.length ? `<div class="iswin" id="iswin"><div class="ispin"><div class="isp a"><span class="mono">01 · Problem</span><p>${esc(B[0][1])}</p></div><div class="isp b" id="ispb"><span class="mono">02 · Goal</span><p>${esc(B[1][1])}</p></div><i class="isl" id="isl"><span class="split-tag" id="istag">Problem</span></i></div></div>` : ''}`;
      fillStrip(sec);
      if (B.length) { const w = $('iswin'); let cx = 1, side = 0;
        VT.push(dt => { const r = w.getBoundingClientRect(), t = clampV(-r.top / Math.max(1, r.height - innerHeight), 0, 1), tg = 1 - clampV((t - .15) / .7, 0, 1);
          cx += (tg - cx) * (1 - Math.exp(-dt / 90)); $('ispb').style.clipPath = `inset(0 0 0 ${(cx * 100).toFixed(2)}%)`; $('isl').style.left = (cx * 100).toFixed(2) + '%';
          const s = cx < .5 ? 1 : 0; if (s !== side) { side = s; $('istag').textContent = s ? 'Goal' : 'Problem'; } }); }
    } else if (IV === 'stations') { // the facts are stations: scroll tunes through them, each one large in turn; the story follows
      const FQ = ['88.1', '91.4', '94.7', '98.0', '101.3'].slice(0, F.length);
      sec.className = 'info istn'; sec.style.height = (F.length * 55 + 60) + 'vh';
      sec.innerHTML = `<div class="istpin"><ol class="istl">${F.map((f, k) => `<li data-k="${k}"><span class="mono">${FQ[k]}</span><b>${esc(f[0])}</b></li>`).join('')}</ol>
        <div class="istv">${F.map((f, k) => `<div class="istc" data-k="${k}"></div>`).join('')}</div></div>`;
      sec.querySelectorAll('.istc').forEach(d => { const src = F[+d.dataset.k][1]; while (src.firstChild) d.appendChild(src.firstChild); });
      sec.insertAdjacentHTML('afterend', `<section class="info isht ist2"><div class="istory"><h3 class="rv in">${esc(CS.story[0])}</h3><div class="rv in">${P.map(p => `<p>${esc(p)}</p>`).join('')}</div></div>${briefH()}</section>`);
      const li = [...sec.querySelectorAll('.istl li')], cs = [...sec.querySelectorAll('.istc')]; let cur = -1;
      VT.push(() => { const q = progV(sec, F.length), k = Math.round(q);
        if (k !== cur) { if (cur >= 0) sndV('detent'); cur = k; li.forEach((l, i) => l.classList.toggle('on', i === k)); cs.forEach((c, i) => c.classList.toggle('on', i === k)); } });
    }
  }
