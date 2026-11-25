// Lantern & Ladle: keyboard and mouse. The game reads movement every frame and
// reports single presses (interact, start, pause, mute) as edge events.

export class KitchenInput {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, down: false };
    this.clickTarget = null;
    this.canvas = canvas;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (!event.repeat) this.pressed.add(key);
    this.keys.add(key);
  }

  onKeyUp(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    this.mouse.y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
  }

  onMouseDown(event) {
    this.onMouseMove(event);
    this.mouse.down = true;
    this.mouse.clicked = true;
    this.clickTarget = { x: this.mouse.x, y: this.mouse.y };
  }

  onMouseUp() {
    this.mouse.down = false;
  }

  /** The held movement vector, from WASD or the arrow keys, in [-1, 1]. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  /** True once for each press of the named key; clears after it is read. */
  wasPressed(...names) {
    for (const name of names) {
      if (this.pressed.has(name)) {
        this.pressed.delete(name);
        return true;
      }
    }
    return false;
  }

  /** True once for a mouse click; clears after it is read. */
  wasClicked() {
    if (this.mouse.clicked) {
      this.mouse.clicked = false;
      return true;
    }
    return false;
  }

  /** The click's position, if one is waiting, else null. */
  takeClickTarget() {
    const target = this.clickTarget;
    this.clickTarget = null;
    return target;
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
