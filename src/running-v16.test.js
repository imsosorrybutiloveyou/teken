import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatch, step, emptyInput, resolveMove } from "./combat.js";
import { CHARACTERS, CHARACTER_IDS, character } from "./characters.js";
import { spritePose } from "./scene.js";
import { STYLE_MOTIONS } from "./style-motion.js";

function setup(id, side = 0) {
  const m = createMatch(side ? ["kai", id] : [id, "kai"]);
  m.phase = "fight";
  m.fighters[0].x = -3;
  m.fighters[1].x = 3;
  return m;
}
function feed(m, side, input) {
  const pair = [emptyInput(), emptyInput()];
  pair[side] = { ...emptyInput(), ...input };
  step(m, pair, 1 / 60, true);
}
function triple(m, side) {
  for (const x of [1, 0, 1, 0, 1]) feed(m, side, { x: x * (side ? -1 : 1) });
}
test("three forward taps start running immediately for every fighter and both player sides", () => {
  for (const id of CHARACTER_IDS)
    for (const side of [0, 1]) {
      const m = setup(id, side),
        f = m.fighters[side];
      triple(m, side);
      assert.ok(f.running, id);
      feed(m, side, {});
      assert.equal(f.running, false);
      if (!["boru", "atlas"].includes(id)) {
        feed(m, side, { action: "i" });
        assert.equal(
          f.attack?.key,
          "runningPunch",
          "released triple still accepts the attack briefly",
        );
      }
    }
});
test("running hand/foot buttons launch real jump attacks; bear and robot only charge on both hands", () => {
  for (const id of CHARACTER_IDS)
    for (const side of [0, 1]) {
      const heavy = ["boru", "atlas"].includes(id);
      for (const button of heavy ? ["u+i"] : ["u", "i", "j", "k"]) {
        const m = setup(id, side),
          f = m.fighters[side];
        triple(m, side);
        feed(m, side, { x: f.facing, action: button });
        const key =
          heavy || ["j", "k"].includes(button) ? "runningKick" : "runningPunch";
        assert.equal(f.attack?.key, key, id + " " + button);
        assert.equal(f.y > 0, !heavy);
        assert.equal(f.vy > 0, !heavy);
        assert.equal(f.running, false);
        if (heavy) {
          assert.equal(STYLE_MOTIONS[character(id).moves[key].kind][0], "body");
          assert.equal(character(id).moves.runningPunch, undefined);
        }
      }
      if (heavy) {
        const m = setup(id, side),
          f = m.fighters[side];
        triple(m, side);
        assert.notEqual(resolveMove(f, "u"), "runningPunch");
        assert.notEqual(resolveMove(f, "j"), "runningKick");
      }
    }
});
test("bear and robot still charge when the two hand buttons cross an input frame boundary", () => {
  for (const id of ["boru", "atlas"])
    for (const first of ["u", "i"]) {
      const m = setup(id),
        f = m.fighters[0];
      triple(m, 0);
      feed(m, 0, { x: 1, action: first });
      assert.ok(f.attack.fromRun);
      feed(m, 0, { x: 1, action: "u+i" });
      assert.equal(f.attack.key, "runningKick");
      assert.equal(f.y, 0);
    }
});
test("running attacks hit from approach range and a stale triple cannot replace a normal attack", () => {
  for (const id of CHARACTER_IDS) {
    const m = setup(id),
      f = m.fighters[0];
    triple(m, 0);
    f.x = -1.2;
    m.fighters[1].x = 1.2;
    feed(m, 0, { x: 1, action: ["boru", "atlas"].includes(id) ? "u+i" : "i" });
    let hit = false;
    for (let n = 0; n < 80; n++) {
      feed(m, 0, {});
      hit ||= m.events.some((e) => e.type === "hit");
    }
    assert.ok(hit, id);
    const old = setup(id);
    triple(old, 0);
    feed(old, 0, {});
    old.fighters[0].commandTime += 0.6;
    assert.equal(resolveMove(old.fighters[0], "u"), "u");
  }
});
test("running wrists stay ahead of bent elbows over a full stride, with fixed anatomical lengths", () => {
  for (const id of CHARACTER_IDS) {
    const f = setup(id).fighters[0],
      p = character(id),
      a = p.anatomy ?? { upperArm: 19, forearm: 20 };
    f.running = true;
    f.move = 1;
    for (let n = 0; n < 40; n++) {
      f.travel = n * 0.05;
      const pose = spritePose(f, 0);
      for (const arm of [0, 1]) {
        assert.ok(
          pose.hands[arm][0] > pose.elbows[arm][0],
          id + " wrist folds backward",
        );
        assert.ok(
          Math.abs(
            Math.hypot(
              pose.hands[arm][0] - pose.elbows[arm][0],
              pose.hands[arm][1] - pose.elbows[arm][1],
            ) - a.forearm,
          ) < 1e-6,
        );
      }
    }
  }
});
test("RAON has independent circular motions, kick launchers, command routes and a right-hand-led string", () => {
  const r = CHARACTERS.raon,
    k = CHARACTERS.kai;
  assert.deepEqual(r.chain, ["i", "u", "j"]);
  assert.equal(r.skeleton, "raon");
  assert.equal(STYLE_MOTIONS[r.moves.upper.kind][0], "foot");
  assert.equal(STYLE_MOTIONS[r.moves.exDragon.kind][0], "both");
  assert.ok(Object.values(r.moves).every((m) => m.kind.startsWith("raon")));
  assert.ok(Object.values(r.moves).every((m) => STYLE_MOTIONS[m.kind]));
  assert.ok(
    Object.values(r.moves).every(
      (m) => !m.name.includes("청류") && !m.name.includes("승룡"),
    ),
  );
  const changed = r.commands.filter(
    ([key, button, seq]) =>
      !k.commands.some(
        (x) => x[0] === key && x[1] === button && String(x[2]) === String(seq),
      ),
  );
  assert.ok(changed.length >= r.commands.length / 2);
  assert.notEqual(r.moves.low.startup, k.moves.low.startup);
  assert.notEqual(r.moves.signature.kind, k.moves.signature.kind);
});
