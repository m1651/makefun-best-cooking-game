// Lantern & Ladle: the shell that runs the kitchen. It owns the animation loop,
// turns key and mouse input into world steps, plays a sound for each event the
// world reports, and stages the screenshot scenes when the page is opened with
// ?shot=<name>. In shot mode it renders one frame and stops, so the screenshot
// is a deterministic render of the game's own code.

import { STATIONS as STATION_LIST, VIEW } from './config.js';
import { KitchenInput } from './input.js';
import { KitchenAudio } from './audio.js';
import { KitchenWorld, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, EVENT_BURNT, EVENT_CHOP_DONE, EVENT_COOK_DONE, EVENT_EXPIRED, EVENT_OVER, EVENT_PICKUP, EVENT_PLACE, EVENT_SERVED, EVENT_WRONG } from './world.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';
import { findPath, followPath } from './paths.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const world = new KitchenWorld(7);
const input = new KitchenInput(canvas);
const audio = new KitchenAudio();
const ui = { best: 0, paused: false };
let walkPath = [];
let walkTargetStation = null;

function playEventSound(events) {
  if (events & EVENT_SERVED) audio.serve();
  if (events & EVENT_WRONG) audio.wrong();
  if (events & EVENT_EXPIRED) audio.expired();
  if (events & EVENT_BURNT) audio.burnt();
  if (events & EVENT_CHOP_DONE) audio.chopDone();
  if (events & EVENT_COOK_DONE) audio.cookDone();
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_PLACE) audio.place();
  if (events & EVENT_OVER) audio.gameOver();
}

function startShift() {
  world.reset();
  world.screen = SCREEN_PLAY;
  walkPath = [];
  walkTargetStation = null;
  audio.ensure();
  audio.startMusic();
  status.textContent = 'Shift started. Take the orders on the board.';
}

function frame(now, last) {
  const dt = Math.min(0.05, (now - last) / 1000);
  const keyboard = input.moveVector();

  // Title and game-over screens: Enter or a click starts.
  if (world.screen === SCREEN_TITLE || world.screen === SCREEN_OVER) {
    if (input.wasPressed('enter', ' ')) startShift();
    if (input.wasClicked()) {
      audio.ensure();
      startShift();
    }
    if (world.screen === SCREEN_OVER && world.coins > ui.best) ui.best = world.coins;
  } else if (world.screen === SCREEN_PLAY) {
    if (input.wasPressed('p')) ui.paused = !ui.paused;
    if (input.wasPressed('m')) {
      audio.ensure();
      audio.setMuted(!audio.muted);
    }
    if (!ui.paused) {
      // A click walks the chef: onto a station to use it, or to a spot on the floor.
      const click = input.takeClickTarget();
      if (click) {
        audio.ensure();
        const station = stationFromClick(click.x, click.y);
        if (station) {
          walkPath = findPath(world.chef.x, world.chef.y, station.stand.x, station.stand.y);
          walkTargetStation = station;
        } else {
          walkPath = findPath(world.chef.x, world.chef.y, click.x, click.y);
          walkTargetStation = null;
        }
      }
      let move = keyboard;
      if ((keyboard.x !== 0 || keyboard.y !== 0) && walkPath.length > 0) {
        walkPath = [];
        walkTargetStation = null;
      }
      if (walkPath.length > 0 && keyboard.x === 0 && keyboard.y === 0) {
        move = followPath(world.chef, walkPath);
        if (walkPath.length === 0 && walkTargetStation) {
          const events = world.interact();
          if (events & EVENT_PLACE && world.board.state === 'working') audio.chop();
          if (events & EVENT_PLACE && world.wok.state === 'working') audio.sizzle();
          playEventSound(events);
          walkTargetStation = null;
        }
      }
      const interact = input.wasPressed('e', ' ');
      const events = world.step(dt, move, interact);
      if (interact && events & EVENT_PLACE && world.board.state === 'working') audio.chop();
      if (interact && events & EVENT_PLACE && world.wok.state === 'working') audio.sizzle();
      playEventSound(events);
      if (world.screen === SCREEN_OVER && world.coins > ui.best) ui.best = world.coins;
    }
  }

  renderGame(ctx, world, ui);
  input.endFrame();
  requestAnimationFrame((next) => frame(next, now));
}

function stationFromClick(x, y) {
  // Stations are looked up from the config module's list, kept here in the
  // shell so the click target never depends on the renderer.
  return STATION_LIST.find((station) => {
    const r = station.rect;
    return x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6;
  }) ?? null;
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot mode: stage the scene, draw one frame, and stop.
  const staged = stageShot(shot, world);
  ui.best = staged.best;
  renderGame(ctx, world, ui);
  window.__shotReady = true;
} else {
  window.__game = { world, input, ui, audio };
  requestAnimationFrame((now) => frame(now, now));
}
