// Merpati Ridge Run — tuning, colours and mission definitions.
// One job: every number the rest of the game reads lives here.
MR.config = {
  W: 1280,
  H: 800,
  FOV_DEG: 68,
  NEAR: 2,

  // Flight tuning (units are metres, speeds m/s, angles radians)
  MAX_SPEED: 92,
  CRUISE_SPEED: 58,
  STALL_SPEED: 26,
  ACCEL: 16,
  PITCH_RATE: 0.85,
  ROLL_RATE: 1.9,
  TURN_RATE: 0.55,
  PITCH_DAMP: 2.2,
  ROLL_DAMP: 2.6,
  CLIMB_LIFT: 0.9,
  SINK_RATE: 3.5,
  FUEL_BURN_FULL: 0.42,
  FUEL_BURN_IDLE: 0.10,
  FUEL_START: 100,

  // Damage / landing
  LAND_VSPEED_OK: 2.6,
  LAND_VSPEED_HARD: 5.0,
  LAND_SPEED_MAX: 55,
  LAND_ROLL_MAX: 0.28,
  CRASH_DAMAGE: 100,
  HARD_LANDING_DAMAGE: 18,

  // Scoring
  RING_POINTS: 100,
  LANDING_POINTS: 250,
  SMOOTH_LANDING_BONUS: 150,
  TIME_BONUS_PER_SEC: 2,

  // Runways (y is the flattened strip height)
  STRIPS: [
    { name: "Merpati Field", x: 0, z0: -20, z1: 400, y: 4, heading: 0 },
    { name: "Ridge Grass Strip", x: 85, z0: 5000, z1: 5380, y: 6, heading: 0 }
  ],

  MISSIONS: [
    {
      id: "ring-run",
      name: "Ring Run",
      tag: "8 rings, then land",
      desc: "Thread all 8 glowing rings down the valley, then put her down soft on the Ridge Grass Strip.",
      fuel: 100
    },
    {
      id: "courier",
      name: "Courier",
      tag: "Deliver the cargo",
      desc: "A mercy parcel for the ridge village. Fuel is tight — fly clean, land gentle on the grass strip.",
      fuel: 62
    },
    {
      id: "free",
      name: "Free Flight",
      tag: "No pressure, just sky",
      desc: "Golden hour over the valley. Chase rings for points, practise landings, enjoy the view.",
      fuel: 100
    }
  ],

  // Golden-hour palette
  SKY_TOP: "#16305e",
  SKY_MID: "#5f8fb8",
  SKY_HORIZON: "#ffb26b",
  SKY_LOW: "#e8875a",
  SUN_COLOR: "#fff3c4",
  SUN_GLOW: "rgba(255, 190, 110, 0.55)",
  FOG_COLOR: "#e8a06a",
  WATER_DEEP: "#1d5f7a",
  WATER_SHALLOW: "#3f8ea8",
  SAND: "#d9c08a",
  GRASS_A: "#5d8a4a",
  GRASS_B: "#6fa05a",
  FIELD_WHEAT: "#c9a86a",
  FIELD_DARK: "#4e7d46",
  FIELD_OLIVE: "#8a9a5b",
  FIELD_BROWN: "#9c7a4d",
  FOREST: "#3d6b38",
  ROCK: "#8a7a6d",
  ROCK_DARK: "#6b5d52",
  ASPHALT: "#3a3f46",
  RING_NEXT: "#ffb347",
  RING_DONE: "#7ee787",
  RING_GLOW: "rgba(255, 179, 71, 0.9)",

  HUD_AMBER: "#ffb347",
  HUD_CYAN: "#8fd8ff",
  HUD_GREEN: "#7ee787",
  HUD_RED: "#ff6b5e",
  HUD_PANEL: "rgba(10, 18, 32, 0.55)"
};
