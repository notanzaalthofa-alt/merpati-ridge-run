// Merpati Ridge Run — HUD, menus and end screens.
// One job: everything drawn on top of the world that is not the world:
// flight data, mission progress, messages, title menu, crash/landing cards.
MR.hud = (function () {
  var C = MR.config, R = MR.random;
  var W = C.W, H = C.H;

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = C.HUD_PANEL;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  }

  function fmt(n, d) {
    return n.toLocaleString("en-US", { maximumFractionDigits: d === undefined ? 0 : d });
  }

  function drawHUD(ctx, p, game, t) {
    ctx.save();
    ctx.textBaseline = "alphabetic";
    // ---- top-left: speed / altitude / vertical speed ----
    panel(ctx, 16, 14, 216, 92);
    ctx.fillStyle = C.HUD_CYAN;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SPD", 30, 40);
    ctx.fillText("ALT", 30, 66);
    ctx.fillText("V/S", 30, 92);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(p.speed * 1.94)), 200, 42);
    ctx.fillText(fmt((p.y - 4) * 3.28), 200, 68);
    var vs = p.vspeed * 3.28 * 60;
    ctx.fillStyle = vs > 60 ? C.HUD_GREEN : vs < -60 ? C.HUD_RED : "#ffffff";
    ctx.fillText((vs >= 0 ? "+" : "") + String(Math.round(vs)), 200, 94);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("KT", 206, 40);
    ctx.fillText("FT", 206, 66);
    ctx.fillText("FPM", 206, 92);

    // ---- top-centre: compass tape ----
    var cx = W / 2, cy = 30;
    panel(ctx, cx - 210, 14, 420, 44);
    var hdg = ((p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - 205, 16, 410, 40); ctx.clip();
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    for (var d = -80; d <= 80; d += 5) {
      var deg = (Math.round(hdg + d) + 360) % 360;
      var dx = cx + d * 2.4;
      var major = deg % 30 === 0;
      ctx.strokeStyle = major ? C.HUD_AMBER : "rgba(255,255,255,0.55)";
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(dx, 26); ctx.lineTo(dx, major ? 40 : 34); ctx.stroke();
      if (major) {
        var name = deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : deg === 270 ? "W" : String(deg / 10);
        ctx.fillStyle = "#ffd9a0";
        ctx.fillText(name, dx, 52);
      }
    }
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.round(hdg)).padStart(3, "0") + "°", cx, 24);
    ctx.fillStyle = C.HUD_RED;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 14); ctx.lineTo(cx + 6, 14); ctx.lineTo(cx, 22);
    ctx.closePath(); ctx.fill();

    // ---- top-right: mission / score / fuel / damage ----
    panel(ctx, W - 232, 14, 216, 110);
    ctx.textAlign = "left";
    ctx.fillStyle = C.HUD_AMBER;
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(game.mission.name.toUpperCase(), W - 218, 38);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px monospace";
    ctx.fillText("SCORE " + fmt(p.score), W - 218, 60);
    ctx.fillStyle = "#ffd9a0";
    ctx.font = "12px sans-serif";
    ctx.fillText("RINGS " + p.ringsPassed + " / 8", W - 218, 80);
    // fuel bar
    ctx.fillStyle = "#22303f";
    ctx.fillRect(W - 218, 90, 96, 8);
    ctx.fillStyle = p.fuel < 15 ? C.HUD_RED : C.HUD_GREEN;
    ctx.fillRect(W - 218, 90, 96 * R.clamp(p.fuel / 100, 0, 1), 8);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "10px sans-serif";
    ctx.fillText("FUEL", W - 218, 110);
    ctx.fillText("DMG", W - 116, 110);
    ctx.fillStyle = "#22303f";
    ctx.fillRect(W - 116, 90, 96, 8);
    ctx.fillStyle = p.damage > 60 ? C.HUD_RED : C.HUD_AMBER;
    ctx.fillRect(W - 116, 90, 96 * R.clamp(p.damage / 100, 0, 1), 8);

    // ---- bottom-right: throttle ----
    panel(ctx, W - 150, H - 56, 134, 42);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("THROTTLE", W - 138, H - 38);
    ctx.fillStyle = "#22303f";
    ctx.fillRect(W - 138, H - 30, 110, 7);
    ctx.fillStyle = C.HUD_AMBER;
    ctx.fillRect(W - 138, H - 30, 110 * p.throttle, 7);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(p.throttle * 100) + "%", W - 24, H - 38);

    // ---- warnings ----
    var warn = "";
    if (p.speed < C.STALL_SPEED && !p.ground && p.speed > 2) warn = "STALL — NOSE DOWN, POWER UP";
    else if (p.fuel > 0 && p.fuel < 15) warn = "FUEL LOW";
    else if (!p.ground && p.vspeed < -4) {
      var gh = MR.world.terrainH(p.x, p.z);
      if (p.y - gh < 45) warn = "PULL UP";
    }
    if (warn && Math.floor(t * 2.4) % 2 === 0) {
      ctx.fillStyle = C.HUD_RED;
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(warn, W / 2, 132);
    }

    // ---- centre flash message ----
    if (game.message && game.messageT > 0) {
      ctx.save();
      ctx.globalAlpha = R.clamp(game.messageT, 0, 1);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 12;
      ctx.fillText(game.message, W / 2, H * 0.42);
      ctx.restore();
    }

    // ---- controls hint (early flight only) ----
    if (p.time < 14 && !p.crashed) {
      ctx.save();
      ctx.globalAlpha = R.clamp((14 - p.time) / 3, 0, 1) * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("W/S throttle   •   Arrow keys fly   •   A/D rudder   •   C camera   •   R restart", W / 2, H - 18);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMenu(ctx, game, t, mouse) {
    ctx.save();
    // dusk veil so text reads
    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "rgba(8, 14, 26, 0.25)");
    vg.addColorStop(0.55, "rgba(8, 14, 26, 0.10)");
    vg.addColorStop(1, "rgba(8, 14, 26, 0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb347";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("M E R P A T I   A I R   P R E S E N T S", W / 2, 108);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 74px Georgia, serif";
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 18;
    ctx.fillText("Ridge Run", W / 2, 178);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffe1b0";
    ctx.font = "20px Georgia, serif";
    ctx.fillText("A golden-hour bush flight down the river valley", W / 2, 212);

    // mission cards
    var cards = C.MISSIONS;
    var cw = 330, ch = 168, gap = 28;
    var x0 = W / 2 - (cw * 3 + gap * 2) / 2;
    var y0 = 268;
    game.menuRects = [];
    for (var i = 0; i < cards.length; i++) {
      var x = x0 + i * (cw + gap);
      var hover = mouse && mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch;
      ctx.fillStyle = hover ? "rgba(30, 44, 66, 0.92)" : "rgba(12, 20, 34, 0.82)";
      ctx.beginPath(); ctx.roundRect(x, y0, cw, ch, 12); ctx.fill();
      ctx.strokeStyle = hover ? C.HUD_AMBER : "rgba(255,255,255,0.25)";
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.beginPath(); ctx.roundRect(x, y0, cw, ch, 12); ctx.stroke();
      ctx.fillStyle = C.HUD_AMBER;
      ctx.font = "bold 13px sans-serif";
      ctx.fillText((i + 1) + "  ·  " + cards[i].tag.toUpperCase(), W / 2 + (x + cw / 2 - W / 2), y0 + 34);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px Georgia, serif";
      ctx.fillText(cards[i].name, x + cw / 2, y0 + 74);
      ctx.fillStyle = "#c8d4e2";
      ctx.font = "15px sans-serif";
      wrapText(ctx, cards[i].desc, x + cw / 2, y0 + 104, cw - 36, 21);
      game.menuRects.push({ x: x, y: y0, w: cw, h: ch, mission: cards[i].id });
    }

    ctx.fillStyle = "#e8eef5";
    ctx.font = "16px sans-serif";
    ctx.fillText("W/S throttle   •   Arrow keys pitch & roll   •   A/D rudder   •   C cockpit / chase   •   R restart", W / 2, 500);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "14px sans-serif";
    ctx.fillText("Fly the rings, mind your fuel, and land her soft. Click a mission or press 1, 2 or 3.", W / 2, 532);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "13px sans-serif";
    ctx.fillText("An original game built for make.fun — no assets borrowed, every pixel drawn in code.", W / 2, H - 26);
    ctx.restore();
  }

  function wrapText(ctx, text, cx, y, maxW, lh) {
    var words = text.split(" ");
    var line = "", yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, yy);
        line = words[i];
        yy += lh;
      } else line = test;
    }
    ctx.fillText(line, cx, yy);
  }

  function drawEnd(ctx, p, game) {
    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 20, 0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    var title, sub, color;
    if (p.crashed) {
      title = "DOWN IN THE VALLEY";
      sub = p.crashReason + "  •  Score " + p.score;
      color = C.HUD_RED;
    } else if (p.missionDone) {
      title = "MISSION COMPLETE";
      sub = "Delivered safe  •  Score " + p.score + "  •  Rings " + p.ringsPassed + "/8  •  Fuel left " + Math.round(p.fuel) + "%";
      color = C.HUD_GREEN;
    } else if (p.landed) {
      title = p.landedSoft ? "BUTTER SMOOTH" : "DOWN SAFE";
      sub = "Landed at " + C.STRIPS[p.landedStrip].name + "  •  Score " + p.score + "  •  Press R to fly again";
      color = C.HUD_AMBER;
    } else return;
    ctx.fillStyle = color;
    ctx.font = "bold 52px Georgia, serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 16;
    ctx.fillText(title, W / 2, H / 2 - 16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.fillText(sub, W / 2, H / 2 + 26);
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "16px sans-serif";
    ctx.fillText("R — fly again    •    M — menu", W / 2, H / 2 + 66);
    ctx.restore();
  }

  return {
    drawHUD: drawHUD,
    drawMenu: drawMenu,
    drawEnd: drawEnd
  };
})();
