// Merpati Ridge Run — synthesised sound.
// One job: engine drone, wind, and event stingers, all made with WebAudio.
// No audio files, no network. Silent until the first user gesture.
MR.audio = (function () {
  var ctx = null, master = null;
  var engineGain = null, engineOsc1 = null, engineOsc2 = null;
  var windGain = null, windFilter = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      // Engine: two detuned saws through a lowpass
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 0.8;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc1 = ctx.createOscillator(); engineOsc1.type = "sawtooth"; engineOsc1.frequency.value = 58;
      engineOsc2 = ctx.createOscillator(); engineOsc2.type = "sawtooth"; engineOsc2.frequency.value = 87;
      engineOsc1.connect(lp); engineOsc2.connect(lp);
      lp.connect(engineGain); engineGain.connect(master);
      engineOsc1.start(); engineOsc2.start();
      // Wind: looped noise through a bandpass
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = "bandpass"; windFilter.frequency.value = 700; windFilter.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
      src.start();
    } catch (e) { ctx = null; }
  }

  function update(p) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var eg = p.ground ? 0.04 + p.throttle * 0.10 : 0.06 + p.throttle * 0.12;
    engineGain.gain.setTargetAtTime(eg, t, 0.12);
    engineOsc1.frequency.setTargetAtTime(52 + p.throttle * 46, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(78 + p.throttle * 70, t, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.20, (p.speed / 92) * 0.20), t, 0.2);
    windFilter.frequency.setTargetAtTime(500 + p.speed * 9, t, 0.2);
  }

  function tone(freq, dur, type, vol, delay) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx) return;
    var t0 = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 900;
    var g = ctx.createGain(); g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  return {
    ensure: ensure,
    update: update,
    chime: function () { tone(880, 0.35, "sine", 0.22); tone(1318, 0.5, "sine", 0.18, 0.09); },
    thud: function () { tone(70, 0.25, "sine", 0.5); noiseBurst(0.18, 0.25, 500); },
    crash: function () { noiseBurst(0.7, 0.5, 700); tone(55, 0.6, "sine", 0.5); },
    click: function () { tone(660, 0.07, "sine", 0.15); }
  };
})();
