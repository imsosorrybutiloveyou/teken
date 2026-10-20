import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatch, step, emptyInput } from "./combat.js";
import { CHARACTERS, character } from "./characters.js";
import { wallEdges } from "./stages.js";
import { validSnapshot } from "./network.js";

function setup(stage = "dojo", air = false) {
  const m = createMatch(["kai", "ren"], stage);
  m.phase = "fight";
  m.fighters[0].x = 5.4;
  m.fighters[1].x = 6.4;
  if (air) {
    m.fighters[0].combo = 1;
    m.fighters[1].y = 0.8;
    m.fighters[1].airOwner = 0;
    m.fighters[1].stun = 0.3;
  }
  return m;
}
function hit(m, key = "dashPunch", defense = emptyInput()) {
  m.hitstop = 0;
  const a = m.fighters[0];
  a.attack = {
    key,
    t: character(a.character).moves[key].windup - 1 / 60,
    angle: 0,
  };
  step(m, [emptyInput(), defense], 1 / 60, true);
  return m.events.find((e) => e.type === "hit");
}
test("advancing strikes rebound off real walls from standing or airborne, leaving a juggle opportunity", () => {
  for (const air of [false, true]) {
    const m = setup("dojo", air),
      b = m.fighters[1],
      e = hit(m);
    assert.ok(e.wallSplat && e.wall);
    assert.equal(e.wallBonus, 6);
    assert.ok(b.wallSplatUsed && b.vy > 0 && b.y > 0 && b.vx < 0);
    assert.equal(b.downTime, 0);
    assert.equal(b.airOwner, 0);
    assert.equal(b.bounceUsed, false);
    assert.ok(validSnapshot(m));
    let follow;
    for (let n = 0; n < 70 && !follow; n++) {
      step(
        m,
        [{ ...emptyInput(), action: n === 0 ? "u" : null }, emptyInput()],
        1 / 60,
        true,
      );
      follow = m.events.find((e) => e.type === "hit");
    }
    assert.ok(follow, "a buffered physical jab connects after the rebound");
    assert.equal(m.fighters[0].combo, air ? 3 : 2);
  }
});
test("wall rebound and floor bound each work once, while a second wall splat ends the juggle", () => {
  for (const floorBoundUsed of [false, true]) {
    const m = setup("dojo", true),
      b = m.fighters[1];
    b.bounceUsed = floorBoundUsed;
    assert.ok(hit(m).wallSplat);
    assert.equal(b.bounceUsed, floorBoundUsed);
    b.x = 6.4;
    b.y = 0.8;
    b.vy = 0;
    m.fighters[0].x = 5.4;
    const second = hit(m, "rushStrike");
    assert.equal(second.wallSplat, false);
    assert.ok(b.vy < 0 && b.downTime > 0 && !b.bouncePending);
    assert.equal(b.airOwner, -1);
  }
});
test("walls require a designated hit and correct geometry; guards and open stages do not rebound", () => {
  assert.equal(hit(setup(), "u").wallSplat, false);
  assert.equal(hit(setup("terminal")).wallSplat, false);
  assert.equal(hit(setup("foundry")).wallSplat, false);
  const guard = setup();
  assert.equal(hit(guard, "dashPunch", { ...emptyInput(), x: 1 }), undefined);
  assert.equal(guard.fighters[1].wallSplatUsed, false);
  const diagonal = setup("foundry"),
    a = diagonal.fighters[0],
    b = diagonal.fighters[1];
  a.x = 6.5;
  b.x = 7.5;
  a.z = b.z = -5;
  assert.ok(hit(diagonal).wallSplat);
  assert.ok(
    b.vx < 0 && b.vz > 0,
    "diagonal wall rebounds along its inward normal",
  );
  for (const { a: point, nx, nz } of wallEdges("foundry"))
    assert.ok((b.x - point[0]) * nx + (b.z - point[1]) * nz >= 0.5 - 1e-6);
});
test("new combos regain a wall rebound, all fighters have advancing wall moves, and malformed snapshots are rejected", () => {
  const m = setup();
  m.fighters[1].wallSplatUsed = true;
  m.fighters[1].wallHits = 2;
  assert.ok(hit(m).wallSplat);
  for (const p of Object.values(CHARACTERS)) {
    assert.ok(p.moves.rushStrike.wallSplat, p.id);
    assert.ok(p.moves.sideKick.wallSplat, p.id);
    assert.equal(!!p.moves.u.wallSplat, false);
  }
  m.fighters[1].wallSplatUsed = "yes";
  assert.equal(validSnapshot(m), false);
});
