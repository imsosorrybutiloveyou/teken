import { test } from "node:test";
import assert from "node:assert/strict";
import { CHARACTER_IDS, character } from "./characters.js";
import { createMatch, step, emptyInput, MAX_HP } from "./combat.js";
import { createCampaign, nextArcadeStage, stepArcade } from "./arcade.js";
import { STAGES, wallEdges, constrainToStage, wallImpact } from "./stages.js";
import { FIGHTER_IDENTITIES } from "./identities.js";
function setup(id = "kai") {
  const m = createMatch([id, "kai"]);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
  return m;
}
function hit(
  m,
  key,
  { air = false, count = 0, counter = false, distance = 1 } = {},
) {
  const a = m.fighters[0],
    b = m.fighters[1],
    move = character(a.character).moves[key];
  a.x = b.x - distance;
  a.combo = air ? 2 : 0;
  b.basicAirHits = count;
  if (air) {
    b.y = 0.8;
    b.airOwner = 0;
    b.stun = 0.5;
  }
  if (counter) b.attack = { key: "palm", t: 0, angle: Math.PI };
  a.attack = { key, t: move.windup - 1 / 60, angle: 0 };
  step(m, [emptyInput(), emptyInput()], 1 / 60, true);
  return m.events.find((e) => e.type === "hit");
}
test("airborne jabs and default strings lose damage, with an extra penalty for repeated basics", () => {
  for (const key of ["u", "i", "j", "k", "oneTwo", "finish"]) {
    const first = hit(setup(), key, { air: true }),
      repeat = hit(setup(), key, { air: true, count: 3 });
    const raw = character("kai").moves[key].damage * 0.8 * (1 - 2 * 0.12);
    assert.ok(first?.basicAir);
    assert.ok(first.damage <= Math.round(raw * 0.6));
    assert.ok(repeat.damage <= first.damage);
  }
  const special = hit(setup(), "signature", { air: true });
  assert.equal(special.basicAir, false);
  assert.equal(
    special.damage,
    Math.round(character("kai").moves.signature.damage * 0.8 * (1 - 2 * 0.12)),
  );
});
test("arcade changes maps between every round and opponent without immediate repeats", () => {
  const c = createCampaign("kai", "hard");
  let previous;
  for (let n = 0; n < 20; n++) {
    const map = nextArcadeStage(c, previous, () => 0.2);
    assert.notEqual(map, previous);
    assert.ok(STAGES[map]);
    previous = map;
  }
  const m = setup();
  m.stage = "dojo";
  m.phase = "roundEnd";
  m.phaseTime = 0.001;
  m.wins = [1, 0];
  stepArcade(m, [emptyInput(), emptyInput()], c);
  assert.equal(m.phase, "ready");
  assert.notEqual(m.stage, "dojo");
  assert.equal(c.arenaHistory.at(-1), m.stage);
});
test("wall maps have different actual wall positions and clamp every edge including diagonal corners", () => {
  assert.equal(STAGES.dojo.arena.length, 4);
  assert.equal(STAGES.foundry.arena.length, 6);
  assert.notDeepEqual(STAGES.dojo.arena, STAGES.foundry.arena);
  for (const stage of ["dojo", "foundry"])
    for (const x of [-20, 0, 20])
      for (const z of [-20, 0, 20]) {
        const f = { x, z, vx: x, vz: z };
        constrainToStage(f, stage);
        for (const { a, nx, nz } of wallEdges(stage))
          assert.ok(
            (f.x - a[0]) * nx + (f.z - a[1]) * nz >= 0.5 - 1e-6,
            `${stage} ${x},${z}`,
          );
      }
  assert.equal(wallImpact({ x: 6.45, z: 0 }, 0, "dojo"), true);
  assert.equal(wallImpact({ x: 6.45, z: 0 }, 0, "foundry"), false);
  assert.equal(wallImpact({ x: 8.45, z: 0 }, 0, "foundry"), true);
});
test("seven identities add distinct commands and keep KAI move data unchanged", () => {
  assert.equal(Object.keys(FIGHTER_IDENTITIES).length, 7);
  assert.equal(character("kai").moves.traitStrike, undefined);
  assert.equal(character("kai").moves.u.damage, 8);
  assert.equal(character("kai").moves.electric.damage, 26);
  for (const id of CHARACTER_IDS.filter((x) => x !== "kai")) {
    const p = character(id);
    assert.ok(p.identity);
    assert.ok(p.moves.traitStrike);
    assert.ok(p.commands.some((r) => r[0] === "traitStrike"));
  }
  assert.deepEqual(character("hana").chain, ["j", "k", "j"]);
  assert.equal(character("hana").moves.oneTwo.kind, "roundhouse");
  assert.ok(
    character("hana").moves.j.damage > character("hana").moves.u.damage,
  );
});
test("REN gains additional hand counter damage and MIRA sidesteps when starting her evasive palm", () => {
  const normal = hit(setup("ren"), "i"),
    counter = hit(setup("ren"), "i", { counter: true });
  assert.ok(counter.counter);
  assert.equal(
    counter.damage,
    Math.round(character("ren").moves.i.damage * 1.35),
  );
  assert.ok(counter.damage > normal.damage);
  const m = setup("mira"),
    a = m.fighters[0];
  a.buffer = "traitStrike";
  a.bufferAge = 0;
  step(m, [emptyInput(), emptyInput()]);
  assert.ok(Math.abs(a.z) > 0.25);
  assert.ok(character("mira").moves.traitStrike.highCrushFrom != null);
});
test("SHIN is rewarded for sword tip spacing, while GORO has stronger command throws", () => {
  const close = hit(setup("shin"), "traitStrike", { distance: 1 }),
    tip = hit(setup("shin"), "traitStrike", { distance: 2.6 });
  assert.equal(close.tip, false);
  assert.equal(tip.tip, true);
  assert.equal(tip.damage - close.damage, 6);
  assert.equal(character("goro").moves.traitStrike.level, "throw");
  assert.ok(character("goro").moves.throw.damage > 38);
});
test("ATLAS chips guarded health without a chip KO and his armored attack still loses to lows", () => {
  for (const hp of [MAX_HP, 1]) {
    const m = setup("atlas"),
      a = m.fighters[0],
      b = m.fighters[1],
      move = character("atlas").moves.traitStrike;
    b.hp = hp;
    a.attack = { key: "traitStrike", t: move.windup - 1 / 60, angle: 0 };
    step(m, [emptyInput(), { ...emptyInput(), x: 1 }], 1 / 60, true);
    assert.equal(b.hp, Math.max(1, hp - 4));
    assert.ok(m.events.some((e) => e.type === "block"));
  }
  for (const key of ["u", "low"]) {
    const m = setup("kai"),
      a = m.fighters[0],
      b = m.fighters[1];
    b.character = "atlas";
    b.attack = { key: "traitStrike", t: 0.15, angle: Math.PI };
    a.attack = {
      key,
      t: character("kai").moves[key].windup - 1 / 60,
      angle: 0,
    };
    step(m, [emptyInput(), emptyInput()], 1 / 60, true);
    assert.equal(!!b.attack, key === "u");
  }
});
