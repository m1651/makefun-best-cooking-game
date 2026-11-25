# Lantern & Ladle — a night-market kitchen

[![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/m1651/makefun-best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/m1651/makefun-best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Lantern & Ladle** is a complete, original cooking game that runs offline in a
desktop browser from its own files — no network, no build step, no libraries.
You are Momo, the cook at a little night-market stall. Orders land on the board
with a patience timer; you fetch ingredients from the counter bins, chop veg and
meat on the board, fry in the wok (don't let it burn!), build each dish on a
plate, and serve it at the window before the customer walks out. Serve fast for
tips, chain serves for a combo multiplier, and survive the 2½-minute shift as
the orders come faster and the customers grow less patient.

## How to play

- **Move:** WASD / arrow keys, or click anywhere — the chef walks around the
  counters to where you clicked.
- **Use a station:** `E` or `Space` when standing by it, or click the station
  itself to walk over and use it.
- **The loop:** bin → chopping board (veg, meat) → wok (rice, noodles, egg,
  chopped veg/meat) → plate on the plating counter → serving window.
- **Recipes:** Sunrise Fried Rice (rice + egg + veg), Lantern Noodles (noodles +
  veg + meat), Garden Stir-Fry (veg + meat + sauce), Crisp Veggie Bowl (chopped
  veg + sauce + rice). A plate only serves when it matches an order exactly.
- **Watch out:** food left in the wok burns — throw burnt food in the compost
  bin. A wrong dish costs coins and your combo; an expired order costs a heart.
  Lose all three hearts and the shift ends early. Serve with most of the
  customer's patience left for a **Perfect!** bonus of +5 coins.
- **Pause:** `P`. **Mute:** `M`. Sounds and a little plucked melody are
  synthesized live with the Web Audio API — there are no audio files.

## Run it

Open `game/index.html` in desktop Chrome, or serve the folder with any static
server (`node serve.ts`, then http://localhost:8080). Everything the game loads
lives under `game/`; it makes no network requests.

## Layout

- `game/index.html` — the page, a full-window canvas.
- `game/src/main.js` — the shell: loop, input, click-to-move, sounds, shots.
- `game/src/world.js` — the kitchen's state and rules: orders, cooking, scoring.
- `game/src/config.js` — recipes, ingredients, stations, timing.
- `game/src/render.js` — all the art, drawn on canvas: kitchen, food, chef, HUD.
- `game/src/paths.js` — A* walking routes around the counters.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized sounds and music (Web Audio, no files).
- `game/src/shots.js` — the staged screenshot scenes, played by an autopilot
  through the real rules (`?shot=start|play|rush|serve`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — four real renders of the game's own code: the cover shows
  the kitchen mid-shift (order board, ingredients, a dish mid-assembly, the
  timer, a plate ready to serve), then the title screen, the late-shift rush,
  and the moment a dish is served.

## License

MIT — see `LICENSE`.
