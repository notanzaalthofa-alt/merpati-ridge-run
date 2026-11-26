// Merpati Ridge Run — game loop, states and missions.
// One job: own the frame: menu -> flying -> paused / landed / crashed.
// Also honours ?shot=<cover|cockpit|valley|landing> presets, which stage
// the plane for a screenshot and freeze the physics for a steady frame.
(function () {
  var C = MR.config;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  MR.input.attach(canvas);

  var params = new URLSearchParams(location.search);
  var shotName = params.get("shot");
  var missionParam = params.get("mission");

  var game = {
    state: "menu",
    mission: C.MISSIONS[0],
    view: "chase",
    plane: null,
    message: "",
    messageT: 0,
    menuRects: [],
    time: 0
  };
  MR.game = game;

  function startMission(mission) {
    MR.physics.resetRings();
    game.mission = mission;
    game.plane = MR.physics.createPlane(mission);
    game.plane.fuel = mission.fuel;
    game.state = "flying";
    game.view = "chase";
    game.message = mission.name + " — " + mission.tag;
    game.messageT = 2.5;
    MR.audio.ensure();
    MR.audio.click();
  }

  function applyShot() {
    var p = game.plane;
    // Hide the mission banner and the controls hint for a clean shot.
    game.message = "";
    game.messageT = 0;
    p.time = 20;
    if (shotName === "cover") {
      p.x = MR.world.riverX(1250) - 30; p.y = 74; p.z = 1250;
      p.yaw = 0.06; p.pitch = 0.02; p.roll = -0.32;
      p.speed = 68; p.throttle = 0.75; p.ground = false;
      game.view = "chase";
    } else if (shotName === "cockpit") {
      p.x = -4; p.y = 26; p.z = -260;
      p.yaw = 0.02; p.pitch = -0.06; p.roll = 0.02;
      p.speed = 52; p.throttle = 0.55; p.ground = false;
      game.view = "cockpit";
    } else if (shotName === "valley") {
      p.x = MR.world.riverX(2400) + 55; p.y = 52; p.z = 2400;
      p.yaw = -0.05; p.pitch = 0.01; p.roll = 0.18;
      p.speed = 74; p.throttle = 0.8; p.ground = false;
      game.view = "chase";
    } else if (shotName === "landing") {
      p.x = 82; p.y = 26; p.z = 4900;
      p.yaw = 0; p.pitch = -0.05; p.roll = 0;
      p.speed = 46; p.throttle = 0.4; p.ground = false;
      game.view = "chase";
    }
  }

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.type === "ring") {
        game.message = "RING " + (e.index + 1) + " / 8   +100";
        game.messageT = 2;
        MR.audio.chime();
      } else if (e.type === "landed") {
        game.message = e.soft ? "BUTTER SMOOTH  +" + e.points : "DOWN SAFE  +" + e.points;
        game.messageT = 2.5;
        MR.audio.thud();
      } else if (e.type === "crashed") {
        game.message = e.reason;
        game.messageT = 3;
        MR.audio.crash();
      } else if (e.type === "complete") {
        game.message = "MISSION COMPLETE";
        game.messageT = 3;
        MR.audio.chime();
      } else if (e.type === "fuel-low") {
        game.message = "FUEL LOW — find a strip";
        game.messageT = 3;
      } else if (e.type === "message") {
        game.message = e.text;
        game.messageT = 2.5;
      }
    }
  }

  // Boot: shot mode goes straight into the staged scene.
  if (shotName) {
    var m = C.MISSIONS[0];
    if (missionParam) {
      for (var mi = 0; mi < C.MISSIONS.length; mi++) {
        if (C.MISSIONS[mi].id === missionParam) m = C.MISSIONS[mi];
      }
    }
    startMission(m);
    applyShot();
  } else {
    game.plane = MR.physics.createPlane(game.mission);
  }

  var last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;
    var t = game.time;

    if (game.state === "menu") {
      MR.render.render(ctx, game.plane, "menu", t);
      MR.hud.drawMenu(ctx, game, t, MR.input.mouse);
      var click = MR.input.takeClick();
      if (click) {
        for (var i = 0; i < game.menuRects.length; i++) {
          var r = game.menuRects[i];
          if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
            for (var j = 0; j < C.MISSIONS.length; j++) {
              if (C.MISSIONS[j].id === r.mission) startMission(C.MISSIONS[j]);
            }
          }
        }
      }
      if (MR.input.pressed("Digit1")) startMission(C.MISSIONS[0]);
      if (MR.input.pressed("Digit2")) startMission(C.MISSIONS[1]);
      if (MR.input.pressed("Digit3")) startMission(C.MISSIONS[2]);
      return;
    }

    if (game.state === "paused") {
      ctx.fillStyle = "rgba(8, 12, 20, 0.6)";
      ctx.fillRect(0, 0, C.W, C.H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Paused", C.W / 2, C.H / 2);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#9fb2c8";
      ctx.fillText("P — resume    •    R — restart    •    M — menu", C.W / 2, C.H / 2 + 40);
      if (MR.input.pressed("KeyP")) game.state = "flying";
      if (MR.input.pressed("KeyR")) startMission(game.mission);
      if (MR.input.pressed("KeyM")) game.state = "menu";
      return;
    }

    // flying
    if (MR.input.pressed("KeyC")) {
      game.view = game.view === "chase" ? "cockpit" : "chase";
      MR.audio.click();
    }
    if (MR.input.pressed("KeyR")) { startMission(game.mission); return; }
    if (MR.input.pressed("KeyM")) { game.state = "menu"; return; }
    if (MR.input.pressed("KeyP")) { game.state = "paused"; return; }

    var events = [];
    if (!shotName) {
      events = MR.physics.update(game.plane, MR.input.state(), dt, game.mission);
      handleEvents(events);
    }
    if (game.messageT > 0) game.messageT -= dt;
    MR.audio.update(game.plane);

    MR.render.render(ctx, game.plane, game.view, t);
    if (game.view === "cockpit") MR.cockpit.drawCockpit(ctx, game.plane, t);
    MR.hud.drawHUD(ctx, game.plane, game, t);
    var p = game.plane;
    if (p.crashed || p.missionDone || (p.landed && p.speed < 1)) {
      MR.hud.drawEnd(ctx, p, game);
    }
  }
  requestAnimationFrame(loop);
})();
