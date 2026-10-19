import { test } from "node:test";
import assert from "node:assert/strict";
import { spritePose, attackEffectPaths } from "./scene.js";
import { createMatch } from "./combat.js";
import { CHARACTERS } from "./characters.js";
const anatomy = (p) =>
  p.anatomy ?? { upperArm: 19, forearm: 20, thigh: 24, shin: 25 };
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
test("every attack keeps fixed upper/lower limb lengths throughout its animation", () => {
  for (const p of Object.values(CHARACTERS))
    for (const [key, move] of Object.entries(p.moves)) {
      const f = createMatch([p.id, "kai"]).fighters[0];
      for (const height of [undefined, 1.9])
        for (
          let frame = 0;
          frame <= move.startup + move.active + move.recovery;
          frame++
        ) {
          f.attack = { key, t: frame / 60, height };
          const pose = spritePose(f, 0);
          for (const i of [0, 1]) {
            const shoulder = [
              pose.shoulders[i][0] + pose.lean,
              pose.shoulders[i][1],
            ];
            const hip = [pose.hip[0] + (i ? 5 : -5), pose.hip[1]];
            for (const [a, b, length] of [
              [shoulder, pose.elbows[i], anatomy(p).upperArm],
              [pose.elbows[i], pose.hands[i], anatomy(p).forearm],
              [hip, pose.knees[i], anatomy(p).thigh],
              [pose.knees[i], pose.feet[i], anatomy(p).shin],
            ])
              assert.ok(
                Math.abs(distance(a, b) - length) < 1e-6,
                `${p.id} ${key} frame ${frame}`,
              );
          }
        }
    }
});
test("a kick chambers its knee, extends at contact and folds back during recovery", () => {
  const f = createMatch().fighters[0],
    move = CHARACTERS.kai.moves.j;
  const at = (t) => {
    f.attack = { key: "j", t };
    return spritePose(f, 0);
  };
  const chamber = at(move.windup * 0.5),
    impact = at(move.windup),
    recovery = at(move.windup + move.active / 60 + 0.15);
  assert.ok(impact.feet[1][0] > chamber.feet[1][0] + 20);
  assert.ok(recovery.feet[1][0] < impact.feet[1][0] - 10);
  assert.ok(impact.hands[0][1] < 50, "opposite hand stays near the guard");
});

test("all 42 moves have different visible paths and pose sequences for every fighter", () => {
  for (const p of Object.values(CHARACTERS)) {
    const effects = new Set(),
      poses = new Set();
    for (const [key, move] of Object.entries(p.moves)) {
      const paths = attackEffectPaths(move, 1);
      assert.ok(paths.length > 0);
      assert.ok(paths.flat().flat().every(Number.isFinite));
      effects.add(JSON.stringify(paths));
      const f = createMatch([p.id, "kai"]).fighters[0];
      poses.add(
        JSON.stringify(
          [0.35, 0.7, 1, 1.2].map((phase) => {
            f.attack = { key, t: move.windup * phase };
            return spritePose(f, 0);
          }),
        ),
      );
    }
    assert.equal(effects.size, 42, p.id + " effect silhouettes");
    assert.equal(poses.size, 42, p.id + " authored motion sequences");
  }
});

test("knees keep their anatomical bend side in every attack frame, stance and facing", () => {
  const assertKnees = (pose, label) => {
    for (const i of [0, 1]) {
      const root = [pose.hip[0] + (i ? 5 : -5), pose.hip[1]],
        knee = pose.knees[i],
        foot = pose.feet[i];
      const cross =
        (foot[0] - root[0]) * (knee[1] - root[1]) -
        (foot[1] - root[1]) * (knee[0] - root[0]);
      assert.ok(cross < 0, label + " reversed knee " + i);
      assert.ok(
        distance(root, foot) >
          (distance(root, knee) + distance(knee, foot)) * 0.3,
        label + " over-folded knee " + i,
      );
    }
  };
  for (const p of Object.values(CHARACTERS))
    for (const facing of [-1, 1]) {
      const f = createMatch([p.id, "kai"]).fighters[0];
      f.facing = facing;
      for (const state of [
        {},
        { crouch: true },
        { guard: true },
        { stun: 0.3, hitLevel: "low" },
        { y: 1 },
      ]) {
        Object.assign(f, { crouch: false, guard: false, stun: 0, y: 0 }, state);
        assertKnees(spritePose(f, 0), p.id);
      }
      Object.assign(f, { crouch: false, guard: false, stun: 0, y: 0 });
      for (const [key, move] of Object.entries(p.moves))
        for (
          let frame = 0;
          frame <= move.startup + move.active + move.recovery;
          frame++
        ) {
          f.attack = { key, t: frame / 60, height: 1.9 };
          assertKnees(spritePose(f, 0), `${p.id} ${key} ${frame}`);
        }
    }
});

test("the same input slot has a different full-body animation for each fighting style", () => {
  for (const key of Object.keys(CHARACTERS.kai.moves)) {
    const poses = new Set(
      Object.values(CHARACTERS).map((p) => {
        const f = createMatch([p.id, "kai"]).fighters[0];
        return JSON.stringify(
          [0.3, 0.6, 1, 1.2].map((phase) => {
            f.attack = { key, t: p.moves[key].windup * phase };
            return spritePose(f, 0);
          }),
        );
      }),
    );
    assert.equal(poses.size, 8, key);
  }
});
