// Lantern & Ladle: everything the player sees, drawn on one canvas with plain
// vector shapes — the kitchen, the order board, the food, the chef and the HUD.
// No images: every dish is drawn fresh each frame from the game's own code.

import {
  CHOP_SECONDS,
  COOK_SECONDS,
  INGREDIENTS,
  PLATE_SLOTS,
  RECIPES,
  STATIONS,
  VIEW,
} from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, plateIsReady } from './world.js';

const FLOOR_A = '#8a5a3b';
const FLOOR_B = '#7d4f33';
const WALL = '#3d2b23';
const COUNTER_TOP = '#c98f5a';
const COUNTER_FRONT = '#8a5a34';
const INK = '#2b1a12';
const CREAM = '#fff4dd';
const GOLD = '#ffd76a';
const GREEN = '#7dc383';
const RED = '#ff7a6b';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'center', weight = 'bold') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** A progress ring around a station that is working, done, or burnt. */
function progressRing(ctx, x, y, radius, progress, colour) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.stroke();
}

/** One ingredient, drawn as a small plate of food. `size` is the dish radius. */
export function drawIngredient(ctx, kind, state, x, y, size) {
  const def = INGREDIENTS[kind];
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * size * 0.5, -size * 0.5);
      ctx.lineTo(i * size * 0.5, size * 0.5);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  switch (kind) {
    case 'rice': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.45, Math.sin(a) * size * 0.45, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'noodle': {
      ctx.strokeStyle = def.colour;
      ctx.lineWidth = size * 0.28;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.35 + i * 0.22), Math.PI * (0.15 + i * 0.3), Math.PI * (1.1 + i * 0.3));
        ctx.stroke();
      }
      ctx.fillStyle = '#3f8f4f';
      ctx.beginPath();
      ctx.arc(-size * 0.4, -size * 0.4, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'veg': {
      // A carrot, whole when raw, diced when chopped, glossy when cooked.
      if (state === 'chopped') {
        ctx.fillStyle = '#e8862e';
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2;
          ctx.save();
          ctx.translate(Math.cos(a) * size * 0.4, Math.sin(a) * size * 0.4);
          ctx.rotate(a);
          ctx.fillRect(-size * 0.22, -size * 0.14, size * 0.44, size * 0.28);
          ctx.restore();
        }
        ctx.fillStyle = '#3f8f4f';
        ctx.beginPath();
        ctx.arc(0, -size * 0.5, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#e8862e';
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, -size * 0.2);
        ctx.lineTo(size * 0.8, 0);
        ctx.lineTo(-size * 0.7, size * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3f8f4f';
        ctx.beginPath();
        ctx.moveTo(-size * 0.7, -size * 0.2);
        ctx.lineTo(-size * 1.1, -size * 0.8);
        ctx.lineTo(-size * 0.5, -size * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      if (state === 'cooked') {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'meat': {
      ctx.fillStyle = state === 'chopped' ? def.colour : def.dark;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.9, size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff4dd';
      ctx.beginPath();
      ctx.arc(size * 0.55, -size * 0.4, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath();
      ctx.arc(size * 0.55, -size * 0.4, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      if (state === 'chopped') {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, -size * 0.4);
        ctx.lineTo(size * 0.3, size * 0.4);
        ctx.stroke();
      }
      if (state === 'cooked') {
        ctx.fillStyle = 'rgba(120,60,20,0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.9, size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state === 'cooked' ? '#f2a541' : '#ffd76a';
      ctx.beginPath();
      ctx.arc(size * 0.1, 0, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sauce': {
      ctx.fillStyle = def.colour;
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size * 0.7);
      ctx.lineTo(size * 0.45, -size * 0.7);
      ctx.lineTo(size * 0.6, size * 0.7);
      ctx.lineTo(-size * 0.6, size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b1a12';
      ctx.fillRect(-size * 0.3, -size * 1.05, size * 0.6, size * 0.4);
      ctx.fillStyle = CREAM;
      ctx.fillRect(-size * 0.45, -size * 0.15, size * 0.9, size * 0.35);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/** A white plate holding its ingredients, with a golden glow when it is a full dish. */
export function drawPlate(ctx, plate, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (plateIsReady(plate)) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,106,0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbb98f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  const count = plate.contents.length;
  plate.contents.forEach((item, index) => {
    const angle = count === 1 ? -Math.PI / 2 : -Math.PI / 2 + (index - (count - 1) / 2) * 0.9;
    drawIngredient(ctx, item.kind, item.state, Math.cos(angle) * 13, Math.sin(angle) * 9 - 2, 9);
  });
  ctx.restore();
}

/** The chef: a little cook in a tall white toque and a red apron. */
function drawChef(ctx, chef, hands) {
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 3 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.arc(0, 6, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.lineTo(13, 26);
  ctx.lineTo(-13, 26);
  ctx.closePath();
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#f6c89f';
  ctx.beginPath();
  ctx.arc(0, -20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -32, 9, 0, Math.PI * 2);
  ctx.arc(0, -38, 11, 0, Math.PI * 2);
  ctx.arc(8, -32, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, -34, 28, 8);
  // Eyes look where the chef faces.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(chef.facing * 4 - 5, -21, 2, 0, Math.PI * 2);
  ctx.arc(chef.facing * 4 + 5, -21, 2, 0, Math.PI * 2);
  ctx.fill();
  // What the chef carries, held high above the toque.
  if (hands) {
    if (hands.plate) {
      drawPlate(ctx, hands, 0, -58, 0.85);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, -56, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      drawIngredient(ctx, hands.kind, hands.state, 0, -58, 10);
    }
  }
  ctx.restore();
}

function drawLantern(ctx, x, y, scale, phase) {
  const sway = Math.sin(phase) * 4;
  ctx.save();
  ctx.translate(x + sway, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(0, -18);
  ctx.stroke();
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  glow.addColorStop(0, 'rgba(255,180,80,0.5)');
  glow.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2483d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(-16, -4, 32, 3);
  ctx.fillRect(-16, 4, 32, 3);
  ctx.fillStyle = '#8f2f28';
  ctx.fillRect(-6, -22, 12, 5);
  ctx.fillRect(-6, 17, 12, 5);
  ctx.restore();
}

function drawStation(ctx, station, world) {
  const { x, y, w, h } = station.rect;
  ctx.fillStyle = COUNTER_FRONT;
  roundRect(ctx, x, y + 8, w, h, 10);
  ctx.fill();
  ctx.fillStyle = COUNTER_TOP;
  roundRect(ctx, x, y, w, h - 6, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h - 6, 10);
  ctx.stroke();

  const cx = x + w / 2;
  const cy = y + h / 2 - 6;
  if (station.kind === 'bin') {
    drawIngredient(ctx, station.item, INGREDIENTS[station.item].prep === 'ready' ? 'ready' : 'raw', cx, cy - 6, 17);
    text(ctx, station.label, cx, y + h - 12, 13, INK);
    return;
  }
  if (station.kind === 'board') {
    ctx.fillStyle = '#e8d3a8';
    roundRect(ctx, x + 14, y + 8, w - 28, h - 26, 6);
    ctx.fill();
    const slot = world.board;
    if (slot.item) drawIngredient(ctx, slot.item.kind, slot.item.state, cx, cy - 4, 16);
    if (slot.state === 'working') progressRing(ctx, cx, cy - 4, 24, slot.progress / CHOP_SECONDS, '#7dc383');
    if (slot.state === 'done') {
      text(ctx, 'Chopped!', cx, cy - 34, 13, GREEN);
    }
    if (slot.state === 'burnt') text(ctx, 'Burnt!', cx, cy - 34, 13, RED);
    text(ctx, station.label, cx, y + h - 12, 13, INK);
    return;
  }
  if (station.kind === 'wok') {
    ctx.fillStyle = '#3a3a3f';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 62, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222226';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    const slot = world.wok;
    if (slot.item) drawIngredient(ctx, slot.item.kind, slot.item.state, cx, cy - 6, 15);
    if (slot.state === 'working') {
      ctx.fillStyle = 'rgba(255,140,60,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6, 44, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      progressRing(ctx, cx, cy - 6, 26, slot.progress / COOK_SECONDS, '#ff9a4d');
    }
    if (slot.state === 'done') text(ctx, 'Ready!', cx, cy - 36, 13, GREEN);
    if (slot.state === 'burnt') text(ctx, 'Burnt!', cx, cy - 36, 13, RED);
    text(ctx, station.label, cx, y + h - 12, 13, INK);
    return;
  }
  if (station.kind === 'plates') {
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = '#fdfdf8';
      ctx.beginPath();
      ctx.ellipse(cx - 44 + i * 44, cy - 6, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbb98f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx - 44 + i * 44, cy - 6, 20, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    text(ctx, station.label, cx, y + h - 12, 13, INK);
    return;
  }
  if (station.kind === 'counter') {
    text(ctx, station.label, cx, y + h - 12, 13, INK);
    return;
  }
  if (station.kind === 'window') {
    ctx.fillStyle = '#2b1a12';
    roundRect(ctx, x + 12, y + 8, w - 24, 30, 6);
    ctx.fill();
    text(ctx, 'SERVE', cx, y + 24, 16, GOLD);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(cx, y + 46, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(cx - 14, y + 52, 28, 5);
    return;
  }
  if (station.kind === 'trash') {
    ctx.fillStyle = '#4a6b4f';
    roundRect(ctx, x + 18, y + 6, w - 36, h - 14, 8);
    ctx.fill();
    ctx.fillStyle = '#3a5540';
    roundRect(ctx, x + 12, y, w - 24, 12, 6);
    ctx.fill();
    text(ctx, station.label, cx, y + h - 12, 12, INK);
  }
}

function drawTicket(ctx, order, x, y, width, height) {
  const urgent = order.patience / order.maxPatience < 0.35;
  ctx.fillStyle = urgent && Math.floor(order.patience * 4) % 2 === 0 ? '#ffe1dc' : CREAM;
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? RED : '#cbb98f';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, 8);
  ctx.stroke();
  // The customer's face: a simple round head that watches the kitchen.
  ctx.fillStyle = '#f6c89f';
  ctx.beginPath();
  ctx.arc(x + 24, y + 22, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 19, y + 20, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 29, y + 20, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + 24, y + 25, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  text(ctx, `#${order.customer}`, x + 24, y + 46, 11, '#8a6a4a');
  text(ctx, order.recipe.name, x + 44, y + 18, 14, INK, 'left');
  order.recipe.items.forEach((item, index) => {
    drawIngredient(ctx, item.kind, item.state, x + 58 + index * 30, y + 40, 10);
  });
  // Patience bar.
  const ratio = Math.max(0, order.patience / order.maxPatience);
  ctx.fillStyle = '#e8dcc8';
  roundRect(ctx, x + 44, y + height - 16, width - 56, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? GREEN : ratio > 0.25 ? GOLD : RED;
  roundRect(ctx, x + 44, y + height - 16, (width - 56) * ratio, 8, 4);
  ctx.fill();
}

function drawOrderBoard(ctx, world) {
  ctx.fillStyle = '#5a3a22';
  roundRect(ctx, 12, 8, 880, 84, 12);
  ctx.fill();
  ctx.fillStyle = '#6d4729';
  roundRect(ctx, 12, 8, 880, 84, 12);
  ctx.stroke();
  text(ctx, 'ORDERS', 52, 50, 15, GOLD);
  if (world.orders.length === 0) {
    text(ctx, 'No orders yet — the night is young.', 470, 50, 15, '#d9b48f');
  }
  world.orders.forEach((order, index) => {
    drawTicket(ctx, order, 100 + index * 196, 16, 186, 68);
  });
}

function drawHud(ctx, world) {
  // Shift timer.
  const minutes = Math.floor(world.timeLeft / 60);
  const seconds = Math.floor(world.timeLeft % 60);
  const timerText = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const low = world.timeLeft < 30;
  ctx.fillStyle = low ? '#3d1a12' : '#2b1a12';
  roundRect(ctx, 908, 8, 150, 84, 12);
  ctx.fill();
  text(ctx, 'SHIFT', 983, 28, 12, '#d9b48f');
  text(ctx, timerText, 983, 58, 30, low ? RED : CREAM);
  const ratio = world.timeLeft / 150;
  ctx.fillStyle = '#5a3a22';
  roundRect(ctx, 920, 78, 126, 6, 3);
  ctx.fill();
  ctx.fillStyle = low ? RED : GOLD;
  roundRect(ctx, 920, 78, 126 * ratio, 6, 3);
  ctx.fill();
  // Coins, combo and hearts.
  ctx.fillStyle = '#2b1a12';
  roundRect(ctx, 1074, 8, 194, 84, 12);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(1100, 36, 12, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'C', 1100, 37, 15, '#7a5a10');
  text(ctx, `${world.coins}`, 1120, 37, 22, CREAM, 'left');
  text(ctx, world.combo > 1 ? `COMBO x${(1 + Math.min(world.combo, 10) * 0.1).toFixed(1)}` : 'Serve dishes to build a combo', 1170, 62, 13, world.combo > 1 ? GOLD : '#d9b48f');
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.hearts ? '#e2483d' : 'rgba(255,255,255,0.2)';
    const hx = 1096 + i * 26;
    ctx.beginPath();
    ctx.arc(hx, 78, 6, 0, Math.PI * 2);
    ctx.arc(hx + 9, 78, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 4, 80);
    ctx.lineTo(hx + 13, 80);
    ctx.lineTo(hx + 4.5, 92);
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, 'SERVED', 1172, 82, 11, '#d9b48f', 'left');
  text(ctx, `${world.served}`, 1258, 82, 11, CREAM, 'right');
}

function drawKitchenFloor(ctx, world) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 92, VIEW.width, 62);
  // Hanging lanterns and string lights along the wall.
  drawLantern(ctx, 40, 128, 0.8, world.elapsed * 1.2);
  drawLantern(ctx, 1240, 128, 0.8, world.elapsed * 1.2 + 2);
  ctx.fillStyle = GOLD;
  for (let x = 120; x < 1160; x += 60) {
    ctx.beginPath();
    ctx.arc(x, 108 + Math.sin(x * 0.02) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chequered floor.
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(col * 80, 154 + row * 72, 80, 72);
    }
  }
}

function drawHintBar(ctx, world) {
  const nearest = world.nearestStation();
  let hint = 'WASD / arrows to move — click a station to walk to it';
  if (nearest) {
    const name = nearest.label;
    if (world.hands && world.hands.plate) hint = `Carrying a plate — E at the Serving Window when it matches an order`;
    else if (world.hands) hint = `Carrying ${INGREDIENTS[world.hands.kind]?.name ?? 'food'} — E at ${name}`;
    else hint = `E at ${name}`;
  }
  ctx.fillStyle = 'rgba(43,26,18,0.85)';
  roundRect(ctx, 340, 762, 600, 30, 15);
  ctx.fill();
  text(ctx, hint, 640, 777, 14, CREAM);
}

function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(20,10,6,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawLantern(ctx, 300, 150, 1.4, world.elapsed);
  drawLantern(ctx, 980, 150, 1.4, world.elapsed + 2);
  text(ctx, 'LANTERN & LADLE', 640, 240, 64, GOLD);
  text(ctx, 'a night-market kitchen', 640, 292, 24, CREAM);
  text(ctx, 'Take orders, chop and fry, plate the dish, serve it before the customer walks out.', 640, 350, 18, '#e8dcc8');
  text(ctx, 'Move: WASD / arrows or click  •  Use a station: E or Space  •  Trash: walk to the Compost Bin', 640, 388, 16, '#e8dcc8');
  text(ctx, 'Chop veg & meat on the board, fry in the wok, build the dish on a plate, serve at the window.', 640, 416, 16, '#e8dcc8');
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, 480, 460, 320, 64, 12);
  ctx.fill();
  text(ctx, 'START THE SHIFT  (Enter)', 640, 492, 22, CREAM);
  if (best > 0) text(ctx, `Best shift so far: ${best} coins`, 640, 560, 16, GOLD);
  text(ctx, 'M mute  •  P pause', 640, 600, 14, '#b9a58f');
}

function drawGameOver(ctx, world, best) {
  ctx.fillStyle = 'rgba(20,10,6,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SHIFT OVER', 640, 260, 56, GOLD);
  text(ctx, `You served ${world.served} dishes and earned ${world.coins} coins`, 640, 330, 24, CREAM);
  text(ctx, `Best combo: x${world.bestCombo}   •   Best shift: ${best} coins`, 640, 372, 18, '#e8dcc8');
  if (world.coins >= best && world.coins > 0) text(ctx, 'A new best shift!', 640, 410, 20, GOLD);
  ctx.fillStyle = '#c0392b';
  roundRect(ctx, 480, 460, 320, 64, 12);
  ctx.fill();
  text(ctx, 'COOK AGAIN  (Enter)', 640, 492, 22, CREAM);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(20,10,6,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', 640, 380, 48, CREAM);
  text(ctx, 'Press P to keep cooking', 640, 430, 18, '#e8dcc8');
}

/** Draw one frame of the game. `ui` carries pause state and the best score. */
export function renderGame(ctx, world, ui) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawKitchenFloor(ctx, world);
  for (const station of STATIONS) drawStation(ctx, station, world);
  // Plates waiting on the plating counter.
  world.plates.forEach((plate, index) => {
    if (plate) drawPlate(ctx, plate, PLATE_SLOTS[index].x, PLATE_SLOTS[index].y);
  });
  // The chef walks between the counters.
  drawChef(ctx, world.chef, world.hands);
  // Floating score text.
  for (const floater of world.floaters) {
    ctx.globalAlpha = Math.min(1, floater.life);
    text(ctx, floater.text, floater.x, floater.y, 20, floater.colour);
    ctx.globalAlpha = 1;
  }
  drawOrderBoard(ctx, world);
  drawHud(ctx, world);
  if (world.screen === SCREEN_PLAY) drawHintBar(ctx, world);
  if (world.servedFlash > 0) {
    ctx.fillStyle = `rgba(255,215,106,${world.servedFlash * 0.35})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (world.wrongFlash > 0) {
    ctx.fillStyle = `rgba(255,80,60,${world.wrongFlash * 0.3})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, ui.best);
  if (world.screen === SCREEN_OVER) drawGameOver(ctx, world, ui.best);
  if (ui.paused && world.screen === SCREEN_PLAY) drawPause(ctx);
}

export { RECIPES };
