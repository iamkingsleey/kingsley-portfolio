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
 * Sounds: tap, pop, select, toggleOn, toggleOff, open, close,
 *         next, back, like, copy, success, error
 */
(function (root) {
  'use strict';
  var ctx = null, master = null, muted = false, vol = 0.7;

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

  // A single pitched blip with a fast attack and exponential decay.
  function tone(o) {
    var t = ctx.currentTime + (o.at || 0);
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
    var t = ctx.currentTime + (o.at || 0);
    var src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    bp.type = 'bandpass'; bp.frequency.value = o.freq || 4000; bp.Q.value = o.q || 1.2;
    if (o.sweep) bp.frequency.exponentialRampToValueAtTime(o.sweep, t + o.dur);
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + o.dur + 0.02);
  }

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

  function play(name, opt) {
    if (muted || !sounds[name] || !ensure()) return;
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
