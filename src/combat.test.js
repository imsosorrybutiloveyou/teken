import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  step,
  emptyInput,
  sanitizeInput,
  MAX_HP,
  WALK_SPEED,
  DASH_SPEED,
  MOVES,
} from "./combat.js";
function setup() {
  const m = createMatch();
  m.phase = "fight";
  m.fighters[0].x = -0.6;
  m.fighters[1].x = 0.6;
  return m;
}
function feed(m, input = {}, frames = 1, index = 0, defense = {}) {
  for (let n = 0; n < frames; n++) {
    const inputs = [emptyInput(), emptyInput()];
    inputs[index] = {
      ...emptyInput(),
      ...input,
      action: n === 0 ? (input.action ?? null) : null,
    };
    inputs[1 - index] = { ...emptyInput(), ...defense };
    step(m, inputs);
  }
  return m.fighters[index];
}
function sequence(m, dirs, action, index = 0) {
  for (const dir of dirs) feed(m, dir, 3, index);
  feed(m, { ...dirs.at(-1), action }, 1, index);
  return m.fighters[index];
}
test("four limb buttons map to left punch, right punch, left kick and right kick", () => {
  for (const [key, kind] of Object.entries({
    u: "leftPunch",
    i: "rightPunch",
    j: "leftKick",
    k: "rightKick",
  })) {
    const m = setup();
    feed(m, { action: key });
    assert.equal(MOVES[m.fighters[0].attack.key].kind, kind);
  }
});
test("standing guard blocks mids; low kick needs low guard; crouch evades highs", () => {
  let m = setup();
  feed(m, { action: "k" }, 40, 0, { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
  m = setup();
  feed(m, { z: 1, action: "j" }, 40, 0, { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP - 13);
  m = setup();
  feed(m, { z: 1, action: "j" }, 40, 0, { guard: true, crouch: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
  m = setup();
  feed(m, { action: "u" }, 40, 0, { crouch: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
});
test("simultaneous punches throw through guard, simultaneous kicks sweep low", () => {
  let m = setup();
  feed(m, { action: "u+i" }, 55, 0, { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP - 25);
  m = setup();
  feed(m, { action: "j+k" }, 45, 0, { guard: true });
  assert.equal(m.fighters[1].hp, MAX_HP - 22);
});
test("quarter circle forward is mirrored relative to each fighter", () => {
  for (const index of [0, 1]) {
    const m = setup(),
      forward = index === 0 ? 1 : -1;
    const f = sequence(
      m,
      [{ z: 1 }, { x: forward, z: 1 }, { x: forward }],
      "i",
      index,
    );
    assert.equal(f.attack.key, "qcfPunch");
  }
});
test("dragon punch, qcf kick, back-forward palm and directional moves work", () => {
  const cases = [
    [[{ x: 1 }, { z: 1 }, { x: 1, z: 1 }], "i", "dragon"],
    [[{ z: 1 }, { x: 1, z: 1 }, { x: 1 }], "k", "qcfKick"],
    [[{ x: -1 }, { x: 1 }], "u", "palm"],
    [[{ x: 1, z: 1 }], "i", "upper"],
    [[{ z: -1 }], "j", "hopKick"],
    [[{ x: -1 }], "k", "backKick"],
  ];
  for (const [dirs, key, expected] of cases) {
    const m = setup();
    assert.equal(sequence(m, dirs, key).attack.key, expected);
  }
});
test("commands expire and invalid partial sequences do not activate a special", () => {
  let m = setup();
  feed(m, { z: 1 }, 4);
  feed(m, { x: 1, z: 1 }, 4);
  feed(m, {}, 60);
  feed(m, { x: 1, action: "i" });
  assert.equal(m.fighters[0].attack.key, "i");
  m = setup();
  assert.equal(sequence(m, [{ z: 1 }, { x: 1 }], "i").attack.key, "i");
});
test("double forward dashes and f,f+RP produces dash impact", () => {
  const m = setup();
  feed(m, { x: 1 }, 2);
  feed(m, {}, 2);
  feed(m, { x: 1 }, 1);
  assert.ok(m.fighters[0].dash > 0);
  const x = m.fighters[0].x;
  feed(m, { x: 1 }, 1);
  assert.ok(m.fighters[0].x - x > WALK_SPEED / 60);
  feed(m, { x: 1, action: "i" });
  assert.equal(m.fighters[0].attack.key, "dashPunch");
  assert.ok(DASH_SPEED > WALK_SPEED);
});
test("walk speed is increased and the world has no old radius clamp", () => {
  const m = setup();
  m.fighters[0].x = 10;
  m.fighters[1].x = 50;
  feed(m, { x: -1 }, 60);
  assert.ok(Math.abs(m.fighters[0].x - (10 - WALK_SPEED)) < 0.001);
  for (let n = 0; n < 900; n++)
    step(m, [
      { ...emptyInput(), x: 1, z: 1 },
      { ...emptyInput(), x: 1, z: 1 },
    ]);
  assert.ok(m.fighters[0].x > 50);
  assert.ok(m.fighters[0].z > 50);
  assert.ok(m.fighters[1].x > 90);
});
test("directional command is resolved at input time while buffered during recovery", () => {
  const m = setup();
  feed(m, { action: "k" }, 3);
  sequence(m, [{ z: 1 }, { x: 1, z: 1 }, { x: 1 }], "i");
  assert.equal(m.fighters[0].buffer, "qcfPunch");
  feed(m, {}, 28);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
});
test("U I K string and df+I U I K air combo connect", () => {
  const m = setup();
  feed(m, { action: "u" }, 7);
  feed(m, { action: "i" }, 9);
  feed(m, { action: "k" }, 35);
  assert.equal(m.fighters[0].combo, 3);
  assert.ok(m.fighters[0].comboDamage >= 35);
  const air = setup();
  feed(air, { x: 1, z: 1, action: "i" }, 16);
  assert.ok(air.fighters[1].y > 0);
  feed(air, { action: "u" }, 15);
  feed(air, { action: "i" }, 14);
  feed(air, { action: "k" }, 30);
  assert.equal(air.fighters[0].combo, 4);
});
test("depth movement evades an attack locked to its initial axis", () => {
  const m = setup();
  for (let n = 0; n < 35; n++)
    step(m, [
      { ...emptyInput(), action: n === 0 ? "k" : null },
      { ...emptyInput(), z: 1 },
    ]);
  assert.equal(m.fighters[1].hp, MAX_HP);
  assert.ok(m.fighters[1].z > 2);
});
test("rounds and first-to-two match outcome still work", () => {
  const m = setup();
  m.fighters[1].hp = 1;
  feed(m, { action: "u" }, 30);
  assert.equal(m.wins[0], 1);
  assert.equal(m.phase, "roundEnd");
  feed(m, {}, 300);
  assert.equal(m.round, 2);
  assert.equal(m.phase, "fight");
  m.fighters[1].hp = 0;
  feed(m);
  assert.equal(m.phase, "matchEnd");
  assert.equal(m.wins[0], 2);
});
test("untrusted inputs are clamped and invalid attack identifiers are rejected", () => {
  assert.deepEqual(
    sanitizeInput({
      x: Infinity,
      z: 42,
      guard: 1,
      crouch: true,
      action: "qcfPunch",
    }),
    { x: 0, z: 1, guard: false, crouch: true, action: null },
  );
  assert.equal(sanitizeInput({ action: "u+i" }).action, "u+i");
  assert.equal(sanitizeInput({ action: "o" }).action, null);
});
