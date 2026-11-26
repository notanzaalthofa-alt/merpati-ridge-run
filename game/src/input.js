// Merpati Ridge Run — keyboard and mouse.
// One job: track what the pilot is holding and what they clicked.
MR.input = (function () {
  var keys = {};
  var mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function attach(canvas) {
    window.addEventListener("keydown", function (e) {
      keys[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", function (e) { keys[e.code] = false; });
    window.addEventListener("blur", function () { keys = {}; });
    canvas.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener("click", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
      mouse.clicked = true;
    });
  }

  function state() {
    return {
      throttleUp: !!keys["KeyW"] || !!keys["Equal"],
      throttleDown: !!keys["KeyS"],
      pitchUp: !!keys["ArrowUp"],
      pitchDown: !!keys["ArrowDown"],
      rollLeft: !!keys["ArrowLeft"],
      rollRight: !!keys["ArrowRight"],
      yawLeft: !!keys["KeyA"],
      yawRight: !!keys["KeyD"]
    };
  }

  // Edge-triggered: true once per physical press.
  function pressed(code) {
    if (keys[code]) { keys[code] = false; return true; }
    return false;
  }

  function takeClick() {
    if (mouse.clicked) {
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    }
    return null;
  }

  return {
    attach: attach,
    state: state,
    pressed: pressed,
    takeClick: takeClick,
    mouse: mouse
  };
})();
