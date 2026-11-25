// Lantern & Ladle: the screenshot scenes behind ?shot=start|play|rush|serve.
// Each scene plays the real rules forward from a fresh world, steered by a small
// autopilot that walks the chef between stations and uses them, so every frame
// is what a short game really looks like and the same seed always gives the
// same frame. The cover (play) shows the whole kitchen at once: the order board,
// ingredients on the counter, a dish mid-assembly, the timer, and a plate ready
// to serve.

import { RECIPES, STATIONS } from './config.js';
import { KitchenWorld, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { findPath, followPath } from './paths.js';

const STEP = 1 / 60;
const MAX_STEPS = 60 * 240;

function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

/** Step the world with no input until `done()` is true, or the budget runs out. */
function runUntil(world, done) {
  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (done()) return true;
    world.step(STEP, { x: 0, y: 0 }, false);
  }
  return false;
}

/** Walk the chef to a station's stand point along the kitchen's walkable route. */
function walkTo(world, stationId) {
  const station = stationById(stationId);
  const path = findPath(world.chef.x, world.chef.y, station.stand.x, station.stand.y);
  for (let step = 0; step < MAX_STEPS && path.length > 0; step += 1) {
    world.step(STEP, followPath(world.chef, path), false);
  }
}

/** Walk the chef to a station's stand point, then use it once. */
function goAndUse(world, stationId) {
  walkTo(world, stationId);
  world.step(STEP, { x: 0, y: 0 }, true);
}

/** Wait until the named station's work is done (or burnt). */
function waitForStation(world, slot) {
  runUntil(world, () => slot.state === 'done' || slot.state === 'burnt' || slot.state === 'idle');
}

/** Put one raw ingredient through its whole preparation and onto a plate. */
function cookOntoPlate(world, binId, prep) {
  goAndUse(world, binId);
  if (prep === 'chop') {
    goAndUse(world, 'board');
    waitForStation(world, world.board);
    goAndUse(world, 'board');
  }
  if (prep === 'cook' || prep === 'chop') {
    goAndUse(world, 'wok');
    waitForStation(world, world.wok);
    goAndUse(world, 'wok');
  }
  goAndUse(world, 'counter');
}

/** Build one whole dish on the plating counter from its recipe. */
function buildDish(world, recipe) {
  const binFor = {
    rice: 'bin-rice', noodle: 'bin-noodle', veg: 'bin-veg',
    meat: 'bin-meat', egg: 'bin-egg', sauce: 'bin-sauce',
  };
  goAndUse(world, 'plates');
  goAndUse(world, 'counter');
  for (const item of recipe.items) {
    if (item.state === 'ready') {
      goAndUse(world, binFor[item.kind]);
      goAndUse(world, 'counter');
    } else if (item.state === 'chopped') {
      goAndUse(world, binFor[item.kind]);
      goAndUse(world, 'board');
      waitForStation(world, world.board);
      goAndUse(world, 'board');
      goAndUse(world, 'counter');
    } else {
      cookOntoPlate(world, binFor[item.kind], item.kind === 'veg' || item.kind === 'meat' ? 'chop' : 'cook');
    }
  }
}

function startShift(world) {
  world.screen = SCREEN_PLAY;
  world.spawnIn = 999;
}

/**
 * Stage the named scene and return the screen to draw over it.
 * `start` is the title screen, `play` the cover, `rush` the late-shift rush,
 * and `serve` the moment a dish is handed over at the window.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'rush' && name !== 'serve') {
    world.elapsed = 5;
    return { screen: SCREEN_TITLE, best: 0 };
  }

  startShift(world);
  const friedRice = RECIPES.find((recipe) => recipe.id === 'sunrise-rice');
  const noodles = RECIPES.find((recipe) => recipe.id === 'lantern-noodles');

  if (name === 'serve') {
    // One known order, built and served for real through the window.
    world.orders = [{
      id: 1, recipe: friedRice, patience: 300, maxPatience: 300, customer: 1,
    }];
    buildDish(world, friedRice);
    goAndUse(world, 'counter');
    goAndUse(world, 'window');
    world.timeLeft = 110;
    world.coins = 40;
    world.served = 2;
    world.combo = 2;
    return { screen: SCREEN_PLAY, best: 58 };
  }

  // The cover and the rush both build a finished fried rice and a half-built
  // plate of noodles, then leave the chef carrying chopped meat for the wok.
  buildDish(world, friedRice);
  goAndUse(world, 'plates');
  goAndUse(world, 'counter');
  cookOntoPlate(world, 'bin-noodle', 'cook');
  goAndUse(world, 'bin-veg');
  goAndUse(world, 'board');
  waitForStation(world, world.board);
  goAndUse(world, 'board');
  goAndUse(world, 'wok');
  waitForStation(world, world.wok);
  goAndUse(world, 'wok');
  goAndUse(world, 'counter');
  goAndUse(world, 'bin-meat');
  goAndUse(world, 'board');
  waitForStation(world, world.board);
  goAndUse(world, 'board');
  // Walk toward the wok with the chopped meat in hand: the dish mid-assembly.
  walkTo(world, 'wok');

  if (name === 'rush') {
    world.timeLeft = 28;
    world.coins = 142;
    world.served = 9;
    world.combo = 4;
    world.hearts = 2;
    while (world.orders.length < 4) world.spawnOrder();
    for (const order of world.orders) order.patience = Math.min(order.patience, 14);
    return { screen: SCREEN_PLAY, best: 142 };
  }

  world.timeLeft = 96;
  world.coins = 58;
  world.served = 3;
  world.combo = 2;
  world.hearts = 3;
  while (world.orders.length < 3) world.spawnOrder();
  return { screen: SCREEN_PLAY, best: 58 };
}

export { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE };
