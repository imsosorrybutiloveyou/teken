import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  step,
  emptyInput,
  resolveMove,
  stepPractice,
} from "./combat.js";
import { character, CHARACTER_IDS } from "./characters.js";
import { STAGES, chooseStage } from "./stages.js";
import { createCPU } from "./arcade.js";
import ROUTES from "./combo-routes.json" with { type: "json" };
function setup(stage = "terminal") {
  const m = createMatch(["kai", "ren"], stage);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
  return m;
}
function feed(m, input = {}, frames = 1, index = 0) {
  for (let n = 0; n < frames; n++) {
    const pair = [emptyInput(), emptyInput()];
    pair[index] = {
      ...emptyInput(),
      ...input,
      action: n === 0 ? (input.action ?? null) : null,
    };
    step(m, pair, 1 / 60, true);
  }
}
test("short vertical taps step once, long holds crouch/jump and repeated hold continuously orbits", () => {
  for (const sign of [-1, 1]) {
    const m = setup(),
      a = m.fighters[0];
    feed(m, { z: sign }, 3);
    assert.equal(a.y, 0);
    assert.equal(a.crouch, false);
    feed(m, {}, 6);
    assert.ok(Math.abs(a.z) > 0.15);
    assert.equal(a.y, 0);
    feed(m, { z: sign }, 12);
    assert.equal(a.y, 0);
    assert.equal(a.crouch, false);
    assert.ok(a.effectiveOrbit !== 0);
    const z = a.z;
    feed(m, { z: sign }, 15);
    assert.notEqual(a.z, z);
  }
  const up = setup();
  feed(up, { z: -1 }, 10);
  assert.ok(up.fighters[0].jumpActive && up.fighters[0].y > 0);
  const down = setup();
  feed(down, { z: 1 }, 10);
  assert.equal(down.fighters[0].crouch, true);
});
test("back-back produces a guarded retreat burst faster than a single back input", () => {
  const a = setup(),
    b = setup();
  feed(a, { x: -1 });
  feed(a);
  feed(a, { x: -1 }, 6);
  feed(b, { x: -1 }, 8);
  assert.ok(a.fighters[0].x < b.fighters[0].x - 0.1);
  assert.equal(a.fighters[0].guard, true);
});
test("every roster has homing and distinctive skills, only exact timing gives just enhancements", () => {
  for (const id of CHARACTER_IDS) {
    const p = character(id);
    assert.ok(p.moves.homingStrike.homing);
    assert.ok(p.moves.signature);
    assert.ok(p.moves.throw.range >= 1.75);
  }
  for (const id of ["kai", "ren", "shin"]) {
    const m = createMatch([id, "kai"]),
      f = m.fighters[0],
      p = character(id),
      key = id === "kai" ? "electric" : "justStrike",
      rule = p.commands.find((r) => r[0] === key);
    f.commands = rule[2].map((dir, i) => ({ dir, at: i * 0.04 }));
    f.direction = rule[2].at(-1);
    f.commandTime = f.commands.at(-1).at;
    assert.equal(resolveMove(f, rule[1]), key);
    f.commandTime += 1 / 60;
    assert.notEqual(resolveMove(f, rule[1]), key);
  }
});
test("asymmetric tracking follows one angular side and homing follows either side", () => {
  for (const sign of [-1, 1])
    for (const key of ["signature", "homingStrike"]) {
      const m = setup(),
        a = m.fighters[0],
        b = m.fighters[1];
      b.z = sign * 0.4;
      a.attack = { key, t: 0, angle: 0 };
      feed(m);
      const angle = a.attack.angle;
      if (
        key === "homingStrike" ||
        sign === character("kai").moves.signature.trackSide
      )
        assert.ok(Math.abs(angle) > 0);
      else assert.equal(angle, 0);
    }
});
test("walled stages clamp movement and orbit; infinite stages permit travel", () => {
  const m = setup("dojo");
  m.fighters[0].x = 6.49;
  m.fighters[0].z = 6.49;
  m.fighters[1].x = 3;
  feed(m, { x: 1, orbit: 1 }, 120);
  for (const f of m.fighters) {
    assert.ok(Math.abs(f.x) <= 6.5);
    assert.ok(Math.abs(f.z) <= 6.5);
  }
  const open = setup("forest");
  feed(open, { x: -1 }, 240);
  assert.ok(open.fighters[0].x < -7);
  assert.equal(
    chooseStage("random", () => 0.99),
    "foundry",
  );
  assert.equal(chooseStage("invalid"), "terminal");
  assert.equal(chooseStage("toString"), "terminal");
});
test("wall hits grant bonus then end the juggle on the third impact", () => {
  const m = setup("dojo"),
    a = m.fighters[0],
    b = m.fighters[1];
  b.x = 6.4;
  b.y = 0.8;
  b.airOwner = 0;
  a.x = 5.4;
  for (let n = 0; n < 3; n++) {
    m.hitstop = 0;
    b.y = 0.8;
    b.vy = 0;
    a.x = b.x - 1;
    a.z = b.z;
    a.attack = {
      key: "u",
      t: character("kai").moves.u.windup - 1 / 60,
      angle: 0,
    };
    feed(m);
    const hit = m.events.find((e) => e.type === "hit");
    assert.ok(hit?.wall);
    assert.equal(hit.wallBonus, n === 0 ? 6 : n === 1 ? 3 : 0);
  }
  assert.equal(b.wallHits, 3);
  assert.ok(b.downTime > 0 && b.vy < 0);
  assert.equal(b.airOwner, -1);
});
test("hop follow-up is a grounded named technique only during a juggle", () => {
  for (const combo of [false, true]) {
    const m = setup(),
      a = m.fighters[0],
      b = m.fighters[1],
      p = character("kai");
    if (combo) {
      b.y = 0.7;
      b.airOwner = 0;
    }
    a.buffer = "runningKick";
    a.bufferAge = 0;
    feed(m);
    assert.equal(a.hopCombo, combo);
    assert.equal(a.jumpActive, !combo);
    a.attack.connected = true;
    a.attack.t = p.moves.runningKick.windup;
    assert.equal(resolveMove(a, "u"), combo ? "rushLink" : "jumpPunch");
  }
});
test("training can put the player on 2P while CPU/dummy occupies 1P", () => {
  const m = setup();
  m.fighters[0].downTime = 0.4;
  m.fighters[0].stun = 0;
  stepPractice(
    m,
    { ...emptyInput(), action: "u" },
    { behavior: "dummy", playerIndex: 1 },
  );
  assert.equal(m.fighters[0].downTime, 0);
  assert.equal(m.fighters[1].lastMove, "u");
});
test("madness has generated damage-ranked routes and whiff/throw decisions from observed states", () => {
  for (const id of CHARACTER_IDS)
    for (const stage of ["terminal", "dojo"]) {
      const routes = ROUTES[id]?.[stage];
      assert.ok(routes?.length);
      assert.ok(routes[0].damage >= routes.at(-1).damage);
      assert.ok(routes[0].keys.length >= 2);
    }
  const m = setup(),
    a = m.fighters[0],
    b = m.fighters[1],
    cpu = createCPU("madness");
  a.attack = {
    key: "qcfPunch",
    t: 0.4,
    angle: 0,
    hit: true,
    connected: false,
  };
  const input = cpu(m, 1);
  assert.equal(
    input.action,
    character("ren").commands.find((r) => r[0] === "upper")[1],
  );
  assert.equal(input.z, 1);
  a.attack = null;
  a.guard = true;
  b.attack = null;
  b.stun = 0;
  let thrown = false;
  for (let n = 0; n < 30; n++) {
    m.tick++;
    thrown ||= cpu(m, 1).action === "u+i";
  }
  assert.ok(thrown);
});

test("crouch blocking a wake-up low guarantees a neutral-I while-rising launcher on either side", () => {
  for (const defender of [0, 1]) {
    const m = createMatch(["kai", "kai"]);
    m.phase = "fight";
    m.fighters[0].x = -0.5;
    m.fighters[1].x = 0.5;
    const d = m.fighters[defender],
      a = m.fighters[1 - defender];
    a.attack = {
      key: "wakeLow",
      t: character("kai").moves.wakeLow.windup - 1 / 60,
      angle: defender === 1 ? 0 : Math.PI,
    };
    let sent = false,
      punished = false;
    for (let frame = 0; frame < 100; frame++) {
      const input = [emptyInput(), emptyInput()];
      input[1 - defender] = { ...emptyInput(), x: -a.facing };
      input[defender] = { ...emptyInput(), x: -d.facing, z: 1, crouch: true };
      if (d.blockstun && d.stun <= 6 / 60 && !sent) {
        input[defender] = { ...emptyInput(), action: "i" };
        sent = true;
      } else if (sent) input[defender] = emptyInput();
      step(m, input, 1 / 60, true);
      punished ||= m.events.some(
        (e) =>
          e.type === "hit" &&
          e.index === defender &&
          e.key === "risingUpper" &&
          e.punish,
      );
    }
    assert.ok(sent && punished);
  }
});

test("wide linear strike catches a short sidestep but continuous sidewalk evades it", () => {
  for (const walk of [false, true]) {
    const m = setup();
    m.fighters[0].attack = { key: "palm", t: 0, angle: 0 };
    let hit = false;
    for (let n = 0; n < 40; n++) {
      step(
        m,
        [
          emptyInput(),
          {
            ...emptyInput(),
            ...(walk ? { orbit: 1 } : n < 3 ? { z: -1 } : {}),
          },
        ],
        1 / 60,
        true,
      );
      hit ||= m.events.some((e) => e.type === "hit");
    }
    assert.equal(hit, !walk);
  }
});

test("stored highest-damage routes replay through real inputs and reproduce their recorded damage", async () => {
  const { commandInputs } = await import("./combo-search.js");
  for (const id of CHARACTER_IDS)
    for (const stage of ["terminal", "dojo"]) {
      const m = createMatch([id, "kai"], stage);
      m.phase = "fight";
      m.fighters[0].x = -0.5;
      m.fighters[1].x = 0.5;
      if (stage === "dojo") {
        m.fighters[1].x = 6.45;
        m.fighters[0].x = 5.45;
      }
      let queue = commandInputs(m.fighters[0], "upper");
      for (let n = 0; n < 90; n++) {
        step(m, [queue.shift() ?? emptyInput(), emptyInput()], 1 / 60, true);
        if (m.fighters[1].airOwner === 0) break;
      }
      const route = ROUTES[id][stage][0];
      let damage = 0;
      for (const key of route.keys) {
        queue = commandInputs(m.fighters[0], key);
        let hit = null;
        for (let n = 0; n < 90; n++) {
          step(m, [queue.shift() ?? emptyInput(), emptyInput()], 1 / 60, true);
          hit = m.events.find((e) => e.type === "hit" && e.index === 0);
          if (hit) break;
        }
        assert.ok(hit, `${id} ${stage} ${key}`);
        damage += hit.damage;
      }
      assert.equal(damage, route.damage, `${id} ${stage}`);
    }
});
