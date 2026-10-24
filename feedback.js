// feedback.js: after a few minutes on the site, one quick question: how easy was it to get around (1 to 5)?
// Web: a card at the bottom right. Phones: a card in the middle of the screen, the page dimmed behind it.
// The score sits on a small dial: click or tap a number, or drag through it. Its ticks ripple like an FM wave.
// Then one optional follow-up (what you liked most, what got in your way), and it is sent to Kingsley's email.
//
//  · Time counts only while the tab is in view, and carries over between pages (this browser).
//  · It waits for a quiet moment: nothing open, no menu, no tuning, nobody mid-drag or typing.
//  · Sent: never again on this browser. Not now / close: not for 30 days. Never in the CMS.
//  · Settings (CMS → Settings → Feedback): on/off, the email it goes to, and how many minutes before it asks.
//  · Add ?feedback=now to any page address to see it straight away.
(function () {
  const CFG = (window.KM_SITE && window.KM_SITE.feedback) || {};
  const FORCE = /[?&]feedback=now\b/.test(location.search);
  if (!FORCE && CFG.on === false) return;
  if (/[?&]cms=1\b/.test(location.search) || window.top !== window) return;   // the CMS preview, or inside any frame
  const TO = CFG.to || 'iamkingsleey@gmail.com', AFTER = Math.max(.25, +CFG.after || 3) * 60000;
  const K = 'km-fb', KT = 'km-fb-t';
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const state = (() => { try { return JSON.parse(get(K, '{}')) || {}; } catch (_) { return {}; } })();
  if (!FORCE && (state.sent || (state.snooze && Date.now() < state.snooze))) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snd = n => { if (get('km-sound', 'on') === 'off' || !window.Popkit) return; try { Popkit.play(n); } catch (_) {} };

  // ---------- the clock: visible time only, carried across pages ----------
  let spent = +get(KT, 0) || 0, lastTap = 0, shown = false;
  addEventListener('pointerdown', () => { lastTap = performance.now(); }, true);
  addEventListener('keydown', () => { lastTap = performance.now(); }, true);
  const quiet = () => {
    const d = document, b = d.body; if (!b) return false;
    if (b.classList.contains('open') || d.documentElement.classList.contains('kmn-open') || d.documentElement.classList.contains('tuning')) return false;   // a piece, the menu, a page change
    if (d.querySelector('.tuner, .km-keep, .recruit.open, .pt-card.open')) return false;
    const a = d.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;   // typing (the About form)
    return performance.now() - lastTap > 2500;                                                          // not right in the middle of something
  };
  const step = 1000;
  const clock = setInterval(() => {
    if (shown) return;
    if (document.visibilityState === 'visible') { spent += step; put(KT, String(spent)); }
    if (spent >= AFTER && quiet()) { clearInterval(clock); open(); }
  }, step);
  if (FORCE) { clearInterval(clock); addEventListener('load', () => setTimeout(open, 600)); if (document.readyState === 'complete') setTimeout(open, 600); }

  // ---------- the card ----------
  const N = 5, WORD = ['', 'Frustrating', 'Hard work', 'Okay', 'Easy', 'Effortless'];
  const LIKED = ['The dial', 'Moving between pages', 'Case studies', 'The sounds', 'Speed', 'The look'];
  const STUCK = ['Finding the work', 'Going back', 'Too much motion', 'Slow to load', 'Small text', 'Something else'];
  const CSS = `
  .kfb, .kfb * { box-sizing: border-box }
  .kfb { --b: #fff; --i: #0e0e10; --t: #3d3d42; --m: #8a8a90; --f: #c9c9cd; --p: #efeff0; --l: #e6e6e8; --sh: 0 24px 60px -18px rgb(0 0 0 / .28), 0 2px 8px rgb(0 0 0 / .06);
    position: fixed; z-index: 2147482000; inset: 0; pointer-events: none; font: 400 15px/1.5 Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased }
  .kfb.dark { --b: #141416; --i: #f4f4f5; --t: #c9c9cd; --m: #85858c; --f: #3a3a3e; --p: #1f1f22; --l: #2a2a2e; --sh: 0 24px 60px -18px rgb(0 0 0 / .8), 0 0 0 1px rgb(255 255 255 / .05) }
  .kfb button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer }
  .kfb button:focus-visible, .kfb [tabindex]:focus-visible { outline: 2px solid var(--i); outline-offset: 2px }
  .kfb .sc { position: absolute; inset: 0; background: rgb(0 0 0 / .32); opacity: 0; transition: opacity .3s }
  .kfb .cd { position: absolute; width: 360px; max-width: calc(100vw - 32px); background: var(--b); color: var(--t); border-radius: 18px; box-shadow: var(--sh); padding: 20px 20px 18px; pointer-events: auto;
    right: max(24px, env(safe-area-inset-right, 0px)); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); opacity: 0; translate: 0 18px;
    transition: opacity .3s, translate .55s cubic-bezier(.2,.9,.25,1.15), scale .55s cubic-bezier(.2,.9,.25,1.15) }
  .kfb.on .cd { opacity: 1; translate: 0 0 }
  .kfb.mob .sc { pointer-events: auto } .kfb.mob.on .sc { opacity: 1 }
  .kfb.mob .cd { right: auto; bottom: auto; left: 50%; top: 50%; width: calc(100vw - 32px); max-width: 400px; translate: -50% -46%; scale: .96 }
  .kfb.mob.on .cd { translate: -50% -50%; scale: 1 }
  .kfb .mo { font: 600 11px/1.4 "Geist Mono", ui-monospace, Menlo, monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--m) }
  .kfb .hd { display: flex; align-items: center; justify-content: space-between; gap: 12px }
  .kfb .x { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--m); margin: -6px -6px 0 0; transition: background .2s, color .2s }
  .kfb .x:hover { background: var(--p); color: var(--i) }
  .kfb .x svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.6; fill: none; stroke-linecap: round }
  .kfb h3 { margin: 10px 0 4px; color: var(--i); font-size: 20px; line-height: 1.2; font-weight: 500; letter-spacing: -.02em; text-wrap: balance }
  .kfb .sub { margin: 0; font-size: 13px; color: var(--m) }
  .kfb .bd { margin-top: 16px; user-select: none; -webkit-user-select: none }
  .kfb .ft { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px }
  .kfb .lt { font-size: 13px; color: var(--m); padding: 8px 0 } .kfb .lt:hover { color: var(--i) }
  .kfb .go { height: 38px; padding: 0 18px; border-radius: 999px; background: var(--i); color: var(--b); font-size: 14px; font-weight: 500; transition: opacity .2s, transform .2s }
  .kfb .go:disabled { opacity: .25; cursor: default } .kfb .go:not(:disabled):active { transform: scale(.97) }
  .kfb .ro { display: flex; align-items: baseline; gap: 10px; min-height: 40px }
  .kfb .ro b { color: var(--i); font-size: 40px; line-height: 1; font-weight: 500; letter-spacing: -.04em; font-variant-numeric: tabular-nums }
  .kfb .ro span { font-size: 14px; color: var(--t) } .kfb .ro.empty b { color: var(--f) }
  .kfb .tn { position: relative; height: 84px; touch-action: none; cursor: grab; -webkit-tap-highlight-color: transparent } .kfb .tn.dr { cursor: grabbing }
  .kfb .tn canvas { width: 100%; height: 100%; display: block }
  .kfb .gp + .gp { margin-top: 16px }
  .kfb .ch { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px }
  .kfb .ch button { height: 34px; padding: 0 13px; border-radius: 999px; background: var(--p); font-size: 13px; color: var(--t); transition: background .2s, color .2s }
  .kfb .ch button[aria-pressed="true"] { background: var(--i); color: var(--b) }
  .kfb .nt { margin-top: 14px; width: 100%; border: 0; border-bottom: 1px solid var(--l); background: transparent; padding: 10px 0; font: 400 16px/1.4 inherit; font-family: inherit; color: var(--i); outline: none; border-radius: 0 }
  .kfb .nt:focus { border-color: var(--i) }
  .kfb .dn b { display: block; margin-top: 14px; color: var(--i); font-size: 26px; font-weight: 500; letter-spacing: -.03em }
  .kfb .lamp { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2fb35b; margin-right: 8px; vertical-align: 1px }
  .kfb .err { margin-top: 10px; font-size: 13px; color: #d4380d }
  .kfb .st { animation: kfbin .45s cubic-bezier(.2,.9,.25,1) both } @keyframes kfbin { from { opacity: 0; translate: 12px 0 } }
  @media (max-height: 560px) { .kfb.mob .cd { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); translate: -50% 12px } .kfb.mob.on .cd { translate: -50% 0 } }
  @media (prefers-reduced-motion: reduce) { .kfb .cd, .kfb .sc, .kfb .st { transition: none; animation: none } }`;
  const X = '<button type="button" class="x" data-x aria-label="Close"><svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8"/></svg></button>';

  let root, card, val = 0, stopDial = null;
  const isDark = () => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g); if (!c) return false; const [r, g, b, a] = c.map(Number); if (a === 0) return document.documentElement.dataset.theme === 'dark'; return (r * 299 + g * 587 + b * 114) / 1000 < 128; };
  const mobile = () => matchMedia('(max-width: 640px), (hover: none) and (pointer: coarse) and (max-width: 900px)').matches;

  function open() {
    if (shown) return; shown = true;
    if (!document.getElementById('kfb-css')) { const s = document.createElement('style'); s.id = 'kfb-css'; s.textContent = CSS; document.head.appendChild(s); }
    root = document.createElement('div'); root.className = 'kfb' + (isDark() ? ' dark' : '') + (mobile() ? ' mob' : '');
    root.innerHTML = `<div class="sc"></div><div class="cd" role="dialog" aria-labelledby="kfb-q"${mobile() ? ' aria-modal="true"' : ''}></div>`;
    document.body.appendChild(root); card = root.querySelector('.cd');
    root.querySelector('.sc').addEventListener('click', () => close('later'));
    addEventListener('keydown', onKey);
    step1();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
    snd('detent'); track('/feedback/shown');
  }
  const onKey = e => { if (e.key === 'Escape' && root) close('later'); };
  function close(why) {
    if (!root) return; if (stopDial) stopDial();
    if (why === 'later') { state.snooze = Date.now() + 30 * 864e5; put(K, JSON.stringify(state)); }
    root.classList.remove('on'); const r = root; root = null; removeEventListener('keydown', onKey);
    setTimeout(() => r.remove(), reduce ? 0 : 400);
  }
  const wireX = () => card.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => { snd('pop'); close(val && card.dataset.done ? 'done' : 'later'); }));

  // step 1: the score
  function step1() {
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo">Quick question · 1 of 2</span>${X}</div>
      <h3 id="kfb-q">How easy was it to find your way around?</h3><p class="sub">1 is frustrating, 5 is effortless.</p>
      <div class="bd"><div class="ro empty" data-ro><b>–</b><span>Tap a number or drag the dial</span></div>
      <div class="tn" role="slider" tabindex="0" aria-label="Score, 1 to 5" aria-valuemin="1" aria-valuemax="5" aria-valuenow="3"><canvas></canvas></div></div>
      <div class="ft"><button type="button" class="lt" data-later>Not now</button><button type="button" class="go" data-next disabled>Next</button></div></div>`;
    wireX();
    card.querySelector('[data-later]').addEventListener('click', () => { snd('pop'); close('later'); });
    card.querySelector('[data-next]').addEventListener('click', () => { snd('pop'); step2(); });
    dial(card.querySelector('.tn'), v => {
      val = v; card.querySelector('[data-next]').disabled = false;
      const ro = card.querySelector('[data-ro]'); ro.classList.remove('empty'); ro.innerHTML = `<b>${v}</b><span>${WORD[v]}</span>`;
    });
  }

  // step 2: what you liked, what got in the way (both optional), then send
  function step2() {
    if (stopDial) stopDial();
    const low = val <= 3;
    const grp = (lab, list, k) => `<div class="gp" data-g="${k}"><span class="mo">${lab}</span><div class="ch">${list.map(c => `<button type="button" aria-pressed="false">${c}</button>`).join('')}</div></div>`;
    const liked = grp('Liked most', LIKED, 'liked'), stuck = grp('Got in your way', STUCK, 'stuck');
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo">${val} / 5 · ${WORD[val]} · 2 of 2</span>${X}</div>
      <h3 id="kfb-q">What did you like most, and what got in your way?</h3><p class="sub">Optional. Tap any that fit.</p>
      <div class="bd">${low ? stuck + liked : liked + stuck}<input class="nt" data-note placeholder="Tell me more (optional)" autocomplete="off" maxlength="600" aria-label="Tell me more"></div>
      <div class="err" data-err hidden></div>
      <div class="ft"><button type="button" class="lt" data-skip>Skip</button><button type="button" class="go" data-send>Send</button></div></div>`;
    wireX();
    card.querySelectorAll('.ch button').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); snd(on ? 'detent' : 'pop'); }));
    card.querySelector('[data-skip]').addEventListener('click', () => send(true));
    card.querySelector('[data-send]').addEventListener('click', () => send(false));
  }

  const picked = k => [...card.querySelectorAll(`[data-g="${k}"] button[aria-pressed="true"]`)].map(b => b.textContent);
  async function send(skip) {
    const btn = card.querySelector('[data-send]'), err = card.querySelector('[data-err]');
    const liked = skip ? [] : picked('liked'), stuck = skip ? [] : picked('stuck'), note = skip ? '' : card.querySelector('[data-note]').value.trim();
    btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true; snd('pop');
    const page = (location.pathname.split('/').pop() || 'index.html') + location.hash;
    const body = { _subject: `Site feedback: ${val}/5 · ${WORD[val]}`, _template: 'table', _captcha: 'false',
      Score: `${val} / 5 (${WORD[val]})`, 'Liked most': liked.join(', ') || '—', 'Got in the way': stuck.join(', ') || '—', Note: note || '—',
      Page: page, 'Time on site': Math.round(spent / 60000) + ' min', Screen: `${innerWidth}×${innerHeight}${mobile() ? ' · phone' : ''}`, Theme: isDark() ? 'dark' : 'light' };
    try {
      // to the inbox when there is one (CMS → Inbox), and to your email unless that's switched off; sent if either arrives
      const IB = (window.KM_SITE && KM_SITE.inbox) || {};
      const toInbox = window.kmSend ? kmSend({ type: 'Feedback', subject: `Site feedback: ${val}/5 · ${WORD[val]}`, message: note || '', fields: { Score: body.Score, 'Liked most': body['Liked most'], 'Got in the way': body['Got in the way'], 'Time on site': body['Time on site'], Screen: body.Screen, Theme: body.Theme } }) : Promise.resolve(false);
      // never wait forever: each route gets 15 seconds, and the button says so if it's slow
      const cap = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r(false), ms))]);
      const ac = 'AbortController' in window ? new AbortController() : null, slow = setTimeout(() => { btn.textContent = 'Still sending…'; }, 5000);
      const toMail = IB.url && IB.email === false ? Promise.resolve(false) : fetch('https://formsubmit.co/ajax/' + encodeURI(TO), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: ac && ac.signal })
        .then(r => r.json().catch(() => ({})).then(j => {
          // FormSubmit answers 200 even when it didn't send (for example before the address is confirmed), so read its reply
          const ok = r.ok && String(j.success) !== 'false';
          if (!ok) console.warn('Feedback email not sent:', j.message || r.status);
          return ok; }))
        .catch(() => false);
      const [a1, a2] = await Promise.all([cap(toInbox, 15000), cap(toMail, 15000)]);
      clearTimeout(slow); if (ac) ac.abort();
      if (!a1 && !a2) throw new Error('not sent');
      state.sent = Date.now(); delete state.snooze; put(K, JSON.stringify(state)); track('/feedback/sent/' + val);
      done();
    } catch (_) {
      btn.disabled = false; btn.textContent = 'Try again'; err.hidden = false; err.textContent = 'That didn’t send. Check your connection and try again in a moment.';
    }
  }
  function done() {
    card.dataset.done = '1';
    card.innerHTML = `<div class="st"><div class="hd"><span class="mo"><span class="lamp"></span>Sent · ${val} / 5</span>${X}</div>
      <div class="dn"><b>Thanks. That helps.</b><p class="sub" style="margin-top:6px">I read every one of these.</p></div></div>`;
    wireX(); snd('detent'); setTimeout(() => close('done'), 3200);
  }
  const track = p => { if (window.KMtrack) try { KMtrack(p, 'Feedback'); } catch (_) {} };

  // ---------- the dial: the ruler slides under a fixed red needle; its ticks ripple like an FM wave ----------
  function dial(tn, onPick) {
    const cv = tn.querySelector('canvas'), cx = cv.getContext('2d'), SP = 60;
    let pos = 3, vel = 0, target = 3, drag = null, picked = false, live = true, last = 3, amt = 0, phase = 0, freq = .05, v0 = 0;
    const css = n => getComputedStyle(root || document.body).getPropertyValue(n).trim();
    const sc = () => tn.getBoundingClientRect().width / tn.offsetWidth || 1;
    const cl = v => Math.max(1, Math.min(N, Math.round(v)));
    const setV = (v, sound) => { v = cl(v); if (v === v0) return; v0 = v; if (sound) snd('detent'); tn.setAttribute('aria-valuenow', v); onPick(v); };
    const draw = dt => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W) return;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); const mid = W / 2, ink = css('--i') || '#0e0e10', mu = css('--m') || '#8a8a90', TY = 16;
      const sp = Math.min(1, Math.abs(pos - last) * 14 / Math.max(.5, dt / 16)); last = pos; amt += (sp - amt) * (sp > amt ? .35 : .06);
      const lvl = v0 || Math.round(pos);
      if (!reduce) { freq += ((.06 + lvl * .008 + amt * .07) - freq) * .08; phase += (.035 + amt * .42) * dt / 16; }
      const wave = x => reduce ? 0 : Math.sin((x - mid) * freq - phase) * (1.4 + 11 * amt) * Math.exp(-(((x - mid) / (W * .32)) ** 2));
      for (let k = -10; k <= (N - 1) * 10 + 10; k++) {
        const v = 1 + k / 10, x = mid + (v - pos) * SP; if (x < -4 || x > W + 4) continue;
        const major = k % 10 === 0 && k >= 0 && k <= (N - 1) * 10, d = Math.abs(x - mid) / SP, e = Math.max(0, Math.min(1, Math.min(x, W - x) / 36));
        cx.globalAlpha = ((major ? .7 : .22) + Math.max(0, 1 - d) * .3) * e; cx.strokeStyle = ink; cx.lineWidth = major ? 1.6 : 1;
        const L = Math.max(3, (major ? 22 : 11) + Math.max(0, 1 - d) * 6 + wave(x)), base = TY + 26;
        cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, base - L); cx.stroke();
        if (major) { const on = d < .5 && picked; cx.globalAlpha = (on ? 1 : .6) * e; cx.fillStyle = on ? ink : mu; cx.font = `500 ${on ? 13 : 12}px "Geist Mono", ui-monospace, monospace`; cx.textAlign = 'center'; cx.fillText(String(v), x, TY + 48); }
      }
      cx.globalAlpha = 1; cx.fillStyle = '#fb233b'; cx.fillRect(mid - 1.5, TY - 8, 3, 34);
    };
    let pt = performance.now();
    const loop = now => { if (!live) return; const dt = Math.min(64, now - pt); pt = now;
      if (!drag) { const a = (target - pos) * 170 - vel * 19; vel += a * dt / 1000; pos += vel * dt / 1000; if (Math.abs(target - pos) < .0008 && Math.abs(vel) < .01) { pos = target; vel = 0; } }
      draw(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const settle = v => { picked = true; target = cl(v); setV(target, false); };
    const at = e => { const r = tn.getBoundingClientRect(); return pos + ((e.clientX - r.left) / sc() - tn.offsetWidth / 2) / SP; };
    tn.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; drag = { x: e.clientX, p: pos, moved: false, id: e.pointerId }; vel = 0; tn.setPointerCapture(e.pointerId); tn.classList.add('dr'); e.preventDefault(); });
    tn.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = (e.clientX - drag.x) / sc(); if (Math.abs(dx) > 4) drag.moved = true; if (!drag.moved) return;
      pos = Math.max(.6, Math.min(N + .4, drag.p - dx / SP)); picked = true; setV(pos, true); });
    const up = e => { if (!drag) return; const d = drag; drag = null; tn.classList.remove('dr');
      if (!d.moved) { const v = cl(at(e)); if (v !== v0) snd('detent'); settle(v); amt = Math.max(amt, .6); } else settle(pos); };
    tn.addEventListener('pointerup', up); tn.addEventListener('pointercancel', up);
    tn.addEventListener('keydown', e => { const k = e.key; let v = null;
      if (k === 'ArrowRight' || k === 'ArrowUp') v = (v0 || 2) + 1; if (k === 'ArrowLeft' || k === 'ArrowDown') v = (v0 || 4) - 1; if (/^[1-5]$/.test(k)) v = +k;
      if (v !== null) { e.preventDefault(); v = cl(v); if (v !== v0) snd('detent'); settle(v); amt = Math.max(amt, .5); } });
    stopDial = () => { live = false; stopDial = null; };
  }
})();
