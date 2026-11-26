// Merpati Ridge Run — the flight model.
// One job: turn throttle / pitch / roll input into motion, and decide
// rings, landings, crashes and fuel. Pure arithmetic, no drawing.
MR.physics = (function () {
  var C = MR.config;
  var R = MR.random;

  function createPlane(mission) {
    var strip = C.STRIPS[0];
    return {
      x: strip.x, y: strip.y + 1.2, z: 60,
      yaw: 0, pitch: 0, roll: 0,
      speed: 0, throttle: 0,
      fuel: mission.fuel,
      damage: 0,
      vspeed: 0,
      ground: true,
      gear: true,
      crashed: false,
      crashReason: "",
      landed: false,
      landedStrip: -1,
      landedSoft: false,
      score: 0,
      ringsPassed: 0,
      missionDone: false,
      time: 0,
      message: "",
      messageT: 0
    };
  }

  function stripAt(x, z) {
    for (var i = 0; i < C.STRIPS.length; i++) {
      var s = C.STRIPS[i];
      // a small margin past the painted threshold: the flattened grass
      // either side of it is fair landing ground too
      if (Math.abs(x - s.x) < 13 && z >= s.z0 - 15 && z <= s.z1 + 15) return i;
    }
    return -1;
  }

  function update(p, input, dt, mission) {
    var events = [];
    if (p.crashed || p.missionDone) return events;
    p.time += dt;

    // Throttle
    if (input.throttleUp) p.throttle = R.clamp(p.throttle + dt * 0.7, 0, 1);
    if (input.throttleDown) p.throttle = R.clamp(p.throttle - dt * 0.9, 0, 1);
    if (p.fuel <= 0) p.throttle = 0;

    // Speed chases the throttle setting
    var target = p.throttle * C.MAX_SPEED;
    var rate = target > p.speed ? C.ACCEL : C.ACCEL * 1.6;
    p.speed += R.clamp(target - p.speed, -rate * dt, rate * dt);
    if (p.ground && p.speed < 0.5) p.speed = Math.max(0, p.speed);

    // Controls get mushy near the stall
    var authority = R.clamp(p.speed / 42, 0.22, 1);
    var pitchTarget = (input.pitchUp ? 1 : 0) * 0.38 + (input.pitchDown ? -1 : 0) * 0.34;
    var rollTarget = (input.rollLeft ? -1 : 0) * 0.95 + (input.rollRight ? 1 : 0) * 0.95;
    if (p.ground) { pitchTarget = 0; rollTarget = 0; }
    p.pitch += (pitchTarget - p.pitch) * Math.min(1, 3.0 * dt * authority + 0.6 * dt);
    p.roll += (rollTarget - p.roll) * Math.min(1, 4.2 * dt * authority + 0.6 * dt);

    // Banked turn + a touch of rudder
    p.yaw -= p.roll * C.TURN_RATE * (p.speed / C.MAX_SPEED) * dt * 1.7;
    if (input.yawLeft) p.yaw += 0.25 * dt * authority;
    if (input.yawRight) p.yaw -= 0.25 * dt * authority;

    // Vertical motion
    var sink = 0;
    if (p.speed < C.STALL_SPEED) sink = C.SINK_RATE * (1 - p.speed / C.STALL_SPEED);
    if (p.throttle < 0.15 && !p.ground) sink += 1.2;
    p.vspeed = Math.sin(p.pitch) * p.speed * C.CLIMB_LIFT - sink;

    var prevX = p.x, prevY = p.y, prevZ = p.z;
    p.x += Math.sin(p.yaw) * Math.cos(p.pitch) * p.speed * dt;
    p.z += Math.cos(p.yaw) * Math.cos(p.pitch) * p.speed * dt;
    if (!p.ground) p.y += p.vspeed * dt;
    else {
      p.y = MR.world.terrainH(p.x, p.z) + 1.2;
      // taxiing into the river ends the sortie
      if (p.y - 1.2 < MR.world.WATER_Y - 0.5 && Math.abs(p.x - MR.world.riverX(p.z)) < 26) {
        if (p.speed > 15) {
          p.crashed = true;
          p.crashReason = "Ditched in the river";
          events.push({ type: "crashed", reason: p.crashReason });
          return events;
        }
        p.speed = Math.max(0, p.speed - 30 * dt);
      }
    }

    // Rotation: fast enough and pulling back on the stick means airborne
    if (p.ground && p.speed > 32 && input.pitchUp) {
      p.ground = false;
      p.y = MR.world.terrainH(p.x, p.z) + 1.4;
      p.pitch = 0.12;
    }

    // Fuel
    if (p.speed > 1) {
      p.fuel -= (C.FUEL_BURN_IDLE + p.throttle * (C.FUEL_BURN_FULL - C.FUEL_BURN_IDLE)) * dt;
      if (p.fuel < 0) p.fuel = 0;
      if (p.fuel < 15 && p.fuel > 0 && !p._fuelWarned) {
        p._fuelWarned = true;
        events.push({ type: "fuel-low" });
      }
    }

    // Rings: did the segment cross this ring's plane inside its circle?
    var rings = MR.world.rings;
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      if (ring.passed) continue;
      if ((prevZ < ring.z && p.z >= ring.z) || (prevZ > ring.z && p.z <= ring.z)) {
        var t = (ring.z - prevZ) / ((p.z - prevZ) || 1);
        var cx = prevX + (p.x - prevX) * t;
        var cy = prevY + (p.y - prevY) * t;
        var d = Math.sqrt((cx - ring.x) * (cx - ring.x) + (cy - ring.y) * (cy - ring.y));
        if (d < ring.r) {
          ring.passed = true;
          p.ringsPassed++;
          p.score += C.RING_POINTS;
          events.push({ type: "ring", index: i });
        }
      }
    }

    // Ground contact
    if (!p.ground) {
      var gh = MR.world.terrainH(p.x, p.z);
      if (p.y <= gh + 1.2) {
        var si = stripAt(p.x, p.z);
        var softEnough = Math.abs(p.vspeed) <= C.LAND_VSPEED_HARD &&
          p.speed <= C.LAND_SPEED_MAX + 18 && Math.abs(p.roll) <= 0.42;
        if (si >= 0 && softEnough) {
          p.ground = true;
          p.landed = true;
          p.landedStrip = si;
          p.landedSoft = Math.abs(p.vspeed) <= C.LAND_VSPEED_OK;
          p.y = C.STRIPS[si].y + 1.2;
          p.pitch = 0; p.roll = 0;
          var pts = C.LANDING_POINTS + (p.landedSoft ? C.SMOOTH_LANDING_BONUS : 0);
          p.score += pts;
          events.push({ type: "landed", strip: si, soft: p.landedSoft, points: pts });
          if (mission.id !== "free" && si === 1) {
            p.missionDone = true;
            if (mission.id === "ring-run" && p.ringsPassed < 8) {
              p.missionDone = false;
              events.push({ type: "message", text: "Landed — but rings remain. Take off and finish the run!" });
            } else {
              events.push({ type: "complete" });
            }
          }
        } else {
          p.crashed = true;
          var overRiver = Math.abs(p.x - MR.world.riverX(p.z)) < 22 && gh < 3;
          p.crashReason = overRiver ? "Ditched in the river" :
            (p.speed > 60 ? "Flew into the ridge" : "Hard impact with the ground");
          events.push({ type: "crashed", reason: p.crashReason });
        }
      }
    }

    // Rolling to a stop after landing
    if (p.ground && p.landed) {
      p.speed = Math.max(0, p.speed - 22 * dt);
      p.throttle = Math.max(0, p.throttle - dt);
    }

    // Out of the valley — turn back gently
    if (Math.abs(p.x) > 900 || p.z > 6200 || p.z < -400) {
      events.push({ type: "message", text: "Turn back — the valley ends here" });
      p.yaw += Math.PI * dt * 0.25;
    }
    if (p.y > 420) {
      p.y = 420;
      p.pitch = Math.min(p.pitch, 0);
      events.push({ type: "message", text: "Ceiling 420 m — level off" });
    }
    return events;
  }

  function resetRings() {
    for (var i = 0; i < MR.world.rings.length; i++) MR.world.rings[i].passed = false;
  }

  return {
    createPlane: createPlane,
    update: update,
    stripAt: stripAt,
    resetRings: resetRings
  };
})();
