// world.js: the heist itself — state, rules, guards, cameras, alarm, loot.
// One clear job: simulate one museum floor. Rendering lives in render.js.

import {
  ALARM_FALL,
  ALARM_FALL_SHADOW,
  ALARM_HUNT_SECONDS,
  ALARM_MAX,
  ALARM_RISE_CAMERA,
  ALARM_RISE_GUARD,
  ALARM_TRIGGER,
  CAMERA_HALF,
  CAMERA_RANGE,
  CATCH_RADIUS,
  COIN_COST,
  COIN_COOLDOWN,
  COIN_NOISE_RADIUS,
  FLOORS,
  GUARD_CHASE_SPEED,
  GUARD_RADIUS,
  GUARD_SPEED,
  GUARD_VIEW_HALF,
  GUARD_VIEW_RANGE,
  HUD_H,
  LEVEL_BONUS,
  LIVES,
  LOOT_VALUES,
  SMOKE_COUNT,
  SMOKE_RADIUS,
  SMOKE_SECONDS,
  SNEAK_SIGHT,
  THIEF_RADIUS,
  THIEF_SNEAK,
  THIEF_SPEED,
  VAULT_VALUE,
  WORLD_H,
  WORLD_W,
} from './config.js';
import { makeRandom } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_CAUGHT = 'caught';
export const PHASE_CLEAR = 'clear';
export const PHASE_OVER = 'over';
export const PHASE_WIN = 'win';

// A point inside a rectangle (with a small margin).
function pointInRect(x, y, r, margin) {
  return x >= r.x - margin && x <= r.x + r.w + margin && y >= r.y - margin && y <= r.y + r.h + margin;
}

// Does the segment (x1,y1)-(x2,y2) cross rectangle r? Walls block sight.
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r, 0) || pointInRect(x2, y2, r, 0)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Move a circle (x,y,r) by (dx,dy), sliding along walls and cases.
function moveCircle(state, x, y, radius, dx, dy) {
  let nx = x + dx;
  let ny = y + dy;
  const solids = state.floor.walls.concat(state.floor.cases);
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(nx, s.x + s.w));
    const cy = Math.max(s.y, Math.min(ny, s.y + s.h));
    const ddx = nx - cx;
    const ddy = ny - cy;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (ddx / d) * radius;
        ny = cy + (ddy / d) * radius;
      } else {
        nx = x;
        ny = y;
      }
    }
  }
  nx = Math.max(radius + 4, Math.min(WORLD_W - radius - 4, nx));
  ny = Math.max(HUD_H + radius + 4, Math.min(WORLD_H - radius - 4, ny));
  return { x: nx, y: ny };
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.rand = makeRandom(seed);
    this.levelIndex = 0;
    this.score = 0;
    this.lives = LIVES;
    this.phase = PHASE_TITLE;
    this.phaseTime = 0;
    this.time = 0;
    this.message = '';
    this.messageTime = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.floor = FLOORS[index];
    this.thief = {
      x: this.floor.thief.x,
      y: this.floor.thief.y,
      angle: 0,
      sneaking: false,
      moving: false,
    };
    this.loot = this.floor.loot.map((l) => ({ ...l, value: LOOT_VALUES[l.kind], taken: false }));
    this.lootTaken = 0;
    this.lootValue = 0;
    this.vaultOpen = false;
    this.vaultCracked = false;
    this.guards = this.floor.guards.map((g) => ({
      x: g.waypoints[0].x,
      y: g.waypoints[0].y,
      waypoints: g.waypoints,
      target: 1,
      speed: g.speed,
      angle: 0,
      state: 'patrol', // patrol | suspicious | chase | investigate
      stateTime: 0,
      investigate: null,
      seen: 0, // seconds the guard has seen the thief
    }));
    this.cameras = this.floor.cameras.map((c) => ({
      ...c,
      angle: c.base,
      phase: this.rand() * Math.PI * 2,
    }));
    this.alarm = 0;
    this.alarmHunt = 0;
    this.smokes = [];
    this.smokeLeft = SMOKE_COUNT;
    this.coins = [];
    this.coinCooldown = 0;
    this.caughtBy = null;
    this.exitOpen = false;
  }

  inShadow(x, y) {
    for (const s of this.floor.shadows) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    }
    return false;
  }

  inSmoke(x, y) {
    for (const s of this.smokes) {
      if (dist(x, y, s.x, s.y) < SMOKE_RADIUS) return true;
    }
    return false;
  }

  // Sight from (ax,ay) to the thief: range, cone, walls, smoke, shadow.
  canSee(ax, ay, angle, half, range, sneak) {
    const d = dist(ax, ay, this.thief.x, this.thief.y);
    const sight = range * (sneak ? SNEAK_SIGHT : 1);
    if (d > sight) return false;
    if (Math.abs(angleDiff(angleTo(ax, ay, this.thief.x, this.thief.y), angle)) > half) return false;
    if (this.inSmoke(this.thief.x, this.thief.y)) return false;
    if (this.inShadow(this.thief.x, this.thief.y) && d > 90) return false;
    for (const w of this.floor.walls) {
      if (segmentHitsRect(ax, ay, this.thief.x, this.thief.y, w)) return false;
    }
    return true;
  }

  reset() {
    this.score = 0;
    this.lives = LIVES;
    this.phase = PHASE_TITLE;
    this.phaseTime = 0;
    this.time = 0;
    this.loadLevel(0);
  }

  startGame() {
    this.score = 0;
    this.lives = LIVES;
    this.loadLevel(0);
    this.phase = PHASE_PLAY;
    this.phaseTime = 0;
    this.message = 'Get the vault loot, then reach the exit.';
    this.messageTime = 4;
  }

  // One fixed step. input: {dx, dy, sneak, smoke, coin, coinX, coinY, clickX, clickY}
  step(dt, input) {
    this.time += dt;
    if (this.messageTime > 0) this.messageTime -= dt;
    if (this.coinCooldown > 0) this.coinCooldown -= dt;
    if (this.phase !== PHASE_PLAY) {
      this.phaseTime += dt;
      return 0;
    }
    this.phaseTime += dt;
    const t = this.thief;

    // --- thief movement: keys, or a click target ---
    let mx = 0;
    let my = 0;
    if (input.dx !== 0 || input.dy !== 0) {
      mx = input.dx;
      my = input.dy;
      this.clickTarget = null;
    } else if (this.clickTarget) {
      const d = dist(t.x, t.y, this.clickTarget.x, this.clickTarget.y);
      if (d < 6) {
        this.clickTarget = null;
      } else {
        mx = (this.clickTarget.x - t.x) / d;
        my = (this.clickTarget.y - t.y) / d;
      }
    }
    if (input.clickX !== undefined && input.clickX !== null) {
      this.clickTarget = { x: input.clickX, y: input.clickY };
    }
    const len = Math.hypot(mx, my);
    t.sneaking = !!input.sneak;
    t.moving = len > 0;
    if (len > 0) {
      const speed = t.sneaking ? THIEF_SNEAK : THIEF_SPEED;
      const moved = moveCircle(this, t.x, t.y, THIEF_RADIUS, (mx / len) * speed * dt, (my / len) * speed * dt);
      t.x = moved.x;
      t.y = moved.y;
      t.angle = Math.atan2(my, mx);
    }

    // --- tools ---
    if (input.smoke && this.smokeLeft > 0) {
      this.smokes.push({ x: t.x, y: t.y, time: SMOKE_SECONDS });
      this.smokeLeft -= 1;
      this.message = 'Smoke out — they cannot see through it.';
      this.messageTime = 2.5;
    }
    if (input.coin && this.coinCooldown <= 0 && this.score >= COIN_COST) {
      this.score -= COIN_COST;
      this.coins.push({ x: input.coinX, y: input.coinY, time: 3 });
      this.coinCooldown = COIN_COOLDOWN;
      for (const g of this.guards) {
        if (dist(g.x, g.y, input.coinX, input.coinY) < COIN_NOISE_RADIUS) {
          g.state = 'investigate';
          g.stateTime = 0;
          g.investigate = { x: input.coinX, y: input.coinY };
        }
      }
      this.message = 'Coin tossed — a guard went to look.';
      this.messageTime = 2.5;
    }
    for (let i = this.smokes.length - 1; i >= 0; i -= 1) {
      this.smokes[i].time -= dt;
      if (this.smokes[i].time <= 0) this.smokes.splice(i, 1);
    }
    for (let i = this.coins.length - 1; i >= 0; i -= 1) {
      this.coins[i].time -= dt;
      if (this.coins[i].time <= 0) this.coins.splice(i, 1);
    }

    // --- loot pickup ---
    for (const l of this.loot) {
      if (!l.taken && dist(t.x, t.y, l.x, l.y) < THIEF_RADIUS + 16) {
        l.taken = true;
        this.lootTaken += 1;
        this.lootValue += l.value;
        this.score += l.value;
        this.message = `Looted ${l.kind} (+${l.value}).`;
        this.messageTime = 2;
      }
    }

    // --- vault: stand at it briefly to crack it ---
    const v = this.floor.vault;
    if (!this.vaultCracked && pointInRect(t.x, t.y, { x: v.x - 26, y: v.y - 10, w: v.w + 26, h: v.h + 20 }, 0)) {
      this.vaultOpen = true;
      if (!this.vaultCracked) {
        this.vaultCracked = true;
        this.score += VAULT_VALUE;
        this.exitOpen = true;
        this.message = `Vault cracked (+${VAULT_VALUE})! Get to the exit.`;
        this.messageTime = 3.5;
      }
    } else {
      this.vaultOpen = false;
    }

    // --- exit ---
    const e = this.floor.exit;
    if (this.exitOpen && pointInRect(t.x, t.y, e, 0)) {
      this.score += LEVEL_BONUS;
      if (this.levelIndex + 1 >= FLOORS.length) {
        this.phase = PHASE_WIN;
        this.phaseTime = 0;
      } else {
        this.phase = PHASE_CLEAR;
        this.phaseTime = 0;
        this.loadLevel(this.levelIndex + 1);
        this.phase = PHASE_CLEAR;
        this.phaseTime = 0;
      }
      return 0;
    }

    // --- cameras sweep ---
    for (const c of this.cameras) {
      c.angle = c.base + Math.sin(this.time * c.speed + c.phase) * c.sweep;
    }

    // --- detection ---
    let seenByGuard = false;
    let seenByCamera = false;
    for (const c of this.cameras) {
      if (this.canSee(c.x, c.y, c.angle, CAMERA_HALF, CAMERA_RANGE, t.sneaking)) {
        seenByCamera = true;
      }
    }
    for (const g of this.guards) {
      const sees = this.canSee(g.x, g.y, g.angle, GUARD_VIEW_HALF, GUARD_VIEW_RANGE, t.sneaking);
      if (sees) {
        seenByGuard = true;
        g.seen += dt;
        g.state = 'suspicious';
        g.stateTime = 0;
      } else if (g.seen > 0) {
        g.seen = Math.max(0, g.seen - dt * 2);
      }
    }

    // --- alarm ---
    if (seenByGuard) this.alarm += ALARM_RISE_GUARD * dt;
    if (seenByCamera) this.alarm += ALARM_RISE_CAMERA * dt;
    if (!seenByGuard && !seenByCamera) {
      this.alarm -= (this.inShadow(t.x, t.y) ? ALARM_FALL_SHADOW : ALARM_FALL) * dt;
    }
    this.alarm = Math.max(0, Math.min(ALARM_MAX, this.alarm));
    if (this.alarm >= ALARM_TRIGGER && this.alarmHunt <= 0) {
      this.alarmHunt = ALARM_HUNT_SECONDS;
      this.message = 'ALARM! Every guard is hunting you.';
      this.messageTime = 3;
      for (const g of this.guards) {
        g.state = 'chase';
        g.stateTime = 0;
      }
    }
    if (this.alarmHunt > 0) this.alarmHunt -= dt;

    // --- guards move ---
    for (const g of this.guards) {
      g.stateTime += dt;
      let tx = null;
      let ty = null;
      let speed = g.speed;
      if (g.state === 'chase' || this.alarmHunt > 0) {
        tx = t.x;
        ty = t.y;
        speed = GUARD_CHASE_SPEED;
        if (this.alarmHunt <= 0 && !this.canSee(g.x, g.y, g.angle, GUARD_VIEW_HALF, GUARD_VIEW_RANGE * 1.4, false)) {
          g.state = 'patrol';
        }
      } else if (g.state === 'investigate' && g.investigate) {
        tx = g.investigate.x;
        ty = g.investigate.y;
        if (dist(g.x, g.y, tx, ty) < 16 || g.stateTime > 4) {
          g.state = 'patrol';
          g.investigate = null;
        }
      } else if (g.state === 'suspicious') {
        // Turn toward the thief, hold position, then give chase if the
        // alarm is high or the thief stays in sight.
        g.angle = angleTo(g.x, g.y, t.x, t.y);
        if (this.alarm > 55 || g.seen > 1.2) {
          g.state = 'chase';
          g.stateTime = 0;
        } else if (g.stateTime > 1.5) {
          g.state = 'patrol';
          g.seen = 0;
        }
        continue;
      } else {
        const wp = g.waypoints[g.target];
        tx = wp.x;
        ty = wp.y;
        if (dist(g.x, g.y, tx, ty) < 8) {
          g.target = (g.target + 1) % g.waypoints.length;
        }
      }
      if (tx !== null) {
        const d = dist(g.x, g.y, tx, ty);
        if (d > 1) {
          const moved = moveCircle(this, g.x, g.y, GUARD_RADIUS, ((tx - g.x) / d) * speed * dt, ((ty - g.y) / d) * speed * dt);
          g.angle = Math.atan2(ty - g.y, tx - g.x);
          g.x = moved.x;
          g.y = moved.y;
        }
      }
      // Caught?
      if (dist(g.x, g.y, t.x, t.y) < CATCH_RADIUS) {
        this.caughtBy = 'guard';
        this.lives -= 1;
        if (this.lives <= 0) {
          this.phase = PHASE_OVER;
          this.phaseTime = 0;
        } else {
          this.phase = PHASE_CAUGHT;
          this.phaseTime = 0;
          this.alarm = 30;
          this.alarmHunt = 0;
          this.thief.x = this.floor.thief.x;
          this.thief.y = this.floor.thief.y;
          this.clickTarget = null;
          for (const gg of this.guards) {
            gg.state = 'patrol';
            gg.seen = 0;
            gg.x = gg.waypoints[0].x;
            gg.y = gg.waypoints[0].y;
            gg.target = 1;
          }
          this.message = `Caught! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left.`;
          this.messageTime = 3;
        }
        return 0;
      }
    }
    return 0;
  }
}
