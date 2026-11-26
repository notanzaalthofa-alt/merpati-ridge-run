// Merpati Ridge Run — deterministic random numbers and value noise.
// One job: every random choice in the world comes from a fixed seed,
// so the valley, town and clouds look the same on every load.
MR.random = (function () {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iz, seed) {
    var h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) % 100000) / 100000;
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function valueNoise(x, z, seed) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
    var c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    var u = smooth(fx), v = smooth(fz);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
  }

  function fbm(x, z, seed, octaves) {
    var sum = 0, amp = 0.5, freq = 1, total = 0;
    for (var i = 0; i < octaves; i++) {
      sum += amp * valueNoise(x * freq, z * freq, seed + i * 101);
      total += amp;
      amp *= 0.5; freq *= 2.03;
    }
    return sum / total;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  return {
    mulberry32: mulberry32,
    hash2: hash2,
    valueNoise: valueNoise,
    fbm: fbm,
    clamp: clamp,
    lerp: lerp,
    smoothstep: smoothstep,
    TAU: Math.PI * 2
  };
})();
