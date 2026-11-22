// The Velvet Vault — a midnight heist game.
// config.js: every constant the game runs on, and the three museum floors.
// One clear job: numbers and level layouts, nothing else.

// Logical playfield. The canvas is scaled to the window; screenshots are
// taken at 1280x480, so the world is laid out for that frame.
export const WORLD_W = 1280;
export const WORLD_H = 480;
export const HUD_H = 48;

// Movement and senses.
export const THIEF_SPEED = 150; // px per second, walking
export const THIEF_SNEAK = 72; // px per second, holding Shift
export const THIEF_RADIUS = 13;
export const GUARD_SPEED = 78;
export const GUARD_CHASE_SPEED = 132;
export const GUARD_RADIUS = 14;
export const CATCH_RADIUS = 22;
export const GUARD_VIEW_RANGE = 210;
export const GUARD_VIEW_HALF = 0.61; // radians, ~35 degrees each side
export const CAMERA_RANGE = 230;
export const CAMERA_HALF = 0.5;
export const SNEAK_SIGHT = 0.55; // sneaking shrinks how far a guard sees

// Alarm.
export const ALARM_MAX = 100;
export const ALARM_RISE_GUARD = 34; // per second while a guard sees the thief
export const ALARM_RISE_CAMERA = 52; // per second while a camera sees the thief
export const ALARM_FALL = 9; // per second while unseen
export const ALARM_FALL_SHADOW = 26; // per second while unseen in a shadow
export const ALARM_TRIGGER = 100; // alarm trips: every guard hunts
export const ALARM_HUNT_SECONDS = 6;

// Tools.
export const SMOKE_COUNT = 3;
export const SMOKE_RADIUS = 78;
export const SMOKE_SECONDS = 4;
export const COIN_COOLDOWN = 4;
export const COIN_COST = 25;
export const COIN_NOISE_RADIUS = 260;

// Lives and score.
export const LIVES = 3;
export const LOOT_VALUES = { cash: 50, gold: 100, gem: 150, painting: 200 };
export const VAULT_VALUE = 500;
export const LEVEL_BONUS = 300;
export const STEP = 1 / 60;

// Colours: safe cover is teal, danger is warm amber/red, loot is gold.
export const COLORS = {
  floor: '#171a2b',
  floorAlt: '#1b1f33',
  wall: '#2b3049',
  wallTop: '#565e85',
  case: '#1e4a4d',
  caseGlass: '#7fe3d0',
  shadow: '#0a0c18',
  shadowEdge: '#232a4d',
  lootGold: '#ffd34d',
  lootGem: '#ff6b9d',
  lootCash: '#7ee787',
  lootPaint: '#c9a86a',
  vault: '#b8860b',
  vaultDoor: '#8a6508',
  exit: '#2fbf71',
  thief: '#1b1b22',
  thiefTrim: '#b388ff',
  guard: '#2f3a5e',
  guardTrim: '#ffd34d',
  coneGuard: 'rgba(255, 211, 77, 0.20)',
  coneGuardEdge: 'rgba(255, 211, 77, 0.55)',
  coneCamera: 'rgba(255, 82, 82, 0.22)',
  coneCameraEdge: 'rgba(255, 82, 82, 0.6)',
  smoke: 'rgba(200, 205, 220, 0.35)',
  hudBg: '#0e1020',
  hudText: '#e8e6d9',
  alarmLow: '#7ee787',
  alarmMid: '#ffd34d',
  alarmHigh: '#ff5252',
};

// One floor: walls block movement and sight, cases block movement only,
// shadows hide the thief, loot is the score, the vault is the main target,
// the exit opens once the vault is cracked.
function floor1() {
  return {
    name: '1 — The Gallery',
    thief: { x: 70, y: 100 },
    walls: [
      { x: 400, y: 48, w: 20, h: 170 },
      { x: 400, y: 300, w: 20, h: 132 },
      { x: 820, y: 150, w: 20, h: 200 },
      { x: 820, y: 48, w: 20, h: 60 },
      { x: 1020, y: 330, w: 20, h: 102 },
    ],
    cases: [
      { x: 190, y: 190, w: 96, h: 52 },
      { x: 590, y: 120, w: 96, h: 52 },
      { x: 950, y: 300, w: 96, h: 52 },
      { x: 1080, y: 90, w: 96, h: 52 },
    ],
    shadows: [
      { x: 130, y: 350, w: 190, h: 82 },
      { x: 690, y: 360, w: 190, h: 72 },
    ],
    loot: [
      { x: 260, y: 130, kind: 'gold' },
      { x: 640, y: 210, kind: 'gem' },
      { x: 1050, y: 150, kind: 'painting' },
      { x: 520, y: 390, kind: 'cash' },
      { x: 1150, y: 400, kind: 'gold' },
    ],
    vault: { x: 1180, y: 200, w: 60, h: 90 },
    exit: { x: 36, y: 420, w: 64, h: 48 },
    guards: [
      { waypoints: [{ x: 300, y: 260 }, { x: 700, y: 260 }], speed: 78 },
      { waypoints: [{ x: 950, y: 120 }, { x: 950, y: 380 }], speed: 72 },
    ],
    cameras: [{ x: 640, y: 52, base: Math.PI / 2, sweep: 0.9, speed: 0.45 }],
  };
}

function floor2() {
  return {
    name: '2 — The Vault Hall',
    thief: { x: 70, y: 420 },
    walls: [
      { x: 300, y: 48, w: 20, h: 150 },
      { x: 300, y: 280, w: 20, h: 152 },
      { x: 620, y: 150, w: 20, h: 200 },
      { x: 620, y: 48, w: 20, h: 60 },
      { x: 940, y: 250, w: 20, h: 182 },
      { x: 940, y: 48, w: 20, h: 120 },
    ],
    cases: [
      { x: 150, y: 120, w: 96, h: 52 },
      { x: 460, y: 360, w: 96, h: 52 },
      { x: 760, y: 100, w: 96, h: 52 },
      { x: 1080, y: 380, w: 96, h: 52 },
      { x: 1080, y: 150, w: 96, h: 52 },
    ],
    shadows: [
      { x: 90, y: 300, w: 170, h: 80 },
      { x: 500, y: 90, w: 170, h: 70 },
      { x: 830, y: 350, w: 170, h: 80 },
    ],
    loot: [
      { x: 200, y: 200, kind: 'gem' },
      { x: 480, y: 160, kind: 'gold' },
      { x: 720, y: 300, kind: 'painting' },
      { x: 880, y: 120, kind: 'cash' },
      { x: 1080, y: 260, kind: 'gold' },
      { x: 1180, y: 90, kind: 'gem' },
    ],
    vault: { x: 1180, y: 200, w: 60, h: 90 },
    exit: { x: 36, y: 60, w: 64, h: 48 },
    guards: [
      { waypoints: [{ x: 200, y: 250 }, { x: 520, y: 250 }], speed: 84 },
      { waypoints: [{ x: 780, y: 400 }, { x: 780, y: 120 }], speed: 80 },
      { waypoints: [{ x: 1060, y: 320 }, { x: 1180, y: 320 }], speed: 76 },
    ],
    cameras: [
      { x: 470, y: 52, base: Math.PI / 2, sweep: 1.0, speed: 0.55 },
      { x: 1100, y: 52, base: Math.PI / 2, sweep: 0.8, speed: 0.4 },
    ],
  };
}

function floor3() {
  return {
    name: '3 — The Crown Vault',
    thief: { x: 70, y: 100 },
    walls: [
      { x: 260, y: 48, w: 20, h: 160 },
      { x: 260, y: 290, w: 20, h: 142 },
      { x: 560, y: 120, w: 20, h: 220 },
      { x: 560, y: 48, w: 20, h: 50 },
      { x: 860, y: 200, w: 20, h: 232 },
      { x: 860, y: 48, w: 20, h: 110 },
      { x: 1080, y: 300, w: 20, h: 132 },
    ],
    cases: [
      { x: 120, y: 240, w: 96, h: 52 },
      { x: 380, y: 380, w: 96, h: 52 },
      { x: 680, y: 90, w: 96, h: 52 },
      { x: 980, y: 380, w: 96, h: 52 },
      { x: 1160, y: 120, w: 96, h: 52 },
      { x: 1160, y: 400, w: 96, h: 52 },
    ],
    shadows: [
      { x: 80, y: 350, w: 160, h: 80 },
      { x: 420, y: 90, w: 160, h: 70 },
      { x: 700, y: 380, w: 160, h: 60 },
      { x: 1000, y: 180, w: 140, h: 70 },
    ],
    loot: [
      { x: 180, y: 140, kind: 'gold' },
      { x: 420, y: 240, kind: 'gem' },
      { x: 660, y: 300, kind: 'painting' },
      { x: 760, y: 160, kind: 'cash' },
      { x: 960, y: 120, kind: 'gold' },
      { x: 1000, y: 300, kind: 'gem' },
      { x: 1180, y: 240, kind: 'painting' },
      { x: 1180, y: 420, kind: 'cash' },
    ],
    vault: { x: 1180, y: 300, w: 60, h: 90 },
    exit: { x: 36, y: 420, w: 64, h: 48 },
    guards: [
      { waypoints: [{ x: 180, y: 300 }, { x: 480, y: 300 }], speed: 90 },
      { waypoints: [{ x: 700, y: 420 }, { x: 700, y: 140 }], speed: 86 },
      { waypoints: [{ x: 980, y: 260 }, { x: 1160, y: 260 }], speed: 84 },
      { waypoints: [{ x: 1120, y: 90 }, { x: 1120, y: 430 }], speed: 80 },
    ],
    cameras: [
      { x: 410, y: 52, base: Math.PI / 2, sweep: 1.0, speed: 0.6 },
      { x: 720, y: 52, base: Math.PI / 2, sweep: 0.9, speed: 0.5 },
      { x: 1140, y: 52, base: Math.PI / 2, sweep: 0.8, speed: 0.45 },
    ],
  };
}

export const FLOORS = [floor1(), floor2(), floor3()];
