# Melon

A mobile browser drop-and-merge game with a paper cutout garden. Drop pieces into the jar. Two matching pieces grow into the next one, from a seed all the way to a melon. Don't let the jar overflow.

## Play

```bash
# Local dev (Flask):
python3 server.py
# http://localhost:8000
```

Any static server works too (`python3 -m http.server`). The Dockerfile runs gunicorn for Railway-style deploys.

## Controls

| Input | Action |
|-------|--------|
| Drag (touch / mouse) | Aim |
| Release | Drop |
| ← → / A D | Aim (keyboard) |
| Space / ↓ / Enter | Drop |

## Growth chain

seed → sprout → clover → daisy → rose → poppy → sunflower → cabbage → pumpkin → melon

Only the first five ever spawn. Two melons merging pop for a +110 bonus. A piece that rests above the dashed line for 2.5s ends the run.

## Stack

- **Frontend:** `index.html` + native ES modules in `js/`, HTML5 Canvas 2D, vanilla JS, no build step, no dependencies
- **Physics:** custom substepped Verlet circles (`js/physics.js`)
- **Art:** every sprite drawn procedurally as paper cutouts (`js/items.js`)
- **Audio:** Web Audio API synth, no files
- **Backend:** Flask static server (`server.py`)
- **Font:** Gaegu (Google Fonts)

## License

MIT
