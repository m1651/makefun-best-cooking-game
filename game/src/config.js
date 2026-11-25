// Lantern & Ladle: the kitchen's fixed numbers — recipes, ingredients, stations and timing.
// Every value the world, the renderer and the screenshot stager share lives here.

export const VIEW = { width: 1280, height: 800 };

export const SHIFT_SECONDS = 150;
export const MAX_ORDERS = 4;
export const MAX_HEARTS = 3;
export const CHOP_SECONDS = 2.4;
export const COOK_SECONDS = 3.2;
export const BURN_SECONDS = 6.0;
export const CHEF_SPEED = 280;
export const CHEF_RADIUS = 26;
export const INTERACT_RANGE = 78;

// The ingredients the night-market kitchen stocks. `prep` says what a raw item needs
// before it may go on a plate: chop it, cook it, or serve it as it is.
export const INGREDIENTS = {
  rice:   { id: 'rice',   name: 'Rice',    prep: 'cook',  colour: '#f5ead0', dark: '#d9c49a' },
  noodle: { id: 'noodle', name: 'Noodles', prep: 'cook',  colour: '#f2c14e', dark: '#c98f1f' },
  veg:    { id: 'veg',    name: 'Veg',     prep: 'chop',  colour: '#7dc383', dark: '#3f8f4f' },
  meat:   { id: 'meat',   name: 'Meat',    prep: 'chop',  colour: '#e08090', dark: '#a34a5c' },
  egg:    { id: 'egg',    name: 'Egg',     prep: 'cook',  colour: '#ffe9a8', dark: '#e0a83c' },
  sauce:  { id: 'sauce',  name: 'Sauce',   prep: 'ready', colour: '#c65b3c', dark: '#8f3a22' },
};

// A dish is a set of finished items on one plate. `items` holds the finished state
// each ingredient must reach (chopped veg counts as finished for the veggie bowl).
export const RECIPES = [
  {
    id: 'sunrise-rice',
    name: 'Sunrise Fried Rice',
    items: [
      { kind: 'rice', state: 'cooked' },
      { kind: 'egg', state: 'cooked' },
      { kind: 'veg', state: 'cooked' },
    ],
    value: 16,
  },
  {
    id: 'lantern-noodles',
    name: 'Lantern Noodles',
    items: [
      { kind: 'noodle', state: 'cooked' },
      { kind: 'veg', state: 'cooked' },
      { kind: 'meat', state: 'cooked' },
    ],
    value: 20,
  },
  {
    id: 'garden-stirfry',
    name: 'Garden Stir-Fry',
    items: [
      { kind: 'veg', state: 'cooked' },
      { kind: 'meat', state: 'cooked' },
      { kind: 'sauce', state: 'ready' },
    ],
    value: 18,
  },
  {
    id: 'crisp-bowl',
    name: 'Crisp Veggie Bowl',
    items: [
      { kind: 'veg', state: 'chopped' },
      { kind: 'sauce', state: 'ready' },
      { kind: 'rice', state: 'cooked' },
    ],
    value: 14,
  },
];

// Stations. `stand` is where the chef stands to use it; `rect` is the counter itself.
export const STATIONS = [
  { id: 'bin-rice',   kind: 'bin',   item: 'rice',   label: 'Rice',    rect: { x: 60,  y: 150, w: 178, h: 76 }, stand: { x: 149, y: 258 } },
  { id: 'bin-noodle', kind: 'bin',   item: 'noodle', label: 'Noodles', rect: { x: 258, y: 150, w: 178, h: 76 }, stand: { x: 347, y: 258 } },
  { id: 'bin-veg',    kind: 'bin',   item: 'veg',    label: 'Veg',     rect: { x: 456, y: 150, w: 178, h: 76 }, stand: { x: 545, y: 258 } },
  { id: 'bin-meat',   kind: 'bin',   item: 'meat',   label: 'Meat',    rect: { x: 654, y: 150, w: 178, h: 76 }, stand: { x: 743, y: 258 } },
  { id: 'bin-egg',    kind: 'bin',   item: 'egg',    label: 'Eggs',    rect: { x: 852, y: 150, w: 178, h: 76 }, stand: { x: 941, y: 258 } },
  { id: 'bin-sauce',  kind: 'bin',   item: 'sauce',  label: 'Sauce',   rect: { x: 1050, y: 150, w: 178, h: 76 }, stand: { x: 1139, y: 258 } },
  { id: 'board',      kind: 'board', label: 'Chopping Board', rect: { x: 80,  y: 316, w: 230, h: 74 }, stand: { x: 195, y: 424 } },
  { id: 'wok',        kind: 'wok',   label: 'Wok Station',    rect: { x: 490, y: 316, w: 300, h: 74 }, stand: { x: 640, y: 424 } },
  { id: 'plates',     kind: 'plates', label: 'Clean Plates',  rect: { x: 980, y: 316, w: 220, h: 74 }, stand: { x: 1090, y: 424 } },
  { id: 'counter',    kind: 'counter', label: 'Plating Counter', rect: { x: 200, y: 560, w: 660, h: 76 }, stand: { x: 460, y: 528 } },
  { id: 'window',     kind: 'window', label: 'Serving Window', rect: { x: 900, y: 560, w: 320, h: 76 }, stand: { x: 1060, y: 528 } },
  { id: 'trash',      kind: 'trash', label: 'Compost Bin',    rect: { x: 60, y: 560, w: 120, h: 76 }, stand: { x: 120, y: 528 } },
];

// Where a plate sits on the plating counter (two slots).
export const PLATE_SLOTS = [
  { x: 380, y: 598 },
  { x: 640, y: 598 },
];

// Counters the chef cannot walk through.
export const OBSTACLES = STATIONS.map((s) => s.rect);

// How fast new orders arrive and how long they wait, at the start and at the end.
export const SPAWN_START_SECONDS = 13;
export const SPAWN_END_SECONDS = 7;
export const PATIENCE_START_SECONDS = 52;
export const PATIENCE_END_SECONDS = 36;

export const COMBO_STEP = 0.1;
export const COMBO_MAX = 2.0;
export const WRONG_DISH_PENALTY = 3;
// A serve with most of the customer's patience left is a perfect serve.
export const PERFECT_PATIENCE = 0.75;
export const PERFECT_BONUS = 5;
