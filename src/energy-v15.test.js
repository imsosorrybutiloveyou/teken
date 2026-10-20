import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatch, step, emptyInput, RUN_SPEED } from "./combat.js";
import { character, chooseFighter, CHARACTER_IDS } from "./characters.js";
import { validSnapshot } from "./network.js";

function setup(ids = ["raon", "kai"]) {
  const m = createMatch(ids);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
  return m;
}
function hit(m, key = "u", index = 0) {
  m.hitstop = 0;
  const f = m.fighters[index];
  f.attack = {
    key,
    t: character(f.character).moves[key].windup - 1 / 60,
    angle: index ? Math.PI : 0,
  };
  step(m, [emptyInput(), emptyInput()], 1 / 60, true);
  return m.events.find((e) => e.type === "hit");
}
test("nine real fighters and random selection resolve into valid concrete characters", () => {
  assert.equal(CHARACTER_IDS.length, 9);
  assert.equal(
    chooseFighter("random", () => 0),
    "kai",
  );
  assert.equal(
    chooseFighter("random", () => 0.999),
    "raon",
  );
  assert.equal(chooseFighter("raon"), "raon");
});
test("ki carries into the next round but a fresh match starts empty", () => {
  const m = setup();
  m.fighters[0].ki = 23.25;
  m.phase = "roundEnd";
  m.phaseTime = 0.001;
  m.wins = [1, 0];
  step(m, [emptyInput(), emptyInput()]);
  assert.equal(m.fighters[0].ki, 23.25);
  assert.equal(setup().fighters[0].ki, 0);
  m.projectiles = [{ index: 0, key: "u", x: 0, y: 1, z: 0, angle: 0, life: 1 }];
  assert.equal(validSnapshot(m), false);
});
test("ki builds in twentieths on real hits, quarter-points on damage taken, and caps at two stocks", () => {
  const m = setup(["raon", "raon"]),
    a = m.fighters[0],
    b = m.fighters[1];
  for (let n = 0; n < 20; n++) {
    a.x = -0.5;
    b.x = 0.5;
    a.stun = b.stun = 0;
    assert.ok(hit(m));
  }
  assert.equal(a.ki, 20);
  assert.equal(b.ki, 5);
  a.ki = 39.75;
  a.stun = b.stun = 0;
  a.x = -0.5;
  b.x = 0.5;
  hit(m);
  assert.equal(a.ki, 40);
  const miss = setup();
  miss.fighters[1].x = 8;
  assert.equal(hit(miss), undefined);
  assert.equal(miss.fighters[0].ki, 0);
});
test("meter attacks cannot start without a stock, and consume exactly one stock on start", () => {
  for (const ki of [0, 19.75, 20, 40]) {
    const m = setup(),
      f = m.fighters[0];
    f.ki = ki;
    step(m, [{ ...emptyInput(), action: "j+k" }, emptyInput()]);
    assert.equal(f.attack?.key, ki < 20 ? undefined : "focusBurst");
    assert.equal(f.ki, ki < 20 ? ki : ki - 20);
    assert.equal(
      m.events.some((e) => e.type === "noKi"),
      ki < 20,
    );
  }
});
test("paid combo extension relifts the opponent without resetting floor or wall limits", () => {
  const m = setup(),
    a = m.fighters[0],
    b = m.fighters[1];
  a.ki = 20;
  a.combo = 3;
  b.y = 0.4;
  b.airOwner = 0;
  b.airHits = 5;
  b.stun = 0.4;
  b.bounceUsed = b.wallSplatUsed = true;
  step(m, [{ ...emptyInput(), action: "j+k" }, emptyInput()], 1 / 60, true);
  let e;
  for (let n = 0; n < 15 && !e; n++) {
    step(m, [emptyInput(), emptyInput()], 1 / 60, true);
    e = m.events.find((e) => e.type === "hit");
  }
  assert.ok(e && e.key === "focusBurst");
  assert.equal(a.ki, 0);
  assert.equal(b.vy, 6.5);
  assert.ok(b.bounceUsed && b.wallSplatUsed);
  assert.ok(b.stun >= 0.8);
});
test("a traveling fireball hits straight ahead and is avoided by either sideways direction", () => {
  for (const orbit of [-1, 0, 1]) {
    const m = setup();
    m.fighters[0].x = -2.5;
    m.fighters[1].x = 2.5;
    m.fighters[0].buffer = "qcfPunch";
    m.fighters[0].bufferAge = 0;
    let visible = false,
      connected = false;
    for (let n = 0; n < 150; n++) {
      step(m, [emptyInput(), { ...emptyInput(), orbit }], 1 / 60, true);
      visible ||= m.projectiles.length > 0;
      connected ||= m.events.some((e) => e.type === "hit");
      assert.ok(validSnapshot(m));
    }
    assert.ok(visible);
    assert.equal(connected, orbit === 0);
    assert.equal(m.projectiles.length, 0);
  }
});
test("punishment damage is reduced without changing the punish window, and repeated air hits push farther", () => {
  for (const punish of [false, true]) {
    const m = setup(["kai", "ren"]),
      b = m.fighters[1];
    if (punish)
      b.attack = { key: "qcfPunch", blocked: true, t: 0.5, angle: Math.PI };
    const e = hit(m);
    assert.equal(e.punish, punish);
    assert.equal(
      e.damage,
      Math.round(character("kai").moves.u.damage * (punish ? 0.85 : 1)),
    );
    assert.equal(m.fighters[0].punishCombo, punish);
  }
  for (const count of [0, 3, 6]) {
    const m = setup(["kai", "ren"]),
      b = m.fighters[1];
    b.y = 0.8;
    b.airOwner = 0;
    b.airHits = count;
    hit(m);
    const old =
      character("kai").moves.u.push * (0.46 + count * 0.22) + count * 0.28;
    assert.ok(b.vx > old * 1.2);
  }
});
test("holding the second forward tap transitions from dash to run, and releasing stops it", () => {
  const m = setup(),
    f = m.fighters[0];
  m.fighters[1].x = 50;
  const forward = { ...emptyInput(), x: 1 };
  step(m, [forward, emptyInput()]);
  step(m, [emptyInput(), emptyInput()]);
  step(m, [forward, emptyInput()]);
  assert.ok(f.dash > 0 && !f.running);
  for (let n = 0; n < 22; n++) step(m, [forward, emptyInput()]);
  assert.ok(f.running);
  const x = f.x;
  step(m, [forward, emptyInput()]);
  assert.ok(
    Math.abs(f.x - x - (RUN_SPEED * character("raon").speed) / 60) < 1e-8,
  );
  step(m, [emptyInput(), emptyInput()]);
  assert.equal(f.running, false);
  f.ki = 41;
  assert.equal(validSnapshot(m), false);
});
