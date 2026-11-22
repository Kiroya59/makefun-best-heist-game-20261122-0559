// render.js: everything the player sees, drawn on one canvas.
// One clear job: turn a World into pixels — floor, cones, loot, HUD, screens.

import {
  COLORS,
  GUARD_VIEW_HALF,
  GUARD_VIEW_RANGE,
  CAMERA_HALF,
  CAMERA_RANGE,
  HUD_H,
  SMOKE_RADIUS,
  WORLD_H,
  WORLD_W,
} from './config.js';
import { PHASE_CAUGHT, PHASE_CLEAR, PHASE_OVER, PHASE_TITLE, PHASE_WIN } from './world.js';

function drawCone(ctx, x, y, angle, half, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRect(ctx, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

function drawLoot(ctx, l, time) {
  const bob = Math.sin(time * 2.4 + l.x * 0.01) * 2;
  const y = l.y + bob;
  ctx.save();
  ctx.shadowColor = l.kind === 'gem' ? COLORS.lootGem : COLORS.lootGold;
  ctx.shadowBlur = 12;
  if (l.kind === 'gold') {
    ctx.fillStyle = COLORS.lootGold;
    ctx.beginPath();
    ctx.moveTo(l.x - 11, y + 7);
    ctx.lineTo(l.x - 7, y - 7);
    ctx.lineTo(l.x + 7, y - 7);
    ctx.lineTo(l.x + 11, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(l.x - 6, y - 5, 12, 3);
  } else if (l.kind === 'gem') {
    ctx.fillStyle = COLORS.lootGem;
    ctx.beginPath();
    ctx.moveTo(l.x, y - 10);
    ctx.lineTo(l.x + 9, y);
    ctx.lineTo(l.x, y + 10);
    ctx.lineTo(l.x - 9, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd7e6';
    ctx.beginPath();
    ctx.moveTo(l.x, y - 10);
    ctx.lineTo(l.x + 9, y);
    ctx.lineTo(l.x - 9, y);
    ctx.closePath();
    ctx.fill();
  } else if (l.kind === 'painting') {
    ctx.fillStyle = '#3a2c14';
    ctx.fillRect(l.x - 14, y - 10, 28, 20);
    ctx.fillStyle = COLORS.lootPaint;
    ctx.fillRect(l.x - 11, y - 7, 22, 14);
    ctx.fillStyle = '#7a5c2e';
    ctx.fillRect(l.x - 11, y - 7, 22, 4);
    ctx.fillStyle = '#e8d5a8';
    ctx.beginPath();
    ctx.arc(l.x + 4, y, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = COLORS.lootCash;
    ctx.fillRect(l.x - 11, y - 7, 22, 14);
    ctx.fillStyle = '#1d5c2e';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', l.x, y + 1);
  }
  ctx.restore();
}

function drawThief(ctx, t, time) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle);
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and mask.
  ctx.fillStyle = COLORS.thiefTrim;
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(2, -7);
  ctx.lineTo(2, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e6d9';
  ctx.beginPath();
  ctx.arc(5, -4, 2, 0, Math.PI * 2);
  ctx.arc(5, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (t.sneaking) {
    ctx.save();
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 19 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawGuard(ctx, g, time) {
  drawCone(ctx, g.x, g.y, g.angle, GUARD_VIEW_HALF, GUARD_VIEW_RANGE, COLORS.coneGuard, COLORS.coneGuardEdge);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.fillStyle = g.state === 'chase' ? '#ff5252' : COLORS.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.guardTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.guardTrim;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(2, -7);
  ctx.lineTo(2, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e1020';
  ctx.beginPath();
  ctx.arc(5, -4, 2, 0, Math.PI * 2);
  ctx.arc(5, 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (g.state === 'suspicious' || g.state === 'chase') {
    ctx.save();
    ctx.fillStyle = g.state === 'chase' ? '#ff5252' : COLORS.lootGold;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - 20);
    ctx.restore();
  }
}

function drawCamera(ctx, c) {
  drawCone(ctx, c.x, c.y, c.angle, CAMERA_HALF, CAMERA_RANGE, COLORS.coneCamera, COLORS.coneCameraEdge);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = '#8a8f9e';
  ctx.fillRect(-6, -6, 14, 12);
  ctx.fillStyle = '#ff5252';
  ctx.beginPath();
  ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, WORLD_W, HUD_H);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.floor.name, 14, HUD_H / 2);
  ctx.fillText(`SCORE ${world.score}`, 250, HUD_H / 2);
  ctx.fillText(`LOOT ${world.lootTaken}/${world.loot.length}  $${world.lootValue}`, 430, HUD_H / 2);
  // Lives as masks.
  for (let i = 0; i < world.lives; i += 1) {
    ctx.fillStyle = COLORS.thiefTrim;
    ctx.beginPath();
    ctx.arc(660 + i * 24, HUD_H / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1020';
    ctx.fillRect(660 + i * 24 - 5, HUD_H / 2 - 2, 4, 4);
    ctx.fillRect(660 + i * 24 + 1, HUD_H / 2 - 2, 4, 4);
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`SMOKE ${world.smokeLeft}`, 750, HUD_H / 2);
  // Alarm meter.
  const ax = 880;
  const aw = 300;
  ctx.fillStyle = '#22263a';
  ctx.fillRect(ax, HUD_H / 2 - 9, aw, 18);
  const frac = world.alarm / 100;
  ctx.fillStyle = frac < 0.4 ? COLORS.alarmLow : frac < 0.75 ? COLORS.alarmMid : COLORS.alarmHigh;
  ctx.fillRect(ax, HUD_H / 2 - 9, aw * frac, 18);
  ctx.strokeStyle = '#565e85';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax, HUD_H / 2 - 9, aw, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(world.alarmHunt > 0 ? 'ALARM!' : `ALARM ${Math.round(world.alarm)}%`, ax + aw / 2, HUD_H / 2);
  ctx.textAlign = 'left';
}

function drawMessage(ctx, world) {
  if (world.messageTime <= 0 || !world.message) return;
  ctx.save();
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(world.message).width + 28;
  ctx.fillStyle = 'rgba(14, 16, 32, 0.85)';
  ctx.fillRect((WORLD_W - w) / 2, WORLD_H - 40, w, 28);
  ctx.strokeStyle = '#565e85';
  ctx.lineWidth = 1;
  ctx.strokeRect((WORLD_W - w) / 2, WORLD_H - 40, w, 28);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(world.message, WORLD_W / 2, WORLD_H - 26);
  ctx.restore();
}

function drawScreen(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(10, 12, 24, 0.72)';
  ctx.fillRect(0, HUD_H, WORLD_W, WORLD_H - HUD_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 44px monospace';
  ctx.fillText(title, WORLD_W / 2, 170);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '16px monospace';
  lines.forEach((line, i) => {
    ctx.fillText(line, WORLD_W / 2, 225 + i * 26);
  });
  if (hint) {
    ctx.fillStyle = COLORS.thiefTrim;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(hint, WORLD_W / 2, 225 + lines.length * 26 + 22);
  }
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

export function render(ctx, world, screen) {
  const time = world.time;
  // Floor.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, HUD_H, WORLD_W, WORLD_H - HUD_H);
  ctx.fillStyle = COLORS.floorAlt;
  for (let x = 0; x < WORLD_W; x += 80) {
    for (let y = HUD_H; y < WORLD_H; y += 80) {
      if (((x + y) / 80) % 2 === 0) ctx.fillRect(x, y, 80, 80);
    }
  }
  ctx.strokeStyle = 'rgba(86, 94, 133, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= WORLD_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }
  // Shadows.
  for (const s of world.floor.shadows) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = COLORS.shadowEdge;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232, 230, 217, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SHADOW — hidden here', s.x + 8, s.y + 6);
  }
  // Exit.
  const e = world.floor.exit;
  ctx.fillStyle = world.exitOpen ? COLORS.exit : '#1d5c2e';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = '#7ee787';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#e8f5e9';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.exitOpen ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2);
  // Vault.
  const v = world.floor.vault;
  drawRect(ctx, v, COLORS.vaultDoor, COLORS.vault);
  ctx.fillStyle = COLORS.lootGold;
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6508';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(world.vaultCracked ? 'VAULT OPEN' : 'VAULT', v.x + v.w / 2, v.y - 10);
  // Cases.
  for (const c of world.floor.cases) {
    drawRect(ctx, c, COLORS.case, COLORS.caseGlass);
    ctx.fillStyle = 'rgba(127, 227, 208, 0.25)';
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, 10);
  }
  // Walls.
  for (const w of world.floor.walls) {
    drawRect(ctx, w, COLORS.wall, COLORS.wallTop);
  }
  // Loot.
  for (const l of world.loot) {
    if (!l.taken) drawLoot(ctx, l, time);
  }
  // Smoke.
  for (const s of world.smokes) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SMOKE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  // Coins.
  for (const c of world.coins) {
    ctx.strokeStyle = COLORS.lootGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6 + (3 - c.time) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.lootGold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cameras under guards, guards over cones.
  for (const c of world.cameras) drawCamera(ctx, c);
  for (const g of world.guards) drawGuard(ctx, g, time);
  drawThief(ctx, world.thief, time);
  // HUD always on top.
  drawHud(ctx, world);
  drawMessage(ctx, world);

  if (screen === SCREEN_TITLE || world.phase === PHASE_TITLE) {
    drawScreen(
      ctx,
      'THE VELVET VAULT',
      [
        'A midnight heist in three museum floors.',
        'Sneak past guards and cameras, crack the vault, grab the loot,',
        'and reach the exit before the alarm catches you.',
        '',
        'WASD / Arrows — move    Shift — sneak    Click — walk there',
        'Q — smoke bomb (3)    E — toss a coin to distract (-25 pts)',
        'Hide in shadows. Watch the cones. Mind the alarm meter.',
      ],
      'Press ENTER to start the heist',
    );
  } else if (screen === SCREEN_OVER || world.phase === PHASE_OVER) {
    drawScreen(ctx, 'BUSTED', [`The museum kept its gold. Final score: ${world.score}.`, `Loot taken: $${world.lootValue} across ${world.levelIndex + 1} floors.`], 'Press ENTER to try again');
  } else if (screen === SCREEN_CLEAR || world.phase === PHASE_CLEAR) {
    drawScreen(ctx, 'CLEAN GETAWAY', [`Floor cleared! Bonus +${300}.`, `Score: ${world.score} — the next floor is harder.`], 'Press ENTER for the next floor');
  } else if (screen === SCREEN_WIN || world.phase === PHASE_WIN) {
    drawScreen(ctx, 'THE PERFECT HEIST', [`Every vault cracked. Every guard outwitted.`, `Final score: ${world.score} — loot $${world.lootValue}.`], 'Press ENTER to run it again');
  } else if (world.phase === PHASE_CAUGHT) {
    drawScreen(ctx, 'CAUGHT!', [`A guard grabbed you. ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`, 'You wake up at the entrance — the loot you took stays taken.'], 'Press ENTER to keep going');
  }
}
