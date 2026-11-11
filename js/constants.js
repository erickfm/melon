// World is a fixed 400×760 unit space, letterboxed to fit the screen.
export const WORLD_W = 400;
export const WORLD_H = 760;

// Inner edges of the jar (items collide with these).
export const JAR = { left: 24, right: 376, top: 195, bottom: 690 };
export const DANGER_Y = 222;     // an item resting above this line too long ends the run
export const DROP_Y = 140;       // where the held item hangs

export const STEP = 1 / 60;      // fixed simulation step
export const SUBSTEPS = 8;
export const GRAVITY = 1900;     // units/s²

export const DROP_COOLDOWN = 0.45;
export const SPAWN_WEIGHTS = [30, 26, 20, 14, 10];  // odds for tiers 0–4
export const OVERFLOW_GRACE = 1.0;   // seconds a fresh item is ignored by the danger check
export const OVERFLOW_LIMIT = 2.5;   // seconds over the line before game over
export const MELON_BONUS = 110;      // two melons merging

// Trickshot: merge → hop → merge → merge. A piece knocked loose by a merge
// flies clear of every fruit and the floor (walls are fine: bank shots count),
// lands on its twin, and what that makes merges again. Every further merge in
// the cascade adds to it.
export const TRICK_POP = 0.3;    // s after the push for the piece to leave contact
export const TRICK_AIR = 0.42;   // s in the air before landing on its twin
export const TRICK_DX = 80;      // units of sideways travel during the flight
export const TRICK_VX = 220;     // units/s average sideways speed over the flight
export const TRICK_LINK = 1.2;   // s each new piece in the cascade has to merge again
export const TRICK_BONUS = 25;   // flat points plus 2× the new piece's, × merges past the first (max 3); mirrored in api/app.py

export const NEXT = { x: 250, y: 70, r: 26 };
export const BUTTONS = {
  mute: { x: 318, y: 40, r: 17 },
  restart: { x: 362, y: 40, r: 17 },
  theme: { x: 362, y: 90, r: 10 },  // bare icon under restart
  lang: { x: 330, y: 90, r: 10 },   // bare "ñ": Spanish mode
};
export const CHAIN_Y = 730;
