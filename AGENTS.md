# Melon

Mobile browser drop-and-merge game: `index.html` (HTML/CSS + game-over overlay) + ES modules in `js/`. Paper cutout garden theme, seed → melon growth chain. An original game in the drop-and-merge genre: keep its own theme, art and chain, and don't copy any specific existing game.

## Architecture

- HTML5 Canvas 2D, fixed-step 60Hz sim (`STEP`) driven by `requestAnimationFrame`, DPR capped at 2
- World is a fixed 400×760 unit space, letterboxed to the screen (`view` in `js/render.js`, `toWorld()` for input)
- `js/constants.js`: world/jar geometry, danger line, timings, spawn weights, HUD positions
- `js/items.js`: `TIERS` (name, radius, points, color, optional scalloped silhouette, draw fn). Sprites are drawn in unit space (radius 1) into offscreen canvases by `buildSprite()`, rebuilt on resize at device resolution. Each sprite has a cream paper rim and layered pieces with small drop shadows, then a grain overlay.
- `js/paper.js`: seeded RNG (`mulberry32`), wobbly outlines (`blob`, `ellipsePts`, `rectPts`), smooth tracing, shared grain texture
- `js/physics.js`: Verlet circles, 8 substeps × 2 collision passes. Velocity is implicit (`x - px`, per substep). Mass = R². Same-tier contact calls `onMerge` (the game creates the merged body). Merged bodies grow from the old radius with easeOutBack. `MAX_SEP` caps push-apart speed: without it, squeezed small items get launched out of the jar. Spin is visual only (a no-slip rolling estimate).
- `js/game.js`: state `s`, input (pointer events plus keyboard), drop cooldown, merge scoring, overflow rule (a body older than `OVERFLOW_GRACE` with its top above `DANGER_Y` for `OVERFLOW_LIMIT` seconds → game over), save/resume via localStorage (`melon_save_v1`, saved on drop, every 3s, and on hide)
- `js/render.js`: background, jar, aim guide, bodies (batched shadow pass), held item, effects, HUD drawn on canvas (score, next, mute/restart buttons, growth-chain strip)
- `js/fx.js`: confetti, rings, popups, screen shake. `js/audio.js`: synthesized plucks (pentatonic per tier)
- localStorage keys: `melon_best`, `melon_discovered` (highest tier ever seen, reveals the chain strip), `melon_muted`, `melon_save_v1`
- Debug: `window.__melon` exposes `{ s, bodies, drop, TIERS }` for headless checks

## Running

```bash
python3 server.py   # http://localhost:8000
```

`server.py` sends `Cache-Control: no-cache` so iOS Safari revalidates modules.

## User Preferences

- Mobile-first (iPhone Safari), portrait
- Warm, handmade paper cutout aesthetic (same family as the slasher project)
- Iterative development, tune numbers rather than removing mechanics
