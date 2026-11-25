// Lantern & Ladle: the kitchen's state and rules. The world knows nothing about the
// canvas or the keyboard: it steps forward on a fixed tick and answers with events
// (served, burnt, expired...) that the shell turns into sounds and floating text.

import {
  CHEF_RADIUS,
  CHEF_SPEED,
  CHOP_SECONDS,
  COOK_SECONDS,
  BURN_SECONDS,
  COMBO_MAX,
  COMBO_STEP,
  INGREDIENTS,
  INTERACT_RANGE,
  MAX_HEARTS,
  MAX_ORDERS,
  OBSTACLES,
  PATIENCE_END_SECONDS,
  PATIENCE_START_SECONDS,
  PERFECT_BONUS,
  PERFECT_PATIENCE,
  PLATE_SLOTS,
  RECIPES,
  SHIFT_SECONDS,
  SPAWN_END_SECONDS,
  SPAWN_START_SECONDS,
  STATIONS,
  VIEW,
  WRONG_DISH_PENALTY,
} from './config.js';
import { makeRandom, pick } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const EVENT_SERVED = 1;
export const EVENT_WRONG = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_BURNT = 8;
export const EVENT_CHOP_DONE = 16;
export const EVENT_COOK_DONE = 32;
export const EVENT_PICKUP = 64;
export const EVENT_PLACE = 128;
export const EVENT_OVER = 256;

/** A finished item that can sit on a plate. */
export function makeItem(kind, state) {
  return { kind, state };
}

export function itemKey(item) {
  return `${item.kind}:${item.state}`;
}

/** Does the plate hold exactly the recipe's items, in any order? */
export function plateMatchesRecipe(plate, recipe) {
  if (plate.contents.length !== recipe.items.length) return false;
  const held = plate.contents.map(itemKey).sort();
  const wanted = recipe.items.map(itemKey).sort();
  return held.every((key, index) => key === wanted[index]);
}

export function recipeForPlate(plate) {
  return RECIPES.find((recipe) => plateMatchesRecipe(plate, recipe)) ?? null;
}

/** A plate is ready to serve when its contents are a whole recipe. */
export function plateIsReady(plate) {
  return recipeForPlate(plate) !== null;
}

function stationById(id) {
  return STATIONS.find((station) => station.id === id);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Push the chef out of a counter rectangle, so counters stay solid. */
function pushOutOfRect(chef, rect) {
  const nearestX = clamp(chef.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(chef.y, rect.y, rect.y + rect.h);
  const dx = chef.x - nearestX;
  const dy = chef.y - nearestY;
  const dist = Math.hypot(dx, dy);
  if (dist >= CHEF_RADIUS || dist === 0) return;
  const push = CHEF_RADIUS - dist;
  if (dist === 0) {
    chef.y = rect.y + rect.h + CHEF_RADIUS;
    return;
  }
  chef.x += (dx / dist) * push;
  chef.y += (dy / dist) * push;
}

export class KitchenWorld {
  constructor(seed = 7) {
    this.random = makeRandom(seed);
    this.reset();
  }

  reset() {
    this.screen = SCREEN_TITLE;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.coins = 0;
    this.served = 0;
    this.combo = 0;
    this.hearts = MAX_HEARTS;
    this.bestCombo = 0;
    this.chef = { x: 640, y: 470, facing: 1, moving: false, walkPhase: 0 };
    this.hands = null;
    this.orders = [];
    this.nextOrderId = 1;
    this.spawnIn = 4;
    this.board = { item: null, progress: 0, state: 'idle' };
    this.wok = { item: null, progress: 0, state: 'idle' };
    this.plates = [null, null];
    this.floaters = [];
    this.servedFlash = 0;
    this.wrongFlash = 0;
    this.lastEvent = 0;
    this.spawnOrder();
  }

  /** How far through the shift we are, 0 at the start and 1 at the end. */
  shiftProgress() {
    return clamp(1 - this.timeLeft / SHIFT_SECONDS, 0, 1);
  }

  spawnInterval() {
    const t = this.shiftProgress();
    return SPAWN_START_SECONDS + (SPAWN_END_SECONDS - SPAWN_START_SECONDS) * t;
  }

  patienceSeconds() {
    const t = this.shiftProgress();
    return PATIENCE_START_SECONDS + (PATIENCE_END_SECONDS - PATIENCE_START_SECONDS) * t;
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const recipe = pick(this.random, RECIPES);
    const patience = this.patienceSeconds();
    this.orders.push({
      id: this.nextOrderId,
      recipe,
      patience,
      maxPatience: patience,
      customer: this.nextOrderId,
    });
    this.nextOrderId += 1;
  }

  /** The nearest station the chef can reach, or null. */
  nearestStation() {
    let best = null;
    let bestDist = INTERACT_RANGE;
    for (const station of STATIONS) {
      const dist = distance(this.chef.x, this.chef.y, station.stand.x, station.stand.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = station;
      }
    }
    return best;
  }

  addFloater(x, y, text, colour) {
    this.floaters.push({ x, y, text, colour, life: 1.4 });
  }

  /** Step the world by `dt` seconds. `move` is {x, y} in [-1, 1]; `interact` fires once. */
  step(dt, move, interact) {
    let events = 0;
    if (this.screen !== SCREEN_PLAY) return events;

    this.elapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.screen = SCREEN_OVER;
      return events | EVENT_OVER;
    }

    // Move the chef, keeping them on the floor and out of the counters.
    const length = Math.hypot(move.x, move.y);
    if (length > 0.01) {
      const nx = move.x / Math.max(1, length);
      const ny = move.y / Math.max(1, length);
      this.chef.x = clamp(this.chef.x + nx * CHEF_SPEED * dt, 30, VIEW.width - 30);
      this.chef.y = clamp(this.chef.y + ny * CHEF_SPEED * dt, 240, VIEW.height - 30);
      this.chef.facing = nx !== 0 ? Math.sign(nx) : this.chef.facing;
      this.chef.moving = true;
      this.chef.walkPhase += dt * 10;
      for (const obstacle of OBSTACLES) pushOutOfRect(this.chef, obstacle);
    } else {
      this.chef.moving = false;
    }

    if (interact) events |= this.interact();

    // The chopping board and the wok work on their own once loaded.
    events |= this.stepStation(this.board, CHOP_SECONDS, 'chopped', EVENT_CHOP_DONE, dt);
    events |= this.stepStation(this.wok, COOK_SECONDS, 'cooked', EVENT_COOK_DONE, dt);

    // New orders arrive on a timer that quickens as the shift wears on.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnOrder();
      this.spawnIn = this.spawnInterval();
    }

    // Orders lose patience; an expired order costs a heart and the combo.
    for (let index = this.orders.length - 1; index >= 0; index -= 1) {
      const order = this.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        this.orders.splice(index, 1);
        this.hearts -= 1;
        this.combo = 0;
        events |= EVENT_EXPIRED;
        this.addFloater(640, 130, 'Order walked out!', '#ff7a6b');
        if (this.hearts <= 0) {
          this.screen = SCREEN_OVER;
          return events | EVENT_OVER;
        }
      }
    }

    for (let index = this.floaters.length - 1; index >= 0; index -= 1) {
      const floater = this.floaters[index];
      floater.life -= dt;
      floater.y -= 28 * dt;
      if (floater.life <= 0) this.floaters.splice(index, 1);
    }
    if (this.servedFlash > 0) this.servedFlash -= dt;
    if (this.wrongFlash > 0) this.wrongFlash -= dt;
    return events;
  }

  /** Advance one work station; a finished item waits, then burns if left too long. */
  stepStation(station, workSeconds, doneState, doneEvent, dt) {
    if (station.state !== 'working' && station.state !== 'done') return 0;
    station.progress += dt;
    if (station.state === 'working' && station.progress >= workSeconds) {
      station.state = 'done';
      station.item.state = doneState;
      return doneEvent;
    }
    if (station.progress >= workSeconds + BURN_SECONDS) {
      station.state = 'burnt';
      station.item.state = 'burnt';
      this.addFloater(this.chef.x, this.chef.y - 60, 'Burnt!', '#ff7a6b');
      return EVENT_BURNT;
    }
    return 0;
  }

  /** Use the nearest station. Returns the events the use caused. */
  interact() {
    const station = this.nearestStation();
    if (!station) return 0;
    switch (station.kind) {
      case 'bin': return this.takeFromBin(station);
      case 'board': return this.useBoard();
      case 'wok': return this.useWok();
      case 'plates': return this.takePlate();
      case 'counter': return this.useCounter();
      case 'window': return this.serveAtWindow();
      case 'trash': return this.useTrash();
      default: return 0;
    }
  }

  takeFromBin(station) {
    if (this.hands) return 0;
    this.hands = makeItem(station.item, INGREDIENTS[station.item].prep === 'ready' ? 'ready' : 'raw');
    return EVENT_PICKUP;
  }

  useBoard() {
    // Take a finished item off the board, or load a raw veg/meat to chop.
    if (this.board.state === 'done' || this.board.state === 'burnt') {
      if (this.hands) return 0;
      this.hands = this.board.item;
      this.board.item = null;
      this.board.progress = 0;
      this.board.state = 'idle';
      return EVENT_PICKUP;
    }
    if (this.board.state !== 'idle' || !this.hands) return 0;
    if (this.hands.kind !== 'veg' && this.hands.kind !== 'meat') return 0;
    if (this.hands.state !== 'raw') return 0;
    this.board.item = this.hands;
    this.hands = null;
    this.board.progress = 0;
    this.board.state = 'working';
    return EVENT_PLACE;
  }

  useWok() {
    if (this.wok.state === 'done' || this.wok.state === 'burnt') {
      if (this.hands) return 0;
      this.hands = this.wok.item;
      this.wok.item = null;
      this.wok.progress = 0;
      this.wok.state = 'idle';
      return EVENT_PICKUP;
    }
    if (this.wok.state !== 'idle' || !this.hands) return 0;
    const cookable = this.hands.state === 'raw' || this.hands.state === 'chopped';
    const kind = INGREDIENTS[this.hands.kind];
    if (!cookable || kind.prep !== 'cook' && !(kind.prep === 'chop' && this.hands.state === 'chopped')) return 0;
    this.wok.item = this.hands;
    this.hands = null;
    this.wok.progress = 0;
    this.wok.state = 'working';
    return EVENT_PLACE;
  }

  takePlate() {
    if (this.hands) return 0;
    this.hands = { plate: true, contents: [] };
    return EVENT_PICKUP;
  }

  useCounter() {
    // Holding a plate: put it down on a free slot. Holding food: add it to a plate.
    // Empty-handed: pick a plate back up.
    if (this.hands && this.hands.plate) {
      const slot = this.plates.indexOf(null);
      if (slot === -1) return 0;
      this.plates[slot] = this.hands;
      this.hands = null;
      return EVENT_PLACE;
    }
    if (this.hands && !this.hands.plate) {
      if (this.hands.state === 'burnt') return 0;
      const slot = this.plates.findIndex((plate) => plate && plate.contents.length < 3);
      if (slot === -1) return 0;
      this.plates[slot].contents.push(this.hands);
      this.hands = null;
      return EVENT_PLACE;
    }
    const slot = this.plates.findIndex((plate) => plate !== null);
    if (slot === -1) return 0;
    this.hands = this.plates[slot];
    this.plates[slot] = null;
    return EVENT_PICKUP;
  }

  serveAtWindow() {
    if (!this.hands || !this.hands.plate) return 0;
    const recipe = recipeForPlate(this.hands);
    if (!recipe) {
      this.wrongFlash = 0.5;
      this.coins = Math.max(0, this.coins - WRONG_DISH_PENALTY);
      this.combo = 0;
      this.addFloater(1060, 440, 'Not an order!', '#ff7a6b');
      return EVENT_WRONG;
    }
    const orderIndex = this.orders.findIndex((order) => order.recipe.id === recipe.id);
    if (orderIndex === -1) {
      this.wrongFlash = 0.5;
      this.coins = Math.max(0, this.coins - WRONG_DISH_PENALTY);
      this.combo = 0;
      this.addFloater(1060, 440, 'Nobody ordered that!', '#ff7a6b');
      return EVENT_WRONG;
    }
    const order = this.orders[orderIndex];
    this.orders.splice(orderIndex, 1);
    const patienceLeft = order.patience / order.maxPatience;
    const tip = Math.round(8 * patienceLeft);
    const perfect = patienceLeft >= PERFECT_PATIENCE;
    const multiplier = 1 + Math.min(this.combo, 10) * COMBO_STEP;
    const earned = Math.round((recipe.value + tip + (perfect ? PERFECT_BONUS : 0)) * multiplier);
    this.coins += earned;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.served += 1;
    this.servedFlash = 0.6;
    this.hands = null;
    this.addFloater(1060, 440, perfect ? `Perfect! +${earned} coins` : `+${earned} coins`, '#ffd76a');
    return EVENT_SERVED;
  }

  useTrash() {
    if (!this.hands) return 0;
    this.hands = null;
    return EVENT_PLACE;
  }
}
