import { test } from "node:test";
import assert from "node:assert/strict";
import { createCPU } from "./arcade.js";
import { createMatch, emptyInput, step } from "./combat.js";
import { CHARACTER_IDS, character } from "./characters.js";
import { spritePose } from "./scene.js";
import { drawKiAura, drawEnergyShot } from "./energy-effects.js";

test("RAON feet and knees stride when walking forward, backward and running on either side", () => {
  for (const side of [0, 1])
    for (const direction of [-1, 1]) {
      const m = createMatch(["raon", "raon"]),
        f = m.fighters[side];
      m.phase = "fight";
      const feet = [],
        knees = [];
      for (let n = 0; n < 30; n++) {
        const inputs = [emptyInput(), emptyInput()];
        inputs[side] = { ...emptyInput(), x: direction * f.facing };
        step(m, inputs);
        const pose = spritePose(f, n / 60);
        feet.push(pose.feet[0][0]);
        knees.push(pose.knees[0][0]);
      }
      assert.ok(Math.max(...feet) - Math.min(...feet) > 5);
      assert.ok(Math.max(...knees) - Math.min(...knees) > 2);
      f.running = true;
      f.move = 1;
      f.travel = 0.1;
      const a = spritePose(f, 0);
      f.travel = 0.4;
      const b = spritePose(f, 0);
      assert.notDeepEqual(a.feet, b.feet);
    }
});

function scenario(id, side, stage = "terminal", distance = 3.6) {
  const m = createMatch([id, id], stage);
  m.phase = "fight";
  const f = m.fighters[side],
    o = m.fighters[1 - side];
  f.x = side ? distance / 2 : -distance / 2;
  o.x = -f.x;
  return { m, f, o, cpu: createCPU("madness") };
}
function play(s, frames = 180) {
  const events = [];
  for (let n = 0; n < frames; n++) {
    const pair = [emptyInput(), emptyInput()];
    pair[s.side] = s.cpu(s.m, s.side);
    step(s.m, pair, 1 / 60, true);
    events.push(...s.m.events);
  }
  return events;
}
test("madness executes real three-tap running attacks for all fighters and both sides", () => {
  for (const id of CHARACTER_IDS)
    for (const side of [0, 1]) {
      const s = { ...scenario(id, side), side };
      const hits = play(s).filter((e) => e.type === "hit" && e.index === side);
      assert.ok(
        hits.some((e) => e.key === "runningKick"),
        `${id} ${side}`,
      );
      assert.equal(
        s.m.events.some((e) => e.type === "noKi"),
        false,
      );
    }
});
test("madness uses one legal wall rebound then follows up without restoring its limit", () => {
  for (const id of CHARACTER_IDS)
    for (const side of [0, 1]) {
      const s = { ...scenario(id, side, "dojo"), side };
      s.o.x = side ? -6.45 : 6.45;
      s.f.x = s.o.x + (side ? 1.35 : -1.35);
      const hits = play(s).filter((e) => e.type === "hit" && e.index === side);
      assert.equal(hits.filter((e) => e.wallSplat).length, 1, `${id} ${side}`);
      assert.ok(
        hits.some((e) => e.combo >= 2),
        `${id} wall follow-up`,
      );
      assert.ok(s.o.wallSplatUsed);
    }
});
test("madness spends real ki to extend a juggle and uses enhanced ranged attacks at two stocks", () => {
  for (const side of [0, 1]) {
    const s = { ...scenario("raon", side, "terminal", 1), side };
    s.f.ki = 20;
    Object.assign(s.o, {
      y: 0.5,
      vy: 4,
      airOwner: side,
      airHits: 3,
      stun: 0.8,
      wallSplatUsed: true,
      bounceUsed: true,
    });
    const events = play(s, 25);
    assert.ok(
      events.some(
        (e) => e.type === "hit" && e.index === side && e.key === "focusBurst",
      ),
    );
    assert.ok(s.f.ki < 20);
    assert.ok(s.o.wallSplatUsed && s.o.bounceUsed);
    const ranged = { ...scenario("raon", side), side };
    ranged.f.ki = 40;
    const shots = play(ranged, 90);
    assert.ok(
      shots.some(
        (e) => e.type === "hit" && e.index === side && e.key === "exWave",
      ),
    );
    assert.ok(ranged.f.ki < 40);
  }
});
test("madness punishes a true whiff instead of guarding its recovery", () => {
  const s = scenario("kai", 1, "terminal", 1);
  const move = character("kai").moves.qcfPunch;
  s.o.attack = {
    key: "qcfPunch",
    t: move.windup + move.active / 60 + 0.01,
    angle: 0,
    hit: false,
    connected: false,
  };
  assert.equal(s.cpu(s.m, 1).action, "i");
});
test("blue meter effects and projectile trails draw finite geometry in both directions", () => {
  const calls = [];
  const c = new Proxy(
    {},
    {
      set(target, key, value) {
        target[key] = value;
        return true;
      },
      get(target, key) {
        return target[key] ?? ((...args) => calls.push([key, ...args]));
      },
    },
  );
  const p = { x: 100, y: 100, scale: 40 };
  for (const facing of [-1, 1])
    for (const progress of [0.02, 0.5, 0.99])
      drawKiAura(c, p, facing, 0.3, progress);
  for (const enhanced of [false, true])
    drawEnergyShot(c, p, Math.PI, 0.5, enhanced);
  assert.ok(calls.filter((c) => c[0] === "ellipse").length > 30);
  assert.ok(calls.filter((c) => c[0] === "lineTo").length > 100);
  assert.ok(
    calls.every((c) =>
      c.slice(1).every((v) => typeof v !== "number" || Number.isFinite(v)),
    ),
  );
  assert.equal(character("raon").moves.qcfPunch.damage, 11);
  assert.equal(character("raon").moves.exWave.damage, 20);
});
