// game.js — Lantern Thief itself: the loop, the thief's movement, gem
// pickups, the alarm that three full strikes end, pebble throws, and the
// title / caught / won flow. The guards live in guards.js, the map in
// level.js, the sounds in audio.js and every drawn pixel in render.js.

import { BLOCKERS, GEMS, START, EXIT, PATROLS } from './level.js';
import { Guard, moveCircle } from './guards.js';
import { SoundBank } from './audio.js';
import { drawScene } from './render.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const sound = new SoundBank();

const world = {
  mode: 'title', // title | playing | caught | won
  thief: null,
  guards: [],
  gemsTaken: [false, false, false],
  alarm: 0,
  strikes: 0,
  pebblesLeft: 3,
  pebbleAnim: null,
  ripple: null,
  timeMs: 0,
  flashT: 0,
  hint: '',
  hintT: 0,
  blipT: 0,
};

const keys = new Set();
let frozen = false; // screenshot scenes hold one composed frame

// A small handle for automated play-tests: the live world, nothing more.
window.LanternThief = world;

function resetRun() {
  world.thief = {
    x: START.x,
    y: START.y,
    r: 13,
    sneaking: false,
    faceAngle: 0,
    stepT: 0,
  };
  world.guards = PATROLS.map((loop) => new Guard(loop));
  world.gemsTaken = [false, false, false];
  world.alarm = 0;
  world.strikes = 0;
  world.pebblesLeft = 3;
  world.pebbleAnim = null;
  world.ripple = null;
  world.timeMs = 0;
  world.flashT = 0;
  world.hint = '';
  world.hintT = 0;
  world.blipT = 0;
}

function startRun() {
  resetRun();
  world.mode = 'playing';
}

// ---------------------------------------------------------------- input

const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (GAME_KEYS.includes(key)) event.preventDefault();
  sound.unlock();
  if (key === 'enter') {
    if (world.mode === 'title' || world.mode === 'caught' || world.mode === 'won') startRun();
    return;
  }
  if (key === 'r') {
    if (world.mode !== 'title') startRun();
    return;
  }
  keys.add(key);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener('click', (event) => {
  sound.unlock();
  if (world.mode !== 'playing') {
    startRun();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  throwPebble(x, y);
});

function throwPebble(x, y) {
  if (world.pebblesLeft <= 0 || world.pebbleAnim) {
    if (world.pebblesLeft <= 0) showHint('No pebbles left — your feet will have to do.');
    return;
  }
  const dist = Math.hypot(x - world.thief.x, y - world.thief.y);
  if (dist > 300) {
    showHint('Too far to throw. Pebbles carry about a room’s width.');
    return;
  }
  world.pebbleAnim = { x0: world.thief.x, y0: world.thief.y, x1: x, y1: y, t: 0 };
}

function showHint(text) {
  world.hint = text;
  world.hintT = 2.6;
}

// ---------------------------------------------------------------- update

function update(dt) {
  if (world.mode !== 'playing' || frozen) return;
  world.timeMs += dt * 1000;
  if (world.flashT > 0) world.flashT -= dt;
  if (world.hintT > 0) world.hintT -= dt;

  updateThief(dt);
  for (const guard of world.guards) guard.update(dt, BLOCKERS);
  updatePebble(dt);
  updateDetection(dt);
  updateGemsAndExit();
}

function updateThief(dt) {
  const thief = world.thief;
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  thief.sneaking = keys.has('shift');
  if (dx === 0 && dy === 0) return;
  const len = Math.hypot(dx, dy);
  const speed = thief.sneaking ? 74 : 134;
  thief.faceAngle = Math.atan2(dy, dx);
  const step = speed * dt;
  // Aim twice as far as this frame's step: moveCircle then walks the step
  // axis by axis against the blockers instead of snapping to the target.
  moveCircle(thief, thief.x + (dx / len) * step * 2, thief.y + (dy / len) * step * 2, step, BLOCKERS);
  // Footfalls: quieter and slower while sneaking, and a guard's earshot is
  // only flavour — pebbles are what truly pull a guard off his route.
  thief.stepT -= dt;
  if (thief.stepT <= 0) {
    sound.step(thief.sneaking);
    thief.stepT = thief.sneaking ? 0.46 : 0.31;
  }
}

function updatePebble(dt) {
  const shot = world.pebbleAnim;
  if (shot) {
    shot.t += dt / 0.35;
    if (shot.t >= 1) {
      world.pebbleAnim = null;
      world.pebblesLeft -= 1;
      world.ripple = { x: shot.x1, y: shot.y1, t: 0 };
      sound.pebbleTick();
      for (const guard of world.guards) guard.hearPebble(shot.x1, shot.y1);
    }
  }
  if (world.ripple) {
    world.ripple.t += dt;
    if (world.ripple.t > 0.9) world.ripple = null;
  }
}

function updateDetection(dt) {
  let strongest = 0;
  for (const guard of world.guards) {
    const seen = guard.seeStrength(world.thief, BLOCKERS);
    guard.alertness += (seen - guard.alertness) * Math.min(1, dt * 5);
    if (seen > strongest) strongest = seen;
  }
  if (strongest > 0) {
    world.alarm = Math.min(100, world.alarm + strongest * 46 * dt);
    world.blipT -= dt;
    if (world.blipT <= 0) {
      sound.alarmBlip();
      world.blipT = 0.5;
    }
  } else {
    world.alarm = Math.max(0, world.alarm - 16 * dt);
  }
  if (world.alarm >= 100) {
    world.strikes += 1;
    world.alarm = 0;
    world.flashT = 0.7;
    for (const guard of world.guards) guard.alertness = 0;
    if (world.strikes >= 3) {
      world.mode = 'caught';
      sound.caughtSting();
    } else {
      showHint(`Alarm strike ${world.strikes} of 3 — break their sight and let it cool.`);
      sound.alarmBlip();
    }
  }
}

function updateGemsAndExit() {
  const thief = world.thief;
  GEMS.forEach((gem, i) => {
    if (!world.gemsTaken[i] && Math.hypot(gem.x - thief.x, gem.y - thief.y) < 24) {
      world.gemsTaken[i] = true;
      sound.chime();
      const left = world.gemsTaken.filter((t) => !t).length;
      showHint(left === 0 ? 'Every gem is yours. Now the EXIT, unseen.' : `Gem taken — ${left} to go.`);
    }
  });
  const inExit =
    thief.x > EXIT.x && thief.x < EXIT.x + EXIT.w && thief.y > EXIT.y && thief.y < EXIT.y + EXIT.h;
  if (inExit) {
    if (world.gemsTaken.every(Boolean)) {
      world.mode = 'won';
      sound.winChime();
    } else if (world.hintT <= 0) {
      showHint('The door is watched — take all 3 gems first.');
    }
  }
}

// ---------------------------------------------------------------- scenes
// Posed frames of the game's own rendering, used to take the entry's
// screenshots: open index.html#shot-cover (etc.) and the game composes that
// moment and holds it. Ordinary play never takes this path.

function poseScene(name) {
  resetRun();
  world.mode = 'playing';
  frozen = true;
  const [g0, g1, g2] = world.guards;
  if (name === 'shot-cover') {
    g0.x = 400; g0.y = 110; g0.angle = 0.9; g0.alertness = 0.5;
    world.thief.x = 520; world.thief.y = 215; world.thief.faceAngle = -0.6;
    world.alarm = 30;
    world.timeMs = 42000;
  } else if (name === 'shot-sneak') {
    g1.x = 700; g1.y = 470; g1.angle = Math.PI; g1.alertness = 0.3;
    world.thief.x = 596; world.thief.y = 478; world.thief.sneaking = true; world.thief.faceAngle = Math.PI;
    world.gemsTaken[1] = true;
    world.pebblesLeft = 2;
    world.alarm = 12;
    world.timeMs = 76000;
  } else if (name === 'shot-alarm') {
    g0.x = 350; g0.y = 205; g0.angle = 0; g0.alertness = 1;
    world.thief.x = 452; world.thief.y = 205; world.thief.faceAngle = Math.PI;
    world.alarm = 88;
    world.strikes = 1;
    world.timeMs = 58000;
  } else if (name === 'shot-win') {
    world.mode = 'won';
    world.gemsTaken = [true, true, true];
    world.timeMs = 97000;
    world.strikes = 1;
  } else {
    frozen = false;
    world.mode = 'title';
  }
}

// ---------------------------------------------------------------- loop

resetRun();
const scene = window.location.hash.replace('#', '');
if (scene.startsWith('shot-')) poseScene(scene);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawScene(g, world);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
