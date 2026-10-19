import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  step,
  emptyInput,
  sanitizeInput,
  MAX_HP,
} from "./combat.js";
function setup() {
  const m = createMatch();
  m.phase = "fight";
  m.fighters[0].x = -0.6;
  m.fighters[1].x = 0.6;
  return m;
}
function advance(m, action, defense = {}, frames = 40) {
  for (let n = 0; n < frames; n++)
    step(m, [
      { ...emptyInput(), action: n === 0 ? action : null },
      { ...emptyInput(), ...defense },
    ]);
}
test("attacks damage, standing guard blocks mids, low guard blocks lows", () => {
  let m = setup();
  advance(m, "k");
  assert.equal(m.fighters[1].hp, MAX_HP - 18);
  m = setup();
  advance(m, "k", { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
  m = setup();
  advance(m, "u", { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP - 13);
  m = setup();
  advance(m, "u", { guard: true, crouch: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
});
test("crouch evades highs; throws beat standing guard", () => {
  let m = setup();
  advance(m, "j", { crouch: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
  m = setup();
  advance(m, "o", { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP - 25);
});
test("launcher lifts opponent and buffered jab continues into combo", () => {
  const m = setup();
  advance(m, "i", {}, 18);
  assert.ok(m.fighters[1].y > 0);
  advance(m, "j", {}, 35);
  assert.ok(m.fighters[0].combo >= 2);
  assert.ok(m.fighters[1].hp < MAX_HP - 17);
});
test("side movement can evade an attack locked to its initial axis", () => {
  const m = setup();
  for (let n = 0; n < 35; n++)
    step(m, [
      { ...emptyInput(), action: n === 0 ? "i" : null },
      { ...emptyInput(), z: 1 },
    ]);
  assert.equal(m.fighters[1].hp, MAX_HP);
  assert.ok(m.fighters[1].z > 1);
});
test("rounds end, award wins and reset; first to two ends match", () => {
  const m = setup();
  m.fighters[1].hp = 1;
  advance(m, "j");
  assert.equal(m.wins[0], 1);
  assert.equal(m.phase, "roundEnd");
  for (let n = 0; n < 300; n++) step(m, [emptyInput(), emptyInput()]);
  assert.equal(m.round, 2);
  assert.equal(m.phase, "fight");
  m.fighters[1].hp = 0;
  step(m, [emptyInput(), emptyInput()]);
  assert.equal(m.phase, "matchEnd");
  assert.equal(m.wins[0], 2);
});
test("untrusted inputs are clamped and invalid actions ignored", () => {
  assert.deepEqual(
    sanitizeInput({
      x: Infinity,
      z: 42,
      guard: 1,
      crouch: true,
      action: "__proto__",
    }),
    { x: 0, z: 1, guard: false, crouch: true, action: null },
  );
});
test("J J K produces the three-hit chain and I J K produces an air combo", () => {
  for (const sequence of [
    ["j", "j", "k"],
    ["i", "j", "k"],
  ]) {
    const m = setup();
    for (let n = 0; n < 100; n++)
      step(m, [
        {
          ...emptyInput(),
          action:
            n === 0
              ? sequence[0]
              : n === 18
                ? sequence[1]
                : n === 45
                  ? sequence[2]
                  : null,
        },
        emptyInput(),
      ]);
    assert.equal(m.fighters[0].combo, 3);
    assert.ok(m.fighters[0].comboDamage >= 35);
  }
});
