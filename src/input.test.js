import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyboardInput, RemoteInput, keyName } from "./input.js";
import { createMatch, step, emptyInput } from "./combat.js";
test("fast keyboard direction transitions between frames preserve qcf order", () => {
  const k = new KeyboardInput();
  k.down("s", 0);
  k.down("d", 5);
  k.up("s", 10);
  k.down("i", 12);
  k.up("i", 15);
  k.up("d", 17);
  const m = createMatch();
  m.phase = "fight";
  for (let n = 0; n < 12; n++) step(m, [k.sample(n * 17), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
  assert.equal(k.sample(300).x, 0);
});
test("physical keys and arrows work independently of IME key characters", () => {
  assert.equal(keyName({ code: "KeyU", key: "ㅕ" }), "u");
  assert.equal(keyName({ code: "ArrowDown", key: "ArrowDown" }), "s");
});
test("near-simultaneous hands become a throw but sequential hands stay separate", () => {
  const k = new KeyboardInput();
  k.down("u", 0);
  k.down("i", 15);
  assert.equal(k.sample(50).action, "u+i");
  assert.equal(k.sample(70).action, null);
  const seq = new KeyboardInput();
  seq.down("u", 0);
  assert.equal(seq.sample(50).action, "u");
  seq.down("i", 100);
  assert.equal(seq.sample(150).action, "i");
});
test("batched remote packets retain all directions and a single attack without repeats", () => {
  const r = new RemoteInput();
  for (const input of [
    { z: 1 },
    { x: 1, z: 1 },
    { x: 1 },
    { x: 1, action: "i" },
    {},
  ])
    r.receive(input);
  const m = createMatch();
  m.phase = "fight";
  for (let n = 0; n < 20; n++) step(m, [r.sample(), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
  assert.equal(r.sample().action, null);
});
test("clearing input removes held, queued and applied movement", () => {
  const k = new KeyboardInput();
  k.down("d", 0);
  k.sample(1);
  k.clear();
  assert.deepEqual(k.sample(20), emptyInput());
  const r = new RemoteInput();
  r.receive({ x: 1 });
  r.sample();
  r.clear();
  assert.deepEqual(r.sample(), emptyInput());
});
