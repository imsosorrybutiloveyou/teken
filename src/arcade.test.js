import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, advanceCampaign, createCPU } from "./arcade.js";
import { createMatch, step, emptyInput } from "./combat.js";
import { CHARACTER_IDS, character } from "./characters.js";
test("arcade fights seven distinct opponents excluding the selected character and ends after seven wins", () => {
  for (const id of CHARACTER_IDS) {
    const c = createCampaign(id, "hard");
    assert.equal(c.opponents.length, 7);
    assert.equal(new Set(c.opponents).size, 7);
    assert.ok(!c.opponents.includes(id));
    assert.equal(advanceCampaign(c, 1), "lost");
    assert.equal(c.stage, 0);
    for (let n = 0; n < 7; n++)
      assert.equal(advanceCampaign(c, 0), n === 6 ? "cleared" : "next");
    assert.equal(c.finished, true);
  }
});
test("hard CPU buffers launch punishment for unsafe moves and correctly guards lows", () => {
  const m = createMatch(["ren", "kai"]);
  m.phase = "fight";
  const a = m.fighters[0],
    b = m.fighters[1];
  a.x = -0.5;
  b.x = 0.5;
  const cpu = createCPU("hard");
  a.attack = { key: "qcfPunch", t: 0.5, angle: 0, blocked: true };
  b.blockstun = true;
  b.stun = 4 / 60;
  let input = cpu(m);
  assert.equal(input.action, "i");
  assert.equal(input.x, b.facing);
  assert.equal(input.z, 1);
  a.attack = { key: "low", t: 0.2, angle: 0 };
  b.blockstun = false;
  b.stun = 0;
  input = cpu(m);
  assert.equal(input.x, -b.facing);
  assert.equal(input.crouch, true);
});
test("hard CPU completes real launch, string and bound combos against a stationary opponent", () => {
  const m = createMatch(["ren", "kai"]);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
  const cpu = createCPU("hard");
  let peak = 0,
    bound = false;
  const levels = new Set();
  for (let n = 0; n < 4000 && m.phase !== "matchEnd"; n++) {
    step(m, [emptyInput(), cpu(m)], 1 / 60, true);
    for (const e of m.events)
      if (e.type === "hit" && e.index === 1) {
        peak = Math.max(peak, e.combo);
        bound ||= !!e.bound;
        levels.add(e.level);
      }
  }
  assert.ok(peak >= 3, "actual three-hit or longer combo");
  assert.ok(bound, "actual bound");
  assert.ok(levels.has("low") && levels.has("mid") && levels.has("high"));
});
test("KAI sky knee resolves from a real diagonal-up J input", () => {
  const m = createMatch();
  m.phase = "fight";
  step(m, [{ ...emptyInput(), x: 1, z: -1, action: "j" }, emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "hopKick");
  assert.ok(m.fighters[0].y > 0);
  assert.equal(character("kai").moves.hopKick.command, "↗ + J");
});
