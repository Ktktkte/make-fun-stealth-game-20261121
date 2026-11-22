// render.js — everything Lantern Thief draws, and nothing else: the night
// museum floor, lantern light, walls and cover, the guards and their vision
// cones, the thief, the gems, the exit, and the HUD. Pure canvas 2D; the
// palette is deep blue night against warm lantern amber, so what is safe
// (shadow, cover, the thief's teal) and what is danger (a cone, the alarm)
// read at a glance even in a small screenshot.

import { VIEW_W, VIEW_H, WALLS, COVER, GEMS, EXIT, LANTERNS } from './level.js';

const FLOOR = '#141f38';
const WALL_FILL = '#2e4066';
const WALL_EDGE = '#4a639b';

export function drawScene(g, world) {
  g.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(g);
  drawLanternPools(g);
  drawExit(g, world);
  drawGems(g, world);
  drawWallsAndCover(g);
  drawVisionCones(g, world);
  drawPebble(g, world);
  for (const guard of world.guards) drawGuard(g, guard);
  if (world.mode !== 'won') drawThief(g, world.thief);
  drawHud(g, world);
  if (world.flashT > 0) drawAlarmFlash(g, world);
  if (world.mode === 'title') drawTitle(g);
  if (world.mode === 'caught') drawCaught(g, world);
  if (world.mode === 'won') drawWon(g, world);
  if (world.hintT > 0 && world.mode === 'playing') drawHint(g, world);
}

function drawFloor(g) {
  g.fillStyle = FLOOR;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stone tiles.
  g.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 40; x < VIEW_W; x += 40) {
    g.moveTo(x, 0);
    g.lineTo(x, VIEW_H);
  }
  for (let y = 40; y < VIEW_H; y += 40) {
    g.moveTo(0, y);
    g.lineTo(VIEW_W, y);
  }
  g.stroke();
  // The great hall's carpet runner, west door to east wall.
  g.fillStyle = '#38202f';
  g.fillRect(24, 296, VIEW_W - 48, 48);
  g.strokeStyle = '#5a3550';
  g.lineWidth = 2;
  g.strokeRect(24, 296, VIEW_W - 48, 48);
}

function drawLanternPools(g) {
  for (const lamp of LANTERNS) {
    const grad = g.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
    grad.addColorStop(0, 'rgba(255, 196, 96, 0.20)');
    grad.addColorStop(1, 'rgba(255, 196, 96, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffcf7d';
    g.beginPath();
    g.arc(lamp.x, lamp.y, 3.5, 0, Math.PI * 2);
    g.fill();
  }
}

function drawExit(g, world) {
  const open = world.gemsTaken.every(Boolean);
  g.fillStyle = open ? 'rgba(64, 220, 140, 0.30)' : 'rgba(64, 220, 140, 0.10)';
  g.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  g.strokeStyle = open ? '#46e08c' : '#2c7a52';
  g.lineWidth = 3;
  g.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  g.fillStyle = open ? '#a9ffd2' : '#5f9c7d';
  g.font = 'bold 15px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5);
}

function drawGems(g, world) {
  GEMS.forEach((gem, i) => {
    const taken = world.gemsTaken[i];
    // The velvet cushion stays behind either way.
    g.fillStyle = '#4a1430';
    g.beginPath();
    g.ellipse(gem.x, gem.y + 8, 15, 6, 0, 0, Math.PI * 2);
    g.fill();
    if (taken) return;
    const bob = Math.sin(world.timeMs / 380 + i * 2.1) * 2.5;
    g.save();
    g.translate(gem.x, gem.y + bob);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#5ff2e0';
    g.fillRect(-8, -8, 16, 16);
    g.fillStyle = '#c9fff6';
    g.fillRect(-4.5, -4.5, 9, 9);
    g.restore();
  });
}

function drawWallsAndCover(g) {
  for (const wall of WALLS) {
    g.fillStyle = WALL_FILL;
    g.fillRect(wall.x, wall.y, wall.w, wall.h);
    g.fillStyle = WALL_EDGE;
    g.fillRect(wall.x, wall.y, wall.w, 3);
  }
  for (const item of COVER) {
    if (item.kind === 'crate') drawCrate(g, item);
    else drawPillar(g, item);
  }
}

function drawCrate(g, item) {
  g.fillStyle = '#6e5130';
  g.fillRect(item.x, item.y, item.w, item.h);
  g.strokeStyle = '#4a3419';
  g.lineWidth = 3;
  g.strokeRect(item.x + 1.5, item.y + 1.5, item.w - 3, item.h - 3);
  g.beginPath();
  g.moveTo(item.x + 4, item.y + 4);
  g.lineTo(item.x + item.w - 4, item.y + item.h - 4);
  g.moveTo(item.x + item.w - 4, item.y + 4);
  g.lineTo(item.x + 4, item.y + item.h - 4);
  g.stroke();
}

function drawPillar(g, item) {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.h / 2;
  g.fillStyle = '#5a6a8c';
  g.beginPath();
  g.arc(cx, cy, item.w / 2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#8595b8';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(cx, cy, item.w / 2 - 4, 0, Math.PI * 2);
  g.stroke();
}

function drawVisionCones(g, world) {
  for (const guard of world.guards) {
    const hot = guard.alertness;
    const inner = hot > 0.35 ? 'rgba(255, 92, 60, 0.34)' : 'rgba(255, 214, 120, 0.30)';
    const outer = hot > 0.35 ? 'rgba(255, 92, 60, 0.02)' : 'rgba(255, 214, 120, 0.02)';
    const grad = g.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, guard.coneRange);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(guard.x, guard.y);
    g.arc(guard.x, guard.y, guard.coneRange, guard.angle - guard.coneHalf, guard.angle + guard.coneHalf);
    g.closePath();
    g.fill();
  }
}

function drawGuard(g, guard) {
  // Lantern carried at the cone's root.
  g.fillStyle = '#ffd98c';
  g.beginPath();
  g.arc(guard.x, guard.y, 4, 0, Math.PI * 2);
  g.fill();
  // Body: a maroon night-watch uniform, easy to spot against the floor.
  g.fillStyle = '#8c2438';
  g.beginPath();
  g.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5c1424';
  g.lineWidth = 2.5;
  g.stroke();
  // Cap brim pointing the way he faces.
  const fx = guard.x + Math.cos(guard.angle) * guard.r * 0.8;
  const fy = guard.y + Math.sin(guard.angle) * guard.r * 0.8;
  g.fillStyle = '#e8b13c';
  g.beginPath();
  g.arc(fx, fy, 5, 0, Math.PI * 2);
  g.fill();
  if (guard.alertness > 0.45) {
    g.fillStyle = '#ffdf6b';
    g.font = 'bold 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('!', guard.x, guard.y - guard.r - 8);
  }
}

function drawThief(g, thief) {
  if (thief.sneaking) {
    // A dashed ring shows the smaller silhouette sneaking buys.
    g.strokeStyle = 'rgba(126, 240, 214, 0.5)';
    g.lineWidth = 1.5;
    g.setLineDash([4, 4]);
    g.beginPath();
    g.arc(thief.x, thief.y, thief.r + 5, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  g.fillStyle = '#1f8a70';
  g.beginPath();
  g.arc(thief.x, thief.y, thief.r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#0e4d3d';
  g.lineWidth = 2.5;
  g.stroke();
  // Hood point toward travel, and the little stolen lantern glow he carries.
  const fx = thief.x + Math.cos(thief.faceAngle) * thief.r * 0.75;
  const fy = thief.y + Math.sin(thief.faceAngle) * thief.r * 0.75;
  g.fillStyle = '#ffe9a8';
  g.beginPath();
  g.arc(fx, fy, 3.5, 0, Math.PI * 2);
  g.fill();
}

function drawPebble(g, world) {
  const shot = world.pebbleAnim;
  if (shot) {
    const t = shot.t;
    const x = shot.x0 + (shot.x1 - shot.x0) * t;
    const y = shot.y0 + (shot.y1 - shot.y0) * t - Math.sin(t * Math.PI) * 26;
    g.fillStyle = '#cfd6e4';
    g.beginPath();
    g.arc(x, y, 4, 0, Math.PI * 2);
    g.fill();
  }
  const ripple = world.ripple;
  if (ripple) {
    g.strokeStyle = `rgba(230, 238, 255, ${Math.max(0, 0.7 - ripple.t * 0.8)})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(ripple.x, ripple.y, 6 + ripple.t * 42, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawHud(g, world) {
  g.fillStyle = 'rgba(7, 11, 22, 0.78)';
  g.fillRect(0, 0, VIEW_W, 40);
  g.textAlign = 'left';
  g.font = 'bold 15px system-ui, sans-serif';
  const got = world.gemsTaken.filter(Boolean).length;
  g.fillStyle = '#5ff2e0';
  g.fillText(`◆ GEMS ${got} / 3`, 16, 26);
  // Alarm meter: fills amber, then red, as the guards' certainty grows.
  g.fillStyle = '#e8ecf6';
  g.fillText('ALARM', 150, 26);
  g.fillStyle = '#232c47';
  g.fillRect(218, 13, 170, 13);
  const alarmW = (Math.max(0, Math.min(100, world.alarm)) / 100) * 170;
  g.fillStyle = world.alarm > 66 ? '#ff5c3c' : world.alarm > 33 ? '#ffb03a' : '#7ee787';
  g.fillRect(218, 13, alarmW, 13);
  // Strikes: three lantern pips, one snuffed per full alarm.
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i < world.strikes ? '#ff5c3c' : '#3d4a6e';
    g.beginPath();
    g.arc(424 + i * 22, 20, 7, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#e8ecf6';
  g.fillText(`PEBBLES ${world.pebblesLeft}`, 520, 26);
  g.fillStyle = world.thief.sneaking && world.mode === 'playing' ? '#7ef0d6' : '#8fa0c4';
  g.fillText(world.thief.sneaking && world.mode === 'playing' ? 'SNEAKING' : '', 660, 26);
  g.fillStyle = '#e8ecf6';
  g.textAlign = 'right';
  g.fillText(formatTime(world.timeMs), VIEW_W - 16, 26);
  g.textAlign = 'left';
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function drawAlarmFlash(g, world) {
  g.fillStyle = `rgba(255, 60, 40, ${Math.min(0.28, world.flashT * 0.5)})`;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
}

function veil(g, alpha) {
  g.fillStyle = `rgba(5, 8, 17, ${alpha})`;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(g) {
  veil(g, 0.62);
  g.textAlign = 'center';
  g.fillStyle = '#ffcf7d';
  g.font = 'bold 54px system-ui, sans-serif';
  g.fillText('LANTERN THIEF', VIEW_W / 2, 218);
  g.fillStyle = '#e8ecf6';
  g.font = '19px system-ui, sans-serif';
  g.fillText('One thief. Three gems. A museum that never quite sleeps.', VIEW_W / 2, 262);
  g.font = '16px system-ui, sans-serif';
  g.fillStyle = '#aebad6';
  g.fillText('WASD or arrow keys to move — hold Shift to sneak, and a guard’s cone reaches less far.', VIEW_W / 2, 316);
  g.fillText('Click to throw a pebble and pull a guard off his patrol. Crates and pillars break his sight.', VIEW_W / 2, 344);
  g.fillText('Fill the alarm three times and the night is over. Take all three gems, then reach the EXIT unseen.', VIEW_W / 2, 372);
  g.fillStyle = '#7ef0d6';
  g.font = 'bold 19px system-ui, sans-serif';
  g.fillText('Click or press Enter to begin', VIEW_W / 2, 428);
  g.textAlign = 'left';
}

function drawCaught(g, world) {
  veil(g, 0.66);
  g.textAlign = 'center';
  g.fillStyle = '#ff6b52';
  g.font = 'bold 52px system-ui, sans-serif';
  g.fillText('CAUGHT', VIEW_W / 2, 250);
  g.fillStyle = '#e8ecf6';
  g.font = '18px system-ui, sans-serif';
  g.fillText(`The lanterns saw too much. You held ${world.gemsTaken.filter(Boolean).length} of 3 gems after ${formatTime(world.timeMs)}.`, VIEW_W / 2, 300);
  g.fillStyle = '#7ef0d6';
  g.font = 'bold 18px system-ui, sans-serif';
  g.fillText('Press R or click to try the night again', VIEW_W / 2, 352);
  g.textAlign = 'left';
}

function drawWon(g, world) {
  veil(g, 0.6);
  g.textAlign = 'center';
  g.fillStyle = '#7ef0d6';
  g.font = 'bold 44px system-ui, sans-serif';
  g.fillText('UNSEEN. UNHEARD. GONE.', VIEW_W / 2, 246);
  g.fillStyle = '#e8ecf6';
  g.font = '19px system-ui, sans-serif';
  g.fillText(`All three gems, out the door in ${formatTime(world.timeMs)} with ${world.strikes} alarm strike${world.strikes === 1 ? '' : 's'}.`, VIEW_W / 2, 298);
  g.fillStyle = '#ffcf7d';
  g.font = 'bold 18px system-ui, sans-serif';
  g.fillText('Press R or click to steal again', VIEW_W / 2, 350);
  g.textAlign = 'left';
}

function drawHint(g, world) {
  g.fillStyle = 'rgba(7, 11, 22, 0.8)';
  const w = 430;
  g.fillRect((VIEW_W - w) / 2, VIEW_H - 66, w, 34);
  g.fillStyle = '#ffd98c';
  g.font = '15px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(world.hint, VIEW_W / 2, VIEW_H - 44);
  g.textAlign = 'left';
}
