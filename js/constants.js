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

export const NEXT = { x: 250, y: 70, r: 26 };
export const BUTTONS = {
  mute: { x: 318, y: 40, r: 17 },
  restart: { x: 362, y: 40, r: 17 },
};
export const CHAIN_Y = 730;
