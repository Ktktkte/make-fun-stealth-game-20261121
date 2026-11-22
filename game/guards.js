// guards.js — the museum's night guards: how they walk their patrols, how
// their vision cones work, and how a thrown pebble pulls them off route.
// A guard is fair: his cone is honest geometry, walls and cover block his
// sight, and a thief he only half-sees raises the alarm only part-way.

const TAU = Math.PI * 2;

export function angleDelta(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Is the straight line from (x1, y1) to (x2, y2) cut by any blocker rect?
// Sampled every few pixels against slightly shrunk rects, so a gaze that
// merely grazes a crate's corner still gets through.
export function sightBlocked(x1, y1, x2, y2, blockers) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    for (const b of blockers) {
      if (px > b.x + 1 && px < b.x + b.w - 1 && py > b.y + 1 && py < b.y + b.h - 1) return true;
    }
  }
  return false;
}

// Move a circle of radius r toward (tx, ty) by at most maxStep, sliding
// along any blocker it would enter. Returns true when it arrives.
export function moveCircle(body, tx, ty, maxStep, blockers) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep) {
    body.x = tx;
    body.y = ty;
    return true;
  }
  const stepX = (dx / dist) * maxStep;
  const stepY = (dy / dist) * maxStep;
  tryAxis(body, stepX, 0, blockers);
  tryAxis(body, 0, stepY, blockers);
  return false;
}

function tryAxis(body, mx, my, blockers) {
  const nx = body.x + mx;
  const ny = body.y + my;
  for (const b of blockers) {
    const nearX = Math.max(b.x, Math.min(nx, b.x + b.w));
    const nearY = Math.max(b.y, Math.min(ny, b.y + b.h));
    if (Math.hypot(nx - nearX, ny - nearY) < body.r) return; // would sink into the blocker
  }
  body.x = nx;
  body.y = ny;
}

export class Guard {
  constructor(waypoints) {
    this.waypoints = waypoints;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.r = 14;
    const next = waypoints[1];
    this.angle = Math.atan2(next.y - this.y, next.x - this.x);
    this.wpIndex = 1; // walking toward this waypoint
    this.mode = 'patrol'; // patrol | pause | investigate | look | return
    this.pauseT = 0;
    this.scanBase = this.angle;
    this.scanT = 0;
    this.target = null; // where an investigation is headed
    this.lookT = 0;
    this.coneRange = 168;
    this.coneHalf = 0.56; // radians either side of facing, about 32 degrees
    this.speed = 56;
    this.alertness = 0; // 0 calm .. 1 has seen something, drives the cone's colour
  }

  // A pebble landed at (x, y): if it fell within earshot, go and look.
  hearPebble(x, y) {
    if (Math.hypot(x - this.x, y - this.y) <= 210) {
      this.mode = 'investigate';
      this.target = { x, y };
    }
  }

  update(dt, blockers) {
    if (this.mode === 'patrol') {
      const wp = this.waypoints[this.wpIndex];
      this.faceToward(wp.x, wp.y, dt, 3.2);
      if (moveCircle(this, wp.x, wp.y, this.speed * dt, blockers)) {
        this.mode = 'pause';
        this.pauseT = 1.15;
        this.scanBase = this.angle;
        this.scanT = 0;
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      }
    } else if (this.mode === 'pause') {
      // At a waypoint a guard stops and sweeps his lantern side to side.
      this.pauseT -= dt;
      this.scanT += dt;
      this.angle = this.scanBase + Math.sin(this.scanT * 1.7) * 0.55;
      if (this.pauseT <= 0) this.mode = 'patrol';
    } else if (this.mode === 'investigate') {
      this.faceToward(this.target.x, this.target.y, dt, 4.2);
      if (moveCircle(this, this.target.x, this.target.y, this.speed * 1.6 * dt, blockers)) {
        this.mode = 'look';
        this.lookT = 2.1;
        this.scanBase = this.angle;
        this.scanT = 0;
      }
    } else if (this.mode === 'look') {
      this.lookT -= dt;
      this.scanT += dt;
      this.angle = this.scanBase + Math.sin(this.scanT * 2.3) * 0.8;
      if (this.lookT <= 0) this.mode = 'return';
    } else if (this.mode === 'return') {
      // Head back to the nearest waypoint, then pick the patrol up again.
      let best = 0;
      let bestDist = Infinity;
      this.waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp.x - this.x, wp.y - this.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      const wp = this.waypoints[best];
      this.faceToward(wp.x, wp.y, dt, 3.6);
      if (moveCircle(this, wp.x, wp.y, this.speed * 1.25 * dt, blockers)) {
        this.wpIndex = (best + 1) % this.waypoints.length;
        this.mode = 'patrol';
      }
    }
  }

  faceToward(tx, ty, dt, rate) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    const d = angleDelta(want, this.angle);
    const turn = Math.max(-rate * dt, Math.min(rate * dt, d));
    this.angle += turn;
  }

  // How clearly this guard sees the thief right now: 0 when the thief is
  // outside the cone, behind cover, or past its range; otherwise a strength
  // that grows as the thief gets closer and nearer the cone's centre.
  // Sneaking shrinks the thief's silhouette, so the cone reaches less far.
  seeStrength(thief, blockers) {
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const dist = Math.hypot(dx, dy);
    const reach = this.coneRange * (thief.sneaking ? 0.58 : 1);
    if (dist > reach) return 0;
    const off = Math.abs(angleDelta(Math.atan2(dy, dx), this.angle));
    if (off > this.coneHalf) return 0;
    if (sightBlocked(this.x, this.y, thief.x, thief.y, blockers)) return 0;
    const centred = 1 - off / this.coneHalf; // 1 dead ahead, 0 at the rim
    const near = 1 - dist / reach; // 1 at his boots, 0 at the rim of range
    return 0.25 + 0.75 * Math.max(centred, near);
  }
}
