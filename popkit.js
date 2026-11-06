/*!
 * Popkit — light, poppy UI sounds synthesized with Web Audio.
 * No audio files. Sounds play only on real (trusted) user taps.
 *
 * Usage:
 *   Load popkit.js with a script tag, then:
 *   <button data-sound="pop">Continue</button>
 *   Popkit.bind();                 // wires every [data-sound] element
 *   Popkit.play('success');        // or trigger from your own handlers
 *   Popkit.volume(0.6); Popkit.mute(true);
 *
 * Sounds: tap, pop, pulse, deep, snap, select, toggleOn, toggleOff, open, close,
 *         next, back, like, copy, success, error
 */
(function (root) {
  'use strict';
  var ctx = null, master = null, muted = false, vol = 0.7;
  var LEAD = 0.012;   // every sound starts 12 ms ahead, so its opening is never cut off

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // Wake the audio on the first touch or key press, before the click lands, and prime the output with a silent blip.
  // Waking it on the click itself lost the first sound's opening, so the first click came out thin and watery.
  function warm() { if (!ensure()) return; try { var b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); } catch (e) {} }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { root.addEventListener(ev, warm, { capture: true, once: true, passive: true }); });

  // Which sound a click plays depends on what was clicked (CMS → Settings → Click sound: "By action").
  //  Desktop: nav and back tick (detent), choices play select, pictures pop, anything else ticks.
  //  Phones:  choices play select, everything else pops (the closest thing to a tap).
  // A control can name its own with data-snd="nav|back|select|image|other".
  function role(e) {
    var t = e && e.target;
    if (e && /^key/.test(e.type)) { if (e.key === 'Escape') return 'back'; t = document.activeElement; }
    if (!t || !t.closest) return 'other';
    var c = t.closest('a,button,[role="button"],[role="tab"],[role="option"],[role="radio"],[role="switch"],summary,label,input,select,[tabindex]') || t;
    var own = c.closest('[data-snd]'); if (own) return own.getAttribute('data-snd');
    var aria = (c.getAttribute('aria-label') || c.getAttribute('title') || ''), text = (c.textContent || '').trim();
    if (/^(←|‹|back\b|go back|close\b|×|✕)/i.test(text) || /\b(back|close)\b/i.test(aria) || c.matches('.dback,.back,.km-back,.close')) return 'back';
    if (c.matches('[role="tab"],[role="option"],[role="radio"],[role="switch"],[aria-pressed],[aria-selected],[aria-checked],input[type="checkbox"],input[type="radio"],select') || c.closest('.chips,.chip,.seg,.swatches,.sw')) return 'select';
    if (c.closest('.kmn-scale,.kmn-menu,.kmn-mb,.kmn-opts,nav,[role="navigation"]')) return 'nav';
    if (t.closest('img,video,picture,canvas,figure') || c.matches('.ov-t,.tile') || /picture|image|photo/i.test(aria) ||
        (c.querySelector && c.querySelector('img,video,canvas,picture') && text.length < 60)) return 'image';
    return 'other';
  }
  var touchUI = root.matchMedia ? root.matchMedia('(hover: none) and (pointer: coarse)') : null;
  function byRole(e) {
    var r = role(e), phone = (e && e.pointerType === 'touch') || (e && /^touch/.test(e.type)) || (touchUI && touchUI.matches);
    if (r === 'select') return 'select';
    if (phone) return 'pop';
    return r === 'image' ? 'pop' : 'detent';
  }

  // A single pitched blip with a fast attack and exponential decay.
  function tone(o) {
    var t = ctx.currentTime + LEAD + (o.at || 0);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || o.dur));
    var peak = (o.gain || 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  // A tiny filtered noise burst: the "tick" texture of a physical press.
  var noiseBuf = null;
  function tick(o) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = ctx.currentTime + LEAD + (o.at || 0);
    var src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    bp.type = 'bandpass'; bp.frequency.value = o.freq || 4000; bp.Q.value = o.q || 1.2;
    if (o.sweep) bp.frequency.exponentialRampToValueAtTime(o.sweep, t + o.dur);
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + o.dur + 0.02);
  }

  // Low pulses (CMS → Settings → Click sound): one very short push of air under a low-pass filter, no echo.
  // Heavy without anything sharp on top. Built from the click lab: weight, body, bite, length, volume, variation (0–100).
  var pulseOut = null;
  function pulse(o) {
    if (!pulseOut) {
      var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 12; lim.attack.value = 0.001; lim.release.value = 0.05;
      pulseOut = ctx.createGain(); pulseOut.connect(lim); lim.connect(ctx.destination);
    }
    pulseOut.gain.value = vol / 0.7;
    var sr = ctx.sampleRate, j = 1 + (Math.random() * 2 - 1) * 0.1 * (o.vary / 100);
    var fc = 1300 * Math.pow(140 / 1300, o.weight / 100) * j, q = 0.55 + Math.pow(o.ring / 100, 1.5) * 4, bite = o.bite / 100;
    var ms = 8 + o.len / 100 * 52, amp = Math.pow(o.vol / 100, 1.5) * 1.6 * (1.1 + (1 - q / 4.6) * 0.6);
    var t0 = ctx.currentTime + LEAD, n = Math.round(sr * (ms + 6) / 1000), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    var w = Math.max(8, Math.round(sr / (fc * 2.2)));
    for (var i = 0; i < w && i < n; i++) d[i] = -Math.sin(Math.PI * i / w) * 0.9;
    if (bite) { var m = Math.round(sr * 0.0012), lp = 0; for (var k = 0; k < m; k++) { lp += ((Math.random() * 2 - 1) - lp) * 0.5; d[k] += lp * bite * 1.4 * (1 - k / m); } }
    var src = ctx.createBufferSource(); src.buffer = b;
    var f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = fc; f1.Q.value = q;
    var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = Math.min(16000, fc * 3.2 + bite * 5000); f2.Q.value = 0.5;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 35; hp.Q.value = 0.5;
    var g = ctx.createGain(), end = t0 + ms / 1000;
    g.gain.setValueAtTime(amp, t0); g.gain.setValueAtTime(amp, t0 + ms / 2000); g.gain.exponentialRampToValueAtTime(0.0005, end);
    src.connect(f1); f1.connect(f2); f2.connect(hp); hp.connect(g); g.connect(pulseOut);
    src.start(t0); src.stop(end + 0.01);
  }
  var PULSES = {
    pulse: { weight: 58, ring: 30, bite: 0, len: 30, vol: 70, vary: 20 },
    deep:  { weight: 78, ring: 25, bite: 0, len: 38, vol: 75, vary: 20 },
    snap:  { weight: 25, ring: 15, bite: 18, len: 15, vol: 60, vary: 25 }
  };

  var sounds = {
    // Generic tap: crisp, tiny, falls slightly.
    tap: function () {
      tick({ freq: 5200, dur: 0.018, gain: 0.12 });
      tone({ f0: 1500, f1: 1050, dur: 0.05, gain: 0.16 });
    },
    // Detent: the faint click of a dial passing a notch while dragging.
    // The original light tick with a touch of low body underneath.
    // Hover: a tiny, soft bubble. Pass { f } to pitch it, so a row of items can play a scale.
    hover: function (o) {
      var f = (o && o.f) || 1047;
      tone({ f0: f * 0.78, f1: f * 1.12, glide: 0.03, dur: 0.075, gain: 0.1 });
      tone({ f0: f * 2, dur: 0.03, gain: 0.018, type: 'triangle' });
    },
    detent: function () {
      tick({ freq: 5000, dur: 0.014, gain: 0.09, q: 2 });
      tone({ f0: 1900, dur: 0.025, gain: 0.04, type: 'triangle' });
      tone({ f0: 300, f1: 210, dur: 0.045, gain: 0.12 });
    },
    pulse: function () { pulse(PULSES.pulse); },
    deep: function () { pulse(PULSES.deep); },
    snap: function () { pulse(PULSES.snap); },
    // Primary action: a rounded bubble pop that rises.
    pop: function () {
      tone({ f0: 520, f1: 1250, glide: 0.05, dur: 0.11, gain: 0.32 });
      tone({ f0: 1040, f1: 2500, glide: 0.05, dur: 0.07, gain: 0.06, type: 'triangle' });
    },
    // Checkbox / chip / list item picked.
    select: function () {
      tick({ freq: 6000, dur: 0.012, gain: 0.08 });
      tone({ f0: 1320, dur: 0.07, gain: 0.18, type: 'triangle' });
    },
    toggleOn: function () {
      tone({ f0: 740, dur: 0.06, gain: 0.2 });
      tone({ f0: 1110, dur: 0.09, gain: 0.22, at: 0.055 });
    },
    toggleOff: function () {
      tone({ f0: 1110, dur: 0.06, gain: 0.18 });
      tone({ f0: 740, dur: 0.09, gain: 0.18, at: 0.055 });
    },
    // Sheet, menu, accordion opening: an airy upward slide.
    open: function () {
      tick({ freq: 1800, sweep: 5000, dur: 0.09, gain: 0.07, q: 0.8 });
      tone({ f0: 420, f1: 980, dur: 0.13, gain: 0.2 });
    },
    close: function () {
      tick({ freq: 5000, sweep: 1800, dur: 0.08, gain: 0.06, q: 0.8 });
      tone({ f0: 900, f1: 420, dur: 0.11, gain: 0.18 });
    },
    // Tabs, carousels, steps forward / back.
    next: function () {
      tick({ freq: 3000, sweep: 7000, dur: 0.05, gain: 0.08 });
      tone({ f0: 880, f1: 1180, dur: 0.06, gain: 0.15, type: 'triangle' });
    },
    back: function () {
      tick({ freq: 7000, sweep: 3000, dur: 0.05, gain: 0.08 });
      tone({ f0: 1180, f1: 880, dur: 0.06, gain: 0.15, type: 'triangle' });
    },
    // Like / favourite: springy double bubble.
    like: function () {
      tone({ f0: 600, f1: 1400, glide: 0.04, dur: 0.08, gain: 0.26 });
      tone({ f0: 900, f1: 2000, glide: 0.04, dur: 0.1, gain: 0.22, at: 0.07 });
    },
    // Copy to clipboard: two fast ticks.
    copy: function () {
      tick({ freq: 4800, dur: 0.015, gain: 0.12 });
      tone({ f0: 1600, dur: 0.035, gain: 0.12 });
      tick({ freq: 6200, dur: 0.015, gain: 0.12, at: 0.06 });
      tone({ f0: 2100, dur: 0.045, gain: 0.12, at: 0.06 });
    },
    // Done / sent / paid: a bright three-note lift.
    success: function () {
      [1047, 1319, 1568].forEach(function (f, i) {
        tone({ f0: f, dur: 0.16 + i * 0.05, gain: 0.18, at: i * 0.065 });
        tone({ f0: f * 2, dur: 0.08, gain: 0.03, at: i * 0.065, type: 'triangle' });
      });
    },
    // Something went wrong: soft, short, not alarming.
    error: function () {
      tone({ f0: 392, dur: 0.09, gain: 0.2, type: 'triangle' });
      tone({ f0: 330, dur: 0.14, gain: 0.2, type: 'triangle', at: 0.09 });
    }
  };

  // One sound per action: once a sound plays, anything else asked for in the next 220 ms is dropped (a page-wide
  // click handler and the button's own handler, a tick that follows a click). Only a run of detent ticks, as when
  // dragging a dial, keeps going. Silent helpers (wake) don't count.
  var lastName = '', lastAt = 0, clickAt = 0, QUIET = { wake: 1 };
  var CLICKY = { click: 1, pointerdown: 1, pointerup: 1, mousedown: 1, mouseup: 1, touchstart: 1, touchend: 1, keydown: 1, keyup: 1 };
  var DRAG = { pointermove: 1, mousemove: 1, touchmove: 1, wheel: 1, scroll: 1, input: 1 };   // a hand moving something: its ticks may play
  function play(name, opt) {
    // Every sound asked for by a click, tap or key press is chosen here from what was clicked, whatever name the
    // control asked for (open, close, success…). The only other sound is the detent tick while something is dragged.
    var e = root.event, clicky = !!(e && CLICKY[e.type]);
    if (!QUIET[name] && clicky) {
      var c = (root.KM_SITE || {}).click || 'auto';
      name = c === 'auto' || !sounds[c] ? byRole(e) : c;
    }
    if (muted || !sounds[name] || !ensure()) return;
    var now = Date.now();
    if (!QUIET[name]) {
      if (clicky) { if (now - lastAt < 220) return; clickAt = now; }   // one sound per click
      else {
        if (!(e && DRAG[e.type])) return;                                  // nothing plays on its own (timers, animations, page load)
        if (ctx.state !== 'running') return;
        if (now - clickAt < 700) return;                                 // nothing from what a click set moving (a scroll, a dial gliding)
        if (now - lastAt < 220 && !(name === 'detent' && lastName === 'detent')) return;   // a run of ticks while dragging keeps going
      }
      lastName = name; lastAt = now;
    }
    if (ctx.state !== 'running') { ctx.resume().then(function () { sounds[name](opt); }, function () {}); return; }   // still waking: play the whole sound once it is
    sounds[name](opt);
  }

  // Wire up [data-sound] elements. Only trusted pointer/keyboard
  // activations play, so scripted clicks stay silent.
  function bind(scope) {
    var el = scope || document;
    el.addEventListener('click', function (e) {
      if (!e.isTrusted) return;
      var t = e.target.closest && e.target.closest('[data-sound]');
      if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      var name = t.getAttribute('data-sound');
      // Toggles pick on/off from their new state.
      if (name === 'toggle') {
        // Checkboxes already hold their new state here; aria-pressed
        // buttons are about to flip, so read the opposite of now.
        var on = t.type === 'checkbox' ? t.checked : t.getAttribute('aria-pressed') !== 'true';
        name = on ? 'toggleOn' : 'toggleOff';
      }
      play(name);
    }, true);
  }

  root.Popkit = {
    play: play,
    bind: bind,
    sounds: Object.keys(sounds),
    volume: function (v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol; },
    mute: function (m) { muted = !!m; },
    define: function (name, fn) { sounds[name] = function () { fn({ tone: tone, tick: tick, ctx: ctx }); }; }
  };
})(window);
