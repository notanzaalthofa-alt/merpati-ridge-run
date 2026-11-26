// Merpati Ridge Run — the valley: terrain, river, fields, town, rings, clouds.
// One job: answer "what is at (x, z)?" and hold the placed scenery.
// Everything is seeded, so the world is identical on every load.
MR.world = (function () {
  var R = MR.random;
  var SEED = 20261126;
  var WATER_Y = 2.5;

  function riverX(z) {
    return 40 * Math.sin(z * 0.0009) + 25 * Math.sin(z * 0.0023 + 1.7);
  }
  function valleyCenter(z) { return riverX(z) * 0.5; }

  function rawHeight(x, z) {
    var h = 5 * R.fbm(x * 0.004, z * 0.004, SEED, 3) - 2.5;
    var ax = Math.abs(x - valleyCenter(z));
    var wall = R.smoothstep(260, 720, ax);
    h += wall * wall * (140 + 130 * R.fbm(x * 0.002 + 7, z * 0.002, SEED + 5, 3));
    // rugged detail on the high ground so ridges are not smooth slabs
    h += wall * wall * 52 * (R.fbm(x * 0.009 + 13, z * 0.009, SEED + 9, 2) - 0.5);
    var d = Math.abs(x - riverX(z));
    h -= 7 * Math.exp(-(d * d) / (2 * 22 * 22));
    return h;
  }

  function terrainH(x, z) {
    var h = rawHeight(x, z);
    // Flatten the ground under both airstrips so landings are fair.
    var strips = MR.config.STRIPS;
    for (var i = 0; i < strips.length; i++) {
      var s = strips[i];
      if (z > s.z0 - 60 && z < s.z1 + 60 && Math.abs(x - s.x) < 46) {
        var dz = Math.max(0, Math.max(s.z0 - z, z - s.z1));
        var dx = Math.max(0, Math.abs(x - s.x) - 16);
        var d = Math.sqrt(dx * dx + dz * dz);
        var t = 1 - R.smoothstep(0, 42, d);
        h = R.lerp(h, s.y, t);
      }
    }
    return h;
  }

  function slopeAt(x, z) {
    var e = 6;
    var dx = (terrainH(x + e, z) - terrainH(x - e, z)) / (2 * e);
    var dz = (terrainH(x, z + e) - terrainH(x, z - e)) / (2 * e);
    return Math.sqrt(dx * dx + dz * dz);
  }

  var FIELD_COLORS = ["#c9a86a", "#4e7d46", "#8a9a5b", "#9c7a4d", "#6fa05a", "#7a8a4e"];

  function groundColor(x, z, h) {
    var rx = riverX(z);
    var dRiver = Math.abs(x - rx);
    if (h < WATER_Y && dRiver < 30) {
      var depth = R.clamp((WATER_Y - h) / 6, 0, 1);
      return R.lerp(0x2e, 0x1a, depth) * 65536 + R.lerp(0x7d, 0x5a, depth) * 256 + R.lerp(0x8a, 0x6e, depth);
    }
    if (h < 5.5 && dRiver < 36) return 0xd9c08a; // sand banks
    // mowed grass shoulders around the airstrips read as an airfield
    var strips = MR.config.STRIPS;
    for (var si = 0; si < strips.length; si++) {
      var s = strips[si];
      if (z > s.z0 - 30 && z < s.z1 + 30 && Math.abs(x - s.x) < 46) return 0x7d9a55;
    }
    var wall = R.smoothstep(260, 720, Math.abs(x - valleyCenter(z)));
    if (wall > 0.10) {
      // High, steep ground is bare rock; mid-slopes stay vegetated.
      var rockF = R.smoothstep(0.55, 0.95, slopeAt(x, z)) * 0.8 + R.smoothstep(190, 260, h) * 0.6;
      if (rockF > 0.45) return rockF > 0.75 ? 0x6b5d52 : 0x8a7a6d;
      if (wall < 0.45) {
        return R.fbm(x * 0.01, z * 0.01, SEED + 77, 2) > 0.55 ? 0x3d6b38 : 0x6d7a44;
      }
      return R.valueNoise(x * 0.02, z * 0.02, SEED + 9) > 0.5 ? 0x9a8a5e : 0x7d8a4e;
    }
    if (wall < 0.25 && h < 26) {
      var cell = R.hash2(Math.floor(x / 64), Math.floor(z / 64), SEED + 31);
      var patch = FIELD_COLORS[Math.floor(cell * FIELD_COLORS.length)];
      return parseInt(patch.slice(1), 16);
    }
    if (R.fbm(x * 0.01, z * 0.01, SEED + 77, 2) > 0.62) return 0x3d6b38; // forest
    var g = R.valueNoise(x * 0.02, z * 0.02, SEED + 3);
    return g > 0.5 ? 0x6fa05a : 0x5d8a4a;
  }

  function shadeColor(rgb, f) {
    var r = R.clamp(((rgb >> 16) & 255) * f, 0, 255) | 0;
    var g = R.clamp(((rgb >> 8) & 255) * f, 0, 255) | 0;
    var b = R.clamp((rgb & 255) * f, 0, 255) | 0;
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function fogMix(rgb, fogF, fogRgb) {
    var r = R.lerp((rgb >> 16) & 255, (fogRgb >> 16) & 255, fogF) | 0;
    var g = R.lerp((rgb >> 8) & 255, (fogRgb >> 8) & 255, fogF) | 0;
    var b = R.lerp(rgb & 255, fogRgb & 255, fogF) | 0;
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  var FOG_RGB = 0xe8a06a;

  // --- placed scenery (built once, seeded) ---
  var trees = [];
  var buildings = [];
  var clouds = [];
  var rings = [];

  function build() {
    var rng = R.mulberry32(SEED);
    var i, x, z;
    // Trees on the valley floor
    for (i = 0; i < 520; i++) {
      x = valleyCenter(rng() * 6000) + (rng() * 2 - 1) * 235;
      z = rng() * 6000;
      if (Math.abs(x) < 30 && z < 460) continue;
      if (Math.abs(x - riverX(z)) < 20) continue;
      if (Math.abs(x - 85) < 38 && z > 4950 && z < 5430) continue;
      if (terrainH(x, z) > 55) continue;
      trees.push({ x: x, z: z, s: 6 + rng() * 7, hue: rng() });
    }
    // Ridge village near the river, z 1150..1450
    var wallCols = ["#e8d9b0", "#d9b48a", "#c9a184", "#e0c9a0"];
    var roofCols = ["#a34d3a", "#7a5a3a", "#5d6b7a", "#8a4d3a"];
    for (i = 0; i < 24; i++) {
      x = -200 + (i % 6) * 26 + (rng() * 2 - 1) * 8;
      z = 1150 + Math.floor(i / 6) * 68 + (rng() * 2 - 1) * 14;
      buildings.push({
        x: x, z: z,
        w: 10 + rng() * 9, d: 10 + rng() * 9, h: 8 + rng() * 16,
        wall: wallCols[i % wallCols.length],
        roof: roofCols[(i * 3) % roofCols.length]
      });
    }
    // Clouds
    for (i = 0; i < 26; i++) {
      clouds.push({
        x: (rng() * 2 - 1) * 620,
        y: 260 + rng() * 170,
        z: rng() * 6600 - 300,
        s: 45 + rng() * 70,
        a: 0.5 + rng() * 0.35
      });
    }
    // Rings down the valley
    var offs = [-30, 25, -15, 35, -25, 10, -35, 20];
    for (i = 0; i < 8; i++) {
      z = 800 + i * 600;
      rings.push({
        x: riverX(z) + offs[i],
        y: 55 + 22 * Math.sin(i * 1.3),
        z: z,
        r: 20,
        passed: false
      });
    }
  }

  build();

  return {
    SEED: SEED,
    WATER_Y: WATER_Y,
    riverX: riverX,
    valleyCenter: valleyCenter,
    terrainH: terrainH,
    groundColor: groundColor,
    shadeColor: shadeColor,
    fogMix: fogMix,
    FOG_RGB: FOG_RGB,
    trees: trees,
    buildings: buildings,
    clouds: clouds,
    rings: rings,
    bridgeZ: 2600
  };
})();
