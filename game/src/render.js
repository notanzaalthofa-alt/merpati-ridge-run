// Merpati Ridge Run — the renderer.
// One job: turn the world + plane state into a picture on the canvas.
// Canvas 2D only, painter's algorithm (far to near), golden-hour light.
MR.render = (function () {
  var C = MR.config, R = MR.random, W = MR.world;
  var VW = C.W, VH = C.H;
  var FOCAL = (VH / 2) / Math.tan((C.FOV_DEG * Math.PI / 180) / 2);
  var SUN = { x: -0.38, y: 0.28, z: 0.88 }; // unit-ish direction toward the sun
  var _sl = Math.sqrt(SUN.x * SUN.x + SUN.y * SUN.y + SUN.z * SUN.z);
  SUN.x /= _sl; SUN.y /= _sl; SUN.z /= _sl;

  var heightCache = new Map();
  var colorCache = new Map();

  function hAt(x, z) {
    var k = x + "," + z;
    var v = heightCache.get(k);
    if (v === undefined) { v = W.terrainH(x, z); heightCache.set(k, v); }
    return v;
  }
  function cAt(x, z, h) {
    var k = x + "," + z;
    var v = colorCache.get(k);
    if (v === undefined) { v = W.groundColor(x, z, h); colorCache.set(k, v); }
    return v;
  }

  function norm3(x, y, z) {
    var l = Math.sqrt(x * x + y * y + z * z) || 1;
    return { x: x / l, y: y / l, z: z / l };
  }

  function makeCamera(p, view, t) {
    var yaw = p.yaw, pitch = p.pitch, roll = p.roll;
    var fx = Math.sin(yaw) * Math.cos(pitch);
    var fy = Math.sin(pitch);
    var fz = Math.cos(yaw) * Math.cos(pitch);
    var cam = {};
    if (view === "cockpit") {
      cam.pos = { x: p.x + fx * 1.4, y: p.y + 1.1, z: p.z + fz * 1.4 };
      cam.fwd = norm3(fx, fy, fz);
      cam.roll = roll * 0.9;
    } else if (view === "menu") {
      var mz = (t * 14) % 5200;
      cam.pos = { x: 170 * Math.sin(t * 0.03), y: 85 + 18 * Math.sin(t * 0.021), z: mz };
      cam.fwd = norm3(0.06, -0.05, 1);
      cam.roll = 0;
    } else {
      // chase: behind and above the plane, looking ahead through it
      var bx = p.x - fx * 30, by = p.y + 9 - fy * 30, bz = p.z - fz * 30;
      var tx = p.x + fx * 70, ty = p.y + fy * 70 + 2, tz = p.z + fz * 70;
      cam.pos = { x: bx, y: by, z: bz };
      cam.fwd = norm3(tx - bx, ty - by, tz - bz);
      cam.roll = roll * 0.35;
    }
    // right = normalize(cross(fwd, up)), up2 = cross(right, fwd), then roll around fwd
    var r0 = norm3(-cam.fwd.z, 0, cam.fwd.x);
    var u0 = {
      x: r0.y * cam.fwd.z - r0.z * cam.fwd.y,
      y: r0.z * cam.fwd.x - r0.x * cam.fwd.z,
      z: r0.x * cam.fwd.y - r0.y * cam.fwd.x
    };
    var cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
    cam.right = {
      x: r0.x * cr + u0.x * sr, y: r0.y * cr + u0.y * sr, z: r0.z * cr + u0.z * sr
    };
    cam.up = {
      x: -r0.x * sr + u0.x * cr, y: -r0.y * sr + u0.y * cr, z: -r0.z * sr + u0.z * cr
    };
    return cam;
  }

  function project(cam, px, py, pz) {
    var dx = px - cam.pos.x, dy = py - cam.pos.y, dz = pz - cam.pos.z;
    var cx = dx * cam.right.x + dy * cam.right.y + dz * cam.right.z;
    var cy = dx * cam.up.x + dy * cam.up.y + dz * cam.up.z;
    var cz = dx * cam.fwd.x + dy * cam.fwd.y + dz * cam.fwd.z;
    if (cz < C.NEAR) return null;
    var s = FOCAL / cz;
    return { x: VW / 2 + cx * s, y: VH / 2 - cy * s, s: s, cz: cz };
  }

  function fogF(cz) { return R.clamp((cz - 250) / 1250, 0, 0.92); }

  function shadeInt(rgb, f) {
    var r = R.clamp(((rgb >> 16) & 255) * f, 0, 255) | 0;
    var g = R.clamp(((rgb >> 8) & 255) * f, 0, 255) | 0;
    var b = R.clamp((rgb & 255) * f, 0, 255) | 0;
    return (r << 16) | (g << 8) | b;
  }

  function drawSky(ctx, cam) {
    var g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, C.SKY_TOP);
    g.addColorStop(0.42, C.SKY_MID);
    g.addColorStop(0.68, C.SKY_HORIZON);
    g.addColorStop(1, C.SKY_LOW);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    // Sun: project a far point along the sun direction
    var sp = project(cam,
      cam.pos.x + SUN.x * 3000, cam.pos.y + SUN.y * 3000, cam.pos.z + SUN.z * 3000);
    if (sp && sp.x > -300 && sp.x < VW + 300 && sp.y > -300 && sp.y < VH + 300) {
      var glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 240);
      glow.addColorStop(0, "rgba(255, 220, 150, 0.8)");
      glow.addColorStop(0.3, "rgba(255, 190, 110, 0.38)");
      glow.addColorStop(1, "rgba(255, 190, 110, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sp.x - 240, sp.y - 240, 480, 480);
      ctx.fillStyle = C.SUN_COLOR;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 25, 0, R.TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 16, 0, R.TAU); ctx.fill();
    }
  }

  function quadPainters(list, pts, cz, fill) {
    list.push({ kind: "quad", pts: pts, cz: cz, fill: fill });
  }

  function drawWorld(ctx, cam, p, t, view) {
    var list = [];
    var i, j, x, z;
    // ---- terrain grid ----
    var z0 = Math.floor((cam.pos.z - 900) / 50) * 50;
    var z1 = cam.pos.z + 1500;
    for (z = z0; z < z1; z += 50) {
      for (x = -750; x < 750; x += 50) {
        var cx = x + 25, czc = z + 25;
        var dx = cx - cam.pos.x, dy = 0, dz = czc - cam.pos.z;
        var cDepth = dx * cam.fwd.x + dz * cam.fwd.z;
        if (cDepth < 5 || cDepth > 1650) continue;
        var h00 = hAt(x, z), h10 = hAt(x + 50, z), h11 = hAt(x + 50, z + 50), h01 = hAt(x, z + 50);
        var hc = (h00 + h10 + h11 + h01) / 4;
        var p00 = project(cam, x, h00, z), p10 = project(cam, x + 50, h10, z);
        var p11 = project(cam, x + 50, h11, z + 50), p01 = project(cam, x, h01, z + 50);
        if (!p00 || !p10 || !p11 || !p01) continue;
        var avgCz = (p00.cz + p10.cz + p11.cz + p01.cz) / 4;
        if (avgCz > 1650) continue;
        // quick screen cull: all four points off one side
        var minX = Math.min(p00.x, p10.x, p11.x, p01.x), maxX = Math.max(p00.x, p10.x, p11.x, p01.x);
        var minY = Math.min(p00.y, p10.y, p11.y, p01.y), maxY = Math.max(p00.y, p10.y, p11.y, p01.y);
        if (maxX < -40 || minX > VW + 40 || maxY < -40 || minY > VH + 40) continue;
        var rgb = cAt(cx, czc, hc);
        // sun shading from the local slope
        var nx = (h10 - h00) / 50, nz = (h01 - h00) / 50;
        var nl = Math.sqrt(nx * nx + 1 + nz * nz);
        var dot = (-nx * SUN.x + 1 * SUN.y - nz * SUN.z) / nl;
        var light = 0.74 + 0.34 * Math.max(0, dot);
        if (hc < W.WATER_Y + 0.4 && Math.abs(cx - W.riverX(czc)) < 30) {
          light = 0.98 + 0.08 * Math.sin(cx * 0.35 + czc * 0.21 + t * 0.7);
        }
        // per-quad brightness jitter breaks up the mesh seams
        var jit = 0.93 + R.hash2(Math.floor(cx / 50), Math.floor(czc / 50), 20261126 + 55) * 0.14;
        var shaded = shadeInt(rgb, light * jit);
        var fill = W.fogMix(shaded, fogF(avgCz), W.FOG_RGB);
        quadPainters(list, [p00, p10, p11, p01], avgCz, fill);
      }
    }
    // ---- runways ----
    var strips = C.STRIPS;
    for (i = 0; i < strips.length; i++) {
      var s = strips[i];
      for (z = s.z0; z < s.z1; z += 45) {
        var y = s.y + 0.15;
        var a = project(cam, s.x - 14, y, z), b = project(cam, s.x + 14, y, z);
        var c2 = project(cam, s.x + 14, y, z + 45), d2 = project(cam, s.x - 14, y, z + 45);
        if (!a || !b || !c2 || !d2) continue;
        var acz = (a.cz + b.cz + c2.cz + d2.cz) / 4;
        quadPainters(list, [a, b, c2, d2], acz,
          W.fogMix(0x3a3f46, fogF(acz), W.FOG_RGB));
        // centreline dash on every other segment
        if (Math.floor(z / 45) % 2 === 0) {
          var e = project(cam, s.x - 1.2, y + 0.06, z + 8), f = project(cam, s.x + 1.2, y + 0.06, z + 8);
          var g2 = project(cam, s.x + 1.2, y + 0.06, z + 30), h2 = project(cam, s.x - 1.2, y + 0.06, z + 30);
          if (e && f && g2 && h2) quadPainters(list, [e, f, g2, h2], acz, "rgba(240,240,230,0.9)");
        }
      }
      // edge lights
      for (z = s.z0 + 10; z < s.z1; z += 60) {
        for (j = -1; j <= 1; j += 2) {
          var lp = project(cam, s.x + j * 15, s.y + 0.6, z);
          if (lp && lp.cz > 5 && lp.cz < 1500) {
            list.push({ kind: "dot", p: lp, r: Math.max(1.5, 260 / lp.cz), fill: "#ffd27a", glow: true });
          }
        }
      }
    }
    // ---- bridge over the river ----
    (function () {
      var bz = W.bridgeZ, rx = W.riverX(bz);
      var q = [
        project(cam, rx - 46, 14, bz - 5), project(cam, rx + 46, 14, bz - 5),
        project(cam, rx + 46, 14, bz + 5), project(cam, rx - 46, 14, bz + 5)
      ];
      if (q[0] && q[1] && q[2] && q[3]) {
        var cz = (q[0].cz + q[2].cz) / 2;
        quadPainters(list, q, cz, W.fogMix(0x7a6a55, fogF(cz), W.FOG_RGB));
      }
    })();
    // ---- village buildings ----
    var blds = W.buildings;
    for (i = 0; i < blds.length; i++) {
      var b = blds[i];
      var by = hAt(Math.round(b.x / 50) * 50, Math.round(b.z / 50) * 50);
      var hw = b.w / 2, hd = b.d / 2;
      var corners = [
        [b.x - hw, by, b.z - hd], [b.x + hw, by, b.z - hd],
        [b.x + hw, by, b.z + hd], [b.x - hw, by, b.z + hd],
        [b.x - hw, by + b.h, b.z - hd], [b.x + hw, by + b.h, b.z - hd],
        [b.x + hw, by + b.h, b.z + hd], [b.x - hw, by + b.h, b.z + hd]
      ];
      var P = corners.map(function (c) { return project(cam, c[0], c[1], c[2]); });
      if (P.some(function (q) { return !q; })) continue;
      var czB = P.reduce(function (s, q) { return s + q.cz; }, 0) / 8;
      if (czB < 5 || czB > 1600) continue;
      // top face
      quadPainters(list, [P[4], P[5], P[6], P[7]], czB,
        W.fogMix(parseInt(b.roof.slice(1), 16), fogF(czB), W.FOG_RGB));
      // the two faces toward the camera
      var faces = [];
      if (cam.pos.z < b.z) faces.push([P[0], P[1], P[5], P[4]]);
      else faces.push([P[3], P[2], P[6], P[7]]);
      if (cam.pos.x < b.x) faces.push([P[1], P[2], P[6], P[5]]);
      else faces.push([P[0], P[3], P[7], P[4]]);
      for (j = 0; j < faces.length; j++) {
        quadPainters(list, faces[j], czB,
          W.fogMix(parseInt(b.wall.slice(1), 16), fogF(czB), W.FOG_RGB));
      }
    }
    // ---- trees ----
    var trees = W.trees;
    for (i = 0; i < trees.length; i++) {
      var tr = trees[i];
      var tdx = tr.x - cam.pos.x, tdz = tr.z - cam.pos.z;
      var tDepth = tdx * cam.fwd.x + tdz * cam.fwd.z;
      if (tDepth < 8 || tDepth > 1500) continue;
      var tp = project(cam, tr.x, hAt(Math.round(tr.x / 50) * 50, Math.round(tr.z / 50) * 50), tr.z);
      if (!tp || tp.x < -30 || tp.x > VW + 30 || tp.y < -40 || tp.y > VH + 40) continue;
      list.push({ kind: "tree", p: tp, s: tr.s, hue: tr.hue, cz: tp.cz });
    }
    // ---- rings ----
    var rings = W.rings;
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i];
      var rp = project(cam, rg.x, rg.y, rg.z);
      if (!rp || rp.cz < 6 || rp.cz > 1800) continue;
      list.push({ kind: "ring", p: rp, r: rg.r, done: rg.passed, next: i === p.ringsPassed, cz: rp.cz });
    }
    // ---- clouds ----
    var clouds = W.clouds;
    for (i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var cp = project(cam, cl.x, cl.y, cl.z);
      if (!cp || cp.cz < 10 || cp.cz > 2400) continue;
      list.push({ kind: "cloud", p: cp, s: cl.s, a: cl.a, cz: cp.cz });
    }
    // ---- plane shadow on the ground ----
    if (p && !p.ground) {
      var gh = W.terrainH(p.x, p.z);
      var sh = project(cam, p.x, gh + 0.6, p.z);
      if (sh && sh.cz > 5) {
        var hAbove = R.clamp(1 - (p.y - gh) / 130, 0.12, 1);
        list.push({ kind: "shadow", p: sh, r: Math.max(4, 420 / sh.cz), a: 0.30 * hAbove, cz: sh.cz });
      }
    }
    // ---- paint far to near ----
    list.sort(function (a, b) { return b.cz - a.cz; });
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.kind === "quad") {
        ctx.fillStyle = it.fill;
        ctx.beginPath();
        ctx.moveTo(it.pts[0].x, it.pts[0].y);
        for (j = 1; j < it.pts.length; j++) ctx.lineTo(it.pts[j].x, it.pts[j].y);
        ctx.closePath(); ctx.fill();
      } else if (it.kind === "dot") {
        ctx.save();
        ctx.shadowColor = "#ffca6a"; ctx.shadowBlur = 10;
        ctx.fillStyle = it.fill;
        ctx.beginPath(); ctx.arc(it.p.x, it.p.y, it.r, 0, R.TAU); ctx.fill();
        ctx.restore();
      } else if (it.kind === "tree") {
        var sc = it.p.s;
        var th = it.s * 2.4 * sc;
        var tw = it.s * 1.7 * sc;
        ctx.strokeStyle = "#5a4632";
        ctx.lineWidth = Math.max(1, 0.14 * th);
        ctx.beginPath();
        ctx.moveTo(it.p.x, it.p.y);
        ctx.lineTo(it.p.x, it.p.y - th * 0.45);
        ctx.stroke();
        ctx.fillStyle = it.hue > 0.5 ? "#2f5c2e" : "#3d6b38";
        ctx.beginPath(); ctx.arc(it.p.x, it.p.y - th * 0.62, tw * 0.42, 0, R.TAU); ctx.fill();
        ctx.fillStyle = it.hue > 0.5 ? "#4a7d3d" : "#557f43";
        ctx.beginPath(); ctx.arc(it.p.x - tw * 0.16, it.p.y - th * 0.78, tw * 0.30, 0, R.TAU); ctx.fill();
      } else if (it.kind === "ring") {
        var rr = Math.max(3, it.p.s * it.r);
        ctx.save();
        ctx.strokeStyle = it.done ? C.RING_DONE : C.RING_NEXT;
        ctx.lineWidth = Math.max(2, rr * 0.10);
        ctx.shadowColor = it.done ? "#7ee787" : "#ffb347";
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rr, 0, R.TAU); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = Math.max(1, rr * 0.03);
        ctx.beginPath(); ctx.arc(it.p.x, it.p.y, rr * 0.86, 0, R.TAU); ctx.stroke();
        ctx.restore();
        // light beam above the next ring so it can be spotted from afar
        if (it.next) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 179, 71, 0.35)";
          ctx.lineWidth = Math.max(2, rr * 0.10);
          ctx.beginPath();
          ctx.moveTo(it.p.x, it.p.y - rr);
          ctx.lineTo(it.p.x, it.p.y - rr * 3.2);
          ctx.stroke();
          ctx.restore();
        }
      } else if (it.kind === "cloud") {
        // a puff of three overlapping blobs reads as a cloud, not a pill
        var cs = it.p.s * it.s;
        var blobs = [
          [0, 0, 1.0, 1.0], [-0.62, 0.10, 0.62, 0.8], [0.58, 0.12, 0.66, 0.8],
          [-0.18, -0.22, 0.55, 0.7], [0.28, -0.18, 0.5, 0.7]
        ];
        for (var bi = 0; bi < blobs.length; bi++) {
          var bl = blobs[bi];
          var bx = it.p.x + bl[0] * cs, by = it.p.y + bl[1] * cs * 0.55;
          var br = cs * bl[2];
          var cg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          cg.addColorStop(0, "rgba(255, 244, 230, " + (it.a * bl[3]) + ")");
          cg.addColorStop(0.7, "rgba(255, 240, 225, " + (it.a * bl[3] * 0.5) + ")");
          cg.addColorStop(1, "rgba(255, 240, 225, 0)");
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.ellipse(bx, by, br * 1.25, br * 0.55, 0, 0, R.TAU);
          ctx.fill();
        }
      } else if (it.kind === "shadow") {
        ctx.fillStyle = "rgba(10, 10, 14, " + it.a + ")";
        ctx.beginPath();
        ctx.ellipse(it.p.x, it.p.y, it.r, it.r * 0.32, 0, 0, R.TAU);
        ctx.fill();
      }
    }
  }

  function drawPlaneChase(ctx, p, t) {
    var cx = VW / 2, cy = VH * 0.56 - p.pitch * 46;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.roll * 0.85);
    var S = 1.15;
    // propeller disc (spinning)
    var propA = (t * 38) % R.TAU;
    ctx.save();
    ctx.translate(0, -66 * S);
    ctx.rotate(propA);
    ctx.fillStyle = "rgba(40, 40, 46, 0.28)";
    ctx.beginPath(); ctx.ellipse(0, 0, 5 * S, 34 * S, 0, 0, R.TAU); ctx.fill();
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.ellipse(0, 0, 5 * S, 34 * S, 0, 0, R.TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255, 255, 255, 0.20)";
    ctx.beginPath(); ctx.ellipse(0, -66 * S, 30 * S, 34 * S, 0, 0, R.TAU); ctx.fill();
    // tailplane + fin
    ctx.fillStyle = "#e8722a";
    ctx.beginPath();
    ctx.moveTo(-34 * S, 52 * S); ctx.lineTo(34 * S, 52 * S);
    ctx.lineTo(26 * S, 62 * S); ctx.lineTo(-26 * S, 62 * S);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d95f1e";
    ctx.beginPath();
    ctx.moveTo(-4 * S, 44 * S); ctx.lineTo(4 * S, 44 * S);
    ctx.lineTo(10 * S, 66 * S); ctx.lineTo(-10 * S, 66 * S);
    ctx.closePath(); ctx.fill();
    // fuselage (tail at bottom, nose at top)
    var fg = ctx.createLinearGradient(-14, -70, 14, 70);
    fg.addColorStop(0, "#f7ead0"); fg.addColorStop(0.6, "#efe0bd"); fg.addColorStop(1, "#d9c49a");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -72 * S);
    ctx.quadraticCurveTo(13 * S, -40 * S, 12 * S, 10 * S);
    ctx.quadraticCurveTo(11 * S, 52 * S, 0, 64 * S);
    ctx.quadraticCurveTo(-11 * S, 52 * S, -12 * S, 10 * S);
    ctx.quadraticCurveTo(-13 * S, -40 * S, 0, -72 * S);
    ctx.fill();
    // orange cheatline
    ctx.fillStyle = "#e8722a";
    ctx.beginPath();
    ctx.moveTo(-12.5 * S, -18 * S); ctx.lineTo(12.5 * S, -18 * S);
    ctx.lineTo(12 * S, -8 * S); ctx.lineTo(-12 * S, -8 * S);
    ctx.closePath(); ctx.fill();
    // windows
    ctx.fillStyle = "#20344a";
    ctx.beginPath();
    ctx.moveTo(-8 * S, -52 * S); ctx.lineTo(8 * S, -52 * S);
    ctx.lineTo(9 * S, -34 * S); ctx.lineTo(-9 * S, -34 * S);
    ctx.closePath(); ctx.fill();
    // high wing
    var wg = ctx.createLinearGradient(0, -30, 0, -6);
    wg.addColorStop(0, "#f7ead0"); wg.addColorStop(1, "#dcc79b");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(-78 * S, -26 * S); ctx.lineTo(78 * S, -26 * S);
    ctx.lineTo(70 * S, -8 * S); ctx.lineTo(-70 * S, -8 * S);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8722a";
    ctx.beginPath(); ctx.moveTo(-78 * S, -26 * S); ctx.lineTo(-64 * S, -26 * S); ctx.lineTo(-60 * S, -8 * S); ctx.lineTo(-70 * S, -8 * S); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(78 * S, -26 * S); ctx.lineTo(64 * S, -26 * S); ctx.lineTo(60 * S, -8 * S); ctx.lineTo(70 * S, -8 * S); ctx.closePath(); ctx.fill();
    // struts
    ctx.strokeStyle = "#8a7a5c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-40 * S, -14 * S); ctx.lineTo(-10 * S, 6 * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40 * S, -14 * S); ctx.lineTo(10 * S, 6 * S); ctx.stroke();
    // registration
    ctx.fillStyle = "#5a4632";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PK-MRP", 0, 34 * S);
    // nav lights
    ctx.fillStyle = "#ff4444";
    ctx.beginPath(); ctx.arc(-78 * S, -17 * S, 3, 0, R.TAU); ctx.fill();
    ctx.fillStyle = "#44ff88";
    ctx.beginPath(); ctx.arc(78 * S, -17 * S, 3, 0, R.TAU); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, 64 * S, 2.5, 0, R.TAU); ctx.fill();
    ctx.restore();
  }

  function render(ctx, p, view, t) {
    var cam = makeCamera(p, view, t);
    drawSky(ctx, cam);
    if (view !== "menu" || true) drawWorld(ctx, cam, p, t, view);
    if (view === "chase" && p) drawPlaneChase(ctx, p, t);
    return cam;
  }

  return {
    render: render,
    makeCamera: makeCamera,
    project: project,
    FOCAL: FOCAL
  };
})();
