# Melon

Mobile browser drop-and-merge game: `index.html` (HTML/CSS + game-over overlay) + ES modules in `js/`. Paper cutout garden theme, seed → melon growth chain. An original game in the drop-and-merge genre: keep its own theme, art and chain, and don't copy any specific existing game.

## Architecture

- HTML5 Canvas 2D, fixed-step 60Hz sim (`STEP`) driven by `requestAnimationFrame`, DPR capped at 2
- World is a fixed 400×760 unit space, letterboxed to the screen (`view` in `js/render.js`, `toWorld()` for input)
- `js/constants.js`: world/jar geometry, danger line, timings, spawn weights, HUD positions
- `js/items.js`: `TIERS` (name, radius, points, color, optional scalloped silhouette, draw fn). Sprites are drawn in unit space (radius 1) into offscreen canvases by `buildSprite()`, rebuilt on resize at device resolution. Each sprite has a cream paper rim and layered pieces with small drop shadows, then a grain overlay.
- `js/paper.js`: seeded RNG (`mulberry32`), wobbly outlines (`blob`, `ellipsePts`, `rectPts`), smooth tracing, shared grain texture
- `js/physics.js`: Verlet circles, 8 substeps × 2 collision passes. Velocity is implicit (`x - px`, per substep). When the step size changes (slow-mo), velocities are rescaled. Mass = R². Same-tier contact calls `onMerge` (the game creates the merged body). Merged bodies grow from the old radius with easeOutBack. Anti-launch guards: `MAX_SEP` caps push-apart speed at contacts, and `MAX_UP` caps upward speed. Without them, squeezed items and stacked shockwaves throw pieces out of the jar. Each body records its hardest impact per frame (`hit`, `hnx/hny`) for the juice layer. `shockwave()` pushes neighbours on merge. Spin is visual only (a no-slip rolling estimate).
- `js/game.js`: state `s`, input (pointer events plus keyboard), drop cooldown, overflow rule (a body older than `OVERFLOW_GRACE` with its top above `DANGER_Y` for `OVERFLOW_LIMIT` seconds → game over), save/resume via localStorage (`melon_save_v1`, saved on drop, every 3s, and on hide). Juice:
  - impacts → squash spring (`sq/sqV/sqA` per body), landing "tok" sounds (max 3/frame, 0.15s per-body cooldown), dust, shake for big pieces
  - merges → hit-stop (`s.freeze`), slow-mo for tier ≥7 (`s.slowT`; sim dt scaled), shockwave, themed particles, flash, camera zoom kick, haptics
  - combo: merges within `comboWindow` (1.4s) stack a ×0.25 multiplier (cap ×4). Combo 5 starts **fever** (8s, extended +0.6s per merge, ×2 points, 2.2s combo window, rainbow visuals, faster/denser music)
  - danger: heartbeat SFX, music low-pass, red vignette, trembling pieces and held item
- `js/render.js`: **perf model** — rendering is fill-rate bound, not JS bound. The canvas covers only the letterboxed world; the margins are a static CSS background with the same grain. DPR is capped at 2 and by `MAX_PIXELS` (2.6M). `adaptQuality()` lowers `view.quality` if frames stay over 21ms. Background (color, glow, grain) is cached once per resize and blitted. Avoid new full-screen gradient or scaled-image passes: fever is a solid `fillRect` wash, the danger vignette is 4 edge bands, the flash is a cached texture, and the merge pulse is a ring stroke. Particles are capped at `MAX_PARTS` (360) and only big ones get a shadow. Measure with headless Chrome at 1920×1080×2. Background glow pulsing on the music beat (`beatPhase()`) and hue-cycling in fever; camera with shake + zoom kick around the jar center; jar; aim guide; bodies (batched shadow pass, motion trails, squash via `drawItem(..., sq, sqA)`); held item (pops in, tilts/stretches with aim speed); effects; HUD drawn on canvas (score punch, combo/fever meters, next, mute/restart, growth-chain strip); screen-space danger vignette and melon whiteout
- `js/fx.js`: tier-themed bits (`BITS`: seeds, leaves, petals, chunks, confetti) with flutter, additive sparkles and flashes, rings, background color pulses, floating text, banners (fixed y slots: combo 262, fever/melon 330–340, discovery 405), ambient pollen motes pushed by merges, confetti rain
- `js/audio.js`: Web Audio synth through a compressor. SFX: drop whoosh, landing tok, merge bloop+bell (pitch rises with tier and combo), sub thump for big pieces, fever riser, heartbeat. Generative music (100 BPM, ×1.25 in fever, C pentatonic): pad, bass, soft kick/hats, random-walk marimba. `setMood({fever, danger})` adds layers or closes a low-pass. One mute toggle for everything.
- `js/haptics.js`: `navigator.vibrate` (Android); iOS 18+ Safari via the hidden `<input switch>` label-click trick. iOS likely only honours it inside user gestures (drop / buttons), so merge haptics may be silent there.
- localStorage keys: `melon_best`, `melon_discovered` (highest tier ever seen, reveals the chain strip), `melon_muted`, `melon_save_v1`
- Debug: `window.__melon` exposes `{ s, bodies, drop, TIERS, fx, makeBody }` for headless checks

## Running

```bash
python3 server.py   # http://localhost:8000
```

`server.py` sends `Cache-Control: no-cache` so iOS Safari revalidates modules.

## User Preferences

- Mobile-first (iPhone Safari), portrait
- Warm, handmade paper cutout aesthetic (same family as the slasher project)
- Iterative development, tune numbers rather than removing mechanics
