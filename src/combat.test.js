import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  step,
  emptyInput,
  MAX_HP,
  WALK_SPEED,
  SIDESTEP_SPEED,
  DASH_SPEED,
  resolveMove,
} from "./combat.js";
import { CHARACTERS, CHARACTER_IDS, character, moveFor } from "./characters.js";
function setup(ids = ["kai", "ren"]) {
  const m = createMatch(ids);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
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
function dirInput(dir, index = 0) {
  const f = dir % 3 === 1 ? -1 : dir % 3 === 0 ? 1 : 0;
  return { x: f * (index === 0 ? 1 : -1), z: dir <= 3 ? 1 : dir >= 7 ? -1 : 0 };
}
test("four fighters have independently authored commands, startup and recovery", () => {
  assert.equal(CHARACTER_IDS.length, 4);
  const signatures = CHARACTER_IDS.map(
    (id) => character(id).moves.qcfPunch.command,
  );
  assert.equal(new Set(signatures).size, 4);
  assert.equal(
    new Set(CHARACTER_IDS.map((id) => character(id).moves.u.startup)).size,
    4,
  );
  for (const id of CHARACTER_IDS) {
    assert.equal(Object.keys(character(id).moves).length, 25);
    for (const move of Object.values(character(id).moves)) {
      assert.equal(
        move.duration,
        (move.startup + move.active + move.recovery) / 60,
      );
      assert.ok(move.blockStun > 0);
    }
  }
});
test("all four basic buttons keep their limb identity", () => {
  for (const id of CHARACTER_IDS)
    for (const [key, kind] of Object.entries({
      u: "leftPunch",
      i: "rightPunch",
      j: "leftKick",
      k: "rightKick",
    })) {
      const m = setup([id, "kai"]);
      feed(m, { action: key });
      assert.equal(moveFor(m.fighters[0]).kind, kind);
    }
});
test("backward input guards mids while retreating; an obsolete guard flag does not block", () => {
  let m = setup();
  const x = m.fighters[1].x;
  feed(m, { action: "i" }, 70, 0, { x: 1 });
  assert.equal(m.fighters[1].hp, MAX_HP);
  assert.ok(m.fighters[1].x > x);
  m = setup();
  feed(m, { action: "i" }, 70, 0, { guard: true });
  assert.ok(m.fighters[1].hp < MAX_HP);
});
test("back+shift guards lows but loses to mids; standing back loses to lows", () => {
  let m = setup();
  feed(m, { z: 1, action: "j" }, 80, 0, { x: 1 });
  assert.ok(m.fighters[1].hp < MAX_HP);
  m = setup();
  feed(m, { z: 1, action: "j" }, 80, 0, { x: 1, crouch: true });
  assert.equal(m.fighters[1].hp, MAX_HP);
  m = setup();
  feed(m, { action: "i" }, 80, 0, { x: 1, crouch: true });
  assert.ok(m.fighters[1].hp < MAX_HP);
});
test("retreat guard works identically when P1 is defending", () => {
  const m = setup();
  feed(m, { action: "i" }, 70, 1, { x: -1 });
  assert.equal(m.fighters[0].hp, MAX_HP);
});
test("hitstop freezes attack clock and round time, then releases with recoil", () => {
  const m = setup();
  feed(m, { action: "i" });
  for (let n = 0; n < 30 && !m.events.some((e) => e.type === "hit"); n++)
    feed(m);
  assert.ok(m.hitstop > 0);
  const t = m.time,
    at = m.fighters[0].attack.t,
    x = m.fighters[1].x;
  feed(m, {}, 3);
  assert.equal(m.time, t);
  assert.equal(m.fighters[0].attack.t, at);
  feed(m, {}, 30);
  assert.ok(m.time < t);
  assert.ok(m.fighters[1].x > x);
});
test("each character resolves its unique signature and launcher with mirrored commands", () => {
  for (const id of CHARACTER_IDS)
    for (const index of [0, 1]) {
      const m = setup(index === 0 ? [id, "kai"] : ["kai", id]),
        f = m.fighters[index];
      for (const [key, button, seq] of character(id).commands) {
        f.commands = [];
        f.commandTime = 0;
        f.direction = 5;
        for (const dir of seq) {
          f.commandTime += 0.04;
          f.commands.push({ dir, at: f.commandTime });
          f.direction = dir;
        }
        assert.equal(resolveMove(f, button), key, `${id} ${key} P${index + 1}`);
      }
    }
});
test("stale command histories expire and incomplete circles stay basic", () => {
  const m = setup(),
    f = m.fighters[0];
  f.commands = [
    { dir: 2, at: 0 },
    { dir: 3, at: 0.1 },
    { dir: 6, at: 0.2 },
  ];
  f.direction = 6;
  f.commandTime = 1.2;
  assert.equal(resolveMove(f, "i"), "i");
});
test("sidestepping orbits the opponent while maintaining a left/right fighting axis", () => {
  const m = setup();
  m.fighters[0].x = -2;
  m.fighters[1].x = 2;
  feed(m, { z: 1 }, 120);
  assert.ok(Math.abs(m.axisAngle) > 0.3);
  const [a, b] = m.fighters,
    co = Math.cos(m.axisAngle),
    si = Math.sin(m.axisAngle);
  const depth = (b.z - a.z) * co - (b.x - a.x) * si;
  assert.ok(Math.abs(depth) < 1e-8);
  assert.equal(a.facing, 1);
  assert.equal(b.facing, -1);
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  assert.ok(d < 8);
});
test("walking is moderated; all-world movement is still unbounded", () => {
  assert.equal(WALK_SPEED, 3.5);
  assert.ok(SIDESTEP_SPEED < 4);
  assert.ok(DASH_SPEED < 6);
  const m = setup(["kai", "kai"]);
  m.fighters[0].x = 0;
  m.fighters[1].x = 10;
  for (let n = 0; n < 900; n++)
    step(m, [
      { ...emptyInput(), z: 1 },
      { ...emptyInput(), z: 1 },
    ]);
  assert.ok(m.fighters[0].z > 50);
  assert.ok(m.fighters[1].z > 50);
});
test("displayed startup and active windows are the real attack timing", () => {
  const m = setup();
  feed(m, { action: "u" });
  const move = moveFor(m.fighters[0]);
  feed(m, {}, move.startup - 2);
  assert.equal(m.fighters[1].hp, MAX_HP);
  feed(m, {}, 1);
  assert.ok(m.fighters[1].hp < MAX_HP);
});
test("character choice persists across rounds and first-to-two concludes the match", () => {
  const m = setup(["mira", "goro"]);
  m.fighters[1].hp = 1;
  feed(m, { action: "u" }, 50);
  assert.equal(m.wins[0], 1);
  feed(m, {}, 300);
  assert.deepEqual(
    m.fighters.map((f) => f.character),
    ["mira", "goro"],
  );
  m.fighters[1].hp = 0;
  feed(m);
  assert.equal(m.phase, "matchEnd");
});
test("each fighter can complete its own three-button string", () => {
  for (const id of CHARACTER_IDS) {
    const m = setup([id, "kai"]),
      chain = character(id).chain;
    let next = chain[0],
      hit = 0;
    for (let n = 0; n < 240; n++) {
      feed(m, next ? { action: next } : {});
      next = null;
      if (m.events.some((e) => e.type === "hit" && e.index === 0)) {
        hit++;
        if (hit < 3) next = chain[hit];
      }
    }
    assert.equal(m.fighters[0].combo, 3, id);
  }
});
test("displayed guard disadvantage matches recovery for either player order", () => {
  for (const index of [0, 1]) {
    const m = setup(["kai", "kai"]);
    feed(m, { action: "i" }, 1, index, { x: index === 0 ? 1 : -1 });
    for (let n = 0; n < 30 && !m.events.some((e) => e.type === "block"); n++)
      feed(m, {}, 1, index, { x: index === 0 ? 1 : -1 });
    assert.ok(m.events.some((e) => e.type === "block"));
    const move = moveFor(m.fighters[index]);
    let count = 0,
      attackerEnd = null,
      defenderEnd = null;
    for (let n = 0; n < 100; n++) {
      const frozen = m.hitstop > 0;
      feed(m, {}, 1, index, { x: index === 0 ? 1 : -1 });
      if (frozen) continue;
      count++;
      if (attackerEnd === null && !m.fighters[index].attack)
        attackerEnd = count;
      if (defenderEnd === null && m.fighters[1 - index].stun === 0)
        defenderEnd = count;
      if (attackerEnd !== null && defenderEnd !== null) break;
    }
    assert.equal(defenderEnd - attackerEnd, move.onBlock, `P${index + 1}`);
  }
});

test("every fighter links a real five-hit airborne combo including one bound on either side", () => {
  for (const id of CHARACTER_IDS)
    for (const index of [0, 1]) {
      const m = setup(index === 0 ? [id, "kai"] : ["kai", id]),
        p = character(id);
      const command = (key) => {
        const [, button, seq] = p.commands.find((r) => r[0] === key);
        return { ...dirInput(seq.at(-1), index), action: button };
      };
      const sequence = [
        command("upper"),
        { action: p.chain[0] },
        { action: p.chain[1] },
        command("bound"),
        command("sideKick"),
      ];
      let next = sequence.shift();
      const hits = [];
      for (let frame = 0; frame < 300; frame++) {
        feed(m, next || {}, 1, index);
        next = null;
        for (const hit of m.events.filter(
          (e) => e.type === "hit" && e.index === index,
        )) {
          hits.push({ ...hit, airborne: m.fighters[1 - index].y > 0 });
          next = sequence.shift();
        }
      }
      assert.deepEqual(
        hits.map((h) => h.key),
        ["upper", p.chain[0], "oneTwo", "bound", "sideKick"],
        `${id} P${index + 1}`,
      );
      assert.deepEqual(
        hits.map((h) => h.combo),
        [1, 2, 3, 4, 5],
      );
      assert.ok(hits.every((h) => h.airborne));
      assert.equal(hits.filter((h) => h.bound).length, 1);
    }
});
test("a missed or blocked launcher cannot cancel into a follow-up", () => {
  for (const blocked of [true, false]) {
    const m = setup(),
      p = character("kai");
    if (!blocked) m.fighters[1].x = 6;
    const defense = blocked ? { x: 1 } : {};
    feed(m, { ...dirInput(3), action: "i" }, 1, 0, defense);
    feed(m, {}, p.moves.upper.startup + 3, 0, defense);
    feed(m, { action: "u" }, 1, 0, defense);
    feed(m, {}, 10, 0, defense);
    assert.equal(m.fighters[0].attack?.key, "upper");
    assert.equal(m.fighters[1].y, 0);
  }
});
test("airborne pressure ends at six follow-ups, and landing grants recovery protection", () => {
  const m = setup(["kai", "kai"]);
  feed(m, { ...dirInput(3), action: "i" });
  let launched = false,
    landed = false,
    hits = 0,
    peak = 0;
  for (let frame = 0; frame < 500; frame++) {
    feed(m, { action: "u" });
    const target = m.fighters[1];
    if (target.y > 0) launched = true;
    for (const hit of m.events.filter((e) => e.type === "hit")) {
      hits++;
      assert.ok(hit.combo <= 7);
    }
    peak = Math.max(peak, target.airHits);
    if (launched && target.y === 0) {
      landed = true;
      assert.ok(target.wakeUp > target.stun);
      assert.equal(target.airHits, 0);
      const hp = target.hp;
      feed(m, { action: "u" }, 10);
      assert.equal(target.hp, hp);
      break;
    }
  }
  assert.ok(landed);
  assert.equal(peak, 6);
  assert.equal(hits, 7);
});
test("low kicks cannot juggle a high airborne opponent and throw cannot grab it", () => {
  for (const action of ["j+k", "u+i"]) {
    const m = setup();
    m.fighters[1].y = 1.5;
    m.fighters[1].vy = 3;
    m.fighters[1].airOwner = 0;
    feed(m, { action }, 1);
    // Observe only the active window; later landing must not turn this into a grounded hit.
    const move = moveFor(m.fighters[0]);
    let damage = 0;
    for (let frame = 0; frame < move.startup + move.active; frame++) {
      feed(m);
      damage += m.events.filter((e) => e.type === "hit").length;
    }
    assert.equal(damage, 0);
  }
});
test("basic kicks are shorter and recover faster than the previous slow kicks", () => {
  for (const id of CHARACTER_IDS) {
    const p = character(id);
    assert.ok(p.moves.j.startup <= 17);
    assert.ok(p.moves.k.startup <= 20);
    assert.ok(p.moves.j.recovery <= 21);
    assert.ok(p.moves.k.recovery <= 25);
    assert.ok(p.moves.j.range < 2);
    assert.ok(p.moves.k.range <= 2.05);
    assert.ok(p.moves.u.startup <= 14);
  }
});

test("active frames end exactly at S + A, so a late target is not hit by an expired jab", () => {
  const m = setup();
  m.fighters[1].x = 4;
  feed(m, { action: "u" }, 11);
  const hp = m.fighters[1].hp;
  m.fighters[1].x = 0.5;
  feed(m);
  assert.equal(m.fighters[1].hp, hp);
});
test("combo follow-ups tolerate a six-frame reaction delay after each confirmed hit", () => {
  for (const id of CHARACTER_IDS) {
    const m = setup([id, "kai"]),
      p = character(id);
    const command = (key) => {
      const [, button, seq] = p.commands.find((r) => r[0] === key);
      return { ...dirInput(seq.at(-1)), action: button };
    };
    const sequence = [
      command("upper"),
      { action: p.chain[0] },
      { action: p.chain[1] },
      command("bound"),
      command("sideKick"),
    ];
    let next = sequence.shift(),
      hits = 0;
    for (let n = 0; n < 300; n++) {
      feed(m, next || {});
      next = null;
      if (m.events.some((e) => e.type === "hit" && e.index === 0)) {
        hits++;
        feed(m, {}, 6);
        next = sequence.shift();
      }
    }
    assert.equal(hits, 5, id);
    assert.equal(m.fighters[0].combo, 5, id);
  }
});
