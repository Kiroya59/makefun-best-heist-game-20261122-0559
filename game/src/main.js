// main.js: the game loop. Wires the world, the renderer and the input
// together, and stages screenshot scenes when ?shot= is in the URL.
// One clear job: run the game.

import { STEP, WORLD_H, WORLD_W } from './config.js';
import { Input } from './input.js';
import { render, SCREEN_PLAY } from './render.js';
import { stageShot } from './shots.js';
import { PHASE_CAUGHT, PHASE_CLEAR, PHASE_OVER, PHASE_PLAY, PHASE_TITLE, PHASE_WIN, World } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');
const status = document.getElementById('status');

const world = new World(seed);
let screen = SCREEN_PLAY;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  // Setting width or height resets the drawing buffer, so only touch them
  // when the size really changed — and repaint after a change, or a late
  // resize event would leave a blank canvas behind.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
    offsetX = (canvas.width - WORLD_W * scale) / 2;
    offsetY = (canvas.height - WORLD_H * scale) / 2;
    if (shot) draw();
  }
}
window.addEventListener('resize', resize);
resize();

function toWorld(px, py) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  return {
    x: (px * dpr - offsetX) / scale,
    y: (py * dpr - offsetY) / scale,
  };
}
const input = new Input(canvas, toWorld);

function announce() {
  const lines = {
    [PHASE_TITLE]: 'The Velvet Vault. Press Enter to start the heist.',
    [PHASE_PLAY]: `${world.floor.name}. Score ${world.score}.`,
    [PHASE_CAUGHT]: 'Caught! Press Enter to keep going.',
    [PHASE_CLEAR]: 'Clean getaway! Press Enter for the next floor.',
    [PHASE_OVER]: 'Busted. Press Enter to try again.',
    [PHASE_WIN]: 'The perfect heist! Press Enter to run it again.',
  };
  status.textContent = lines[world.phase] || '';
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a0c18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  render(ctx, world, screen);
  announce();
}

if (shot) {
  // A screenshot scene: stage it once, draw one frame, and stop.
  const staged = stageShot(shot, world);
  screen = staged.screen;
  draw();
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    const pressed = input.read();
    if (pressed.enter) {
      if (world.phase === PHASE_TITLE) {
        world.startGame();
      } else if (world.phase === PHASE_CAUGHT) {
        world.phase = PHASE_PLAY;
        world.phaseTime = 0;
      } else if (world.phase === PHASE_CLEAR) {
        world.phase = PHASE_PLAY;
        world.phaseTime = 0;
      } else if (world.phase === PHASE_OVER || world.phase === PHASE_WIN) {
        world.reset();
      }
    }
    acc += dt;
    while (acc >= STEP) {
      world.step(STEP, pressed);
      acc -= STEP;
      // One-shot inputs are only for the first step of the frame.
      pressed.smoke = false;
      pressed.coin = false;
      pressed.clickX = null;
      pressed.clickY = null;
    }
    draw();
  }
  requestAnimationFrame(frame);
}
