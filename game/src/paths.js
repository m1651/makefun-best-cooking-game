// Lantern & Ladle: walking routes. The kitchen's counters are solid, so the chef
// (and the screenshot autopilot) walks an A* path over a coarse grid instead of
// pushing straight through a counter. Cells are 32 px; a cell is blocked when its
// centre comes within the chef's radius of any counter.

import { CHEF_RADIUS, OBSTACLES, VIEW } from './config.js';

const CELL = 32;
const COLS = Math.ceil(VIEW.width / CELL);
const ROWS = Math.ceil(VIEW.height / CELL);
const TOP = 236;

function cellBlocked(col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  if (y < TOP || x < 20 || x > VIEW.width - 20 || y > VIEW.height - 20) return true;
  for (const rect of OBSTACLES) {
    if (
      x > rect.x - CHEF_RADIUS + 4 &&
      x < rect.x + rect.w + CHEF_RADIUS - 4 &&
      y > rect.y - CHEF_RADIUS + 4 &&
      y < rect.y + rect.h + CHEF_RADIUS - 4
    ) {
      return true;
    }
  }
  return false;
}

function toCell(x, y) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))),
  };
}

function cellCentre(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function key(col, row) {
  return `${col},${row}`;
}

/** The straight line between two points, clear of every counter. */
function lineClear(ax, ay, bx, by) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
  for (let i = 1; i < steps; i += 1) {
    const x = ax + ((bx - ax) * i) / steps;
    const y = ay + ((by - ay) * i) / steps;
    const { col, row } = toCell(x, y);
    if (cellBlocked(col, row)) return false;
  }
  return true;
}

/**
 * A walkable route from (fromX, fromY) to (toX, toY): a list of waypoints the chef
 * can walk straight between, ending exactly at the target. Empty when already there.
 */
export function findPath(fromX, fromY, toX, toY) {
  if (Math.hypot(toX - fromX, toY - fromY) < 4) return [];
  if (lineClear(fromX, fromY, toX, toY)) return [{ x: toX, y: toY }];
  const start = toCell(fromX, fromY);
  const goal = toCell(toX, toY);
  const open = [{ col: start.col, row: start.row, g: 0, f: 0, parent: null }];
  const best = new Map([[key(start.col, start.row), 0]]);
  const closed = new Set();
  const heuristic = (col, row) => Math.hypot(col - goal.col, row - goal.row);
  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIndex].f) bestIndex = i;
    }
    const node = open.splice(bestIndex, 1)[0];
    const nodeKey = key(node.col, node.row);
    if (closed.has(nodeKey)) continue;
    closed.add(nodeKey);
    if (node.col === goal.col && node.row === goal.row) {
      const cells = [];
      let current = node;
      while (current) {
        cells.push(cellCentre(current.col, current.row));
        current = current.parent;
      }
      cells.reverse();
      // Smooth: drop any waypoint the chef can walk to directly.
      const smooth = [];
      let anchor = { x: fromX, y: fromY };
      for (let i = 0; i < cells.length; i += 1) {
        const next = cells[i + 1];
        if (next && lineClear(anchor.x, anchor.y, next.x, next.y)) continue;
        smooth.push(cells[i]);
        anchor = cells[i];
      }
      smooth.push({ x: toX, y: toY });
      return smooth;
    }
    for (let dc = -1; dc <= 1; dc += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (dc === 0 && dr === 0) continue;
        const col = node.col + dc;
        const row = node.row + dr;
        if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
        if (cellBlocked(col, row)) continue;
        // No cutting a corner between two blocked cells.
        if (dc !== 0 && dr !== 0 && (cellBlocked(node.col + dc, node.row) || cellBlocked(node.col, node.row + dr))) continue;
        const g = node.g + (dc !== 0 && dr !== 0 ? 1.414 : 1);
        const k = key(col, row);
        if (best.has(k) && best.get(k) <= g) continue;
        best.set(k, g);
        open.push({ col, row, g, f: g + heuristic(col, row), parent: node });
      }
    }
  }
  return [{ x: toX, y: toY }];
}

/** The next step toward the first waypoint, as a unit move vector. */
export function followPath(chef, waypoints) {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  const target = waypoints[0];
  const dx = target.x - chef.x;
  const dy = target.y - chef.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    waypoints.shift();
    return followPath(chef, waypoints);
  }
  return { x: dx / dist, y: dy / dist };
}
