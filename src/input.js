import { ACTIONS, emptyInput, sanitizeInput } from "./combat.js";
export function keyName(event) {
  const arrows = {
    ArrowLeft: "a",
    ArrowRight: "d",
    ArrowUp: "w",
    ArrowDown: "s",
  };
  if (arrows[event.code]) return arrows[event.code];
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  if (event.code?.startsWith("Shift")) return "shift";
  return event.key.toLowerCase();
}
const STATE_KEYS = ["w", "a", "s", "d", "shift"];
const ATTACK_KEYS = ["u", "i", "j", "k"];
export class KeyboardInput {
  constructor() {
    this.held = new Set();
    this.queue = [];
    this.applied = emptyInput();
    this.pending = null;
    this.recentAttack = null;
  }
  state() {
    return {
      x: (this.held.has("d") ? 1 : 0) - (this.held.has("a") ? 1 : 0),
      z: (this.held.has("s") ? 1 : 0) - (this.held.has("w") ? 1 : 0),
      guard: false,
      crouch: this.held.has("shift"),
      action: null,
    };
  }
  down(key, at, attacksEnabled = true) {
    if (this.held.has(key)) return;
    this.held.add(key);
    if (STATE_KEYS.includes(key))
      this.queue.push({ ...this.state(), readyAt: at });
    if (ATTACK_KEYS.includes(key) && attacksEnabled) {
      if (this.pending && at - this.pending.pressedAt <= 18)
        this.pending.buttons.push(key);
      else {
        // A second hand/foot may arrive just across a simulation boundary.
        const previous = this.recentAttack;
        const buttons =
          previous &&
          at - previous.pressedAt <= 18 &&
          previous.buttons.every((button) => this.held.has(button))
            ? [...previous.buttons, key]
            : [key];
        this.pending = { ...this.state(), buttons, pressedAt: at, readyAt: at };
        this.queue.push(this.pending);
      }
    }
    this.queue = this.queue.slice(-64);
  }
  up(key, at) {
    if (!this.held.delete(key)) return;
    if (STATE_KEYS.includes(key))
      this.queue.push({ ...this.state(), readyAt: at });
  }
  sample(at) {
    const head = this.queue[0];
    if (head && head.readyAt <= at) {
      this.queue.shift();
      let action = null;
      if (head.buttons) {
        const chord = ATTACK_KEYS.filter((k) => head.buttons.includes(k)).join(
          "+",
        );
        action = ACTIONS.includes(chord) ? chord : head.buttons.at(-1);
        if (head === this.pending) {
          this.recentAttack = head;
          this.pending = null;
        }
      }
      this.applied = {
        x: head.x,
        z: head.z,
        guard: head.guard,
        crouch: head.crouch,
        action: null,
      };
      return { ...this.applied, action };
    }
    return { ...this.applied, action: null };
  }
  clear() {
    this.held.clear();
    this.queue = [];
    this.pending = null;
    this.recentAttack = null;
    this.applied = emptyInput();
  }
}
export class RemoteInput {
  constructor() {
    this.clear();
  }
  clear() {
    this.queue = [];
    this.latest = emptyInput();
    this.applied = emptyInput();
  }
  receive(raw) {
    const input = sanitizeInput(raw),
      prev = this.latest;
    if (
      input.action ||
      ["x", "z", "guard", "crouch"].some((k) => input[k] !== prev[k])
    ) {
      this.queue.push(input);
      if (this.queue.length > 64) this.queue.shift();
    }
    this.latest = { ...input, action: null };
  }
  sample() {
    const next = this.queue.shift();
    if (next) {
      this.applied = { ...next, action: null };
      return next;
    }
    return { ...(this.applied ?? this.latest), action: null };
  }
}
