// input.js: keyboard and mouse, turned into one input object per step.
// One clear job: listen, remember, and hand the world a clean input.

const KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class Input {
  constructor(canvas, toWorld) {
    this.held = { up: false, down: false, left: false, right: false, sneak: false };
    this.enterPressed = false;
    this.smokeQueued = false;
    this.coinQueued = false;
    this.mouse = { x: 0, y: 0 };
    this.click = null;
    this.toWorld = toWorld;
    window.addEventListener('keydown', (event) => {
      if (KEYS[event.key] || event.key === 'ShiftLeft' || event.key === 'ShiftRight') {
        event.preventDefault();
      }
      const dir = KEYS[event.code] || KEYS[event.key];
      if (dir) this.held[dir] = true;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.held.sneak = true;
      if (event.code === 'Enter') this.enterPressed = true;
      if (event.code === 'KeyQ' && !event.repeat) this.smokeQueued = true;
      if (event.code === 'KeyE' && !event.repeat) this.coinQueued = true;
    });
    window.addEventListener('keyup', (event) => {
      const dir = KEYS[event.code] || KEYS[event.key];
      if (dir) this.held[dir] = false;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.held.sneak = false;
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const p = this.toWorld(event.clientX - rect.left, event.clientY - rect.top);
      this.click = p;
    });
  }

  // Read one step's input and clear the one-shot flags.
  read() {
    let dx = 0;
    let dy = 0;
    if (this.held.left) dx -= 1;
    if (this.held.right) dx += 1;
    if (this.held.up) dy -= 1;
    if (this.held.down) dy += 1;
    const out = {
      dx,
      dy,
      sneak: this.held.sneak,
      smoke: this.smokeQueued,
      coin: this.coinQueued,
      coinX: 0,
      coinY: 0,
      clickX: null,
      clickY: null,
      enter: this.enterPressed,
    };
    if (this.coinQueued) {
      const p = this.toWorld(this.mouse.x, this.mouse.y);
      out.coinX = p.x;
      out.coinY = p.y;
    }
    if (this.click) {
      out.clickX = this.click.x;
      out.clickY = this.click.y;
      this.click = null;
    }
    this.smokeQueued = false;
    this.coinQueued = false;
    this.enterPressed = false;
    return out;
  }
}
