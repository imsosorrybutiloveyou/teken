import { test } from "node:test";
import assert from "node:assert/strict";
import { spritePose } from "./scene.js";
import { createMatch } from "./combat.js";
import { CHARACTERS } from "./characters.js";
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
              [shoulder, pose.elbows[i], 19],
              [pose.elbows[i], pose.hands[i], 20],
              [hip, pose.knees[i], 24],
              [pose.knees[i], pose.feet[i], 25],
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
