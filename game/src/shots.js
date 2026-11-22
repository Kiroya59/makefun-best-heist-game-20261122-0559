// shots.js: the four screenshot scenes. Each one stages a real game state
// with the game's own rules and render code, so the frame is what the game
// genuinely looks like — the same seed always gives the same frame.
// One clear job: put the world where the camera wants it.

import { STEP } from './config.js';
import { PHASE_CLEAR, PHASE_PLAY, PHASE_TITLE } from './world.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// Walk the thief along waypoints, one fixed step at a time.
function walkPath(world, waypoints, seconds) {
  let target = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase !== PHASE_PLAY) break;
    const t = world.thief;
    const wp = waypoints[Math.min(target, waypoints.length - 1)];
    const dx = wp.x - t.x;
    const dy = wp.y - t.y;
    const d = Math.hypot(dx, dy);
    let input = { dx: 0, dy: 0, sneak: false, smoke: false, coin: false, coinX: 0, coinY: 0, clickX: null, clickY: null };
    if (d > 8) {
      input.dx = dx / d;
      input.dy = dy / d;
    } else if (target < waypoints.length - 1) {
      target += 1;
    }
    // Sneak through the middle stretch, where a guard cone sweeps.
    input.sneak = i > steps * 0.35 && i < steps * 0.7;
    world.step(STEP, input);
  }
}

/**
 * Stage the named scene (start, play, alarm, getaway) and return the
 * screen the renderer should draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.startGame();
    walkPath(world, [
      { x: 200, y: 130 },
      { x: 260, y: 130 },
      { x: 300, y: 200 },
      { x: 350, y: 280 },
      { x: 450, y: 320 },
      { x: 520, y: 390 },
      { x: 600, y: 300 },
      { x: 640, y: 210 },
    ], 10);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    world.startGame();
    // A real alarm moment: the thief is caught in the open, a guard has
    // seen him and the hunt is on, a smoke cloud buying seconds.
    world.thief.x = 500;
    world.thief.y = 260;
    world.thief.angle = Math.PI;
    world.alarm = 72;
    world.alarmHunt = 4;
    world.smokes.push({ x: 470, y: 300, time: 3 });
    const g = world.guards[0];
    g.x = 640;
    g.y = 260;
    g.angle = Math.PI;
    g.state = 'chase';
    g.stateTime = 0;
    const g2 = world.guards[1];
    g2.x = 950;
    g2.y = 300;
    g2.angle = Math.PI / 2;
    g2.state = 'chase';
    g2.stateTime = 0;
    world.message = 'ALARM! Every guard is hunting you.';
    world.messageTime = 99;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'getaway') {
    world.startGame();
    // The payoff: vault cracked, loot in hand, exit open, the clean
    // getaway screen over the next floor.
    for (const l of world.loot) l.taken = true;
    world.lootTaken = world.loot.length;
    world.lootValue = 650;
    world.score = 1250;
    world.vaultCracked = true;
    world.exitOpen = true;
    world.thief.x = world.floor.exit.x + 30;
    world.thief.y = world.floor.exit.y + 20;
    world.phase = PHASE_CLEAR;
    world.phaseTime = 0;
    return { screen: SCREEN_CLEAR };
  }
  // start: the title over a live room, guards already on patrol.
  world.loadLevel(0);
  world.phase = PHASE_TITLE;
  for (let i = 0; i < Math.round(3 / STEP); i += 1) {
    for (const g of world.guards) {
      const wp = g.waypoints[g.target];
      const d = Math.hypot(wp.x - g.x, wp.y - g.y);
      if (d > 1) {
        g.angle = Math.atan2(wp.y - g.y, wp.x - g.x);
        g.x += ((wp.x - g.x) / d) * g.speed * STEP;
        g.y += ((wp.y - g.y) / d) * g.speed * STEP;
      }
      if (Math.hypot(wp.x - g.x, wp.y - g.y) < 8) g.target = (g.target + 1) % g.waypoints.length;
    }
    world.time += STEP;
  }
  return { screen: SCREEN_TITLE };
}
