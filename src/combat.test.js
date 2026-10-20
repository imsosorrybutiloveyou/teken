import { STYLE_MOTIONS } from "./style-motion.js";
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
  cpuInput,
  stepPractice,
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
  assert.equal(CHARACTER_IDS.length, 8);
  const signatures = ["kai", "ren", "mira", "goro"].map(
    (id) => character(id).moves.qcfPunch.command,
  );
  assert.equal(new Set(signatures).size, 4);
  assert.equal(
    new Set(
      ["kai", "ren", "mira", "goro"].map(
        (id) => character(id).moves.qcfPunch.startup,
      ),
    ).size,
    4,
  );
  for (const id of CHARACTER_IDS) {
    assert.equal(
      Object.keys(character(id).moves).length,
      id === "kai" ? 45 : ["ren", "shin"].includes(id) ? 47 : 46,
    );
    for (const move of Object.values(character(id).moves)) {
      assert.equal(
        move.duration,
        (move.startup + move.active + move.recovery) / 60,
      );
      assert.ok(move.blockStun > 0);
    }
  }
});
test("basic buttons retain left/right hand and foot identity with independent style motions", () => {
  for (const id of CHARACTER_IDS)
    for (const key of ["u", "i", "j", "k"]) {
      const m = setup([id, "kai"]);
      feed(m, { action: key });
      const move = moveFor(m.fighters[0]);
      assert.equal(move.side, ["u", "j"].includes(key) ? 1 : 0);
      assert.ok(move.kind);
      const part =
        STYLE_MOTIONS[move.kind]?.[0] ??
        (key === "u" || key === "i" ? "arm" : "foot");
      assert.equal(part, key === "u" || key === "i" ? "arm" : "foot");
    }
  for (const key of [
    "u",
    "i",
    "j",
    "k",
    "upper",
    "electric",
    "hellSweep",
    "runningKick",
  ])
    assert.equal(
      new Set(
        ["kai", "ren", "mira", "goro"].map(
          (id) => character(id).moves[key].kind,
        ),
      ).size,
      4,
      key,
    );
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
        if (
          key === "windGod" ||
          (key === "signature" && character(id).moves.justStrike)
        )
          f.commandTime += 3 / 60;
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
  feed(m, { orbit: 1 }, 120);
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
      { ...emptyInput(), x: 1 },
      { ...emptyInput(), x: 1 },
    ]);
  assert.ok(m.fighters[0].x > 50);
  assert.ok(m.fighters[1].x > 50);
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
test("unmoving jab pressure ends through pushback and falling, and landing grants recovery protection", () => {
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
      assert.ok(hit.combo >= 1);
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
  assert.ok(peak > 1);
  assert.ok(hits > 1);
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
  for (const id of ["kai", "ren", "mira", "goro"]) {
    const p = character(id);
    assert.ok(p.moves.j.startup <= 17);
    assert.ok(p.moves.k.startup <= 20);
    assert.ok(p.moves.j.recovery <= 21);
    assert.ok(p.moves.k.recovery <= 25);
    assert.ok(p.moves.j.range <= (id === "ren" ? 2.3 : 2));
    assert.ok(p.moves.k.range <= (id === "ren" ? 2.4 : 2.05));
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

function guardPunish(defender = "kai", attackerIndex = 0, disadvantage = null) {
  const defenderIndex = 1 - attackerIndex,
    m = setup(attackerIndex === 0 ? ["ren", defender] : [defender, "ren"]);
  const attacker = m.fighters[attackerIndex],
    target = m.fighters[defenderIndex],
    p = character("ren"),
    original = p.moves.qcfPunch;
  if (disadvantage !== null)
    p.moves.qcfPunch = {
      ...original,
      onBlock: -disadvantage,
      blockStun: (original.active + original.recovery - disadvantage) / 60,
    };
  attacker.commands = [
    { dir: 4, at: 0 },
    { dir: 6, at: 0.04 },
  ];
  attacker.direction = 6;
  attacker.commandTime = 0.04;
  let blocked = false,
    sent = false,
    result = null;
  try {
    for (let frame = 0; frame < 180; frame++) {
      const inputs = [emptyInput(), emptyInput()];
      inputs[attackerIndex] = { ...emptyInput(), x: -attacker.facing };
      inputs[defenderIndex] = { ...emptyInput(), x: -target.facing };
      if (frame === 0)
        inputs[attackerIndex] = {
          ...emptyInput(),
          x: attacker.facing,
          action: "i",
        };
      if (blocked && !sent && target.stun <= 6 / 60 + 1e-9) {
        const [, button] = character(defender).commands.find(
          (r) => r[0] === "upper",
        );
        inputs[defenderIndex] = {
          ...emptyInput(),
          x: target.facing,
          z: 1,
          action: button,
        };
        sent = true;
      }
      step(m, inputs);
      for (const e of m.events) {
        if (e.type === "block" && e.index === defenderIndex) blocked = true;
        else if (blocked && e.type === "hit" && e.index === defenderIndex)
          result = { type: "hit", punish: e.punish, launched: attacker.y > 0 };
        else if (
          blocked &&
          sent &&
          e.type === "block" &&
          e.index === attackerIndex
        )
          result = { type: "block" };
      }
      if (result) break;
    }
    assert.ok(blocked, "Blood Cross must be guarded before retaliation");
    assert.ok(sent, "uppercut must be buffered during guard stun");
    return result;
  } finally {
    p.moves.qcfPunch = original;
  }
}
test("blocking Blood Cross guarantees every fighter's uppercut even against held-back guard", () => {
  assert.equal(character("ren").moves.qcfPunch.onBlock, -20);
  for (const id of CHARACTER_IDS)
    for (const index of [0, 1])
      assert.deepEqual(
        guardPunish(id, index),
        { type: "hit", punish: true, launched: true },
        `${id} attacker P${index + 1}`,
      );
});
test("punish boundary is exact: S-frame retaliation beats -S, but is blocked at -(S-1)", () => {
  for (const id of CHARACTER_IDS)
    for (const index of [0, 1]) {
      const startup = character(id).moves.upper.startup;
      assert.deepEqual(guardPunish(id, index, startup), {
        type: "hit",
        punish: true,
        launched: true,
      });
      assert.deepEqual(guardPunish(id, index, startup - 1), { type: "block" });
    }
});
test("forward walking is faster than back guard on either side and a dash cannot boost retreat", () => {
  for (const index of [0, 1]) {
    const distance = (forward, dash = false) => {
      const m = setup(["kai", "kai"]);
      m.fighters[0].x = -30;
      m.fighters[1].x = 30;
      const f = m.fighters[index],
        before = f.x;
      if (dash) f.dash = 0.24;
      feed(m, { x: forward * f.facing }, 6, index);
      return Math.abs(f.x - before);
    };
    assert.ok(distance(1) > distance(-1) * 1.5);
    assert.ok(Math.abs(distance(-1, true) - distance(-1)) < 1e-9);
  }
});

function commandInputFor(m, index, key, late = false) {
  const f = m.fighters[index],
    p = character(f.character),
    [, button, sequence] = p.commands.find((r) => r[0] === key);
  f.commands = sequence.map((dir, n) => ({ dir, at: n * 0.035 }));
  f.commandTime = f.commands.at(-1).at + (late ? 3 / 60 : 0);
  const dir = sequence.at(-1);
  f.direction = !late && p.moves[key].justFrames ? 5 : dir;
  return { ...dirInput(dir, index), action: button };
}
test("rush palm, sweep, electrics and running kick actually advance without crossing the opponent", () => {
  for (const id of CHARACTER_IDS)
    for (const index of [0, 1])
      for (const key of [
        "rushStrike",
        "electric",
        "hellSweep",
        "runningKick",
      ]) {
        const m = setup(index === 0 ? [id, "kai"] : ["kai", id]),
          f = m.fighters[index],
          other = m.fighters[1 - index];
        m.fighters[0].x = -3;
        m.fighters[1].x = 3;
        const x = f.x,
          move = character(id).moves[key];
        feed(m, commandInputFor(m, index, key), move.startup, index);
        assert.ok(
          (f.x - x) * f.facing > move.lunge * 0.8,
          `${id} ${key} failed to advance`,
        );
        const near = setup(index === 0 ? [id, "kai"] : ["kai", id]);
        feed(near, commandInputFor(near, index, key), move.startup, index);
        assert.ok(
          character(id).moves[key].level === "throw"
            ? near.fighters[0].x > near.fighters[1].x
            : near.fighters[0].x < near.fighters[1].x,
          `${key} crossed through foe`,
        );
      }
});
test("hellsweep beats standing back guard, knocks down and cannot be hit again while down", () => {
  for (const id of ["kai", "ren"])
    for (const index of [0, 1]) {
      const m = setup(index === 0 ? [id, "kai"] : ["kai", id]),
        target = m.fighters[1 - index];
      feed(
        m,
        commandInputFor(m, index, "hellSweep"),
        character(id).moves.hellSweep.startup,
        index,
        { x: -target.facing },
      );
      feed(m, { action: id === "kai" ? "u" : "k" }, 1, index);
      feed(m, {}, 28, index);
      assert.ok(target.hp < MAX_HP);
      assert.ok(target.downTime > 0);
      assert.ok(target.wakeUp > target.stun);
      const hp = target.hp;
      for (let frame = 0; frame < 20; frame++)
        feed(m, { action: "u" }, 1, index);
      assert.equal(
        target.hp,
        hp,
        "downed target must not allow free follow-up loops",
      );
    }
});
test("a crouch-blocked hellsweep is launch-punishable against continued back guard", () => {
  for (const index of [0, 1]) {
    const m = setup(["kai", "kai"]),
      defender = 1 - index,
      target = m.fighters[defender];
    feed(m, commandInputFor(m, index, "hellSweep"), 1, index, {
      x: -target.facing,
      crouch: true,
    });
    let blocked = false,
      sent = false,
      punished = false;
    for (let frame = 0; frame < 140; frame++) {
      const inputs = [emptyInput(), emptyInput()];
      inputs[index] = { ...emptyInput(), x: -m.fighters[index].facing };
      inputs[defender] = {
        ...emptyInput(),
        x: -target.facing,
        crouch: !blocked,
      };
      if (blocked && !sent && target.stun <= 6 / 60 + 1e-9) {
        inputs[defender] = {
          ...emptyInput(),
          x: target.facing,
          z: 1,
          action: "i",
        };
        sent = true;
      }
      step(m, inputs);
      for (const e of m.events) {
        if (e.type === "block" && e.index === defender) blocked = true;
        if (e.type === "hit" && e.index === defender && e.punish)
          punished = true;
      }
      if (punished) break;
    }
    assert.ok(blocked);
    assert.ok(punished);
    assert.equal(target.hp, MAX_HP);
  }
});
test("electric has plus-five guard frames and a running kick keeps its authored plus frames", () => {
  for (const key of ["electric", "runningKick"])
    for (const index of [0, 1]) {
      const m = setup(["kai", "kai"]),
        f = m.fighters[index],
        defender = m.fighters[1 - index],
        move = character("kai").moves[key];
      feed(m, commandInputFor(m, index, key), 1, index, {
        x: -defender.facing,
      });
      for (let n = 0; n < 50 && !m.events.some((e) => e.type === "block"); n++)
        feed(m, {}, 1, index, { x: -defender.facing });
      assert.ok(
        m.events.some((e) => e.type === "block"),
        key,
      );
      let count = 0,
        a = null,
        b = null;
      for (let n = 0; n < 100; n++) {
        const frozen = m.hitstop > 0;
        feed(m, {}, 1, index, { x: -defender.facing });
        if (frozen) continue;
        count++;
        if (a === null && !f.attack) a = count;
        if (b === null && defender.stun === 0) b = count;
        if (a !== null && b !== null) break;
      }
      assert.equal(b - a, move.onBlock, key + " guard advantage");
    }
});
test("running jump crushes lows but can be interrupted by a mid and gives no landing invulnerability", () => {
  for (const key of ["low", "i"]) {
    const m = setup(["kai", "kai"]),
      kicker = m.fighters[1],
      move = character("kai").moves[key];
    kicker.y = 0.5;
    kicker.attack = { key: "runningKick", t: 0.08, angle: Math.PI };
    m.fighters[0].attack = { key, t: move.windup - 1 / 60, angle: 0 };
    feed(m);
    assert.equal(kicker.hp < MAX_HP, key === "i");
  }
  const m = setup();
  m.fighters[1].x = 10;
  feed(m, commandInputFor(m, 0, "runningKick"), 70);
  assert.equal(m.fighters[0].y, 0);
  assert.equal(m.fighters[0].stun, 0);
  assert.equal(m.fighters[0].wakeUp, 0);
});

test("CPU also performs real inputs for advancing palm, electric, hellsweep and running kick", () => {
  for (const [cycle, key] of [
    "rushStrike",
    "electric",
    "hellSweep",
    "runningKick",
  ].entries()) {
    const m = setup();
    m.fighters[0].x = -1.4;
    m.fighters[1].x = 1.4;
    m.tick = cycle * 210 + 39;
    for (let frame = 0; frame < 13; frame++)
      step(m, [emptyInput(), cpuInput(m)]);
    assert.equal(m.fighters[1].lastMove, key);
  }
});

test("four styles have different special mechanics, not reskinned universal electrics", () => {
  const [kai, ren, mira, goro] = CHARACTER_IDS.map((id) => character(id).moves);
  assert.equal(kai.electric.justFrames, 1);
  assert.ok(ren.windGod.hop > 0 && ren.runningKick.hop > 0);
  assert.ok(mira.electric.highCrushFrom < 3 / 60 && !mira.electric.launch);
  assert.equal(goro.hellSweep.level, "throw");
  assert.ok(goro.qcfPunch.armorFrom > 0);
  assert.equal(
    new Set(CHARACTER_IDS.map((id) => character(id).moves.electric.command))
      .size,
    4,
  );
});
test("GORO armor absorbs one high/mid but loses to lows and a second strike", () => {
  for (const key of ["u", "low"]) {
    const m = setup(["kai", "goro"]),
      a = m.fighters[0],
      b = m.fighters[1];
    b.attack = { key: "qcfPunch", t: 9 / 60, angle: Math.PI };
    a.attack = {
      key,
      t: character("kai").moves[key].windup - 1 / 60,
      angle: 0,
    };
    feed(m);
    assert.ok(b.hp < MAX_HP, "armor still takes damage");
    assert.equal(!!b.attack, key === "u");
    if (key === "u") {
      assert.ok(b.attack.armorUsed);
      m.hitstop = 0;
      a.attack = { key: "u", t: 9 / 60, angle: 0 };
      feed(m);
      assert.equal(b.attack, null, "second strike interrupts armor");
    }
  }
});
test("MIRA low-profile palm evades a high jab but can be stopped by a mid", () => {
  for (const key of ["u", "i"]) {
    const m = setup(["kai", "mira"]);
    m.fighters[1].attack = { key: "electric", t: 3 / 60, angle: Math.PI };
    m.fighters[0].attack = {
      key,
      t: character("kai").moves[key].windup - 1 / 60,
      angle: 0,
    };
    feed(m);
    assert.equal(m.fighters[1].hp < MAX_HP, key === "i");
  }
});
test("training HP drops then regenerates after three idle seconds, while time stays infinite", () => {
  const m = setup();
  stepPractice(m, { ...emptyInput(), action: "u" }, { behavior: "dummy" });
  for (let n = 0; n < 25; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy" });
  assert.ok(m.fighters[1].hp < MAX_HP);
  const hp = m.fighters[1].hp;
  for (let n = 0; n < 20; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy" });
  assert.equal(m.fighters[1].hp, hp);
  for (let n = 0; n < 240; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy" });
  assert.equal(m.fighters[1].hp, MAX_HP);
  assert.equal(m.time, 60);
  const other = setup();
  other.fighters[1].hp = 1;
  for (let n = 0; n < 100; n++)
    stepPractice(
      other,
      { ...emptyInput(), action: n % 35 === 0 ? "u" : null },
      { behavior: "dummy" },
    );
  assert.equal(other.fighters[1].hp, 1);
  assert.equal(other.phase, "fight");
});

test("airborne hits beyond seven remain hittable with increasing recoil and less lift on either side", () => {
  for (const index of [0, 1]) {
    const recoils = [],
      lifts = [];
    for (const count of [0, 3, 7, 10]) {
      const m = setup(["kai", "kai"]),
        a = m.fighters[index],
        b = m.fighters[1 - index];
      b.y = 0.9;
      b.vy = 0;
      b.airHits = count;
      b.airOwner = index;
      b.stun = 0.5;
      a.attack = { key: "u", t: 9 / 60, angle: index === 0 ? 0 : Math.PI };
      feed(m, {}, 1, index);
      assert.equal(b.airHits, count + 1);
      assert.ok(b.hp < MAX_HP);
      recoils.push(Math.hypot(b.vx, b.vz));
      lifts.push(b.vy);
    }
    for (let n = 1; n < recoils.length; n++) {
      assert.ok(recoils[n] > recoils[n - 1]);
      assert.ok(lifts[n] < lifts[n - 1]);
    }
  }
});
test("infinite practice clock does not keep the fight announcement alive", () => {
  const m = createMatch();
  for (let n = 0; n < 180; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy", infiniteHealth: true });
  assert.equal(m.phase, "fight");
  assert.equal(m.time, 60);
  assert.equal(m.phaseTime, 0);
});

test("orbit is continuous on Q/E input and release stops it; a stationary foe can be circled behind", () => {
  const m = setup(["kai", "kai"]);
  const original = m.fighters[0].z;
  feed(m, { orbit: 1 }, 30);
  assert.notEqual(m.fighters[0].z, original);
  const after = [m.fighters[0].x, m.fighters[0].z];
  feed(m, {}, 20);
  assert.deepEqual([m.fighters[0].x, m.fighters[0].z], after);
});

test("KAI's low starter only completes its knockdown with a separate U, and all fighters have button strings", () => {
  for (const id of CHARACTER_IDS) {
    const m = setup([id, "kai"]),
      f = m.fighters[0],
      p = character(id);
    for (const [from, button, to] of p.followUps) {
      f.hopCombo = from === "runningKick";
      f.jumpActive = from.startsWith("jump");
      f.attack = { key: from, t: p.moves[from].windup, angle: 0 };
      assert.equal(resolveMove(f, button), to);
      f.attack = null;
      f.lastMove = from;
      f.lastMoveAge = p.moves[from].duration + 0.5;
      assert.notEqual(
        resolveMove(f, button),
        to,
        "expired strings cannot start a follow-up",
      );
    }
  }
  const m = setup(["kai", "kai"]);
  feed(m, commandInputFor(m, 0, "hellSweep"), 22);
  assert.ok(m.fighters[1].hp < 120);
  assert.equal(m.fighters[1].downTime, 0);
  feed(m, { action: "u" });
  feed(m, {}, 35);
  assert.equal(m.fighters[0].lastMove, "hellFollow");
  assert.ok(m.fighters[1].downTime > 0);
});
test("combo damage scales down progressively for the same move on the ground", () => {
  const damage = [];
  for (const count of [0, 1, 2, 4, 8]) {
    const m = setup(["kai", "kai"]),
      a = m.fighters[0],
      b = m.fighters[1];
    a.combo = count;
    if (count) {
      b.stun = 0.5;
      b.lastHitBy = 0;
    }
    a.attack = {
      key: "i",
      t: character("kai").moves.i.windup - 1 / 60,
      angle: 0,
    };
    feed(m);
    damage.push(120 - b.hp);
  }
  for (let n = 1; n < damage.length; n++) assert.ok(damage[n] < damage[n - 1]);
  assert.equal(character("kai").moves.upper.damage, 16);
});

test("every added button follow-up is a real reachable second hit", () => {
  for (const id of CHARACTER_IDS)
    for (const [from, button, to] of character(id).followUps) {
      const m = setup([id, "kai"]),
        a = m.fighters[0],
        p = character(id);
      a.hopCombo = from === "runningKick";
      if (from === "runningKick") {
        m.fighters[1].y = 0.6;
        m.fighters[1].airOwner = 0;
      }
      a.jumpActive = from.startsWith("jump");
      a.attack = { key: from, t: p.moves[from].windup - 1 / 60, angle: 0 };
      feed(m);
      const hp = m.fighters[1].hp;
      assert.ok(hp < MAX_HP, id + " " + from);
      feed(m, { action: button });
      feed(m, {}, 45);
      assert.equal(a.lastMove, to, id + " " + to);
      assert.ok(
        m.fighters[1].hp < hp,
        id + " " + to + " follow-up must connect",
      );
    }
});

test("eight fighters have counter-only launchers that open a real juggle", () => {
  for (const id of CHARACTER_IDS) {
    const p = character(id),
      key = Object.keys(p.moves).find(
        (k) => p.moves[k].counterLaunch && !p.moves[k].launch,
      );
    assert.ok(key, id);
    for (const counter of [false, true]) {
      const m = setup([id, "kai"]),
        a = m.fighters[0],
        b = m.fighters[1];
      if (counter) b.attack = { key: "palm", t: 0, angle: Math.PI };
      a.attack = { key, t: p.moves[key].windup - 1 / 60, angle: 0 };
      feed(m);
      assert.equal(b.y > 0, counter, id + " " + key);
      assert.equal(m.events.find((e) => e.type === "hit")?.counter, counter);
    }
  }
});
test("throws animate both participants and exchange actual positions and screen sides", () => {
  const m = setup(["goro", "kai"]),
    a = m.fighters[0],
    b = m.fighters[1];
  const ax = a.x,
    bx = b.x;
  a.attack = {
    key: "throw",
    t: character("goro").moves.throw.windup - 1 / 60,
    angle: 0,
  };
  feed(m);
  assert.equal(a.x, bx);
  assert.equal(b.x, ax);
  assert.ok(a.throwTime > 0 && b.throwTime > 0);
  assert.equal(a.facing, -1);
  assert.equal(b.facing, 1);
  assert.ok(Math.abs(m.viewAngle) < 0.01);
});
test("committed linear attack does not turn to follow an orbiting defender", () => {
  const m = setup(["kai", "kai"]),
    a = m.fighters[0],
    b = m.fighters[1];
  a.attack = { key: "palm", t: 0, angle: 0 };
  feed(m, {}, 30, 0, { orbit: 1 });
  assert.equal(b.hp, MAX_HP);
  assert.ok(Math.abs(b.z) > 0.4);
});
test("physical crouch, jump, aerial strings and while-rising inputs work", () => {
  const m = setup();
  feed(m, { crouch: true, z: 1 }, 12);
  assert.ok(m.fighters[0].crouch);
  feed(m, { action: "u", crouch: true, z: 1 });
  assert.equal(m.fighters[0].lastMove, "crouchPunch");
  const r = setup();
  feed(r, { crouch: true, z: 1 }, 12);
  feed(r);
  feed(r, { action: "i" });
  assert.equal(r.fighters[0].lastMove, "risingUpper");
  const j = setup();
  feed(j, { z: -1 }, 9);
  assert.ok(j.fighters[0].y > 0);
  feed(j, { action: "j" });
  assert.equal(j.fighters[0].lastMove, "jumpKick");
  feed(j, {}, 6);
  feed(j, { action: "k" });
  assert.ok(
    j.fighters[0].buffer === "jumpFollow" ||
      j.fighters[0].lastMove === "jumpFollow",
  );
});

test("first aerial slam bounds once; a second bound forces a grounded fall", () => {
  for (const id of CHARACTER_IDS) {
    const m = setup([id, "kai"]),
      a = m.fighters[0],
      b = m.fighters[1];
    b.y = 0.8;
    b.vy = 0;
    b.airOwner = 0;
    const strike = () => {
      a.attack = {
        key: "jumpPunch",
        t: character(id).moves.jumpPunch.windup - 1 / 60,
        angle: 0,
      };
      feed(m);
      assert.ok(
        m.events.some((e) => e.type === "hit"),
        id,
      );
    };
    strike();
    assert.equal(b.bouncePending, true, id);
    assert.equal(b.bounceUsed, true);
    while (b.bouncePending || m.hitstop > 0 || b.y < 0.3) feed(m);
    a.x = b.x - 1;
    a.z = b.z;
    strike();
    assert.equal(b.bouncePending, false);
    assert.ok(b.vy < 0 && b.downTime > 0);
    for (let n = 0; n < 60 && b.y > 0; n++) feed(m);
    assert.equal(b.y, 0);
    assert.ok(b.downTime > 0);
  }
});
test("downed players get up with W, attack with J/K or recover backwards on either side", () => {
  for (const index of [0, 1])
    for (const mode of ["up", "j", "k", "back"]) {
      const m = setup(),
        f = m.fighters[index];
      f.downTime = 0.7;
      f.wakeUp = 0.8;
      f.stun = 0.5;
      const input =
        mode === "up"
          ? { z: -1 }
          : mode === "back"
            ? { x: -f.facing }
            : { action: mode };
      feed(m, input, 1, index);
      assert.equal(f.downTime, 0);
      assert.equal(f.y, 0, "W must not immediately jump");
      if (mode === "j" || mode === "k")
        assert.equal(f.attack.key, mode === "j" ? "wakeLow" : "wakeMid");
      if (mode === "back") assert.ok(f.vx * f.facing < 0 && f.stun > 0);
    }
});
test("only lows hit prone targets and cannot relaunch them; throws keep paired animation protection", () => {
  for (const key of ["u", "upper", "low", "throw"]) {
    const m = setup(),
      a = m.fighters[0],
      b = m.fighters[1];
    b.downTime = 0.7;
    b.wakeUp = 0.8;
    b.stun = 0.5;
    a.attack = {
      key,
      t: character("kai").moves[key].windup - 1 / 60,
      angle: 0,
    };
    feed(m);
    assert.equal(b.hp < MAX_HP, key === "low", key);
    assert.equal(b.y, 0);
  }
  const m = setup(),
    a = m.fighters[0],
    b = m.fighters[1];
  b.downTime = 0.7;
  b.wakeUp = 0.8;
  b.throwTime = 0.3;
  a.attack = {
    key: "low",
    t: character("kai").moves.low.windup - 1 / 60,
    angle: 0,
  };
  feed(m);
  assert.equal(b.hp, MAX_HP);
});
test("both wake-up kicks are launch punishable after a correct block", () => {
  for (const index of [0, 1])
    for (const key of ["wakeLow", "wakeMid"]) {
      const m = setup(["kai", "kai"]),
        a = m.fighters[index],
        b = m.fighters[1 - index],
        move = character("kai").moves[key];
      a.attack = {
        key,
        t: move.windup - 1 / 60,
        angle: index === 0 ? 0 : Math.PI,
      };
      feed(m, {}, 1, index, {
        x: -b.facing,
        crouch: key === "wakeLow",
        z: key === "wakeLow" ? 1 : 0,
      });
      assert.ok(
        m.events.some((e) => e.type === "block"),
        key,
      );
      let launch = false,
        sent = false;
      for (let n = 0; n < 100; n++) {
        const send = !sent && b.stun <= 6 / 60 + 1e-9;
        if (send) sent = true;
        feed(m, { x: -a.facing }, 1, index, {
          x: b.facing,
          z: 1,
          action: send ? "i" : null,
        });
        launch ||= a.y > 0;
      }
      assert.ok(launch, key + " must allow a guarded upper punish");
    }
});
test("heavy hitters sacrifice combo scaling while light hitters retain more follow-up damage", () => {
  for (const id of CHARACTER_IDS) {
    const ratio = [];
    for (const combo of [0, 3]) {
      const m = setup([id, "kai"]),
        a = m.fighters[0],
        b = m.fighters[1],
        move = character(id).moves.u;
      a.combo = combo;
      if (combo) {
        b.lastHitBy = 0;
        b.stun = 0.5;
      }
      a.attack = { key: "u", t: move.windup - 1 / 60, angle: 0 };
      feed(m);
      ratio.push((MAX_HP - b.hp) / move.damage);
    }
    assert.ok(ratio[1] < ratio[0], id);
  }
  assert.ok(character("mira").comboScale > character("goro").comboScale);
  assert.ok(character("hana").comboScale > character("boru").comboScale);
  assert.ok(
    character("boru").moves.u.range > character("kai").moves.u.range + 0.5,
  );
  assert.ok(
    character("boru").moves.low.range < character("kai").moves.low.range,
  );
  assert.ok(character("boru").speed >= 0.9 && character("atlas").speed >= 0.9);
  assert.notEqual(
    character("kai").moves.electric.name,
    character("kai").moves.windGod.name,
  );
  assert.ok(
    character("kai").moves.electric.damage >
      character("kai").moves.windGod.damage,
  );
});

test("terminal bound fall cannot be lifted again by a low before landing", () => {
  const m = setup(),
    a = m.fighters[0],
    b = m.fighters[1];
  b.y = 0.2;
  b.vy = -8;
  b.bounceUsed = true;
  b.downTime = 0.8;
  b.wakeUp = 0.9;
  a.attack = {
    key: "low",
    t: character("kai").moves.low.windup - 1 / 60,
    angle: 0,
  };
  feed(m);
  assert.equal(b.hp, MAX_HP);
  assert.ok(b.vy < 0);
});

test("launcher hit permits a buffered jump cancel for either player", () => {
  for (const index of [0, 1]) {
    const m = setup(["kai", "kai"]),
      a = m.fighters[index],
      b = m.fighters[1 - index];
    feed(
      m,
      { ...dirInput(3, index), action: "i" },
      character("kai").moves.upper.startup,
      index,
    );
    assert.ok(b.y > 0);
    feed(m, { z: -1 }, 10, index);
    let jumped = false;
    for (let n = 0; n < 25; n++) {
      feed(m, {}, 1, index);
      jumped ||= a.jumpActive && a.y > 0;
    }
    assert.ok(
      jumped,
      "W tapped during launcher hitstop must survive until jump cancel",
    );
  }
});
test("move hops never turn later grounded attacks into jumping attacks", () => {
  for (const id of CHARACTER_IDS)
    for (const key of ["runningKick", "hopKick"]) {
      const m = setup([id, "kai"]),
        a = m.fighters[0];
      a.y = 0.3;
      a.vy = 1.5;
      a.lastMove = key;
      a.lastMoveAge = 0.1;
      assert.equal(resolveMove(a, "u"), "u", id + " " + key);
      feed(m, { action: "u" });
      assert.equal(a.lastMove, "u");
      assert.equal(a.y, 0);
      assert.equal(a.vy, 0);
      assert.equal(resolveMove(a, "k"), "k");
    }
});
test("a landed jumping string cannot restart an airborne follow-up", () => {
  const m = setup(),
    a = m.fighters[0];
  a.jumpActive = true;
  a.y = 0.001;
  a.vy = -4;
  a.lastMove = "jumpKick";
  a.lastMoveAge = character("kai").moves.jumpKick.duration;
  a.buffer = "jumpFollow";
  feed(m);
  assert.equal(a.jumpActive, false);
  assert.equal(a.buffer, null);
  assert.equal(resolveMove(a, "k"), "k");
});
test("training dummy automatically rises and HP regenerates, while player stays prone", () => {
  const m = setup(),
    b = m.fighters[1];
  b.downTime = 0.65;
  b.wakeUp = 0.75;
  b.stun = 0.18;
  b.hp = 30;
  for (let n = 0; n < 360; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy", infiniteHealth: true });
  assert.equal(b.downTime, 0);
  assert.equal(b.hp, MAX_HP);
  assert.equal(b.y, 0);
  const a = m.fighters[0];
  a.downTime = 0.5;
  a.stun = 0.2;
  for (let n = 0; n < 90; n++)
    stepPractice(m, emptyInput(), { behavior: "dummy", infiniteHealth: true });
  assert.ok(a.downTime > 0);
  feed(m, { z: -1 });
  assert.equal(a.downTime, 0);
  assert.equal(a.y, 0);
});
test("air combo pushback grows faster with accumulated hits", () => {
  const push = [];
  for (const count of [0, 3, 6]) {
    const m = setup(),
      a = m.fighters[0],
      b = m.fighters[1],
      move = character("kai").moves.u;
    b.y = 0.8;
    b.airOwner = 0;
    b.airHits = count;
    a.attack = { key: "u", t: move.windup - 1 / 60, angle: 0 };
    feed(m);
    assert.ok(b.hp < MAX_HP);
    const old = move.push * (0.38 + count * 0.18) + count * 0.22;
    assert.ok(b.vx > old);
    push.push(b.vx);
  }
  assert.ok(push[2] > push[1] && push[1] > push[0]);
});
