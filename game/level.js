// level.js — the floor plan of the museum wing the Lantern Thief robs.
// Plain data in canvas pixels (960 x 640). The renderer draws it, the guards
// patrol it and the collision code reads the same walls and cover, so the
// three never disagree about where a wall is.

export const VIEW_W = 960;
export const VIEW_H = 640;

// Solid walls: the outer shell plus the gallery's display blocks. Every rect
// blocks movement and sight.
export const WALLS = [
  { x: 0, y: 0, w: VIEW_W, h: 24 }, // north shell
  { x: 0, y: VIEW_H - 24, w: VIEW_W, h: 24 }, // south shell
  { x: 0, y: 0, w: 24, h: VIEW_H }, // west shell
  { x: VIEW_W - 24, y: 0, w: 24, h: VIEW_H }, // east shell
  { x: 250, y: 120, w: 120, h: 28 }, // display block, top left
  { x: 590, y: 120, w: 120, h: 28 }, // display block, top right
  { x: 250, y: 480, w: 120, h: 28 }, // display block, bottom left
  { x: 590, y: 480, w: 120, h: 28 }, // display block, bottom right
  { x: 455, y: 290, w: 50, h: 60 }, // central plinth
];

// Cover: crates and pillars the thief can break a guard's line of sight with.
// They block movement and sight exactly like walls, but read as furniture.
export const COVER = [
  { x: 140, y: 300, w: 46, h: 46, kind: 'crate' },
  { x: 774, y: 300, w: 46, h: 46, kind: 'crate' },
  { x: 455, y: 118, w: 46, h: 46, kind: 'crate' },
  { x: 455, y: 452, w: 46, h: 46, kind: 'crate' },
  { x: 150, y: 505, w: 34, h: 34, kind: 'pillar' },
  { x: 776, y: 505, w: 34, h: 34, kind: 'pillar' },
];

// Everything that stops a body or a gaze, in one list.
export const BLOCKERS = [...WALLS, ...COVER];

// The three gems on show tonight. Taken gems are flagged by index in game.js.
export const GEMS = [
  { x: 880, y: 84 },
  { x: 480, y: 190 },
  { x: 84, y: 556 },
];

// The service door the thief slips in by, and the exit door to reach unseen.
export const START = { x: 64, y: 320 };
export const EXIT = { x: 864, y: 548, w: 72, h: 68 };

// Hanging lanterns: warm pools of light that sell the night mood. Purely
// decorative — safety is about cones and cover, not about standing in light.
export const LANTERNS = [
  { x: 170, y: 170, r: 95 },
  { x: 790, y: 170, r: 95 },
  { x: 170, y: 430, r: 95 },
  { x: 790, y: 430, r: 95 },
];

// Guard patrols: waypoint loops walked in order, forever. Each loop was
// paced out so its straight legs never cross a wall or a crate.
export const PATROLS = [
  [
    { x: 110, y: 90 },
    { x: 850, y: 90 },
    { x: 850, y: 205 },
    { x: 110, y: 205 },
  ],
  [
    { x: 850, y: 420 },
    { x: 520, y: 420 },
    { x: 520, y: 560 },
    { x: 850, y: 560 },
  ],
  [
    { x: 110, y: 560 },
    { x: 430, y: 560 },
    { x: 430, y: 420 },
    { x: 110, y: 420 },
  ],
];
