// Merpati Ridge Run — the cockpit.
// One job: the lit instrument panel for cockpit view: six gauges,
// compass tape, throttle quadrant and yoke, drawn in screen space.
MR.cockpit = (function () {
  var C = MR.config, R = MR.random;
  var W = C.W, H = C.H;

  function dialFace(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = "#0d131b";
    ctx.beginPath(); ctx.arc(x, y, r, 0, R.TAU); ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a3442";
    ctx.beginPath(); ctx.arc(x, y, r, 0, R.TAU); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 179, 71, 0.7)";
    ctx.beginPath(); ctx.arc(x, y, r - 5, 0, R.TAU); ctx.stroke();
    // glass glint
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, r - 9, -2.4, -1.2); ctx.stroke();
    ctx.restore();
  }

  function ticks(ctx, x, y, r, n, majorEvery) {
    ctx.save();
    ctx.strokeStyle = "#ffb347";
    ctx.fillStyle = "#ffd9a0";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var i = 0; i <= n; i++) {
      var a = -Math.PI * 0.75 + (i / n) * Math.PI * 1.5;
      var major = i % majorEvery === 0;
      var r1 = r - (major ? 12 : 7), r2 = r - 5;
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function needle(ctx, x, y, r, frac, color) {
    var a = -Math.PI * 0.75 + R.clamp(frac, 0, 1) * Math.PI * 1.5;
    ctx.save();
    ctx.strokeStyle = color || "#ffcf7d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12));
    ctx.stroke();
    ctx.fillStyle = "#d8dee8";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, R.TAU); ctx.fill();
    ctx.restore();
  }

  function label(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = "#8fd8ff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 34);
    ctx.restore();
  }

  function airspeed(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    ticks(ctx, x, y, r, 12, 3);
    needle(ctx, x, y, r, (p.speed * 1.94) / 120, "#ffcf7d");
    label(ctx, x, y, "AIRSPEED");
  }

  function attitude(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r - 6, 0, R.TAU); ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(-p.roll);
    ctx.translate(0, p.pitch * 90);
    ctx.fillStyle = "#3f7fc4";
    ctx.fillRect(-r, -r, r * 2, r);
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
    // fixed aircraft symbol
    ctx.save();
    ctx.strokeStyle = "#ffb347";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y); ctx.lineTo(x - r * 0.18, y);
    ctx.moveTo(x + r * 0.18, y); ctx.lineTo(x + r * 0.55, y);
    ctx.stroke();
    ctx.fillStyle = "#ffb347";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, R.TAU); ctx.fill();
    ctx.restore();
    ticks(ctx, x, y, r, 12, 3);
    label(ctx, x, y, "ATTITUDE");
  }

  function altimeter(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    ticks(ctx, x, y, r, 10, 2);
    var altFt = Math.max(0, (p.y - 4) * 3.28);
    needle(ctx, x, y, r, (altFt % 1000) / 1000, "#ffcf7d");
    ctx.save();
    ctx.fillStyle = "#0d131b";
    ctx.fillRect(x - 16, y + 8, 32, 15);
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 1;
    ctx.strokeRect(x - 16, y + 8, 32, 15);
    ctx.fillStyle = "#8fd8ff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(Math.round(altFt)), x, y + 16);
    ctx.restore();
    label(ctx, x, y, "ALTITUDE");
  }

  function vsi(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    ticks(ctx, x, y, r, 10, 5);
    needle(ctx, x, y, r, R.clamp((p.vspeed + 10) / 20, 0, 1), "#8fd8ff");
    label(ctx, x, y, "VERT SPEED");
  }

  function headingDial(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    var hdg = ((p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    ctx.save();
    ctx.fillStyle = "#ffd9a0";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var names = ["N", "E", "S", "W"];
    for (var i = 0; i < 4; i++) {
      var deg = i * 90;
      var a = ((deg - hdg) * Math.PI / 180) - Math.PI / 2;
      var lx = x + Math.cos(a) * (r - 17), ly = y + Math.sin(a) * (r - 17);
      ctx.fillText(names[i], lx, ly);
    }
    // cardinal tick marks
    ctx.strokeStyle = "#ffb347";
    ctx.lineWidth = 2;
    for (var j = 0; j < 12; j++) {
      var a2 = -Math.PI * 0.75 + (j / 12) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a2) * (r - 10), y + Math.sin(a2) * (r - 10));
      ctx.lineTo(x + Math.cos(a2) * (r - 5), y + Math.sin(a2) * (r - 5));
      ctx.stroke();
    }
    ctx.restore();
    // lubber line
    ctx.save();
    ctx.strokeStyle = "#ff6b5e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - r + 4); ctx.lineTo(x, y - r + 14); ctx.stroke();
    ctx.restore();
    label(ctx, x, y, "HEADING");
  }

  function fuelDial(ctx, x, y, r, p) {
    dialFace(ctx, x, y, r);
    ticks(ctx, x, y, r, 10, 5);
    // red zone under 15
    ctx.save();
    ctx.strokeStyle = "#ff6b5e"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, r - 5, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * 0.15); ctx.stroke();
    ctx.restore();
    needle(ctx, x, y, r, p.fuel / 100, p.fuel < 15 ? "#ff6b5e" : "#7ee787");
    label(ctx, x, y, "FUEL");
  }

  function compassTape(ctx, p) {
    var cx = W / 2, y = H * 0.62, halfW = 200;
    ctx.save();
    ctx.fillStyle = "rgba(10, 18, 32, 0.55)";
    ctx.fillRect(cx - halfW - 8, y - 16, halfW * 2 + 16, 32);
    var hdg = ((p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var d = -60; d <= 60; d += 5) {
      var deg = (Math.round(hdg + d) + 360) % 360;
      var dx = cx + d * 4.1;
      var major = deg % 30 === 0;
      ctx.strokeStyle = major ? "#ffb347" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(dx, y + (major ? 4 : 8)); ctx.lineTo(dx, y + 14); ctx.stroke();
      if (major) {
        var name = deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : deg === 270 ? "W" : String(deg / 10);
        ctx.fillStyle = "#ffd9a0";
        ctx.fillText(name, dx, y - 6);
      }
    }
    ctx.fillStyle = "#ff6b5e";
    ctx.beginPath();
    ctx.moveTo(cx - 6, y - 16); ctx.lineTo(cx + 6, y - 16); ctx.lineTo(cx, y - 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCockpit(ctx, p, t) {
    // A-pillars: slim, so they frame the view instead of eating it
    ctx.save();
    var pg = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    pg.addColorStop(0, "#10161f"); pg.addColorStop(1, "#1c2632");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.lineTo(W * 0.315, H * 0.52); ctx.lineTo(W * 0.295, H * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(W - 20, 0); ctx.lineTo(W * 0.685, H * 0.52); ctx.lineTo(W * 0.705, H * 0.55);
    ctx.closePath(); ctx.fill();
    // top shade band
    ctx.fillStyle = "rgba(8, 12, 20, 0.25)";
    ctx.fillRect(0, 0, W, 46);
    ctx.restore();

    // compass tape above the panel
    compassTape(ctx, p);

    // panel
    ctx.save();
    var g = ctx.createLinearGradient(0, H * 0.64, 0, H);
    g.addColorStop(0, "#232c38"); g.addColorStop(0.25, "#171f29"); g.addColorStop(1, "#0b0f16");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.72);
    ctx.quadraticCurveTo(W / 2, H * 0.64, W, H * 0.72);
    ctx.lineTo(W, H);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255, 179, 71, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.quadraticCurveTo(W / 2, H * 0.64, W, H * 0.72);
    ctx.stroke();
    ctx.restore();

    // six gauges
    var gy = H * 0.845, gr = 50;
    var xs = [W / 2 - 330, W / 2 - 198, W / 2 - 66, W / 2 + 66, W / 2 + 198, W / 2 + 330];
    airspeed(ctx, xs[0], gy, gr, p);
    attitude(ctx, xs[1], gy, gr, p);
    altimeter(ctx, xs[2], gy, gr, p);
    vsi(ctx, xs[3], gy, gr, p);
    headingDial(ctx, xs[4], gy, gr, p);
    fuelDial(ctx, xs[5], gy, gr, p);

    // throttle quadrant (right side)
    ctx.save();
    var qx = W - 92, qy = H * 0.80;
    ctx.fillStyle = "rgba(10, 18, 32, 0.6)";
    ctx.fillRect(qx - 26, qy - 52, 52, 116);
    ctx.strokeStyle = "#2a3442"; ctx.lineWidth = 2;
    ctx.strokeRect(qx - 26, qy - 52, 52, 116);
    ctx.fillStyle = "#3a4552";
    ctx.fillRect(qx - 3, qy - 44, 6, 88);
    var ly = qy + 44 - p.throttle * 88;
    ctx.fillStyle = "#e8722a";
    ctx.beginPath(); ctx.arc(qx, ly, 9, 0, R.TAU); ctx.fill();
    ctx.fillStyle = "#8fd8ff";
    ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("THR", qx, qy + 78);
    ctx.restore();

    // yoke (bottom centre, peeking over the panel)
    ctx.save();
    ctx.strokeStyle = "#39434f"; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 52, H + 6); ctx.lineTo(W / 2 - 30, H * 0.93);
    ctx.moveTo(W / 2 + 52, H + 6); ctx.lineTo(W / 2 + 30, H * 0.93);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 30, H * 0.93); ctx.lineTo(W / 2 + 30, H * 0.93);
    ctx.stroke();
    ctx.restore();
  }

  return { drawCockpit: drawCockpit };
})();
